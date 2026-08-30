import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { getFinanceLoanDictionary } from '@/data/dictionaries/financeLoan'
import { authorizeAction } from '@/libs/actionAuthorization'
import { applyLoanRepayment, getLoanSetup, LoanLedgerError, LOAN_WRITE_PERMISSIONS, normalizeLoan } from '@/libs/financeLoans'
import { prisma } from '@/libs/prisma'
import { repayFinanceLoanSchema } from '@/schemas/financeLoan'
import { toUtcDateOnly } from '@/utils/contractDuration'
import { SYSTEM_BASE_CURRENCY, effectiveAfnExchangeRate } from '@/utils/formatCurrency'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function PATCH(request, routeContext) {
  const { id } = await routeContext.params
  let payload

  try { payload = await request.json() } catch { return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST') }

  const dictionary = getFinanceLoanDictionary(localeFrom(payload?.locale))
  const authorization = await authorizeAction(LOAN_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  const validation = safeParse(repayFinanceLoanSchema(dictionary.validation), {
    repayment_amount: String(payload?.repayment_amount ?? ''),
    source: payload?.source || 'MANUAL',
    repayment_date: payload?.repayment_date || new Date().toISOString().slice(0, 10),
    payment_method_id: payload?.payment_method_id || '',
    reference_id: payload?.reference_id || '',
    notes: payload?.notes || ''
  })

  if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  const repaymentDate = toUtcDateOnly(validation.output.repayment_date)

  if (!repaymentDate) return errorResponse(dictionary.validation.dateInvalid, 400, 'INVALID_REPAYMENT_DATE')

  try {
    const setup = await getLoanSetup()
    const executionTimestamp = new Date()

    const result = await prisma.$transaction(async transaction => {
      const source =
        validation.output.source === 'MANUAL_BANK' ? 'MANUAL_BANK' : 'MANUAL_CASH'

      const applied = await applyLoanRepayment(transaction, {
        loanId: id,
        amount: validation.output.repayment_amount,
        source,
        repaymentDate,
        paymentMethodId: validation.output.payment_method_id || null,
        referenceId: validation.output.reference_id || null,
        createdByUserId: authorization.session.user.id,
        notes: validation.output.notes,
        baseCurrency: SYSTEM_BASE_CURRENCY,
        fxSnapshotRate: effectiveAfnExchangeRate('USD', setup.usd_afn_exchange_rate),
        fxSnapshotAt: executionTimestamp
      })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'FINANCE_LOAN_REPAYMENT_RECORDED', module: 'FINANCE', details: { loanId: id, repaymentId: applied.repayment.id, appliedAmount: applied.appliedAmount, amountBaseAfn: applied.repayment.amount_base.toString(), fxRate: applied.repayment.exchange_rate.toString(), fxSnapshotAt: executionTimestamp.toISOString(), source, referenceId: validation.output.reference_id || null, executedByUserId: authorization.session.user.id } } })

      return applied
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return Response.json({ success: true, data: normalizeLoan(result.loan), appliedAmount: result.appliedAmount, repaymentId: result.repayment.id, message: dictionary.messages.repaid })
  } catch (error) {
    if (error instanceof LoanLedgerError) {
      const status = error.code === 'LOAN_NOT_FOUND' ? 404 : 409

      return errorResponse(error.message, status, error.code)
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return errorResponse(dictionary.messages.repaymentBlocked, 409, 'DUPLICATE_REPAYMENT_REFERENCE')
    }

    return errorResponse(dictionary.messages.operationFailed, 500, 'LOAN_REPAYMENT_FAILED')
  }
}
