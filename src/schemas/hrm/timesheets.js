import { literal, maxLength, nonEmpty, object, optional, picklist, pipe, regex, string, trim, union } from 'valibot'

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LEAVE']
export const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const defaults = {
  required: 'This field is required.',
  statusInvalid: 'Select a valid attendance status.',
  dateInvalid: 'Select a valid attendance date.',
  timeInvalid: 'Enter a valid time.',
  notesTooLong: 'Notes must not exceed 2,000 characters.'
}

const optionalTime = messages =>
  optional(union([literal(''), pipe(string(messages.timeInvalid), trim(), regex(TIME_PATTERN, messages.timeInvalid))]), '')

export const createTimesheetSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    staff_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    status: picklist(ATTENDANCE_STATUSES, messages.statusInvalid),
    date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    check_in_time: optionalTime(messages),
    check_out_time: optionalTime(messages),
    notes: optional(pipe(string(), trim(), maxLength(2000, messages.notesTooLong)), '')
  })
}

export const updateTimesheetSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    status: picklist(ATTENDANCE_STATUSES, messages.statusInvalid),
    check_in_time: optionalTime(messages),
    check_out_time: optionalTime(messages),
    notes: optional(pipe(string(), trim(), maxLength(2000, messages.notesTooLong)), '')
  })
}
