import { maxLength, nonEmpty, object, pipe, regex, string, trim } from 'valibot'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const POSITIVE_NUMBER_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/

const defaults = {
  required: 'This field is required.',
  amountInvalid: 'Enter a valid amount greater than zero.',
  dateInvalid: 'Enter a valid date.',
  notesTooLong: 'Payment details are too long.'
}

export const createInvoiceSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    contract_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    client_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    amount: pipe(string(messages.amountInvalid), trim(), regex(POSITIVE_NUMBER_PATTERN, messages.amountInvalid)),
    currency: pipe(string(messages.required), trim(), regex(/^(AFN|USD)$/, messages.required)),
    exchange_rate: pipe(string(messages.amountInvalid), trim(), regex(POSITIVE_NUMBER_PATTERN, messages.amountInvalid)),
    issued_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    due_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    status_id: pipe(string(messages.required), trim(), nonEmpty(messages.required))
  })
}

export const recordInvoicePaymentSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    payment_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    amount: pipe(string(messages.amountInvalid), trim(), regex(POSITIVE_NUMBER_PATTERN, messages.amountInvalid)),
    payment_method_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    notes: pipe(string(), trim(), maxLength(1000, messages.notesTooLong))
  })
}
