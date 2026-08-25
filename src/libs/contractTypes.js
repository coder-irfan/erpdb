import { CONTRACT_TYPE_CATEGORIES } from '@/data/contractTypes'
import { prisma } from '@/libs/prisma'

export const getContractTypeOptions = async ({ activeOnly = true } = {}) => {
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
