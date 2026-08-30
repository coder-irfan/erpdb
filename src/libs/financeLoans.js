import 'server-only'

import sanitizeHtml from 'sanitize-html'

import { Prisma } from '@prisma/client'

import { getCompanySetupRecord } from '@/libs/companySetup'
import { ACTIVE_LOAN_STATUSES } from '@/libs/financialStatuses'
import { prisma } from '@/libs/prisma'
import { nextSequentialNumber } from '@/libs/sequentialNumbers'
import { toUtcDateOnly } from '@/utils/contractDuration'
import { SYSTEM_BASE_CURRENCY, convertAfnToUsd, convertToBaseCurrency, normalizeToAfn, toFiniteNumber } from '@/utils/formatCurrency'
import { formatLedgerText } from '@/utils/ledgerDisplay'
import { calculateAmortizationSchedule } from '@/utils/loanCalculations'

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
  lender_type: true,
  loan_number: true,
  total_amount: true,
  monthly_deduction: true,
  repaid_amount: true,
  remaining_balance: true,
  status_id: true,
  issue_date: true,
  repayment_start_date: true,
  auto_deduct: true,
  annual_interest_rate: true,
  tenure_months: true,
  disbursement_bank_account: true,
  reason: true,
  approved_by_id: true,
  created_at: true,
  updated_at: true,
  amount_base: true,
  currency: true,
  exchange_rate: true,
  fx_snapshot_at: true,
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
      fx_snapshot_at: true,
      amount_base: true,
      notes: true,
      created_at: true,
      payment_method: { select: optionSelect }
    },
    orderBy: [{ repayment_date: 'desc' }, { created_at: 'desc' }],
    take: 100
  },
  repayment_schedule: {
    orderBy: { installment_number: 'asc' }
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
  amount_usd: numberString(convertAfnToUsd(loan.amount_base, loan.exchange_rate)),
  monthly_deduction_usd: numberString(convertAfnToUsd(normalizeToAfn(loan.monthly_deduction, loan.currency, loan.exchange_rate), loan.exchange_rate)),
  repaid_amount_usd: numberString(convertAfnToUsd(normalizeToAfn(loan.repaid_amount, loan.currency, loan.exchange_rate), loan.exchange_rate)),
  remaining_balance_usd: numberString(convertAfnToUsd(normalizeToAfn(loan.remaining_balance, loan.currency, loan.exchange_rate), loan.exchange_rate)),
  exchange_rate: numberString(loan.exchange_rate, 4),
  annual_interest_rate: numberString(loan.annual_interest_rate, 4),
  fx_snapshot_at: iso(loan.fx_snapshot_at),
  issue_date: iso(loan.issue_date),
  repayment_start_date: iso(loan.repayment_start_date),
  created_at: iso(loan.created_at),
  updated_at: iso(loan.updated_at),
  staff: normalizeStaff(loan.staff),
  approved_by: normalizeStaff(loan.approved_by),
  repayment_schedule: (loan.repayment_schedule || []).map(item => ({
    ...item,
    due_date: iso(item.due_date),
    paid_at: iso(item.paid_at),
    created_at: iso(item.created_at),
    opening_principal: numberString(item.opening_principal),
    principal_amount: numberString(item.principal_amount),
    interest_amount: numberString(item.interest_amount),
    payment_amount: numberString(item.payment_amount),
    remaining_principal: numberString(item.remaining_principal)
  })),
  repayments: (loan.repayments || []).map(repayment => ({
    ...repayment,
    amount: numberString(repayment.amount),
    amount_base: numberString(repayment.amount_base),
    exchange_rate: numberString(repayment.exchange_rate, 4),
    fx_snapshot_at: iso(repayment.fx_snapshot_at),
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
  lender_type: payload?.lender_type || 'BANK',
  total_amount: String(payload?.total_amount ?? ''),
  monthly_deduction: String(payload?.monthly_deduction || '1'),
  currency: payload?.currency || SYSTEM_BASE_CURRENCY,
  exchange_rate: String(payload?.exchange_rate || setup.usd_afn_exchange_rate || ''),
  issue_date: payload?.issue_date || '',
  repayment_start_date: payload?.repayment_start_date || payload?.issue_date || '',
  auto_deduct: Boolean(payload?.auto_deduct),
  annual_interest_rate: String(payload?.annual_interest_rate ?? '0'),
  tenure_months: String(payload?.tenure_months ?? '1'),
  disbursement_bank_account: payload?.disbursement_bank_account || '',
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
  const annualInterestRate = toFiniteNumber(values.annual_interest_rate)
  const tenureMonths = Math.trunc(toFiniteNumber(values.tenure_months))

  if (values.loan_type === 'STAFF' && monthlyDeduction > totalAmount) return { success: false, error: messages.monthlyTooHigh }

  const issueDate = toUtcDateOnly(values.issue_date)
  const repaymentStartDate = toUtcDateOnly(values.repayment_start_date || values.issue_date)

  if (!issueDate || !repaymentStartDate || exchangeRate <= 0 || annualInterestRate < 0 || tenureMonths < 1) return { success: false, error: messages.rateInvalid }

  const schedule = values.loan_type === 'CORPORATE'
    ? calculateAmortizationSchedule({ principal: totalAmount, annualInterestRate, tenureMonths, issueDate })
    : []

  const scheduledMonthlyPayment = schedule[0]?.payment_amount || monthlyDeduction

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
      lender_type: values.loan_type === 'CORPORATE' ? values.lender_type : null,
      total_amount: new Prisma.Decimal(totalAmount),
      monthly_deduction: new Prisma.Decimal(scheduledMonthlyPayment),
      repaid_amount: new Prisma.Decimal(repaidAmount),
      remaining_balance: new Prisma.Decimal(remainingBalance),
      issue_date: issueDate,
      repayment_start_date: repaymentStartDate,
      auto_deduct: values.loan_type === 'STAFF' && values.auto_deduct,
      annual_interest_rate: new Prisma.Decimal(values.loan_type === 'CORPORATE' ? annualInterestRate : 0),
      tenure_months: values.loan_type === 'CORPORATE' ? tenureMonths : null,
      disbursement_bank_account: values.loan_type === 'CORPORATE' ? cleanLoanText(values.disbursement_bank_account) || null : null,
      reason: cleanLoanText(values.reason) || null,
      amount_base: new Prisma.Decimal(
        convertToBaseCurrency(totalAmount, values.currency, effectiveExchangeRate, SYSTEM_BASE_CURRENCY)
      ),
      currency: values.currency,
      exchange_rate: new Prisma.Decimal(effectiveExchangeRate)
    },
    schedule
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
      total_amount: true,
      currency: true,
      exchange_rate: true,
      fx_snapshot_at: true,
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

  const shouldSnapshot = ['APPROVED', 'ACTIVE'].includes(nextStatusValue) && !loan.fx_snapshot_at

  const snapshotRate = shouldSnapshot ? toFiniteNumber(loan.exchange_rate) : null

  const snapshotAt = shouldSnapshot ? new Date() : null

  return transaction.financeloan.update({
    where: { id: loanId },
    data: {
      status_id: nextStatus.id,
      ...(shouldSnapshot
        ? {
            exchange_rate: new Prisma.Decimal(snapshotRate),
            amount_base: new Prisma.Decimal(normalizeToAfn(loan.total_amount, loan.currency, snapshotRate)),
            fx_snapshot_at: snapshotAt
          }
        : {}),
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
    baseCurrency = SYSTEM_BASE_CURRENCY,
    fxSnapshotRate = null,
    fxSnapshotAt = new Date()
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

  const postingRate = toFiniteNumber(fxSnapshotRate || loan.exchange_rate)

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
        fx_snapshot_at: loan.issue_date,
        amount_base: new Prisma.Decimal(
          normalizeToAfn(legacyAmount, loan.currency, loan.exchange_rate)
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
      exchange_rate: new Prisma.Decimal(postingRate),
      fx_snapshot_at: fxSnapshotAt,
      amount_base: new Prisma.Decimal(
        normalizeToAfn(appliedAmount, loan.currency, postingRate)
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

export const nextLoanNumber = async (client = prisma, loanType = 'STAFF') => {
  const year = new Date().getUTCFullYear()

  return nextSequentialNumber(client, 'loan', { prefix: `${loanType === 'CORPORATE' ? 'CLN' : 'SLN'}-${year}-`, digits: 3 })
}
