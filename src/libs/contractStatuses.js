import 'server-only'

import { CONTRACT_STATUSES } from '@/data/contracts'
import { prisma } from '@/libs/prisma'

export const getContractStatusOptions = async () => {
  const records = await prisma.option.findMany({
    where: { category: 'CONTRACT_STATUS', value: { in: CONTRACT_STATUSES.map(status => status.value) }, is_active: true },
    select: { id: true, label: true, value: true, color_code: true, sort_order: true, is_default: true, is_active: true }
  })

  const recordsByValue = new Map(records.map(record => [record.value, record]))

  return CONTRACT_STATUSES.map(status => recordsByValue.get(status.value)).filter(Boolean)
}
