import 'server-only'

import { Prisma } from '@prisma/client'

const isDecimal = value => Prisma.Decimal.isDecimal(value)

/**
 * Converts Prisma values into React Server Component-safe plain data.
 * Decimal values are deliberately converted to numbers at the server boundary.
 */
export const serializeData = data => {
  if (data == null || typeof data !== 'object') return data
  if (isDecimal(data)) return Number(data.toString())
  if (data instanceof Date) return data.toISOString()
  if (Array.isArray(data)) return data.map(serializeData)

  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, serializeData(value)]))
}
