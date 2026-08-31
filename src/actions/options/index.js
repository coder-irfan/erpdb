'use server'

import { revalidatePath } from 'next/cache'

import sanitizeHtml from 'sanitize-html'
import slugify from 'slugify'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { getSystemStatusValues, isSystemStatusCategory } from '@/data/systemStatuses'
import { authorizeAction } from '@/libs/actionAuthorization'
import { prisma } from '@/libs/prisma'
import { createOptionSchema, OPTION_CATEGORY_PATTERN } from '@/schemas/options'
import { getDictionary } from '@/utils/getDictionary'

const OPTIONS_READ_PERMISSIONS = ['options:read', 'options:write']
const OPTIONS_WRITE_PERMISSIONS = ['options:write', 'options:create', 'options:update']
const OPTIONS_DELETE_PERMISSIONS = ['options:write', 'options:delete']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

const CATEGORY_PATHS = {
  CONTRACT_POLICY: '/[lang]/options/contract-management/contract-templates',
  CONTRACT_CLAUSE: '/[lang]/options/contract-management/contracts',
  CONTRACT_DURATION: '/[lang]/options/contract-management/contracts',
  COUNTRY: '/[lang]/options/contract-management/countries',
  CONTRACT_TYPE_HRM: '/[lang]/options/contract-management/contract-types',
  CONTRACT_TYPE_CUSTOMER: '/[lang]/options/contract-management/contract-types',
  CONTRACT_TYPE_OTHER: '/[lang]/options/contract-management/contract-types',
  STAFF_POSITION: '/[lang]/options/hrm/positions',
  LEAVE_TYPE: '/[lang]/options/hrm/leave-types',
  PAYROLL_STATUS: '/[lang]/options/hrm/payroll',
  PAYROLL_PAYMENT_METHOD: '/[lang]/options/hrm/payroll',
  LEAD_STATUS: '/[lang]/options/crm/leads',
  LEAD_SOURCE: '/[lang]/options/crm/leads',
  VISITOR_PURPOSE: '/[lang]/options/crm/visitors',
  INCOME_TYPE: '/[lang]/options/finance/income-categories',
  EXPENSE_TYPE: '/[lang]/options/finance-management/expense-categories',
  INVOICE_STATUS: '/[lang]/options/contract-management/invoices',
  PAYMENT_METHOD: '/[lang]/options/contract-management/invoices'
}

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')
const isValidCategory = category => typeof category === 'string' && OPTION_CATEGORY_PATTERN.test(category)

const immutableStatusError = translations => ({
  success: false,
  code: 'SYSTEM_STATUS_IMMUTABLE',
  error:
    translations.messages.systemStatusImmutable ||
    'System workflow statuses are fixed by the application and cannot be changed from options.'
})

const getReadPermissions = category => [
  ...OPTIONS_READ_PERMISSIONS,
  ...(category === 'STAFF_POSITION' ? ['hrm:read', 'hrm:write'] : []),
  ...(category === 'LEAVE_TYPE' ? ['hrm:read', 'hrm:write', 'hrm_leave:read', 'hrm_leave:write'] : []),
  ...(category.startsWith('PAYROLL_') ? ['hrm_payroll:read', 'hrm_payroll:write'] : []),
  ...(category.startsWith('LEAD_') ? ['crm:read', 'crm:write', 'crm_lead:read', 'crm_lead:write'] : []),
  ...(category === 'VISITOR_PURPOSE'
    ? ['crm:read', 'crm:write', 'crm_visitor:read', 'crm_visitor:write']
    : []),
  ...(['INCOME_TYPE', 'EXPENSE_TYPE'].includes(category) ? ['finance:read', 'finance:write'] : []),
  ...(category.startsWith('CONTRACT_') ? ['contracts:read', 'contracts:write', 'hrm:read'] : [])
]

const getActionContext = async (payload, permissions) => {
  const locale = normalizeLocale(payload?.locale)
  const dictionary = await getDictionary(locale)
  const authorization = await authorizeAction(permissions)
  const translations = dictionary.optionsManagement

  if (!authorization.authorized) {
    const error =
      authorization.code === 'UNAUTHENTICATED'
        ? translations.messages.unauthenticated
        : translations.messages.forbidden

    return { authorized: false, code: authorization.code, error, translations }
  }

  return { authorized: true, session: authorization.session, translations }
}

const normalizeOption = option => ({
  id: option.id,
  name: option.label,
  value: option.value,
  category: option.category,
  description: option.description,
  is_active: option.is_active,
  is_default: option.is_default,
  requires_invoice: option.requires_invoice,
  is_paid_leave: option.is_paid_leave,
  allowed_days_per_year: option.allowed_days_per_year?.toFixed(1) ?? null,
  sort_order: option.sort_order,
  created_at: option.created_at.toISOString(),
  updated_at: option.updated_at.toISOString()
})

const optionDependencyCountSelect = {
  contract_types: true,
  contract_statuses: true,
  leave_types: true,
  leave_statuses: true,
  payroll_statuses: true,
  payment_methods: true,
  income_payment_methods: true,
  lead_sources: true,
  lead_statuses: true,
  project_statuses: true,
  project_priorities: true,
  task_statuses: true,
  task_priorities: true,
  contract_statuses_ref: true,
  contract_types_ref: true,
  contract_templates_ref: true,
  staff_contract_templates: true,
  staff_contract_durations: true,
  contract_countries: true,
  contract_levels: true,
  invoice_statuses: true,
  income_types: true,
  expense_types: true,
  loan_statuses: true,
  inventory_categories: true,
  inventory_statuses: true
}

const sanitizeDescription = (description, category) => {
  if (!description) return null

  if (category === 'STAFF_POSITION') {
    return sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} }).trim() || null
  }

  return (
    sanitizeHtml(description, {
      allowedTags: [
        'p',
        'br',
        'strong',
        'em',
        's',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'hr',
        'pre',
        'code',
        'span',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td'
      ],
      allowedAttributes: {
        '*': ['style'],
        table: ['class'],
        th: ['colspan', 'rowspan', 'colwidth'],
        td: ['colspan', 'rowspan', 'colwidth']
      },
      allowedStyles: {
        '*': {
          'text-align': [/^(?:left|right|center|justify)$/],
          color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
          'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
          'font-family': [/^[a-z0-9 ,"'-]+$/i],
          'font-size': [/^[0-9.]+(?:px|rem|em|pt|%)$/],
          'line-height': [/^[0-9.]+$/],
          'margin-left': [/^[0-9.]+(?:px|rem|em)$/]
        }
      }
    }).trim() || null
  )
}

const getUniqueValue = async (category, name, excludedId = null) => {
  const baseValue = slugify(name, { lower: true, strict: true, trim: true }) || 'option'
  let value = baseValue
  let suffix = 2

  while (true) {
    const existing = await prisma.option.findUnique({
      where: { category_value: { category, value } },
      select: { id: true }
    })

    if (!existing || existing.id === excludedId) return value

    value = `${baseValue}-${suffix}`
    suffix += 1
  }
}

const revalidateOptionPaths = category => {
  revalidatePath('/[lang]/options', 'page')

  if (CATEGORY_PATHS[category]) revalidatePath(CATEGORY_PATHS[category], 'page')

  if (category === 'STAFF_POSITION') revalidatePath('/[lang]/hrm/staff', 'page')
  if (category === 'LEAVE_TYPE') revalidatePath('/[lang]/hrm/leaves', 'page')
  if (category.startsWith('LEAD_')) revalidatePath('/[lang]/crm/leads', 'page')
  if (category === 'VISITOR_PURPOSE') revalidatePath('/[lang]/crm/visitors', 'page')

  if (category === 'INCOME_TYPE') {
    revalidatePath('/[lang]/finance/income', 'page')
    revalidatePath('/[lang]/finance/incomes', 'page')
  }

  if (category === 'EXPENSE_TYPE') {
    revalidatePath('/[lang]/finance/expenses', 'page')
  }

  if (category.startsWith('CONTRACT_')) revalidatePath('/[lang]/contracts', 'page')

  if (category === 'INVOICE_STATUS' || category === 'PAYMENT_METHOD') {
    revalidatePath('/[lang]/contracts/invoices', 'page')
  }
}

export const getOptionsByCategory = async (category, payload = {}) => {
  const context = await getActionContext(payload, getReadPermissions(category))

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  if (!isValidCategory(category)) {
    return { success: false, code: 'INVALID_CATEGORY', error: context.translations.messages.invalidCategory }
  }

  try {
    const options = await prisma.option.findMany({
      where: {
        category,
        is_active: true,
        ...(isSystemStatusCategory(category) && { value: { in: getSystemStatusValues(category) } })
      },
      orderBy: { label: 'asc' }
    })

    return { success: true, data: options.map(normalizeOption) }
  } catch {
    return { success: false, code: 'OPTIONS_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getOptionsListPaginated = async (payload = {}) => {
  const category = typeof payload.category === 'string' ? payload.category : ''
  const context = await getActionContext(payload, getReadPermissions(category))

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  if (!isValidCategory(category)) {
    return { success: false, code: 'INVALID_CATEGORY', error: context.translations.messages.invalidCategory }
  }

  const requestedPage = Number.parseInt(payload.page, 10)
  const requestedLimit = Number.parseInt(payload.limit, 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1

  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  const search = typeof payload.search === 'string' ? payload.search.trim() : ''

  const where = {
    category,
    ...(isSystemStatusCategory(category) && { value: { in: getSystemStatusValues(category) } }),
    ...(search && {
      OR: [
        { label: { contains: search } },
        { value: { contains: search } },
        { description: { contains: search } }
      ]
    })
  }

  try {
    const [totalCount, options] = await prisma.$transaction([
      prisma.option.count({ where }),
      prisma.option.findMany({
        where,
        orderBy: { label: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ])

    return {
      success: true,
      data: {
        options: options.map(normalizeOption),
        totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit))
      }
    }
  } catch {
    return { success: false, code: 'OPTIONS_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const createOption = async (payload = {}) => {
  const context = await getActionContext(payload, OPTIONS_WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createOptionSchema(context.translations.validation), {
    name: payload.name,
    category: payload.category,
    description: payload.description ?? '',
    is_active: payload.is_active ?? true,
    requires_invoice: payload.requires_invoice ?? false,
    is_paid_leave: payload.is_paid_leave ?? true,
    allowed_days_per_year: String(payload.allowed_days_per_year ?? '0')
  })

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  if (isSystemStatusCategory(validation.output.category)) return immutableStatusError(context.translations)

  try {
    const duplicate = await prisma.option.findFirst({
      where: { category: validation.output.category, label: validation.output.name },
      select: { id: true }
    })

    if (duplicate) {
      return { success: false, code: 'OPTION_EXISTS', error: context.translations.messages.exists }
    }

    const value = await getUniqueValue(validation.output.category, validation.output.name)

    const option = await prisma.$transaction(async transaction => {
      const createdOption = await transaction.option.create({
        data: {
          category: validation.output.category,
          label: validation.output.name,
          value,
          description: sanitizeDescription(validation.output.description, validation.output.category),
          is_active: validation.output.is_active,
          requires_invoice:
            validation.output.category === 'INCOME_TYPE' ? validation.output.requires_invoice : false,
          is_paid_leave: validation.output.category === 'LEAVE_TYPE' ? validation.output.is_paid_leave : true,
          allowed_days_per_year:
            validation.output.category === 'LEAVE_TYPE' ? validation.output.allowed_days_per_year : undefined
        }
      })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'OPTION_CREATED',
          module: 'OPTIONS',
          details: { optionId: createdOption.id, category: createdOption.category, optionName: createdOption.label }
        }
      })

      return createdOption
    })

    revalidateOptionPaths(option.category)

    return { success: true, data: normalizeOption(option), message: context.translations.messages.created }
  } catch (error) {
    if (error?.code === 'P2002') {
      return { success: false, code: 'OPTION_EXISTS', error: context.translations.messages.exists }
    }

    return { success: false, code: 'OPTION_CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateOption = async (id, payload = {}) => {
  const context = await getActionContext(payload, OPTIONS_WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const optionId = normalizeId(id)

  const validation = safeParse(createOptionSchema(context.translations.validation), {
    name: payload.name,
    category: payload.category,
    description: payload.description ?? '',
    is_active: payload.is_active ?? true,
    requires_invoice: payload.requires_invoice ?? false,
    is_paid_leave: payload.is_paid_leave ?? true,
    allowed_days_per_year: String(payload.allowed_days_per_year ?? '0')
  })

  if (!optionId || !validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues?.[0]?.message || context.translations.validation.invalidSubmission
    }
  }

  if (isSystemStatusCategory(validation.output.category)) return immutableStatusError(context.translations)

  try {
    const [currentOption, duplicate] = await Promise.all([
      prisma.option.findUnique({ where: { id: optionId }, select: { id: true, category: true } }),
      prisma.option.findFirst({
        where: {
          category: validation.output.category,
          label: validation.output.name,
          NOT: { id: optionId }
        },
        select: { id: true }
      })
    ])

    if (!currentOption || currentOption.category !== validation.output.category) {
      return { success: false, code: 'OPTION_NOT_FOUND', error: context.translations.messages.notFound }
    }

    if (duplicate) {
      return { success: false, code: 'OPTION_EXISTS', error: context.translations.messages.exists }
    }

    const value = await getUniqueValue(validation.output.category, validation.output.name, optionId)

    const option = await prisma.$transaction(async transaction => {
      const updatedOption = await transaction.option.update({
        where: { id: optionId },
        data: {
          label: validation.output.name,
          value,
          description: sanitizeDescription(validation.output.description, validation.output.category),
          is_active: validation.output.is_active,
          requires_invoice:
            validation.output.category === 'INCOME_TYPE' ? validation.output.requires_invoice : false,
          is_paid_leave: validation.output.category === 'LEAVE_TYPE' ? validation.output.is_paid_leave : true,
          allowed_days_per_year:
            validation.output.category === 'LEAVE_TYPE' ? validation.output.allowed_days_per_year : undefined
        }
      })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'OPTION_UPDATED',
          module: 'OPTIONS',
          details: { optionId, category: updatedOption.category, optionName: updatedOption.label }
        }
      })

      return updatedOption
    })

    revalidateOptionPaths(option.category)

    return { success: true, data: normalizeOption(option), message: context.translations.messages.updated }
  } catch (error) {
    if (error?.code === 'P2002') {
      return { success: false, code: 'OPTION_EXISTS', error: context.translations.messages.exists }
    }

    return { success: false, code: 'OPTION_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const toggleOptionStatus = async (id, isActive, payload = {}) => {
  const context = await getActionContext(payload, OPTIONS_WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const optionId = normalizeId(id)

  if (!optionId || typeof isActive !== 'boolean') {
    return { success: false, code: 'INVALID_STATUS', error: context.translations.validation.statusInvalid }
  }

  try {
    const currentOption = await prisma.option.findUnique({
      where: { id: optionId },
      select: { id: true, category: true }
    })

    if (!currentOption) {
      return { success: false, code: 'OPTION_NOT_FOUND', error: context.translations.messages.notFound }
    }

    if (isSystemStatusCategory(currentOption.category)) return immutableStatusError(context.translations)

    const option = await prisma.$transaction(async transaction => {
      const updatedOption = await transaction.option.update({ where: { id: optionId }, data: { is_active: isActive } })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'OPTION_STATUS_UPDATED',
          module: 'OPTIONS',
          details: { optionId, category: updatedOption.category, optionName: updatedOption.label, isActive }
        }
      })

      return updatedOption
    })

    revalidateOptionPaths(option.category)

    return { success: true, data: normalizeOption(option), message: context.translations.messages.statusUpdated }
  } catch {
    return { success: false, code: 'OPTION_STATUS_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const deleteOption = async (id, payload = {}) => {
  const context = await getActionContext(payload, OPTIONS_DELETE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const optionId = normalizeId(id)

  if (!optionId) return { success: false, code: 'OPTION_NOT_FOUND', error: context.translations.messages.notFound }

  try {
    const option = await prisma.option.findUnique({
      where: { id: optionId },
      select: {
        id: true,
        category: true,
        label: true,
        _count: { select: optionDependencyCountSelect }
      }
    })

    if (!option) {
      return { success: false, code: 'OPTION_NOT_FOUND', error: context.translations.messages.notFound }
    }

    if (isSystemStatusCategory(option.category)) return immutableStatusError(context.translations)

    const relationCount = Object.values(option._count).reduce((total, count) => total + count, 0)

    const staffPositionCount =
      option.category === 'STAFF_POSITION'
        ? await prisma.hrmstaff.count({ where: { position: option.label } })
        : 0

    const durationContractCount =
      option.category === 'CONTRACT_DURATION'
        ? await prisma.contract.count({ where: { contract_duration: option.id } })
        : 0

    if (relationCount + staffPositionCount + durationContractCount > 0) {
      return { success: false, code: 'OPTION_IN_USE', error: context.translations.messages.inUse }
    }

    await prisma.$transaction(async transaction => {
      await transaction.option.delete({ where: { id: option.id } })
      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'OPTION_DELETED',
          module: 'OPTIONS',
          details: { optionId: option.id, category: option.category, optionName: option.label }
        }
      })
    })

    revalidateOptionPaths(option.category)

    return { success: true, message: context.translations.messages.deleted }
  } catch (error) {
    if (error?.code === 'P2003') {
      return { success: false, code: 'OPTION_IN_USE', error: context.translations.messages.inUse }
    }

    return { success: false, code: 'OPTION_DELETE_FAILED', error: context.translations.messages.operationFailed }
  }
}
