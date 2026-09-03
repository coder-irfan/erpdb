import 'server-only'

import { Prisma } from '@prisma/client'

import { CENT_TOLERANCE, deriveSettlementStatus } from '@/libs/financialStatuses'
import { ensureSystemOption } from '@/libs/systemOptions'
import { roundMoney, subtractMoney, toFiniteNumber } from '@/utils/formatCurrency'

export class InvoiceSettlementError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'InvoiceSettlementError'
    this.code = code
  }
}

const getSettlementStatus = (paidAmount, invoiceAmount) => deriveSettlementStatus(invoiceAmount, paidAmount)

export const syncInvoiceSettlement = async (transaction, invoiceId) => {
  if (!invoiceId) return null

  const [invoice, aggregate] = await Promise.all([
    transaction.contractinvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, amount: true, status: { select: { value: true } } }
    }),
    transaction.financeincome.aggregate({
      where: { invoice_id: invoiceId },
      _sum: { paid_amount: true }
    })
  ])

  if (!invoice) throw new InvoiceSettlementError('INVOICE_NOT_FOUND', 'Invoice not found.')

  const invoiceAmount = roundMoney(invoice.amount)
  const paidAmount = roundMoney(aggregate._sum.paid_amount || 0)

  if (paidAmount - invoiceAmount > CENT_TOLERANCE) {
    throw new InvoiceSettlementError('INVOICE_OVERPAYMENT', 'The payment exceeds the invoice balance.')
  }

  const normalizedPaid = Math.min(invoiceAmount, Math.max(0, paidAmount))
  const remainingBalance = Math.max(0, subtractMoney(invoiceAmount, normalizedPaid))
  const statusValue = getSettlementStatus(normalizedPaid, invoiceAmount)

  if (invoice.status.value === 'CANCELLED') {
    return transaction.contractinvoice.update({
      where: { id: invoiceId },
      data: {
        paid_amount: new Prisma.Decimal(normalizedPaid),
        remaining_balance: new Prisma.Decimal(0)
      },
      select: {
        id: true,
        paid_amount: true,
        remaining_balance: true,
        status: { select: { id: true, label: true, value: true } }
      }
    })
  }

  const status = await ensureSystemOption(transaction, 'INVOICE_STATUS', statusValue)

  return transaction.contractinvoice.update({
    where: { id: invoiceId },
    data: {
      paid_amount: new Prisma.Decimal(normalizedPaid),
      remaining_balance: new Prisma.Decimal(remainingBalance),
      status_id: status.id
    },
    select: {
      id: true,
      paid_amount: true,
      remaining_balance: true,
      status: { select: { id: true, label: true, value: true } }
    }
  })
}

export const settlementTransactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable
}
