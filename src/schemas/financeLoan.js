import { maxLength, nonEmpty, object, optional, picklist, pipe, regex, string, trim } from 'valibot'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const POSITIVE_MONEY_PATTERN = /^(?=.*[1-9])\d+(?:\.\d{1,2})?$/
const POSITIVE_RATE_PATTERN = /^(?=.*[1-9])\d+(?:\.\d{1,4})?$/

export const createFinanceLoanSchema = messages => object({
  loan_type: picklist(['STAFF', 'EXTERNAL', 'BANK'], messages.required),
  staff_id: optional(pipe(string(), trim()), ''),
  entity_name: optional(pipe(string(), trim()), ''),
  total_amount: pipe(string(messages.amountInvalid), trim(), regex(POSITIVE_MONEY_PATTERN, messages.amountInvalid)),
  monthly_deduction: pipe(string(messages.amountInvalid), trim(), regex(POSITIVE_MONEY_PATTERN, messages.amountInvalid)),
  currency: picklist(['AFN', 'USD'], messages.required),
  exchange_rate: pipe(string(messages.rateInvalid), trim(), regex(POSITIVE_RATE_PATTERN, messages.rateInvalid)),
  issue_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
  reason: optional(pipe(string(), trim(), maxLength(5000, messages.reasonTooLong)), '')
})

export const repayFinanceLoanSchema = messages => object({
  repayment_amount: pipe(string(messages.amountInvalid), trim(), nonEmpty(messages.amountInvalid), regex(POSITIVE_MONEY_PATTERN, messages.amountInvalid)),
  source: optional(picklist(['MANUAL', 'SALARY', 'MANUAL_CASH', 'MANUAL_BANK'], messages.required), 'MANUAL'),
  repayment_date: optional(pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)), ''),
  payment_method_id: optional(pipe(string(), trim()), ''),
  reference_id: optional(pipe(string(), trim(), maxLength(191, messages.reasonTooLong)), ''),
  notes: optional(pipe(string(), trim(), maxLength(2000, messages.reasonTooLong)), '')
})
