import 'server-only'

import sanitizeHtml from 'sanitize-html'

import { Prisma } from '@prisma/client'

import { getCompanySetupRecord } from '@/libs/companySetup'
import { ACTIVE_LOAN_STATUSES } from '@/libs/financialStatuses'
import { prisma } from '@/libs/prisma'
import { nextSequentialNumber } from '@/libs/sequentialNumbers'
import { toUtcDateOnly } from '@/utils/contractDuration'
import { convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'
import { formatLedgerText } from '@/utils/ledgerDisplay'

export const LOAN_READ_PERMISSIONS = ['finance:read', 'finance_loan:read']
export const LOAN_WRITE_PERMISSIONS = ['finance:write', 'finance_loan:write']
export const LOAN_DELETE_PERMISSIONS = ['finance:delete', 'finance_loan:delete']
export const ACTIVE_LOAN_VALUES = ACTIVE_LOAN_STATUSES
export const LOAN_STATUS_VALUES = ['REQUESTED', 'APPROVED', 'ACTIVE', 'REPAID', 'REJECTED']
export const LOAN_REPAYMENT_SOURCES = ['SALARY_DEDUCTION', 'MANUAL_CASH', 'MANUAL_BANK', 'LEGACY_MIGRATION']

const LOAN_TRANSITIONS = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['ACTIVE', 'REJECTED'],
  ACTIVE: [],
  REPAID: [],
  REJECTED: []
}

export class LoanLedgerError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'LoanLedgerError'
    this.code = code
  }
}

export const optionSelect = { id: true, label: true, value: true, color_code: true, is_default: true, is_active: true }
export const staffSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  position: true,
  user: { select: { image: true } }
}

export const loanSelect = {
  id: true,
  staff_id: true,
  loan_type: true,
  entity_name: true,
  loan_number: true,
  total_amount: true,
  monthly_deduction: true,
  repaid_amount: true,
  remaining_balance: true,
  status_id: true,
  issue_date: true,
  reason: true,
  approved_by_id: true,
  created_at: true,
  updated_at: true,
  amount_base: true,
  currency: true,
  exchange_rate: true,
  staff: { select: staffSelect },
  approved_by: { select: staffSelect },
  status: { select: optionSelect },
  repayments: {
    select: {
      id: true,
      amount: true,
      repayment_date: true,
      source: true,
      reference_id: true,
      currency: true,
      exchange_rate: true,
      amount_base: true,
      notes: true,
      created_at: true,
      payment_method: { select: optionSelect }
    },
    orderBy: [{ repayment_date: 'desc' }, { created_at: 'desc' }],
    take: 100
  }
}

const iso = value => value?.toISOString() || null
const numberString = (value, scale = 2) => value == null ? null : toFiniteNumber(value).toFixed(scale)
const fullName = staff => `${staff?.first_name || ''} ${staff?.last_name || ''}`.trim()
const normalizeStaff = staff => staff ? { ...staff, full_name: fullName(staff) } : null

export const normalizeLoan = loan => ({
  ...loan,
  total_amount: numberString(loan.total_amount),
  monthly_deduction: numberString(loan.monthly_deduction),
  repaid_amount: numberString(loan.repaid_amount),
  remaining_balance: numberString(loan.remaining_balance),
  amount_base: numberString(loan.amount_base),
  exchange_rate: numberString(loan.exchange_rate, 4),
  issue_date: iso(loan.issue_date),
  created_at: iso(loan.created_at),
  updated_at: iso(loan.updated_at),
  staff: normalizeStaff(loan.staff),
  approved_by: normalizeStaff(loan.approved_by),
  repayments: (loan.repayments || []).map(repayment => ({
    ...repayment,
    amount: numberString(repayment.amount),
    amount_base: numberString(repayment.amount_base),
    exchange_rate: numberString(repayment.exchange_rate, 4),
    repayment_date: iso(repayment.repayment_date),
    created_at: iso(repayment.created_at),
    notes: formatLedgerText(repayment.notes)
  }))
})

export const cleanLoanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()

export const loanPayload = (payload, setup) => ({
  loan_type: payload?.loan_type || 'STAFF',
  staff_id: payload?.staff_id || '',
  entity_name: payload?.entity_name || '',
  total_amount: String(payload?.total_amount ?? ''),
  monthly_deduction: String(payload?.monthly_deduction ?? ''),
  currency: payload?.currency || setup.currency_code || 'AFN',
  exchange_rate: String(payload?.exchange_rate || setup.usd_afn_exchange_rate || ''),
  issue_date: payload?.issue_date || '',
  reason: payload?.reason || ''
})

export const prepareLoanData = async (values, messages, setup, current = null) => {
  const staffId = values.loan_type === 'STAFF' ? values.staff_id : ''
  const entityName = values.loan_type === 'STAFF' ? '' : cleanLoanText(values.entity_name)

  if (values.loan_type === 'STAFF' && !staffId) return { success: false, error: messages.staffRequired }
  if (values.loan_type !== 'STAFF' && !entityName) return { success: false, error: messages.entityRequired }

  const staff = staffId ? await prisma.hrmstaff.findFirst({ where: { id: staffId, status: { not: 'TERMINATED' } }, select: { id: true } }) : null

  if (staffId && !staff) return { success: false, error: messages.staffRequired }

  const totalAmount = toFiniteNumber(values.total_amount)
  const monthlyDeduction = toFiniteNumber(values.monthly_deduction)
  const exchangeRate = toFiniteNumber(values.exchange_rate)

  if (monthlyDeduction > totalAmount) return { success: false, error: messages.monthlyTooHigh }

  const issueDate = toUtcDateOnly(values.issue_date)

  if (!issueDate || exchangeRate <= 0) return { success: false, error: messages.rateInvalid }

  const repaidAmount = current ? toFiniteNumber(current.repaid_amount) : 0

  if (
    current &&
    repaidAmount > 0.005 &&
    (Math.abs(totalAmount - toFiniteNumber(current.total_amount)) > 0.005 || values.currency !== current.currency)
  ) {
    return { success: false, error: messages.repaymentLocked || messages.amountInvalid }
  }

  if (totalAmount + 0.005 < repaidAmount) return { success: false, error: messages.amountInvalid }

  // Preserve the locked rate for an already-posted currency, but use the
  // validated rate supplied for a new loan (or a pre-repayment currency change).
  // Falling back to the setup rate here silently discarded the entered quote.
  const effectiveExchangeRate =
    current && current.currency === values.currency
      ? toFiniteNumber(current.exchange_rate)
      : exchangeRate

  const remainingBalance = Math.max(0, totalAmount - repaidAmount)

  return {
    success: true,
    data: {
      staff_id: staffId || null,
      loan_type: values.loan_type,
      entity_name: entityName || null,
      total_amount: new Prisma.Decimal(totalAmount),
      monthly_deduction: new Prisma.Decimal(monthlyDeduction),
      repaid_amount: new Prisma.Decimal(repaidAmount),
      remaining_balance: new Prisma.Decimal(remainingBalance),
      issue_date: issueDate,
      reason: cleanLoanText(values.reason) || null,
      amount_base: new Prisma.Decimal(
        convertToBaseCurrency(totalAmount, values.currency, effectiveExchangeRate, setup.currency_code || 'AFN')
      ),
      currency: values.currency,
      exchange_rate: new Prisma.Decimal(effectiveExchangeRate)
    }
  }
}

export const applyLoanStatusTransition = async (
  transaction,
  { loanId, nextStatusValue, approvedById = null }
) => {
  const loan = await transaction.financeloan.findUnique({
    where: { id: loanId },
    select: {
      id: true,
      remaining_balance: true,
      status: { select: { value: true } }
    }
  })

  if (!loan) throw new LoanLedgerError('LOAN_NOT_FOUND', 'Loan not found.')

  const currentStatus = loan.status.value

  if (!LOAN_STATUS_VALUES.includes(nextStatusValue)) {
    throw new LoanLedgerError('INVALID_LOAN_STATUS', 'Invalid loan status.')
  }

  if (currentStatus === nextStatusValue) return loan

  if (nextStatusValue === 'REPAID') {
    if (toFiniteNumber(loan.remaining_balance) > 0.005) {
      throw new LoanLedgerError('LOAN_BALANCE_REMAINING', 'A loan with an outstanding balance cannot be marked repaid.')
    }
  } else if (!(LOAN_TRANSITIONS[currentStatus] || []).includes(nextStatusValue)) {
    throw new LoanLedgerError('INVALID_LOAN_TRANSITION', `Cannot move a loan from ${currentStatus} to ${nextStatusValue}.`)
  }

  const nextStatus = await transaction.option.findUnique({
    where: { category_value: { category: 'LOAN_STATUS', value: nextStatusValue } },
    select: { id: true }
  })

  if (!nextStatus) throw new LoanLedgerError('LOAN_STATUS_NOT_CONFIGURED', 'Loan statuses are not configured.')

  return transaction.financeloan.update({
    where: { id: loanId },
    data: {
      status_id: nextStatus.id,
      ...(nextStatusValue === 'APPROVED' ? { approved_by_id: approvedById } : {})
    },
    select: loanSelect
  })
}

export const applyLoanRepayment = async (
  transaction,
  {
    loanId,
    amount,
    source,
    repaymentDate,
    paymentMethodId = null,
    referenceId = null,
    createdByUserId = null,
    notes = null,
    baseCurrency = 'AFN'
  }
) => {
  if (!LOAN_REPAYMENT_SOURCES.includes(source)) {
    throw new LoanLedgerError('INVALID_REPAYMENT_SOURCE', 'Invalid loan repayment source.')
  }

  const loan = await transaction.financeloan.findUnique({
    where: { id: loanId },
    select: {
      id: true,
      total_amount: true,
      repaid_amount: true,
      remaining_balance: true,
      issue_date: true,
      currency: true,
      exchange_rate: true,
      status: { select: { value: true } }
    }
  })

  if (!loan) throw new LoanLedgerError('LOAN_NOT_FOUND', 'Loan not found.')

  if (loan.status.value !== 'ACTIVE') {
    throw new LoanLedgerError('LOAN_NOT_ACTIVE', 'Only active loans can receive repayments.')
  }

  if (paymentMethodId) {
    const paymentMethod = await transaction.option.findFirst({
      where: { id: paymentMethodId, category: 'PAYMENT_METHOD', is_active: true },
      select: { id: true }
    })

    if (!paymentMethod) throw new LoanLedgerError('INVALID_PAYMENT_METHOD', 'Invalid repayment payment method.')
  }

  const ledgerTotal = await transaction.loanrepayment.aggregate({
    where: { loan_id: loan.id },
    _sum: { amount: true }
  })

  let authoritativeRepaid = toFiniteNumber(ledgerTotal._sum.amount)
  const legacyRepaid = toFiniteNumber(loan.repaid_amount)

  if (legacyRepaid - authoritativeRepaid > 0.005) {
    const legacyAmount = legacyRepaid - authoritativeRepaid

    await transaction.loanrepayment.create({
      data: {
        loan_id: loan.id,
        amount: new Prisma.Decimal(legacyAmount),
        repayment_date: loan.issue_date,
        source: 'LEGACY_MIGRATION',
        reference_id: `legacy-${loan.id}`,
        currency: loan.currency,
        exchange_rate: loan.exchange_rate,
        amount_base: new Prisma.Decimal(
          convertToBaseCurrency(legacyAmount, loan.currency, loan.exchange_rate, baseCurrency)
        ),
        notes: 'Opening repayment balance migrated from the legacy aggregate.'
      }
    })
    authoritativeRepaid = legacyRepaid
  }

  const totalAmount = toFiniteNumber(loan.total_amount)
  const outstanding = Math.max(0, totalAmount - authoritativeRepaid)
  const requestedAmount = Number(toFiniteNumber(amount).toFixed(2))

  if (outstanding <= 0.005) throw new LoanLedgerError('LOAN_ALREADY_REPAID', 'The loan is already repaid.')
  if (requestedAmount <= 0) throw new LoanLedgerError('INVALID_REPAYMENT_AMOUNT', 'Repayment amount must be positive.')

  if (!repaymentDate || Number.isNaN(repaymentDate.getTime()) || repaymentDate < loan.issue_date) {
    throw new LoanLedgerError('INVALID_REPAYMENT_DATE', 'Repayment date cannot be before the loan issue date.')
  }

  if (requestedAmount - outstanding > 0.005) {
    throw new LoanLedgerError('LOAN_OVERPAYMENT', 'Repayment exceeds the outstanding loan balance.')
  }

  const appliedAmount = Math.min(requestedAmount, outstanding)
  const nextRepaid = Math.min(totalAmount, authoritativeRepaid + appliedAmount)
  const nextRemaining = Math.max(0, totalAmount - nextRepaid)

  const repaidStatus =
    nextRemaining <= 0.005
      ? await transaction.option.findUnique({
          where: { category_value: { category: 'LOAN_STATUS', value: 'REPAID' } },
          select: { id: true }
        })
      : null

  if (nextRemaining <= 0.005 && !repaidStatus) {
    throw new LoanLedgerError('LOAN_STATUS_NOT_CONFIGURED', 'Repaid loan status is not configured.')
  }

  const repayment = await transaction.loanrepayment.create({
    data: {
      loan_id: loan.id,
      amount: new Prisma.Decimal(appliedAmount),
      repayment_date: repaymentDate,
      payment_method_id: paymentMethodId,
      source,
      reference_id: referenceId,
      currency: loan.currency,
      exchange_rate: loan.exchange_rate,
      amount_base: new Prisma.Decimal(
        convertToBaseCurrency(appliedAmount, loan.currency, loan.exchange_rate, baseCurrency)
      ),
      created_by_user_id: createdByUserId,
      notes: cleanLoanText(notes) || null
    }
  })

  const updatedLoan = await transaction.financeloan.update({
    where: { id: loan.id },
    data: {
      repaid_amount: new Prisma.Decimal(nextRepaid),
      remaining_balance: new Prisma.Decimal(nextRemaining),
      ...(repaidStatus ? { status_id: repaidStatus.id } : {})
    },
    select: loanSelect
  })

  return { loan: updatedLoan, repayment, appliedAmount, remainingBalance: nextRemaining }
}

export const getLoanSetup = getCompanySetupRecord

export const nextLoanNumber = async (client = prisma) => {
  const year = new Date().getUTCFullYear()

  return nextSequentialNumber(client, 'loan', { prefix: `LN-${year}-`, digits: 3 })
}
