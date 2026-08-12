'use server'

import { createHash, randomBytes } from 'node:crypto'

import { revalidatePath } from 'next/cache'

import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { authorizeAction } from '@/libs/actionAuthorization'
import { sendUserInvitationEmail } from '@/libs/mailer'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'
import {
  createAssignUserRoleSchema,
  createInviteUserSchema,
  createUserStatusSchema
} from '@/utils/validation/roleSchemas'

const USER_MANAGEMENT_PERMISSIONS = ['settings:manage', 'settings_roles:manage']
const INVITATION_EXPIRATION_MS = 48 * 60 * 60 * 1000

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const isSuperAdmin = session => session?.user?.roles?.includes('super_admin') === true

const getActionContext = async payload => {
  const locale = normalizeLocale(payload?.locale)
  const dictionary = await getDictionary(locale)
  const authorization = await authorizeAction(USER_MANAGEMENT_PERMISSIONS)
  const translations = dictionary.rolesPermissions

  if (!authorization.authorized) {
    const error = authorization.code === 'UNAUTHENTICATED' ? translations.messages.unauthenticated : translations.messages.forbidden

    return { authorized: false, error, code: authorization.code, locale, translations }
  }

  return { authorized: true, session: authorization.session, locale, translations }
}

const hashInvitationToken = token => createHash('sha256').update(token).digest('hex')
const getInvitationIdentifier = userId => `invite:${userId}`

const userDetailsSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  account_status: true,
  created_at: true,
  updated_at: true,
  roles: {
    select: { id: true, name: true, display_name: true },
    orderBy: { display_name: 'asc' }
  },
  created_by: { select: { id: true, name: true, email: true } },
  staff: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      position: true,
      status: true
    }
  }
}

const normalizeUser = (user, currentUserId) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  status: user.account_status,
  roles: user.roles.map(role => ({ id: role.id, name: role.name, displayName: role.display_name })),
  invitedBy: user.created_by
    ? { id: user.created_by.id, name: user.created_by.name, email: user.created_by.email }
    : null,
  staff: user.staff
    ? {
        id: user.staff.id,
        name: `${user.staff.first_name} ${user.staff.last_name}`.trim(),
        email: user.staff.email,
        position: user.staff.position,
        status: user.staff.status
      }
    : null,
  isCurrentUser: user.id === currentUserId,
  isSuperAdmin: user.roles.some(role => role.name === 'super_admin'),
  createdAt: user.created_at.toISOString(),
  updatedAt: user.updated_at.toISOString()
})

const getNormalizedUser = async (userId, currentUserId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: userDetailsSelect })

  return user ? normalizeUser(user, currentUserId) : null
}

const revalidateRolesPage = () => revalidatePath('/[lang]/setup/roles', 'page')

export const getUsersWithRoles = async (payload = {}) => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const users = await prisma.user.findMany({
      select: userDetailsSelect,
      orderBy: { created_at: 'desc' }
    })

    return { success: true, data: users.map(user => normalizeUser(user, context.session.user.id)) }
  } catch {
    return { success: false, code: 'USERS_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getAvailableStaffForInvitation = async (payload = {}) => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const staff = await prisma.hrmStaff.findMany({
      where: { user_id: null, status: 'ACTIVE' },
      select: { id: true, first_name: true, last_name: true, email: true, position: true },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
    })

    return {
      success: true,
      data: staff.map(employee => ({
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`.trim(),
        email: employee.email,
        position: employee.position
      }))
    }
  } catch {
    return { success: false, code: 'STAFF_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const inviteUser = async payload => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createInviteUserSchema(context.translations.validation), {
    name: payload?.name,
    email: payload?.email,
    roleId: payload?.roleId,
    staffId: payload?.staffId || null
  })

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  try {
    const [existingUser, role, staff] = await Promise.all([
      prisma.user.findUnique({ where: { email: validation.output.email }, select: { id: true } }),
      prisma.role.findUnique({
        where: { id: validation.output.roleId },
        select: { id: true, name: true, is_active: true }
      }),
      validation.output.staffId
        ? prisma.hrmStaff.findUnique({
            where: { id: validation.output.staffId },
            select: { id: true, user_id: true, status: true }
          })
        : Promise.resolve(null)
    ])

    if (existingUser) {
      return { success: false, code: 'EMAIL_EXISTS', error: context.translations.messages.emailExists }
    }

    if (!role || !role.is_active) {
      return { success: false, code: 'ROLE_NOT_FOUND', error: context.translations.messages.roleNotFound }
    }

    if (role.name === 'super_admin' && !isSuperAdmin(context.session)) {
      return { success: false, code: 'SUPER_ADMIN_REQUIRED', error: context.translations.messages.superAdminAssignment }
    }

    if (validation.output.staffId && (!staff || staff.user_id || staff.status !== 'ACTIVE')) {
      return { success: false, code: 'STAFF_UNAVAILABLE', error: context.translations.messages.staffUnavailable }
    }

    const invitationToken = randomBytes(32).toString('base64url')
    const storedToken = hashInvitationToken(invitationToken)
    const invitationExpires = new Date(Date.now() + INVITATION_EXPIRATION_MS)

    const userId = await prisma.$transaction(async transaction => {
      const user = await transaction.user.create({
        data: {
          name: validation.output.name,
          email: validation.output.email,
          account_status: 'PENDING_ACTIVATION',
          created_by_id: context.session.user.id,
          locale: context.locale,
          roles: { connect: { id: role.id } }
        },
        select: { id: true }
      })

      if (validation.output.staffId) {
        const staffUpdate = await transaction.hrmStaff.updateMany({
          where: { id: validation.output.staffId, user_id: null, status: 'ACTIVE' },
          data: { user_id: user.id }
        })

        if (staffUpdate.count !== 1) throw new Error('STAFF_UNAVAILABLE')
      }

      await transaction.verificationToken.create({
        data: {
          identifier: getInvitationIdentifier(user.id),
          token: storedToken,
          expires: invitationExpires
        }
      })

      return user.id
    })

    try {
      await sendUserInvitationEmail(validation.output.email, invitationToken, context.locale, validation.output.name)
    } catch {
      await prisma
        .$transaction(async transaction => {
          await transaction.verificationToken.deleteMany({ where: { token: storedToken } })

          if (validation.output.staffId) {
            await transaction.hrmStaff.updateMany({
              where: { id: validation.output.staffId, user_id: userId },
              data: { user_id: null }
            })
          }

          await transaction.user.deleteMany({
            where: { id: userId, account_status: 'PENDING_ACTIVATION' }
          })
        })
        .catch(() => undefined)

      await prisma.auditLog
        .create({
          data: {
            user_id: context.session.user.id,
            action: 'USER_INVITATION_EMAIL_FAILED',
            module: 'SETTINGS',
            details: { email: validation.output.email }
          }
        })
        .catch(() => undefined)

      return {
        success: false,
        code: 'INVITATION_EMAIL_FAILED',
        error: context.translations.messages.invitationEmailFailed
      }
    }

    await prisma.auditLog
      .create({
        data: {
          user_id: context.session.user.id,
          action: 'USER_INVITED',
          module: 'SETTINGS',
          details: { invitedUserId: userId, roleId: role.id, staffId: validation.output.staffId ?? null }
        }
      })
      .catch(() => undefined)

    const createdUser = await getNormalizedUser(userId, context.session.user.id)

    revalidateRolesPage()

    return {
      success: true,
      data: { user: createdUser },
      message: context.translations.messages.userInvited
    }
  } catch (error) {
    if (error?.message === 'STAFF_UNAVAILABLE') {
      return { success: false, code: 'STAFF_UNAVAILABLE', error: context.translations.messages.staffUnavailable }
    }

    if (error?.code === 'P2002') {
      return { success: false, code: 'EMAIL_EXISTS', error: context.translations.messages.emailExists }
    }

    return { success: false, code: 'USER_INVITE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateUserStatus = async payload => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createUserStatusSchema(context.translations.validation), {
    userId: payload?.userId,
    status: payload?.status
  })

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  if (validation.output.userId === context.session.user.id) {
    return { success: false, code: 'SELF_PROTECTED', error: context.translations.messages.selfProtected }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: validation.output.userId },
      select: { id: true, roles: { select: { name: true } } }
    })

    if (!user) {
      return { success: false, code: 'USER_NOT_FOUND', error: context.translations.messages.userNotFound }
    }

    if (user.roles.some(role => role.name === 'super_admin')) {
      return { success: false, code: 'PROTECTED_USER', error: context.translations.messages.protectedUser }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { account_status: validation.output.status }
      }),
      prisma.auditLog.create({
        data: {
          user_id: context.session.user.id,
          action: 'USER_STATUS_UPDATED',
          module: 'SETTINGS',
          details: { targetUserId: user.id, accountStatus: validation.output.status }
        }
      })
    ])

    const updatedUser = await getNormalizedUser(user.id, context.session.user.id)

    revalidateRolesPage()

    return { success: true, data: updatedUser, message: context.translations.messages.statusUpdated }
  } catch {
    return { success: false, code: 'USER_STATUS_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const assignUserRole = async payload => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createAssignUserRoleSchema(context.translations.validation), {
    userId: payload?.userId,
    roleId: payload?.roleId
  })

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  if (validation.output.userId === context.session.user.id) {
    return { success: false, code: 'SELF_PROTECTED', error: context.translations.messages.selfProtected }
  }

  try {
    const [user, role] = await Promise.all([
      prisma.user.findUnique({
        where: { id: validation.output.userId },
        select: { id: true, roles: { select: { name: true } } }
      }),
      prisma.role.findUnique({
        where: { id: validation.output.roleId },
        select: { id: true, name: true, is_active: true }
      })
    ])

    if (!user) {
      return { success: false, code: 'USER_NOT_FOUND', error: context.translations.messages.userNotFound }
    }

    if (!role || !role.is_active) {
      return { success: false, code: 'ROLE_NOT_FOUND', error: context.translations.messages.roleNotFound }
    }

    if (user.roles.some(userRole => userRole.name === 'super_admin')) {
      return { success: false, code: 'PROTECTED_USER', error: context.translations.messages.protectedUser }
    }

    if (role.name === 'super_admin' && !isSuperAdmin(context.session)) {
      return { success: false, code: 'SUPER_ADMIN_REQUIRED', error: context.translations.messages.superAdminAssignment }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { roles: { set: [{ id: role.id }] } }
      }),
      prisma.auditLog.create({
        data: {
          user_id: context.session.user.id,
          action: 'USER_ROLE_ASSIGNED',
          module: 'SETTINGS',
          details: { targetUserId: user.id, roleId: role.id }
        }
      })
    ])

    const updatedUser = await getNormalizedUser(user.id, context.session.user.id)

    revalidateRolesPage()

    return { success: true, data: updatedUser, message: context.translations.messages.roleAssigned }
  } catch {
    return { success: false, code: 'USER_ROLE_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}
