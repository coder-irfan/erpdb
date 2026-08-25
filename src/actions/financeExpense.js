'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { getFinanceExpenseDictionary } from '@/data/dictionaries/financeExpense'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { createFinanceExpenseSchema } from '@/schemas/financeExpense'
import { toUtcDateOnly } from '@/utils/contractDuration'
import { convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const READ_PERMISSIONS = ['finance:read', 'finance_expense:read']
const WRITE_PERMISSIONS = ['finance:write', 'finance_expense:write']
const DELETE_PERMISSIONS = ['finance:delete', 'finance_expense:delete']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const RECEIPT_PATH_PATTERN = /^\/uploads\/images\/[a-zA-Z0-9._-]+$/

const optionSelect = {
  id: true,
  label: true,
  value: true,
  color_code: true,
  is_default: true
}

const projectSelect = {
  id: true,
  project_code: true,
  title: true,
  client_id: true,
  client: { select: { id: true, company_name: true } }
}

const staffSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  position: true,
  user: { select: { image: true } }
}

const expenseSelect = {
  id: true,
  project_id: true,
  spent_by_id: true,
  payment_method_id: true,
  receipt_url: true,
  expense_date: true,
  details: true,
  expense_type_id: true,
  quantity: true,
  unit_price: true,
  sub_total: true,
  exchange_rate: true,
  created_at: true,
  updated_at: true,
  amount_base: true,
  currency: true,
  expense_type: { select: optionSelect },
  payment_method: { select: optionSelect },
  project: { select: projectSelect },
  spent_by: { select: staffSelect }
}

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')
const iso = value => value?.toISOString() || null
const numberString = (value, scale = 2) => (value == null ? null : toFiniteNumber(value).toFixed(scale))
const withFullName = staff => staff ? { ...staff, full_name: `${staff.first_name} ${staff.last_name}`.trim() } : null

const normalizeExpense = expense => ({
  ...expense,
  unit_price: numberString(expense.unit_price),
  sub_total: numberString(expense.sub_total),
  exchange_rate: numberString(expense.exchange_rate, 4),
  total_usd: numberString(convertToBaseCurrency(expense.sub_total, expense.currency, expense.exchange_rate, 'USD')),
  amount_base: numberString(expense.amount_base),
  expense_date: iso(expense.expense_date),
  created_at: iso(expense.created_at),
  updated_at: iso(expense.updated_at),
  spent_by: withFullName(expense.spent_by)
})

const getContext = async (payload, permissions) => {
  const locale = normalizeLocale(payload?.locale)
  const translations = getFinanceExpenseDictionary(locale)
  const authorization = await authorizeAction(permissions)

  if (!authorization.authorized) {
    return {
      authorized: false,
      code: authorization.code,
      error: authorization.code === 'UNAUTHENTICATED' ? translations.messages.unauthenticated : translations.messages.forbidden,
      translations
    }
  }

  return { authorized: true, session: authorization.session, translations, locale }
}

const revalidateExpensePages = () => {
  revalidatePath('/[lang]/finance/expenses', 'page')
  revalidatePath('/[lang]/projects', 'page')
}

const validationPayload = payload => ({
  details: payload?.details ?? '',
  expense_type_id: payload?.expense_type_id ?? '',
  project_id: payload?.project_id ?? '',
  spent_by_id: payload?.spent_by_id ?? '',
  payment_method_id: payload?.payment_method_id ?? '',
  expense_date: payload?.expense_date ?? '',
  quantity: String(payload?.quantity ?? '1'),
  unit_price: String(payload?.unit_price ?? ''),
  currency: payload?.currency ?? 'AFN',
  exchange_rate: String(payload?.exchange_rate ?? '65'),
  receipt_url: payload?.receipt_url ?? ''
})

const prepareExpenseData = async (values, translations) => {
  const projectId = normalizeId(values.project_id)
  const staffId = normalizeId(values.spent_by_id)
  const typeId = normalizeId(values.expense_type_id)
  const paymentMethodId = normalizeId(values.payment_method_id)

  const [project, staff, expenseType, paymentMethod, setup] = await Promise.all([
    projectId ? prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }) : null,
    staffId ? prisma.hrmstaff.findUnique({ where: { id: staffId }, select: { id: true } }) : null,
    prisma.option.findFirst({
      where: { id: typeId, category: 'EXPENSE_TYPE', is_active: true },
      select: { id: true }
    }),
    paymentMethodId
      ? prisma.option.findFirst({
          where: { id: paymentMethodId, category: 'PAYMENT_METHOD', is_active: true },
          select: { id: true }
        })
      : null,
    getCompanySetupRecord()
  ])

  if ((projectId && !project) || (staffId && !staff) || !expenseType || (paymentMethodId && !paymentMethod)) {
    return { success: false, error: translations.validation.invalidRelation }
  }

  const receiptUrl = values.receipt_url || null

  if (receiptUrl && !RECEIPT_PATH_PATTERN.test(receiptUrl)) {
    return { success: false, error: translations.validation.invalidReceipt }
  }

  const quantity = Number.parseInt(values.quantity, 10)
  const unitPrice = toFiniteNumber(values.unit_price)
  const exchangeRate = toFiniteNumber(values.exchange_rate)

  if (!Number.isSafeInteger(quantity) || quantity <= 0 || unitPrice <= 0 || exchangeRate <= 0) {
    return { success: false, error: translations.validation.positiveInvalid }
  }

  const expenseDate = toUtcDateOnly(values.expense_date)

  if (!expenseDate) return { success: false, error: translations.validation.dateInvalid }

  const subTotal = quantity * unitPrice
  const baseCurrency = setup.currency_code || 'AFN'
  const amountBase = convertToBaseCurrency(subTotal, values.currency, exchangeRate, baseCurrency)

  return {
    success: true,
    data: {
      project_id: projectId || null,
      spent_by_id: staffId || null,
      payment_method_id: paymentMethodId || null,
      receipt_url: receiptUrl,
      expense_date: expenseDate,
      details: values.details,
      expense_type_id: typeId,
      quantity,
      unit_price: new Prisma.Decimal(unitPrice),
      sub_total: new Prisma.Decimal(subTotal),
      exchange_rate: new Prisma.Decimal(exchangeRate),
      amount_base: new Prisma.Decimal(amountBase),
      currency: values.currency
    }
  }
}

export const getFinanceExpenses = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const page = Math.max(1, Number.parseInt(payload.page, 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(payload.limit, 10) || DEFAULT_PAGE_SIZE))
  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const typeId = normalizeId(payload.typeId)
  const projectId = normalizeId(payload.projectId)
  const staffId = normalizeId(payload.staffId)

  const where = {
    AND: [
      typeId ? { expense_type_id: typeId } : {},
      projectId ? { project_id: projectId } : {},
      staffId ? { spent_by_id: staffId } : {},
      search
        ? {
            OR: [
              { details: { contains: search } },
              { project: { is: { title: { contains: search } } } },
              { spent_by: { is: { OR: [{ first_name: { contains: search } }, { last_name: { contains: search } }] } } }
            ]
          }
        : {}
    ]
  }

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  try {
    const [setup, totalCount, expenses, total, project, overhead, month] = await Promise.all([
      getCompanySetupRecord(),
      prisma.financeexpense.count({ where }),
      prisma.financeexpense.findMany({
        where,
        select: expenseSelect,
        orderBy: [{ expense_date: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.financeexpense.aggregate({ _sum: { amount_base: true } }),
      prisma.financeexpense.aggregate({ where: { project_id: { not: null } }, _sum: { amount_base: true } }),
      prisma.financeexpense.aggregate({ where: { project_id: null }, _sum: { amount_base: true } }),
      prisma.financeexpense.aggregate({
        where: { expense_date: { gte: monthStart, lt: nextMonth } },
        _sum: { amount_base: true }
      })
    ])

    return {
      success: true,
      data: {
        expenses: expenses.map(normalizeExpense),
        totalCount,
        page,
        baseCurrency: setup.currency_code || 'AFN',
        summary: {
          total: toFiniteNumber(total._sum.amount_base),
          project: toFiniteNumber(project._sum.amount_base),
          overhead: toFiniteNumber(overhead._sum.amount_base),
          month: toFiniteNumber(month._sum.amount_base)
        }
      }
    }
  } catch {
    return { success: false, code: 'EXPENSE_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getFinanceExpenseFormOptions = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const [expenseTypes, paymentMethods, projects, staff, setup] = await Promise.all([
      prisma.option.findMany({
        where: { category: 'EXPENSE_TYPE', is_active: true },
        select: optionSelect,
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
      }),
      prisma.option.findMany({
        where: { category: 'PAYMENT_METHOD', is_active: true },
        select: optionSelect,
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
      }),
      prisma.project.findMany({ select: projectSelect, orderBy: { created_at: 'desc' }, take: 500 }),
      prisma.hrmstaff.findMany({
        where: { status: { not: 'TERMINATED' } },
        select: staffSelect,
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        take: 500
      }),
      getCompanySetupRecord()
    ])

    return {
      success: true,
      data: {
        expenseTypes,
        paymentMethods,
        projects,
        staff: staff.map(withFullName),
        baseCurrency: setup.currency_code || 'AFN',
        exchangeRate: setup.usd_afn_exchange_rate || '65.0000'
      }
    }
  } catch {
    return { success: false, code: 'EXPENSE_OPTIONS_LOAD_FAILED', error: context.translations.messages.optionsLoadFailed }
  }
}

export const getFinanceExpenseDetail = async (id, payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const expense = await prisma.financeexpense.findUnique({
      where: { id: normalizeId(id) },
      select: expenseSelect
    })

    if (!expense) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    return { success: true, data: normalizeExpense(expense) }
  } catch {
    return { success: false, code: 'EXPENSE_DETAIL_LOAD_FAILED', error: context.translations.messages.detailLoadFailed }
  }
}

export const createFinanceExpense = async (payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createFinanceExpenseSchema(context.translations.validation), validationPayload(payload))

  if (!validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }

  try {
    const prepared = await prepareExpenseData(validation.output, context.translations)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    const expense = await prisma.$transaction(async transaction => {
      const created = await transaction.financeexpense.create({ data: prepared.data, select: { id: true } })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_EXPENSE_CREATED',
          module: 'FINANCE',
          details: {
            expenseId: created.id,
            projectId: prepared.data.project_id,
            subTotal: prepared.data.sub_total.toString(),
            currency: prepared.data.currency
          }
        }
      })

      return created
    })

    revalidateExpensePages()

    return { success: true, data: expense, message: context.translations.messages.created }
  } catch {
    return { success: false, code: 'EXPENSE_CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateFinanceExpense = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const expenseId = normalizeId(id)
  const validation = safeParse(createFinanceExpenseSchema(context.translations.validation), validationPayload(payload))

  if (!expenseId || !validation.success) {
    return { success: false, code: 'VALIDATION_ERROR', error: validation.issues?.[0]?.message || context.translations.messages.notFound }
  }

  try {
    const current = await prisma.financeexpense.findUnique({ where: { id: expenseId }, select: { id: true } })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const prepared = await prepareExpenseData(validation.output, context.translations)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    await prisma.$transaction([
      prisma.financeexpense.update({ where: { id: expenseId }, data: prepared.data }),
      prisma.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_EXPENSE_UPDATED',
          module: 'FINANCE',
          details: { expenseId, projectId: prepared.data.project_id, subTotal: prepared.data.sub_total.toString() }
        }
      })
    ])

    revalidateExpensePages()

    return { success: true, data: { id: expenseId }, message: context.translations.messages.updated }
  } catch {
    return { success: false, code: 'EXPENSE_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const deleteFinanceExpense = async (id, payload = {}) => {
  const context = await getContext(payload, DELETE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const expenseId = normalizeId(id)

  try {
    const expense = await prisma.financeexpense.findUnique({
      where: { id: expenseId },
      select: { id: true, details: true, project_id: true, receipt_url: true, sub_total: true, currency: true }
    })

    if (!expense) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    await prisma.$transaction([
      prisma.financeexpense.delete({ where: { id: expense.id } }),
      prisma.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_EXPENSE_DELETED',
          module: 'FINANCE',
          details: {
            expenseId: expense.id,
            details: expense.details.slice(0, 191),
            projectId: expense.project_id,
            receiptUrl: expense.receipt_url,
            subTotal: expense.sub_total.toString(),
            currency: expense.currency
          }
        }
      })
    ])

    revalidateExpensePages()

    return { success: true, message: context.translations.messages.deleted }
  } catch {
    return { success: false, code: 'EXPENSE_DELETE_FAILED', error: context.translations.messages.operationFailed }
  }
}
