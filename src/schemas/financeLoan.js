import {
  boolean,
  check,
  forward,
  maxLength,
  nonEmpty,
  number,
  object,
  optional,
  picklist,
  pipe,
  regex,
  string,
  transform,
  union,
  trim
} from 'valibot'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const POSITIVE_MONEY_PATTERN = /^(?=.*[1-9])\d+(?:\.\d{1,2})?$/
const POSITIVE_RATE_PATTERN = /^(?=.*[1-9])\d+(?:\.\d{1,4})?$/
const NON_NEGATIVE_RATE_PATTERN = /^\d+(?:\.\d{1,4})?$/
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/

const positiveMoney = message =>
  pipe(
    union([string(message), number(message)]),
    transform(value => Number(value)),
    check(value => Number.isFinite(value) && value > 0, message),
    check(value => Number(value.toFixed(2)) === value, message)
  )

export const createFinanceLoanSchema = messages =>
  pipe(
    object({
      loan_type: picklist(['STAFF', 'CORPORATE'], messages.required),
      staff_id: optional(pipe(string(), trim()), ''),
      entity_name: optional(pipe(string(), trim()), ''),
      lender_type: optional(picklist(['BANK', 'EXTERNAL_BUSINESS', 'OWNER'], messages.required), 'BANK'),
      total_amount: positiveMoney(messages.amountInvalid),
      monthly_deduction: optional(positiveMoney(messages.amountInvalid), 1),
      currency: picklist(['AFN', 'USD'], messages.required),
      exchange_rate: pipe(string(messages.rateInvalid), trim(), regex(POSITIVE_RATE_PATTERN, messages.rateInvalid)),
      issue_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
      repayment_start_date: optional(
        pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
        ''
      ),
      auto_deduct: optional(boolean(), false),
      annual_interest_rate: optional(
        pipe(string(), trim(), regex(NON_NEGATIVE_RATE_PATTERN, messages.rateInvalid)),
        '0'
      ),
      tenure_months: optional(pipe(string(), trim(), regex(POSITIVE_INTEGER_PATTERN, messages.amountInvalid)), '1'),
      disbursement_bank_account: optional(pipe(string(), trim(), maxLength(500, messages.reasonTooLong)), ''),
      reason: optional(pipe(string(), trim(), maxLength(5000, messages.reasonTooLong)), '')
    }),
    forward(
      check(values => values.loan_type !== 'STAFF' || Boolean(values.staff_id), messages.required),
      ['staff_id']
    ),
    forward(
      check(values => values.loan_type !== 'CORPORATE' || Boolean(values.entity_name), messages.required),
      ['entity_name']
    )
  )

export const repayFinanceLoanSchema = messages =>
  object({
    repayment_amount: pipe(
      string(messages.amountInvalid),
      trim(),
      nonEmpty(messages.amountInvalid),
      regex(POSITIVE_MONEY_PATTERN, messages.amountInvalid)
    ),
    source: optional(picklist(['MANUAL', 'SALARY', 'MANUAL_CASH', 'MANUAL_BANK'], messages.required), 'MANUAL'),
    repayment_date: optional(pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)), ''),
    payment_method_id: optional(pipe(string(), trim()), ''),
    reference_id: optional(pipe(string(), trim(), maxLength(191, messages.reasonTooLong)), ''),
    notes: optional(pipe(string(), trim(), maxLength(2000, messages.reasonTooLong)), '')
  })
