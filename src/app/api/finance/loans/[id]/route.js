import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { getFinanceLoanDictionary } from '@/data/dictionaries/financeLoan'
import { authorizeAction } from '@/libs/actionAuthorization'
import {
  applyLoanStatusTransition,
  getLoanSetup,
  LoanLedgerError,
  LOAN_DELETE_PERMISSIONS,
  LOAN_READ_PERMISSIONS,
  LOAN_STATUS_VALUES,
  LOAN_WRITE_PERMISSIONS,
  loanPayload,
  loanSelect,
  normalizeLoan,
  prepareLoanData
} from '@/libs/financeLoans'
import { prisma } from '@/libs/prisma'
import { createFinanceLoanSchema } from '@/schemas/financeLoan'
import { toFiniteNumber } from '@/utils/formatCurrency'
import { hasAdministrativeRole } from '@/utils/rbac'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function GET(request, routeContext) {
  const { id } = await routeContext.params
  const dictionary = getFinanceLoanDictionary(localeFrom(request.nextUrl.searchParams.get('locale')))
  const authorization = await authorizeAction(LOAN_READ_PERMISSIONS)

  if (!authorization.authorized)
    return errorResponse(
      authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated,
      authorization.code === 'FORBIDDEN' ? 403 : 401,
      authorization.code
    )

  const loan = await prisma.financeloan.findUnique({ where: { id }, select: loanSelect })

  if (!loan) return errorResponse(dictionary.messages.notFound, 404, 'LOAN_NOT_FOUND')

  return Response.json({ success: true, data: normalizeLoan(loan) })
}

export async function PUT(request, routeContext) {
  const { id } = await routeContext.params
  let payload

  try {
    payload = await request.json()
  } catch {
    return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  const dictionary = getFinanceLoanDictionary(localeFrom(payload?.locale))
  const authorization = await authorizeAction(LOAN_WRITE_PERMISSIONS)

  if (!authorization.authorized)
    return errorResponse(
      authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated,
      authorization.code === 'FORBIDDEN' ? 403 : 401,
      authorization.code
    )

  try {
    const [current, setup] = await Promise.all([
      prisma.financeloan.findUnique({
        where: { id },
        select: {
          id: true,
          total_amount: true,
          repaid_amount: true,
          currency: true,
          exchange_rate: true,
          status: { select: { value: true } }
        }
      }),
      getLoanSetup()
    ])

    if (!current) return errorResponse(dictionary.messages.notFound, 404, 'LOAN_NOT_FOUND')

    if (current.status.value !== 'REQUESTED') {
      return errorResponse(
        dictionary.messages.repaymentLocked || dictionary.messages.deleteBlocked,
        409,
        'LOAN_TERMS_LOCKED'
      )
    }

    const validation = safeParse(createFinanceLoanSchema(dictionary.validation), loanPayload(payload, setup))

    if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

    const prepared = await prepareLoanData(validation.output, dictionary.validation, setup, current)

    if (!prepared.success) return errorResponse(prepared.error, 400, 'VALIDATION_ERROR')

    const updated = await prisma.$transaction(async transaction => {
      await transaction.loanrepaymentschedule.deleteMany({ where: { loan_id: id } })

      const loan = await transaction.financeloan.update({ where: { id }, data: prepared.data, select: loanSelect })

      if (prepared.schedule.length > 0) {
        await transaction.loanrepaymentschedule.createMany({
          data: prepared.schedule.map(item => ({
            ...item,
            loan_id: id,
            opening_principal: new Prisma.Decimal(item.opening_principal),
            principal_amount: new Prisma.Decimal(item.principal_amount),
            interest_amount: new Prisma.Decimal(item.interest_amount),
            payment_amount: new Prisma.Decimal(item.payment_amount),
            remaining_principal: new Prisma.Decimal(item.remaining_principal)
          }))
        })
      }

      const refreshed = await transaction.financeloan.findUnique({ where: { id }, select: loanSelect })

      await transaction.auditlog.create({
        data: {
          user_id: authorization.session.user.id,
          action: 'FINANCE_LOAN_UPDATED',
          module: 'FINANCE',
          details: { loanId: id, executedByUserId: authorization.session.user.id }
        }
      })

      return refreshed || loan
    })

    return Response.json({ success: true, data: normalizeLoan(updated), message: dictionary.messages.updated })
  } catch {
    return errorResponse(dictionary.messages.operationFailed, 500, 'LOAN_UPDATE_FAILED')
  }
}

export async function PATCH(request, routeContext) {
  const { id } = await routeContext.params
  let payload

  try {
    payload = await request.json()
  } catch {
    return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  const dictionary = getFinanceLoanDictionary(localeFrom(payload?.locale))
  const authorization = await authorizeAction(LOAN_WRITE_PERMISSIONS)

  if (!authorization.authorized)
    return errorResponse(
      authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated,
      authorization.code === 'FORBIDDEN' ? 403 : 401,
      authorization.code
    )
  if (!hasAdministrativeRole(authorization.session))
    return errorResponse(dictionary.messages.forbidden, 403, 'ADMIN_ROLE_REQUIRED')

  const nextStatus = String(payload?.status || '').toUpperCase()

  if (!LOAN_STATUS_VALUES.includes(nextStatus)) {
    return errorResponse(
      dictionary.validation.statusInvalid || dictionary.messages.invalidRelation,
      400,
      'INVALID_LOAN_STATUS'
    )
  }

  try {
    const approver = await prisma.hrmstaff.findUnique({
      where: { user_id: authorization.session.user.id },
      select: { id: true }
    })

    const loan = await prisma.$transaction(
      async transaction => {
        const before = await transaction.financeloan.findUnique({
          where: { id },
          select: { loan_type: true, status: { select: { value: true } } }
        })

        if (!before) throw new LoanLedgerError('LOAN_NOT_FOUND', 'Loan not found.')

        const combinesStaffApproval =
          before.loan_type === 'STAFF' &&
          ['REQUESTED', 'APPROVED'].includes(before.status.value) &&
          nextStatus === 'ACTIVE'

        let payoutMethod = null

        if (combinesStaffApproval) {
          payoutMethod = await transaction.option.findFirst({
            where: {
              id: payload?.payout_payment_method_id || '',
              category: 'PAYMENT_METHOD',
              value: { in: ['CASH', 'BANK_TRANSFER'] },
              is_active: true
            },
            select: { id: true, label: true, value: true }
          })

          if (!payoutMethod) {
            throw new LoanLedgerError('PAYOUT_ACCOUNT_REQUIRED', 'Select a valid cash wallet or bank account.')
          }
        }

        const updated = await applyLoanStatusTransition(transaction, {
          loanId: id,
          nextStatusValue: nextStatus,
          approvedById: approver?.id || null
        })

        await transaction.auditlog.create({
          data: {
            user_id: authorization.session.user.id,
            action: combinesStaffApproval ? 'FINANCE_STAFF_LOAN_APPROVED_AND_DISBURSED' : 'FINANCE_LOAN_STATUS_UPDATED',
            module: 'FINANCE',
            details: {
              loanId: id,
              fromStatus: before.status.value,
              toStatus: nextStatus,
              ...(payoutMethod
                ? {
                    payoutPaymentMethodId: payoutMethod.id,
                    payoutAccount: payoutMethod.label,
                    payoutAccountType: payoutMethod.value
                  }
                : {})
            }
          }
        })

        return updated
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    return Response.json({ success: true, data: normalizeLoan(loan), message: dictionary.messages.updated })
  } catch (error) {
    if (error instanceof LoanLedgerError) {
      const status = error.code === 'LOAN_NOT_FOUND' ? 404 : 409

      return errorResponse(error.message, status, error.code)
    }

    return errorResponse(dictionary.messages.operationFailed, 500, 'LOAN_STATUS_UPDATE_FAILED')
  }
}

export async function DELETE(request, routeContext) {
  const { id } = await routeContext.params
  const dictionary = getFinanceLoanDictionary(localeFrom(request.nextUrl.searchParams.get('locale')))
  const authorization = await authorizeAction(LOAN_DELETE_PERMISSIONS)

  if (!authorization.authorized)
    return errorResponse(
      authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated,
      authorization.code === 'FORBIDDEN' ? 403 : 401,
      authorization.code
    )

  const loan = await prisma.financeloan.findUnique({
    where: { id },
    select: { id: true, loan_number: true, repaid_amount: true, _count: { select: { repayments: true } } }
  })

  if (!loan) return errorResponse(dictionary.messages.notFound, 404, 'LOAN_NOT_FOUND')
  if (toFiniteNumber(loan.repaid_amount) > 0 || loan._count.repayments > 0)
    return errorResponse(dictionary.messages.deleteBlocked, 409, 'LOAN_HAS_REPAYMENTS')

  await prisma.$transaction([
    prisma.financeloan.delete({ where: { id } }),
    prisma.auditlog.create({
      data: {
        user_id: authorization.session.user.id,
        action: 'FINANCE_LOAN_DELETED',
        module: 'FINANCE',
        details: { loanId: id, loanNumber: loan.loan_number }
      }
    })
  ])

  return Response.json({ success: true, message: dictionary.messages.deleted })
}
