import 'server-only'

import { Prisma } from '@prisma/client'

const SEQUENCES = {
  contract: { model: 'contract', field: 'contract_number' },
  invoice: { model: 'contractinvoice', field: 'invoice_number' },
  inventory: { model: 'inventory', field: 'sku_code' },
  loan: { model: 'financeloan', field: 'loan_number' },
  project: { model: 'project', field: 'project_code' },
  staffContract: { model: 'hrmstaffcontract', field: 'contract_number' }
}

export const nextSequentialNumber = async (transaction, sequenceKey, { prefix, digits }) => {
  const sequence = SEQUENCES[sequenceKey]

  if (!sequence || !prefix || !Number.isInteger(digits) || digits < 1) {
    throw new Error('INVALID_SEQUENTIAL_NUMBER_CONFIGURATION')
  }

  const latest = await transaction[sequence.model].findFirst({
    where: { [sequence.field]: { startsWith: prefix } },
    select: { [sequence.field]: true },
    orderBy: { [sequence.field]: 'desc' }
  })

  const current = Number.parseInt(latest?.[sequence.field]?.slice(prefix.length), 10)
  const next = Number.isFinite(current) ? current + 1 : 1

  return `${prefix}${String(next).padStart(digits, '0')}`
}

const isRetryableSequenceError = error =>
  error?.code === 'P2002' ||
  error?.code === 'P2034' ||
  (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code))

export const withSequentialNumberRetry = async (operation, { attempts = 8 } = {}) => {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error

      if (!isRetryableSequenceError(error) || attempt === attempts) throw error

      const backoff = Math.min(10 * (2 ** (attempt - 1)), 200) + Math.floor(Math.random() * 25)

      await new Promise(resolve => setTimeout(resolve, backoff))
    }
  }

  throw lastError
}
