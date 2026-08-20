import { maxLength, nonEmpty, object, optional, picklist, pipe, regex, string, trim } from 'valibot'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const NUMBER_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/

export const createProjectSchema = customMessages => {
  const messages = {
    required: 'This field is required.',
    titleTooLong: 'Title must not exceed 191 characters.',
    numberInvalid: 'Enter a valid non-negative number.',
    positiveInvalid: 'Enter a value greater than zero.',
    dateInvalid: 'Enter a valid date.',
    ...customMessages
  }

  return object({
    title: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(191, messages.titleTooLong)),
    description: optional(pipe(string(), trim()), ''),
    client_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    contract_id: optional(pipe(string(), trim()), ''),
    project_manager_id: optional(pipe(string(), trim()), ''),
    status_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    priority_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    project_area: optional(pipe(string(), trim(), maxLength(191)), ''),
    project_sponsor: optional(pipe(string(), trim(), maxLength(191)), ''),
    estimated_hours: optional(pipe(string(messages.numberInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)), '0'),
    actual_hours: optional(pipe(string(messages.numberInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)), '0'),
    budget: pipe(string(messages.numberInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)),
    currency: picklist(['AFN', 'USD'], messages.required),
    exchange_rate: pipe(string(messages.positiveInvalid), trim(), regex(NUMBER_PATTERN, messages.positiveInvalid)),
    start_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    end_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    actual_end_date: optional(pipe(string(), trim()), '')
  })
}

