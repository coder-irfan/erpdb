'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { authorizeAction } from '@/libs/actionAuthorization'
import { prisma } from '@/libs/prisma'
import { createStaffSchema, STAFF_STATUSES } from '@/schemas/hrm/staff'
import { getDictionary } from '@/utils/getDictionary'

const STAFF_READ_PERMISSIONS = ['hrm:read', 'hrm_staff:read']
const STAFF_CREATE_PERMISSIONS = ['hrm:write', 'hrm_staff:create']
const STAFF_UPDATE_PERMISSIONS = ['hrm:write', 'hrm_staff:update']
const STAFF_WRITE_PERMISSIONS = [...new Set([...STAFF_CREATE_PERMISSIONS, ...STAFF_UPDATE_PERMISSIONS])]
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const nullableText = value => value || null
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')

const normalizeStaff = staff => ({
  id: staff.id,
  first_name: staff.first_name,
  last_name: staff.last_name,
  full_name: `${staff.first_name} ${staff.last_name}`.trim(),
  father_name: staff.father_name,
  phone: staff.phone,
  email: staff.email,
  address: staff.address,
  educations: staff.educations,
  tazkira_no: staff.tazkira_no,
  position: staff.position,
  salary: staff.salary.toFixed(2),
  guarantor_name: staff.guarantor_name,
  guarantor_phone: staff.guarantor_phone,
  guarantor_license: staff.guarantor_license,
  join_date: staff.join_date.toISOString(),
  contract_period: staff.contract_period,
  user_id: staff.user_id,
  status: staff.status,
  created_at: staff.created_at.toISOString(),
  updated_at: staff.updated_at.toISOString(),
  user: staff.user
    ? {
        id: staff.user.id,
        name: staff.user.name,
        email: staff.user.email,
        image: staff.user.image,
        account_status: staff.user.account_status
      }
    : null,
  contracts:
    staff.contracts?.map(contract => ({
      id: contract.id,
      contract_number: contract.contract_number,
      position_title: contract.position_title,
      base_salary: contract.base_salary.toFixed(2),
      start_date: contract.start_date.toISOString(),
      end_date: contract.end_date?.toISOString() ?? null,
      document_url: contract.document_url,
      content_html: contract.content_html,
      contract_type: contract.contract_type
        ? { id: contract.contract_type.id, label: contract.contract_type.label, value: contract.contract_type.value }
        : null,
      status: contract.status
        ? { id: contract.status.id, label: contract.status.label, value: contract.status.value }
        : null
    })) ?? []
})

const staffListSelect = {
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
  salary: true,
  guarantor_name: true,
  guarantor_phone: true,
  guarantor_license: true,
  join_date: true,
  contract_period: true,
  user_id: true,
  status: true,
  created_at: true,
  updated_at: true,
  user: {
    select: { id: true, name: true, email: true, image: true, account_status: true }
  }
}

const getActionContext = async (payload, permissions) => {
  const locale = normalizeLocale(payload?.locale)
  const dictionary = await getDictionary(locale)
  const authorization = await authorizeAction(permissions)
  const translations = dictionary.hrmStaff

  if (!authorization.authorized) {
    const error =
      authorization.code === 'UNAUTHENTICATED'
        ? translations.messages.unauthenticated
        : translations.messages.forbidden

    return { authorized: false, code: authorization.code, error, translations }
  }

  return { authorized: true, session: authorization.session, translations }
}

const validateStaff = (payload, translations) =>
  safeParse(createStaffSchema(translations.validation), {
    first_name: payload?.first_name,
    last_name: payload?.last_name,
    father_name: payload?.father_name ?? '',
    phone: payload?.phone,
    email: payload?.email,
    address: payload?.address ?? '',
    educations: payload?.educations ?? '',
    tazkira_no: payload?.tazkira_no ?? '',
    position: payload?.position,
    salary: payload?.salary,
    guarantor_name: payload?.guarantor_name ?? '',
    guarantor_phone: payload?.guarantor_phone ?? '',
    guarantor_license: payload?.guarantor_license ?? '',
    join_date: payload?.join_date,
    contract_period: payload?.contract_period ?? '',
    user_id: payload?.user_id || null,
    status: payload?.status || 'ACTIVE'
  })

const toStaffData = values => ({
  first_name: values.first_name,
  last_name: values.last_name,
  father_name: nullableText(values.father_name),
  phone: values.phone,
  email: values.email,
  address: nullableText(values.address),
  educations: nullableText(values.educations),
  tazkira_no: nullableText(values.tazkira_no),
  position: values.position,
  salary: new Prisma.Decimal(values.salary),
  guarantor_name: nullableText(values.guarantor_name),
  guarantor_phone: nullableText(values.guarantor_phone),
  guarantor_license: nullableText(values.guarantor_license),
  join_date: values.join_date instanceof Date ? values.join_date : new Date(`${values.join_date}T00:00:00.000Z`),
  contract_period: nullableText(values.contract_period),
  user_id: values.user_id || null,
  status: values.status
})

const ensureUserAvailable = async (userId, staffId = null) => {
  if (!userId) return true

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, staff: { select: { id: true } } }
  })

  return Boolean(user && (!user.staff || user.staff.id === staffId))
}

const revalidateStaffPage = () => revalidatePath('/[lang]/hrm/staff', 'page')

export const getStaffList = async (payload = {}) => {
  const context = await getActionContext(payload, STAFF_READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const requestedPage = Number.parseInt(payload.page, 10)
  const requestedLimit = Number.parseInt(payload.limit, 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1

  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const status = typeof payload.status === 'string' && STAFF_STATUSES.includes(payload.status) ? payload.status : ''
  const position = typeof payload.position === 'string' ? payload.position.trim() : ''

  const where = {
    ...(search && {
      OR: [
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ]
    }),
    ...(status && { status }),
    ...(position && { position })
  }

  try {
    const [totalCount, staff, positionRows] = await prisma.$transaction([
      prisma.hrmStaff.count({ where }),
      prisma.hrmStaff.findMany({
        where,
        select: staffListSelect,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.hrmStaff.findMany({ select: { position: true }, distinct: ['position'], orderBy: { position: 'asc' } })
    ])

    const totalPages = Math.max(1, Math.ceil(totalCount / limit))

    return {
      success: true,
      data: {
        staff: staff.map(normalizeStaff),
        totalCount,
        page,
        totalPages,
        positions: positionRows.map(item => item.position)
      }
    }
  } catch {
    return { success: false, code: 'STAFF_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getStaffStats = async (payload = {}) => {
  const context = await getActionContext(payload, STAFF_READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const [total, active, terminated] = await prisma.$transaction([
      prisma.hrmStaff.count(),
      prisma.hrmStaff.count({ where: { status: 'ACTIVE' } }),
      prisma.hrmStaff.count({ where: { status: 'TERMINATED' } })
    ])

    return { success: true, data: { total, active, inactive: Math.max(0, total - active - terminated), terminated } }
  } catch {
    return { success: false, code: 'STAFF_STATS_FAILED', error: context.translations.messages.statsFailed }
  }
}

export const getAvailableStaffUsers = async (payload = {}) => {
  const context = await getActionContext(payload, STAFF_WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const users = await prisma.user.findMany({
      where: { account_status: 'ACTIVE', staff: { is: null } },
      select: { id: true, name: true, email: true, image: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }]
    })

    return { success: true, data: users }
  } catch {
    return { success: false, code: 'USERS_LOAD_FAILED', error: context.translations.messages.usersLoadFailed }
  }
}

export const createStaff = async payload => {
  const context = await getActionContext(payload, STAFF_CREATE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = validateStaff(payload, context.translations)

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  try {
    const [existingStaff, userAvailable] = await Promise.all([
      prisma.hrmStaff.findUnique({ where: { email: validation.output.email }, select: { id: true } }),
      ensureUserAvailable(validation.output.user_id)
    ])

    if (existingStaff) {
      return { success: false, code: 'EMAIL_EXISTS', error: context.translations.messages.emailExists }
    }

    if (!userAvailable) {
      return { success: false, code: 'USER_UNAVAILABLE', error: context.translations.messages.userUnavailable }
    }

    const createdStaff = await prisma.$transaction(async transaction => {
      const staff = await transaction.hrmStaff.create({ data: toStaffData(validation.output), select: staffListSelect })

      await transaction.auditLog.create({
        data: {
          user_id: context.session.user.id,
          action: 'HRM_STAFF_CREATED',
          module: 'HRM',
          details: {
            staffId: staff.id,
            staffName: `${staff.first_name} ${staff.last_name}`.trim(),
            email: staff.email
          }
        }
      })

      return staff
    })

    revalidateStaffPage()

    return { success: true, data: normalizeStaff(createdStaff), message: context.translations.messages.created }
  } catch (error) {
    if (error?.code === 'P2002') {
      const field = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '')

      return {
        success: false,
        code: field.includes('user_id') ? 'USER_UNAVAILABLE' : 'EMAIL_EXISTS',
        error: field.includes('user_id')
          ? context.translations.messages.userUnavailable
          : context.translations.messages.emailExists
      }
    }

    return { success: false, code: 'STAFF_CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateStaff = async (id, payload = {}) => {
  const context = await getActionContext(payload, STAFF_UPDATE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const staffId = normalizeId(id)

  if (!staffId) return { success: false, code: 'INVALID_STAFF', error: context.translations.messages.notFound }

  const validation = validateStaff(payload, context.translations)

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  try {
    const [currentStaff, duplicateEmail, userAvailable] = await Promise.all([
      prisma.hrmStaff.findUnique({ where: { id: staffId }, select: { id: true } }),
      prisma.hrmStaff.findFirst({
        where: { email: validation.output.email, NOT: { id: staffId } },
        select: { id: true }
      }),
      ensureUserAvailable(validation.output.user_id, staffId)
    ])

    if (!currentStaff) {
      return { success: false, code: 'STAFF_NOT_FOUND', error: context.translations.messages.notFound }
    }

    if (duplicateEmail) {
      return { success: false, code: 'EMAIL_EXISTS', error: context.translations.messages.emailExists }
    }

    if (!userAvailable) {
      return { success: false, code: 'USER_UNAVAILABLE', error: context.translations.messages.userUnavailable }
    }

    const updatedStaff = await prisma.$transaction(async transaction => {
      const staff = await transaction.hrmStaff.update({
        where: { id: staffId },
        data: toStaffData(validation.output),
        select: staffListSelect
      })

      await transaction.auditLog.create({
        data: {
          user_id: context.session.user.id,
          action: 'HRM_STAFF_UPDATED',
          module: 'HRM',
          details: { staffId: staff.id, staffName: `${staff.first_name} ${staff.last_name}`.trim() }
        }
      })

      return staff
    })

    revalidateStaffPage()

    return { success: true, data: normalizeStaff(updatedStaff), message: context.translations.messages.updated }
  } catch (error) {
    if (error?.code === 'P2002') {
      const field = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '')

      return {
        success: false,
        code: field.includes('user_id') ? 'USER_UNAVAILABLE' : 'EMAIL_EXISTS',
        error: field.includes('user_id')
          ? context.translations.messages.userUnavailable
          : context.translations.messages.emailExists
      }
    }

    return { success: false, code: 'STAFF_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateStaffStatus = async (id, newStatus, payload = {}) => {
  const context = await getActionContext(payload, STAFF_UPDATE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const staffId = normalizeId(id)

  if (!staffId || !STAFF_STATUSES.includes(newStatus)) {
    return { success: false, code: 'INVALID_STATUS', error: context.translations.validation.statusInvalid }
  }

  try {
    const currentStaff = await prisma.hrmStaff.findUnique({ where: { id: staffId }, select: { id: true } })

    if (!currentStaff) {
      return { success: false, code: 'STAFF_NOT_FOUND', error: context.translations.messages.notFound }
    }

    const updatedStaff = await prisma.$transaction(async transaction => {
      const staff = await transaction.hrmStaff.update({
        where: { id: staffId },
        data: { status: newStatus },
        select: staffListSelect
      })

      await transaction.auditLog.create({
        data: {
          user_id: context.session.user.id,
          action: 'HRM_STAFF_STATUS_UPDATED',
          module: 'HRM',
          details: { staffId, staffName: `${staff.first_name} ${staff.last_name}`.trim(), status: newStatus }
        }
      })

      return staff
    })

    revalidateStaffPage()

    return { success: true, data: normalizeStaff(updatedStaff), message: context.translations.messages.statusUpdated }
  } catch {
    return { success: false, code: 'STATUS_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const getStaffById = async (id, payload = {}) => {
  const context = await getActionContext(payload, STAFF_READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const staffId = normalizeId(id)

  if (!staffId) return { success: false, code: 'INVALID_STAFF', error: context.translations.messages.notFound }

  try {
    const staff = await prisma.hrmStaff.findUnique({
      where: { id: staffId },
      select: {
        ...staffListSelect,
        contracts: {
          select: {
            id: true,
            contract_number: true,
            position_title: true,
            base_salary: true,
            start_date: true,
            end_date: true,
            document_url: true,
            content_html: true,
            contract_type: { select: { id: true, label: true, value: true } },
            status: { select: { id: true, label: true, value: true } }
          },
          orderBy: { start_date: 'desc' }
        }
      }
    })

    if (!staff) return { success: false, code: 'STAFF_NOT_FOUND', error: context.translations.messages.notFound }

    return { success: true, data: normalizeStaff(staff) }
  } catch {
    return { success: false, code: 'STAFF_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}
