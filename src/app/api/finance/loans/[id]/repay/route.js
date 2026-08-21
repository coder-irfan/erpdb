import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { getFinanceLoanDictionary } from '@/data/dictionaries/financeLoan'
import { authorizeAction } from '@/libs/actionAuthorization'
import { ensureLoanStatuses, LOAN_WRITE_PERMISSIONS, loanSelect, normalizeLoan } from '@/libs/financeLoans'
import { prisma } from '@/libs/prisma'
import { repayFinanceLoanSchema } from '@/schemas/financeLoan'
import { toFiniteNumber } from '@/utils/formatCurrency'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function PATCH(request, routeContext) {
  const { id } = await routeContext.params
  let payload

  try { payload = await request.json() } catch { return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST') }

  const dictionary = getFinanceLoanDictionary(localeFrom(payload?.locale))
  const authorization = await authorizeAction(LOAN_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  const validation = safeParse(repayFinanceLoanSchema(dictionary.validation), { repayment_amount: String(payload?.repayment_amount ?? ''), source: payload?.source || 'MANUAL' })

  if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  try {
    await ensureLoanStatuses()
    const closedStatus = await prisma.option.findFirst({ where: { category: 'LOAN_STATUS', value: { in: ['CLOSED', 'REPAID'] }, is_active: true }, select: { id: true }, orderBy: { sort_order: 'asc' } })

    const result = await prisma.$transaction(async transaction => {
      const loan = await transaction.financeloan.findUnique({ where: { id }, select: loanSelect })

      if (!loan) return { error: 'NOT_FOUND' }

      const remaining = toFiniteNumber(loan.remaining_balance)

      if (remaining <= 0) return { error: 'NO_BALANCE' }

      const requested = toFiniteNumber(validation.output.repayment_amount)
      const applied = Math.min(requested, remaining)
      const repaidAmount = Math.min(toFiniteNumber(loan.total_amount), toFiniteNumber(loan.repaid_amount) + applied)
      const remainingBalance = Math.max(0, toFiniteNumber(loan.total_amount) - repaidAmount)
      const updated = await transaction.financeloan.update({ where: { id }, data: { repaid_amount: new Prisma.Decimal(repaidAmount), remaining_balance: new Prisma.Decimal(remainingBalance), ...(remainingBalance <= 0 && closedStatus ? { status_id: closedStatus.id } : {}) }, select: loanSelect })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'FINANCE_LOAN_REPAYMENT_RECORDED', module: 'FINANCE', details: { loanId: id, requestedAmount: requested, appliedAmount: applied, currency: loan.currency, source: validation.output.source, executedByUserId: authorization.session.user.id } } })

      return { loan: updated, applied }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (result.error === 'NOT_FOUND') return errorResponse(dictionary.messages.notFound, 404, 'LOAN_NOT_FOUND')
    if (result.error === 'NO_BALANCE') return errorResponse(dictionary.messages.repaymentBlocked, 409, 'LOAN_ALREADY_CLOSED')

    return Response.json({ success: true, data: normalizeLoan(result.loan), appliedAmount: result.applied, message: dictionary.messages.repaid })
  } catch {
    return errorResponse(dictionary.messages.operationFailed, 500, 'LOAN_REPAYMENT_FAILED')
  }
}
