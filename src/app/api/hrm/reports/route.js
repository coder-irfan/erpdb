import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'
import { convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'
import { hasAnyPermission } from '@/utils/rbac'

const REPORT_TYPES = ['payroll', 'attendance', 'leaves', 'contracts']
const REPORT_PERMISSIONS = ['hrm_reports:read', 'hrm:read']
const SALARY_REPORT_PERMISSIONS = ['finance:read', 'finance_salary:read', 'hrm_payroll:read']
const SUPPORTED_LOCALES = ['en', 'fa', 'ps']
const DAY_IN_MS = 86_400_000

const localeFrom = value => (SUPPORTED_LOCALES.includes(value) ? value : 'en')

const responseError = (error, status, code, details) =>
  Response.json({ success: false, error, code, ...(details && { details }) }, { status })

const toDateKey = date => date.toISOString().slice(0, 10)
const toMonthKey = date => date.toISOString().slice(0, 7)
const money = value => toFiniteNumber(value).toFixed(2)

const parseDate = (value, endOfDay = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null

  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)

  return Number.isNaN(date.getTime()) || toDateKey(date) !== value ? null : date
}

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
  const [records, setup] = await Promise.all([
    prisma.financesalary.findMany({
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
        amount_base: true,
        payment_date: true,
        staff: { select: { id: true, first_name: true, last_name: true, position: true } },
        status: true
      },
      orderBy: [{ timesheet_month: 'desc' }, { staff: { first_name: 'asc' } }]
    }),
    getCompanySetupRecord()
  ])

  const baseCurrency = setup.currency_code || 'AFN'

  const trendMap = new Map(
    months.map(period => [
      period,
      { period, base_salary: 0, allowances: 0, deductions: 0, net_payout: 0 }
    ])
  )

  const summary = records.reduce(
    (totals, record) => {
      const unpaidDeduction = Math.max(0, toFiniteNumber(record.base_salary) - toFiniteNumber(record.earned_salary))
      const deductions = unpaidDeduction + toFiniteNumber(record.loan_deduction)
      const netPayout = toFiniteNumber(record.amount_base)
      const baseSalary = convertToBaseCurrency(record.base_salary, record.currency, record.exchange_rate, baseCurrency)
      const allowances = convertToBaseCurrency(record.bonus_amount, record.currency, record.exchange_rate, baseCurrency)
      const baseDeductions = convertToBaseCurrency(deductions, record.currency, record.exchange_rate, baseCurrency)
      const trend = trendMap.get(record.timesheet_month)

      totals.total_base_salary += baseSalary
      totals.total_allowances += allowances
      totals.total_deductions += baseDeductions
      totals.total_net_payout += netPayout

      if (trend) {
        trend.base_salary += baseSalary
        trend.allowances += allowances
        trend.deductions += baseDeductions
        trend.net_payout += netPayout
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
    rows: records.map(record => ({
      id: record.id,
      period: record.timesheet_month,
      staff_id: record.staff.id,
      staff_name: staffName(record.staff),
      position: record.staff.position,
      base_salary: record.base_salary.toFixed(2),
      allowances: record.bonus_amount.toFixed(2),
      deductions: money(Math.max(0, toFiniteNumber(record.base_salary) - toFiniteNumber(record.earned_salary)) + toFiniteNumber(record.loan_deduction)),
      net_payout: record.payable_amount.toFixed(2),
      currency: record.currency,
      exchange_rate: record.exchange_rate.toFixed(4),
      amount_base: record.amount_base.toFixed(2),
      status: record.status,
      status_label: record.status === 'PAID' ? 'Paid' : 'Draft',
      payment_method: null,
      payment_date: record.payment_date?.toISOString() || null
    }))
  }
}

const getAttendanceReport = async ({ start, end, staffId, months }) => {
  const records = await prisma.hrmstafftimesheet.findMany({
    where: { date: { gte: start, lte: end }, ...(staffId && { staff_id: staffId }) },
    select: {
      id: true,
      date: true,
      status: true,
      hours_worked: true,
      staff: { select: { id: true, first_name: true, last_name: true, position: true } }
    },
    orderBy: [{ date: 'desc' }, { staff: { first_name: 'asc' } }]
  })

  const workingDays = new Set(records.map(record => toDateKey(record.date))).size
  const presentCount = records.filter(record => record.status === 'PRESENT').length
  const totalHours = records.reduce((total, record) => total + Number(record.hours_worked || 0), 0)
  const staffMap = new Map()

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

    const statusKey = record.status.toLowerCase()
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
      presence_rate: records.length ? Number(((presentCount / records.length) * 100).toFixed(2)) : 0,
      total_hours_logged: Number(totalHours.toFixed(2)),
      total_absences: records.filter(record => record.status === 'ABSENT').length
    },
    trend: [...trendMap.values()].map(item => ({ ...item, hours: Number(item.hours.toFixed(2)) })),
    rows: [...staffMap.values()].map(item => ({
      ...item,
      total_hours: item.total_hours.toFixed(2),
      presence_rate: item.total_records ? Number(((item.present / item.total_records) * 100).toFixed(2)) : 0
    }))
  }
}

const getLeaveReport = async ({ start, end, staffId }) => {
  const records = await prisma.hrmstaffleave.findMany({
    where: {
      start_date: { lte: end },
      end_date: { gte: start },
      ...(staffId && { staff_id: staffId })
    },
    select: {
      id: true,
      staff_id: true,
      total_days: true,
      start_date: true,
      end_date: true,
      status: { select: { label: true, value: true } },
      leave_type: { select: { id: true, label: true, value: true } }
    },
    orderBy: { start_date: 'desc' }
  })

  const staffIds = [
    ...new Set(
      records
        .map(record => record.staff_id)
        .filter(id => typeof id === 'string' && id.trim().length > 0)
    )
  ]

  const staffRecords = staffIds.length
    ? await prisma.hrmstaff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, first_name: true, last_name: true, position: true }
      })
    : []

  const staffById = new Map(staffRecords.map(staff => [staff.id, staff]))
  const staffMap = new Map()
  const typeMap = new Map()
  let totalApprovedDays = 0
  let pendingRequests = 0

  records.forEach(record => {
    const staff = staffById.get(record.staff_id)

    if (!staff) return

    const current = staffMap.get(staff.id) || {
      id: staff.id,
      staff_name: staffName(staff),
      position: staff.position,
      approved_days: 0,
      pending_requests: 0,
      rejected_requests: 0,
      leave_types: new Map()
    }

    if (record.status.value === 'APPROVED') {
      const clippedStart = record.start_date < start ? start : record.start_date
      const clippedEnd = record.end_date > end ? end : record.end_date
      const overlapDays = Math.floor((clippedEnd.getTime() - clippedStart.getTime()) / DAY_IN_MS) + 1
      const fullRangeDays = Math.floor((record.end_date.getTime() - record.start_date.getTime()) / DAY_IN_MS) + 1
      const approvedDays = Number(record.total_days) * (overlapDays / fullRangeDays)

      totalApprovedDays += approvedDays
      current.approved_days += approvedDays
      current.leave_types.set(
        record.leave_type.label,
        (current.leave_types.get(record.leave_type.label) || 0) + approvedDays
      )
      typeMap.set(record.leave_type.value, {
        name: record.leave_type.label,
        value: (typeMap.get(record.leave_type.value)?.value || 0) + approvedDays
      })
    } else if (record.status.value === 'PENDING') {
      pendingRequests += 1
      current.pending_requests += 1
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
      allowance_days: null,
      remaining_days: null
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
      position_title: true,
      base_salary: true,
      currency: true,
      exchange_rate: true,
      amount_base: true,
      start_date: true,
      end_date: true,
      staff: { select: { id: true, first_name: true, last_name: true, position: true } },
      contract_type: { select: { label: true, value: true } },
      status: { select: { label: true, value: true } }
    },
    orderBy: [{ end_date: 'asc' }, { staff: { first_name: 'asc' } }]
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

      return {
        id: contract.id,
        contract_number: contract.contract_number,
        staff_id: contract.staff.id,
        staff_name: staffName(contract.staff),
        position: contract.position_title || contract.staff.position,
        contract_type: contract.contract_type.label,
        base_salary: contract.base_salary.toFixed(2),
        currency: contract.currency,
        exchange_rate: contract.exchange_rate.toFixed(4),
        amount_base: contract.amount_base.toFixed(2),
        start_date: contract.start_date.toISOString(),
        end_date: contract.end_date.toISOString(),
        days_remaining: daysRemaining,
        renewal_status: daysRemaining < 0 ? 'EXPIRED' : daysRemaining <= 30 ? 'DUE_SOON' : 'UPCOMING',
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
