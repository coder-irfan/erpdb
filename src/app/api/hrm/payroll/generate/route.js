import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { calculatePayrollForStaff, getMonthRange, PAYROLL_WRITE_PERMISSIONS } from '@/libs/hrmPayroll'
import { prisma } from '@/libs/prisma'
import { createPayrollPeriodSchema } from '@/schemas/hrm/payroll'
import { convertToBaseCurrency } from '@/utils/formatCurrency'
import { getDictionary } from '@/utils/getDictionary'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function POST(request) {
  let payload

  try {
    payload = await request.json()
  } catch {
    return responseError('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  const dictionary = (await getDictionary(localeFrom(payload?.locale))).hrmPayroll
  const authorization = await authorizeAction(PAYROLL_WRITE_PERMISSIONS)

  if (!authorization.authorized) {
    return responseError(authorization.code === 'UNAUTHENTICATED' ? dictionary.messages.unauthenticated : dictionary.messages.forbidden, authorization.code === 'UNAUTHENTICATED' ? 401 : 403, authorization.code)
  }

  const validation = safeParse(createPayrollPeriodSchema(dictionary.validation), {
    month: Number(payload?.month),
    year: Number(payload?.year),
    staff_id: payload?.staff_id || ''
  })

  if (!validation.success) return responseError(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  const { month, year, staff_id: staffId } = validation.output
  const { start, inclusiveEnd } = getMonthRange(month, year)

  try {
    const [draftStatus, staffMembers, setup] = await Promise.all([
      prisma.option.findFirst({ where: { category: 'PAYROLL_STATUS', value: { in: ['DRAFT', 'PENDING'] }, is_active: true }, select: { id: true }, orderBy: { sort_order: 'asc' } }),
      prisma.hrmStaff.findMany({
        where: {
          status: 'ACTIVE',
          ...(staffId && { id: staffId }),
          contracts: {
            some: {
              start_date: { lte: inclusiveEnd },
              OR: [{ end_date: null }, { end_date: { gte: start } }],
              status: { is: { category: 'CONTRACT_STATUS', value: 'ACTIVE' } }
            }
          }
        },
        select: {
          id: true,
          contracts: {
            where: {
              start_date: { lte: inclusiveEnd },
              OR: [{ end_date: null }, { end_date: { gte: start } }],
              status: { is: { category: 'CONTRACT_STATUS', value: 'ACTIVE' } }
            },
            select: { contract_number: true, base_salary: true, currency: true, exchange_rate: true, start_date: true },
            orderBy: { start_date: 'desc' },
            take: 1
          }
        }
      }),
      getCompanySetupRecord()
    ])

    if (!draftStatus) return responseError(dictionary.messages.statusNotFound, 409, 'STATUS_NOT_CONFIGURED')
    if (staffMembers.length === 0) return responseError(dictionary.messages.noEligibleStaff, 404, 'NO_ELIGIBLE_STAFF')

    const result = await prisma.$transaction(async transaction => {
      let generated = 0
      let skippedPaid = 0

      for (const staff of staffMembers) {
        const calculation = await calculatePayrollForStaff(transaction, staff, month, year)

        if (!calculation) continue

        const existing = await transaction.hrmPayroll.findUnique({
          where: { staff_id_month_year: { staff_id: staff.id, month, year } },
          select: { id: true, exchange_rate: true, status: { select: { value: true } } }
        })

        if (existing?.status.value === 'PAID') {
          skippedPaid += 1
          continue
        }

        const lockedExchangeRate = existing?.exchange_rate || calculation.exchangeRate

        const data = {
          base_salary: calculation.baseSalary,
          unpaid_leave_deduction: calculation.deduction,
          net_salary: calculation.netSalary,
          currency: calculation.currency,
          exchange_rate: lockedExchangeRate,
          amount_base: convertToBaseCurrency(
            calculation.netSalary,
            calculation.currency,
            lockedExchangeRate,
            setup.currency_code
          ),
          status_id: draftStatus.id,
          notes: JSON.stringify({ unpaidDays: calculation.unpaidDays, contractNumber: calculation.contractNumber })
        }

        if (existing) await transaction.hrmPayroll.update({ where: { id: existing.id }, data })
        else await transaction.hrmPayroll.create({ data: { staff_id: staff.id, month, year, ...data } })

        generated += 1
      }

      await transaction.auditLog.create({ data: { user_id: authorization.session.user.id, action: 'PAYROLL_GENERATED', module: 'HRM', details: { month, year, staffId: staffId || null, generated, skippedPaid } } })

      return { generated, skippedPaid }
    })

    return Response.json({ success: true, data: result, message: dictionary.messages.generated.replace('{count}', String(result.generated)) })
  } catch {
    return responseError(dictionary.messages.operationFailed, 500, 'PAYROLL_GENERATION_FAILED')
  }
}
