import { literal, maxLength, nonEmpty, object, optional, picklist, pipe, regex, string, trim, union } from 'valibot'

const NUMBER_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const createFinanceIncomeSchema = customMessages => {
  const messages = {
    required: 'This field is required.',
    nameTooLong: 'Name must not exceed 191 characters.',
    numberInvalid: 'Enter a valid non-negative number.',
    positiveInvalid: 'Enter a value greater than zero.',
    dateInvalid: 'Enter a valid reminder date.',
    detailsTooLong: 'Payment details must not exceed 2,000 characters.',
    ...customMessages
  }

  return object({
    name: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(191, messages.nameTooLong)),
    client_id: optional(pipe(string(), trim()), ''),
    project_id: optional(pipe(string(), trim()), ''),
    contract_id: optional(pipe(string(), trim()), ''),
    invoice_id: optional(pipe(string(), trim()), ''),
    income_type_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    total_amount: pipe(string(messages.positiveInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)),
    paid_amount: pipe(string(messages.numberInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)),
    currency: picklist(['AFN', 'USD'], messages.required),
    exchange_rate: pipe(string(messages.positiveInvalid), trim(), regex(NUMBER_PATTERN, messages.positiveInvalid)),
    received_by_id: optional(pipe(string(), trim()), ''),
    payment_method_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    payment_date: pipe(string(messages.required), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    notes: optional(pipe(string(), trim(), maxLength(2000, messages.detailsTooLong)), ''),
    pay_details: optional(pipe(string(), trim(), maxLength(2000, messages.detailsTooLong)), ''),
    remind_date: optional(union([literal(''), pipe(string(), trim(), regex(DATE_PATTERN, messages.dateInvalid))]), '')
  })
}
