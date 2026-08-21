import { array, maxLength, nonEmpty, object, optional, pipe, regex, string, trim } from 'valibot'

const NUMBER_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/
const OPTIONAL_DATE_PATTERN = /^(?:|\d{4}-\d{2}-\d{2})$/

export const createTaskSchema = customMessages => {
  const messages = { required: 'This field is required.', titleTooLong: 'Title must not exceed 191 characters.', numberInvalid: 'Enter a valid non-negative number.', dateInvalid: 'Enter a valid date.', ...customMessages }

  return object({
    title: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(191, messages.titleTooLong)),
    project_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    description: optional(pipe(string(), trim()), ''),
    assignee_ids: optional(array(pipe(string(), trim(), nonEmpty(messages.required))), []),
    status_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    priority_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    estimated_hours: optional(pipe(string(messages.numberInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)), '0'),
    actual_hours: optional(pipe(string(messages.numberInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)), '0'),
    due_date: optional(pipe(string(messages.dateInvalid), trim(), regex(OPTIONAL_DATE_PATTERN, messages.dateInvalid)), '')
  })
}

export const logTaskHoursSchema = customMessages => {
  const messages = { positiveInvalid: 'Enter a number greater than zero.', ...customMessages }

  return object({ hours: pipe(string(messages.positiveInvalid), trim(), regex(/^(?:0*[1-9]\d*|0*\.\d*[1-9]\d*)$/, messages.positiveInvalid)) })
}
