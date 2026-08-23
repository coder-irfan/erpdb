import slugify from 'slugify'

import { CONTRACT_TYPE_CATEGORIES, DEFAULT_CONTRACT_TYPES } from '@/data/contractTypes'
import { prisma } from '@/libs/prisma'

export const getContractTypeOptions = async ({ activeOnly = true } = {}) => {
  const existing = await prisma.option.findMany({
    where: { category: { in: CONTRACT_TYPE_CATEGORIES }, ...(activeOnly ? { is_active: true } : {}) },
    select: {
      id: true,
      category: true,
      label: true,
      value: true,
      description: true,
      is_active: true,
      is_default: true,
      sort_order: true
    },
    orderBy: [{ category: 'asc' }, { sort_order: 'asc' }, { label: 'asc' }]
  })

  if (existing.length > 0) return existing

  await prisma.$transaction(
    Object.entries(DEFAULT_CONTRACT_TYPES).flatMap(([category, labels]) =>
      labels.map((label, index) => {
        const value = slugify(label, { upper: true, strict: true, replacement: '_' })

        return prisma.option.upsert({
          where: { category_value: { category, value } },
          update: {},
          create: { category, label, value, sort_order: index + 1, is_active: true, is_default: index === 0 }
        })
      })
    )
  )

  return prisma.option.findMany({
    where: { category: { in: CONTRACT_TYPE_CATEGORIES }, ...(activeOnly ? { is_active: true } : {}) },
    select: {
      id: true,
      category: true,
      label: true,
      value: true,
      description: true,
      is_active: true,
      is_default: true,
      sort_order: true
    },
    orderBy: [{ category: 'asc' }, { sort_order: 'asc' }, { label: 'asc' }]
  })
}
