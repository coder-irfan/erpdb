'use server'

import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { getFinanceIncomeDictionary } from '@/data/dictionaries/financeIncome'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { deriveReceivableStatus, isOverdue } from '@/libs/financialStatuses'
import { InvoiceSettlementError, settlementTransactionOptions, syncInvoiceSettlement } from '@/libs/invoiceSettlement'
import { prisma } from '@/libs/prisma'
import { serializeData } from '@/libs/serialize'
import { createFinanceIncomeSchema } from '@/schemas/financeIncome'
import { toUtcDateOnly } from '@/utils/contractDuration'
import {
  SYSTEM_BASE_CURRENCY,
  convertToBaseCurrency,
  effectiveAfnExchangeRate,
  normalizeToAfn,
  roundMoney,
  subtractMoney,
  toFiniteNumber
} from '@/utils/formatCurrency'

const READ_PERMISSIONS = ['finance:read', 'finance_income:read']
const WRITE_PERMISSIONS = ['finance:write', 'finance_income:write']
const DELETE_PERMISSIONS = ['finance:delete', 'finance_income:delete']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const STATUSES = new Set(['PAID', 'PARTIAL', 'PENDING'])

const optionSelect = {
  id: true,
  label: true,
  value: true,
  color_code: true,
  is_default: true,
  requires_invoice: true
}

const staffSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  position: true,
  user: { select: { image: true } }
}

const clientSelect = {
  id: true,
  company_name: true,
  primary_contact_name: true,
  email: true,
  phone: true,
  address: true
}

const projectSelect = {
  id: true,
  project_code: true,
  title: true,
  client_id: true,
  contract_id: true
}

const contractSelect = {
  id: true,
  contract_number: true,
  title: true,
  client_id: true,
  total_amount: true,
  currency: true,
  start_date: true,
  end_date: true
}

const invoiceSelect = {
  id: true,
  invoice_number: true,
  contract_id: true,
  client_id: true,
  amount: true,
  paid_amount: true,
  remaining_balance: true,
  currency: true,
  exchange_rate: true,
  issued_date: true,
  due_date: true
}

const incomeSelect = {
  id: true,
  receipt_voucher_number: true,
  invoice_id: true,
  payment_method_id: true,
  payment_date: true,
  notes: true,
  client_id: true,
  contract_id: true,
  project_id: true,
  received_by_id: true,
  status: true,
  name: true,
  pay_details: true,
  income_type_id: true,
  total_amount: true,
  paid_amount: true,
  remind_amount: true,
  exchange_rate: true,
  remind_date: true,
  created_at: true,
  updated_at: true,
  amount_base: true,
  currency: true,
  client: { select: clientSelect },
  project: { select: projectSelect },
  contract: { select: contractSelect },
  invoice: { select: invoiceSelect },
  received_by: { select: staffSelect },
  payment_method: { select: optionSelect }
}

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')
const iso = value => value?.toISOString() || null
const numberString = (value, scale = 2) => (value == null ? null : toFiniteNumber(value).toFixed(scale))
const withFullName = staff => (staff ? { ...staff, full_name: `${staff.first_name} ${staff.last_name}`.trim() } : null)

const missingIncomeType = incomeTypeId => ({
  id: incomeTypeId || null,
  label: 'Uncategorized',
  value: 'UNCATEGORIZED',
  color_code: 'secondary',
  is_default: false,
  requires_invoice: false
})

const normalizeIncome = (income, incomeTypesById = new Map()) =>
  serializeData({
    ...income,
    income_type: incomeTypesById.get(income.income_type_id) || missingIncomeType(income.income_type_id),
    total_amount: numberString(income.total_amount),
    paid_amount: numberString(income.paid_amount),
    remind_amount: numberString(income.remind_amount),
    exchange_rate: numberString(income.exchange_rate, 4),
    fx_snapshot_at: iso(income.fx_snapshot_at),
    total_usd: numberString(convertToBaseCurrency(income.total_amount, income.currency, income.exchange_rate, 'USD')),
    amount_base: numberString(income.amount_base),
    remind_date: iso(income.remind_date),
    payment_date: iso(income.payment_date),
    created_at: iso(income.created_at),
    updated_at: iso(income.updated_at),
    contract: income.contract
      ? {
          ...income.contract,
          total_amount: numberString(income.contract.total_amount),
          start_date: iso(income.contract.start_date),
          end_date: iso(income.contract.end_date)
        }
      : null,
    invoice: income.invoice
      ? {
          ...income.invoice,
          amount: numberString(income.invoice.amount),
          paid_amount: numberString(income.invoice.paid_amount),
          remaining_balance: numberString(income.invoice.remaining_balance),
          exchange_rate: numberString(income.invoice.exchange_rate, 4),
          issued_date: iso(income.invoice.issued_date),
          due_date: iso(income.invoice.due_date)
        }
      : null,
    received_by: withFullName(income.received_by)
  })

const getContext = async (payload, permissions) => {
  const locale = normalizeLocale(payload?.locale)
  const translations = getFinanceIncomeDictionary(locale)
  const authorization = await authorizeAction(permissions)

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

  return { authorized: true, session: authorization.session, translations, locale }
}

const revalidateIncomePages = () => {
  revalidatePath('/[lang]/finance/income', 'page')
  revalidatePath('/[lang]/finance/incomes', 'page')
  revalidatePath('/[lang]/projects', 'page')
  revalidatePath('/[lang]/contracts/invoices', 'page')
}

const validationPayload = payload => ({
  name: payload?.name ?? '',
  client_id: payload?.client_id ?? '',
  project_id: payload?.project_id ?? '',
  contract_id: payload?.contract_id ?? '',
  invoice_id: payload?.invoice_id ?? '',
  income_type_id: payload?.income_type_id ?? '',
  total_amount: String(payload?.total_amount ?? ''),
  paid_amount: String(payload?.paid_amount ?? '0'),
  currency: payload?.currency ?? 'AFN',
  exchange_rate: String(payload?.exchange_rate ?? '65'),
  received_by_id: payload?.received_by_id ?? '',
  payment_method_id: payload?.payment_method_id ?? '',
  payment_date: payload?.payment_date ?? '',
  notes: payload?.notes ?? '',
  pay_details: payload?.pay_details ?? '',
  remind_date: payload?.remind_date ?? ''
})

const derivePaymentValues = (totalAmount, paidAmount) => {
  const remaining = Math.max(0, subtractMoney(totalAmount, paidAmount))
  const status = deriveReceivableStatus(totalAmount, paidAmount)

  return { remaining, status }
}

const buildReceiptVoucherNumber = () =>
  `RCT-${new Date().getUTCFullYear()}-${randomUUID().replaceAll('-', '').slice(-8).toUpperCase()}`

const prepareIncomeData = async (values, translations, actorUserId, currentIncome = null) => {
  const ids = {
    client: normalizeId(values.client_id),
    project: normalizeId(values.project_id),
    contract: normalizeId(values.contract_id),
    invoice: normalizeId(values.invoice_id),
    receiver: normalizeId(values.received_by_id),
    paymentMethod: normalizeId(values.payment_method_id),
    incomeType: normalizeId(values.income_type_id)
  }

  const [client, selectedProject, contract, invoice, receiver, paymentMethod, incomeType, setup] = await Promise.all([
    ids.client ? prisma.crmclient.findUnique({ where: { id: ids.client }, select: { id: true } }) : null,
    ids.project
      ? prisma.project.findUnique({
          where: { id: ids.project },
          select: { id: true, client_id: true, contract_id: true }
        })
      : null,
    ids.contract
      ? prisma.contract.findUnique({ where: { id: ids.contract }, select: { id: true, client_id: true } })
      : null,
    ids.invoice
      ? prisma.contractinvoice.findUnique({
          where: { id: ids.invoice },
          select: {
            id: true,
            client_id: true,
            contract_id: true,
            amount: true,
            paid_amount: true,
            remaining_balance: true,
            currency: true,
            exchange_rate: true,
            status: { select: { value: true } }
          }
        })
      : null,
    ids.receiver
      ? prisma.hrmstaff.findUnique({ where: { id: ids.receiver }, select: { id: true } })
      : prisma.hrmstaff.findFirst({
          where: { user_id: actorUserId, status: { not: 'TERMINATED' } },
          select: { id: true }
        }),
    prisma.option.findFirst({
      where: { id: ids.paymentMethod, category: 'PAYMENT_METHOD', is_active: true },
      select: { id: true, label: true }
    }),
    prisma.option.findFirst({
      where: { id: ids.incomeType, category: 'INCOME_TYPE' },
      select: { id: true, is_active: true, requires_invoice: true }
    }),
    getCompanySetupRecord()
  ])

  if (
    (ids.client && !client) ||
    (ids.project && !selectedProject) ||
    (ids.contract && !contract) ||
    (ids.invoice && !invoice) ||
    !receiver ||
    !paymentMethod ||
    !incomeType ||
    !incomeType.is_active
  ) {
    return { success: false, error: translations.validation.invalidRelation }
  }

  const project = invoice
    ? selectedProject ||
      (await prisma.project.findFirst({
        where: { contract_id: invoice.contract_id, client_id: invoice.client_id },
        select: { id: true, client_id: true, contract_id: true },
        orderBy: { created_at: 'desc' }
      }))
    : selectedProject

  // Incomes may be recorded directly without an invoice.  When an invoice is
  // selected, keep its project relationship intact so settlement remains safe.
  if (invoice && !project) {
    return { success: false, error: translations.validation.invoiceRelationsRequired }
  }

  const relatedClientIds = [ids.client, project?.client_id, contract?.client_id, invoice?.client_id].filter(Boolean)
  const uniqueClientIds = new Set(relatedClientIds)

  if (
    uniqueClientIds.size > 1 ||
    (invoice && ids.contract && invoice.contract_id !== ids.contract) ||
    (invoice && project?.contract_id !== invoice.contract_id)
  ) {
    return { success: false, error: translations.validation.invalidRelation }
  }

  const enteredTotalAmount = toFiniteNumber(values.total_amount)

  const totalAmount = invoice
    ? currentIncome?.invoice_id === invoice.id
      ? toFiniteNumber(currentIncome.total_amount)
      : toFiniteNumber(invoice.remaining_balance) > 0
        ? toFiniteNumber(invoice.remaining_balance)
        : toFiniteNumber(invoice.amount)
    : enteredTotalAmount

  const paidAmount = toFiniteNumber(values.paid_amount)
  const exchangeRate = toFiniteNumber(values.exchange_rate)

  if (totalAmount <= 0 || exchangeRate <= 0 || paidAmount < 0 || paidAmount - totalAmount > 0.005) {
    return { success: false, error: translations.validation.positiveInvalid }
  }

  if (invoice && (paidAmount <= 0 || (invoice.status.value === 'PAID' && currentIncome?.invoice_id !== invoice.id))) {
    return { success: false, error: translations.validation.positiveInvalid }
  }

  // An invoice's balance is denominated in its own locked currency.  Recording
  // a linked receipt with a user-supplied currency/rate would otherwise make a
  // numeric payment settle the wrong amount of that invoice.
  const settledCurrency = currentIncome?.fx_snapshot_at
    ? currentIncome.currency
    : invoice
      ? invoice.currency
      : values.currency

  const paymentValues = derivePaymentValues(totalAmount, paidAmount)
  const isPosted = paidAmount > 0

  const settledExchangeRate = currentIncome?.fx_snapshot_at
    ? toFiniteNumber(currentIncome.exchange_rate)
    : invoice
      ? toFiniteNumber(invoice.exchange_rate)
      : isPosted
        ? effectiveAfnExchangeRate(settledCurrency, setup.usd_afn_exchange_rate)
        : exchangeRate

  const amountBase = normalizeToAfn(totalAmount, settledCurrency, settledExchangeRate)
  const reminderDate = paymentValues.remaining > 0.005 && values.remind_date ? toUtcDateOnly(values.remind_date) : null
  const paymentDate = toUtcDateOnly(values.payment_date)

  if ((values.remind_date && paymentValues.remaining > 0.005 && !reminderDate) || !paymentDate) {
    return { success: false, error: translations.validation.dateInvalid }
  }

  return {
    success: true,
    data: {
      name: values.name,
      client_id: relatedClientIds[0] || null,
      project_id: project?.id || null,
      contract_id: ids.contract || invoice?.contract_id || null,
      invoice_id: ids.invoice || null,
      received_by_id: receiver.id,
      payment_method_id: paymentMethod.id,
      payment_date: paymentDate,
      notes: values.notes || null,
      income_type_id: ids.incomeType,
      total_amount: new Prisma.Decimal(totalAmount),
      paid_amount: new Prisma.Decimal(paidAmount),
      remind_amount: new Prisma.Decimal(paymentValues.remaining),
      status: paymentValues.status,
      currency: settledCurrency,
      exchange_rate: new Prisma.Decimal(settledExchangeRate),
      fx_snapshot_at: currentIncome?.fx_snapshot_at || new Date(),
      amount_base: new Prisma.Decimal(amountBase),
      pay_details: values.pay_details || null,
      remind_date: reminderDate
    }
  }
}

export const getFinanceIncomes = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const page = Math.max(1, Number.parseInt(payload.page, 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(payload.limit, 10) || DEFAULT_PAGE_SIZE))
  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const clientId = normalizeId(payload.clientId)
  const projectId = normalizeId(payload.projectId)
  const typeId = normalizeId(payload.typeId)
  const status = STATUSES.has(payload.status) ? payload.status : ''

  const where = {
    ...(clientId && { client_id: clientId }),
    ...(projectId && { project_id: projectId }),
    ...(typeId && { income_type_id: typeId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { pay_details: { contains: search } },
        { client: { is: { company_name: { contains: search } } } },
        { project: { is: { title: { contains: search } } } }
      ]
    })
  }

  try {
    const [totalCount, incomes, summaryRows, incomeTypes] = await Promise.all([
      prisma.financeincome.count({ where }),
      prisma.financeincome.findMany({
        where,
        select: incomeSelect,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.financeincome.findMany({
        select: {
          amount_base: true,
          paid_amount: true,
          remind_amount: true,
          currency: true,
          exchange_rate: true,
          remind_date: true,
          status: true
        }
      }),
      prisma.option.findMany({
        where: { category: 'INCOME_TYPE' },
        select: optionSelect
      })
    ])

    const incomeTypesById = new Map(incomeTypes.map(incomeType => [incomeType.id, incomeType]))

    const baseCurrency = SYSTEM_BASE_CURRENCY
    const today = toUtcDateOnly(new Date())

    const summary = summaryRows.reduce(
      (totals, row) => {
        const paidBase = convertToBaseCurrency(row.paid_amount, row.currency, row.exchange_rate, baseCurrency)
        const remainingBase = convertToBaseCurrency(row.remind_amount, row.currency, row.exchange_rate, baseCurrency)

        totals.totalIncome += toFiniteNumber(row.amount_base)
        totals.totalCollected += paidBase
        totals.pendingReceivables += remainingBase

        if (isOverdue({ dueDate: row.remind_date, completed: row.status === 'PAID', today })) {
          totals.overdueReceivables += remainingBase
        }

        return totals
      },
      { totalIncome: 0, totalCollected: 0, pendingReceivables: 0, overdueReceivables: 0 }
    )

    Object.keys(summary).forEach(key => {
      summary[key] = roundMoney(summary[key])
    })

    return {
      success: true,
      data: {
        incomes: incomes.map(income => normalizeIncome(income, incomeTypesById)),
        totalCount,
        page,
        baseCurrency: SYSTEM_BASE_CURRENCY,
        summary
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[financeIncome] Failed to load income records:', error)
    }

    return { success: false, code: 'INCOME_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getFinanceIncomeFormOptions = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const [clients, projects, contracts, invoices, staff, incomeTypes, paymentMethods, setup, currentStaff] =
      await Promise.all([
        prisma.crmclient.findMany({ select: clientSelect, orderBy: { company_name: 'asc' }, take: 500 }),
        prisma.project.findMany({ select: projectSelect, orderBy: { created_at: 'desc' }, take: 500 }),
        prisma.contract.findMany({ select: contractSelect, orderBy: { created_at: 'desc' }, take: 500 }),
        prisma.contractinvoice.findMany({
          select: { ...invoiceSelect, payment_incomes: { select: { id: true }, orderBy: { created_at: 'desc' } } },
          orderBy: { created_at: 'desc' },
          take: 500
        }),
        prisma.hrmstaff.findMany({
          where: { status: { not: 'TERMINATED' } },
          select: staffSelect,
          orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
          take: 500
        }),
        prisma.option.findMany({
          where: { category: 'INCOME_TYPE', is_active: true },
          select: optionSelect,
          orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
        }),
        prisma.option.findMany({
          where: { category: 'PAYMENT_METHOD', is_active: true },
          select: optionSelect,
          orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
        }),
        getCompanySetupRecord(),
        prisma.hrmstaff.findFirst({
          where: { user_id: context.session.user.id, status: { not: 'TERMINATED' } },
          select: { id: true }
        })
      ])

    return {
      success: true,
      data: {
        clients,
        projects,
        contracts: contracts.map(contract => ({
          ...contract,
          total_amount: numberString(contract.total_amount),
          start_date: iso(contract.start_date),
          end_date: iso(contract.end_date)
        })),
        invoices: invoices.map(invoice => ({
          ...invoice,
          project_id: projects.find(project => project.contract_id === invoice.contract_id)?.id || null,
          amount: numberString(invoice.amount),
          paid_amount: numberString(invoice.paid_amount),
          remaining_balance: numberString(invoice.remaining_balance),
          payment_income: invoice.payment_incomes[0] || null,
          exchange_rate: numberString(invoice.exchange_rate, 4),
          issued_date: iso(invoice.issued_date),
          due_date: iso(invoice.due_date)
        })),
        staff: staff.map(withFullName),
        incomeTypes,
        paymentMethods,
        currentStaffId: currentStaff?.id || null,
        baseCurrency: SYSTEM_BASE_CURRENCY,
        exchangeRate: setup.usd_afn_exchange_rate || '65.0000'
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[financeIncome] Failed to load income form options:', error)
    }

    return {
      success: false,
      code: 'INCOME_OPTIONS_LOAD_FAILED',
      error: context.translations.messages.optionsLoadFailed
    }
  }
}

export const getFinanceIncomeDetail = async (id, payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const incomeId = normalizeId(id)
    const income = await prisma.financeincome.findUnique({ where: { id: incomeId }, select: incomeSelect })

    if (!income) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const incomeType = income.income_type_id
      ? await prisma.option.findUnique({ where: { id: income.income_type_id }, select: optionSelect })
      : null

    return {
      success: true,
      data: normalizeIncome(income, new Map(incomeType ? [[incomeType.id, incomeType]] : []))
    }
  } catch {
    return { success: false, code: 'INCOME_DETAIL_LOAD_FAILED', error: context.translations.messages.detailLoadFailed }
  }
}

export const createFinanceIncome = async (payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createFinanceIncomeSchema(context.translations.validation), validationPayload(payload))

  if (!validation.success) {
    return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }
  }

  try {
    const prepared = await prepareIncomeData(validation.output, context.translations, context.session.user.id)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    const created = await prisma.$transaction(async transaction => {
      const income = await transaction.financeincome.create({
        data: { ...prepared.data, receipt_voucher_number: buildReceiptVoucherNumber() },
        select: { id: true, status: true }
      })

      const settlement = prepared.data.invoice_id
        ? await syncInvoiceSettlement(transaction, prepared.data.invoice_id)
        : null

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_INCOME_CREATED',
          module: 'FINANCE',
          details: {
            incomeId: income.id,
            status: income.status,
            totalAmount: prepared.data.total_amount.toString(),
            invoiceId: prepared.data.invoice_id,
            invoiceStatus: settlement?.status.value || null
          }
        }
      })

      return income
    }, settlementTransactionOptions)

    revalidateIncomePages()

    return { success: true, data: created, message: context.translations.messages.created }
  } catch (error) {
    if (error instanceof InvoiceSettlementError) {
      return { success: false, code: error.code, error: error.message }
    }

    return { success: false, code: 'INCOME_CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateFinanceIncome = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const incomeId = normalizeId(id)
  const validation = safeParse(createFinanceIncomeSchema(context.translations.validation), validationPayload(payload))

  if (!incomeId || !validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues?.[0]?.message || context.translations.messages.notFound
    }
  }

  try {
    const current = await prisma.financeincome.findUnique({
      where: { id: incomeId },
      select: {
        id: true,
        status: true,
        invoice_id: true,
        total_amount: true,
        currency: true,
        exchange_rate: true,
        fx_snapshot_at: true
      }
    })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const prepared = await prepareIncomeData(validation.output, context.translations, context.session.user.id, current)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    await prisma.$transaction(async transaction => {
      await transaction.financeincome.update({ where: { id: incomeId }, data: prepared.data })

      const affectedInvoices = new Set([current.invoice_id, prepared.data.invoice_id].filter(Boolean))

      for (const affectedInvoiceId of affectedInvoices) {
        await syncInvoiceSettlement(transaction, affectedInvoiceId)
      }

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_INCOME_UPDATED',
          module: 'FINANCE',
          details: { incomeId, previousStatus: current.status, status: prepared.data.status }
        }
      })
    }, settlementTransactionOptions)

    revalidateIncomePages()

    return { success: true, data: { id: incomeId }, message: context.translations.messages.updated }
  } catch (error) {
    if (error instanceof InvoiceSettlementError) {
      return { success: false, code: error.code, error: error.message }
    }

    return { success: false, code: 'INCOME_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const markFinanceIncomePaid = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const incomeId = normalizeId(id)

  try {
    const [income, setup] = await Promise.all([
      prisma.financeincome.findUnique({
        where: { id: incomeId },
        select: {
          id: true,
          invoice_id: true,
          total_amount: true,
          paid_amount: true,
          status: true,
          currency: true,
          exchange_rate: true,
          fx_snapshot_at: true
        }
      }),
      getCompanySetupRecord()
    ])

    if (!income) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const executionTimestamp = new Date()

    const snapshotRate = income.fx_snapshot_at
      ? toFiniteNumber(income.exchange_rate)
      : effectiveAfnExchangeRate(income.currency, setup.usd_afn_exchange_rate)

    const amountBase = normalizeToAfn(income.total_amount, income.currency, snapshotRate)

    await prisma.$transaction(async transaction => {
      await transaction.financeincome.update({
        where: { id: income.id },
        data: {
          paid_amount: income.total_amount,
          remind_amount: new Prisma.Decimal(0),
          status: 'PAID',
          exchange_rate: new Prisma.Decimal(snapshotRate),
          amount_base: new Prisma.Decimal(amountBase),
          fx_snapshot_at: executionTimestamp
        }
      })

      if (income.invoice_id) await syncInvoiceSettlement(transaction, income.invoice_id)

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_INCOME_MARKED_PAID',
          module: 'FINANCE',
          details: {
            incomeId: income.id,
            previousStatus: income.status,
            previousPaidAmount: income.paid_amount.toString(),
            paidAmount: income.total_amount.toString(),
            amountBaseAfn: amountBase.toFixed(2),
            fxRate: snapshotRate.toFixed(4),
            fxSnapshotAt: executionTimestamp.toISOString()
          }
        }
      })
    }, settlementTransactionOptions)

    revalidateIncomePages()

    return { success: true, message: context.translations.messages.markedPaid }
  } catch (error) {
    if (error instanceof InvoiceSettlementError) {
      return { success: false, code: error.code, error: error.message }
    }

    return { success: false, code: 'INCOME_PAYMENT_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const deleteFinanceIncome = async (id, payload = {}) => {
  const context = await getContext(payload, DELETE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const incomeId = normalizeId(id)

  try {
    const income = await prisma.financeincome.findUnique({
      where: { id: incomeId },
      select: { id: true, name: true, invoice_id: true, total_amount: true, currency: true }
    })

    if (!income) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    await prisma.$transaction(async transaction => {
      await transaction.financeincome.delete({ where: { id: income.id } })

      const settlement = income.invoice_id ? await syncInvoiceSettlement(transaction, income.invoice_id) : null

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_INCOME_DELETED',
          module: 'FINANCE',
          details: {
            incomeId: income.id,
            name: income.name,
            invoiceId: income.invoice_id,
            totalAmount: income.total_amount.toString(),
            currency: income.currency,
            revertedInvoiceStatus: settlement?.status.value || null,
            remainingBalance: settlement?.remaining_balance.toString() || null
          }
        }
      })
    }, settlementTransactionOptions)

    revalidateIncomePages()

    return { success: true, message: context.translations.messages.deleted }
  } catch {
    return { success: false, code: 'INCOME_DELETE_FAILED', error: context.translations.messages.operationFailed }
  }
}
