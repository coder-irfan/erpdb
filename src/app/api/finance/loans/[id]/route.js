import { safeParse } from 'valibot'

import { getFinanceLoanDictionary } from '@/data/dictionaries/financeLoan'
import { authorizeAction } from '@/libs/actionAuthorization'
import { ensureLoanStatuses, getLoanSetup, LOAN_DELETE_PERMISSIONS, LOAN_READ_PERMISSIONS, LOAN_WRITE_PERMISSIONS, loanPayload, loanSelect, normalizeLoan, prepareLoanData } from '@/libs/financeLoans'
import { prisma } from '@/libs/prisma'
import { createFinanceLoanSchema } from '@/schemas/financeLoan'
import { toFiniteNumber } from '@/utils/formatCurrency'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function GET(request, routeContext) {
  const { id } = await routeContext.params
  const dictionary = getFinanceLoanDictionary(localeFrom(request.nextUrl.searchParams.get('locale')))
  const authorization = await authorizeAction(LOAN_READ_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  const loan = await prisma.financeloan.findUnique({ where: { id }, select: loanSelect })

  if (!loan) return errorResponse(dictionary.messages.notFound, 404, 'LOAN_NOT_FOUND')

  return Response.json({ success: true, data: normalizeLoan(loan) })
}

export async function PUT(request, routeContext) {
  const { id } = await routeContext.params
  let payload

  try { payload = await request.json() } catch { return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST') }

  const dictionary = getFinanceLoanDictionary(localeFrom(payload?.locale))
  const authorization = await authorizeAction(LOAN_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    await ensureLoanStatuses()
    const [current, setup] = await Promise.all([prisma.financeloan.findUnique({ where: { id }, select: { id: true, repaid_amount: true } }), getLoanSetup()])

    if (!current) return errorResponse(dictionary.messages.notFound, 404, 'LOAN_NOT_FOUND')

    const validation = safeParse(createFinanceLoanSchema(dictionary.validation), loanPayload(payload, setup))

    if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

    const prepared = await prepareLoanData(validation.output, dictionary.validation, current)

    if (!prepared.success) return errorResponse(prepared.error, 400, 'VALIDATION_ERROR')

    const updated = await prisma.$transaction(async transaction => {
      const loan = await transaction.financeloan.update({ where: { id }, data: prepared.data, select: loanSelect })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'FINANCE_LOAN_UPDATED', module: 'FINANCE', details: { loanId: id, executedByUserId: authorization.session.user.id } } })

      return loan
    })

    return Response.json({ success: true, data: normalizeLoan(updated), message: dictionary.messages.updated })
  } catch {
    return errorResponse(dictionary.messages.operationFailed, 500, 'LOAN_UPDATE_FAILED')
  }
}

export async function DELETE(request, routeContext) {
  const { id } = await routeContext.params
  const dictionary = getFinanceLoanDictionary(localeFrom(request.nextUrl.searchParams.get('locale')))
  const authorization = await authorizeAction(LOAN_DELETE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  const loan = await prisma.financeloan.findUnique({ where: { id }, select: { id: true, loan_number: true, repaid_amount: true } })

  if (!loan) return errorResponse(dictionary.messages.notFound, 404, 'LOAN_NOT_FOUND')
  if (toFiniteNumber(loan.repaid_amount) > 0) return errorResponse(dictionary.messages.deleteBlocked, 409, 'LOAN_HAS_REPAYMENTS')

  await prisma.$transaction([
    prisma.financeloan.delete({ where: { id } }),
    prisma.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'FINANCE_LOAN_DELETED', module: 'FINANCE', details: { loanId: id, loanNumber: loan.loan_number } } })
  ])

  return Response.json({ success: true, message: dictionary.messages.deleted })
}
