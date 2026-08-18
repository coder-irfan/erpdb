import {
  boolean,
  email,
  maxLength,
  minValue,
  nonEmpty,
  number,
  object,
  optional,
  picklist,
  pipe,
  regex,
  string,
  trim
} from 'valibot'

const DATE_TIME_PATTERN = /^$|^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

const defaults = {
  required: 'This field is required.',
  emailInvalid: 'Enter a valid email address.',
  valueInvalid: 'Enter a valid estimated value.',
  dateInvalid: 'Enter a valid follow-up date.',
  tooLong: 'This value is too long.'
}

export const createLeadSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    title: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(191, messages.tooLong)),
    contact_name: pipe(
      string(messages.required),
      trim(),
      nonEmpty(messages.required),
      maxLength(191, messages.tooLong)
    ),
    company_name: optional(pipe(string(), trim(), maxLength(191, messages.tooLong)), ''),
    email: pipe(
      string(messages.required),
      trim(),
      nonEmpty(messages.required),
      email(messages.emailInvalid),
      maxLength(191, messages.tooLong)
    ),
    phone: optional(pipe(string(), trim(), maxLength(50, messages.tooLong)), ''),
    source_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    status_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    assigned_to_id: optional(pipe(string(), trim()), ''),
    estimated_value: optional(pipe(number(messages.valueInvalid), minValue(0, messages.valueInvalid)), 0),
    currency: picklist(['AFN', 'USD'], messages.required),
    next_follow_up_date: optional(
      pipe(string(messages.dateInvalid), trim(), regex(DATE_TIME_PATTERN, messages.dateInvalid)),
      ''
    ),
    notes: optional(pipe(string(), trim(), maxLength(10000, messages.tooLong)), '')
  })
}

export const createActivitySchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    activity_type: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    title: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(191, messages.tooLong)),
    description: optional(pipe(string(), trim(), maxLength(10000, messages.tooLong)), ''),
    due_date: optional(pipe(string(messages.dateInvalid), trim(), regex(DATE_TIME_PATTERN, messages.dateInvalid)), ''),
    is_completed: optional(boolean(), false)
  })
}
