import { boolean, maxLength, nonEmpty, object, optional, pipe, regex, string, trim } from 'valibot'

export const OPTION_CATEGORIES = ['CONTRACT_POLICY', 'STAFF_POSITION', 'LEAVE_TYPE']
export const OPTION_CATEGORY_PATTERN = /^[A-Z][A-Z0-9_]*$/

const defaultMessages = {
  required: 'This field is required.',
  nameTooLong: 'The title must not exceed 191 characters.',
  descriptionTooLong: 'The description is too long.',
  categoryInvalid: 'Select a valid option category.',
  statusInvalid: 'Select a valid status.'
}

export const createOptionSchema = customMessages => {
  const messages = { ...defaultMessages, ...customMessages }

  return object({
    name: pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(191, messages.nameTooLong)),
    category: pipe(string(messages.categoryInvalid), trim(), regex(OPTION_CATEGORY_PATTERN, messages.categoryInvalid)),
    description: optional(pipe(string(), trim(), maxLength(65000, messages.descriptionTooLong)), ''),
    is_active: optional(boolean(messages.statusInvalid), true)
  })
}

export const optionSchema = createOptionSchema(defaultMessages)
