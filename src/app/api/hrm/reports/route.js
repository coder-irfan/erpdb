import { authorizeAction } from '@/libs/actionAuthorization'
import {
  HRM_REPORT_BASE_CURRENCY,
  calculateReportPresenceRate,
  getContractExpirationClassification,
  normalizePayrollReportAmounts
} from '@/libs/hrmReports'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'
import { toFiniteNumber } from '@/utils/formatCurrency'
import { hasAnyPermission } from '@/utils/rbac'
import { parseUtcDate, utcDateKey, utcMonthKey } from '@/utils/utcDate'
import { countAfghanistanWorkingDays } from '@/utils/payrollCalendar'

const REPORT_TYPES = ['payroll', 'attendance', 'leaves', 'contracts']
const REPORT_PERMISSIONS = ['hrm_reports:read', 'hrm:read']
const SALARY_REPORT_PERMISSIONS = ['finance:read', 'finance_salary:read', 'hrm_payroll:read']
const SUPPORTED_LOCALES = ['en', 'fa', 'ps']
const DAY_IN_MS = 86_400_000

const localeFrom = value => (SUPPORTED_LOCALES.includes(value) ? value : 'en')

const responseError = (error, status, code, details) =>
  Response.json({ success: false, error, code, ...(details && { details }) }, { status })

const toDateKey = utcDateKey
const toMonthKey = utcMonthKey
const money = value => toFiniteNumber(value).toFixed(2)

const parseDate = (value, endOfDay = false) => parseUtcDate(value, { endOfDay })

const buildMonths = (start, end) => {
  const months = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const finalMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))

  while (cursor <= finalMonth && months.length < 120) {
    months.push(toMonthKey(cursor))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return months
}

const staffName = staff => `${staff.first_name} ${staff.last_name}`.trim()

const getStaffOptions = () =>
  prisma.hrmstaff.findMany({
    select: { id: true, first_name: true, last_name: true, position: true, status: true },
    orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
  })

const getPayrollReport = async ({ start, end, staffId, months }) => {
  const records = await prisma.financesalary.findMany({
      where: { ...(staffId && { staff_id: staffId }), timesheet_month: { in: months } },
      select: {
        id: true,
        timesheet_month: true,
        base_salary: true,
        earned_salary: true,
        bonus_amount: true,
        loan_deduction: true,
        payable_amount: true,
        currency: true,
        exchange_rate: true,
        payment_date: true,
        staff: { select: { id: true, first_name: true, last_name: true, position: true } },
        status: true
      },
      orderBy: { created_at: 'desc' }
    })

  const trendMap = new Map(
    months.map(period => [
      period,
      { period, base_salary: 0, allowances: 0, deductions: 0, net_payout: 0 }
    ])
  )

  const summary = records.reduce(
    (totals, record) => {
      const amounts = normalizePayrollReportAmounts(record)
      const trend = trendMap.get(record.timesheet_month)

      totals.total_base_salary += amounts.baseSalary
      totals.total_allowances += amounts.allowances
      totals.total_deductions += amounts.deductions
      totals.total_net_payout += amounts.netPayout

      if (trend) {
        trend.base_salary += amounts.baseSalary
        trend.allowances += amounts.allowances
        trend.deductions += amounts.deductions
        trend.net_payout += amounts.netPayout
      }

      return totals
    },
    { total_base_salary: 0, total_allowances: 0, total_deductions: 0, total_net_payout: 0 }
  )

  return {
    summary: Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, money(value)])),
    trend: [...trendMap.values()].map(item => ({
      ...item,
      base_salary: Number(money(item.base_salary)),
      allowances: Number(money(item.allowances)),
      deductions: Number(money(item.deductions)),
      net_payout: Number(money(item.net_payout))
    })),
    base_currency: HRM_REPORT_BASE_CURRENCY,
    rows: records.map(record => {
      const amounts = normalizePayrollReportAmounts(record)

      return {
        id: record.id,
        period: record.timesheet_month,
        staff_id: record.staff.id,
        staff_name: staffName(record.staff),
        position: record.staff.position,
        base_salary: money(amounts.baseSalary),
        allowances: money(amounts.allowances),
        deductions: money(amounts.deductions),
        net_payout: money(amounts.netPayout),
        currency: HRM_REPORT_BASE_CURRENCY,
        original_base_salary: money(amounts.original.baseSalary),
        original_allowances: money(amounts.original.allowances),
        original_deductions: money(amounts.original.deductions),
        original_net_payout: money(amounts.original.netPayout),
        original_currency: amounts.original.currency,
        exchange_rate: amounts.original.exchangeRate.toFixed(4),
        status: record.status,
        status_label: record.status === 'PAID' ? 'Paid' : record.status === 'FINALIZED' ? 'Finalized' : 'Draft',
        payment_method: null,
        payment_date: record.payment_date?.toISOString() || null
      }
    })
  }
}

const getAttendanceReport = async ({ start, end, staffId, months }) => {
  const [records, holidays, reportStaff] = await Promise.all([
    prisma.hrmstafftimesheet.findMany({
      where: { date: { gte: start, lte: end }, ...(staffId && { staff_id: staffId }) },
      select: {
        id: true,
        date: true,
        status: true,
        hours_worked: true,
        staff: { select: { id: true, first_name: true, last_name: true, position: true } }
      },
      orderBy: { created_at: 'desc' }
    }),
    prisma.companyholiday.findMany({
      where: { is_active: true, date: { gte: start, lte: end } },
      select: { date: true }
    }),
    prisma.hrmstaff.findMany({
      where: staffId ? { id: staffId } : { status: 'ACTIVE' },
      select: { id: true, first_name: true, last_name: true, position: true }
    })
  ])

  const workingDays = countAfghanistanWorkingDays(start, end, holidays.map(item => item.date))

  const presentCount = records.filter(record => record.status === 'PRESENT').length
  const totalHours = records.reduce((total, record) => total + Number(record.hours_worked || 0), 0)

  const staffMap = new Map(
    reportStaff.map(staff => [
      staff.id,
      {
        id: staff.id,
        staff_name: staffName(staff),
        position: staff.position,
        total_records: 0,
        present: 0,
        absent: 0,
        leave: 0,
        total_hours: 0
      }
    ])
  )

  const trendMap = new Map(
    months.map(period => [period, { period, present: 0, absent: 0, leave: 0, hours: 0 }])
  )

  records.forEach(record => {
    const current = staffMap.get(record.staff.id) || {
      id: record.staff.id,
      staff_name: staffName(record.staff),
      position: record.staff.position,
      total_records: 0,
      present: 0,
      absent: 0,
      leave: 0,
      total_hours: 0
    }

    const statusKey = record.status.toUpperCase().startsWith('LEAVE') ? 'leave' : record.status.toLowerCase()
    const trend = trendMap.get(toMonthKey(record.date))

    current.total_records += 1
    current.total_hours += Number(record.hours_worked || 0)
    if (Object.hasOwn(current, statusKey)) current[statusKey] += 1

    if (trend) {
      if (Object.hasOwn(trend, statusKey)) trend[statusKey] += 1
      trend.hours += Number(record.hours_worked || 0)
    }

    staffMap.set(record.staff.id, current)
  })

  return {
    summary: {
      total_working_days: workingDays,
      presence_rate: calculateReportPresenceRate(presentCount, workingDays * staffMap.size),
      total_hours_logged: Number(totalHours.toFixed(2)),
      total_absences: records.filter(record => record.status === 'ABSENT').length
    },
    trend: [...trendMap.values()].map(item => ({ ...item, hours: Number(item.hours.toFixed(2)) })),
    rows: [...staffMap.values()].map(item => ({
      ...item,
      working_days: workingDays,
      total_hours: item.total_hours.toFixed(2),
      presence_rate: calculateReportPresenceRate(item.present, workingDays)
    }))
  }
}

const getLeaveReport = async ({ start, end, staffId }) => {
  const [records, holidays, staffRecords, leaveTypes] = await Promise.all([
    prisma.hrmstaffleave.findMany({
      where: {
        start_date: { lte: end },
        end_date: { gte: start },
        ...(staffId && { staff_id: staffId })
      },
      select: {
        id: true,
        staff_id: true,
        total_days: true,
        duration_type: true,
        start_date: true,
        end_date: true,
        status: { select: { label: true, value: true } },
        leave_type: { select: { id: true, label: true, value: true } }
      },
      orderBy: { created_at: 'desc' }
    }),
    prisma.companyholiday.findMany({
      where: { is_active: true, date: { gte: start, lte: end } },
      select: { date: true }
    }),
    prisma.hrmstaff.findMany({
      where: staffId ? { id: staffId } : { status: 'ACTIVE' },
      select: { id: true, first_name: true, last_name: true, position: true },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
    }),
    prisma.option.findMany({
      where: { category: 'LEAVE_TYPE', is_active: true },
      select: { id: true, label: true, value: true, allowed_days_per_year: true },
      orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
    })
  ])

  const staffById = new Map(staffRecords.map(staff => [staff.id, staff]))

  const defaultAllowance = leaveTypes.reduce(
    (total, type) => total + toFiniteNumber(type.allowed_days_per_year),
    0
  )

  const holidayDates = holidays.map(item => item.date)

  const staffMap = new Map(
    staffRecords.map(staff => [
      staff.id,
      {
        id: staff.id,
        staff_name: staffName(staff),
        position: staff.position,
        approved_days: 0,
        pending_days: 0,
        pending_requests: 0,
        rejected_requests: 0,
        leave_types: new Map()
      }
    ])
  )

  const typeMap = new Map()
  let totalApprovedDays = 0
  let pendingRequests = 0

  records.forEach(record => {
    const staff = staffById.get(record.staff_id)

    if (!staff) return

    const current = staffMap.get(staff.id)

    if (!current) return

    const clippedStart = record.start_date < start ? start : record.start_date
    const clippedEnd = record.end_date > end ? end : record.end_date

    const recordDays =
      record.duration_type === 'HALF_DAY' ? 0.5 : countAfghanistanWorkingDays(clippedStart, clippedEnd, holidayDates)

    if (record.status.value === 'APPROVED') {
      totalApprovedDays += recordDays
      current.approved_days += recordDays
      current.leave_types.set(
        record.leave_type.label,
        (current.leave_types.get(record.leave_type.label) || 0) + recordDays
      )
      typeMap.set(record.leave_type.value, {
        name: record.leave_type.label,
        value: (typeMap.get(record.leave_type.value)?.value || 0) + recordDays
      })
    } else if (record.status.value === 'PENDING') {
      pendingRequests += 1
      current.pending_requests += 1
      current.pending_days += recordDays
    } else if (record.status.value === 'REJECTED') {
      current.rejected_requests += 1
    }

    staffMap.set(staff.id, current)
  })

  return {
    summary: {
      total_leaves_taken: totalApprovedDays,
      pending_requests_count: pendingRequests,
      leave_types_used: typeMap.size
    },
    trend: [...typeMap.values()],
    rows: [...staffMap.values()].map(item => ({
      ...item,
      leave_types: [...item.leave_types.entries()].map(([name, days]) => ({ name, days })),
      allowance_days: Number(defaultAllowance.toFixed(1)),
      remaining_days: Number(Math.max(0, defaultAllowance - item.approved_days - item.pending_days).toFixed(1)),
      policy_source: 'SYSTEM_DEFAULT',
      has_custom_policy: false,
      policy_assignment_url: `/options/hrm/leave-types?staff_id=${encodeURIComponent(item.id)}`,
      default_leave_types: leaveTypes.map(type => ({
        id: type.id,
        name: type.label,
        allowance_days: toFiniteNumber(type.allowed_days_per_year)
      }))
    }))
  }
}

const getContractReport = async ({ start, end, staffId, months }) => {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const thirtyDays = new Date(today.getTime() + 30 * DAY_IN_MS)
  const ninetyDays = new Date(today.getTime() + 90 * DAY_IN_MS)

  const contracts = await prisma.hrmstaffcontract.findMany({
    where: { ...(staffId && { staff_id: staffId }) },
    select: {
      id: true,
      contract_number: true,
      contract_type_id: true,
      template_id: true,
      duration_id: true,
      status_id: true,
      start_date: true,
      end_date: true,
      probation_days: true,
      notice_period_days: true,
      staff: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          position: true,
          salary: true,
          salary_currency: true,
          salary_exchange_rate: true,
          amount_base: true,
          status: true
        }
      },
      contract_type: { select: { id: true, label: true, value: true, category: true, is_active: true } },
      template: { select: { id: true, label: true, value: true, description: true, is_active: true } },
      duration: { select: { id: true, label: true, value: true, description: true, is_active: true } },
      status: { select: { id: true, label: true, value: true, color_code: true, is_active: true } }
    },
    orderBy: { created_at: 'desc' }
  })

  const trendMap = new Map(months.map(period => [period, { period, expirations: 0, starts: 0 }]))

  contracts.forEach(contract => {
    if (contract.end_date && contract.end_date >= start && contract.end_date <= end) {
      const trend = trendMap.get(toMonthKey(contract.end_date))

      if (trend) trend.expirations += 1
    }

    if (contract.start_date >= start && contract.start_date <= end) {
      const trend = trendMap.get(toMonthKey(contract.start_date))

      if (trend) trend.starts += 1
    }
  })

  const nextNinetyDayContracts = contracts.filter(
    contract => contract.end_date && contract.end_date >= today && contract.end_date <= ninetyDays
  )

  const expiringContracts = contracts.filter(
    contract => contract.end_date && contract.end_date >= start && contract.end_date <= end
  )

  return {
    summary: {
      active_contracts_count: contracts.filter(contract => contract.status.value === 'ACTIVE').length,
      expiring_30_days: nextNinetyDayContracts.filter(contract => contract.end_date <= thirtyDays).length,
      expiring_60_90_days: nextNinetyDayContracts.filter(contract => contract.end_date > thirtyDays).length,
      expired_in_range: contracts.filter(
        contract => contract.status.value === 'EXPIRED' && contract.end_date && contract.end_date >= start && contract.end_date <= end
      ).length
    },
    trend: [...trendMap.values()],
    rows: expiringContracts.map(contract => {
      const daysRemaining = Math.ceil((contract.end_date.getTime() - today.getTime()) / DAY_IN_MS)
      const expiration = getContractExpirationClassification(daysRemaining)

      return {
        id: contract.id,
        contract_number: contract.contract_number,
        staff_id: contract.staff.id,
        staff_status: contract.staff.status,
        staff_name: staffName(contract.staff),
        position: contract.staff.position,
        contract_type: contract.contract_type.label,
        base_salary: contract.staff.salary.toFixed(2),
        currency: contract.staff.salary_currency,
        exchange_rate: contract.staff.salary_exchange_rate.toFixed(4),
        amount_base: contract.staff.amount_base.toFixed(2),
        contract_type_id: contract.contract_type_id,
        template_id: contract.template_id,
        duration_id: contract.duration_id,
        status_id: contract.status_id,
        probation_days: contract.probation_days,
        notice_period_days: contract.notice_period_days,
        contract_type_details: contract.contract_type,
        template: contract.template,
        duration: contract.duration,
        start_date: contract.start_date.toISOString(),
        end_date: contract.end_date.toISOString(),
        days_remaining: daysRemaining,
        expiration_days: expiration.count,
        renewal_status: expiration.status,
        status: contract.status.value,
        status_label: contract.status.label
      }
    })
  }
}

export async function GET(request) {
  const authorization = await authorizeAction(REPORT_PERMISSIONS)
  const params = request.nextUrl.searchParams
  const locale = localeFrom(params.get('locale'))
  const dictionary = (await getDictionary(locale)).hrmReports

  if (!authorization.authorized) {
    const status = authorization.code === 'FORBIDDEN' ? 403 : 401

    return responseError(
      authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated,
      status,
      authorization.code
    )
  }

  const reportType = params.get('report_type') || 'payroll'
  const start = parseDate(params.get('start_date'))
  const end = parseDate(params.get('end_date'), true)
  const staffId = params.get('staff_id') || ''

  if (!REPORT_TYPES.includes(reportType)) return responseError(dictionary.messages.invalidReport, 400, 'INVALID_REPORT_TYPE')

  if (reportType === 'payroll' && !hasAnyPermission(authorization.session, SALARY_REPORT_PERMISSIONS)) {
    return responseError(dictionary.messages.forbidden, 403, 'FORBIDDEN')
  }

  if (!start || !end || start > end) return responseError(dictionary.messages.invalidDates, 400, 'INVALID_DATE_RANGE')

  const months = buildMonths(start, end)

  if (!months.length || months.length >= 120) return responseError(dictionary.messages.dateRangeTooLarge, 400, 'DATE_RANGE_TOO_LARGE')

  try {
    if (staffId) {
      const staffExists = await prisma.hrmstaff.count({ where: { id: staffId } })

      if (!staffExists) return responseError(dictionary.messages.staffNotFound, 404, 'STAFF_NOT_FOUND')
    }

    const [staff, report] = await Promise.all([
      getStaffOptions(),
      reportType === 'payroll'
        ? getPayrollReport({ start, end, staffId, months })
        : reportType === 'attendance'
          ? getAttendanceReport({ start, end, staffId, months })
          : reportType === 'leaves'
            ? getLeaveReport({ start, end, staffId })
            : getContractReport({ start, end, staffId, months })
    ])

    return Response.json({
      success: true,
      data: {
        report_type: reportType,
        range: { start_date: toDateKey(start), end_date: toDateKey(end) },
        ...report,
        staff: staff.map(item => ({ ...item, full_name: staffName(item) }))
      }
    })
  } catch (error) {
    console.error(`HRM ${reportType} report aggregation failed`, error)

    return responseError(dictionary.messages.loadFailed, 500, 'REPORT_LOAD_FAILED', {
      report_type: reportType,
      stage: `${reportType}_aggregation`,
      ...(process.env.NODE_ENV === 'development' && {
        message: error instanceof Error ? error.message : String(error)
      })
    })
  }
}
