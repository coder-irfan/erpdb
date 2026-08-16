import { maxLength, nonEmpty, object, optional, pipe, regex, string, trim } from 'valibot'

const EMAIL_PATTERN = /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/

const defaults = {
  required: 'This field is required.',
  emailInvalid: 'Enter a valid email address.',
  tooLong: 'This value is too long.'
}

export const createVisitorSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    full_name: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(191, messages.tooLong)),
    phone: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(50, messages.tooLong)),
    email: optional(pipe(string(), trim(), regex(EMAIL_PATTERN, messages.emailInvalid), maxLength(191, messages.tooLong)), ''),
    company_name: optional(pipe(string(), trim(), maxLength(191, messages.tooLong)), ''),
    purpose: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(500, messages.tooLong)),
    host_staff_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    notes: optional(pipe(string(), trim(), maxLength(10000, messages.tooLong)), '')
  })
}

