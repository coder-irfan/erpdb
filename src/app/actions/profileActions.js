'use server'

import { revalidatePath } from 'next/cache'

import bcrypt from 'bcrypt'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { authorizeAction } from '@/libs/actionAuthorization'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'
import { createChangePasswordSchema, createProfileAccountSchema } from '@/utils/validation/profileSchemas'

const SAFE_PROFILE_IMAGE = /^\/uploads\/profiles\/[a-zA-Z0-9_-]+\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)

const getActionContext = async payload => {
  const locale = normalizeLocale(payload?.requestLocale || payload?.locale)
  const dictionary = await getDictionary(locale)
  const authorization = await authorizeAction([])
  const translations = dictionary.profile

  if (!authorization.authorized) {
    return {
      authorized: false,
      code: authorization.code,
      error: translations.messages.unauthenticated,
      translations
    }
  }

  return { authorized: true, session: authorization.session, translations }
}

const profileSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  account_status: true,
  locale: true,
  last_login_at: true,
  created_at: true,
  updated_at: true,
  roles: { select: { id: true, name: true, display_name: true }, orderBy: { display_name: 'asc' } },
  created_by: { select: { id: true, name: true, email: true } },
  staff: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      father_name: true,
      phone: true,
      email: true,
      address: true,
      educations: true,
      tazkira_no: true,
      position: true,
      join_date: true,
      contract_period: true,
      status: true
    }
  },
  audit_logs: {
    select: { id: true, action: true, module: true, details: true, created_at: true },
    orderBy: { created_at: 'desc' },
    take: 5
  }
}

const canEditEmail = roles => roles.some(role => ['admin', 'super_admin'].includes(role.name))

const getAuditDetails = details =>
  details && typeof details === 'object' && !Array.isArray(details) ? details : {}

const uniqueIds = values => [...new Set(values.filter(value => typeof value === 'string' && value))]

const resolveActivityEntityLabels = async logs => {
  const details = logs.map(log => getAuditDetails(log.details))
  const staffIds = uniqueIds(details.map(item => item.staffId))
  const userIds = uniqueIds(details.flatMap(item => [item.targetUserId, item.invitedUserId]))
  const roleIds = uniqueIds(details.map(item => item.roleId))

  const [staffRecords, users, roles] = await Promise.all([
    staffIds.length
      ? prisma.hrmStaff.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, first_name: true, last_name: true, email: true }
        })
      : [],
    userIds.length
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
      : [],
    roleIds.length
      ? prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true, display_name: true } })
      : []
  ])

  const staffLabels = new Map(
    staffRecords.map(staff => [staff.id, `${staff.first_name} ${staff.last_name}`.trim() || staff.email])
  )

  const userLabels = new Map(users.map(user => [user.id, user.name || user.email]))
  const roleLabels = new Map(roles.map(role => [role.id, role.display_name]))

  return new Map(
    logs.map(log => {
      const item = getAuditDetails(log.details)

      const resolvedLabel =
        staffLabels.get(item.staffId) ||
        userLabels.get(item.targetUserId || item.invitedUserId) ||
        roleLabels.get(item.roleId) ||
        item.staffName ||
        item.targetUserName ||
        item.invitedUserName ||
        item.roleDisplayName ||
        item.optionName ||
        item.title ||
        item.name ||
        item.email ||
        null

      return [log.id, resolvedLabel]
    })
  )
}

const normalizeProfile = user => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  status: user.account_status,
  locale: user.locale,
  canEditEmail: canEditEmail(user.roles),
  roles: user.roles.map(role => ({ id: role.id, name: role.name, displayName: role.display_name })),
  createdBy: user.created_by
    ? { id: user.created_by.id, name: user.created_by.name, email: user.created_by.email }
    : null,
  staff: user.staff
    ? {
        id: user.staff.id,
        name: `${user.staff.first_name} ${user.staff.last_name}`.trim(),
        fatherName: user.staff.father_name,
        phone: user.staff.phone,
        email: user.staff.email,
        address: user.staff.address,
        educations: user.staff.educations,
        tazkiraNumber: user.staff.tazkira_no,
        position: user.staff.position,
        joinDate: user.staff.join_date.toISOString(),
        contractPeriod: user.staff.contract_period,
        status: user.staff.status
      }
    : null,
  recentActivity: user.audit_logs.map(log => ({
    id: log.id,
    action: log.action,
    module: log.module,
    entityLabel: log.entityLabel,
    createdAt: log.created_at.toISOString()
  })),
  lastLoginAt: user.last_login_at?.toISOString() ?? null,
  createdAt: user.created_at.toISOString(),
  updatedAt: user.updated_at.toISOString()
})

const findProfile = async userId => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: profileSelect })

  if (!user) return null

  const activityLabels = await resolveActivityEntityLabels(user.audit_logs)

  return {
    ...user,
    audit_logs: user.audit_logs.map(log => ({ ...log, entityLabel: activityLabels.get(log.id) || null }))
  }
}

const revalidateProfilePage = () => revalidatePath('/[lang]/settings/profile', 'page')

export const getCurrentUserProfile = async (payload = {}) => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const user = await findProfile(context.session.user.id)

    if (!user) {
      return { success: false, code: 'PROFILE_NOT_FOUND', error: context.translations.messages.profileNotFound }
    }

    return { success: true, data: normalizeProfile(user) }
  } catch {
    return { success: false, code: 'PROFILE_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const updateCurrentUserProfile = async payload => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createProfileAccountSchema(context.translations.validation), {
    name: payload?.name,
    email: payload?.email,
    locale: payload?.locale || context.session.user.locale || i18n.defaultLocale,
    image: payload?.image || null
  })

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: context.session.user.id },
      select: { id: true, email: true, image: true, roles: { select: { name: true } } }
    })

    if (!currentUser) {
      return { success: false, code: 'PROFILE_NOT_FOUND', error: context.translations.messages.profileNotFound }
    }

    if (!canEditEmail(currentUser.roles) && validation.output.email !== currentUser.email) {
      return { success: false, code: 'EMAIL_READ_ONLY', error: context.translations.messages.emailReadOnly }
    }

    if (
      validation.output.image &&
      validation.output.image !== currentUser.image &&
      !SAFE_PROFILE_IMAGE.test(validation.output.image)
    ) {
      return { success: false, code: 'INVALID_IMAGE', error: context.translations.validation.imageInvalid }
    }

    const updateData = {
      name: validation.output.name,
      image: validation.output.image,
      locale: validation.output.locale
    }

    if (canEditEmail(currentUser.roles)) updateData.email = validation.output.email

    await prisma.$transaction([
      prisma.user.update({ where: { id: currentUser.id }, data: updateData }),
      prisma.auditLog.create({
        data: {
          user_id: currentUser.id,
          action: 'PROFILE_UPDATED',
          module: 'AUTH',
          details: {
            avatarChanged: validation.output.image !== currentUser.image,
            emailChanged: validation.output.email !== currentUser.email,
            locale: validation.output.locale
          }
        }
      })
    ])

    const updatedUser = await findProfile(currentUser.id)

    revalidateProfilePage()

    return {
      success: true,
      data: normalizeProfile(updatedUser),
      message: context.translations.messages.profileUpdated
    }
  } catch (error) {
    if (error?.code === 'P2002') {
      return { success: false, code: 'EMAIL_EXISTS', error: context.translations.messages.emailExists }
    }

    return { success: false, code: 'PROFILE_UPDATE_FAILED', error: context.translations.messages.updateFailed }
  }
}

export const changeCurrentUserPassword = async payload => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createChangePasswordSchema(context.translations.validation), {
    currentPassword: payload?.currentPassword,
    newPassword: payload?.newPassword,
    confirmPassword: payload?.confirmPassword
  })

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: context.session.user.id },
      select: { id: true, password_hash: true }
    })

    if (!user?.password_hash) {
      return { success: false, code: 'PASSWORD_UNAVAILABLE', error: context.translations.messages.passwordUnavailable }
    }

    const passwordMatches = await bcrypt.compare(validation.output.currentPassword, user.password_hash)

    if (!passwordMatches) {
      return { success: false, code: 'INVALID_CURRENT_PASSWORD', error: context.translations.messages.invalidPassword }
    }

    const passwordHash = await bcrypt.hash(validation.output.newPassword, 10)

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password_hash: passwordHash } }),
      prisma.auditLog.create({
        data: { user_id: user.id, action: 'PASSWORD_CHANGED', module: 'AUTH' }
      })
    ])

    revalidateProfilePage()

    return { success: true, message: context.translations.messages.passwordChanged }
  } catch {
    return { success: false, code: 'PASSWORD_CHANGE_FAILED', error: context.translations.messages.passwordChangeFailed }
  }
}
