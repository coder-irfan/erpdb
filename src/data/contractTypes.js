export const CONTRACT_TYPE_DOMAINS = {
  HRM: 'CONTRACT_TYPE_HRM',
  CUSTOMER: 'CONTRACT_TYPE_CUSTOMER',
  OTHERS: 'CONTRACT_TYPE_OTHER'
}

export const CONTRACT_TYPE_CATEGORIES = Object.values(CONTRACT_TYPE_DOMAINS)

export const DEFAULT_CONTRACT_TYPES = {
  [CONTRACT_TYPE_DOMAINS.HRM]: ['Employment', 'Contractor', 'Internship', 'Hybrid'],
  [CONTRACT_TYPE_DOMAINS.CUSTOMER]: ['SLA', 'Fixed-Price', 'Retainer', 'NDA', 'Payment Schedule', 'Installment Agreement', 'Settlement'],
  [CONTRACT_TYPE_DOMAINS.OTHERS]: ['Vendor Supply', 'Office Lease', 'External NDA']
}

export const getContractTypeDomain = category =>
  Object.entries(CONTRACT_TYPE_DOMAINS).find(([, optionCategory]) => optionCategory === category)?.[0] || 'CUSTOMER'
