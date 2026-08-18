import { email, maxLength, nonEmpty, object, optional, pipe, regex, string, trim } from 'valibot'

const STATUS_PATTERN = /^(ACTIVE|INACTIVE)$/

const defaults = {
  required: 'This field is required.',
  emailInvalid: 'Enter a valid email address.',
  statusInvalid: 'Select a valid client status.',
  tooLong: 'This value is too long.'
}

export const createClientSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    company_name: pipe(
      string(messages.required),
      trim(),
      nonEmpty(messages.required),
      maxLength(191, messages.tooLong)
    ),
    primary_contact_name: pipe(
      string(messages.required),
      trim(),
      nonEmpty(messages.required),
      maxLength(191, messages.tooLong)
    ),
    email: pipe(
      string(messages.required),
      trim(),
      nonEmpty(messages.required),
      email(messages.emailInvalid),
      maxLength(191, messages.tooLong)
    ),
    phone: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(50, messages.tooLong)),
    address: optional(pipe(string(), trim(), maxLength(5000, messages.tooLong)), ''),
    tax_number: optional(pipe(string(), trim(), maxLength(191, messages.tooLong)), ''),
    account_manager_id: optional(pipe(string(), trim()), ''),
    status: pipe(string(messages.statusInvalid), trim(), regex(STATUS_PATTERN, messages.statusInvalid)),
    notes: optional(pipe(string(), trim(), maxLength(10000, messages.tooLong)), '')
  })
}
