const freezeOptions = options => Object.freeze(options.map(option => Object.freeze(option)))

export const SYSTEM_INVOICE_STATUS_OPTIONS = freezeOptions([
  { label: 'Unpaid', value: 'UNPAID', color_code: 'warning', sort_order: 1, is_default: true },
  { label: 'Partially Paid', value: 'PARTIALLY_PAID', color_code: 'info', sort_order: 2, is_default: false },
  { label: 'Paid', value: 'PAID', color_code: 'success', sort_order: 3, is_default: false },
  { label: 'Cancelled', value: 'CANCELLED', color_code: 'secondary', sort_order: 4, is_default: false }
])

export const SYSTEM_PAYMENT_METHOD_OPTIONS = freezeOptions([
  { label: 'Cash', value: 'CASH', sort_order: 1, is_default: true },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', sort_order: 2, is_default: false },
  { label: 'Card', value: 'CARD', sort_order: 3, is_default: false },
  { label: 'Cheque', value: 'CHEQUE', sort_order: 4, is_default: false }
])

export const SYSTEM_CONTRACT_PAYMENT_INCOME_OPTION = Object.freeze({
  label: 'Contract Payment',
  value: 'CONTRACT_PAYMENT',
  color_code: 'success',
  sort_order: 1,
  is_default: true,
  requires_invoice: true
})

export const SYSTEM_OPTION_DEFINITIONS = Object.freeze({
  INVOICE_STATUS: SYSTEM_INVOICE_STATUS_OPTIONS,
  PAYMENT_METHOD: SYSTEM_PAYMENT_METHOD_OPTIONS,
  INCOME_TYPE: Object.freeze([SYSTEM_CONTRACT_PAYMENT_INCOME_OPTION])
})

export const getSystemOptionDefinition = (category, value) =>
  SYSTEM_OPTION_DEFINITIONS[category]?.find(option => option.value === value) || null
