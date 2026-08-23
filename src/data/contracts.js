export const CONTRACT_STATUSES = Object.freeze([
  Object.freeze({ label: 'Draft', value: 'DRAFT', color_code: 'secondary', sort_order: 1, is_default: true }),
  Object.freeze({ label: 'Active', value: 'ACTIVE', color_code: 'success', sort_order: 2, is_default: false }),
  Object.freeze({ label: 'Expired', value: 'EXPIRED', color_code: 'warning', sort_order: 3, is_default: false }),
  Object.freeze({ label: 'Terminated', value: 'TERMINATED', color_code: 'error', sort_order: 4, is_default: false })
])

export const CONTRACT_STATUS_VALUES = Object.freeze(CONTRACT_STATUSES.map(status => status.value))
