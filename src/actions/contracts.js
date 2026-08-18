'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { authorizeAction } from '@/libs/actionAuthorization'
import { runContractExpirationAuditCore } from '@/libs/contractExpirationAudit'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { createContractSchema } from '@/schemas/contracts'
import { calculateContractEndDate, getRemainingDays, toUtcDateOnly } from '@/utils/contractDuration'
import { convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'
import { getDictionary } from '@/utils/getDictionary'

const READ_PERMISSIONS = ['contracts:read', 'contracts:write']
const WRITE_PERMISSIONS = ['contracts:write']
const DELETE_PERMISSIONS = ['contracts:delete']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const DRAFT_VALUES = ['DRAFT', 'PENDING', 'PENDING_APPROVAL', 'PENDING_SIGNATURE']

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')

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
  lead_id: true,
  contract_number: true,
  title: true,
  status_id: true,
  total_amount: true,
  contract_duration: true,
  contract_type_id: true,
  country_id: true,
  percentage: true,
  currency: true,
  exchange_rate: true,
  amount_base: true,
  amount_usd: true,
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
    select: { id: true, company_name: true, primary_contact_name: true, email: true, phone: true }
  },
  status: { select: { id: true, label: true, value: true, color_code: true, is_active: true } },
  contract_type: { select: { id: true, label: true, value: true, is_active: true } },
  country: { select: { id: true, label: true, value: true } },
  level: { select: { id: true, label: true, value: true } },
  account_manager: {
    select: { id: true, first_name: true, last_name: true, email: true, phone: true, position: true }
  },
  _count: { select: { projects: true, invoices: true, notifications: true } }
}

const normalizeContract = (contract, durationOptions = new Map()) => ({
  ...contract,
  total_amount: contract.total_amount.toFixed(2),
  exchange_rate: contract.exchange_rate.toFixed(4),
  amount_base: contract.amount_base.toFixed(2),
  percentage: contract.percentage?.toFixed(2) ?? null,
  amount_usd: contract.amount_usd?.toFixed(2) ?? null,
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

const generateContractNumber = async transaction => {
  const year = new Date().getUTCFullYear()
  const prefix = `CON-${year}-`

  const latest = await transaction.contract.findFirst({
    where: { contract_number: { startsWith: prefix } },
    select: { contract_number: true },
    orderBy: { contract_number: 'desc' }
  })

  const sequence = Number.parseInt(latest?.contract_number.slice(prefix.length), 10)

  return `${prefix}${String(Number.isFinite(sequence) ? sequence + 1 : 1).padStart(4, '0')}`
}

const validateRelations = async (values, currentContract = null) => {
  const categories = [
    ['contractType', values.contract_type_id, 'CONTRACT_TYPE', currentContract?.contract_type_id],
    ['duration', values.contract_duration, 'CONTRACT_DURATION', currentContract?.contract_duration],
    ['status', values.status_id, 'CONTRACT_STATUS', currentContract?.status_id],
    ['country', values.country_id, 'CONTRACT_COUNTRY', currentContract?.country_id],
    ['level', values.level_id, 'CONTRACT_LEVEL', currentContract?.level_id]
  ]

  const [client, manager, setup, ...optionResults] = await Promise.all([
    prisma.crmClient.findUnique({ where: { id: values.client_id }, select: { id: true } }),
    values.account_manager_id
      ? prisma.hrmStaff.findUnique({ where: { id: values.account_manager_id }, select: { id: true } })
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

  return {
    client,
    manager,
    setup,
    ...Object.fromEntries(categories.map(([key], index) => [key, optionResults[index]]))
  }
}

const validationPayload = payload => ({
  client_id: payload?.client_id,
  title: payload?.title,
  contract_type_id: payload?.contract_type_id,
  contract_duration: payload?.contract_duration,
  total_amount: String(payload?.total_amount ?? ''),
  currency: payload?.currency,
  exchange_rate: String(payload?.exchange_rate ?? ''),
  start_date: payload?.start_date,
  status_id: payload?.status_id,
  country_id: payload?.country_id || '',
  level_id: payload?.level_id || '',
  account_manager_id: payload?.account_manager_id || '',
  auto_renew: Boolean(payload?.auto_renew)
})

const prepareContractData = async (values, translations, currentContract = null) => {
  const relations = await validateRelations(values, currentContract)

  if (!relations.client || !relations.contractType || !relations.duration || !relations.status) {
    return { success: false, error: translations.validation.invalidOption }
  }

  if (values.account_manager_id && !relations.manager) {
    return { success: false, error: translations.validation.invalidManager }
  }

  if ((values.country_id && !relations.country) || (values.level_id && !relations.level)) {
    return { success: false, error: translations.validation.invalidOption }
  }

  const endDate = calculateContractEndDate(values.start_date, relations.duration)
  const amount = toFiniteNumber(values.total_amount)
  const exchangeRate = toFiniteNumber(values.exchange_rate)

  if (!endDate) return { success: false, error: translations.validation.durationInvalid }
  if (amount <= 0) return { success: false, error: translations.validation.amountInvalid }
  if (exchangeRate <= 0) return { success: false, error: translations.validation.exchangeRateInvalid }

  const baseCurrency = relations.setup.currency_code || 'AFN'
  const amountBase = convertToBaseCurrency(amount, values.currency, exchangeRate, baseCurrency)

  return {
    success: true,
    data: {
      client_id: values.client_id,
      title: values.title,
      status_id: values.status_id,
      total_amount: new Prisma.Decimal(amount),
      contract_duration: values.contract_duration,
      contract_type_id: values.contract_type_id,
      country_id: values.country_id || null,
      level_id: values.level_id || null,
      currency: values.currency,
      exchange_rate: new Prisma.Decimal(exchangeRate),
      amount_base: new Prisma.Decimal(amountBase),
      amount_usd:
        values.currency === 'USD'
          ? new Prisma.Decimal(amount)
          : new Prisma.Decimal(convertToBaseCurrency(amount, 'AFN', exchangeRate, 'USD')),
      start_date: toUtcDateOnly(values.start_date),
      end_date: endDate,
      auto_renew: values.auto_renew,
      account_manager_id: values.account_manager_id || null,
      renewal_status: relations.status.value === 'EXPIRED' ? 'EXPIRED' : currentContract?.renewal_status || 'ACTIVE'
    }
  }
}

const revalidateContracts = () => {
  revalidatePath('/[lang]/contracts', 'page')
  revalidatePath('/[lang]/crm/clients', 'page')
}

export const getContracts = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const requestedPage = Number.parseInt(payload.page, 10)
  const requestedLimit = Number.parseInt(payload.limit, 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const statusFilter = typeof payload.statusFilter === 'string' ? payload.statusFilter : 'ALL'
  const serviceTypeId = normalizeId(payload.serviceTypeId)
  const clientId = normalizeId(payload.clientId)
  const fromDate = payload.fromDate ? toUtcDateOnly(payload.fromDate) : null
  const toDate = payload.toDate ? toUtcDateOnly(payload.toDate) : null
  const today = toUtcDateOnly(new Date())
  const inThirtyDays = new Date(today)

  inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30)

  if (toDate) toDate.setUTCDate(toDate.getUTCDate() + 1)

  const statusWhere = getTabWhere(statusFilter)

  const where = {
    AND: [
      statusWhere,
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
              { client: { is: { company_name: { contains: search } } } }
            ]
          }
        : {}
    ]
  }

  const activeWhere = { status: { is: { value: 'ACTIVE' } }, end_date: { gte: today } }
  const expiringWhere = { ...activeWhere, end_date: { gte: today, lte: inThirtyDays } }
  const draftWhere = { status: { is: { value: { in: DRAFT_VALUES } } } }

  try {
    const [totalCount, contracts, active, expiring, monthly, drafts, setup, statuses] = await prisma.$transaction([
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
      prisma.setup.findUnique({ where: { scope: 'GLOBAL' }, select: { currency_code: true } }),
      prisma.option.findMany({
        where: { category: 'CONTRACT_STATUS', is_active: true },
        select: { id: true, label: true, value: true, color_code: true },
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
      })
    ])

    const durationMap = await getDurationMap(contracts)

    return {
      success: true,
      data: {
        contracts: contracts.map(contract => normalizeContract(contract, durationMap)),
        totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        baseCurrency: setup?.currency_code || 'AFN',
        statuses,
        summary: {
          activeCount: active._count._all,
          activeValue: toFiniteNumber(active._sum.amount_base),
          expiringCount: expiring._count._all,
          expiringValue: toFiniteNumber(expiring._sum.amount_base),
          monthlyActiveRevenue: toFiniteNumber(monthly._sum.amount_base),
          draftCount: drafts
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
    const [clients, staff, options, setup] = await Promise.all([
      prisma.crmClient.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, company_name: true, primary_contact_name: true, email: true },
        orderBy: { company_name: 'asc' },
        take: 500
      }),
      prisma.hrmStaff.findMany({
        where: { status: { not: 'TERMINATED' } },
        select: { id: true, first_name: true, last_name: true, position: true, email: true },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
      }),
      prisma.option.findMany({
        where: {
          category: { in: ['CONTRACT_TYPE', 'CONTRACT_DURATION', 'CONTRACT_COUNTRY', 'CONTRACT_LEVEL', 'CONTRACT_STATUS'] },
          is_active: true
        },
        select: { id: true, category: true, label: true, value: true, description: true, is_default: true, color_code: true },
        orderBy: [{ category: 'asc' }, { sort_order: 'asc' }, { label: 'asc' }]
      }),
      getCompanySetupRecord()
    ])

    return {
      success: true,
      data: {
        clients,
        staff: staff.map(person => ({ ...person, full_name: `${person.first_name} ${person.last_name}`.trim() })),
        options: Object.fromEntries(
          ['CONTRACT_TYPE', 'CONTRACT_DURATION', 'CONTRACT_COUNTRY', 'CONTRACT_LEVEL', 'CONTRACT_STATUS'].map(category => [
            category,
            options.filter(option => option.category === category)
          ])
        ),
        baseCurrency: setup.currency_code || 'AFN',
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

export const createContract = async (payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createContractSchema(context.translations.validation), validationPayload(payload))

  if (!validation.success) {
    return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }
  }

  const prepared = await prepareContractData(validation.output, context.translations)

  if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

  try {
    const contract = await prisma.$transaction(async transaction => {
      const contractNumber = await generateContractNumber(transaction)
      const created = await transaction.contract.create({ data: { ...prepared.data, contract_number: contractNumber } })

      await transaction.auditLog.create({
        data: {
          user_id: context.session.user.id,
          action: 'CONTRACT_CREATED',
          module: 'CONTRACTS',
          details: { contractId: created.id, contractNumber, clientId: created.client_id }
        }
      })

      return created
    })

    revalidateContracts()

    return { success: true, data: { id: contract.id }, message: context.translations.messages.created }
  } catch (error) {
    if (error?.code === 'P2002') return { success: false, code: 'DUPLICATE', error: context.translations.messages.duplicate }

    return { success: false, code: 'CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateContract = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const contractId = normalizeId(id)
  const validation = safeParse(createContractSchema(context.translations.validation), validationPayload(payload))

  if (!contractId || !validation.success) {
    return { success: false, code: 'VALIDATION_ERROR', error: validation.issues?.[0]?.message || context.translations.messages.notFound }
  }

  try {
    const current = await prisma.contract.findUnique({ where: { id: contractId }, select: contractSelect })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const prepared = await prepareContractData(validation.output, context.translations, current)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    await prisma.$transaction(async transaction => {
      await transaction.contract.update({ where: { id: contractId }, data: prepared.data })
      await transaction.auditLog.create({
        data: {
          user_id: context.session.user.id,
          action: 'CONTRACT_UPDATED',
          module: 'CONTRACTS',
          details: { contractId, contractNumber: current.contract_number }
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
      prisma.contract.findUnique({ where: { id: contractId }, select: { id: true, contract_number: true } }),
      prisma.option.findFirst({
        where: { id: normalizedStatusId, category: 'CONTRACT_STATUS', is_active: true },
        select: { id: true, value: true }
      })
    ])

    if (!contract) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (!status) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidOption }

    await prisma.$transaction(async transaction => {
      await transaction.contract.update({
        where: { id: contractId },
        data: { status_id: status.id, ...(status.value === 'EXPIRED' ? { renewal_status: 'EXPIRED' } : {}) }
      })
      await transaction.auditLog.create({
        data: {
          user_id: context.session.user.id,
          action: 'CONTRACT_STATUS_UPDATED',
          module: 'CONTRACTS',
          details: { contractId, contractNumber: contract.contract_number, status: status.value }
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
      await transaction.auditLog.create({
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
