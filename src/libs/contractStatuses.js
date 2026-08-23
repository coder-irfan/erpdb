import 'server-only'

import { CONTRACT_STATUSES } from '@/data/contracts'
import { prisma } from '@/libs/prisma'

export const getContractStatusOptions = async () => {
  let records = await prisma.option.findMany({
    where: { category: 'CONTRACT_STATUS', value: { in: CONTRACT_STATUSES.map(status => status.value) } },
    select: { id: true, label: true, value: true, color_code: true, sort_order: true, is_default: true, is_active: true }
  })
  const existingByValue = new Map(records.map(record => [record.value, record]))

  const writes = CONTRACT_STATUSES.flatMap(status => {
    const existing = existingByValue.get(status.value)

    if (!existing) {
      return [prisma.option.create({ data: { category: 'CONTRACT_STATUS', ...status, is_active: true } })]
    }

    if (
      existing.label !== status.label ||
      existing.color_code !== status.color_code ||
      existing.sort_order !== status.sort_order ||
      existing.is_default !== status.is_default ||
      !existing.is_active
    ) {
      return [
        prisma.option.update({
          where: { id: existing.id },
          data: {
            label: status.label,
            color_code: status.color_code,
            sort_order: status.sort_order,
            is_default: status.is_default,
            is_active: true
          }
        })
      ]
    }

    return []
  })

  if (writes.length) {
    await prisma.$transaction(writes)
    records = await prisma.option.findMany({
      where: { category: 'CONTRACT_STATUS', value: { in: CONTRACT_STATUSES.map(status => status.value) } },
      select: { id: true, label: true, value: true, color_code: true, sort_order: true, is_default: true, is_active: true }
    })
  }

  const recordsByValue = new Map(records.map(record => [record.value, record]))

  return CONTRACT_STATUSES.map(status => ({ ...recordsByValue.get(status.value), ...status, is_active: true })).filter(
    status => status.id
  )
}
