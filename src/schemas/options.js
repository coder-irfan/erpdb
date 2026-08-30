import { boolean, maxLength, nonEmpty, object, optional, pipe, regex, string, trim } from 'valibot'

export const OPTION_CATEGORIES = [
  'CONTRACT_POLICY',
  'CONTRACT_CLAUSE',
  'CONTRACT_TYPE',
  'CONTRACT_TYPE_HRM',
  'CONTRACT_TYPE_CUSTOMER',
  'CONTRACT_TYPE_OTHER',
  'CONTRACT_DURATION',
  'CONTRACT_COUNTRY',
  'COUNTRY',
  'CONTRACT_LEVEL',
  'CONTRACT_STATUS',
  'INVOICE_STATUS',
  'PAYMENT_METHOD',
  'INCOME_TYPE',
  'EXPENSE_TYPE',
  'VISITOR_PURPOSE',
  'STAFF_POSITION',
  'LEAVE_TYPE',
  'PAYROLL_STATUS',
  'PAYROLL_PAYMENT_METHOD',
  'LEAD_STATUS',
  'LEAD_SOURCE'
]
export const OPTION_CATEGORY_PATTERN = /^[A-Z][A-Z0-9_]*$/
const LEAVE_ALLOWANCE_PATTERN = /^(?:\d{1,3})(?:\.5)?$/

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
    is_active: optional(boolean(messages.statusInvalid), true),
    requires_invoice: optional(boolean(), false),
    is_paid_leave: optional(boolean(), true),
    allowed_days_per_year: optional(pipe(string(), trim(), regex(LEAVE_ALLOWANCE_PATTERN, 'Enter yearly days in whole-day or half-day increments.')), '0')
  })
}

export const optionSchema = createOptionSchema(defaultMessages)
