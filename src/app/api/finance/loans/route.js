import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { getFinanceLoanDictionary } from '@/data/dictionaries/financeLoan'
import { authorizeAction } from '@/libs/actionAuthorization'
import {
  ACTIVE_LOAN_VALUES,
  getLoanSetup,
  LOAN_READ_PERMISSIONS,
  LOAN_WRITE_PERMISSIONS,
  loanPayload,
  loanSelect,
  nextLoanNumber,
  normalizeLoan,
  normalizeLoanStatusOption,
  optionSelect,
  prepareLoanData,
  staffSelect
} from '@/libs/financeLoans'
import { prisma } from '@/libs/prisma'
import { withSequentialNumberRetry } from '@/libs/sequentialNumbers'
import { createFinanceLoanSchema } from '@/schemas/financeLoan'
import { SYSTEM_BASE_CURRENCY, convertToBaseCurrency, roundMoney, toFiniteNumber } from '@/utils/formatCurrency'

const MAX_PAGE_SIZE = 100
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

const contextFor = async (locale, permissions) => {
  const [authorization, dictionary] = await Promise.all([
    authorizeAction(permissions),
    Promise.resolve(getFinanceLoanDictionary(locale))
  ])

  return { authorization, dictionary }
}

export async function GET(request) {
  const params = request.nextUrl.searchParams
  const locale = localeFrom(params.get('locale'))
  const { authorization, dictionary } = await contextFor(locale, LOAN_READ_PERMISSIONS)

  if (!authorization.authorized)
    return errorResponse(
      authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated,
      authorization.code === 'FORBIDDEN' ? 403 : 401,
      authorization.code
    )

  const search = (params.get('search') || '').trim()
  const statusId = params.get('status_id') || ''
  const loanType = ['STAFF', 'CORPORATE'].includes(params.get('loan_type')) ? params.get('loan_type') : ''
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(params.get('limit') || '10', 10) || 10))

  const where = {
    ...(statusId && { status_id: statusId }),
    ...(loanType && { loan_type: loanType }),
    ...(search && {
      OR: [
        { loan_number: { contains: search } },
        { entity_name: { contains: search } },
        {
          staff: {
            is: {
              OR: [
                { first_name: { contains: search } },
                { last_name: { contains: search } },
                { email: { contains: search } }
              ]
            }
          }
        }
      ]
    })
  }

  try {
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

    const [loans, totalCount, summaryRows, debtSchedule, monthlyRepayments, statuses, paymentMethods, staff, setup] =
      await Promise.all([
        prisma.financeloan.findMany({
          where,
          select: loanSelect,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.financeloan.count({ where }),
        prisma.financeloan.findMany({
          select: {
            staff_id: true,
            loan_type: true,
            auto_deduct: true,
            repayment_start_date: true,
            total_amount: true,
            monthly_deduction: true,
            repaid_amount: true,
            remaining_balance: true,
            amount_base: true,
            currency: true,
            exchange_rate: true,
            status: { select: { value: true } }
          }
        }),
        prisma.loanrepaymentschedule.findMany({
          where: {
            due_date: { gte: monthStart, lt: monthEnd },
            status: 'SCHEDULED',
            loan: { is: { loan_type: 'CORPORATE', status: { is: { value: { in: ACTIVE_LOAN_VALUES } } } } }
          },
          select: { payment_amount: true, loan: { select: { currency: true, exchange_rate: true } } }
        }),
        prisma.loanrepayment.findMany({
          where: { repayment_date: { gte: monthStart, lt: monthEnd } },
          select: { amount_base: true, loan: { select: { loan_type: true } } }
        }),
        prisma.option.findMany({
          where: { category: 'LOAN_STATUS', is_active: true },
          select: optionSelect,
          orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
        }),
        prisma.option.findMany({
          where: { category: 'PAYMENT_METHOD', value: { in: ['CASH', 'BANK_TRANSFER'] }, is_active: true },
          select: optionSelect,
          orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
        }),
        prisma.hrmstaff.findMany({
          where: { status: { not: 'TERMINATED' } },
          select: staffSelect,
          orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
          take: 500
        }),
        getLoanSetup()
      ])

    const activeStaffIds = new Set()

    const summary = summaryRows.reduce(
      (totals, loan) => {
        const toBase = amount => convertToBaseCurrency(amount, loan.currency, loan.exchange_rate, SYSTEM_BASE_CURRENCY)

        if (ACTIVE_LOAN_VALUES.includes(loan.status.value)) {
          if (loan.loan_type === 'STAFF') {
            totals.staffReceivables += toBase(loan.remaining_balance)
            if (loan.staff_id) activeStaffIds.add(loan.staff_id)

            if (loan.auto_deduct && (!loan.repayment_start_date || loan.repayment_start_date < monthEnd)) {
              totals.payrollRecovery += toBase(
                Math.min(toFiniteNumber(loan.monthly_deduction), toFiniteNumber(loan.remaining_balance))
              )
            }
          } else {
            totals.corporateDebt += toBase(loan.remaining_balance)
            totals.activeCorporateLoans += 1
          }
        }

        return totals
      },
      {
        staffReceivables: 0,
        corporateDebt: 0,
        payrollRecovery: 0,
        activeStaffBorrowers: 0,
        activeCorporateLoans: 0,
        staffRecoveredThisMonth: monthlyRepayments
          .filter(item => item.loan.loan_type === 'STAFF')
          .reduce((total, item) => total + toFiniteNumber(item.amount_base), 0),
        corporatePaidThisMonth: monthlyRepayments
          .filter(item => item.loan.loan_type === 'CORPORATE')
          .reduce((total, item) => total + toFiniteNumber(item.amount_base), 0),
        monthlyDebtObligation: debtSchedule.reduce(
          (total, item) =>
            total +
            convertToBaseCurrency(
              item.payment_amount,
              item.loan.currency,
              item.loan.exchange_rate,
              SYSTEM_BASE_CURRENCY
            ),
          0
        )
      }
    )

    summary.activeStaffBorrowers = activeStaffIds.size

    Object.keys(summary).forEach(key => {
      if (['activeStaffBorrowers', 'activeCorporateLoans'].includes(key)) return

      summary[key] = roundMoney(summary[key])
    })

    return Response.json({
      success: true,
      data: {
        loans: loans.map(normalizeLoan),
        totalCount,
        page,
        summary,
        options: {
          statuses: statuses.map(normalizeLoanStatusOption),
          paymentMethods,
          staff: staff.map(item => ({ ...item, full_name: `${item.first_name} ${item.last_name}`.trim() })),
          baseCurrency: SYSTEM_BASE_CURRENCY,
          exchangeRate: setup.usd_afn_exchange_rate || '65.0000'
        }
      }
    })
  } catch {
    return errorResponse(dictionary.messages.loadFailed, 500, 'LOANS_LOAD_FAILED')
  }
}

export async function POST(request) {
  let payload

  try {
    payload = await request.json()
  } catch {
    return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  const locale = localeFrom(payload?.locale)
  const { authorization, dictionary } = await contextFor(locale, LOAN_WRITE_PERMISSIONS)

  if (!authorization.authorized)
    return errorResponse(
      authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated,
      authorization.code === 'FORBIDDEN' ? 403 : 401,
      authorization.code
    )

  try {
    const setup = await getLoanSetup()
    const validation = safeParse(createFinanceLoanSchema(dictionary.validation), loanPayload(payload, setup))

    if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

    const prepared = await prepareLoanData(validation.output, dictionary.validation, setup)

    if (!prepared.success) return errorResponse(prepared.error, 400, 'VALIDATION_ERROR')

    const initialStatusValue = validation.output.loan_type === 'CORPORATE' ? 'ACTIVE' : 'REQUESTED'

    const status = await prisma.option.findFirst({
      where: { category: 'LOAN_STATUS', value: initialStatusValue, is_active: true },
      select: { id: true }
    })

    if (!status) return errorResponse(dictionary.messages.invalidRelation, 409, 'STATUS_NOT_CONFIGURED')

    const created = await withSequentialNumberRetry(() =>
      prisma.$transaction(
        async transaction => {
          const loanNumber = await nextLoanNumber(transaction, validation.output.loan_type)

          const loan = await transaction.financeloan.create({
            data: {
              ...prepared.data,
              loan_number: loanNumber,
              status_id: status.id,
              ...(validation.output.loan_type === 'CORPORATE' ? { fx_snapshot_at: new Date() } : {}),
              ...(prepared.schedule.length && {
                repayment_schedule: {
                  create: prepared.schedule.map(item => ({
                    ...item,
                    opening_principal: new Prisma.Decimal(item.opening_principal),
                    principal_amount: new Prisma.Decimal(item.principal_amount),
                    interest_amount: new Prisma.Decimal(item.interest_amount),
                    payment_amount: new Prisma.Decimal(item.payment_amount),
                    remaining_principal: new Prisma.Decimal(item.remaining_principal)
                  }))
                }
              })
            },
            select: loanSelect
          })

          await transaction.auditlog.create({
            data: {
              user_id: authorization.session.user.id,
              action:
                validation.output.loan_type === 'CORPORATE'
                  ? 'FINANCE_CORPORATE_DEBT_ACTIVATED'
                  : 'FINANCE_LOAN_REQUESTED',
              module: 'FINANCE',
              details: {
                loanId: loan.id,
                loanNumber,
                executedByUserId: authorization.session.user.id,
                executedByName: authorization.session.user.name || null,
                executedByEmail: authorization.session.user.email || null,
                initialStatus: initialStatusValue
              }
            }
          })

          return loan
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    )

    return Response.json(
      { success: true, data: normalizeLoan(created), message: dictionary.messages.created },
      { status: 201 }
    )
  } catch {
    return errorResponse(dictionary.messages.operationFailed, 500, 'LOAN_CREATE_FAILED')
  }
}
