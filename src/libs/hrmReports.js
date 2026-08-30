import { convertToBaseCurrency, toFiniteNumber } from '../utils/formatCurrency.js'

export const HRM_REPORT_BASE_CURRENCY = 'AFN'
export const LOW_PRESENCE_THRESHOLD = 80

export const toReportAfn = (amount, currency, exchangeRate) =>
  convertToBaseCurrency(amount, currency, exchangeRate, HRM_REPORT_BASE_CURRENCY)

export const normalizePayrollReportAmounts = record => {
  const baseSalary = toFiniteNumber(record.base_salary)
  const earnedSalary = toFiniteNumber(record.earned_salary)
  const allowances = toFiniteNumber(record.bonus_amount)
  const loanDeduction = toFiniteNumber(record.loan_deduction)
  const deductions = Math.max(0, baseSalary - earnedSalary) + loanDeduction
  const netPayout = toFiniteNumber(record.payable_amount)

  return {
    baseSalary: toReportAfn(baseSalary, record.currency, record.exchange_rate),
    allowances: toReportAfn(allowances, record.currency, record.exchange_rate),
    deductions: toReportAfn(deductions, record.currency, record.exchange_rate),
    netPayout: toReportAfn(netPayout, record.currency, record.exchange_rate),
    original: {
      baseSalary,
      allowances,
      deductions,
      netPayout,
      currency: record.currency,
      exchangeRate: toFiniteNumber(record.exchange_rate)
    }
  }
}

export const calculateReportPresenceRate = (presentDays, workingDays) =>
  workingDays > 0
    ? Number(((toFiniteNumber(presentDays) / toFiniteNumber(workingDays)) * 100).toFixed(2))
    : 0

export const getContractExpirationClassification = daysRemaining => {
  if (daysRemaining < 0) return { status: 'EXPIRED', count: Math.abs(daysRemaining) }
  if (daysRemaining <= 30) return { status: 'DUE_SOON', count: daysRemaining }

  return { status: 'UPCOMING', count: daysRemaining }
}
