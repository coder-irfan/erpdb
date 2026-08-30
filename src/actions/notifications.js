'use server'

import { authorizeAction } from '@/libs/actionAuthorization'
import { ensureActionableNotificationsSynced } from '@/libs/actionableNotifications'
import { prisma } from '@/libs/prisma'

const AUDIT_READ_PERMISSIONS = ['audit:read']
const PRIORITY_ORDER = { CRITICAL: 4, URGENT: 3, WARNING: 2, INFO: 1 }

const isSuperAdmin = authorization => authorization.session?.user?.roles?.includes('super_admin') === true

const categoryForModule = module => {
  if (module === 'CONTRACTS') return 'CONTRACT'
  if (module === 'HRM') return 'HRM'
  if (['FINANCE', 'INVENTORY'].includes(module)) return 'FINANCE'
  if (module === 'CRM') return 'CRM'

  return 'SYSTEM'
}

const serializeAuditLog = log => ({
  id: log.id,
  action: log.action,
  module: log.module,
  category: categoryForModule(log.module),
  details: log.details && typeof log.details === 'object' ? log.details : {},
  actor: log.user?.name || log.user?.email || null,
  timestamp: log.created_at.toISOString()
})

const localeKey = locale => (locale === 'fa' || locale === 'ps' ? locale : 'en')

const serializeNotification = (notification, locale, userId) => {
  const language = localeKey(locale)
  const state = notification.user_states.find(item => item.user_id === userId)

  return {
    id: notification.id,
    category: notification.category,
    priority: notification.priority,
    title: notification[`title_${language}`],
    description: notification[`description_${language}`],
    actionUrl: notification.action_url,
    entityType: notification.entity_type,
    entityId: notification.entity_id,
    timestamp: notification.created_at.toISOString(),
    unread: !state?.read_at,
    dismissed: Boolean(state?.dismissed_at)
  }
}

const notificationScope = session => ({
  OR: [
    { target_user_id: session.user.id },
    { target_roles: { some: { role: { name: { in: session.user.roles || [] } } } } }
  ]
})

export const getNotificationFeed = async ({ limit = 30, locale = 'en' } = {}) => {
  const authorization = await authorizeAction()

  if (!authorization.authorized) return { success: false, code: authorization.code, error: authorization.error }

  try {
    await ensureActionableNotificationsSynced()

    const notifications = await prisma.notification.findMany({
      where: {
        AND: [
          notificationScope(authorization.session),
          { OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] },
          {
            user_states: {
              none: { user_id: authorization.session.user.id, dismissed_at: { not: null } }
            }
          }
        ]
      },
      orderBy: [{ created_at: 'desc' }],
      take: Math.min(Math.max(Number(limit) || 30, 1), 100),
      include: { user_states: { where: { user_id: authorization.session.user.id } } }
    })

    const serialized = notifications
      .map(notification => serializeNotification(notification, locale, authorization.session.user.id))
      .sort((left, right) =>
        (PRIORITY_ORDER[right.priority] || 0) - (PRIORITY_ORDER[left.priority] || 0) ||
        new Date(right.timestamp) - new Date(left.timestamp)
      )

    return {
      success: true,
      data: {
        notifications: serialized,
        unreadCount: serialized.filter(item => item.unread).length
      }
    }
  } catch {
    return { success: false, code: 'NOTIFICATION_LOAD_FAILED', error: 'Notifications could not be loaded.' }
  }
}

const accessibleNotification = async (id, session) =>
  prisma.notification.findFirst({ where: { id, ...notificationScope(session) }, select: { id: true } })

export const markNotificationRead = async id => {
  const authorization = await authorizeAction()

  if (!authorization.authorized) return { success: false, code: authorization.code, error: authorization.error }
  if (!(await accessibleNotification(id, authorization.session))) return { success: false, code: 'NOT_FOUND', error: 'Notification not found.' }

  await prisma.notificationstate.upsert({
    where: { notification_id_user_id: { notification_id: id, user_id: authorization.session.user.id } },
    create: { notification_id: id, user_id: authorization.session.user.id, status: 'READ', read_at: new Date() },
    update: { status: 'READ', read_at: new Date(), dismissed_at: null }
  })

  return { success: true }
}

export const dismissNotification = async id => {
  const authorization = await authorizeAction()

  if (!authorization.authorized) return { success: false, code: authorization.code, error: authorization.error }
  if (!(await accessibleNotification(id, authorization.session))) return { success: false, code: 'NOT_FOUND', error: 'Notification not found.' }

  const now = new Date()

  await prisma.notificationstate.upsert({
    where: { notification_id_user_id: { notification_id: id, user_id: authorization.session.user.id } },
    create: { notification_id: id, user_id: authorization.session.user.id, status: 'DISMISSED', read_at: now, dismissed_at: now },
    update: { status: 'DISMISSED', read_at: now, dismissed_at: now }
  })

  return { success: true }
}

export const markAllNotificationsRead = async () => {
  const authorization = await authorizeAction()

  if (!authorization.authorized) return { success: false, code: authorization.code, error: authorization.error }

  const notifications = await prisma.notification.findMany({
    where: notificationScope(authorization.session),
    select: { id: true }
  })

  const now = new Date()

  for (const notification of notifications) {
    await prisma.notificationstate.upsert({
      where: { notification_id_user_id: { notification_id: notification.id, user_id: authorization.session.user.id } },
      create: { notification_id: notification.id, user_id: authorization.session.user.id, status: 'READ', read_at: now },
      update: { status: 'READ', read_at: now }
    })
  }

  return { success: true }
}

export const dismissAllNotifications = async () => {
  const authorization = await authorizeAction()

  if (!authorization.authorized) return { success: false, code: authorization.code, error: authorization.error }

  const notifications = await prisma.notification.findMany({
    where: notificationScope(authorization.session),
    select: { id: true }
  })

  const now = new Date()

  for (const notification of notifications) {
    await prisma.notificationstate.upsert({
      where: { notification_id_user_id: { notification_id: notification.id, user_id: authorization.session.user.id } },
      create: { notification_id: notification.id, user_id: authorization.session.user.id, status: 'DISMISSED', read_at: now, dismissed_at: now },
      update: { status: 'DISMISSED', read_at: now, dismissed_at: now }
    })
  }

  return { success: true }
}

export const getAuditLogsPage = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const authorization = await authorizeAction(AUDIT_READ_PERMISSIONS)

  if (!authorization.authorized) return { success: false, code: authorization.code, error: authorization.error }
  if (!isSuperAdmin(authorization)) return { success: false, code: 'SUPER_ADMIN_REQUIRED', error: 'Super administrator access is required.' }

  const normalizedPage = Math.max(Number.parseInt(page, 10) || 1, 1)
  const normalizedLimit = [10, 25, 50].includes(Number.parseInt(limit, 10)) ? Number.parseInt(limit, 10) : 10
  const normalizedSearch = typeof search === 'string' ? search.trim() : ''

  const where = normalizedSearch
    ? {
        OR: [
          { action: { contains: normalizedSearch } },
          { module: { contains: normalizedSearch } },
          { user: { is: { OR: [{ name: { contains: normalizedSearch } }, { email: { contains: normalizedSearch } }] } } }
        ]
      }
    : {}

  try {
    const [totalCount, logs] = await prisma.$transaction([
      prisma.auditlog.count({ where }),
      prisma.auditlog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (normalizedPage - 1) * normalizedLimit,
        take: normalizedLimit,
        include: { user: { select: { name: true, email: true } } }
      })
    ])

    return {
      success: true,
      data: {
        logs: logs.map(serializeAuditLog),
        totalCount,
        page: normalizedPage,
        totalPages: Math.max(1, Math.ceil(totalCount / normalizedLimit)),
        canDelete: true
      }
    }
  } catch {
    return { success: false, error: 'Audit logs could not be loaded.' }
  }
}

export const deleteAuditLogs = async ids => {
  const authorization = await authorizeAction(AUDIT_READ_PERMISSIONS)

  if (!authorization.authorized) return { success: false, code: authorization.code, error: authorization.error }
  if (!isSuperAdmin(authorization)) return { success: false, code: 'SUPER_ADMIN_REQUIRED', error: 'Super administrator access is required.' }

  const normalizedIds = [...new Set((Array.isArray(ids) ? ids : [ids]).filter(id => typeof id === 'string' && id))]

  if (!normalizedIds.length) return { success: false, code: 'NO_SELECTION', error: 'Select at least one audit log.' }

  const result = await prisma.auditlog.deleteMany({ where: { id: { in: normalizedIds } } })

  return { success: true, deletedCount: result.count }
}

export const deleteAuditLog = async id => deleteAuditLogs([id])
