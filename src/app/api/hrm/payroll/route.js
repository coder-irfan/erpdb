import { authorizeAction } from '@/libs/actionAuthorization'
import { getCurrentStaffId, normalizePayroll, payrollSelect, PAYROLL_READ_PERMISSIONS, PAYROLL_WRITE_PERMISSIONS } from '@/libs/hrmPayroll'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'
import { toFiniteNumber } from '@/utils/formatCurrency'
import { hasAnyPermission } from '@/utils/rbac'

const MAX_PAGE_SIZE = 100
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function GET(request) {
  const authorization = await authorizeAction([])
  const params = request.nextUrl.searchParams
  const locale = localeFrom(params.get('locale'))
  const dictionary = (await getDictionary(locale)).hrmPayroll

  if (!authorization.authorized) return responseError(dictionary.messages.unauthenticated, 401, 'UNAUTHENTICATED')

  const canManage = hasAnyPermission(authorization.session, PAYROLL_WRITE_PERMISSIONS)
  const canReadAll = hasAnyPermission(authorization.session, PAYROLL_READ_PERMISSIONS)
  const currentStaffId = await getCurrentStaffId(authorization.session.user.id)

  if (!canReadAll && !currentStaffId) return responseError(dictionary.messages.staffProfileRequired, 403, 'STAFF_PROFILE_REQUIRED')

  const now = new Date()
  const month = Math.min(12, Math.max(1, Number.parseInt(params.get('month') || String(now.getUTCMonth() + 1), 10)))
  const year = Math.min(2200, Math.max(2000, Number.parseInt(params.get('year') || String(now.getUTCFullYear()), 10)))
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(params.get('limit') || '10', 10) || 10))
  const staffId = canReadAll ? params.get('staff_id') || '' : currentStaffId
  const statusId = params.get('status_id') || ''
  const search = params.get('search')?.trim() || ''
  const searchTokens = search.split(/\s+/).filter(Boolean)

  const where = {
    month,
    year,
    ...(search && {
      staff: {
        is: {
          AND: searchTokens.map(token => ({
            OR: [
              { first_name: { contains: token } },
              { last_name: { contains: token } },
              { email: { contains: token } },
              { position: { contains: token } }
            ]
          }))
        }
      }
    }),
    ...(staffId && { staff_id: staffId }),
    ...(statusId && { status_id: statusId })
  }

  const periodWhere = { month, year, ...(canReadAll ? {} : { staff_id: currentStaffId }) }

  try {
    const [payrolls, totalCount, periodPayrolls, statuses, paymentMethods, staff] = await Promise.all([
      prisma.hrmPayroll.findMany({ where, select: payrollSelect, orderBy: [{ created_at: 'desc' }], skip: (page - 1) * limit, take: limit }),
      prisma.hrmPayroll.count({ where }),
      prisma.hrmPayroll.findMany({ where: periodWhere, select: { amount_base: true, net_salary: true, unpaid_leave_deduction: true, tax_deduction: true, status: { select: { value: true } } } }),
      prisma.option.findMany({ where: { category: 'PAYROLL_STATUS', is_active: true }, select: { id: true, label: true, value: true }, orderBy: { sort_order: 'asc' } }),
      prisma.option.findMany({ where: { category: 'PAYROLL_PAYMENT_METHOD', is_active: true }, select: { id: true, label: true, value: true }, orderBy: { sort_order: 'asc' } }),
      prisma.hrmStaff.findMany({ where: canReadAll ? { status: 'ACTIVE' } : { id: currentStaffId }, select: { id: true, first_name: true, last_name: true, position: true }, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }] })
    ])

    const summary = periodPayrolls.reduce(
      (totals, payroll) => {
        const net = toFiniteNumber(payroll.amount_base)
        const netSalary = toFiniteNumber(payroll.net_salary)

        const transactionDeductions =
          toFiniteNumber(payroll.unpaid_leave_deduction) + toFiniteNumber(payroll.tax_deduction)

        const deductions = netSalary > 0 ? (transactionDeductions / netSalary) * net : 0

        totals.totalPayroll += net
        totals.totalDeductions += deductions

        if (payroll.status.value === 'PAID') totals.totalPaid += net
        else totals.totalPending += net

        return totals
      },
      { totalPayroll: 0, totalPaid: 0, totalPending: 0, totalDeductions: 0 }
    )

    return Response.json({
      success: true,
      data: {
        payrolls: payrolls.map(normalizePayroll),
        totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        summary,
        options: {
          statuses,
          paymentMethods,
          staff: staff.map(item => ({ ...item, full_name: `${item.first_name} ${item.last_name}`.trim() }))
        },
        currentStaffId,
        canManage
      }
    })
  } catch {
    return responseError(dictionary.messages.loadFailed, 500, 'PAYROLL_LOAD_FAILED')
  }
}
