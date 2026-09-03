'use server'

import { i18n } from '@/configs/i18n'
import { SYSTEM_STATUS_VALUES } from '@/data/systemStatuses'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { ACTIVE_OPERATIONAL_STATUSES, CLOSED_LOAN_STATUSES } from '@/libs/financialStatuses'
import { normalizeLoanStatusOption } from '@/libs/financeLoans'
import { prisma } from '@/libs/prisma'
import { formatAfghanDate, formatAfghanMonthYear } from '@/utils/afghanDate'
import { resolveDashboardPeriod } from '@/utils/dashboardPeriod'
import { hasPermission } from '@/utils/rbac'
import { roundMoney, subtractMoney } from '@/utils/formatCurrency'

const DAY_IN_MS = 86_400_000
const CLOSED_LEADS = ['WON', 'LOST', 'CONVERTED', 'CLOSED']
const CLOSED_CONTRACTS = ['EXPIRED', 'TERMINATED', 'CANCELLED', 'COMPLETED']
const ACTIVE_PROJECTS = ACTIVE_OPERATIONAL_STATUSES
const CLOSED_TASKS = ['COMPLETED', 'DONE', 'CANCELLED']
const CLOSED_LOANS = CLOSED_LOAN_STATUSES

const toNumber = value => {
  const number = Number(value ?? 0)

  return Number.isFinite(number) ? number : 0
}

const round = value => roundMoney(value)
const iso = value => value?.toISOString() || null
const fullName = staff => [staff?.first_name, staff?.last_name].filter(Boolean).join(' ').trim()

const serializeForClient = value => {
  if (value === null || value === undefined || typeof value !== 'object') return value

  if (value instanceof Date) return value.toISOString()
  if (value.constructor?.name === 'Decimal') return toNumber(value)
  if (Array.isArray(value)) return value.map(serializeForClient)

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeForClient(item)]))
}

const startOfMonth = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
const startOfYear = date => new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
const startOfDay = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
const addMonths = (date, amount) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1))
const addYears = (date, amount) => new Date(Date.UTC(date.getUTCFullYear() + amount, 0, 1))

const addDays = (date, amount) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount))

const monthKey = date => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
const dayKey = date => date.toISOString().slice(0, 10)
const yearKey = date => String(date.getUTCFullYear())

const dateWindow = (start, endExclusive) => ({
  ...(start && { gte: start }),
  ...(endExclusive && { lt: endExclusive })
})

const rangeWindow = range => dateWindow(range.start, range.endExclusive)
const previousRangeWindow = range => dateWindow(range.previousStart, range.previousEndExclusive)

const monthWindow = (start, endExclusive) => ({
  ...(start && { gte: monthKey(start) }),
  ...(endExclusive && { lte: monthKey(addDays(endExclusive, -1)) })
})

const growth = (current, previous) => {
  if (!previous) return current ? 100 : 0

  return round(((current - previous) / Math.abs(previous)) * 100)
}

const paidBase = row => {
  const total = toNumber(row.total_amount)

  return total > 0 ? toNumber(row.amount_base) * Math.min(1, Math.max(0, toNumber(row.paid_amount) / total)) : 0
}

const outstandingBase = row => {
  const total = toNumber(row.total_amount)

  return total > 0 ? toNumber(row.amount_base) * Math.min(1, Math.max(0, toNumber(row.remind_amount) / total)) : 0
}

const buildPeriodBuckets = ({ range, dates = [], locale }) => {
  const validDates = dates.filter(date => date instanceof Date && !Number.isNaN(date.getTime()))

  const earliestTimestamp = validDates.reduce(
    (minimum, date) => Math.min(minimum, date.getTime()),
    Number.POSITIVE_INFINITY
  )

  const earliest = Number.isFinite(earliestTimestamp) ? new Date(earliestTimestamp) : null
  const endExclusive = range.endExclusive
  const start = range.start || earliest || addMonths(startOfMonth(endExclusive), -11)
  const spanDays = Math.max(1, Math.ceil((endExclusive.getTime() - start.getTime()) / DAY_IN_MS))
  const unit = spanDays <= 62 ? 'DAY' : spanDays <= 1095 ? 'MONTH' : 'YEAR'
  const first = unit === 'DAY' ? startOfDay(start) : unit === 'MONTH' ? startOfMonth(start) : startOfYear(start)
  const keyFor = unit === 'DAY' ? dayKey : unit === 'MONTH' ? monthKey : yearKey
  const buckets = []

  for (
    let cursor = first;
    cursor < endExclusive;
    cursor = unit === 'DAY' ? addDays(cursor, 1) : unit === 'MONTH' ? addMonths(cursor, 1) : addYears(cursor, 1)
  ) {
    buckets.push({
      key: keyFor(cursor),
      month:
        unit === 'DAY'
          ? formatAfghanDate(cursor, locale, { dateStyle: 'short', timeZone: 'UTC' })
          : unit === 'MONTH'
            ? formatAfghanMonthYear(cursor, locale, { short: true, timeZone: 'UTC' })
            : yearKey(cursor),
      income: 0,
      expense: 0,
      salary: 0,
      net: 0,
      value: 0
    })
  }

  return { buckets, keyFor }
}

const getCapabilities = session => {
  const roles = new Set(session.user.roles || [])
  const can = (...permissions) => permissions.some(permission => hasPermission(session, permission))
  const isAdmin = roles.has('super_admin') || roles.has('admin')
  const isProjectManager = roles.has('project_manager') && !isAdmin
  const crm = isAdmin || can('crm:read', 'crm:write', 'crm_lead:read')
  const contracts = isAdmin || can('contracts:read', 'contracts:write')

  return {
    isAdmin,
    isProjectManager,
    finance: isAdmin || can('finance:read', 'finance:write', 'finance:delete'),
    crm,
    pipeline: crm || contracts,
    projects: isAdmin || can('projects:read', 'projects:write', 'projects:delete'),
    tasks: isAdmin || can('tasks:read', 'tasks:write', 'tasks:read_assigned'),
    hrm: isAdmin || can('hrm:read', 'hrm:write', 'hrm_timesheet:read', 'hrm_timesheet:write'),
    contracts,
    loans: isAdmin || roles.has('hr_manager') || can('finance:read', 'finance:write', 'finance_loan:read'),
    inventory: isAdmin || can('finance:read', 'finance:write', 'finance_inventory:read'),
    salary: isAdmin || roles.has('hr_manager') || can('hrm_payroll:read', 'hrm_payroll:write', 'finance:read'),
    staffOnly: false
  }
}

const loadFinanceAnalytics = async ({ range, locale }) => {
  const incomeSelect = {
    created_at: true,
    income_type_id: true,
    status: true,
    total_amount: true,
    paid_amount: true,
    remind_amount: true,
    amount_base: true
  }

  const expenseSelect = { expense_date: true, expense_type_id: true, amount_base: true }
  const salarySelect = { timesheet_month: true, amount_base: true }

  const [income, expenses, salaries, previousIncome, previousExpenses, previousSalaries] = await Promise.all([
    prisma.financeincome.findMany({ where: { created_at: rangeWindow(range) }, select: incomeSelect }),
    prisma.financeexpense.findMany({
      where: { approval_status: 'PAID', expense_date: rangeWindow(range) },
      select: expenseSelect
    }),
    prisma.financesalary.findMany({
      where: { timesheet_month: monthWindow(range.start, range.endExclusive) },
      select: salarySelect
    }),
    range.previousStart
      ? prisma.financeincome.findMany({
          where: { created_at: previousRangeWindow(range) },
          select: incomeSelect
        })
      : [],
    range.previousStart
      ? prisma.financeexpense.findMany({
          where: { approval_status: 'PAID', expense_date: previousRangeWindow(range) },
          select: expenseSelect
        })
      : [],
    range.previousStart
      ? prisma.financesalary.findMany({
          where: { timesheet_month: monthWindow(range.previousStart, range.previousEndExclusive) },
          select: salarySelect
        })
      : []
  ])

  const salaryDates = salaries.map(row => new Date(`${row.timesheet_month}-01T00:00:00.000Z`))

  const { buckets, keyFor } = buildPeriodBuckets({
    range,
    dates: [...income.map(row => row.created_at), ...expenses.map(row => row.expense_date), ...salaryDates],
    locale
  })

  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]))

  income.forEach(row => {
    const bucket = bucketMap.get(keyFor(row.created_at))

    if (bucket) bucket.income += toNumber(row.amount_base)
  })
  expenses.forEach(row => {
    const bucket = bucketMap.get(keyFor(row.expense_date))

    if (bucket) bucket.expense += toNumber(row.amount_base)
  })
  salaries.forEach((row, index) => {
    const bucket = bucketMap.get(keyFor(salaryDates[index]))

    if (bucket) bucket.salary += toNumber(row.amount_base)
  })

  const cashFlow = buckets.map(({ key, value, ...bucket }) => ({
    ...bucket,
    income: round(bucket.income),
    expense: round(bucket.expense + bucket.salary),
    operatingExpense: round(bucket.expense),
    salary: round(bucket.salary),
    net: round(bucket.income - bucket.expense - bucket.salary)
  }))

  const incomeTotals = rows => ({
    total: rows.reduce((sum, row) => sum + toNumber(row.amount_base), 0),
    collected: rows.reduce((sum, row) => sum + (row.status === 'PAID' ? toNumber(row.amount_base) : paidBase(row)), 0),
    pending: rows.reduce((sum, row) => sum + (row.status === 'PAID' ? 0 : outstandingBase(row)), 0)
  })

  const sumAmount = rows => rows.reduce((sum, row) => sum + toNumber(row.amount_base), 0)
  const currentIncome = incomeTotals(income)
  const previousIncomeTotals = incomeTotals(previousIncome)
  const currentExpense = sumAmount(expenses) + sumAmount(salaries)
  const previousExpense = sumAmount(previousExpenses) + sumAmount(previousSalaries)
  const currentNet = subtractMoney(currentIncome.total, currentExpense)
  const previousNet = subtractMoney(previousIncomeTotals.total, previousExpense)
  const incomeGroups = new Map()
  const expenseGroups = new Map()

  income.forEach(row =>
    incomeGroups.set(row.income_type_id, toNumber(incomeGroups.get(row.income_type_id)) + toNumber(row.amount_base))
  )
  expenses.forEach(row =>
    expenseGroups.set(row.expense_type_id, toNumber(expenseGroups.get(row.expense_type_id)) + toNumber(row.amount_base))
  )

  const options = await prisma.option.findMany({
    where: { id: { in: [...incomeGroups.keys(), ...expenseGroups.keys()] } },
    select: { id: true, label: true, value: true, color_code: true }
  })

  const optionMap = new Map(options.map(option => [option.id, option]))

  return {
    kpis: {
      netProfit: round(currentNet),
      netGrowth: range.previousStart ? growth(currentNet, previousNet) : null,
      revenue: round(currentIncome.collected),
      pendingRevenue: round(currentIncome.pending),
      revenueGrowth: range.previousStart ? growth(currentIncome.collected, previousIncomeTotals.collected) : null,
      expenses: round(currentExpense),
      expenseGrowth: range.previousStart ? growth(currentExpense, previousExpense) : null,
      netSparkline: cashFlow.map(row => row.net),
      revenueSparkline: cashFlow.map(row => row.income),
      expenseSparkline: cashFlow.map(row => row.expense)
    },
    cashFlow,
    incomeDistribution: [...incomeGroups.entries()]
      .map(([id, value]) => ({
        id,
        label: optionMap.get(id)?.label || 'Other income',
        value: round(value),
        color: optionMap.get(id)?.color_code || 'primary'
      }))
      .filter(item => item.value > 0)
      .sort((left, right) => right.value - left.value),
    expenseDistribution: [
      ...[...expenseGroups.entries()].map(([id, value]) => ({
        id,
        label: optionMap.get(id)?.label || 'Operations',
        value: round(value),
        color: optionMap.get(id)?.color_code || 'warning'
      })),
      ...(sumAmount(salaries) > 0
        ? [{ id: 'PAYROLL', label: 'Payroll', value: round(sumAmount(salaries)), color: 'info' }]
        : [])
    ]
      .filter(item => item.value > 0)
      .sort((left, right) => right.value - left.value)
  }
}

const loadPipelineAnalytics = async ({ range, locale, today, canViewLeads, canViewContracts }) => {
  const leadPeriodWhere = { created_at: rangeWindow(range) }

  const leadWhere = {
    ...leadPeriodWhere,
    status: { is: { value: { notIn: CLOSED_LEADS } } }
  }

  const contractWhere = {
    created_at: rangeWindow(range),
    end_date: { gte: today },
    status: { is: { value: { notIn: CLOSED_CONTRACTS } } }
  }

  const previousLeadWhere = {
    created_at: previousRangeWindow(range),
    status: { is: { value: { notIn: CLOSED_LEADS } } }
  }

  const previousContractWhere = {
    created_at: previousRangeWindow(range),
    status: { is: { value: { notIn: CLOSED_CONTRACTS } } }
  }

  const [leads, contracts, previousLeads, previousContracts, funnelGroups, leadStatuses] = await Promise.all([
    canViewLeads ? prisma.crmlead.findMany({ where: leadWhere, select: { amount_base: true, created_at: true } }) : [],
    canViewContracts
      ? prisma.contract.findMany({ where: contractWhere, select: { amount_base: true, created_at: true } })
      : [],
    canViewLeads && range.previousStart
      ? prisma.crmlead.findMany({ where: previousLeadWhere, select: { amount_base: true } })
      : [],
    canViewContracts && range.previousStart
      ? prisma.contract.findMany({ where: previousContractWhere, select: { amount_base: true } })
      : [],
    canViewLeads
      ? prisma.crmlead.groupBy({
          where: leadPeriodWhere,
          by: ['status_id'],
          _count: { _all: true },
          _sum: { amount_base: true }
        })
      : [],
    canViewLeads
      ? prisma.option.findMany({
          where: { category: 'LEAD_STATUS', value: { in: SYSTEM_STATUS_VALUES.LEAD_STATUS }, is_active: true },
          orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
          select: { id: true, label: true, value: true, color_code: true }
        })
      : []
  ])

  const { buckets, keyFor } = buildPeriodBuckets({
    range,
    dates: [...leads.map(row => row.created_at), ...contracts.map(row => row.created_at)],
    locale
  })

  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]))

  ;[...leads, ...contracts].forEach(row => {
    const bucket = bucketMap.get(keyFor(row.created_at))

    if (bucket) bucket.value += toNumber(row.amount_base)
  })

  const statusMap = new Map(funnelGroups.map(group => [group.status_id, group]))
  const sparkline = buckets.map(bucket => round(bucket.value))
  const pipelineValue = rows => rows.reduce((sum, row) => sum + toNumber(row.amount_base), 0)
  const currentValue = pipelineValue(leads) + pipelineValue(contracts)
  const previousValue = pipelineValue(previousLeads) + pipelineValue(previousContracts)

  return {
    value: round(currentValue),
    dealCount: leads.length + contracts.length,
    leadCount: leads.length,
    contractCount: contracts.length,
    growth: range.previousStart ? growth(currentValue, previousValue) : null,
    sparkline,
    funnel: leadStatuses.map(status => ({
      id: status.id,
      label: status.label,
      status: status.value,
      color: status.color_code || 'primary',
      count: statusMap.get(status.id)?._count._all || 0,
      value: round(statusMap.get(status.id)?._sum.amount_base)
    }))
  }
}

const loadWorkforceSnapshot = async ({ range, locale }) => {
  const [active, history] = await Promise.all([
    prisma.hrmstaff.count({ where: { status: 'ACTIVE' } }),
    prisma.hrmstafftimesheet.findMany({
      where: { date: rangeWindow(range), check_in_time: { not: null } },
      select: { date: true, staff_id: true }
    })
  ])

  const { buckets, keyFor } = buildPeriodBuckets({ range, dates: history.map(row => row.date), locale })
  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]))

  history.forEach(row => {
    const bucket = bucketMap.get(keyFor(row.date))

    if (bucket) bucket.value += 1
  })

  const checkedIn = new Set(history.map(row => row.staff_id)).size

  return {
    active,
    checkedIn,
    attendanceRate: active ? round((checkedIn / active) * 100) : 0,
    sparkline: buckets.map(bucket => bucket.value)
  }
}

const loadOperationsAnalytics = async ({ projectWhere, range, locale, canViewAttendance }) => {
  const createdInRange = { created_at: rangeWindow(range) }

  const activeWhere = {
    AND: [projectWhere, createdInRange, { status: { is: { value: { in: ACTIVE_PROJECTS } } } }]
  }

  const taskScope = { project: { is: projectWhere } }

  const pendingTaskWhere = {
    AND: [taskScope, createdInRange, { status: { is: { value: { notIn: CLOSED_TASKS } } } }]
  }

  const attendanceWhere = canViewAttendance
    ? {
        date: rangeWindow(range),
        check_in_time: { not: null },
        ...(Object.keys(projectWhere).length ? { project: { is: projectWhere } } : {})
      }
    : { id: '__NO_ATTENDANCE__' }

  const [activeCount, pendingTasks, checkedIn, projects, activityProjects, activityTasks] = await Promise.all([
    prisma.project.count({ where: activeWhere }),
    prisma.task.count({ where: pendingTaskWhere }),
    canViewAttendance ? prisma.hrmstafftimesheet.count({ where: attendanceWhere }) : 0,
    prisma.project.findMany({
      where: activeWhere,
      take: 6,
      orderBy: [{ priority: { sort_order: 'desc' } }, { end_date: 'asc' }, { updated_at: 'desc' }],
      select: {
        id: true,
        project_code: true,
        title: true,
        end_date: true,
        estimated_hours: true,
        actual_hours: true,
        client: { select: { company_name: true } },
        priority: { select: { label: true, value: true, color_code: true } },
        tasks: {
          where: { created_at: rangeWindow(range) },
          select: { status: { select: { value: true } } }
        },
        timesheets: {
          where: { date: rangeWindow(range) },
          select: { hours_worked: true }
        }
      }
    }),
    prisma.project.findMany({
      where: { AND: [projectWhere, createdInRange] },
      select: { created_at: true }
    }),
    prisma.task.findMany({
      where: { AND: [taskScope, createdInRange] },
      select: { created_at: true }
    })
  ])

  const { buckets, keyFor } = buildPeriodBuckets({
    range,
    dates: [...activityProjects.map(row => row.created_at), ...activityTasks.map(row => row.created_at)],
    locale
  })

  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]))

  ;[...activityProjects, ...activityTasks].forEach(row => {
    const bucket = bucketMap.get(keyFor(row.created_at))

    if (bucket) bucket.value += 1
  })

  return {
    activeProjects: activeCount,
    pendingTasks,
    checkedIn,
    ratio: `${activeCount}:${pendingTasks}`,
    sparkline: buckets.map(bucket => bucket.value),
    projects: projects.map(project => {
      const totalTasks = project.tasks.length
      const completedTasks = project.tasks.filter(task => CLOSED_TASKS.includes(task.status.value)).length
      const loggedHours = project.timesheets.reduce((sum, row) => sum + toNumber(row.hours_worked), 0)

      return {
        id: project.id,
        code: project.project_code,
        title: project.title,
        client: project.client.company_name,
        priority: project.priority,
        endDate: iso(project.end_date),
        totalTasks,
        completedTasks,
        taskProgress: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
        estimatedHours: round(project.estimated_hours),
        actualHours: round(project.actual_hours),
        loggedHours: round(loggedHours)
      }
    })
  }
}

const loadUrgentActions = async ({ capabilities, today, staffId }) => {
  const nextThirtyDays = addDays(today, 30)

  const loanWhere = {
    remaining_balance: { gt: 0 },
    status: { is: { value: { notIn: CLOSED_LOANS } } },
    ...(!capabilities.isAdmin && capabilities.staffOnly && staffId ? { staff_id: staffId } : {})
  }

  const [outstanding, expirations, loans, loanPortfolio, inventory] = await Promise.all([
    capabilities.finance || capabilities.contracts
      ? prisma.financeincome.findMany({
          where: { remind_amount: { gt: 0 }, status: { not: 'PAID' } },
          take: 6,
          orderBy: [{ remind_date: 'asc' }, { created_at: 'asc' }],
          select: {
            id: true,
            name: true,
            total_amount: true,
            remind_amount: true,
            amount_base: true,
            currency: true,
            exchange_rate: true,
            remind_date: true,
            client: { select: { company_name: true, primary_contact_name: true } },
            invoice: { select: { invoice_number: true } }
          }
        })
      : [],
    capabilities.contracts
      ? prisma.contract.findMany({
          where: {
            end_date: { gte: today, lte: nextThirtyDays },
            status: { is: { value: { notIn: CLOSED_CONTRACTS } } }
          },
          take: 6,
          orderBy: { end_date: 'asc' },
          select: {
            id: true,
            contract_number: true,
            title: true,
            end_date: true,
            amount_base: true,
            client: { select: { company_name: true } },
            status: { select: { label: true, value: true, color_code: true } }
          }
        })
      : [],
    capabilities.loans
      ? prisma.financeloan.findMany({
          where: loanWhere,
          take: 6,
          orderBy: [{ issue_date: 'asc' }, { remaining_balance: 'desc' }],
          select: {
            id: true,
            loan_type: true,
            loan_number: true,
            entity_name: true,
            total_amount: true,
            remaining_balance: true,
            monthly_deduction: true,
            amount_base: true,
            currency: true,
            exchange_rate: true,
            issue_date: true,
            staff: { select: { first_name: true, last_name: true } },
            status: { select: { label: true, value: true, color_code: true } },
            repayments: { select: { amount_base: true } }
          }
        })
      : [],
    capabilities.loans
      ? prisma.financeloan.findMany({
          where: loanWhere,
          select: {
            loan_type: true,
            total_amount: true,
            repaid_amount: true,
            remaining_balance: true,
            amount_base: true,
            repayments: { select: { amount_base: true } }
          }
        })
      : [],
    capabilities.inventory
      ? prisma.inventory.findMany({
          orderBy: [{ quantity_in_stock: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            sku_code: true,
            quantity_in_stock: true,
            reorder_level: true,
            category: { select: { label: true } }
          }
        })
      : []
  ])

  const remainingBase = row => {
    const principalBase = toNumber(row.amount_base)
    const ledgerRepaidBase = (row.repayments || []).reduce((sum, repayment) => sum + toNumber(repayment.amount_base), 0)

    if (ledgerRepaidBase > 0) return Math.max(0, principalBase - ledgerRepaidBase)

    return toNumber(row.total_amount)
      ? principalBase * Math.min(1, Math.max(0, toNumber(row.remaining_balance) / toNumber(row.total_amount)))
      : 0
  }

  const lowInventory = inventory
    .filter(item => item.quantity_in_stock <= item.reorder_level)
    .slice(0, 6)
    .map(item => ({ ...item, stockState: item.quantity_in_stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK' }))

  const loanTotals = loanPortfolio.reduce(
    (totals, row) => {
      const balance = remainingBase(row)

      totals.count += 1
      totals.remaining += balance

      if (row.loan_type === 'CORPORATE') {
        totals.corporateCount += 1
        totals.corporateLiabilities += balance
      } else {
        totals.staffCount += 1
        totals.staffReceivables += balance
      }

      return totals
    },
    { count: 0, remaining: 0, staffCount: 0, staffReceivables: 0, corporateCount: 0, corporateLiabilities: 0 }
  )

  return {
    outstanding: outstanding.map(row => ({
      id: row.id,
      title: row.client?.company_name || row.client?.primary_contact_name || row.name,
      reference: row.invoice?.invoice_number || row.name,
      dueDate: iso(row.remind_date),
      amount: toNumber(row.remind_amount),
      amountBase: round(outstandingBase(row)),
      currency: row.currency,
      exchangeRate: toNumber(row.exchange_rate)
    })),
    contracts: expirations.map(row => ({
      id: row.id,
      contractNumber: row.contract_number,
      title: row.title,
      endDate: iso(row.end_date),
      amountBase: round(row.amount_base),
      client: row.client,
      status: row.status
    })),
    loans: loans.map(row => {
      const baseBalance = remainingBase(row)

      return {
        id: row.id,
        loanType: row.loan_type,
        loan_number: row.loan_number,
        entityName: row.entity_name,
        totalAmount: round(row.total_amount),
        remainingBalance: round(row.remaining_balance),
        monthlyDeduction: round(row.monthly_deduction),
        amountBase: round(baseBalance),
        currency: row.currency,
        exchangeRate: toNumber(row.exchange_rate),
        staff: row.staff,
        status: normalizeLoanStatusOption(row.status),
        borrower: fullName(row.staff) || row.entity_name || row.loan_number,
        issueDate: iso(row.issue_date)
      }
    }),
    loanTotals: Object.fromEntries(Object.entries(loanTotals).map(([key, value]) => [key, round(value)])),
    inventory: lowInventory
  }
}

const loadPersonalSnapshot = async ({ staffId, today, range }) => {
  if (!staffId) return null

  const assignedTask = { assignees: { some: { staff_id: staffId } } }
  const taskRange = { created_at: rangeWindow(range) }

  const [openTasks, overdueTasks, attendance, hours, loan] = await Promise.all([
    prisma.task.count({
      where: { AND: [assignedTask, taskRange, { status: { is: { value: { notIn: CLOSED_TASKS } } } }] }
    }),
    prisma.task.count({
      where: {
        AND: [
          assignedTask,
          taskRange,
          { due_date: { lt: today } },
          { status: { is: { value: { notIn: CLOSED_TASKS } } } }
        ]
      }
    }),
    prisma.hrmstafftimesheet.findFirst({
      where: { staff_id: staffId, date: today },
      select: { status: true, check_in_time: true, check_out_time: true, hours_worked: true }
    }),
    prisma.hrmstafftimesheet.aggregate({
      where: { staff_id: staffId, date: rangeWindow(range) },
      _sum: { hours_worked: true }
    }),
    prisma.financeloan.findMany({
      where: {
        staff_id: staffId,
        remaining_balance: { gt: 0 },
        status: { is: { value: { notIn: CLOSED_LOANS } } }
      },
      select: {
        total_amount: true,
        remaining_balance: true,
        amount_base: true,
        repayments: { select: { amount_base: true } }
      }
    })
  ])

  return {
    openTasks,
    overdueTasks,
    attendance: attendance
      ? {
          ...attendance,
          check_in_time: iso(attendance.check_in_time),
          check_out_time: iso(attendance.check_out_time),
          hours_worked: round(attendance.hours_worked)
        }
      : null,
    periodHours: round(hours._sum.hours_worked),
    loans: {
      count: loan.length,
      balance: round(
        loan.reduce((sum, row) => {
          const repaidBase = row.repayments.reduce((total, repayment) => total + toNumber(repayment.amount_base), 0)

          const fallbackBalance = toNumber(row.total_amount)
            ? toNumber(row.amount_base) * (toNumber(row.remaining_balance) / toNumber(row.total_amount))
            : 0

          return sum + (repaidBase > 0 ? Math.max(0, toNumber(row.amount_base) - repaidBase) : fallbackBalance)
        }, 0)
      )
    }
  }
}

export const getDashboardData = async (payload = {}) => {
  const authorization = await authorizeAction(['dashboard:read'])

  if (!authorization.authorized) return { success: false, code: authorization.code, error: authorization.error }

  const locale = i18n.locales.includes(payload.locale) ? payload.locale : i18n.defaultLocale
  const now = new Date()
  const today = startOfDay(now)
  const range = resolveDashboardPeriod(payload, now)
  const session = authorization.session
  const capabilities = getCapabilities(session)

  try {
    const [setup, staff] = await Promise.all([
      getCompanySetupRecord(),
      prisma.hrmstaff.findUnique({
        where: { user_id: session.user.id },
        select: { id: true, first_name: true, last_name: true, position: true, user: { select: { image: true } } }
      })
    ])

    capabilities.staffOnly = !(
      capabilities.isAdmin ||
      capabilities.finance ||
      capabilities.pipeline ||
      capabilities.projects ||
      capabilities.hrm ||
      capabilities.contracts
    )

    const noRecords = { id: '__NO_DASHBOARD_RECORDS__' }

    const projectWhere = capabilities.isProjectManager
      ? staff
        ? { OR: [{ project_manager_id: staff.id }, { members: { some: { staff_id: staff.id } } }] }
        : noRecords
      : capabilities.projects
        ? {}
        : noRecords

    const [finance, pipeline, operations, workforce, urgent, personal] = await Promise.all([
      capabilities.finance ? loadFinanceAnalytics({ range, locale }) : null,
      capabilities.pipeline
        ? loadPipelineAnalytics({
            range,
            locale,
            today,
            canViewLeads: capabilities.crm,
            canViewContracts: capabilities.contracts
          })
        : null,
      capabilities.projects
        ? loadOperationsAnalytics({
            projectWhere,
            range,
            locale,
            canViewAttendance: capabilities.hrm || capabilities.isProjectManager
          })
        : null,
      capabilities.hrm ? loadWorkforceSnapshot({ range, locale }) : null,
      loadUrgentActions({ capabilities, today, staffId: staff?.id }),
      capabilities.staffOnly ? loadPersonalSnapshot({ staffId: staff?.id, today, range }) : null
    ])

    const data = {
      success: true,
      data: {
        locale,
        period: {
          key: range.key,
          startDate: range.startDate,
          endDate: range.endDate,
          previousStartDate: range.previousStartDate,
          previousEndDate: range.previousEndDate
        },
        generatedAt: now.toISOString(),
        company: { name: setup.company_name, currency: 'AFN' },
        user: {
          id: session.user.id,
          name: session.user.name || fullName(staff) || session.user.email,
          image: session.user.image || staff?.user?.image || null,
          position: staff?.position || null,
          staffId: staff?.id || null
        },
        capabilities,
        finance,
        pipeline,
        operations,
        workforce,
        urgent,
        personal
      }
    }

    return serializeForClient(data)
  } catch {
    return { success: false, code: 'DASHBOARD_LOAD_FAILED', error: 'The dashboard data could not be loaded.' }
  }
}
