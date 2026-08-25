import 'server-only'

import { toFiniteNumber } from '@/utils/formatCurrency'

export const CENT_TOLERANCE = 0.005
export const ACTIVE_OPERATIONAL_STATUSES = Object.freeze(['ACTIVE', 'IN_PROGRESS'])
export const ACTIVE_LOAN_STATUSES = Object.freeze(['ACTIVE'])
export const CLOSED_LOAN_STATUSES = Object.freeze(['REPAID', 'REJECTED', 'CLOSED', 'CANCELLED'])

export const deriveSettlementStatus = (total, paid, {
  unpaid = 'UNPAID',
  partial = 'PARTIALLY_PAID',
  settled = 'PAID'
} = {}) => {
  const totalAmount = Math.max(0, toFiniteNumber(total))
  const paidAmount = Math.max(0, toFiniteNumber(paid))

  if (paidAmount <= CENT_TOLERANCE) return unpaid
  if (totalAmount - paidAmount <= CENT_TOLERANCE) return settled

  return partial
}

export const deriveReceivableStatus = (total, paid) =>
  deriveSettlementStatus(total, paid, { unpaid: 'PENDING', partial: 'PARTIAL', settled: 'PAID' })

export const isOverdue = ({ dueDate, completed = false, today }) =>
  Boolean(dueDate && today && dueDate < today && !completed)

export const isActiveStatus = (status, activeStatuses = ACTIVE_OPERATIONAL_STATUSES) =>
  activeStatuses.includes(String(status || '').toUpperCase())
