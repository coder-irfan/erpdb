'use server'

import { i18n } from '@/configs/i18n'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { ACTIVE_OPERATIONAL_STATUSES, CLOSED_LOAN_STATUSES } from '@/libs/financialStatuses'
import { prisma } from '@/libs/prisma'
import { hasPermission } from '@/utils/rbac'

const PERIODS = new Set([6, 12])
const CLOSED_LEADS = ['WON', 'LOST', 'CONVERTED', 'CLOSED']
const CLOSED_CONTRACTS = ['EXPIRED', 'TERMINATED', 'CANCELLED', 'COMPLETED']
const ACTIVE_PROJECTS = ACTIVE_OPERATIONAL_STATUSES
const CLOSED_TASKS = ['COMPLETED', 'DONE', 'CANCELLED']
const CLOSED_LOANS = CLOSED_LOAN_STATUSES

const toNumber = value => {
  const number = Number(value ?? 0)

  return Number.isFinite(number) ? number : 0
}

const round = value => Number(toNumber(value).toFixed(2))
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
const startOfDay = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
const addMonths = (date, amount) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1))

const addDays = (date, amount) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount))

const monthKey = date => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

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

const buildMonthBuckets = (rangeStart, months, locale) =>
  Array.from({ length: months }, (_, index) => {
    const date = addMonths(rangeStart, index)

    return {
      key: monthKey(date),
      month: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date),
      income: 0,
      expense: 0,
      salary: 0,
      net: 0,
      value: 0
    }
  })

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

const loadFinanceAnalytics = async ({ rangeStart, months, locale }) => {
  const currentMonth = monthKey(startOfMonth(new Date()))
  const previousMonth = monthKey(addMonths(startOfMonth(new Date()), -1))

  const [
    totalIncome,
    totalExpense,
    totalSalary,
    paidIncome,
    partialIncome,
    trendIncome,
    trendExpense,
    trendSalary,
    incomeGroups,
    expenseGroups
  ] = await Promise.all([
    prisma.financeincome.aggregate({ _sum: { amount_base: true } }),
    prisma.financeexpense.aggregate({ _sum: { amount_base: true } }),
    prisma.financesalary.aggregate({ _sum: { amount_base: true } }),
    prisma.financeincome.aggregate({ where: { status: 'PAID' }, _sum: { amount_base: true } }),
    prisma.financeincome.findMany({
      where: { status: { not: 'PAID' } },
      select: { total_amount: true, paid_amount: true, remind_amount: true, amount_base: true }
    }),
    prisma.financeincome.findMany({
      where: { created_at: { gte: rangeStart } },
      select: { created_at: true, amount_base: true, total_amount: true, paid_amount: true }
    }),
    prisma.financeexpense.findMany({
      where: { expense_date: { gte: rangeStart } },
      select: { expense_date: true, amount_base: true }
    }),
    prisma.financesalary.findMany({
      where: { timesheet_month: { gte: monthKey(rangeStart) } },
      select: { timesheet_month: true, amount_base: true }
    }),
    prisma.financeincome.groupBy({ by: ['income_type_id'], _sum: { amount_base: true } }),
    prisma.financeexpense.groupBy({ by: ['expense_type_id'], _sum: { amount_base: true } })
  ])

  const buckets = buildMonthBuckets(rangeStart, months, locale)
  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]))

  trendIncome.forEach(row => {
    const bucket = bucketMap.get(monthKey(row.created_at))

    if (bucket) bucket.income += toNumber(row.amount_base)
  })
  trendExpense.forEach(row => {
    const bucket = bucketMap.get(monthKey(row.expense_date))

    if (bucket) bucket.expense += toNumber(row.amount_base)
  })
  trendSalary.forEach(row => {
    const bucket = bucketMap.get(row.timesheet_month)

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

  const incomeTypeIds = incomeGroups.map(group => group.income_type_id)
  const expenseTypeIds = expenseGroups.map(group => group.expense_type_id)

  const options = await prisma.option.findMany({
    where: { id: { in: [...incomeTypeIds, ...expenseTypeIds] } },
    select: { id: true, label: true, value: true, color_code: true }
  })

  const optionMap = new Map(options.map(option => [option.id, option]))
  const collected = toNumber(paidIncome._sum.amount_base) + partialIncome.reduce((sum, row) => sum + paidBase(row), 0)
  const pending = partialIncome.reduce((sum, row) => sum + outstandingBase(row), 0)
  const allIncome = toNumber(totalIncome._sum.amount_base)
  const allExpense = toNumber(totalExpense._sum.amount_base)
  const allSalary = toNumber(totalSalary._sum.amount_base)
  const current = cashFlow.find(row => row.key === currentMonth) || { net: 0, income: 0 }
  const previous = cashFlow.find(row => row.key === previousMonth) || { net: 0, income: 0 }

  return {
    kpis: {
      netProfit: round(allIncome - allExpense - allSalary),
      netGrowth: growth(current.net, previous.net),
      revenue: round(collected),
      pendingRevenue: round(pending),
      revenueGrowth: growth(current.income, previous.income),
      netSparkline: cashFlow.map(row => row.net),
      revenueSparkline: cashFlow.map(row => row.income)
    },
    cashFlow,
    incomeDistribution: incomeGroups
      .map(group => ({
        id: group.income_type_id,
        label: optionMap.get(group.income_type_id)?.label || 'Other income',
        value: round(group._sum.amount_base),
        color: optionMap.get(group.income_type_id)?.color_code || 'primary'
      }))
      .filter(item => item.value > 0)
      .sort((left, right) => right.value - left.value),
    expenseDistribution: [
      ...expenseGroups.map(group => ({
        id: group.expense_type_id,
        label: optionMap.get(group.expense_type_id)?.label || 'Operations',
        value: round(group._sum.amount_base),
        color: optionMap.get(group.expense_type_id)?.color_code || 'warning'
      })),
      ...(allSalary > 0 ? [{ id: 'PAYROLL', label: 'Payroll', value: round(allSalary), color: 'info' }] : [])
    ]
      .filter(item => item.value > 0)
      .sort((left, right) => right.value - left.value)
  }
}

const loadPipelineAnalytics = async ({ rangeStart, months, locale, today, canViewLeads, canViewContracts }) => {
  const leadWhere = { status: { is: { value: { notIn: CLOSED_LEADS } } } }

  const contractWhere = {
    end_date: { gte: today },
    status: { is: { value: { notIn: CLOSED_CONTRACTS } } }
  }

  const [leads, contracts, funnelGroups, leadStatuses] = await Promise.all([
    canViewLeads ? prisma.crmlead.findMany({ where: leadWhere, select: { amount_base: true, created_at: true } }) : [],
    canViewContracts
      ? prisma.contract.findMany({ where: contractWhere, select: { amount_base: true, created_at: true } })
      : [],
    canViewLeads
      ? prisma.crmlead.groupBy({ by: ['status_id'], _count: { _all: true }, _sum: { amount_base: true } })
      : [],
    canViewLeads
      ? prisma.option.findMany({
          where: { category: 'LEAD_STATUS', is_active: true },
          orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
          select: { id: true, label: true, value: true, color_code: true }
        })
      : []
  ])

  const buckets = buildMonthBuckets(rangeStart, months, locale)

  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]))

  ;[...leads, ...contracts].forEach(row => {
    const bucket = bucketMap.get(monthKey(row.created_at))

    if (bucket) bucket.value += toNumber(row.amount_base)
  })

  const statusMap = new Map(funnelGroups.map(group => [group.status_id, group]))
  const sparkline = buckets.map(bucket => round(bucket.value))

  return {
    value: round(
      leads.reduce((sum, row) => sum + toNumber(row.amount_base), 0) +
        contracts.reduce((sum, row) => sum + toNumber(row.amount_base), 0)
    ),
    dealCount: leads.length + contracts.length,
    leadCount: leads.length,
    contractCount: contracts.length,
    growth: growth(sparkline.at(-1) || 0, sparkline.at(-2) || 0),
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

const loadWorkforceSnapshot = async today => {
  const historyStart = addDays(today, -13)

  const [active, checkedIn, history] = await Promise.all([
    prisma.hrmstaff.count({ where: { status: 'ACTIVE' } }),
    prisma.hrmstafftimesheet.count({ where: { date: today, check_in_time: { not: null } } }),
    prisma.hrmstafftimesheet.findMany({
      where: { date: { gte: historyStart, lte: today }, check_in_time: { not: null } },
      select: { date: true }
    })
  ])

  const days = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(historyStart, index)

    return { key: date.toISOString().slice(0, 10), value: 0 }
  })

  const dayMap = new Map(days.map(day => [day.key, day]))

  history.forEach(row => {
    const bucket = dayMap.get(row.date.toISOString().slice(0, 10))

    if (bucket) bucket.value += 1
  })

  return {
    active,
    checkedIn,
    attendanceRate: active ? round((checkedIn / active) * 100) : 0,
    sparkline: days.map(day => day.value)
  }
}

const loadOperationsAnalytics = async ({ projectWhere, rangeStart, months, locale, today, canViewAttendance }) => {
  const activeWhere = {
    AND: [projectWhere, { status: { is: { value: { in: ACTIVE_PROJECTS } } } }]
  }

  const taskScope = { project: { is: projectWhere } }

  const pendingTaskWhere = {
    AND: [taskScope, { status: { is: { value: { notIn: CLOSED_TASKS } } } }]
  }

  const attendanceWhere = canViewAttendance
    ? {
        date: today,
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
        tasks: { select: { status: { select: { value: true } } } },
        timesheets: { select: { hours_worked: true } }
      }
    }),
    prisma.project.findMany({
      where: { AND: [projectWhere, { created_at: { gte: rangeStart } }] },
      select: { created_at: true }
    }),
    prisma.task.findMany({
      where: { AND: [taskScope, { created_at: { gte: rangeStart } }] },
      select: { created_at: true }
    })
  ])

  const buckets = buildMonthBuckets(rangeStart, months, locale)

  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]))

  ;[...activityProjects, ...activityTasks].forEach(row => {
    const bucket = bucketMap.get(monthKey(row.created_at))

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
            loan_number: true,
            entity_name: true,
            total_amount: true,
            remaining_balance: true,
            monthly_deduction: true,
            amount_base: true,
            currency: true,
            issue_date: true,
            staff: { select: { first_name: true, last_name: true } },
            status: { select: { label: true, value: true, color_code: true } }
          }
        })
      : [],
    capabilities.loans
      ? prisma.financeloan.findMany({
          where: loanWhere,
          select: { total_amount: true, remaining_balance: true, amount_base: true }
        })
      : [],
    capabilities.inventory
      ? prisma.inventory.findMany({
          where: { quantity_in_stock: { lte: prisma.inventory.fields.reorder_level } },
          take: 6,
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

  return {
    outstanding: outstanding.map(row => ({
      id: row.id,
      title: row.client?.company_name || row.client?.primary_contact_name || row.name,
      reference: row.invoice?.invoice_number || row.name,
      dueDate: iso(row.remind_date),
      amount: toNumber(row.remind_amount),
      amountBase: round(outstandingBase(row)),
      currency: row.currency
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
      const remainingBase = toNumber(row.total_amount)
        ? (toNumber(row.amount_base) * toNumber(row.remaining_balance)) / toNumber(row.total_amount)
        : 0

      return {
        id: row.id,
        loan_number: row.loan_number,
        entityName: row.entity_name,
        totalAmount: round(row.total_amount),
        remainingBalance: round(row.remaining_balance),
        monthlyDeduction: round(row.monthly_deduction),
        amountBase: round(remainingBase),
        currency: row.currency,
        staff: row.staff,
        status: row.status,
        borrower: fullName(row.staff) || row.entity_name || row.loan_number,
        issueDate: iso(row.issue_date)
      }
    }),
    loanTotals: {
      count: loanPortfolio.length,
      remaining: round(
        loanPortfolio.reduce(
          (sum, row) =>
            sum +
            (toNumber(row.total_amount)
              ? (toNumber(row.amount_base) * toNumber(row.remaining_balance)) / toNumber(row.total_amount)
              : 0),
          0
        )
      )
    },
    inventory
  }
}

const loadPersonalSnapshot = async ({ staffId, today, monthStart }) => {
  if (!staffId) return null

  const assignedTask = { assignees: { some: { staff_id: staffId } } }

  const [openTasks, overdueTasks, attendance, hours, loan] = await Promise.all([
    prisma.task.count({
      where: { AND: [assignedTask, { status: { is: { value: { notIn: CLOSED_TASKS } } } }] }
    }),
    prisma.task.count({
      where: {
        AND: [assignedTask, { due_date: { lt: today } }, { status: { is: { value: { notIn: CLOSED_TASKS } } } }]
      }
    }),
    prisma.hrmstafftimesheet.findFirst({
      where: { staff_id: staffId, date: today },
      select: { status: true, check_in_time: true, check_out_time: true, hours_worked: true }
    }),
    prisma.hrmstafftimesheet.aggregate({
      where: { staff_id: staffId, date: { gte: monthStart } },
      _sum: { hours_worked: true }
    }),
    prisma.financeloan.aggregate({
      where: {
        staff_id: staffId,
        remaining_balance: { gt: 0 },
        status: { is: { value: { notIn: CLOSED_LOANS } } }
      },
      _sum: { amount_base: true },
      _count: { _all: true }
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
    monthHours: round(hours._sum.hours_worked),
    loans: { count: loan._count._all, balance: round(loan._sum.amount_base) }
  }
}

export const getDashboardData = async (payload = {}) => {
  const authorization = await authorizeAction(['dashboard:read'])

  if (!authorization.authorized) return { success: false, code: authorization.code, error: authorization.error }

  const locale = i18n.locales.includes(payload.locale) ? payload.locale : i18n.defaultLocale
  const months = PERIODS.has(Number(payload.months)) ? Number(payload.months) : 12
  const now = new Date()
  const today = startOfDay(now)
  const monthStart = startOfMonth(now)
  const rangeStart = addMonths(monthStart, -(months - 1))
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
      capabilities.finance ? loadFinanceAnalytics({ rangeStart, months, locale }) : null,
      capabilities.pipeline
        ? loadPipelineAnalytics({
            rangeStart,
            months,
            locale,
            today,
            canViewLeads: capabilities.crm,
            canViewContracts: capabilities.contracts
          })
        : null,
      capabilities.projects
        ? loadOperationsAnalytics({
            projectWhere,
            rangeStart,
            months,
            locale,
            today,
            canViewAttendance: capabilities.hrm || capabilities.isProjectManager
          })
        : null,
      capabilities.hrm ? loadWorkforceSnapshot(today) : null,
      loadUrgentActions({ capabilities, today, staffId: staff?.id }),
      capabilities.staffOnly ? loadPersonalSnapshot({ staffId: staff?.id, today, monthStart }) : null
    ])

    const data = {
      success: true,
      data: {
        locale,
        period: months,
        generatedAt: now.toISOString(),
        company: { name: setup.company_name, currency: setup.currency_code || 'AFN' },
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
