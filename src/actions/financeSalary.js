'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { getFinanceSalaryDictionary } from '@/data/dictionaries/financeSalary'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import {
  createFinanceSalarySchema,
  financeSalaryAdjustmentSchema,
  financeSalaryMonthSchema
} from '@/schemas/financeSalary'
import { convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const READ_PERMISSIONS = ['finance:read', 'finance_salary:read']
const WRITE_PERMISSIONS = ['finance:write', 'finance_salary:write']
const DELETE_PERMISSIONS = ['finance:delete', 'finance_salary:delete']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const ACTIVE_LOAN_VALUES = ['ACTIVE', 'APPROVED']

const staffSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  position: true,
  salary: true,
  salary_currency: true,
  salary_exchange_rate: true
}

const salarySelect = {
  id: true,
  timesheet_summary: true,
  status: true,
  staff_id: true,
  timesheet_month: true,
  total_month_days: true,
  worked_days: true,
  off_days: true,
  base_salary: true,
  base_daily_rate: true,
  earned_salary: true,
  bonus_amount: true,
  loan_deduction: true,
  payable_amount: true,
  exchange_rate: true,
  payable_usd: true,
  loan_status: true,
  payment_date: true,
  processed_by_id: true,
  created_at: true,
  updated_at: true,
  amount_base: true,
  currency: true,
  staff: { select: staffSelect },
  processed_by: { select: staffSelect }
}

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')
const iso = value => value?.toISOString() || null
const moneyString = (value, scale = 2) => (value == null ? null : toFiniteNumber(value).toFixed(scale))
const fullName = staff => `${staff?.first_name || ''} ${staff?.last_name || ''}`.trim()
const withStaffName = staff => staff ? { ...staff, salary: moneyString(staff.salary), salary_exchange_rate: moneyString(staff.salary_exchange_rate, 4), full_name: fullName(staff) } : null

const normalizeSalary = salary => ({
  ...salary,
  base_salary: moneyString(salary.base_salary),
  base_daily_rate: moneyString(salary.base_daily_rate),
  earned_salary: moneyString(salary.earned_salary),
  bonus_amount: moneyString(salary.bonus_amount),
  loan_deduction: moneyString(salary.loan_deduction),
  payable_amount: moneyString(salary.payable_amount),
  exchange_rate: moneyString(salary.exchange_rate, 4),
  payable_usd: moneyString(salary.payable_usd),
  amount_base: moneyString(salary.amount_base),
  payment_date: iso(salary.payment_date),
  created_at: iso(salary.created_at),
  updated_at: iso(salary.updated_at),
  staff: withStaffName(salary.staff),
  processed_by: withStaffName(salary.processed_by)
})

const getContext = async (payload, permissions) => {
  const locale = normalizeLocale(payload?.locale)
  const translations = getFinanceSalaryDictionary(locale)
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

const revalidateSalaryPages = () => {
  revalidatePath('/[lang]/finance/salary', 'page')
  revalidatePath('/[lang]/finance/loans', 'page')
}

const getMonthRange = monthValue => {
  const [year, month] = monthValue.split('-').map(Number)

  return {
    year,
    month,
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
    totalDays: new Date(Date.UTC(year, month, 0)).getUTCDate()
  }
}

const fromBaseCurrency = (amount, currency, exchangeRate, baseCurrency) => {
  const numeric = toFiniteNumber(amount)
  const rate = toFiniteNumber(exchangeRate)

  if (currency === baseCurrency) return numeric
  if (baseCurrency === 'AFN' && currency === 'USD') return rate > 0 ? numeric / rate : 0
  if (baseCurrency === 'USD' && currency === 'AFN') return numeric * rate

  return numeric
}

const convertCurrency = (amount, sourceCurrency, sourceRate, targetCurrency, targetRate, baseCurrency) => {
  const baseAmount = convertToBaseCurrency(amount, sourceCurrency, sourceRate, baseCurrency)

  return fromBaseCurrency(baseAmount, targetCurrency, targetRate, baseCurrency)
}

const calculateSalary = ({ baseSalary, totalDays, workedDays, bonusAmount, loanDeduction, currency, exchangeRate, baseCurrency }) => {
  const dailyRate = totalDays > 0 ? baseSalary / totalDays : 0
  const earnedSalary = dailyRate * workedDays
  const payableAmount = Math.max(0, earnedSalary + bonusAmount - loanDeduction)
  const amountBase = convertToBaseCurrency(payableAmount, currency, exchangeRate, baseCurrency)
  const payableUsd = currency === 'USD' ? payableAmount : exchangeRate > 0 ? payableAmount / exchangeRate : 0

  return { dailyRate, earnedSalary, payableAmount, amountBase, payableUsd }
}

const ensureLoanStatuses = async () => {
  await prisma.$transaction([
    prisma.option.upsert({
      where: { category_value: { category: 'LOAN_STATUS', value: 'ACTIVE' } },
      update: {},
      create: { category: 'LOAN_STATUS', label: 'Active', value: 'ACTIVE', color_code: 'warning', sort_order: 1, is_default: true, is_active: true }
    }),
    prisma.option.upsert({
      where: { category_value: { category: 'LOAN_STATUS', value: 'REPAID' } },
      update: {},
      create: { category: 'LOAN_STATUS', label: 'Repaid', value: 'REPAID', color_code: 'success', sort_order: 2, is_active: true }
    })
  ])
}

const getActiveLoans = (client, staffIds) => client.financeloan.findMany({
  where: {
    staff_id: { in: staffIds },
    loan_type: 'STAFF',
    remaining_balance: { gt: 0 },
    status: { is: { category: 'LOAN_STATUS', value: { in: ACTIVE_LOAN_VALUES }, is_active: true } }
  },
  select: {
    id: true,
    staff_id: true,
    monthly_deduction: true,
    repaid_amount: true,
    remaining_balance: true,
    currency: true,
    exchange_rate: true,
    issue_date: true
  },
  orderBy: [{ issue_date: 'asc' }, { created_at: 'asc' }]
})

const adjustmentPayload = payload => ({
  worked_days: String(payload?.worked_days ?? ''),
  off_days: String(payload?.off_days ?? ''),
  bonus_amount: String(payload?.bonus_amount ?? '0'),
  loan_deduction: String(payload?.loan_deduction ?? '0'),
  timesheet_summary: payload?.timesheet_summary ?? '',
  currency: payload?.currency ?? 'AFN',
  exchange_rate: String(payload?.exchange_rate ?? '65')
})

const getPreparedAdjustment = async (salary, values, translations) => {
  const workedDays = Number.parseInt(values.worked_days, 10)
  const offDays = Number.parseInt(values.off_days, 10)
  const bonusAmount = toFiniteNumber(values.bonus_amount)
  const loanDeduction = toFiniteNumber(values.loan_deduction)
  const exchangeRate = toFiniteNumber(values.exchange_rate)

  if (workedDays + offDays > salary.total_month_days) return { success: false, error: translations.validation.daysExceedMonth }
  if (exchangeRate <= 0) return { success: false, error: translations.validation.rateInvalid }

  const setup = await getCompanySetupRecord()
  const baseCurrency = setup.currency_code || 'AFN'
  const sourceCurrency = salary.currency || values.currency
  const sourceRate = toFiniteNumber(salary.exchange_rate) || exchangeRate
  const baseSalary = convertCurrency(salary.base_salary, sourceCurrency, sourceRate, values.currency, exchangeRate, baseCurrency)
  const calculation = calculateSalary({ baseSalary, totalDays: salary.total_month_days, workedDays, bonusAmount, loanDeduction, currency: values.currency, exchangeRate, baseCurrency: setup.currency_code || 'AFN' })

  return {
    success: true,
    data: {
      worked_days: workedDays,
      off_days: offDays,
      base_salary: new Prisma.Decimal(baseSalary),
      base_daily_rate: new Prisma.Decimal(calculation.dailyRate),
      earned_salary: new Prisma.Decimal(calculation.earnedSalary),
      bonus_amount: new Prisma.Decimal(bonusAmount),
      loan_deduction: new Prisma.Decimal(loanDeduction),
      payable_amount: new Prisma.Decimal(calculation.payableAmount),
      exchange_rate: new Prisma.Decimal(exchangeRate),
      payable_usd: new Prisma.Decimal(calculation.payableUsd),
      amount_base: new Prisma.Decimal(calculation.amountBase),
      currency: values.currency,
      timesheet_summary: values.timesheet_summary || null,
      loan_status: loanDeduction > 0 ? 'PENDING' : 'NOT_APPLICABLE'
    }
  }
}

export const getFinanceSalaries = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const month = typeof payload.month === 'string' ? payload.month : ''
  const monthValidation = safeParse(financeSalaryMonthSchema(context.translations.validation), { month })

  if (!monthValidation.success) return { success: false, code: 'VALIDATION_ERROR', error: monthValidation.issues[0]?.message }

  const page = Math.max(1, Number.parseInt(payload.page, 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(payload.limit, 10) || DEFAULT_PAGE_SIZE))
  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const status = ['DRAFT', 'PAID'].includes(payload.status) ? payload.status : ''

  const where = {
    timesheet_month: month,
    ...(status && { status }),
    ...(search && {
      staff: { is: { OR: [{ first_name: { contains: search } }, { last_name: { contains: search } }, { email: { contains: search } }] } }
    })
  }

  try {
    const [setup, totalCount, salaries, summaryRows] = await Promise.all([
      getCompanySetupRecord(),
      prisma.financesalary.count({ where }),
      prisma.financesalary.findMany({ where, select: salarySelect, orderBy: [{ status: 'asc' }, { staff: { first_name: 'asc' } }], skip: (page - 1) * limit, take: limit }),
      prisma.financesalary.findMany({ where: { timesheet_month: month }, select: { status: true, amount_base: true, loan_deduction: true, currency: true, exchange_rate: true } })
    ])

    const baseCurrency = setup.currency_code || 'AFN'

    const summary = summaryRows.reduce((totals, row) => {
      const baseAmount = toFiniteNumber(row.amount_base)
      const loanBase = convertToBaseCurrency(row.loan_deduction, row.currency, row.exchange_rate, baseCurrency)

      totals.total += baseAmount
      totals.loanDeductions += loanBase
      if (row.status === 'PAID') totals.paid += baseAmount
      else totals.pending += baseAmount

      return totals
    }, { total: 0, paid: 0, pending: 0, loanDeductions: 0 })

    return { success: true, data: { salaries: salaries.map(normalizeSalary), totalCount, page, baseCurrency, summary } }
  } catch {
    return { success: false, code: 'SALARY_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getFinanceSalaryOptions = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const [staff, setup] = await Promise.all([
      prisma.hrmstaff.findMany({ where: { status: 'ACTIVE' }, select: staffSelect, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }], take: 500 }),
      getCompanySetupRecord()
    ])

    return { success: true, data: { staff: staff.map(withStaffName), baseCurrency: setup.currency_code || 'AFN', exchangeRate: setup.usd_afn_exchange_rate || '65.0000', company: setup } }
  } catch {
    return { success: false, code: 'SALARY_OPTIONS_LOAD_FAILED', error: context.translations.messages.optionsLoadFailed }
  }
}

export const getFinanceSalaryDetail = async (id, payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const salaryId = normalizeId(id)

    const [salary, setup, paymentAudit] = await Promise.all([
      prisma.financesalary.findUnique({ where: { id: salaryId }, select: salarySelect }),
      getCompanySetupRecord(),
      prisma.auditlog.findFirst({
        where: {
          action: 'FINANCE_SALARY_PAID',
          module: 'FINANCE',
          details: { path: '$.salaryId', equals: salaryId }
        },
        select: { details: true, user: { select: { id: true, name: true, email: true } } },
        orderBy: { created_at: 'desc' }
      })
    ])

    if (!salary) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const auditedProcessor = paymentAudit?.user
      ? { id: paymentAudit.user.id, full_name: paymentAudit.user.name || paymentAudit.user.email, email: paymentAudit.user.email, source: 'USER' }
      : paymentAudit?.details?.executedByUserId
        ? {
            id: paymentAudit.details.executedByUserId,
            full_name: paymentAudit.details.executedByName || paymentAudit.details.executedByEmail,
            email: paymentAudit.details.executedByEmail || null,
            source: 'USER'
          }
        : null

    return { success: true, data: { salary: { ...normalizeSalary(salary), processor_identity: salary.processed_by ? null : auditedProcessor }, company: setup } }
  } catch {
    return { success: false, code: 'SALARY_DETAIL_LOAD_FAILED', error: context.translations.messages.detailLoadFailed }
  }
}

export const generateMonthlyPayroll = async (month, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(financeSalaryMonthSchema(context.translations.validation), { month })

  if (!validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }

  const range = getMonthRange(validation.output.month)

  try {
    await ensureLoanStatuses()

    const [staffMembers, existing, timesheets, setup] = await Promise.all([
      prisma.hrmstaff.findMany({ where: { status: 'ACTIVE' }, select: staffSelect, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }] }),
      prisma.financesalary.findMany({ where: { timesheet_month: validation.output.month }, select: { staff_id: true } }),
      prisma.hrmstafftimesheet.findMany({ where: { date: { gte: range.start, lt: range.end } }, select: { staff_id: true, status: true, hours_worked: true } }),
      getCompanySetupRecord()
    ])

    if (staffMembers.length === 0) return { success: false, code: 'NO_ELIGIBLE_STAFF', error: context.translations.messages.noEligibleStaff }

    const existingStaff = new Set(existing.map(item => item.staff_id))
    const eligible = staffMembers.filter(staff => !existingStaff.has(staff.id))
    const loans = eligible.length ? await getActiveLoans(prisma, eligible.map(staff => staff.id)) : []
    const attendance = new Map()

    timesheets.forEach(row => {
      const current = attendance.get(row.staff_id) || { workedDays: 0, hours: 0, absentDays: 0, leaveDays: 0 }
      const normalizedStatus = row.status?.toUpperCase()

      if (normalizedStatus === 'PRESENT') current.workedDays += 1
      if (normalizedStatus === 'ABSENT') current.absentDays += 1
      if (normalizedStatus === 'LEAVE') current.leaveDays += 1
      current.hours += toFiniteNumber(row.hours_worked)
      attendance.set(row.staff_id, current)
    })

    const loansByStaff = new Map()

    loans.forEach(loan => loansByStaff.set(loan.staff_id, [...(loansByStaff.get(loan.staff_id) || []), loan]))

    const created = await prisma.$transaction(async transaction => {
      let count = 0

      for (const staff of eligible) {
        const salaryAmount = toFiniteNumber(staff.salary)
        const currency = staff.salary_currency || setup.currency_code || 'AFN'
        const exchangeRate = toFiniteNumber(staff.salary_exchange_rate) || toFiniteNumber(setup.usd_afn_exchange_rate) || 65
        const staffAttendance = attendance.get(staff.id) || { workedDays: 0, hours: 0, absentDays: 0, leaveDays: 0 }
        const maximumGross = (salaryAmount / range.totalDays) * staffAttendance.workedDays

        const scheduledLoanDeduction = (loansByStaff.get(staff.id) || []).reduce((total, loan) => {
          const loanAmount = Math.min(toFiniteNumber(loan.monthly_deduction), toFiniteNumber(loan.remaining_balance))

          return total + convertCurrency(loanAmount, loan.currency, loan.exchange_rate, currency, exchangeRate, setup.currency_code || 'AFN')
        }, 0)

        const loanDeduction = Math.min(scheduledLoanDeduction, maximumGross)
        const calculation = calculateSalary({ baseSalary: salaryAmount, totalDays: range.totalDays, workedDays: staffAttendance.workedDays, bonusAmount: 0, loanDeduction, currency, exchangeRate, baseCurrency: setup.currency_code || 'AFN' })
        const notes = `Attendance: ${staffAttendance.workedDays} present, ${staffAttendance.absentDays} absent, ${staffAttendance.leaveDays} leave; ${staffAttendance.hours.toFixed(2)} hours logged.`

        await transaction.financesalary.create({
          data: {
            staff_id: staff.id,
            timesheet_month: validation.output.month,
            total_month_days: range.totalDays,
            worked_days: staffAttendance.workedDays,
            off_days: Math.max(0, range.totalDays - staffAttendance.workedDays),
            base_salary: new Prisma.Decimal(salaryAmount),
            base_daily_rate: new Prisma.Decimal(calculation.dailyRate),
            earned_salary: new Prisma.Decimal(calculation.earnedSalary),
            bonus_amount: new Prisma.Decimal(0),
            loan_deduction: new Prisma.Decimal(loanDeduction),
            payable_amount: new Prisma.Decimal(calculation.payableAmount),
            exchange_rate: new Prisma.Decimal(exchangeRate),
            payable_usd: new Prisma.Decimal(calculation.payableUsd),
            loan_status: loanDeduction > 0 ? 'PENDING' : 'NOT_APPLICABLE',
            amount_base: new Prisma.Decimal(calculation.amountBase),
            currency,
            status: 'DRAFT',
            timesheet_summary: notes
          }
        })
        count += 1
      }

      await transaction.auditlog.create({ data: { user_id: context.session.user.id, action: 'FINANCE_SALARY_BATCH_GENERATED', module: 'FINANCE', details: { timesheetMonth: validation.output.month, generated: count, skipped: existing.length } } })

      return count
    })

    revalidateSalaryPages()

    return { success: true, data: { created, skipped: existing.length }, message: context.translations.messages.generated.replace('{created}', String(created)).replace('{skipped}', String(existing.length)) }
  } catch (error) {
    if (error?.code === 'P2002') return { success: false, code: 'DUPLICATE_PAYROLL', error: context.translations.messages.duplicate }

    return { success: false, code: 'SALARY_GENERATION_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const createFinanceSalary = async (payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(createFinanceSalarySchema(context.translations.validation), {
    staff_id: payload?.staff_id ?? '',
    timesheet_month: payload?.timesheet_month ?? '',
    ...adjustmentPayload(payload)
  })

  if (!validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }

  try {
    const staff = await prisma.hrmstaff.findUnique({ where: { id: validation.output.staff_id }, select: staffSelect })

    if (!staff) return { success: false, code: 'INVALID_STAFF', error: context.translations.validation.invalidStaff }

    const totalDays = getMonthRange(validation.output.timesheet_month).totalDays
    const salaryShell = { base_salary: staff.salary, total_month_days: totalDays, currency: validation.output.currency, exchange_rate: validation.output.exchange_rate }
    const prepared = await getPreparedAdjustment(salaryShell, validation.output, context.translations)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    const created = await prisma.$transaction(async transaction => {
      const salary = await transaction.financesalary.create({ data: { staff_id: staff.id, timesheet_month: validation.output.timesheet_month, total_month_days: totalDays, base_salary: staff.salary, status: 'DRAFT', ...prepared.data }, select: salarySelect })

      await transaction.auditlog.create({ data: { user_id: context.session.user.id, action: 'FINANCE_SALARY_CREATED', module: 'FINANCE', details: { salaryId: salary.id, staffId: staff.id, timesheetMonth: salary.timesheet_month } } })

      return salary
    })

    revalidateSalaryPages()

    return { success: true, data: normalizeSalary(created), message: context.translations.messages.created }
  } catch (error) {
    if (error?.code === 'P2002') return { success: false, code: 'DUPLICATE_PAYROLL', error: context.translations.messages.duplicate }

    return { success: false, code: 'SALARY_CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateFinanceSalary = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(financeSalaryAdjustmentSchema(context.translations.validation), adjustmentPayload(payload))

  if (!validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }

  try {
    const current = await prisma.financesalary.findUnique({ where: { id: normalizeId(id) }, select: { id: true, status: true, total_month_days: true, base_salary: true, currency: true, exchange_rate: true } })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (current.status === 'PAID') return { success: false, code: 'PAID_LOCKED', error: context.translations.messages.paidLocked }

    const prepared = await getPreparedAdjustment(current, validation.output, context.translations)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    const updated = await prisma.$transaction(async transaction => {
      const salary = await transaction.financesalary.update({ where: { id: current.id }, data: prepared.data, select: salarySelect })

      await transaction.auditlog.create({ data: { user_id: context.session.user.id, action: 'FINANCE_SALARY_UPDATED', module: 'FINANCE', details: { salaryId: salary.id, staffId: salary.staff_id, timesheetMonth: salary.timesheet_month } } })

      return salary
    })

    revalidateSalaryPages()

    return { success: true, data: normalizeSalary(updated), message: context.translations.messages.updated }
  } catch {
    return { success: false, code: 'SALARY_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const markSalaryPaid = async (salaryId, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const id = normalizeId(salaryId)

  try {
    await ensureLoanStatuses()

    const [processor, repaidStatus, setup] = await Promise.all([
      prisma.hrmstaff.findUnique({ where: { user_id: context.session.user.id }, select: { id: true } }),
      prisma.option.findUnique({ where: { category_value: { category: 'LOAN_STATUS', value: 'REPAID' } }, select: { id: true } }),
      getCompanySetupRecord()
    ])

    const result = await prisma.$transaction(async transaction => {
      const salary = await transaction.financesalary.findUnique({ where: { id }, select: salarySelect })

      if (!salary) return { error: 'NOT_FOUND' }
      if (salary.status === 'PAID') return { error: 'ALREADY_PAID' }

      let remainingDeductionBase = convertToBaseCurrency(salary.loan_deduction, salary.currency, salary.exchange_rate, setup.currency_code || 'AFN')
      const loans = remainingDeductionBase > 0 ? await getActiveLoans(transaction, [salary.staff_id]) : []
      const appliedLoans = []

      for (const loan of loans) {
        if (remainingDeductionBase <= 0.005) break

        const loanRemaining = toFiniteNumber(loan.remaining_balance)
        const loanRemainingBase = convertToBaseCurrency(loanRemaining, loan.currency, loan.exchange_rate, setup.currency_code || 'AFN')
        const appliedBase = Math.min(remainingDeductionBase, loanRemainingBase)
        const appliedLoanCurrency = fromBaseCurrency(appliedBase, loan.currency, loan.exchange_rate, setup.currency_code || 'AFN')
        const nextRemaining = Math.max(0, loanRemaining - appliedLoanCurrency)
        const nextRepaid = toFiniteNumber(loan.repaid_amount) + appliedLoanCurrency

        await transaction.financeloan.update({
          where: { id: loan.id },
          data: {
            repaid_amount: new Prisma.Decimal(nextRepaid),
            remaining_balance: new Prisma.Decimal(nextRemaining),
            ...(nextRemaining <= 0.005 && repaidStatus ? { status_id: repaidStatus.id } : {})
          }
        })

        remainingDeductionBase -= appliedBase
        appliedLoans.push({ loanId: loan.id, amount: appliedLoanCurrency.toFixed(2), currency: loan.currency })
      }

      const updated = await transaction.financesalary.update({
        where: { id },
        data: { status: 'PAID', payment_date: new Date(), processed_by_id: processor?.id || null, loan_status: toFiniteNumber(salary.loan_deduction) > 0 ? 'DEDUCTED' : 'NOT_APPLICABLE' },
        select: salarySelect
      })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_SALARY_PAID',
          module: 'FINANCE',
          details: {
            salaryId: id,
            staffId: salary.staff_id,
            processedByStaffId: processor?.id || null,
            executedByUserId: context.session.user.id,
            executedByName: context.session.user.name || null,
            executedByEmail: context.session.user.email || null,
            loanDeductions: appliedLoans
          }
        }
      })

      return { salary: updated }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (result.error === 'NOT_FOUND') return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (result.error === 'ALREADY_PAID') return { success: false, code: 'ALREADY_PAID', error: context.translations.messages.alreadyPaid }

    revalidateSalaryPages()

    return { success: true, data: normalizeSalary(result.salary), message: context.translations.messages.paid }
  } catch {
    return { success: false, code: 'SALARY_PAYMENT_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const deleteFinanceSalary = async (id, payload = {}) => {
  const context = await getContext(payload, DELETE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const current = await prisma.financesalary.findUnique({ where: { id: normalizeId(id) }, select: { id: true, status: true, staff_id: true, timesheet_month: true } })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (current.status === 'PAID') return { success: false, code: 'PAID_LOCKED', error: context.translations.messages.paidLocked }

    await prisma.$transaction([
      prisma.financesalary.delete({ where: { id: current.id } }),
      prisma.auditlog.create({ data: { user_id: context.session.user.id, action: 'FINANCE_SALARY_DELETED', module: 'FINANCE', details: { salaryId: current.id, staffId: current.staff_id, timesheetMonth: current.timesheet_month } } })
    ])

    revalidateSalaryPages()

    return { success: true, message: context.translations.messages.deleted }
  } catch {
    return { success: false, code: 'SALARY_DELETE_FAILED', error: context.translations.messages.operationFailed }
  }
}
