import 'server-only'

import { prisma } from '@/libs/prisma'

const DAY = 24 * 60 * 60 * 1000
const SYNC_COOLDOWN = 15 * 1000
const CLOSED_CONTRACTS = ['EXPIRED', 'TERMINATED', 'CANCELLED', 'COMPLETED']
const CLOSED_WORK = ['COMPLETED', 'DONE', 'CANCELLED']

const expiry = (days = 45) => new Date(Date.now() + days * DAY)
const dayStamp = value => new Date(value).toISOString().slice(0, 10)
const eventStamp = value => new Date(value).toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
const fullName = staff => [staff?.first_name, staff?.last_name].filter(Boolean).join(' ')

const ROLE_GROUPS = {
  contracts: ['super_admin', 'admin', 'hr_manager', 'legal_manager', 'contracts_manager'],
  finance: ['super_admin', 'admin', 'finance_manager', 'accountant'],
  inventory: ['super_admin', 'admin', 'operations_manager', 'inventory_manager'],
  projects: ['super_admin', 'admin', 'project_manager']
}

const SYNC_PREFIXES = [
  'contract-expiry:',
  'staff-contract-expiry:',
  'invoice-overdue:',
  'salary-pending:',
  'income-reminder:',
  'expense-pending:',
  'inventory-stock:'
]

let lastSyncAt = 0
let activeSync = null

const roleIdsFor = (roleMap, names) => names.map(name => roleMap.get(name)).filter(Boolean)

const translated = (en, fa, ps) => ({ en, fa, ps })

const makeNotification = ({
  key,
  category,
  priority,
  title,
  description,
  actionUrl,
  entityType,
  entityId,
  roles = [],
  userId = null,
  expiresAt = expiry()
}) => ({
  key,
  category,
  priority,
  title,
  description,
  actionUrl,
  entityType,
  entityId,
  roles,
  userId,
  expiresAt
})

export const createActionableNotification = async (input, client = prisma) => {
  if (!input?.key || (!input.userId && !(input.roles || []).length)) return null

  const notification = await client.notification.upsert({
    where: { dedupe_key: input.key },
    create: {
      dedupe_key: input.key,
      category: input.category,
      priority: input.priority || 'INFO',
      title_en: input.title.en,
      title_fa: input.title.fa,
      title_ps: input.title.ps,
      description_en: input.description.en,
      description_fa: input.description.fa,
      description_ps: input.description.ps,
      action_url: input.actionUrl || null,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      target_user_id: input.userId || null,
      expires_at: input.expiresAt || null
    },
    update: {
      priority: input.priority || 'INFO',
      title_en: input.title.en,
      title_fa: input.title.fa,
      title_ps: input.title.ps,
      description_en: input.description.en,
      description_fa: input.description.fa,
      description_ps: input.description.ps,
      action_url: input.actionUrl || null,
      expires_at: input.expiresAt || null
    },
    select: { id: true }
  })

  if (input.roles?.length) {
    await client.notificationrole.createMany({
      data: input.roles.map(roleId => ({ notification_id: notification.id, role_id: roleId })),
      skipDuplicates: true
    })
  }

  return notification
}

const contractPriority = days => (days <= 3 ? 'CRITICAL' : days <= 15 ? 'URGENT' : 'WARNING')
const contractStage = days => (days <= 3 ? '3' : days <= 15 ? '15' : '30')

export const syncActionableNotifications = async () => {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const inThirtyDays = new Date(today.getTime() + 30 * DAY)
  const recent = new Date(now.getTime() - 30 * DAY)

  const [roles, contracts, staffContracts, tasks, projects, invoices, salaries, incomes, expenses, inventory] =
    await Promise.all([
      prisma.role.findMany({ where: { is_active: true }, select: { id: true, name: true } }),
      prisma.contract.findMany({
        where: {
          end_date: { gte: today, lte: inThirtyDays },
          status: { is: { value: { notIn: CLOSED_CONTRACTS } } }
        },
        take: 200,
        select: { id: true, contract_number: true, title: true, end_date: true }
      }),
      prisma.hrmstaffcontract.findMany({
        where: {
          end_date: { gte: today, lte: inThirtyDays },
          status: { is: { value: { notIn: CLOSED_CONTRACTS } } }
        },
        take: 200,
        select: {
          id: true,
          contract_number: true,
          end_date: true,
          staff: { select: { first_name: true, last_name: true, user_id: true } }
        }
      }),
      prisma.task.findMany({
        where: {
          OR: [
            { due_date: { lt: today }, status: { is: { value: { notIn: CLOSED_WORK } } } },
            { updated_at: { gte: recent }, status: { is: { value: { in: ['COMPLETED', 'DONE', 'BLOCKED'] } } } }
          ]
        },
        take: 300,
        select: {
          id: true,
          title: true,
          due_date: true,
          updated_at: true,
          status: { select: { value: true } },
          assignees: { select: { staff: { select: { user_id: true } } } },
          project: { select: { project_code: true, project_manager: { select: { user_id: true } } } }
        }
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { end_date: { lt: today }, status: { is: { value: { notIn: CLOSED_WORK } } } },
            { updated_at: { gte: recent }, status: { is: { value: { in: ['COMPLETED', 'DONE', 'BLOCKED'] } } } }
          ]
        },
        take: 200,
        select: {
          id: true,
          project_code: true,
          title: true,
          end_date: true,
          updated_at: true,
          status: { select: { value: true } },
          project_manager: { select: { user_id: true } },
          members: { select: { staff: { select: { user_id: true } } } }
        }
      }),
      prisma.contractinvoice.findMany({
        where: {
          due_date: { lt: today },
          remaining_balance: { gt: 0 },
          status: { is: { value: { notIn: ['PAID', 'CANCELLED', 'VOID'] } } }
        },
        take: 200,
        select: { id: true, invoice_number: true, due_date: true }
      }),
      prisma.financesalary.findMany({
        where: { status: 'DRAFT' },
        distinct: ['timesheet_month'],
        take: 36,
        select: { id: true, timesheet_month: true }
      }),
      prisma.financeincome.findMany({
        where: { remind_date: { lte: today }, remind_amount: { gt: 0 }, status: { not: 'PAID' } },
        take: 200,
        select: { id: true, name: true, remind_date: true }
      }),
      prisma.financeexpense.findMany({
        where: { approval_status: 'PENDING_APPROVAL' },
        take: 200,
        select: { id: true, voucher_number: true, vendor_payee: true, updated_at: true }
      }),
      prisma.inventory.findMany({
        orderBy: [{ quantity_in_stock: 'asc' }, { updated_at: 'desc' }],
        take: 500,
        select: { id: true, name: true, sku_code: true, quantity_in_stock: true, reorder_level: true }
      })
    ])

  const roleMap = new Map(roles.map(role => [role.name, role.id]))
  const records = []
  const activeByPrefix = new Map(SYNC_PREFIXES.map(prefix => [prefix, []]))

  const track = (prefix, record) => {
    records.push(record)
    if (!activeByPrefix.has(prefix)) activeByPrefix.set(prefix, [])
    activeByPrefix.get(prefix).push(record.key)
  }

  contracts.forEach(contract => {
    const days = Math.max(0, Math.ceil((contract.end_date - today) / DAY))
    const stage = contractStage(days)

    track('contract-expiry:', makeNotification({
      key: `contract-expiry:${contract.id}:${stage}`,
      category: 'CONTRACT',
      priority: contractPriority(days),
      title: translated('Contract expiring soon', 'قرارداد به‌زودی منقضی می‌شود', 'قرارداد ژر پای ته رسېږي'),
      description: translated(
        `${contract.contract_number} · ${contract.title} expires in ${days} day(s).`,
        `${contract.contract_number} · ${contract.title} تا ${days} روز دیگر منقضی می‌شود.`,
        `${contract.contract_number} · ${contract.title} په ${days} ورځو کې پای ته رسېږي.`
      ),
      actionUrl: `/contracts?contract=${contract.id}`,
      entityType: 'CONTRACT',
      entityId: contract.id,
      roles: roleIdsFor(roleMap, ROLE_GROUPS.contracts),
      expiresAt: new Date(contract.end_date.getTime() + DAY)
    }))
  })

  staffContracts.forEach(contract => {
    const days = Math.max(0, Math.ceil((contract.end_date - today) / DAY))
    const stage = contractStage(days)
    const employee = fullName(contract.staff)

    track('staff-contract-expiry:', makeNotification({
      key: `staff-contract-expiry:${contract.id}:${stage}`,
      category: 'HRM',
      priority: contractPriority(days),
      title: translated('Staff contract expiring', 'قرارداد کارمند در حال انقضا', 'د کارکوونکي قرارداد پای ته رسېږي'),
      description: translated(
        `${contract.contract_number} · ${employee} expires in ${days} day(s).`,
        `${contract.contract_number} · قرارداد ${employee} تا ${days} روز دیگر منقضی می‌شود.`,
        `${contract.contract_number} · د ${employee} قرارداد په ${days} ورځو کې پای ته رسېږي.`
      ),
      actionUrl: `/hrm/contracts?contract=${contract.id}`,
      entityType: 'HRM_CONTRACT',
      entityId: contract.id,
      roles: roleIdsFor(roleMap, ROLE_GROUPS.contracts),
      expiresAt: new Date(contract.end_date.getTime() + DAY)
    }))
  })

  const addUserWorkNotification = (record, userIds) => {
    ;[...new Set(userIds.filter(Boolean))].forEach(userId => records.push({ ...record, key: `${record.key}:${userId}`, userId, roles: [] }))
  }

  tasks.forEach(task => {
    const status = task.due_date && task.due_date < today && !CLOSED_WORK.includes(task.status.value)
      ? 'OVERDUE'
      : task.status.value

    const users = [task.project.project_manager?.user_id, ...task.assignees.map(item => item.staff.user_id)]
    const persistent = status === 'OVERDUE'
    const key = persistent ? `task-overdue:${task.id}` : `task-status:${task.id}:${status}:${eventStamp(task.updated_at)}`
    const priority = status === 'BLOCKED' || status === 'OVERDUE' ? 'URGENT' : 'INFO'

    const title = status === 'OVERDUE'
      ? translated('Task overdue', 'وظیفه تأخیر کرده است', 'دنده ځنډېدلې ده')
      : status === 'BLOCKED'
        ? translated('Task blocked', 'وظیفه مسدود شده است', 'دنده بنده شوې ده')
        : translated('Task completed', 'وظیفه تکمیل شد', 'دنده بشپړه شوه')

    addUserWorkNotification(makeNotification({
      key,
      category: 'TASK',
      priority,
      title,
      description: translated(
        `${task.title} · ${task.project.project_code}`,
        `${task.title} · ${task.project.project_code}`,
        `${task.title} · ${task.project.project_code}`
      ),
      actionUrl: `/tasks?task=${task.id}`,
      entityType: 'TASK',
      entityId: task.id,
      expiresAt: persistent ? expiry(7) : expiry(30)
    }), users)
  })

  projects.forEach(project => {
    const status = project.end_date < today && !CLOSED_WORK.includes(project.status.value) ? 'OVERDUE' : project.status.value
    const users = [project.project_manager?.user_id, ...project.members.map(item => item.staff.user_id)]
    const persistent = status === 'OVERDUE'
    const key = persistent ? `project-overdue:${project.id}` : `project-status:${project.id}:${status}:${eventStamp(project.updated_at)}`

    const title = status === 'OVERDUE'
      ? translated('Project overdue', 'پروژه تأخیر کرده است', 'پروژه ځنډېدلې ده')
      : status === 'BLOCKED'
        ? translated('Project blocked', 'پروژه مسدود شده است', 'پروژه بنده شوې ده')
        : translated('Project completed', 'پروژه تکمیل شد', 'پروژه بشپړه شوه')

    addUserWorkNotification(makeNotification({
      key,
      category: 'PROJECT',
      priority: status === 'COMPLETED' || status === 'DONE' ? 'INFO' : 'URGENT',
      title,
      description: translated(`${project.project_code} · ${project.title}`, `${project.project_code} · ${project.title}`, `${project.project_code} · ${project.title}`),
      actionUrl: `/projects?project=${project.id}`,
      entityType: 'PROJECT',
      entityId: project.id,
      expiresAt: persistent ? expiry(7) : expiry(30)
    }), users)
  })

  const financeRoles = roleIdsFor(roleMap, ROLE_GROUPS.finance)

  invoices.forEach(invoice => track('invoice-overdue:', makeNotification({
    key: `invoice-overdue:${invoice.id}`,
    category: 'FINANCE',
    priority: 'URGENT',
    title: translated('Invoice overdue', 'فاکتور تأخیر کرده است', 'بل ځنډېدلی دی'),
    description: translated(`${invoice.invoice_number} is past its due date.`, `${invoice.invoice_number} از تاریخ سررسید گذشته است.`, `${invoice.invoice_number} د ورکړې له نېټې اوښتی دی.`),
    actionUrl: `/contracts/invoices?invoice=${invoice.id}`,
    entityType: 'INVOICE',
    entityId: invoice.id,
    roles: financeRoles,
    expiresAt: expiry(14)
  })))

  salaries.forEach(salary => track('salary-pending:', makeNotification({
    key: `salary-pending:${salary.timesheet_month}`,
    category: 'PAYROLL',
    priority: 'WARNING',
    title: translated('Salary batch pending approval', 'دسته معاش منتظر تأیید است', 'د معاشاتو ټولګه تایید ته منتظره ده'),
    description: translated(`Payroll for ${salary.timesheet_month} is still in draft.`, `معاشات ${salary.timesheet_month} هنوز در حالت پیش‌نویس است.`, `د ${salary.timesheet_month} معاشات لا مسوده ده.`),
    actionUrl: '/finance/salary',
    entityType: 'SALARY_BATCH',
    entityId: salary.timesheet_month,
    roles: financeRoles,
    expiresAt: expiry(14)
  })))

  incomes.forEach(income => track('income-reminder:', makeNotification({
    key: `income-reminder:${income.id}:${dayStamp(income.remind_date)}`,
    category: 'FINANCE',
    priority: 'WARNING',
    title: translated('Income reminder due', 'یادآوری درآمد سررسید شده', 'د عاید یادونه رسېدلې ده'),
    description: translated(income.name, income.name, income.name),
    actionUrl: `/finance/income?income=${income.id}`,
    entityType: 'INCOME',
    entityId: income.id,
    roles: financeRoles,
    expiresAt: expiry(14)
  })))

  expenses.forEach(expense => track('expense-pending:', makeNotification({
    key: `expense-pending:${expense.id}`,
    category: 'FINANCE',
    priority: 'WARNING',
    title: translated('Expense pending approval', 'مصرف منتظر تأیید است', 'لګښت تایید ته منتظر دی'),
    description: translated(expense.voucher_number || expense.vendor_payee, expense.voucher_number || expense.vendor_payee, expense.voucher_number || expense.vendor_payee),
    actionUrl: `/finance/expenses?expense=${expense.id}`,
    entityType: 'EXPENSE',
    entityId: expense.id,
    roles: financeRoles,
    expiresAt: expiry(14)
  })))

  const inventoryRoles = roleIdsFor(roleMap, ROLE_GROUPS.inventory)

  inventory.filter(item => item.quantity_in_stock <= item.reorder_level).forEach(item => {
    const out = item.quantity_in_stock === 0

    track('inventory-stock:', makeNotification({
      key: `inventory-stock:${item.id}:${out ? 'out' : 'low'}`,
      category: 'INVENTORY',
      priority: out ? 'URGENT' : 'WARNING',
      title: out
        ? translated('Item out of stock', 'کالا ناموجود است', 'توکی له زېرمې وتلی')
        : translated('Low stock warning', 'هشدار موجودی کم', 'د کمې زېرمې خبرتیا'),
      description: translated(`${item.sku_code} · ${item.name} (${item.quantity_in_stock}/${item.reorder_level})`, `${item.sku_code} · ${item.name} (${item.quantity_in_stock}/${item.reorder_level})`, `${item.sku_code} · ${item.name} (${item.quantity_in_stock}/${item.reorder_level})`),
      actionUrl: `/finance/inventory?item=${item.id}`,
      entityType: 'INVENTORY',
      entityId: item.id,
      roles: inventoryRoles,
      expiresAt: expiry(7)
    }))
  })

  for (const record of records) await createActionableNotification(record)

  for (const [prefix, keys] of activeByPrefix) {
    await prisma.notification.deleteMany({ where: { dedupe_key: { startsWith: prefix, notIn: keys } } })
  }

  return records.length
}

export const ensureActionableNotificationsSynced = async () => {
  if (activeSync) return activeSync
  if (Date.now() - lastSyncAt < SYNC_COOLDOWN) return 0

  activeSync = syncActionableNotifications()
    .then(count => {
      lastSyncAt = Date.now()

      return count
    })
    .finally(() => {
      activeSync = null
    })

  return activeSync
}
