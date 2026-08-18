'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { createInvoiceSchema, recordInvoicePaymentSchema } from '@/schemas/invoices'
import { toUtcDateOnly } from '@/utils/contractDuration'
import { convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'
import { getDictionary } from '@/utils/getDictionary'

const READ_PERMISSIONS = ['contracts:read', 'finance:read']
const WRITE_PERMISSIONS = ['contracts:write', 'finance:write']
const DELETE_PERMISSIONS = ['contracts:delete', 'finance:delete']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const OUTSTANDING_STATUSES = ['UNPAID', 'PARTIALLY_PAID']

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')

const getContext = async (payload, permissions) => {
  const locale = normalizeLocale(payload?.locale)
  const [authorization, dictionary] = await Promise.all([authorizeAction(permissions), getDictionary(locale)])
  const translations = dictionary.contractInvoices

  if (!authorization.authorized) {
    return {
      authorized: false,
      code: authorization.code,
      error: authorization.code === 'UNAUTHENTICATED' ? translations.messages.unauthenticated : translations.messages.forbidden,
      translations
    }
  }

  return { authorized: true, session: authorization.session, locale, translations }
}

const invoiceSelect = {
  id: true,
  contract_id: true,
  client_id: true,
  invoice_number: true,
  amount: true,
  currency: true,
  exchange_rate: true,
  amount_base: true,
  due_date: true,
  status_id: true,
  issued_date: true,
  created_at: true,
  updated_at: true,
  contract: {
    select: {
      id: true,
      contract_number: true,
      title: true,
      total_amount: true,
      currency: true,
      exchange_rate: true,
      amount_base: true,
      contract_type: { select: { id: true, label: true, value: true } }
    }
  },
  client: {
    select: { id: true, company_name: true, primary_contact_name: true, email: true, phone: true, address: true, tax_id: true }
  },
  status: { select: { id: true, label: true, value: true, color_code: true } },
  payment_income: { select: { id: true, created_at: true, pay_details: true, total_amount: true, currency: true } }
}

const normalizeInvoice = invoice => {
  const today = toUtcDateOnly(new Date())
  const isOverdue = invoice.due_date < today && !['PAID', 'CANCELLED'].includes(invoice.status.value)

  return {
    ...invoice,
    amount: invoice.amount.toFixed(2),
    exchange_rate: invoice.exchange_rate.toFixed(4),
    amount_base: invoice.amount_base.toFixed(2),
    issued_date: invoice.issued_date.toISOString(),
    due_date: invoice.due_date.toISOString(),
    created_at: invoice.created_at.toISOString(),
    updated_at: invoice.updated_at.toISOString(),
    is_overdue: isOverdue,
    contract: {
      ...invoice.contract,
      total_amount: invoice.contract.total_amount.toFixed(2),
      exchange_rate: invoice.contract.exchange_rate.toFixed(4),
      amount_base: invoice.contract.amount_base.toFixed(2)
    },
    payment_income: invoice.payment_income
      ? {
          ...invoice.payment_income,
          total_amount: invoice.payment_income.total_amount.toFixed(2),
          created_at: invoice.payment_income.created_at.toISOString()
        }
      : null
  }
}

const revalidateInvoices = () => {
  revalidatePath('/[lang]/contracts/invoices', 'page')
  revalidatePath('/[lang]/contract/invoices', 'page')
  revalidatePath('/[lang]/contracts', 'page')
  revalidatePath('/[lang]/crm/clients', 'page')
  revalidatePath('/[lang]/finance/incomes', 'page')
}

const generateInvoiceNumber = async transaction => {
  const year = new Date().getUTCFullYear()
  const prefix = `INV-${year}-`

  const latest = await transaction.contractInvoice.findFirst({
    where: { invoice_number: { startsWith: prefix } },
    select: { invoice_number: true },
    orderBy: { invoice_number: 'desc' }
  })

  const sequence = Number.parseInt(latest?.invoice_number.slice(prefix.length), 10)

  return `${prefix}${String(Number.isFinite(sequence) ? sequence + 1 : 1).padStart(4, '0')}`
}

const validationPayload = payload => ({
  contract_id: payload?.contract_id,
  client_id: payload?.client_id,
  amount: String(payload?.amount ?? ''),
  currency: payload?.currency,
  exchange_rate: String(payload?.exchange_rate ?? ''),
  issued_date: payload?.issued_date,
  due_date: payload?.due_date,
  status_id: payload?.status_id
})

const prepareInvoiceData = async (values, translations, currentInvoice = null) => {
  const [contract, status, setup] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: values.contract_id },
      select: { id: true, client_id: true }
    }),
    prisma.option.findFirst({
      where: {
        id: values.status_id,
        category: 'INVOICE_STATUS',
        ...(currentInvoice?.status_id === values.status_id ? {} : { is_active: true })
      },
      select: { id: true, value: true }
    }),
    getCompanySetupRecord()
  ])

  if (!contract || contract.client_id !== values.client_id) return { success: false, error: translations.validation.invalidContract }
  if (!status) return { success: false, error: translations.validation.invalidStatus }
  if (status.value === 'PAID') return { success: false, error: translations.validation.paidViaPaymentOnly }

  const amount = toFiniteNumber(values.amount)
  const exchangeRate = toFiniteNumber(values.exchange_rate)
  const issuedDate = toUtcDateOnly(values.issued_date)
  const dueDate = toUtcDateOnly(values.due_date)

  if (amount <= 0 || exchangeRate <= 0) return { success: false, error: translations.validation.amountInvalid }
  if (!issuedDate || !dueDate || dueDate < issuedDate) return { success: false, error: translations.validation.dateRangeInvalid }

  const amountBase = convertToBaseCurrency(amount, values.currency, exchangeRate, setup.currency_code || 'AFN')

  return {
    success: true,
    data: {
      contract_id: contract.id,
      client_id: contract.client_id,
      amount: new Prisma.Decimal(amount),
      currency: values.currency,
      exchange_rate: new Prisma.Decimal(exchangeRate),
      amount_base: new Prisma.Decimal(amountBase),
      issued_date: issuedDate,
      due_date: dueDate,
      status_id: status.id
    }
  }
}

export const getInvoices = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const requestedPage = Number.parseInt(payload.page, 10)
  const requestedLimit = Number.parseInt(payload.limit, 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const statusId = normalizeId(payload.statusId)
  const clientId = normalizeId(payload.clientId)
  const contractId = normalizeId(payload.contractId)
  const fromDate = payload.fromDate ? toUtcDateOnly(payload.fromDate) : null
  const toDate = payload.toDate ? toUtcDateOnly(payload.toDate) : null
  const today = toUtcDateOnly(new Date())

  if (toDate) toDate.setUTCDate(toDate.getUTCDate() + 1)

  const where = {
    AND: [
      statusId ? { status_id: statusId } : {},
      clientId ? { client_id: clientId } : {},
      contractId ? { contract_id: contractId } : {},
      fromDate || toDate ? { due_date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lt: toDate } : {}) } } : {},
      search
        ? {
            OR: [
              { invoice_number: { contains: search } },
              { contract: { is: { contract_number: { contains: search } } } },
              { client: { is: { company_name: { contains: search } } } }
            ]
          }
        : {}
    ]
  }

  const paidWhere = { status: { is: { value: 'PAID' } } }
  const overdueWhere = { due_date: { lt: today }, status: { is: { value: { notIn: ['PAID', 'CANCELLED'] } } } }
  const outstandingWhere = { status: { is: { value: { in: OUTSTANDING_STATUSES } } } }

  try {
    const [totalCount, invoices, totalInvoiced, paid, overdue, outstanding, setup, statuses] = await prisma.$transaction([
      prisma.contractInvoice.count({ where }),
      prisma.contractInvoice.findMany({
        where,
        select: invoiceSelect,
        orderBy: [{ due_date: 'asc' }, { issued_date: 'desc' }],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.contractInvoice.aggregate({ _sum: { amount_base: true } }),
      prisma.contractInvoice.aggregate({ where: paidWhere, _sum: { amount_base: true } }),
      prisma.contractInvoice.aggregate({ where: overdueWhere, _count: { _all: true }, _sum: { amount_base: true } }),
      prisma.contractInvoice.aggregate({ where: outstandingWhere, _sum: { amount_base: true } }),
      prisma.setup.findUnique({ where: { scope: 'GLOBAL' }, select: { currency_code: true } }),
      prisma.option.findMany({
        where: { category: 'INVOICE_STATUS', is_active: true },
        select: { id: true, label: true, value: true, color_code: true },
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
      })
    ])

    return {
      success: true,
      data: {
        invoices: invoices.map(normalizeInvoice),
        totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        baseCurrency: setup?.currency_code || 'AFN',
        statuses,
        summary: {
          totalInvoiced: toFiniteNumber(totalInvoiced._sum.amount_base),
          paidRevenue: toFiniteNumber(paid._sum.amount_base),
          overdueCount: overdue._count._all,
          overdueAmount: toFiniteNumber(overdue._sum.amount_base),
          outstandingBalance: toFiniteNumber(outstanding._sum.amount_base)
        }
      }
    }
  } catch {
    return { success: false, code: 'INVOICES_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getInvoiceFormOptions = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const [contracts, statuses, paymentMethods, setup] = await Promise.all([
      prisma.contract.findMany({
        select: {
          id: true,
          contract_number: true,
          title: true,
          client_id: true,
          total_amount: true,
          currency: true,
          exchange_rate: true,
          client: { select: { id: true, company_name: true, primary_contact_name: true, email: true } }
        },
        orderBy: { contract_number: 'desc' },
        take: 500
      }),
      prisma.option.findMany({
        where: { category: 'INVOICE_STATUS', is_active: true },
        select: { id: true, label: true, value: true, is_default: true, color_code: true },
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
      }),
      prisma.option.findMany({
        where: { category: 'PAYMENT_METHOD', is_active: true },
        select: { id: true, label: true, value: true, is_default: true },
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
      }),
      getCompanySetupRecord()
    ])

    return {
      success: true,
      data: {
        contracts: contracts.map(contract => ({
          ...contract,
          total_amount: contract.total_amount.toFixed(2),
          exchange_rate: contract.exchange_rate.toFixed(4)
        })),
        clients: [...new Map(contracts.map(contract => [contract.client.id, contract.client])).values()],
        statuses,
        paymentMethods,
        baseCurrency: setup.currency_code || 'AFN',
        exchangeRate: setup.usd_afn_exchange_rate || '65.0000'
      }
    }
  } catch {
    return { success: false, code: 'OPTIONS_LOAD_FAILED', error: context.translations.messages.optionsLoadFailed }
  }
}

export const getInvoiceDetail = async (id, payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const invoiceId = normalizeId(id)

  if (!invoiceId) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

  try {
    const invoice = await prisma.contractInvoice.findUnique({ where: { id: invoiceId }, select: invoiceSelect })

    if (!invoice) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    return { success: true, data: normalizeInvoice(invoice) }
  } catch {
    return { success: false, code: 'DETAIL_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const createInvoice = async (payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const validation = safeParse(createInvoiceSchema(context.translations.validation), validationPayload(payload))

  if (!validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }
  const prepared = await prepareInvoiceData(validation.output, context.translations)

  if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

  try {
    const invoice = await prisma.$transaction(async transaction => {
      const invoiceNumber = await generateInvoiceNumber(transaction)
      const created = await transaction.contractInvoice.create({ data: { ...prepared.data, invoice_number: invoiceNumber } })

      await transaction.auditLog.create({
        data: { user_id: context.session.user.id, action: 'INVOICE_CREATED', module: 'CONTRACTS', details: { invoiceId: created.id, invoiceNumber, contractId: created.contract_id } }
      })

      return created
    })

    revalidateInvoices()

    return { success: true, data: { id: invoice.id }, message: context.translations.messages.created }
  } catch (error) {
    if (error?.code === 'P2002') return { success: false, code: 'DUPLICATE', error: context.translations.messages.duplicate }

    return { success: false, code: 'CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateInvoice = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const invoiceId = normalizeId(id)
  const validation = safeParse(createInvoiceSchema(context.translations.validation), validationPayload(payload))

  if (!invoiceId || !validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues?.[0]?.message || context.translations.messages.notFound }

  try {
    const current = await prisma.contractInvoice.findUnique({ where: { id: invoiceId }, select: invoiceSelect })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (current.payment_income || current.status.value === 'PAID') return { success: false, code: 'PAID_LOCKED', error: context.translations.messages.paidLocked }

    const prepared = await prepareInvoiceData(validation.output, context.translations, current)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    await prisma.$transaction(async transaction => {
      await transaction.contractInvoice.update({ where: { id: invoiceId }, data: prepared.data })
      await transaction.auditLog.create({
        data: { user_id: context.session.user.id, action: 'INVOICE_UPDATED', module: 'CONTRACTS', details: { invoiceId, invoiceNumber: current.invoice_number } }
      })
    })

    revalidateInvoices()

    return { success: true, message: context.translations.messages.updated }
  } catch {
    return { success: false, code: 'UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const deleteInvoice = async (id, payload = {}) => {
  const context = await getContext(payload, DELETE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const invoiceId = normalizeId(id)

  if (!invoiceId) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

  try {
    const invoice = await prisma.contractInvoice.findUnique({ where: { id: invoiceId }, select: invoiceSelect })

    if (!invoice) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (invoice.payment_income || invoice.status.value === 'PAID') return { success: false, code: 'PAID_LOCKED', error: context.translations.messages.paidDeleteBlocked }

    await prisma.$transaction(async transaction => {
      await transaction.contractInvoice.delete({ where: { id: invoiceId } })
      await transaction.auditLog.create({
        data: { user_id: context.session.user.id, action: 'INVOICE_DELETED', module: 'CONTRACTS', details: { invoiceId, invoiceNumber: invoice.invoice_number } }
      })
    })

    revalidateInvoices()

    return { success: true, message: context.translations.messages.deleted }
  } catch {
    return { success: false, code: 'DELETE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const recordInvoicePayment = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const invoiceId = normalizeId(id)

  const validation = safeParse(recordInvoicePaymentSchema(context.translations.validation), {
    payment_date: payload?.payment_date,
    amount: String(payload?.amount ?? ''),
    payment_method_id: payload?.payment_method_id,
    notes: payload?.notes || ''
  })

  if (!invoiceId || !validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues?.[0]?.message || context.translations.messages.notFound }

  try {
    const [invoice, paidStatus, paymentMethod, incomeType] = await Promise.all([
      prisma.contractInvoice.findUnique({ where: { id: invoiceId }, select: invoiceSelect }),
      prisma.option.findFirst({ where: { category: 'INVOICE_STATUS', value: 'PAID', is_active: true }, select: { id: true } }),
      prisma.option.findFirst({ where: { id: validation.output.payment_method_id, category: 'PAYMENT_METHOD', is_active: true }, select: { id: true, label: true, value: true } }),
      prisma.option.findFirst({ where: { category: 'INCOME_TYPE', value: 'CONTRACT_PAYMENT', is_active: true }, select: { id: true } })
    ])

    if (!invoice) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (invoice.payment_income || invoice.status.value === 'PAID') return { success: false, code: 'ALREADY_PAID', error: context.translations.messages.alreadyPaid }
    if (!paidStatus || !paymentMethod || !incomeType) return { success: false, code: 'PAYMENT_OPTIONS_MISSING', error: context.translations.messages.paymentOptionsMissing }

    const paymentAmount = toFiniteNumber(validation.output.amount)

    if (Math.abs(paymentAmount - toFiniteNumber(invoice.amount)) > 0.005) return { success: false, code: 'AMOUNT_MISMATCH', error: context.translations.validation.fullPaymentRequired }

    const paymentDate = toUtcDateOnly(validation.output.payment_date)

    const totalUsd = invoice.currency === 'USD'
      ? paymentAmount
      : convertToBaseCurrency(paymentAmount, 'AFN', invoice.exchange_rate, 'USD')

    const income = await prisma.$transaction(async transaction => {
      const createdIncome = await transaction.financeIncome.create({
        data: {
          invoice_id: invoice.id,
          client_id: invoice.client_id,
          contract_id: invoice.contract_id,
          status: 'PAID',
          name: `${invoice.invoice_number} - ${invoice.contract.title}`,
          pay_details: JSON.stringify({ payment_method_id: paymentMethod.id, payment_method: paymentMethod.label, payment_date: validation.output.payment_date, notes: validation.output.notes || null }),
          income_type_id: incomeType.id,
          total_amount: invoice.amount,
          currency: invoice.currency,
          paid_amount: invoice.amount,
          remind_amount: new Prisma.Decimal(0),
          exchange_rate: invoice.exchange_rate,
          amount_base: invoice.amount_base,
          total_usd: new Prisma.Decimal(totalUsd),
          created_at: paymentDate
        }
      })

      await transaction.contractInvoice.update({ where: { id: invoice.id }, data: { status_id: paidStatus.id } })
      await transaction.auditLog.create({
        data: {
          user_id: context.session.user.id,
          action: 'INVOICE_PAYMENT_RECORDED',
          module: 'CONTRACTS',
          details: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, incomeId: createdIncome.id, paymentMethod: paymentMethod.value }
        }
      })

      return createdIncome
    })

    revalidateInvoices()

    return { success: true, data: { incomeId: income.id }, message: context.translations.messages.paymentRecorded }
  } catch (error) {
    if (error?.code === 'P2002') return { success: false, code: 'ALREADY_PAID', error: context.translations.messages.alreadyPaid }

    return { success: false, code: 'PAYMENT_FAILED', error: context.translations.messages.paymentFailed }
  }
}
