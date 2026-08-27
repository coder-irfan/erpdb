'use server'

import { revalidatePath } from 'next/cache'

import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { authorizeAction } from '@/libs/actionAuthorization'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'
import { createRolePermissionSchema, createRoleSchema } from '@/utils/validation/roleSchemas'

const ROLE_MANAGEMENT_PERMISSIONS = ['settings_roles:manage']

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)

const getActionContext = async payload => {
  const locale = normalizeLocale(payload?.locale)
  const dictionary = await getDictionary(locale)
  const authorization = await authorizeAction(ROLE_MANAGEMENT_PERMISSIONS)
  const translations = dictionary.rolesPermissions

  if (!authorization.authorized) {
    const error =
      authorization.code === 'UNAUTHENTICATED' ? translations.messages.unauthenticated : translations.messages.forbidden

    return { authorized: false, error, code: authorization.code, translations }
  }

  return { authorized: true, session: authorization.session, translations }
}

const normalizePermission = permission => ({
  id: permission.id,
  key: permission.key,
  module: permission.module,
  description: permission.description
})

const normalizeRole = role => ({
  id: role.id,
  name: role.name,
  displayName: role.display_name,
  description: role.description,
  isSystem: role.is_system,
  isActive: role.is_active,
  userCount: role._count?.users ?? 0,
  permissions: role.role_permissions?.map(item => normalizePermission(item.permission)) ?? [],
  createdAt: role.created_at.toISOString(),
  updatedAt: role.updated_at.toISOString()
})

const roleDetailsSelect = {
  id: true,
  name: true,
  display_name: true,
  description: true,
  is_system: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  role_permissions: {
    select: {
      permission: {
        select: {
          id: true,
          key: true,
          module: true,
          description: true
        }
      }
    },
    orderBy: { permission: { key: 'asc' } }
  },
  _count: { select: { users: true } }
}

const revalidateRolesPage = () => revalidatePath('/[lang]/setup/roles', 'page')

export const getRolesWithPermissions = async (payload = {}) => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const roles = await prisma.role.findMany({
      select: roleDetailsSelect,
      orderBy: [{ is_system: 'desc' }, { display_name: 'asc' }]
    })

    return { success: true, data: roles.map(normalizeRole) }
  } catch {
    return { success: false, code: 'ROLES_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getPermissionsGroupedByModule = async (payload = {}) => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const permissions = await prisma.permission.findMany({
      select: { id: true, key: true, module: true, description: true },
      orderBy: [{ module: 'asc' }, { key: 'asc' }]
    })

    const groupedPermissions = permissions.reduce((groups, permission) => {
      const existingGroup = groups.find(group => group.module === permission.module)

      if (existingGroup) {
        existingGroup.permissions.push(normalizePermission(permission))
      } else {
        groups.push({ module: permission.module, permissions: [normalizePermission(permission)] })
      }

      return groups
    }, [])

    return { success: true, data: groupedPermissions }
  } catch {
    return { success: false, code: 'PERMISSIONS_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const updateRolePermissions = async payload => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createRolePermissionSchema(context.translations.validation), {
    roleId: payload?.roleId,
    permissionIds: Array.isArray(payload?.permissionIds) ? [...new Set(payload.permissionIds)] : payload?.permissionIds
  })

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  try {
    const role = await prisma.role.findUnique({
      where: { id: validation.output.roleId },
      select: { id: true, name: true }
    })

    if (!role) {
      return { success: false, code: 'ROLE_NOT_FOUND', error: context.translations.messages.roleNotFound }
    }

    if (role.name === 'super_admin') {
      return { success: false, code: 'PROTECTED_ROLE', error: context.translations.messages.protectedRole }
    }

    const permissionCount = await prisma.permission.count({ where: { id: { in: validation.output.permissionIds } } })

    if (permissionCount !== validation.output.permissionIds.length) {
      return { success: false, code: 'INVALID_PERMISSIONS', error: context.translations.messages.invalidPermissions }
    }

    await prisma.$transaction(async transaction => {
      await transaction.rolepermission.deleteMany({ where: { role_id: role.id } })

      if (validation.output.permissionIds.length > 0) {
        await transaction.rolepermission.createMany({
          data: validation.output.permissionIds.map(permissionId => ({
            role_id: role.id,
            permission_id: permissionId
          }))
        })
      }

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'ROLE_PERMISSIONS_UPDATED',
          module: 'SETTINGS',
          details: { roleId: role.id, permissionCount: validation.output.permissionIds.length }
        }
      })
    })

    const updatedRole = await prisma.role.findUnique({ where: { id: role.id }, select: roleDetailsSelect })

    revalidateRolesPage()

    return {
      success: true,
      data: normalizeRole(updatedRole),
      message: context.translations.messages.permissionsUpdated
    }
  } catch {
    return { success: false, code: 'ROLE_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const createRole = async payload => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createRoleSchema(context.translations.validation), {
    name: payload?.name,
    displayName: payload?.displayName,
    description: payload?.description ?? '',
    permissionIds: Array.isArray(payload?.permissionIds) ? [...new Set(payload.permissionIds)] : payload?.permissionIds
  })

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  try {
    const existingRole = await prisma.role.findUnique({ where: { name: validation.output.name } })

    if (existingRole) {
      return { success: false, code: 'ROLE_EXISTS', error: context.translations.messages.roleExists }
    }

    const permissionCount = await prisma.permission.count({ where: { id: { in: validation.output.permissionIds } } })

    if (permissionCount !== validation.output.permissionIds.length) {
      return { success: false, code: 'INVALID_PERMISSIONS', error: context.translations.messages.invalidPermissions }
    }

    const roleId = await prisma.$transaction(async transaction => {
      const role = await transaction.role.create({
        data: {
          name: validation.output.name,
          display_name: validation.output.displayName,
          description: validation.output.description || null,
          is_system: false,
          is_active: true
        },
        select: { id: true }
      })

      if (validation.output.permissionIds.length > 0) {
        await transaction.rolepermission.createMany({
          data: validation.output.permissionIds.map(permissionId => ({
            role_id: role.id,
            permission_id: permissionId
          }))
        })
      }

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'ROLE_CREATED',
          module: 'SETTINGS',
          details: { roleId: role.id, roleName: validation.output.name }
        }
      })

      return role.id
    })

    const createdRole = await prisma.role.findUnique({ where: { id: roleId }, select: roleDetailsSelect })

    revalidateRolesPage()

    return { success: true, data: normalizeRole(createdRole), message: context.translations.messages.roleCreated }
  } catch {
    return { success: false, code: 'ROLE_CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const toggleRoleStatus = async payload => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const roleId = typeof payload?.roleId === 'string' ? payload.roleId.trim() : ''
  const isActive = payload?.isActive

  if (!roleId || typeof isActive !== 'boolean') {
    return { success: false, code: 'INVALID_ROLE_STATUS', error: context.translations.messages.invalidRoleStatus }
  }

  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true }
    })

    if (!role) {
      return { success: false, code: 'ROLE_NOT_FOUND', error: context.translations.messages.roleNotFound }
    }

    if (role.name === 'super_admin') {
      return { success: false, code: 'PROTECTED_ROLE', error: context.translations.messages.protectedRole }
    }

    await prisma.$transaction([
      prisma.role.update({ where: { id: role.id }, data: { is_active: isActive } }),
      prisma.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'ROLE_STATUS_UPDATED',
          module: 'SETTINGS',
          details: { roleId: role.id, roleName: role.name, isActive }
        }
      })
    ])

    const updatedRole = await prisma.role.findUnique({ where: { id: role.id }, select: roleDetailsSelect })

    revalidateRolesPage()

    return {
      success: true,
      data: normalizeRole(updatedRole),
      message: isActive ? context.translations.messages.roleActivated : context.translations.messages.roleDeactivated
    }
  } catch {
    return { success: false, code: 'ROLE_STATUS_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const deleteRole = async payload => {
  const context = await getActionContext(payload)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const roleId = typeof payload?.roleId === 'string' ? payload.roleId.trim() : ''

  if (!roleId) {
    return { success: false, code: 'ROLE_NOT_FOUND', error: context.translations.messages.roleNotFound }
  }

  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, display_name: true, is_system: true, _count: { select: { users: true } } }
    })

    if (!role) {
      return { success: false, code: 'ROLE_NOT_FOUND', error: context.translations.messages.roleNotFound }
    }

    if (role.is_system || role.name === 'super_admin') {
      return { success: false, code: 'PROTECTED_ROLE', error: context.translations.messages.protectedRole }
    }

    if (role._count.users > 0) {
      return { success: false, code: 'ROLE_IN_USE', error: context.translations.messages.roleInUse }
    }

    await prisma.$transaction(async transaction => {
      await transaction.rolepermission.deleteMany({ where: { role_id: role.id } })
      await transaction.role.delete({ where: { id: role.id } })
      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'ROLE_DELETED',
          module: 'SETTINGS',
          details: { roleId: role.id, roleName: role.name, displayName: role.display_name }
        }
      })
    })

    revalidateRolesPage()

    return { success: true, data: { id: role.id }, message: context.translations.messages.roleDeleted }
  } catch {
    return { success: false, code: 'ROLE_DELETE_FAILED', error: context.translations.messages.operationFailed }
  }
}
