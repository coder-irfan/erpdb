import { maxLength, nonEmpty, object, optional, picklist, pipe, regex, string, trim } from 'valibot'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const NUMBER_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/
const QUANTITY_PATTERN = /^[1-9]\d*$/

export const createFinanceExpenseSchema = customMessages => {
  const messages = {
    required: 'This field is required.',
    detailsTooLong: 'Expense details must not exceed 5,000 characters.',
    quantityInvalid: 'Enter a whole quantity greater than zero.',
    numberInvalid: 'Enter a valid non-negative number.',
    positiveInvalid: 'Enter a value greater than zero.',
    dateInvalid: 'Enter a valid expense date.',
    ...customMessages
  }

  return object({
    details: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(5000, messages.detailsTooLong)),
    expense_type_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    project_id: optional(pipe(string(), trim()), ''),
    spent_by_id: optional(pipe(string(), trim()), ''),
    payment_method_id: optional(pipe(string(), trim()), ''),
    expense_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    quantity: pipe(string(messages.quantityInvalid), trim(), regex(QUANTITY_PATTERN, messages.quantityInvalid)),
    unit_price: pipe(string(messages.positiveInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)),
    currency: picklist(['AFN', 'USD'], messages.required),
    exchange_rate: pipe(string(messages.positiveInvalid), trim(), regex(NUMBER_PATTERN, messages.positiveInvalid)),
    receipt_url: optional(pipe(string(), trim()), '')
  })
}
