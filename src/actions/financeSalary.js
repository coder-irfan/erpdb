'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { getFinanceSalaryDictionary } from '@/data/dictionaries/financeSalary'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { ACTIVE_LOAN_STATUSES } from '@/libs/financialStatuses'
import { applyLoanRepayment } from '@/libs/financeLoans'
import { prisma } from '@/libs/prisma'
import { serializeData } from '@/libs/serialize'
import { getBrandingSettings } from '@/libs/systemSettings'
import {
  createFinanceSalarySchema,
  financeSalaryAdjustmentSchema,
  financeSalaryMonthSchema
} from '@/schemas/financeSalary'
import { SYSTEM_BASE_CURRENCY, convertToBaseCurrency, effectiveAfnExchangeRate, normalizeToAfn, toFiniteNumber } from '@/utils/formatCurrency'
import {
  getPayrollMonthCalendar,
  getWorkingDaysThroughDate,
  isEarlyPayrollExecution
} from '@/utils/payrollCalendar'
import { hasPayrollPayoutRole } from '@/utils/rbac'
import { getDateKeyInTimeZone } from '@/utils/utcDate'

const READ_PERMISSIONS = ['finance:read', 'finance_salary:read', 'hrm_payroll:read']
const WRITE_PERMISSIONS = ['finance:write', 'finance_salary:write', 'hrm_payroll:write']
const DELETE_PERMISSIONS = ['finance:delete', 'finance_salary:delete', 'hrm_payroll:delete']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const ACTIVE_LOAN_VALUES = ACTIVE_LOAN_STATUSES
const PAYROLL_LEDGER_ACCOUNT = 'Payroll Expenses'

const staffSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  position: true,
  join_date: true,
  termination_date: true,
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
  unpaid_leave_deduction: true,
  payable_amount: true,
  exchange_rate: true,
  fx_snapshot_at: true,
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

const withStaffName = staff =>
  staff
    ? {
        ...staff,
        salary: moneyString(staff.salary),
        salary_exchange_rate: moneyString(staff.salary_exchange_rate, 4),
        full_name: fullName(staff)
      }
    : null

const normalizeSalary = salary => serializeData({
  ...salary,
  worked_days: moneyString(salary.worked_days, 1),
  off_days: moneyString(salary.off_days, 1),
  base_salary: moneyString(salary.base_salary),
  base_daily_rate: moneyString(salary.base_daily_rate),
  earned_salary: moneyString(salary.earned_salary),
  bonus_amount: moneyString(salary.bonus_amount),
  loan_deduction: moneyString(salary.loan_deduction),
  unpaid_leave_deduction: moneyString(salary.unpaid_leave_deduction),
  payable_amount: moneyString(salary.payable_amount),
  exchange_rate: moneyString(salary.exchange_rate, 4),
  fx_snapshot_at: iso(salary.fx_snapshot_at),
  payable_usd: moneyString(convertToBaseCurrency(salary.payable_amount, salary.currency, salary.exchange_rate, 'USD')),
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
      error:
        authorization.code === 'UNAUTHENTICATED'
          ? translations.messages.unauthenticated
          : translations.messages.forbidden,
      translations
    }
  }

  return { authorized: true, session: authorization.session, translations, locale }
}

const revalidateSalaryPages = () => {
  revalidatePath('/[lang]/finance/salary', 'page')
  revalidatePath('/[lang]/finance/loans', 'page')
}

const getMonthRange = getPayrollMonthCalendar

const dateKey = date => date.toISOString().slice(0, 10)

const addLeaveDates = (target, leave, range) => {
  const start = leave.start_date > range.start ? leave.start_date : range.start
  const monthEnd = new Date(range.end.getTime() - 86_400_000)
  const end = leave.end_date < monthEnd ? leave.end_date : monthEnd

  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + 86_400_000)) {
    target.add(dateKey(cursor))
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

const calculateSalary = ({
  baseSalary,
  totalDays,
  workedDays,
  bonusAmount,
  loanDeduction,
  unpaidLeaveDeduction = 0,
  currency,
  exchangeRate,
  baseCurrency
}) => {
  const dailyRate = totalDays > 0 ? baseSalary / totalDays : 0
  const earnedSalary = dailyRate * workedDays
  const payableAmount = Math.max(0, earnedSalary + bonusAmount - loanDeduction - unpaidLeaveDeduction)
  const amountBase = convertToBaseCurrency(payableAmount, currency, exchangeRate, baseCurrency)

  return { dailyRate, earnedSalary, payableAmount, amountBase }
}

const getActiveLoans = (client, staffIds, repaymentThrough = null) =>
  client.financeloan.findMany({
    where: {
      staff_id: { in: staffIds },
      loan_type: 'STAFF',
      auto_deduct: true,
      ...(repaymentThrough && { repayment_start_date: { lte: repaymentThrough } }),
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
  timesheet_summary: payload?.timesheet_summary,
  currency: payload?.currency ?? 'AFN',
  exchange_rate: String(payload?.exchange_rate ?? '65')
})

const getPreparedAdjustment = async (salary, values, translations) => {
  const workedDays = toFiniteNumber(values.worked_days)
  const offDays = toFiniteNumber(values.off_days)
  const bonusAmount = toFiniteNumber(values.bonus_amount)
  const loanDeduction = toFiniteNumber(values.loan_deduction)
  const exchangeRate = toFiniteNumber(values.exchange_rate)

  if (workedDays + offDays > salary.total_month_days)
    return { success: false, error: translations.validation.daysExceedMonth }
  if (exchangeRate <= 0) return { success: false, error: translations.validation.rateInvalid }

  const setup = await getCompanySetupRecord()
  const baseCurrency = SYSTEM_BASE_CURRENCY
  const sourceCurrency = salary.currency || values.currency
  const sourceRate = toFiniteNumber(salary.exchange_rate) || exchangeRate

  const baseSalary = convertCurrency(
    salary.base_salary,
    sourceCurrency,
    sourceRate,
    values.currency,
    exchangeRate,
    baseCurrency
  )

  const calculation = calculateSalary({
    baseSalary,
    totalDays: salary.total_month_days,
    workedDays,
    bonusAmount,
    loanDeduction,
    unpaidLeaveDeduction: convertCurrency(
      salary.unpaid_leave_deduction,
      sourceCurrency,
      sourceRate,
      values.currency,
      exchangeRate,
      baseCurrency
    ),
    currency: values.currency,
    exchangeRate,
    baseCurrency: SYSTEM_BASE_CURRENCY
  })

  return {
    success: true,
    data: {
      worked_days: new Prisma.Decimal(workedDays),
      off_days: new Prisma.Decimal(offDays),
      base_salary: new Prisma.Decimal(baseSalary),
      base_daily_rate: new Prisma.Decimal(calculation.dailyRate),
      earned_salary: new Prisma.Decimal(calculation.earnedSalary),
      bonus_amount: new Prisma.Decimal(bonusAmount),
      loan_deduction: new Prisma.Decimal(loanDeduction),
      payable_amount: new Prisma.Decimal(calculation.payableAmount),
      exchange_rate: new Prisma.Decimal(exchangeRate),
      amount_base: new Prisma.Decimal(calculation.amountBase),
      currency: values.currency,
      timesheet_summary: values.timesheet_summary === undefined ? salary.timesheet_summary : values.timesheet_summary || null,
      loan_status: loanDeduction > 0 ? 'PENDING' : 'NOT_APPLICABLE'
    }
  }
}

export const getFinanceSalaries = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const month = typeof payload.month === 'string' ? payload.month : ''
  const monthValidation = safeParse(financeSalaryMonthSchema(context.translations.validation), { month })

  if (!monthValidation.success)
    return { success: false, code: 'VALIDATION_ERROR', error: monthValidation.issues[0]?.message }

  const page = Math.max(1, Number.parseInt(payload.page, 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(payload.limit, 10) || DEFAULT_PAGE_SIZE))
  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const status = ['DRAFT', 'PAID'].includes(payload.status) ? payload.status : ''

  const where = {
    timesheet_month: month,
    ...(status && { status }),
    ...(search && {
      staff: {
        is: {
          OR: [
            { first_name: { contains: search } },
            { last_name: { contains: search } },
            { email: { contains: search } }
          ]
        }
      }
    })
  }

  try {
    const range = getMonthRange(month)
    const currentDate = getDateKeyInTimeZone('Asia/Kabul')

    const [setup, totalCount, salaries, summaryRows, holidays] = await Promise.all([
      getCompanySetupRecord(),
      prisma.financesalary.count({ where }),
      prisma.financesalary.findMany({
        where,
        select: salarySelect,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.financesalary.findMany({
        where: { timesheet_month: month },
        select: { status: true, amount_base: true, loan_deduction: true, currency: true, exchange_rate: true }
      }),
      prisma.companyholiday.findMany({
        where: { is_active: true, date: { gte: range.start, lt: range.end } },
        select: { date: true }
      })
    ])

    const baseCurrency = SYSTEM_BASE_CURRENCY

    const summary = summaryRows.reduce(
      (totals, row) => {
        const baseAmount = toFiniteNumber(row.amount_base)
        const loanBase = convertToBaseCurrency(row.loan_deduction, row.currency, row.exchange_rate, baseCurrency)

        totals.total += baseAmount
        totals.loanDeductions += loanBase
        if (row.status === 'PAID') totals.paid += baseAmount
        else totals.pending += baseAmount

        return totals
      },
      { total: 0, paid: 0, pending: 0, loanDeductions: 0 }
    )

    return {
      success: true,
      data: {
        salaries: salaries.map(normalizeSalary),
        totalCount,
        hasGeneratedPayroll: summaryRows.length > 0,
        page,
        baseCurrency: SYSTEM_BASE_CURRENCY,
        summary,
        payoutContext: {
          currentDate,
          isEarlyExecution: isEarlyPayrollExecution(month, currentDate),
          workingDaysToDate: getWorkingDaysThroughDate(
            month,
            currentDate,
            holidays.map(item => item.date)
          ),
          targetLedgerAccount: PAYROLL_LEDGER_ACCOUNT
        }
      }
    }
  } catch {
    return { success: false, code: 'SALARY_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getFinanceSalaryOptions = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const [staff, setup] = await Promise.all([
      prisma.hrmstaff.findMany({
        where: { status: 'ACTIVE' },
        select: staffSelect,
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        take: 500
      }),
      getCompanySetupRecord()
    ])

    return {
      success: true,
      data: {
        staff: staff.map(withStaffName),
        baseCurrency: SYSTEM_BASE_CURRENCY,
        exchangeRate: setup.usd_afn_exchange_rate || '65.0000',
        company: setup
      }
    }
  } catch {
    return {
      success: false,
      code: 'SALARY_OPTIONS_LOAD_FAILED',
      error: context.translations.messages.optionsLoadFailed
    }
  }
}

export const getFinanceSalaryDetail = async (id, payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const salaryId = normalizeId(id)

    const [salary, setup, branding, paymentAudit] = await Promise.all([
      prisma.financesalary.findUnique({ where: { id: salaryId }, select: salarySelect }),
      getCompanySetupRecord(),
      getBrandingSettings(),
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
      ? {
          id: paymentAudit.user.id,
          full_name: paymentAudit.user.name || paymentAudit.user.email,
          email: paymentAudit.user.email,
          source: 'USER'
        }
      : paymentAudit?.details?.executedByUserId
        ? {
            id: paymentAudit.details.executedByUserId,
            full_name: paymentAudit.details.executedByName || paymentAudit.details.executedByEmail,
            email: paymentAudit.details.executedByEmail || null,
            source: 'USER'
          }
        : null

    return {
      success: true,
      data: {
        salary: { ...normalizeSalary(salary), processor_identity: salary.processed_by ? null : auditedProcessor },
        company: { ...setup, company_logo: setup.company_logo || branding.lightLogoUrl || null }
      }
    }
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
    const [staffMembers, existing, timesheets, approvedPaidLeaves, holidays, setup] = await Promise.all([
      prisma.hrmstaff.findMany({
        where: {
          join_date: { lt: range.end },
          status: 'ACTIVE',
          contracts: {
            some: {
              status: { is: { category: 'CONTRACT_STATUS', value: 'ACTIVE' } },
              start_date: { lt: range.end },
              OR: [{ end_date: null }, { end_date: { gte: range.start } }],
              payroll_frozen: false
            }
          }
        },
        select: staffSelect,
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
      }),
      prisma.financesalary.findMany({
        where: { timesheet_month: validation.output.month },
        select: { staff_id: true }
      }),
      prisma.hrmstafftimesheet.findMany({
        where: { date: { gte: range.start, lt: range.end } },
        select: { staff_id: true, date: true, status: true, hours_worked: true }
      }),
      prisma.hrmstaffleave.findMany({
        where: {
          is_paid: true,
          start_date: { lt: range.end },
          end_date: { gte: range.start },
          status: { is: { category: 'LEAVE_STATUS', value: 'APPROVED' } }
        },
        select: { staff_id: true, start_date: true, end_date: true, total_days: true, duration_type: true }
      }),
      prisma.companyholiday.findMany({
        where: { is_active: true, date: { gte: range.start, lt: range.end } },
        select: { date: true }
      }),
      getCompanySetupRecord()
    ])

    if (existing.length > 0)
      return {
        success: false,
        code: 'PAYROLL_ALREADY_GENERATED',
        error: context.translations.messages.payrollAlreadyGenerated
      }

    if (staffMembers.length === 0)
      return { success: false, code: 'NO_ELIGIBLE_STAFF', error: context.translations.messages.noEligibleStaff }

    const existingStaff = new Set(existing.map(item => item.staff_id))
    const eligible = staffMembers.filter(staff => !existingStaff.has(staff.id))

    const loans = eligible.length
      ? await getActiveLoans(
          prisma,
          eligible.map(staff => staff.id),
          range.end
        )
      : []

    const workingDates = range.workingDates

    if (workingDates.length === 0) {
      return { success: false, code: 'EMPTY_WORKING_CALENDAR', error: context.translations.messages.operationFailed }
    }

    const workingDateKeys = new Set(workingDates.map(dateKey))
    const holidayDateKeys = new Set(holidays.map(item => dateKey(item.date)).filter(key => workingDateKeys.has(key)))
    const attendance = new Map()

    timesheets.forEach(row => {
      const current = attendance.get(row.staff_id) || {
        presentDates: new Set(),
        hours: 0
      }

      const normalizedStatus = row.status?.toUpperCase()

      if (normalizedStatus === 'PRESENT') current.presentDates.add(dateKey(row.date))
      current.hours += toFiniteNumber(row.hours_worked)
      attendance.set(row.staff_id, current)
    })

    const paidLeavesByStaff = new Map()

    approvedPaidLeaves.forEach(leave => {
      paidLeavesByStaff.set(leave.staff_id, [...(paidLeavesByStaff.get(leave.staff_id) || []), leave])
    })

    const loansByStaff = new Map()

    loans.forEach(loan => loansByStaff.set(loan.staff_id, [...(loansByStaff.get(loan.staff_id) || []), loan]))

    const created = await prisma.$transaction(async transaction => {
      let count = 0

      for (const staff of eligible) {
        const salaryAmount = toFiniteNumber(staff.salary)
        const currency = staff.salary_currency || SYSTEM_BASE_CURRENCY

        const exchangeRate =
          toFiniteNumber(staff.salary_exchange_rate) || toFiniteNumber(setup.usd_afn_exchange_rate) || 65

        const staffAttendance = attendance.get(staff.id) || {
          presentDates: new Set(),
          hours: 0
        }

        const joinKey = dateKey(staff.join_date)
        const terminationKey = staff.termination_date ? dateKey(staff.termination_date) : null

        const eligibleWorkingDates = workingDates.filter(date => {
          const key = dateKey(date)

          return key >= joinKey && (!terminationKey || key <= terminationKey)
        })

        const recordedPresentDates = new Set(
          [...staffAttendance.presentDates].filter(
            key => workingDateKeys.has(key) && key >= joinKey && (!terminationKey || key <= terminationKey)
          )
        )

        const paidHolidayDates = new Set(
          [...holidayDateKeys].filter(key => key >= joinKey && (!terminationKey || key <= terminationKey))
        )

        const presentPayableDates = new Set([...recordedPresentDates, ...paidHolidayDates])

        let paidLeaveDays = 0

        for (const leave of paidLeavesByStaff.get(staff.id) || []) {
          const leaveDates = new Set()

          addLeaveDates(leaveDates, leave, range)

          const availableLeaveDates = [...leaveDates].filter(
            key =>
              workingDateKeys.has(key) &&
              key >= joinKey &&
              (!terminationKey || key <= terminationKey) &&
              !presentPayableDates.has(key)
          )

          paidLeaveDays += leave.duration_type === 'HALF_DAY' ? Math.min(0.5, availableLeaveDates.length) : availableLeaveDates.length
        }

        paidLeaveDays = Math.round(paidLeaveDays * 2) / 2

        const payableDays = Math.min(
          eligibleWorkingDates.length,
          presentPayableDates.size + paidLeaveDays
        )

        const absentDays = Math.max(0, eligibleWorkingDates.length - payableDays)
        const maximumGross = (salaryAmount / workingDates.length) * payableDays
        const unpaidLeaveDeduction = 0

        const scheduledLoanDeduction = (loansByStaff.get(staff.id) || []).reduce((total, loan) => {
          const loanAmount = Math.min(toFiniteNumber(loan.monthly_deduction), toFiniteNumber(loan.remaining_balance))

          return (
            total +
            convertCurrency(
              loanAmount,
              loan.currency,
              loan.exchange_rate,
              currency,
              exchangeRate,
              SYSTEM_BASE_CURRENCY
            )
          )
        }, 0)

        const loanDeduction = Math.min(scheduledLoanDeduction, Math.max(0, maximumGross - unpaidLeaveDeduction))

        const calculation = calculateSalary({
          baseSalary: salaryAmount,
          totalDays: workingDates.length,
          workedDays: payableDays,
          bonusAmount: 0,
          loanDeduction,
          currency,
          exchangeRate,
          baseCurrency: SYSTEM_BASE_CURRENCY
        })

        const timesheetSummary = JSON.stringify({
          workingDays: workingDates.length,
          payableDays,
          absentDays,
          paidLeaveDays,
          loggedHours: Number(staffAttendance.hours.toFixed(2))
        })

        await transaction.financesalary.create({
          data: {
            staff_id: staff.id,
            timesheet_month: validation.output.month,
            total_month_days: workingDates.length,
            worked_days: new Prisma.Decimal(payableDays),
            off_days: new Prisma.Decimal(absentDays),
            base_salary: new Prisma.Decimal(salaryAmount),
            base_daily_rate: new Prisma.Decimal(calculation.dailyRate),
            earned_salary: new Prisma.Decimal(calculation.earnedSalary),
            bonus_amount: new Prisma.Decimal(0),
            loan_deduction: new Prisma.Decimal(loanDeduction),
            unpaid_leave_deduction: new Prisma.Decimal(0),
            payable_amount: new Prisma.Decimal(calculation.payableAmount),
            exchange_rate: new Prisma.Decimal(exchangeRate),
            loan_status: loanDeduction > 0 ? 'PENDING' : 'NOT_APPLICABLE',
            amount_base: new Prisma.Decimal(calculation.amountBase),
            currency,
            status: 'DRAFT',
            timesheet_summary: timesheetSummary
          }
        })
        count += 1
      }

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_SALARY_BATCH_GENERATED',
          module: 'FINANCE',
          details: { timesheetMonth: validation.output.month, generated: count, skipped: existing.length }
        }
      })

      return count
    })

    revalidateSalaryPages()

    return {
      success: true,
      data: { created, skipped: existing.length },
      message: context.translations.messages.generated
        .replace('{created}', String(created))
        .replace('{skipped}', String(existing.length))
    }
  } catch (error) {
    if (error?.code === 'P2002')
      return { success: false, code: 'DUPLICATE_PAYROLL', error: context.translations.messages.duplicate }

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
    const range = getMonthRange(validation.output.timesheet_month)

    const [staff, setup] = await Promise.all([
      prisma.hrmstaff.findFirst({
        where: {
          id: validation.output.staff_id,
          status: 'ACTIVE',
          contracts: {
            some: {
              status: { is: { category: 'CONTRACT_STATUS', value: 'ACTIVE' } },
              start_date: { lt: range.end },
              OR: [{ end_date: null }, { end_date: { gte: range.start } }],
              payroll_frozen: false
            }
          }
        },
        select: staffSelect
      }),
      getCompanySetupRecord()
    ])

    if (!staff) return { success: false, code: 'INVALID_STAFF', error: context.translations.validation.invalidStaff }

    const totalDays = range.workingDays

    if (totalDays === 0) {
      return { success: false, code: 'EMPTY_WORKING_CALENDAR', error: context.translations.messages.operationFailed }
    }

    const salaryShell = {
      base_salary: staff.salary,
      total_month_days: totalDays,
      currency: validation.output.currency,
      exchange_rate: validation.output.exchange_rate
    }

    const prepared = await getPreparedAdjustment(salaryShell, validation.output, context.translations)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    const created = await prisma.$transaction(async transaction => {
      const salary = await transaction.financesalary.create({
        data: {
          staff_id: staff.id,
          timesheet_month: validation.output.timesheet_month,
          total_month_days: totalDays,
          base_salary: staff.salary,
          status: 'DRAFT',
          ...prepared.data
        },
        select: salarySelect
      })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_SALARY_CREATED',
          module: 'FINANCE',
          details: { salaryId: salary.id, staffId: staff.id, timesheetMonth: salary.timesheet_month }
        }
      })

      return salary
    })

    revalidateSalaryPages()

    return { success: true, data: normalizeSalary(created), message: context.translations.messages.created }
  } catch (error) {
    if (error?.code === 'P2002')
      return { success: false, code: 'DUPLICATE_PAYROLL', error: context.translations.messages.duplicate }

    return { success: false, code: 'SALARY_CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateFinanceSalary = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  const validation = safeParse(
    financeSalaryAdjustmentSchema(context.translations.validation),
    adjustmentPayload(payload)
  )

  if (!validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }

  try {
    const current = await prisma.financesalary.findUnique({
      where: { id: normalizeId(id) },
      select: {
        id: true,
        status: true,
        total_month_days: true,
        base_salary: true,
        currency: true,
        exchange_rate: true,
        timesheet_summary: true
      }
    })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (current.status === 'PAID')
      return { success: false, code: 'PAID_LOCKED', error: context.translations.messages.paidLocked }

    const prepared = await getPreparedAdjustment(current, validation.output, context.translations)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

    const updated = await prisma.$transaction(async transaction => {
      const salary = await transaction.financesalary.update({
        where: { id: current.id },
        data: prepared.data,
        select: salarySelect
      })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_SALARY_UPDATED',
          module: 'FINANCE',
          details: { salaryId: salary.id, staffId: salary.staff_id, timesheetMonth: salary.timesheet_month }
        }
      })

      return salary
    })

    revalidateSalaryPages()

    return { success: true, data: normalizeSalary(updated), message: context.translations.messages.updated }
  } catch {
    return { success: false, code: 'SALARY_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const markSalaryPaid = async (salaryId, payload = {}) => {
  const context = await getContext(payload, [])

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  if (!hasPayrollPayoutRole(context.session)) {
    return { success: false, code: 'PAYOUT_ROLE_REQUIRED', error: context.translations.messages.forbidden }
  }

  const id = normalizeId(salaryId)

  try {
    const [processor, setup] = await Promise.all([
      prisma.hrmstaff.findUnique({ where: { user_id: context.session.user.id }, select: { id: true } }),
      getCompanySetupRecord()
    ])

    const result = await prisma.$transaction(
      async transaction => {
        const salary = await transaction.financesalary.findUnique({ where: { id }, select: salarySelect })

        if (!salary) return { error: 'NOT_FOUND' }
        if (salary.status === 'PAID') return { error: 'ALREADY_PAID' }

        const currentDate = getDateKeyInTimeZone('Asia/Kabul')
        const earlyExecution = isEarlyPayrollExecution(salary.timesheet_month, currentDate)

        if (earlyExecution && payload?.confirmEarlyExecution !== true) {
          return { error: 'EARLY_CONFIRMATION_REQUIRED' }
        }

        const salaryRange = getMonthRange(salary.timesheet_month)

        const payableContract = await transaction.hrmstaffcontract.findFirst({
          where: {
            staff_id: salary.staff_id,
            status: { is: { category: 'CONTRACT_STATUS', value: 'ACTIVE' } },
            start_date: { lt: salaryRange.end },
            OR: [{ end_date: null }, { end_date: { gte: salaryRange.start } }],
            payroll_frozen: false
          },
          select: { id: true }
        })

        if (!payableContract) return { error: 'CONTRACT_PAYROLL_FROZEN' }

        const executionTimestamp = new Date()
        const snapshotRate = effectiveAfnExchangeRate(salary.currency, setup.usd_afn_exchange_rate)

        let remainingDeductionBase = convertToBaseCurrency(
          salary.loan_deduction,
          salary.currency,
          snapshotRate,
          SYSTEM_BASE_CURRENCY
        )
        const loans = remainingDeductionBase > 0 ? await getActiveLoans(transaction, [salary.staff_id], salaryRange.end) : []
        const appliedLoans = []

        for (const loan of loans) {
          if (remainingDeductionBase <= 0.005) break

          const loanRemaining = toFiniteNumber(loan.remaining_balance)

          const loanRemainingBase = convertToBaseCurrency(
            loanRemaining,
            loan.currency,
            effectiveAfnExchangeRate(loan.currency, setup.usd_afn_exchange_rate),
            SYSTEM_BASE_CURRENCY
          )

          const appliedBase = Math.min(remainingDeductionBase, loanRemainingBase)

          const appliedLoanCurrency = fromBaseCurrency(
            appliedBase,
            loan.currency,
            effectiveAfnExchangeRate(loan.currency, setup.usd_afn_exchange_rate),
            SYSTEM_BASE_CURRENCY
          )

          const repayment = await applyLoanRepayment(transaction, {
            loanId: loan.id,
            amount: appliedLoanCurrency,
            source: 'SALARY_DEDUCTION',
            repaymentDate: new Date(),
            referenceId: salary.id,
            createdByUserId: context.session.user.id,
            notes: `Payroll deduction for ${salary.timesheet_month}`,
            baseCurrency: SYSTEM_BASE_CURRENCY,
            fxSnapshotRate: loan.exchange_rate,
            fxSnapshotAt: executionTimestamp
          })

          const actualAppliedBase = convertToBaseCurrency(
            repayment.appliedAmount,
            loan.currency,
            effectiveAfnExchangeRate(loan.currency, setup.usd_afn_exchange_rate),
            SYSTEM_BASE_CURRENCY
          )

          remainingDeductionBase = Math.max(0, remainingDeductionBase - actualAppliedBase)
          appliedLoans.push({
            loanId: loan.id,
            repaymentId: repayment.repayment.id,
            amount: repayment.appliedAmount.toFixed(2),
            currency: loan.currency
          })
        }

        const appliedDeductionBase = Math.max(
          0,
          convertToBaseCurrency(
            salary.loan_deduction,
            salary.currency,
            snapshotRate,
            SYSTEM_BASE_CURRENCY
          ) - remainingDeductionBase
        )

        const appliedDeduction = fromBaseCurrency(
          appliedDeductionBase,
          salary.currency,
          snapshotRate,
          SYSTEM_BASE_CURRENCY
        )

        const correctedPayable = Math.max(
          0,
          toFiniteNumber(salary.earned_salary) +
            toFiniteNumber(salary.bonus_amount) -
            appliedDeduction -
            toFiniteNumber(salary.unpaid_leave_deduction)
        )

        const correctedAmountBase = convertToBaseCurrency(
          correctedPayable,
          salary.currency,
          snapshotRate,
          SYSTEM_BASE_CURRENCY
        )

        const afnPayout = normalizeToAfn(correctedPayable, salary.currency, snapshotRate)
        const expenseAmountBase = afnPayout

        const expenseType = await transaction.option.upsert({
          where: { category_value: { category: 'EXPENSE_TYPE', value: 'PAYROLL_EXPENSES' } },
          update: { label: 'Payroll Expenses', is_active: true },
          create: {
            category: 'EXPENSE_TYPE',
            label: 'Payroll Expenses',
            value: 'PAYROLL_EXPENSES',
            color_code: 'info',
            sort_order: 9,
            is_active: true
          },
          select: { id: true }
        })

        const updated = await transaction.financesalary.update({
          where: { id },
          data: {
            status: 'PAID',
            payment_date: executionTimestamp,
            processed_by_id: processor?.id || null,
            loan_deduction: new Prisma.Decimal(appliedDeduction),
            payable_amount: new Prisma.Decimal(correctedPayable),
            amount_base: new Prisma.Decimal(correctedAmountBase),
            exchange_rate: new Prisma.Decimal(snapshotRate),
            fx_snapshot_at: executionTimestamp,
            loan_status: appliedDeduction > 0.005 ? 'DEDUCTED' : 'NOT_APPLICABLE'
          },
          select: salarySelect
        })

        const expense = await transaction.financeexpense.create({
          data: {
            voucher_number: `EXP-${executionTimestamp.getUTCFullYear()}-${salary.id.slice(-8).toUpperCase()}`,
            payroll_salary_id: salary.id,
            spent_by_id: processor?.id || null,
            approved_by_id: processor?.id || null,
            processed_by_id: processor?.id || null,
            vendor_payee: fullName(salary.staff),
            approval_status: 'PAID',
            approved_at: executionTimestamp,
            paid_at: executionTimestamp,
            expense_date: executionTimestamp,
            details: `Payroll expense for ${fullName(salary.staff)} (${salary.timesheet_month})`,
            expense_type_id: expenseType.id,
            quantity: 1,
            unit_price: new Prisma.Decimal(afnPayout),
            sub_total: new Prisma.Decimal(afnPayout),
            currency: 'AFN',
            exchange_rate: new Prisma.Decimal(1),
            fx_snapshot_at: executionTimestamp,
            amount_base: new Prisma.Decimal(expenseAmountBase)
          },
          select: { id: true }
        })

        await transaction.generalledgerentry.create({
          data: {
            expense_id: expense.id,
            account_code: 'EXPENSE-OVERHEAD',
            entry_type: 'DEBIT',
            transaction_amount: new Prisma.Decimal(afnPayout),
            transaction_currency: 'AFN',
            exchange_rate: new Prisma.Decimal(1),
            debit_base: new Prisma.Decimal(expenseAmountBase),
            credit_base: new Prisma.Decimal(0),
            entry_date: executionTimestamp,
            description: `Payroll disbursement for ${fullName(salary.staff)}`,
            posted_by_user_id: context.session.user.id
          }
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
              expenseId: expense.id,
              payoutAfn: afnPayout.toFixed(2),
              fxRate: snapshotRate.toFixed(4),
              fxSnapshotAt: executionTimestamp.toISOString(),
              earlyExecution,
              executionDate: currentDate,
              loanDeductions: appliedLoans
            }
          }
        })

        return { salary: updated }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    if (result.error === 'NOT_FOUND')
      return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (result.error === 'ALREADY_PAID')
      return { success: false, code: 'ALREADY_PAID', error: context.translations.messages.alreadyPaid }
    if (result.error === 'EARLY_CONFIRMATION_REQUIRED')
      return {
        success: false,
        code: 'EARLY_CONFIRMATION_REQUIRED',
        error: context.translations.messages.earlyConfirmationRequired
      }
    if (result.error === 'CONTRACT_PAYROLL_FROZEN')
      return {
        success: false,
        code: 'CONTRACT_PAYROLL_FROZEN',
        error: 'Payroll is frozen because the staff member has no active contract for this pay period.'
      }

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
    const current = await prisma.financesalary.findUnique({
      where: { id: normalizeId(id) },
      select: { id: true, status: true, staff_id: true, timesheet_month: true }
    })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (current.status === 'PAID')
      return { success: false, code: 'PAID_LOCKED', error: context.translations.messages.paidLocked }

    await prisma.$transaction([
      prisma.financesalary.delete({ where: { id: current.id } }),
      prisma.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'FINANCE_SALARY_DELETED',
          module: 'FINANCE',
          details: { salaryId: current.id, staffId: current.staff_id, timesheetMonth: current.timesheet_month }
        }
      })
    ])

    revalidateSalaryPages()

    return { success: true, message: context.translations.messages.deleted }
  } catch {
    return { success: false, code: 'SALARY_DELETE_FAILED', error: context.translations.messages.operationFailed }
  }
}
