import 'server-only'

import sanitizeHtml from 'sanitize-html'

import { Prisma } from '@prisma/client'

import { getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { toUtcDateOnly } from '@/utils/contractDuration'
import { convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'

export const LOAN_READ_PERMISSIONS = ['finance:read', 'finance_loan:read']
export const LOAN_WRITE_PERMISSIONS = ['finance:write', 'finance_loan:write']
export const LOAN_DELETE_PERMISSIONS = ['finance:delete', 'finance_loan:delete']
export const ACTIVE_LOAN_VALUES = ['ACTIVE', 'APPROVED']

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
  status: { select: optionSelect }
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
  approved_by: normalizeStaff(loan.approved_by)
})

export const cleanLoanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()

export const ensureLoanStatuses = async () => {
  const statuses = [
    ['Active', 'ACTIVE', 'warning', 1, true],
    ['Approved', 'APPROVED', 'primary', 2, false],
    ['Closed', 'CLOSED', 'success', 3, false],
    ['Repaid', 'REPAID', 'success', 4, false],
    ['Cancelled', 'CANCELLED', 'secondary', 5, false]
  ]

  await prisma.$transaction(statuses.map(([label, value, colorCode, sortOrder, isDefault]) => prisma.option.upsert({
    where: { category_value: { category: 'LOAN_STATUS', value } },
    update: {},
    create: { category: 'LOAN_STATUS', label, value, color_code: colorCode, sort_order: sortOrder, is_default: isDefault, is_active: true }
  })))
}

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

export const prepareLoanData = async (values, messages, current = null) => {
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
      amount_base: new Prisma.Decimal(convertToBaseCurrency(totalAmount, values.currency, exchangeRate, 'USD')),
      currency: values.currency,
      exchange_rate: new Prisma.Decimal(exchangeRate)
    }
  }
}

export const getLoanSetup = getCompanySetupRecord

export const nextLoanNumber = async (client = prisma) => {
  const year = new Date().getUTCFullYear()
  const prefix = `LN-${year}-`
  const latest = await client.financeloan.findFirst({ where: { loan_number: { startsWith: prefix } }, select: { loan_number: true }, orderBy: { loan_number: 'desc' } })
  const sequence = Number.parseInt(latest?.loan_number.slice(prefix.length), 10) || 0

  return `${prefix}${String(sequence + 1).padStart(3, '0')}`
}
