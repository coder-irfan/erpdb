import {
  boolean,
  check,
  finite,
  literal,
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
  trim,
  union
} from 'valibot'

export const LEAVE_DECISIONS = ['APPROVED', 'REJECTED']
export const LEAVE_DURATION_TYPES = ['FULL_DAY', 'HALF_DAY']
export const HALF_DAY_SHIFTS = ['MORNING', 'AFTERNOON']
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const defaults = {
  required: 'This field is required.',
  dateInvalid: 'Select a valid date.',
  daysInvalid: 'Enter leave days in whole-day or half-day increments.',
  durationInvalid: 'Select a valid duration type.',
  shiftInvalid: 'Select Morning or Afternoon.',
  reasonTooLong: 'The reason must not exceed 2,000 characters.'
}

const isValidIncrement = value => {
  const numberValue = Number(value)

  return (
    Number.isFinite(numberValue) &&
    numberValue > 0 &&
    Math.abs(Math.round(numberValue * 2) - numberValue * 2) < 0.0001
  )
}

const durationDaysValue = messages =>
  pipe(
    union([
      number(messages.daysInvalid),
      pipe(
        string(messages.daysInvalid),
        trim(),
        nonEmpty(messages.daysInvalid),
        transform(value => Number(value))
      )
    ]),
    finite(messages.daysInvalid),
    check(isValidIncrement, messages.daysInvalid),
    transform(value => Math.round(value * 2) / 2)
  )

export const createLeaveSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    staff_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    leave_type_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    start_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    end_date: pipe(string(messages.dateInvalid), trim(), regex(DATE_PATTERN, messages.dateInvalid)),
    total_days: optional(union([literal(''), durationDaysValue(messages)]), ''),
    duration_type: optional(picklist(LEAVE_DURATION_TYPES, messages.durationInvalid), 'FULL_DAY'),
    half_day_shift: optional(union([literal(''), picklist(HALF_DAY_SHIFTS, messages.shiftInvalid)]), ''),
    status_id: optional(pipe(string(), trim()), ''),
    is_paid: optional(boolean(), true),
    reason: optional(pipe(string(), trim(), maxLength(2000, messages.reasonTooLong)), '')
  })
}

export const leaveSchema = createLeaveSchema(defaults)
