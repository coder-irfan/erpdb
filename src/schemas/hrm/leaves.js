import { maxLength, nonEmpty, object, optional, pipe, regex, string, trim } from 'valibot'

export const LEAVE_DECISIONS = ['APPROVED', 'REJECTED']
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const defaults = {
  required: 'This field is required.',
  dateInvalid: 'Select a valid date.',
  reasonTooLong: 'The reason must not exceed 2,000 characters.'
}

export const createLeaveSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    staff_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    leave_type_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    start_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    end_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    status_id: optional(pipe(string(), trim()), ''),
    reason: optional(pipe(string(), trim(), maxLength(2000, messages.reasonTooLong)), '')
  })
}

export const leaveSchema = createLeaveSchema(defaults)
