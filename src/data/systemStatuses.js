export const SYSTEM_STATUS_VALUES = Object.freeze({
  CONTRACT_STATUS: Object.freeze(['DRAFT', 'PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED']),
  INVOICE_STATUS: Object.freeze(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']),
  LEAVE_STATUS: Object.freeze(['PENDING', 'APPROVED', 'REJECTED']),
  PAYROLL_STATUS: Object.freeze(['DRAFT', 'PENDING', 'PAID']),
  LOAN_STATUS: Object.freeze(['REQUESTED', 'APPROVED', 'ACTIVE', 'REPAID', 'REJECTED']),
  INVENTORY_STATUS: Object.freeze(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']),
  PROJECT_STATUS: Object.freeze(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  LEAD_STATUS: Object.freeze(['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST']),
  TASK_STATUS: Object.freeze(['TO_DO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'])
})

export const SYSTEM_STATUS_CATEGORIES = Object.freeze(Object.keys(SYSTEM_STATUS_VALUES))

const systemStatusCategorySet = new Set(SYSTEM_STATUS_CATEGORIES)

export const isSystemStatusCategory = category => systemStatusCategorySet.has(category)

export const getSystemStatusValues = category => SYSTEM_STATUS_VALUES[category] || Object.freeze([])
