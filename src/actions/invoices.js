'use server'

import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { InvoiceSettlementError, settlementTransactionOptions, syncInvoiceSettlement } from '@/libs/invoiceSettlement'
import { prisma } from '@/libs/prisma'
import { nextSequentialNumber, withSequentialNumberRetry } from '@/libs/sequentialNumbers'
import { createInvoiceSchema, recordInvoicePaymentSchema } from '@/schemas/invoices'
import { toUtcDateOnly } from '@/utils/contractDuration'
import {
  SYSTEM_BASE_CURRENCY,
  convertToBaseCurrency,
  effectiveAfnExchangeRate,
  normalizeToAfn,
  toFiniteNumber
} from '@/utils/formatCurrency'
import { getDictionary } from '@/utils/getDictionary'

const READ_PERMISSIONS = ['contracts:read', 'finance:read']
const WRITE_PERMISSIONS = ['contracts:write', 'finance:write']
const DELETE_PERMISSIONS = ['contracts:delete', 'finance:delete']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const OUTSTANDING_STATUSES = ['UNPAID', 'PARTIALLY_PAID']
const SYSTEM_SETTLEMENT_STATUSES = ['PAID', 'PARTIALLY_PAID']
const MONEY_TOLERANCE = 0.005

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
      error:
        authorization.code === 'UNAUTHENTICATED'
          ? translations.messages.unauthenticated
          : translations.messages.forbidden,
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
  paid_amount: true,
  remaining_balance: true,
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
  status: { select: { id: true, label: true, value: true, color_code: true } },
  payment_incomes: {
    select: {
      id: true,
      created_at: true,
      payment_date: true,
      payment_method_id: true,
      notes: true,
      pay_details: true,
      total_amount: true,
      paid_amount: true,
      currency: true,
      exchange_rate: true,
      amount_base: true,
      fx_snapshot_at: true,
      payment_method: { select: { id: true, label: true, value: true } }
    },
    orderBy: [{ payment_date: 'desc' }, { created_at: 'desc' }]
  }
}

const parsePaymentDetails = value => {
  if (!value) return {}

  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

const normalizePaymentDate = (paymentDate, legacyDate, fallbackDate) => {
  if (paymentDate) return paymentDate.toISOString()

  if (legacyDate) {
    const parsed = new Date(`${legacyDate}T00:00:00.000Z`)

    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }

  return fallbackDate.toISOString()
}

const normalizeInvoice = invoice => {
  const today = toUtcDateOnly(new Date())
  const isOverdue = invoice.due_date < today && !['PAID', 'CANCELLED'].includes(invoice.status.value)

  return {
    ...invoice,
    amount: invoice.amount.toFixed(2),
    exchange_rate: invoice.exchange_rate.toFixed(4),
    amount_base: invoice.amount_base.toFixed(2),
    paid_amount: invoice.paid_amount.toFixed(2),
    remaining_balance: invoice.remaining_balance.toFixed(2),
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
    payment_incomes: invoice.payment_incomes.map(payment => {
      const legacyDetails = parsePaymentDetails(payment.pay_details)

      return {
        ...payment,
        total_amount: payment.total_amount.toFixed(2),
        paid_amount: payment.paid_amount.toFixed(2),
        exchange_rate: payment.exchange_rate.toFixed(4),
        amount_base: payment.amount_base.toFixed(2),
        fx_snapshot_at: payment.fx_snapshot_at?.toISOString() || null,
        payment_date: normalizePaymentDate(payment.payment_date, legacyDetails.payment_date, payment.created_at),
        notes: payment.notes || legacyDetails.notes || null,
        payment_method:
          payment.payment_method ||
          (legacyDetails.payment_method
            ? { id: legacyDetails.payment_method_id || '', label: legacyDetails.payment_method, value: '' }
            : null),
        created_at: payment.created_at.toISOString()
      }
    }),
    payment_income: invoice.payment_incomes[0]
      ? {
          ...invoice.payment_incomes[0],
          total_amount: invoice.payment_incomes[0].total_amount.toFixed(2),
          paid_amount: invoice.payment_incomes[0].paid_amount.toFixed(2),
          payment_date: invoice.payment_incomes[0].payment_date?.toISOString() || null,
          created_at: invoice.payment_incomes[0].created_at.toISOString()
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

const getInvoiceStatuses = () =>
  prisma.option.findMany({
    where: { category: 'INVOICE_STATUS', is_active: true },
    select: { id: true, label: true, value: true, is_default: true, color_code: true },
    orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
  })

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
      select: { id: true, client_id: true, status: { select: { value: true } } }
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

  if (!contract || contract.client_id !== values.client_id)
    return { success: false, error: translations.validation.invalidContract }

  if (contract.status.value !== 'ACTIVE' && currentInvoice?.contract_id !== contract.id) {
    return { success: false, error: translations.validation.contractInactive }
  }

  if (!status) return { success: false, error: translations.validation.invalidStatus }

  if (SYSTEM_SETTLEMENT_STATUSES.includes(status.value) && currentInvoice?.status_id !== status.id) {
    return { success: false, error: translations.validation.paidViaPaymentOnly }
  }

  const amount = toFiniteNumber(values.amount)
  const exchangeRate = toFiniteNumber(values.exchange_rate)
  const issuedDate = toUtcDateOnly(values.issued_date)
  const dueDate = toUtcDateOnly(values.due_date)

  if (amount <= 0 || exchangeRate <= 0) return { success: false, error: translations.validation.amountInvalid }
  if (!issuedDate || !dueDate || dueDate < issuedDate)
    return { success: false, error: translations.validation.dateRangeInvalid }

  const amountBase = convertToBaseCurrency(amount, values.currency, exchangeRate, SYSTEM_BASE_CURRENCY)

  return {
    success: true,
    statusValue: status.value,
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

  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE

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
      fromDate || toDate
        ? { due_date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lt: toDate } : {}) } }
        : {},
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

  const overdueWhere = { due_date: { lt: today }, status: { is: { value: { notIn: ['PAID', 'CANCELLED'] } } } }
  const outstandingWhere = { status: { is: { value: { in: OUTSTANDING_STATUSES } } } }

  try {
    const [totalCount, invoices, totalInvoiced, paid, overdue, outstanding, setup, statuses] =
      await prisma.$transaction([
        prisma.contractinvoice.count({ where }),
        prisma.contractinvoice.findMany({
          where,
          select: invoiceSelect,
          orderBy: [{ due_date: 'asc' }, { issued_date: 'desc' }],
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.contractinvoice.aggregate({
          where: { status: { is: { value: { not: 'CANCELLED' } } } },
          _sum: { amount_base: true }
        }),
        prisma.financeincome.aggregate({
          where: {
            invoice_id: { not: null },
            status: 'PAID',
            invoice: { is: { status: { is: { value: { not: 'CANCELLED' } } } } }
          },
          _sum: { amount_base: true }
        }),
        prisma.contractinvoice.findMany({
          where: overdueWhere,
          select: { remaining_balance: true, currency: true, exchange_rate: true }
        }),
        prisma.contractinvoice.findMany({
          where: outstandingWhere,
          select: { remaining_balance: true, currency: true, exchange_rate: true }
        }),
        prisma.setup.findUnique({ where: { scope: 'GLOBAL' }, select: { currency_code: true } }),
        prisma.option.findMany({
          where: { category: 'INVOICE_STATUS', is_active: true },
          select: { id: true, label: true, value: true, color_code: true },
          orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
        })
      ])

    const baseCurrency = SYSTEM_BASE_CURRENCY

    const sumRemainingBase = rows =>
      rows.reduce(
        (sum, row) => sum + convertToBaseCurrency(row.remaining_balance, row.currency, row.exchange_rate, baseCurrency),
        0
      )

    return {
      success: true,
      data: {
        invoices: invoices.map(normalizeInvoice),
        totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        baseCurrency: SYSTEM_BASE_CURRENCY,
        statuses,
        summary: {
          totalInvoiced: toFiniteNumber(totalInvoiced._sum.amount_base),
          paidRevenue: toFiniteNumber(paid._sum.amount_base),
          overdueCount: overdue.length,
          overdueAmount: sumRemainingBase(overdue),
          outstandingBalance: sumRemainingBase(outstanding)
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
    const [contracts, statuses, paymentMethods, durationOptions, setup] = await Promise.all([
      prisma.contract.findMany({
        where: {
          client_id: { not: null },
          status: { is: { value: 'ACTIVE' } },
          end_date: { gt: toUtcDateOnly(new Date()) }
        },
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
      getInvoiceStatuses(),
      prisma.option.findMany({
        where: { category: 'PAYMENT_METHOD', is_active: true },
        select: { id: true, label: true, value: true, is_default: true },
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
      }),
      prisma.option.findMany({
        where: { category: 'CONTRACT_DURATION', is_active: true },
        select: { id: true, label: true, value: true, description: true },
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
        durationOptions,
        baseCurrency: SYSTEM_BASE_CURRENCY,
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
    const invoice = await prisma.contractinvoice.findUnique({ where: { id: invoiceId }, select: invoiceSelect })

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
    const invoice = await withSequentialNumberRetry(() =>
      prisma.$transaction(
        async transaction => {
          const invoiceNumber = await nextSequentialNumber(transaction, 'invoice', {
            prefix: `INV-${new Date().getUTCFullYear()}-`,
            digits: 4
          })

          const created = await transaction.contractinvoice.create({
            data: {
              ...prepared.data,
              invoice_number: invoiceNumber,
              paid_amount: new Prisma.Decimal(0),
              remaining_balance: prepared.data.amount
            }
          })

          await transaction.auditlog.create({
            data: {
              user_id: context.session.user.id,
              action: 'INVOICE_CREATED',
              module: 'CONTRACTS',
              details: { invoiceId: created.id, invoiceNumber, contractId: created.contract_id }
            }
          })

          return created
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    )

    revalidateInvoices()

    return { success: true, data: { id: invoice.id }, message: context.translations.messages.created }
  } catch (error) {
    if (error?.code === 'P2002')
      return { success: false, code: 'DUPLICATE', error: context.translations.messages.duplicate }

    return { success: false, code: 'CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateInvoice = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const invoiceId = normalizeId(id)
  const validation = safeParse(createInvoiceSchema(context.translations.validation), validationPayload(payload))

  if (!invoiceId || !validation.success)
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues?.[0]?.message || context.translations.messages.notFound
    }

  try {
    const current = await prisma.contractinvoice.findUnique({ where: { id: invoiceId }, select: invoiceSelect })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const prepared = await prepareInvoiceData(validation.output, context.translations, current)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    const hasPayments = current.payment_incomes.length > 0
    const accountingLocked = hasPayments || SYSTEM_SETTLEMENT_STATUSES.includes(current.status.value)

    if (
      accountingLocked &&
      (prepared.data.contract_id !== current.contract_id ||
        prepared.data.client_id !== current.client_id ||
        prepared.data.currency !== current.currency ||
        Math.abs(toFiniteNumber(prepared.data.amount) - toFiniteNumber(current.amount)) > MONEY_TOLERANCE ||
        Math.abs(toFiniteNumber(prepared.data.exchange_rate) - toFiniteNumber(current.exchange_rate)) > 0.00005)
    ) {
      return { success: false, code: 'PAYMENT_FIELDS_LOCKED', error: context.translations.messages.paidLocked }
    }

    const updateData = accountingLocked
      ? {
          issued_date: prepared.data.issued_date,
          due_date: prepared.data.due_date,
          status_id: current.status_id
        }
      : {
          ...prepared.data,
          paid_amount: new Prisma.Decimal(0),
          remaining_balance: prepared.statusValue === 'CANCELLED' ? new Prisma.Decimal(0) : prepared.data.amount
        }

    await prisma.$transaction(async transaction => {
      await transaction.contractinvoice.update({ where: { id: invoiceId }, data: updateData })
      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'INVOICE_UPDATED',
          module: 'CONTRACTS',
          details: { invoiceId, invoiceNumber: current.invoice_number }
        }
      })
    })

    revalidateInvoices()

    return { success: true, message: context.translations.messages.updated }
  } catch {
    return { success: false, code: 'UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateInvoiceStatus = async (id, statusId, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const invoiceId = normalizeId(id)
  const nextStatusId = normalizeId(statusId)

  if (!invoiceId || !nextStatusId) {
    return { success: false, code: 'VALIDATION_ERROR', error: context.translations.messages.notFound }
  }

  try {
    const [invoice, nextStatus] = await Promise.all([
      prisma.contractinvoice.findUnique({
        where: { id: invoiceId },
        select: {
          id: true,
          invoice_number: true,
          status_id: true,
          amount: true,
          paid_amount: true,
          remaining_balance: true,
          status: { select: { value: true } },
          payment_incomes: { select: { id: true }, take: 1 }
        }
      }),
      prisma.option.findFirst({
        where: { id: nextStatusId, category: 'INVOICE_STATUS', is_active: true },
        select: { id: true, value: true }
      })
    ])

    if (!invoice || !nextStatus) {
      return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    }

    const hasPayments = invoice.payment_incomes.length > 0

    if (
      (hasPayments || SYSTEM_SETTLEMENT_STATUSES.includes(invoice.status.value)) &&
      nextStatus.value !== 'CANCELLED' &&
      invoice.status_id !== nextStatus.id
    ) {
      return { success: false, code: 'PAID_LOCKED', error: context.translations.messages.paidLocked }
    }

    if (SYSTEM_SETTLEMENT_STATUSES.includes(nextStatus.value) && invoice.status_id !== nextStatus.id) {
      return { success: false, code: 'PAYMENT_REQUIRED', error: context.translations.messages.paymentRequired }
    }

    if (invoice.status_id === nextStatus.id) {
      return { success: true, message: context.translations.messages.statusUpdated }
    }

    const statusData =
      nextStatus.value === 'CANCELLED'
        ? { status_id: nextStatus.id, remaining_balance: new Prisma.Decimal(0) }
        : {
            status_id: nextStatus.id,
            paid_amount: new Prisma.Decimal(0),
            remaining_balance: invoice.amount
          }

    await prisma.$transaction([
      prisma.contractinvoice.update({ where: { id: invoice.id }, data: statusData }),
      prisma.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'INVOICE_STATUS_UPDATED',
          module: 'CONTRACTS',
          details: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            fromStatus: invoice.status.value,
            toStatus: nextStatus.value,
            paidAmount: invoice.paid_amount.toString(),
            voidedOutstanding: nextStatus.value === 'CANCELLED' ? invoice.remaining_balance.toString() : null
          }
        }
      })
    ])

    revalidateInvoices()

    return { success: true, message: context.translations.messages.statusUpdated }
  } catch {
    return { success: false, code: 'STATUS_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const deleteInvoice = async (id, payload = {}) => {
  const context = await getContext(payload, DELETE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const invoiceId = normalizeId(id)

  if (!invoiceId) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

  try {
    const invoice = await prisma.contractinvoice.findUnique({ where: { id: invoiceId }, select: invoiceSelect })

    if (!invoice) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (invoice.payment_incomes.length > 0 || invoice.status.value === 'PAID')
      return { success: false, code: 'PAID_LOCKED', error: context.translations.messages.paidDeleteBlocked }

    await prisma.$transaction(async transaction => {
      await transaction.contractinvoice.delete({ where: { id: invoiceId } })
      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'INVOICE_DELETED',
          module: 'CONTRACTS',
          details: { invoiceId, invoiceNumber: invoice.invoice_number }
        }
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

  if (!invoiceId || !validation.success)
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues?.[0]?.message || context.translations.messages.notFound
    }

  try {
    const [invoice, paymentMethod, incomeType, receiver] = await Promise.all([
      prisma.contractinvoice.findUnique({ where: { id: invoiceId }, select: invoiceSelect }),
      prisma.option.findFirst({
        where: { id: validation.output.payment_method_id, category: 'PAYMENT_METHOD', is_active: true },
        select: { id: true, label: true, value: true }
      }),
      prisma.option.findFirst({
        where: { category: 'INCOME_TYPE', requires_invoice: true, is_active: true },
        select: { id: true }
      }),
      prisma.hrmstaff.findFirst({
        where: { user_id: context.session.user.id, status: { not: 'TERMINATED' } },
        select: { id: true }
      })
    ])

    if (!invoice) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (invoice.status.value === 'PAID' || toFiniteNumber(invoice.remaining_balance) <= 0.005)
      return { success: false, code: 'ALREADY_PAID', error: context.translations.messages.alreadyPaid }
    if (!paymentMethod || !incomeType || !receiver)
      return {
        success: false,
        code: 'PAYMENT_OPTIONS_MISSING',
        error: context.translations.messages.paymentOptionsMissing
      }

    const paymentAmount = toFiniteNumber(validation.output.amount)

    if (paymentAmount <= 0 || paymentAmount - toFiniteNumber(invoice.remaining_balance) > 0.005) {
      return { success: false, code: 'INVOICE_OVERPAYMENT', error: context.translations.validation.fullPaymentRequired }
    }

    const paymentDate = toUtcDateOnly(validation.output.payment_date)
    const executionTimestamp = new Date()
    const snapshotRate = toFiniteNumber(invoice.exchange_rate)
    const paymentBaseAfn = normalizeToAfn(paymentAmount, invoice.currency, snapshotRate)

    const project = await prisma.project.findFirst({
      where: { contract_id: invoice.contract_id, client_id: invoice.client_id },
      select: { id: true },
      orderBy: { created_at: 'desc' }
    })

    const income = await prisma.$transaction(async transaction => {
      const createdIncome = await transaction.financeincome.create({
        data: {
          receipt_voucher_number: `RCT-${executionTimestamp.getUTCFullYear()}-${randomUUID().replaceAll('-', '').slice(-8).toUpperCase()}`,
          invoice_id: invoice.id,
          client_id: invoice.client_id,
          contract_id: invoice.contract_id,
          project_id: project?.id || null,
          received_by_id: receiver.id,
          status: 'PAID',
          name: `${invoice.invoice_number} - ${invoice.contract.title}`,
          pay_details: JSON.stringify({
            payment_method_id: paymentMethod.id,
            payment_method: paymentMethod.label,
            payment_date: validation.output.payment_date,
            notes: validation.output.notes || null
          }),
          payment_method_id: paymentMethod.id,
          payment_date: paymentDate,
          notes: validation.output.notes || null,
          income_type_id: incomeType.id,
          total_amount: new Prisma.Decimal(paymentAmount),
          currency: invoice.currency,
          paid_amount: new Prisma.Decimal(paymentAmount),
          remind_amount: new Prisma.Decimal(0),
          exchange_rate: new Prisma.Decimal(snapshotRate),
          fx_snapshot_at: executionTimestamp,
          amount_base: new Prisma.Decimal(paymentBaseAfn)
        }
      })

      const settlement = await syncInvoiceSettlement(transaction, invoice.id)

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'INVOICE_PAYMENT_RECORDED',
          module: 'CONTRACTS',
          details: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            incomeId: createdIncome.id,
            paymentMethod: paymentMethod.value,
            paymentAmount: paymentAmount.toFixed(2),
            paymentBaseAfn: paymentBaseAfn.toFixed(2),
            fxRate: snapshotRate.toFixed(4),
            fxSnapshotAt: executionTimestamp.toISOString(),
            invoiceStatus: settlement.status.value,
            remainingBalance: settlement.remaining_balance.toString()
          }
        }
      })

      return createdIncome
    }, settlementTransactionOptions)

    revalidateInvoices()

    return { success: true, data: { incomeId: income.id }, message: context.translations.messages.paymentRecorded }
  } catch (error) {
    if (error instanceof InvoiceSettlementError && error.code === 'INVOICE_OVERPAYMENT') {
      return { success: false, code: error.code, error: context.translations.validation.fullPaymentRequired }
    }

    return { success: false, code: 'PAYMENT_FAILED', error: context.translations.messages.paymentFailed }
  }
}
