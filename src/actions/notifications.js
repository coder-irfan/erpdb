'use server'

import { authorizeAction } from '@/libs/actionAuthorization'
import { prisma } from '@/libs/prisma'

const AUDIT_READ_PERMISSIONS = ['audit:read']

const categoryForModule = module => {
  if (module === 'CONTRACTS') return 'CONTRACT'
  if (module === 'HRM') return 'HRM'
  if (['FINANCE', 'INVENTORY'].includes(module)) return 'FINANCE'
  if (module === 'CRM') return 'CRM'

  return 'SYSTEM'
}

const iconForCategory = category =>
  ({
    CONTRACT: { icon: 'tabler-file-text', color: 'primary' },
    HRM: { icon: 'tabler-user-check', color: 'success' },
    FINANCE: { icon: 'tabler-cash-banknote', color: 'warning' },
    CRM: { icon: 'tabler-address-book', color: 'info' },
    SYSTEM: { icon: 'tabler-shield-check', color: 'secondary' }
  })[category]

const serializeAuditLog = log => {
  const category = categoryForModule(log.module)
  const appearance = iconForCategory(category)

  return {
    id: log.id,
    action: log.action,
    module: log.module,
    category,
    details: log.details && typeof log.details === 'object' ? log.details : {},
    actor: log.user?.name || log.user?.email || null,
    timestamp: log.created_at.toISOString(),
    unread: true,
    avatarIcon: appearance.icon,
    avatarColor: appearance.color
  }
}

export const getAuditNotificationFeed = async ({ limit = 30 } = {}) => {
  const authorization = await authorizeAction(AUDIT_READ_PERMISSIONS)

  if (!authorization.authorized) {
    return { success: false, code: authorization.code, error: authorization.error }
  }

  const logs = await prisma.auditlog.findMany({
    orderBy: { created_at: 'desc' },
    take: Math.min(Math.max(Number(limit) || 30, 1), 100),
    include: { user: { select: { name: true, email: true } } }
  })

  return {
    success: true,
    data: {
      userId: authorization.session.user.id,
      notifications: logs.map(serializeAuditLog)
    }
  }
}

export const getAuditLogsPage = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const authorization = await authorizeAction(AUDIT_READ_PERMISSIONS)

  if (!authorization.authorized) {
    return { success: false, code: authorization.code, error: authorization.error }
  }

  const normalizedPage = Math.max(Number.parseInt(page, 10) || 1, 1)
  const normalizedLimit = [10, 25, 50].includes(Number.parseInt(limit, 10)) ? Number.parseInt(limit, 10) : 10
  const normalizedSearch = typeof search === 'string' ? search.trim() : ''

  const where = {
    AND: [
      ...(normalizedSearch
        ? [
            {
              OR: [
                { action: { contains: normalizedSearch } },
                { module: { contains: normalizedSearch } },
                {
                  user: {
                    is: { OR: [{ name: { contains: normalizedSearch } }, { email: { contains: normalizedSearch } }] }
                  }
                }
              ]
            }
          ]
        : [])
    ]
  }

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
        canDelete: false
      }
    }
  } catch {
    return { success: false, error: 'Audit logs could not be loaded.' }
  }
}

export const deleteAuditLog = async id => {
  const authorization = await authorizeAction(AUDIT_READ_PERMISSIONS)

  if (!authorization.authorized) {
    return { success: false, code: authorization.code, error: authorization.error }
  }

  return {
    success: false,
    code: 'AUDIT_LOG_IMMUTABLE',
    error: 'Audit log records are immutable and cannot be deleted.'
  }
}
