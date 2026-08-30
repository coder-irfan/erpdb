import { boolean, maxLength, nonEmpty, object, optional, pipe, regex, string, trim } from 'valibot'

export const LEAVE_DECISIONS = ['APPROVED', 'REJECTED']
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const LEAVE_DAYS_PATTERN = /^(?:[1-9]\d*|0\.5|[1-9]\d*\.5)$/

const defaults = {
  required: 'This field is required.',
  dateInvalid: 'Select a valid date.',
  daysInvalid: 'Enter leave days in whole-day or half-day increments.',
  reasonTooLong: 'The reason must not exceed 2,000 characters.'
}

export const createLeaveSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    staff_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    leave_type_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    start_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    end_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    total_days: optional(pipe(string(messages.daysInvalid), trim(), regex(LEAVE_DAYS_PATTERN, messages.daysInvalid)), ''),
    status_id: optional(pipe(string(), trim()), ''),
    is_paid: optional(boolean(), true),
    reason: optional(pipe(string(), trim(), maxLength(2000, messages.reasonTooLong)), '')
  })
}

export const leaveSchema = createLeaveSchema(defaults)
