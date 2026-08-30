'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { CONTRACT_STATUS_VALUES } from '@/data/contracts'
import { CONTRACT_TYPE_CATEGORIES, CONTRACT_TYPE_DOMAINS } from '@/data/contractTypes'
import { authorizeAction } from '@/libs/actionAuthorization'
import { runContractExpirationAuditCore } from '@/libs/contractExpirationAudit'
import { getContractStatusOptions } from '@/libs/contractStatuses'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { getContractTypeOptions } from '@/libs/contractTypes'
import { compileCustomerContractTemplate } from '@/libs/customerContractTemplate'
import { prisma } from '@/libs/prisma'
import { nextSequentialNumber, withSequentialNumberRetry } from '@/libs/sequentialNumbers'
import { createContractSchema } from '@/schemas/contracts'
import { calculateContractEndDate, getRemainingDays, toUtcDateOnly } from '@/utils/contractDuration'
import { SYSTEM_BASE_CURRENCY, convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'
import { getDictionary } from '@/utils/getDictionary'

const READ_PERMISSIONS = ['contracts:read', 'contracts:write']
const WRITE_PERMISSIONS = ['contracts:write']
const DELETE_PERMISSIONS = ['contracts:delete']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const DRAFT_VALUES = ['DRAFT', 'PENDING', 'PENDING_APPROVAL', 'PENDING_SIGNATURE']
const CONTRACT_CONTEXTS = ['CUSTOMER', 'FINANCE', 'OTHERS']

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')

const normalizeContractContext = value => (CONTRACT_CONTEXTS.includes(value) ? value : null)

const getContextTypeCategories = contractContext => [
  CONTRACT_TYPE_DOMAINS[contractContext],
  ...(contractContext === 'CUSTOMER' ? ['CONTRACT_TYPE'] : [])
]

const getContractScopeWhere = contractContext => ({
  contract_type: { is: { category: { in: getContextTypeCategories(contractContext) } } }
})

const getContext = async (payload, permissions) => {
  const locale = normalizeLocale(payload?.locale)
  const [authorization, dictionary] = await Promise.all([authorizeAction(permissions), getDictionary(locale)])
  const translations = dictionary.contractsMain

  if (!authorization.authorized) {
    return {
      authorized: false,
      code: authorization.code,
      error:
        authorization.code === 'UNAUTHENTICATED'
          ? translations.messages.unauthenticated
          : translations.messages.forbidden,
      locale,
      translations
    }
  }

  return { authorized: true, session: authorization.session, locale, translations }
}

const contractSelect = {
  id: true,
  client_id: true,
  vendor_id: true,
  lead_id: true,
  contract_number: true,
  title: true,
  status_id: true,
  total_amount: true,
  contract_duration: true,
  contract_type_id: true,
  template_id: true,
  content_html: true,
  country_id: true,
  percentage: true,
  currency: true,
  exchange_rate: true,
  amount_base: true,
  level_id: true,
  signed_date: true,
  start_date: true,
  end_date: true,
  auto_renew: true,
  renewal_status: true,
  document_url: true,
  account_manager_id: true,
  created_at: true,
  updated_at: true,
  client: {
    select: {
      id: true,
      company_name: true,
      primary_contact_name: true,
      email: true,
      phone: true,
      address: true,
      tax_id: true
    }
  },
  vendor: {
    select: {
      id: true,
      company_name: true,
      contact_name: true,
      email: true,
      phone: true,
      address: true,
      is_active: true
    }
  },
  status: { select: { id: true, label: true, value: true, color_code: true, is_active: true } },
  contract_type: { select: { id: true, label: true, value: true, category: true, is_active: true } },
  template: { select: { id: true, label: true, value: true, description: true, is_active: true } },
  country: { select: { id: true, label: true, value: true } },
  level: { select: { id: true, label: true, value: true } },
  account_manager: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      position: true,
      user: { select: { image: true } }
    }
  },
  _count: { select: { projects: true, invoices: true, notifications: true } }
}

const normalizeContract = (contract, durationOptions = new Map()) => ({
  ...contract,
  total_amount: contract.total_amount.toFixed(2),
  exchange_rate: contract.exchange_rate.toFixed(4),
  amount_base: contract.amount_base.toFixed(2),
  percentage: contract.percentage?.toFixed(2) ?? null,
  amount_usd: convertToBaseCurrency(
    contract.total_amount,
    contract.currency,
    contract.exchange_rate,
    'USD'
  ).toFixed(2),
  signed_date: contract.signed_date?.toISOString() ?? null,
  start_date: contract.start_date.toISOString(),
  end_date: contract.end_date.toISOString(),
  created_at: contract.created_at.toISOString(),
  updated_at: contract.updated_at.toISOString(),
  remaining_days: getRemainingDays(contract.end_date),
  duration_option: durationOptions.get(contract.contract_duration) ?? null,
  account_manager: contract.account_manager
    ? {
        ...contract.account_manager,
        full_name: `${contract.account_manager.first_name} ${contract.account_manager.last_name}`.trim()
      }
    : null
})

const getDurationMap = async contracts => {
  const ids = [...new Set(contracts.map(contract => contract.contract_duration).filter(Boolean))]

  if (ids.length === 0) return new Map()

  const options = await prisma.option.findMany({
    where: { id: { in: ids }, category: 'CONTRACT_DURATION' },
    select: { id: true, label: true, value: true, description: true }
  })

  return new Map(options.map(option => [option.id, option]))
}

const getTabWhere = tab => {
  const today = toUtcDateOnly(new Date())
  const inThirtyDays = new Date(today)

  inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30)

  if (tab === 'ACTIVE') {
    return { status: { is: { value: 'ACTIVE' } }, end_date: { gte: today } }
  }

  if (tab === 'EXPIRING') {
    return { status: { is: { value: 'ACTIVE' } }, end_date: { gte: today, lte: inThirtyDays } }
  }

  if (tab === 'DRAFT') return { status: { is: { value: { in: DRAFT_VALUES } } } }

  if (tab === 'EXPIRED') {
    return { OR: [{ end_date: { lt: today } }, { status: { is: { value: 'EXPIRED' } } }] }
  }

  return {}
}

const validateRelations = async (values, currentContract = null) => {
  const countryCategory = values.target_category === 'OTHERS' ? 'COUNTRY' : 'CONTRACT_COUNTRY'

  const categories = [
    ['duration', values.contract_duration, 'CONTRACT_DURATION', currentContract?.contract_duration],
    ['status', values.status_id, 'CONTRACT_STATUS', currentContract?.status_id],
    ['country', values.country_id, countryCategory, currentContract?.country_id],
    ['level', values.level_id, 'CONTRACT_LEVEL', currentContract?.level_id]
  ]

  const [client, lead, manager, contractType, template, setup, ...optionResults] = await Promise.all([
    values.client_id
      ? prisma.crmclient.findUnique({
          where: { id: values.client_id },
          select: {
            id: true,
            company_name: true,
            primary_contact_name: true,
            email: true,
            phone: true,
            address: true,
            tax_id: true
          }
        })
      : null,
    values.lead_id ? prisma.crmlead.findUnique({ where: { id: values.lead_id }, select: { id: true } }) : null,
    values.account_manager_id
      ? prisma.hrmstaff.findFirst({
          where: { id: values.account_manager_id, status: 'ACTIVE' },
          select: { id: true, first_name: true, last_name: true, email: true, phone: true, position: true }
        })
      : null,
    prisma.option.findFirst({
      where: {
        id: values.contract_type_id,
        category: {
          in: getContextTypeCategories(values.target_category)
        },
        ...(currentContract?.contract_type_id === values.contract_type_id ? {} : { is_active: true })
      },
      select: { id: true, label: true, value: true, description: true, category: true }
    }),
    values.template_id
      ? prisma.option.findFirst({
          where: {
            id: values.template_id,
            category: 'CONTRACT_POLICY',
            ...(currentContract?.template_id === values.template_id ? {} : { is_active: true })
          },
          select: { id: true, label: true, value: true, description: true }
        })
      : null,
    getCompanySetupRecord(),
    ...categories.map(([, id, category, currentId]) =>
      id
        ? prisma.option.findFirst({
            where: { id, category, ...(id === currentId ? {} : { is_active: true }) },
            select: { id: true, label: true, value: true, description: true }
          })
        : null
    )
  ])

  const statusOption = optionResults[categories.findIndex(([key]) => key === 'status')]

  const statusIsCanonical =
    statusOption &&
    (CONTRACT_STATUS_VALUES.includes(statusOption.value) || currentContract?.status_id === statusOption.id)

  return {
    client,
    lead,
    manager,
    contractType,
    template,
    setup,
    ...Object.fromEntries(
      categories.map(([key], index) => [key, key === 'status' && !statusIsCanonical ? null : optionResults[index]])
    )
  }
}

const validationPayload = (payload, contractContext) => ({
  target_category: contractContext,
  client_id: payload?.client_id,
  vendor_id: payload?.vendor_id || '',
  vendor_name: payload?.vendor_name || '',
  vendor_contact_name: payload?.vendor_contact_name || '',
  vendor_contact_email: payload?.vendor_contact_email || '',
  vendor_phone: payload?.vendor_phone || '',
  vendor_address: payload?.vendor_address || '',
  lead_id: payload?.lead_id || '',
  title: payload?.title,
  contract_type_id: payload?.contract_type_id,
  template_id: payload?.template_id || '',
  contract_duration: payload?.contract_duration,
  total_amount: String(payload?.total_amount ?? ''),
  currency: payload?.currency,
  exchange_rate: String(payload?.exchange_rate ?? ''),
  start_date: payload?.start_date,
  end_date: payload?.end_date || '',
  status_id: payload?.status_id,
  country_id: payload?.country_id || '',
  level_id: payload?.level_id || '',
  account_manager_id: payload?.account_manager_id || '',
  termination_reason: payload?.termination_reason || '',
  auto_renew: Boolean(payload?.auto_renew)
})

const prepareContractData = async (values, translations, currentContract = null) => {
  const relations = await validateRelations(values, currentContract)
  const isOther = values.target_category === 'OTHERS'
  const isCustomer = values.target_category === 'CUSTOMER'

  if (
    (!isOther && !relations.client) ||
    !relations.contractType ||
    (isCustomer && !relations.template) ||
    (!isOther && !relations.duration) ||
    !relations.status
  ) {
    return { success: false, error: translations.validation.invalidOption }
  }

  if (values.lead_id && !relations.lead) return { success: false, error: translations.validation.invalidOption }

  if (values.account_manager_id && !relations.manager) {
    return { success: false, error: translations.validation.invalidManager }
  }

  if (isOther && (!values.account_manager_id || !relations.manager)) {
    return { success: false, error: translations.validation.invalidManager }
  }

  if (
    isOther &&
    (!values.vendor_name || !values.vendor_contact_name || !values.vendor_contact_email || !values.country_id)
  ) {
    return { success: false, error: translations.validation.required }
  }

  if ((values.country_id && !relations.country) || (values.level_id && !relations.level)) {
    return { success: false, error: translations.validation.invalidOption }
  }

  const endDate = isOther
    ? toUtcDateOnly(values.end_date)
    : calculateContractEndDate(values.start_date, relations.duration)

  const amount = toFiniteNumber(values.total_amount)
  const exchangeRate = toFiniteNumber(values.exchange_rate)

  if (!endDate) return { success: false, error: translations.validation.durationInvalid }
  if (amount <= 0) return { success: false, error: translations.validation.amountInvalid }
  if (exchangeRate <= 0) return { success: false, error: translations.validation.exchangeRateInvalid }

  const baseCurrency = SYSTEM_BASE_CURRENCY
  const amountBase = convertToBaseCurrency(amount, values.currency, exchangeRate, baseCurrency)

  return {
    success: true,
    data: {
      client_id: isOther ? null : values.client_id,
      vendor_id: isOther ? values.vendor_id || null : null,
      lead_id: values.lead_id || null,
      title: values.title,
      status_id: values.status_id,
      total_amount: new Prisma.Decimal(amount),
      contract_duration: values.contract_duration || null,
      contract_type_id: values.contract_type_id,
      template_id: isCustomer ? values.template_id : null,
      country_id: values.country_id || null,
      level_id: values.level_id || null,
      currency: values.currency,
      exchange_rate: new Prisma.Decimal(exchangeRate),
      amount_base: new Prisma.Decimal(amountBase),
      start_date: toUtcDateOnly(values.start_date),
      end_date: endDate,
      auto_renew: values.auto_renew,
      account_manager_id: values.account_manager_id || null,
      renewal_status:
        relations.status.value === 'ACTIVE'
          ? 'ACTIVE'
          : relations.status.value === 'EXPIRED'
            ? 'EXPIRED'
            : relations.status.value === 'TERMINATED'
              ? 'TERMINATED'
              : 'NOT_APPLICABLE'
    },
    relations,
    statusValue: relations.status.value
  }
}

const compileCustomerContent = (prepared, contractNumber) => {
  const manager = prepared.relations.manager
    ? {
        ...prepared.relations.manager,
        full_name: `${prepared.relations.manager.first_name} ${prepared.relations.manager.last_name}`.trim()
      }
    : null

  return compileCustomerContractTemplate({
    template: prepared.relations.template.description,
    contract: prepared.data,
    client: prepared.relations.client,
    accountManager: manager,
    setup: prepared.relations.setup,
    contractNumber,
    contractType: prepared.relations.contractType,
    durationLabel: prepared.relations.duration?.label
  })
}

const validateActiveEndDate = (statusValue, endDate) =>
  statusValue !== 'ACTIVE' || endDate > toUtcDateOnly(new Date())

const revalidateContracts = () => {
  revalidatePath('/[lang]/contracts', 'page')
  revalidatePath('/[lang]/contracts/finance', 'page')
  revalidatePath('/[lang]/contracts/others', 'page')
  revalidatePath('/[lang]/crm/clients', 'page')
}

const upsertContractVendor = (transaction, values) =>
  transaction.contractvendor.upsert({
    where: { email: values.vendor_contact_email.toLowerCase() },
    update: {
      company_name: values.vendor_name,
      contact_name: values.vendor_contact_name,
      phone: values.vendor_phone || null,
      address: values.vendor_address || null,
      is_active: true
    },
    create: {
      company_name: values.vendor_name,
      contact_name: values.vendor_contact_name,
      email: values.vendor_contact_email.toLowerCase(),
      phone: values.vendor_phone || null,
      address: values.vendor_address || null
    },
    select: { id: true }
  })

export const getContracts = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const requestedPage = Number.parseInt(payload.page, 10)
  const requestedLimit = Number.parseInt(payload.limit, 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1

  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE

  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const statusFilter = typeof payload.statusFilter === 'string' ? payload.statusFilter : 'ALL'
  const scope = normalizeContractContext(payload.scope) || 'CUSTOMER'
  const serviceTypeId = normalizeId(payload.serviceTypeId)
  const clientId = normalizeId(payload.clientId)
  const fromDate = payload.fromDate ? toUtcDateOnly(payload.fromDate) : null
  const toDate = payload.toDate ? toUtcDateOnly(payload.toDate) : null
  const today = toUtcDateOnly(new Date())
  const inThirtyDays = new Date(today)

  inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30)

  if (toDate) toDate.setUTCDate(toDate.getUTCDate() + 1)

  const statusWhere = getTabWhere(statusFilter)

  const scopeWhere = getContractScopeWhere(scope)

  const where = {
    AND: [
      statusWhere,
      scopeWhere,
      serviceTypeId ? { contract_type_id: serviceTypeId } : {},
      clientId ? { client_id: clientId } : {},
      fromDate || toDate
        ? { end_date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lt: toDate } : {}) } }
        : {},
      search
        ? {
            OR: [
              { contract_number: { contains: search } },
              { title: { contains: search } },
              { client: { is: { company_name: { contains: search } } } },
              { vendor: { is: { company_name: { contains: search } } } },
              { vendor: { is: { contact_name: { contains: search } } } },
              { vendor: { is: { email: { contains: search } } } }
            ]
          }
        : {}
    ]
  }

  const activeWhere = { AND: [scopeWhere, { status: { is: { value: 'ACTIVE' } }, end_date: { gte: today } }] }
  const expiringWhere = { ...activeWhere, end_date: { gte: today, lte: inThirtyDays } }
  const draftWhere = { AND: [scopeWhere, { status: { is: { value: { in: DRAFT_VALUES } } } }] }

  try {
    const statuses = await getContractStatusOptions()

    const [totalCount, contracts, active, expiring, monthly, drafts, scopeTotalCount, totalValue, setup] =
      await prisma.$transaction([
        prisma.contract.count({ where }),
        prisma.contract.findMany({
          where,
          select: contractSelect,
          orderBy: [{ end_date: 'asc' }, { created_at: 'desc' }],
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.contract.aggregate({ where: activeWhere, _count: { _all: true }, _sum: { amount_base: true } }),
        prisma.contract.aggregate({ where: expiringWhere, _count: { _all: true }, _sum: { amount_base: true } }),
        prisma.contract.aggregate({ where: activeWhere, _sum: { amount_base: true } }),
        prisma.contract.count({ where: draftWhere }),
        prisma.contract.count({ where: scopeWhere }),
        prisma.contract.aggregate({ where: scopeWhere, _sum: { amount_base: true } }),
        prisma.setup.findUnique({ where: { scope: 'GLOBAL' }, select: { currency_code: true } })
      ])

    const durationMap = await getDurationMap(contracts)

    return {
      success: true,
      data: {
        contracts: contracts.map(contract => normalizeContract(contract, durationMap)),
        totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        baseCurrency: SYSTEM_BASE_CURRENCY,
        statuses,
        summary: {
          activeCount: active._count._all,
          activeValue: toFiniteNumber(active._sum.amount_base),
          expiringCount: expiring._count._all,
          expiringValue: toFiniteNumber(expiring._sum.amount_base),
          monthlyActiveRevenue: toFiniteNumber(monthly._sum.amount_base),
          draftCount: drafts,
          totalCount: scopeTotalCount,
          totalValue: toFiniteNumber(totalValue._sum.amount_base)
        }
      }
    }
  } catch {
    return { success: false, code: 'CONTRACTS_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getContractFormOptions = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const [clients, vendors, leads, invoices, staff, options, contractTypes, templates, clauses, statuses, setup] = await Promise.all([
      prisma.crmclient.findMany({
        where: { status: 'ACTIVE', NOT: { email: { endsWith: '.invalid' } } },
        select: { id: true, company_name: true, primary_contact_name: true, email: true },
        orderBy: { company_name: 'asc' },
        take: 500
      }),
      prisma.contractvendor.findMany({
        where: { is_active: true },
        select: { id: true, company_name: true, contact_name: true, email: true, phone: true, address: true },
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
      prisma.hrmstaff.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, first_name: true, last_name: true, position: true, email: true },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
      }),
      prisma.option.findMany({
        where: {
          category: { in: ['CONTRACT_TYPE', 'CONTRACT_DURATION', 'CONTRACT_COUNTRY', 'COUNTRY', 'CONTRACT_LEVEL'] },
          is_active: true
        },
        select: {
          id: true,
          category: true,
          label: true,
          value: true,
          description: true,
          is_default: true,
          color_code: true
        },
        orderBy: [{ category: 'asc' }, { sort_order: 'asc' }, { label: 'asc' }]
      }),
      getContractTypeOptions(),
      prisma.option.findMany({
        where: { category: 'CONTRACT_POLICY', is_active: true },
        select: { id: true, label: true, value: true, description: true },
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
      }),
      prisma.option.findMany({
        where: { category: 'CONTRACT_CLAUSE', is_active: true },
        select: { id: true, label: true, value: true, description: true, is_default: true, sort_order: true },
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
      }),
      getContractStatusOptions(),
      getCompanySetupRecord()
    ])

    return {
      success: true,
      data: {
        clients,
        vendors,
        leads,
        invoices: invoices.map(invoice => ({
          ...invoice,
          amount: invoice.amount.toFixed(2),
          issued_date: invoice.issued_date.toISOString()
        })),
        staff: staff.map(person => ({ ...person, full_name: `${person.first_name} ${person.last_name}`.trim() })),
        options: Object.fromEntries(
          ['CONTRACT_TYPE', 'CONTRACT_DURATION', 'CONTRACT_COUNTRY', 'COUNTRY', 'CONTRACT_LEVEL']
            .map(category => [category, options.filter(option => option.category === category)])
            .concat([
              ['CONTRACT_STATUS', statuses],
              ['CONTRACT_TYPES', contractTypes],
              ...Object.entries(CONTRACT_TYPE_DOMAINS).map(([domain, category]) => [
                `CONTRACT_TYPE_${domain}`,
                contractTypes.filter(option => option.category === category)
              ])
            ])
        ),
        templates,
        clauses,
        baseCurrency: SYSTEM_BASE_CURRENCY,
        exchangeRate: setup.usd_afn_exchange_rate || '65.0000'
      }
    }
  } catch {
    return { success: false, code: 'OPTIONS_LOAD_FAILED', error: context.translations.messages.optionsLoadFailed }
  }
}

export const getContractDetail = async (id, payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const contractId = normalizeId(id)

  if (!contractId) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

  try {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        ...contractSelect,
        notifications: {
          select: { id: true, reminder_type: true, sent_at: true, recipient_email: true, status: true },
          orderBy: { sent_at: 'desc' }
        }
      }
    })

    if (!contract) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const durationMap = await getDurationMap([contract])
    const normalized = normalizeContract(contract, durationMap)

    return {
      success: true,
      data: {
        ...normalized,
        notifications: contract.notifications.map(notification => ({
          ...notification,
          sent_at: notification.sent_at.toISOString()
        }))
      }
    }
  } catch {
    return { success: false, code: 'DETAIL_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const createContract = async (payload = {}, moduleContext = 'CUSTOMER') => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const contractContext = normalizeContractContext(moduleContext)

  if (!contractContext) {
    return { success: false, code: 'INVALID_CONTRACT_CONTEXT', error: context.translations.validation.invalidOption }
  }

  const validation = safeParse(
    createContractSchema(context.translations.validation),
    validationPayload(payload, contractContext)
  )

  if (!validation.success) {
    return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }
  }

  const prepared = await prepareContractData(validation.output, context.translations)

  if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

  if (!validateActiveEndDate(prepared.statusValue, prepared.data.end_date)) {
    return {
      success: false,
      code: 'ACTIVE_END_DATE_REQUIRED',
      error: context.translations.validation.activeEndDateRequired
    }
  }

  try {
    const contract = await withSequentialNumberRetry(() => prisma.$transaction(async transaction => {
      const contractNumber = await nextSequentialNumber(transaction, 'contract', {
        prefix: `CON-${new Date().getUTCFullYear()}-`,
        digits: 4
      })

      const vendor =
        validation.output.target_category === 'OTHERS'
          ? await upsertContractVendor(transaction, validation.output)
          : null

      const contractData = {
        ...prepared.data,
        vendor_id: vendor?.id || null,
        ...(validation.output.target_category === 'CUSTOMER'
          ? { content_html: compileCustomerContent(prepared, contractNumber) }
          : {})
      }

      const created = await transaction.contract.create({ data: { ...contractData, contract_number: contractNumber } })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'CONTRACT_CREATED',
          module: 'CONTRACTS',
          details: {
            contractId: created.id,
            contractNumber,
            clientId: created.client_id,
            vendorId: created.vendor_id,
            internalOwnerId: created.account_manager_id
          }
        }
      })

      return created
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }))

    revalidateContracts()

    return { success: true, data: { id: contract.id }, message: context.translations.messages.created }
  } catch (error) {
    if (error?.code === 'P2002')
      return { success: false, code: 'DUPLICATE', error: context.translations.messages.duplicate }

    return { success: false, code: 'CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateContract = async (id, payload = {}, moduleContext = 'CUSTOMER') => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const contractId = normalizeId(id)
  const contractContext = normalizeContractContext(moduleContext)

  const validation = contractContext
    ? safeParse(createContractSchema(context.translations.validation), validationPayload(payload, contractContext))
    : null

  if (!contractId || !validation?.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation?.issues?.[0]?.message || context.translations.validation.invalidOption
    }
  }

  try {
    const current = await prisma.contract.findUnique({ where: { id: contractId }, select: contractSelect })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    if (!getContextTypeCategories(contractContext).includes(current.contract_type.category)) {
      return { success: false, code: 'CONTRACT_CONTEXT_MISMATCH', error: context.translations.validation.invalidOption }
    }

    const prepared = await prepareContractData(validation.output, context.translations, current)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    if (!validateActiveEndDate(prepared.statusValue, prepared.data.end_date)) {
      return {
        success: false,
        code: 'ACTIVE_END_DATE_REQUIRED',
        error: context.translations.validation.activeEndDateRequired
      }
    }

    const isTermination = current.status.value !== 'TERMINATED' && prepared.statusValue === 'TERMINATED'
    const isActivation = current.status.value !== 'ACTIVE' && prepared.statusValue === 'ACTIVE'
    const terminationReason = validation.output.termination_reason.trim()

    if (isTermination && !terminationReason) {
      return {
        success: false,
        code: 'TERMINATION_REASON_REQUIRED',
        error: context.translations.validation.terminationReasonRequired
      }
    }

    const contractData = {
      ...prepared.data,
      renewal_status:
        prepared.statusValue === 'TERMINATED'
          ? 'TERMINATED'
          : prepared.statusValue === 'EXPIRED'
            ? 'EXPIRED'
            : prepared.statusValue === 'ACTIVE'
              ? 'ACTIVE'
              : 'NOT_APPLICABLE',
      ...(validation.output.target_category === 'CUSTOMER'
        ? { content_html: compileCustomerContent(prepared, current.contract_number) }
        : {})
    }

    await prisma.$transaction(async transaction => {
      const vendor =
        validation.output.target_category === 'OTHERS'
          ? await upsertContractVendor(transaction, validation.output)
          : null

      await transaction.contract.update({
        where: { id: contractId },
        data: { ...contractData, vendor_id: vendor?.id || null }
      })
      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: isTermination ? 'CONTRACT_TERMINATED' : 'CONTRACT_UPDATED',
          module: 'CONTRACTS',
          details: {
            contractId,
            contractNumber: current.contract_number,
            fromStatus: current.status.value,
            toStatus: prepared.statusValue,
            vendorId: vendor?.id || null,
            internalOwnerId: prepared.data.account_manager_id,
            ...(isTermination
              ? { reason: terminationReason, billingFrozen: true, terminatedAt: new Date().toISOString() }
              : {}),
            ...(isActivation
              ? {
                  countdownStartedAt: new Date().toISOString(),
                  renewalNotificationsScheduled: true,
                  autoRenew: validation.output.auto_renew
                }
              : {})
          }
        }
      })
    })

    revalidateContracts()

    return { success: true, message: context.translations.messages.updated }
  } catch {
    return { success: false, code: 'UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateContractStatus = async (id, statusId, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const contractId = normalizeId(id)
  const normalizedStatusId = normalizeId(statusId)

  if (!contractId || !normalizedStatusId) {
    return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidOption }
  }

  try {
    const [contract, status] = await Promise.all([
      prisma.contract.findUnique({
        where: { id: contractId },
        select: {
          id: true,
          contract_number: true,
          end_date: true,
          auto_renew: true,
          status_id: true,
          status: { select: { value: true } }
        }
      }),
      prisma.option.findFirst({
        where: {
          id: normalizedStatusId,
          category: 'CONTRACT_STATUS',
          value: { in: CONTRACT_STATUS_VALUES },
          is_active: true
        },
        select: { id: true, value: true }
      })
    ])

    if (!contract) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (!status)
      return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidOption }

    if (contract.status_id === status.id) {
      return { success: true, message: context.translations.messages.statusUpdated }
    }

    if (!validateActiveEndDate(status.value, contract.end_date)) {
      return {
        success: false,
        code: 'ACTIVE_END_DATE_REQUIRED',
        error: context.translations.validation.activeEndDateRequired
      }
    }

    const isTermination = contract.status.value !== 'TERMINATED' && status.value === 'TERMINATED'
    const terminationReason = typeof payload.reason === 'string' ? payload.reason.trim() : ''

    if (isTermination && !terminationReason) {
      return {
        success: false,
        code: 'TERMINATION_REASON_REQUIRED',
        error: context.translations.validation.terminationReasonRequired
      }
    }

    const isActivation = contract.status.value !== 'ACTIVE' && status.value === 'ACTIVE'

    await prisma.$transaction(async transaction => {
      await transaction.contract.update({
        where: { id: contractId },
        data: {
          status_id: status.id,
          renewal_status:
            status.value === 'EXPIRED'
              ? 'EXPIRED'
              : status.value === 'TERMINATED'
                ? 'TERMINATED'
                : status.value === 'ACTIVE'
                  ? 'ACTIVE'
                  : 'NOT_APPLICABLE'
        }
      })
      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: isTermination ? 'CONTRACT_TERMINATED' : 'CONTRACT_STATUS_UPDATED',
          module: 'CONTRACTS',
          details: {
            contractId,
            contractNumber: contract.contract_number,
            fromStatus: contract.status.value,
            toStatus: status.value,
            ...(isTermination
              ? { reason: terminationReason, billingFrozen: true, terminatedAt: new Date().toISOString() }
              : {}),
            ...(isActivation
              ? {
                  countdownStartedAt: new Date().toISOString(),
                  renewalNotificationsScheduled: true,
                  autoRenew: contract.auto_renew
                }
              : {})
          }
        }
      })
    })

    revalidateContracts()

    return { success: true, message: context.translations.messages.statusUpdated }
  } catch {
    return { success: false, code: 'STATUS_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const deleteContract = async (id, payload = {}) => {
  const context = await getContext(payload, DELETE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const contractId = normalizeId(id)

  if (!contractId) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

  try {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, contract_number: true, _count: { select: { projects: true, invoices: true } } }
    })

    if (!contract) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    if (contract._count.projects + contract._count.invoices > 0) {
      return { success: false, code: 'IN_USE', error: context.translations.messages.inUse }
    }

    await prisma.$transaction(async transaction => {
      await transaction.contract.delete({ where: { id: contractId } })
      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'CONTRACT_DELETED',
          module: 'CONTRACTS',
          details: { contractId, contractNumber: contract.contract_number }
        }
      })
    })

    revalidateContracts()

    return { success: true, message: context.translations.messages.deleted }
  } catch (error) {
    if (error?.code === 'P2003') return { success: false, code: 'IN_USE', error: context.translations.messages.inUse }

    return { success: false, code: 'DELETE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const runContractExpirationAudit = async (payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const data = await runContractExpirationAuditCore({ locale: context.locale, initiatedBy: context.session.user.id })

    revalidateContracts()

    return { success: true, data, message: context.translations.messages.auditComplete }
  } catch {
    return { success: false, code: 'AUDIT_FAILED', error: context.translations.messages.auditFailed }
  }
}
