import { boolean, maxLength, nonEmpty, object, optional, picklist, pipe, regex, string, trim } from 'valibot'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const POSITIVE_NUMBER_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/

const defaults = {
  required: 'This field is required.',
  amountInvalid: 'Enter a valid amount greater than zero.',
  exchangeRateInvalid: 'Enter a valid exchange rate greater than zero.',
  dateInvalid: 'Enter a valid start date.',
  titleTooLong: 'The contract title must not exceed 191 characters.'
}

export const createContractSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    client_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    title: pipe(
      string(messages.required),
      trim(),
      nonEmpty(messages.required),
      maxLength(191, messages.titleTooLong)
    ),
    contract_type_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    contract_duration: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    total_amount: pipe(
      string(messages.amountInvalid),
      trim(),
      regex(POSITIVE_NUMBER_PATTERN, messages.amountInvalid)
    ),
    currency: picklist(['AFN', 'USD'], messages.required),
    exchange_rate: pipe(
      string(messages.exchangeRateInvalid),
      trim(),
      regex(POSITIVE_NUMBER_PATTERN, messages.exchangeRateInvalid)
    ),
    start_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    status_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    country_id: optional(pipe(string(), trim()), ''),
    level_id: optional(pipe(string(), trim()), ''),
    account_manager_id: optional(pipe(string(), trim()), ''),
    auto_renew: optional(boolean(), false)
  })
}
