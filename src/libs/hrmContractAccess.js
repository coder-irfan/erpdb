import 'server-only'

import { toUtcDateOnly } from '@/utils/utcDate'

const activeContractWhere = ({ staffId, startDate, endDate = startDate }) => {
  const rangeStart = toUtcDateOnly(startDate)
  const rangeEnd = toUtcDateOnly(endDate)

  return {
    staff_id: staffId,
    status: { is: { category: 'CONTRACT_STATUS', value: 'ACTIVE' } },
    start_date: { lte: rangeStart },
    OR: [{ end_date: null }, { end_date: { gte: rangeEnd } }]
  }
}

export const hasActiveStaffContract = async (client, { staffId, startDate, endDate = startDate }) =>
  Boolean(await client.hrmstaffcontract.findFirst({
    where: activeContractWhere({ staffId, startDate, endDate }),
    select: { id: true }
  }))

export const activeStaffContractRelation = ({ startDate, endDate = startDate }) => {
  const rangeStart = toUtcDateOnly(startDate)
  const rangeEnd = toUtcDateOnly(endDate)

  return {
    some: {
      status: { is: { category: 'CONTRACT_STATUS', value: 'ACTIVE' } },
      start_date: { lte: rangeStart },
      OR: [{ end_date: null }, { end_date: { gte: rangeEnd } }]
    }
  }
}
