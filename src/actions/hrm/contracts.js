'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import sanitizeHtml from 'sanitize-html'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { CONTRACT_STATUS_VALUES } from '@/data/contracts'
import { CONTRACT_TYPE_DOMAINS } from '@/data/contractTypes'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { getContractStatusOptions } from '@/libs/contractStatuses'
import { getContractTypeOptions } from '@/libs/contractTypes'
import { prisma } from '@/libs/prisma'
import { nextSequentialNumber, withSequentialNumberRetry } from '@/libs/sequentialNumbers'
import { getBrandingSettings } from '@/libs/systemSettings'
import { createStaffContractSchema } from '@/schemas/hrm/contracts'
import { formatDateRangeDuration, getRemainingDays } from '@/utils/contractDuration'
import { SYSTEM_BASE_CURRENCY, convertToBaseCurrency } from '@/utils/formatCurrency'
import { getDictionary } from '@/utils/getDictionary'
import { toUtcDateOnly, utcDateKey } from '@/utils/utcDate'
import { replaceContractTemplateTokens } from '@/utils/contractTemplateTokens'

const CONTRACT_READ_PERMISSIONS = ['hrm:read', 'hrm_contract:read', 'contracts:read']
const CONTRACT_WRITE_PERMISSIONS = ['hrm:write', 'hrm_contract:write']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

const CONTRACT_HTML_TAGS = [
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
]

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')
const nullableText = value => value?.trim() || null
const toDate = toUtcDateOnly
const toDateOnly = utcDateKey

const escapeHtml = value =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const sanitizeContractHtml = html =>
  sanitizeHtml(html || '', {
    allowedTags: CONTRACT_HTML_TAGS,
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
  }).trim()

const compileTemplate = ({ template, staff, values, setup, contractNumber, contractType }) => {
  const staffName = `${staff.first_name} ${staff.last_name}`.trim()
  const startDate = toDateOnly(toDate(values.start_date))
  const endDate = values.end_date ? toDateOnly(toDate(values.end_date)) : 'Open-ended'
  const amount = `${new Prisma.Decimal(values.base_salary).toFixed(2)} ${values.currency}`

  const replacements = {
    STAFF_NAME: staffName,
    TAZKIRA_NO: staff.tazkira_no || 'N/A',
    POSITION: values.position_title,
    BASE_SALARY: amount,
    START_DATE: startDate,
    END_DATE: endDate,
    MONTHLY_SALARY: amount,
    COMPANY_NAME: setup.company_name,
    ORG_NAME: setup.company_name
  }

  const source = template || '<p>{STAFF_NAME} is employed as {POSITION} by {COMPANY_NAME} from {START_DATE}.</p>'

  const compiled = Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, escapeHtml(value)),
    source
  )

  const templateValues = {
    name: staffName,
    first_name: staff.first_name,
    last_name: staff.last_name,
    father_name: staff.father_name || 'N/A',
    tazkira: replacements.TAZKIRA_NO,
    tazkira_no: replacements.TAZKIRA_NO,
    position: values.position_title,
    email: staff.email,
    phone: staff.phone,
    address: staff.address || 'N/A',
    join_date: toDateOnly(staff.join_date),
    probation_period: `${Math.trunc(values.probation_days || 90)} days`,
    notice_period: `${Math.trunc(values.notice_period_days || 30)} days`,
    contract_period: staff.contract_period || 'N/A',
    contract_number: contractNumber || '',
    contract_type: contractType?.label || '',
    amount,
    monthly_salary: amount,
    base_salary: amount,
    currency: values.currency,
    exchange_rate: new Prisma.Decimal(values.exchange_rate).toFixed(4),
    amount_base: convertToBaseCurrency(
      values.base_salary,
      values.currency,
      values.exchange_rate,
      SYSTEM_BASE_CURRENCY
    ).toFixed(2),
    payment_terms: 'Monthly salary',
    start_date: startDate,
    end_date: endDate,
    created_date: toDateOnly(new Date()),
    company_name: setup.company_name,
    org_name: setup.company_name,
    org_address: setup.company_address || 'N/A',
    org_email: setup.company_email || 'N/A',
    org_phone: setup.company_phone || 'N/A',
    org_tax_id: setup.company_tax_id || 'N/A',
    signatory_name: setup.signatory_name || 'N/A',
    signatory_title: setup.signatory_title || 'N/A'
  }

  const compiledMustache = replaceContractTemplateTokens(compiled, templateValues, escapeHtml)

  return sanitizeContractHtml(compiledMustache)
}

const contractSelect = {
  id: true,
  staff_id: true,
  contract_number: true,
  contract_type_id: true,
  template_id: true,
  duration_id: true,
  position_title: true,
  base_salary: true,
  currency: true,
  exchange_rate: true,
  amount_base: true,
  start_date: true,
  end_date: true,
  document_url: true,
  content_html: true,
  probation_days: true,
  notice_period_days: true,
  termination_date: true,
  termination_reason: true,
  payroll_frozen: true,
  renewal_review_required: true,
  final_settlement_required: true,
  status_id: true,
  created_at: true,
  updated_at: true,
  staff: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      father_name: true,
      email: true,
      phone: true,
      address: true,
      join_date: true,
      contract_period: true,
      tazkira_no: true,
      guarantor_name: true,
      guarantor_phone: true,
      position: true,
      salary: true,
      salary_currency: true,
      salary_exchange_rate: true,
      user: { select: { image: true } }
    }
  },
  contract_type: { select: { id: true, label: true, value: true, category: true, is_active: true } },
  template: { select: { id: true, label: true, value: true, description: true, is_active: true } },
  duration: { select: { id: true, label: true, value: true, description: true, is_active: true } },
  status: { select: { id: true, label: true, value: true, color_code: true, is_active: true } }
}

const normalizeContract = contract => ({
  ...contract,
  lifecycle_classification:
    contract.status.value === 'DRAFT'
      ? 'PENDING_ONBOARDING'
      : contract.status.value === 'TERMINATED'
        ? 'FINAL_SETTLEMENT'
        : contract.status.value === 'EXPIRED'
          ? 'RENEWAL_REVIEW'
          : 'ACTIVE_EMPLOYEE',
  base_salary: contract.base_salary.toFixed(2),
  exchange_rate: contract.exchange_rate.toFixed(4),
  amount_base: contract.amount_base.toFixed(2),
  start_date: contract.start_date.toISOString(),
  end_date: contract.end_date?.toISOString() ?? null,
  termination_date: contract.termination_date?.toISOString() ?? null,
  remaining_days: contract.end_date ? getRemainingDays(contract.end_date) : null,
  duration_label: formatDateRangeDuration(contract.start_date, contract.end_date),
  created_at: contract.created_at.toISOString(),
  updated_at: contract.updated_at.toISOString(),
  staff: {
    ...contract.staff,
    full_name: `${contract.staff.first_name} ${contract.staff.last_name}`.trim(),
    salary: contract.staff.salary.toFixed(2),
    salary_exchange_rate: contract.staff.salary_exchange_rate.toFixed(4)
  }
})

const getActionContext = async (payload, permissions) => {
  const locale = normalizeLocale(payload?.locale)
  const dictionary = await getDictionary(locale)
  const authorization = await authorizeAction(permissions)
  const translations = dictionary.hrmContracts

  if (!authorization.authorized) {
    return {
      authorized: false,
      code: authorization.code,
      error:
        authorization.code === 'UNAUTHENTICATED'
          ? translations.messages.unauthenticated
          : translations.messages.forbidden,
      translations
    }
  }

  return { authorized: true, session: authorization.session, translations }
}

const validateContract = (payload, translations) =>
  safeParse(createStaffContractSchema(translations.validation), {
    staff_id: payload?.staff_id,
    contract_type_id: payload?.contract_type_id,
    template_id: payload?.template_id,
    contract_duration: payload?.contract_duration,
    position_title: payload?.position_title,
    base_salary: payload?.base_salary,
    currency: payload?.currency,
    exchange_rate: payload?.exchange_rate,
    start_date: payload?.start_date,
    end_date: payload?.end_date || '',
    document_url: payload?.document_url || '',
    status_id: payload?.status_id,
    probation_days: payload?.probation_days ?? 90,
    notice_period_days: payload?.notice_period_days ?? 30,
    termination_date: payload?.termination_date || '',
    termination_reason: payload?.termination_reason || ''
  })

const validateDateRange = values => {
  if (!values.end_date) return true

  return toDate(values.end_date) >= toDate(values.start_date)
}

const getValidatedRelations = async (values, currentContract = null) => {
  const [staff, contractType, policy, duration, status, setup] = await Promise.all([
    prisma.hrmstaff.findUnique({
      where: { id: values.staff_id },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        father_name: true,
        tazkira_no: true,
        position: true,
        email: true,
        phone: true,
        address: true,
        join_date: true,
        contract_period: true,
        salary: true,
        salary_currency: true,
        salary_exchange_rate: true
      }
    }),
    prisma.option.findFirst({
      where: {
        id: values.contract_type_id,
        category: {
          in: [CONTRACT_TYPE_DOMAINS.HRM, ...(currentContract?.contract_type_id === values.contract_type_id ? ['CONTRACT_POLICY'] : [])]
        },
        ...(currentContract?.contract_type_id === values.contract_type_id ? {} : { is_active: true })
      },
      select: { id: true, category: true, label: true }
    }),
    prisma.option.findFirst({
      where: {
        id: values.template_id,
        category: 'CONTRACT_POLICY',
        ...(currentContract?.template_id === values.template_id ? {} : { is_active: true })
      },
      select: { id: true, label: true, description: true }
    }),
    prisma.option.findFirst({
      where: {
        id: values.contract_duration,
        category: 'CONTRACT_DURATION',
        ...(currentContract?.duration_id === values.contract_duration ? {} : { is_active: true })
      },
      select: { id: true, label: true, value: true, description: true }
    }),
    prisma.option.findFirst({
      where: {
        id: values.status_id,
        category: 'CONTRACT_STATUS',
        ...(currentContract?.status_id === values.status_id ? {} : { is_active: true })
      },
      select: { id: true, value: true }
    }),
    getCompanySetupRecord()
  ])

  return {
    staff,
    contractType,
    policy,
    duration,
    status:
      status &&
      (CONTRACT_STATUS_VALUES.includes(status.value) || currentContract?.status_id === status.id)
        ? status
        : null,
    setup
  }
}

const lifecycleData = ({ status, values, previousStatus = null }) => {
  const today = toDate(new Date())
  const endDate = values.end_date ? toDate(values.end_date) : null

  if (
    status === 'ACTIVE' &&
    (!endDate || endDate < today || (previousStatus === 'EXPIRED' && endDate.getTime() <= today.getTime()))
  ) {
    const error = new Error('An active contract must have an end date today or in the future.')

    error.code = previousStatus === 'EXPIRED' ? 'EXTENSION_REQUIRED' : 'ACTIVE_END_DATE_REQUIRED'
    throw error
  }

  if (status === 'TERMINATED') {
    const reason = values.termination_reason?.trim()
    const terminationDate = values.termination_date ? toDate(values.termination_date) : null

    if (!reason || !terminationDate) {
      const error = new Error('Termination date and reason are required.')

      error.code = 'TERMINATION_DETAILS_REQUIRED'
      throw error
    }

    const startDate = toDate(values.start_date)

    if (terminationDate < startDate || terminationDate > today) {
      const error = new Error('Termination date must be between the contract start date and today.')

      error.code = 'INVALID_TERMINATION_DATE'
      throw error
    }

    return {
      payroll_frozen: true,
      renewal_review_required: false,
      final_settlement_required: true,
      termination_date: terminationDate,
      termination_reason: reason
    }
  }

  return {
    payroll_frozen: status !== 'ACTIVE',
    renewal_review_required: status === 'EXPIRED',
    final_settlement_required: false,
    termination_date: null,
    termination_reason: null
  }
}

const syncStaffAccess = async (transaction, { staffId, status, terminationDate = null, compensation = null }) => {
  if (!['ACTIVE', 'TERMINATED'].includes(status)) return

  const staff = await transaction.hrmstaff.update({
    where: { id: staffId },
    data:
      status === 'ACTIVE'
        ? {
            status: 'ACTIVE',
            termination_date: null,
            ...(compensation
              ? {
                  salary: compensation.base_salary,
                  salary_currency: compensation.currency,
                  salary_exchange_rate: compensation.exchange_rate,
                  amount_base: compensation.amount_base
                }
              : {})
          }
        : { status: 'TERMINATED', termination_date: terminationDate },
    select: { user_id: true }
  })

  if (!staff.user_id) return

  await transaction.user.update({
    where: { id: staff.user_id },
    data: { account_status: status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE' }
  })

  if (status === 'TERMINATED') {
    await transaction.session.deleteMany({ where: { userId: staff.user_id } })
  }
}

const expireDueContracts = async () => {
  const expiredStatus = await prisma.option.findFirst({
    where: { category: 'CONTRACT_STATUS', value: 'EXPIRED', is_active: true },
    select: { id: true }
  })

  if (!expiredStatus) return

  await prisma.hrmstaffcontract.updateMany({
    where: {
      status: { is: { value: 'ACTIVE' } },
      end_date: { lt: toDate(new Date()) }
    },
    data: {
      status_id: expiredStatus.id,
      payroll_frozen: true,
      renewal_review_required: true
    }
  })
}

const revalidateContractPaths = (id = null) => {
  revalidatePath('/[lang]/hrm/contracts', 'page')
  revalidatePath('/[lang]/hrm/staff', 'page')
  if (id) revalidatePath(`/[lang]/hrm/contracts/${id}/print`, 'page')
}

export const getStaffContracts = async (payload = {}) => {
  const context = await getActionContext(payload, CONTRACT_READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const requestedPage = Number.parseInt(payload.page, 10)
  const requestedLimit = Number.parseInt(payload.limit, 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const statusId = normalizeId(payload.statusId)
  const contractTypeId = normalizeId(payload.contractTypeId)
  const searchTokens = search.split(/\s+/).filter(Boolean)

  const where = {
    ...(search && {
      OR: [
        { contract_number: { contains: search } },
        {
          staff: {
            is: {
              AND: searchTokens.map(token => ({
                OR: [{ first_name: { contains: token } }, { last_name: { contains: token } }]
              }))
            }
          }
        }
      ]
    }),
    ...(statusId && { status_id: statusId }),
    ...(contractTypeId && { contract_type_id: contractTypeId })
  }

  try {
    await expireDueContracts()

    const today = new Date()
    const inThirtyDays = new Date(today)

    today.setUTCHours(0, 0, 0, 0)
    inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30)
    inThirtyDays.setUTCHours(23, 59, 59, 999)

    const [totalCount, contracts, activeCount, expiringSoonCount, draftCount, totalValue] = await prisma.$transaction([
      prisma.hrmstaffcontract.count({ where }),
      prisma.hrmstaffcontract.findMany({
        where,
        select: contractSelect,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.hrmstaffcontract.count({ where: { status: { is: { value: 'ACTIVE' } } } }),
      prisma.hrmstaffcontract.count({
        where: {
          status: { is: { value: 'ACTIVE' } },
          end_date: { gte: today, lte: inThirtyDays }
        }
      }),
      prisma.hrmstaffcontract.count({ where: { status: { is: { value: 'DRAFT' } } } }),
      prisma.hrmstaffcontract.aggregate({ _sum: { amount_base: true } })
    ])

    return {
      success: true,
      data: {
        contracts: contracts.map(normalizeContract),
        totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        summary: {
          active: activeCount,
          expiringSoon: expiringSoonCount,
          draft: draftCount,
          pendingOnboarding: draftCount,
          totalValue: totalValue._sum.amount_base?.toFixed(2) || '0.00'
        }
      }
    }
  } catch {
    return { success: false, code: 'CONTRACTS_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getContractFormOptions = async (payload = {}) => {
  const context = await getActionContext(payload, CONTRACT_READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const [staff, contractTypes, policies, statuses, setup, clients, leads, invoices, commonOptions] = await Promise.all([
      prisma.hrmstaff.findMany({
        where: { status: { not: 'TERMINATED' } },
        select: { id: true, first_name: true, last_name: true, position: true, salary: true, salary_currency: true, salary_exchange_rate: true, tazkira_no: true },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
      }),
      getContractTypeOptions(),
      prisma.option.findMany({
        where: { category: 'CONTRACT_POLICY', is_active: true },
        select: { id: true, label: true, value: true, description: true },
        orderBy: { label: 'asc' }
      }),
      getContractStatusOptions(),
      getCompanySetupRecord(),
      prisma.crmclient.findMany({
        where: { status: 'ACTIVE', NOT: { email: { endsWith: '.invalid' } } },
        select: { id: true, company_name: true, primary_contact_name: true, email: true },
        orderBy: { company_name: 'asc' },
        take: 500
      }),
      prisma.crmlead.findMany({
        select: { id: true, title: true, company_name: true, contact_name: true, email: true },
        orderBy: { created_at: 'desc' },
        take: 500
      }),
      prisma.contractinvoice.findMany({
        select: { id: true, invoice_number: true, client_id: true, amount: true, currency: true, issued_date: true },
        orderBy: { created_at: 'desc' },
        take: 500
      }),
      prisma.option.findMany({
        where: { category: { in: ['CONTRACT_DURATION', 'CONTRACT_COUNTRY', 'CONTRACT_LEVEL'] }, is_active: true },
        select: { id: true, category: true, label: true, value: true, description: true, is_default: true },
        orderBy: [{ category: 'asc' }, { sort_order: 'asc' }, { label: 'asc' }]
      })
    ])

    return {
      success: true,
      data: {
        staff: staff.map(item => ({
          ...item,
          full_name: `${item.first_name} ${item.last_name}`.trim(),
          salary: item.salary.toFixed(2),
          salary_exchange_rate: item.salary_exchange_rate.toFixed(4)
        })),
        contractTypes: contractTypes.filter(option => option.category === CONTRACT_TYPE_DOMAINS.HRM),
        policies,
        statuses,
        setup,
        clients,
        leads,
        invoices: invoices.map(invoice => ({
          ...invoice,
          amount: invoice.amount.toFixed(2),
          issued_date: invoice.issued_date.toISOString()
        })),
        templates: policies,
        options: {
          CONTRACT_TYPES: contractTypes,
          CONTRACT_STATUS: statuses,
          CONTRACT_DURATION: commonOptions.filter(option => option.category === 'CONTRACT_DURATION'),
          CONTRACT_COUNTRY: commonOptions.filter(option => option.category === 'CONTRACT_COUNTRY'),
          CONTRACT_LEVEL: commonOptions.filter(option => option.category === 'CONTRACT_LEVEL')
        },
        baseCurrency: SYSTEM_BASE_CURRENCY,
        exchangeRate: setup.usd_afn_exchange_rate || '65.0000'
      }
    }
  } catch {
    return { success: false, code: 'CONTRACT_OPTIONS_FAILED', error: context.translations.messages.optionsLoadFailed }
  }
}

export const getStaffContractById = async (id, payload = {}) => {
  const context = await getActionContext(payload, CONTRACT_READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const contractId = normalizeId(id)

  if (!contractId) return { success: false, code: 'CONTRACT_NOT_FOUND', error: context.translations.messages.notFound }

  try {
    await expireDueContracts()

    const [contract, setup, branding] = await Promise.all([
      prisma.hrmstaffcontract.findUnique({ where: { id: contractId }, select: contractSelect }),
      getCompanySetupRecord(),
      getBrandingSettings()
    ])

    if (!contract) return { success: false, code: 'CONTRACT_NOT_FOUND', error: context.translations.messages.notFound }

    return {
      success: true,
      data: {
        contract: normalizeContract(contract),
        setup: { ...setup, company_logo: setup.company_logo || branding.lightLogoUrl || null }
      }
    }
  } catch {
    return { success: false, code: 'CONTRACT_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const createStaffContract = async (payload = {}) => {
  const context = await getActionContext(payload, CONTRACT_WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = validateContract(payload, context.translations)

  if (!validation.success) {
    return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message || context.translations.validation.invalidSubmission }
  }

  if (!validateDateRange(validation.output)) {
    return { success: false, code: 'INVALID_DATE_RANGE', error: context.translations.validation.endDateBeforeStart }
  }

  try {
    const relations = await getValidatedRelations(validation.output)

    if (!relations.staff) return { success: false, code: 'STAFF_NOT_FOUND', error: context.translations.messages.staffNotFound }
    if (!relations.contractType || !relations.policy) return { success: false, code: 'POLICY_NOT_FOUND', error: context.translations.messages.policyNotFound }
    if (!relations.duration) return { success: false, code: 'DURATION_NOT_FOUND', error: context.translations.validation.durationInvalid || 'Select a valid contract duration.' }
    if (!relations.status) return { success: false, code: 'STATUS_NOT_FOUND', error: context.translations.messages.statusNotFound }

    const effects = lifecycleData({ status: relations.status.value, values: validation.output })

    const contract = await withSequentialNumberRetry(() => prisma.$transaction(async transaction => {
      const contractNumber = await nextSequentialNumber(transaction, 'staffContract', {
        prefix: `CTR-${new Date().getUTCFullYear()}-`,
        digits: 4
      })

      const contentHtml = compileTemplate({
        template: relations.policy.description,
        staff: relations.staff,
        values: validation.output,
        setup: relations.setup,
        contractNumber,
        contractType: relations.contractType
      })

      const created = await transaction.hrmstaffcontract.create({
        data: {
          staff_id: validation.output.staff_id,
          contract_number: contractNumber,
          contract_type_id: validation.output.contract_type_id,
          template_id: validation.output.template_id,
          duration_id: validation.output.contract_duration,
          position_title: validation.output.position_title,
          base_salary: new Prisma.Decimal(validation.output.base_salary),
          currency: validation.output.currency,
          exchange_rate: new Prisma.Decimal(validation.output.exchange_rate),
          amount_base: new Prisma.Decimal(
            convertToBaseCurrency(
              validation.output.base_salary,
              validation.output.currency,
              validation.output.exchange_rate,
              SYSTEM_BASE_CURRENCY
            )
          ),
          start_date: toDate(validation.output.start_date),
          end_date: validation.output.end_date ? toDate(validation.output.end_date) : null,
          document_url: nullableText(validation.output.document_url),
          content_html: contentHtml,
          status_id: validation.output.status_id,
          probation_days: Math.trunc(validation.output.probation_days),
          notice_period_days: Math.trunc(validation.output.notice_period_days),
          ...effects
        },
        select: contractSelect
      })

      await syncStaffAccess(transaction, {
        staffId: created.staff_id,
        status: relations.status.value,
        terminationDate: effects.termination_date,
        compensation: created
      })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'HRM_CONTRACT_CREATED',
          module: 'HRM',
          details: { contractId: created.id, contractNumber, staffId: created.staff_id }
        }
      })

      return created
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }))

    revalidateContractPaths(contract.id)

    return { success: true, data: normalizeContract(contract), message: context.translations.messages.created }
  } catch (error) {
    if (['TERMINATION_DETAILS_REQUIRED', 'INVALID_TERMINATION_DATE', 'ACTIVE_END_DATE_REQUIRED'].includes(error?.code)) {
      return { success: false, code: error.code, error: error.message }
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, code: 'CONTRACT_NUMBER_CONFLICT', error: context.translations.messages.numberConflict }
    }

    return { success: false, code: 'CONTRACT_CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateStaffContract = async (id, payload = {}) => {
  const context = await getActionContext(payload, CONTRACT_WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const contractId = normalizeId(id)
  const validation = validateContract(payload, context.translations)

  if (!contractId || !validation.success) {
    return { success: false, code: 'VALIDATION_ERROR', error: validation.issues?.[0]?.message || context.translations.validation.invalidSubmission }
  }

  if (!validateDateRange(validation.output)) {
    return { success: false, code: 'INVALID_DATE_RANGE', error: context.translations.validation.endDateBeforeStart }
  }

  try {
    const existing = await prisma.hrmstaffcontract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        contract_number: true,
        contract_type_id: true,
        template_id: true,
        duration_id: true,
        status_id: true,
        status: { select: { value: true } },
        currency: true,
        exchange_rate: true
      }
    })

    if (!existing) return { success: false, code: 'CONTRACT_NOT_FOUND', error: context.translations.messages.notFound }

    const relations = await getValidatedRelations(validation.output, existing)

    if (!relations.staff) return { success: false, code: 'STAFF_NOT_FOUND', error: context.translations.messages.staffNotFound }
    if (!relations.contractType || !relations.policy) return { success: false, code: 'POLICY_NOT_FOUND', error: context.translations.messages.policyNotFound }
    if (!relations.duration) return { success: false, code: 'DURATION_NOT_FOUND', error: context.translations.validation.durationInvalid || 'Select a valid contract duration.' }
    if (!relations.status) return { success: false, code: 'STATUS_NOT_FOUND', error: context.translations.messages.statusNotFound }

    const effects = lifecycleData({
      status: relations.status.value,
      values: validation.output,
      previousStatus: existing.status.value
    })

    const contentHtml = compileTemplate({
      template: relations.policy.description,
      staff: relations.staff,
      values: validation.output,
      setup: relations.setup,
      contractNumber: existing.contract_number,
      contractType: relations.contractType
    })

    const contract = await prisma.$transaction(async transaction => {
      const updated = await transaction.hrmstaffcontract.update({
        where: { id: contractId },
        data: {
          staff_id: validation.output.staff_id,
          contract_type_id: validation.output.contract_type_id,
          template_id: validation.output.template_id,
          duration_id: validation.output.contract_duration,
          position_title: validation.output.position_title,
          base_salary: new Prisma.Decimal(validation.output.base_salary),
          currency: validation.output.currency,
          exchange_rate: new Prisma.Decimal(validation.output.exchange_rate),
          amount_base: new Prisma.Decimal(
            convertToBaseCurrency(
              validation.output.base_salary,
              validation.output.currency,
              validation.output.exchange_rate,
              SYSTEM_BASE_CURRENCY
            )
          ),
          start_date: toDate(validation.output.start_date),
          end_date: validation.output.end_date ? toDate(validation.output.end_date) : null,
          document_url: nullableText(validation.output.document_url),
          content_html: contentHtml,
          status_id: validation.output.status_id,
          probation_days: Math.trunc(validation.output.probation_days),
          notice_period_days: Math.trunc(validation.output.notice_period_days),
          ...effects
        },
        select: contractSelect
      })

      await syncStaffAccess(transaction, {
        staffId: updated.staff_id,
        status: relations.status.value,
        terminationDate: effects.termination_date,
        compensation: updated
      })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'HRM_CONTRACT_UPDATED',
          module: 'HRM',
          details: { contractId, contractNumber: updated.contract_number, staffId: updated.staff_id }
        }
      })

      return updated
    })

    revalidateContractPaths(contract.id)

    return { success: true, data: normalizeContract(contract), message: context.translations.messages.updated }
  } catch (error) {
    if (['TERMINATION_DETAILS_REQUIRED', 'INVALID_TERMINATION_DATE', 'ACTIVE_END_DATE_REQUIRED', 'EXTENSION_REQUIRED'].includes(error?.code)) {
      return { success: false, code: error.code, error: error.message }
    }

    return { success: false, code: 'CONTRACT_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateStaffContractStatus = async (id, statusId, payload = {}) => {
  const context = await getActionContext(payload, CONTRACT_WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const contractId = normalizeId(id)
  const normalizedStatusId = normalizeId(statusId)

  if (!contractId || !normalizedStatusId) {
    return { success: false, code: 'INVALID_STATUS', error: context.translations.validation.statusInvalid }
  }

  try {
    const [status, existing] = await Promise.all([
      prisma.option.findFirst({
        where: {
          id: normalizedStatusId,
          category: 'CONTRACT_STATUS',
          value: { in: CONTRACT_STATUS_VALUES },
          is_active: true
        },
        select: { id: true, value: true }
      }),
      prisma.hrmstaffcontract.findUnique({
        where: { id: contractId },
        select: {
          id: true,
          staff_id: true,
          start_date: true,
          end_date: true,
          status: { select: { value: true } }
        }
      })
    ])

    if (!status) return { success: false, code: 'STATUS_NOT_FOUND', error: context.translations.messages.statusNotFound }
    if (!existing) return { success: false, code: 'CONTRACT_NOT_FOUND', error: context.translations.messages.notFound }

    const transitions = {
      DRAFT: ['ACTIVE', 'TERMINATED'],
      ACTIVE: ['DRAFT', 'EXPIRED', 'TERMINATED'],
      EXPIRED: ['ACTIVE', 'TERMINATED'],
      TERMINATED: []
    }

    if (status.value !== existing.status.value && !transitions[existing.status.value]?.includes(status.value)) {
      return { success: false, code: 'INVALID_STATUS_TRANSITION', error: 'This contract status transition is not allowed.' }
    }

    const effects = lifecycleData({
      status: status.value,
      previousStatus: existing.status.value,
      values: {
        start_date: existing.start_date,
        end_date: existing.end_date,
        termination_date: payload?.termination_date,
        termination_reason: payload?.termination_reason
      }
    })

    const contract = await prisma.$transaction(async transaction => {
      const updated = await transaction.hrmstaffcontract.update({
        where: { id: contractId },
        data: { status_id: status.id, ...effects },
        select: contractSelect
      })

      await syncStaffAccess(transaction, {
        staffId: updated.staff_id,
        status: status.value,
        terminationDate: effects.termination_date,
        compensation: updated
      })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'HRM_CONTRACT_STATUS_UPDATED',
          module: 'HRM',
          details: {
            contractId,
            contractNumber: updated.contract_number,
            previousStatus: existing.status.value,
            status: status.value,
            terminationDate: effects.termination_date,
            terminationReason: effects.termination_reason,
            payrollFrozen: effects.payroll_frozen,
            finalSettlementRequired: effects.final_settlement_required
          }
        }
      })

      return updated
    })

    revalidateContractPaths(contract.id)

    return { success: true, data: normalizeContract(contract), message: context.translations.messages.statusUpdated }
  } catch (error) {
    if (['TERMINATION_DETAILS_REQUIRED', 'INVALID_TERMINATION_DATE', 'ACTIVE_END_DATE_REQUIRED', 'EXTENSION_REQUIRED'].includes(error?.code)) {
      return { success: false, code: error.code, error: error.message }
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return { success: false, code: 'CONTRACT_NOT_FOUND', error: context.translations.messages.notFound }
    }

    return { success: false, code: 'STATUS_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}
