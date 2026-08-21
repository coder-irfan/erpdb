'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { getTasksDictionary } from '@/data/dictionaries/tasks'
import { authorizeAction } from '@/libs/actionAuthorization'
import { prisma } from '@/libs/prisma'
import { createTaskSchema, logTaskHoursSchema } from '@/schemas/tasks'
import { toUtcDateOnly } from '@/utils/contractDuration'
import { toFiniteNumber } from '@/utils/formatCurrency'
import { hasPermission } from '@/utils/rbac'

const READ_PERMISSIONS = ['tasks:read', 'tasks:read_assigned', 'tasks:write']
const WRITE_PERMISSIONS = ['tasks:write']
const SELF_UPDATE_PERMISSIONS = ['tasks:write', 'tasks:read_assigned']
const DELETE_PERMISSIONS = ['tasks:delete']
const ACTIVE_VALUES = ['ACTIVE', 'IN_PROGRESS']
const COMPLETED_VALUES = ['COMPLETED', 'DONE']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

const DEFAULT_OPTIONS = {
  TASK_STATUS: [
    ['To Do', 'TO_DO', 'secondary', 1, true],
    ['In Progress', 'IN_PROGRESS', 'primary', 2, false],
    ['Review', 'REVIEW', 'warning', 3, false],
    ['Completed', 'COMPLETED', 'success', 4, false]
  ],
  TASK_PRIORITY: [
    ['Low', 'LOW', 'success', 1, false],
    ['Medium', 'MEDIUM', 'info', 2, true],
    ['High', 'HIGH', 'warning', 3, false],
    ['Urgent', 'URGENT', 'error', 4, false]
  ]
}

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')
const iso = value => value?.toISOString() ?? null
const decimal = value => value == null ? null : value.toFixed(2)
const uniqueIds = values => [...new Set((Array.isArray(values) ? values : []).map(normalizeId).filter(Boolean))]

const getContext = async (payload, permissions) => {
  const locale = normalizeLocale(payload?.locale)
  const authorization = await authorizeAction(permissions)
  const translations = getTasksDictionary(locale)

  if (!authorization.authorized) {
    return { authorized: false, code: authorization.code, error: authorization.code === 'UNAUTHENTICATED' ? translations.messages.unauthenticated : translations.messages.forbidden, locale, translations }
  }

  const session = authorization.session
  const globalRead = hasPermission(session, 'tasks:read') || hasPermission(session, 'tasks:write') || hasPermission(session, 'tasks:delete')
  const staff = await prisma.hrmstaff.findUnique({ where: { user_id: session.user.id }, select: { id: true, first_name: true, last_name: true } })

  return { authorized: true, session, locale, translations, staffId: staff?.id || null, globalRead, canManage: hasPermission(session, 'tasks:write'), canDelete: hasPermission(session, 'tasks:delete') }
}

const visibilityWhere = context => {
  if (context.globalRead) return {}
  if (!context.staffId) return { id: '__NO_VISIBLE_TASK__' }

  return { OR: [{ created_by_id: context.staffId }, { assignees: { some: { staff_id: context.staffId } } }] }
}

const optionSelect = { id: true, label: true, value: true, color_code: true, is_default: true, is_active: true }
const staffSelect = { id: true, first_name: true, last_name: true, email: true, position: true }

const taskSelect = {
  id: true,
  project_id: true,
  title: true,
  description: true,
  status_id: true,
  priority_id: true,
  created_by_id: true,
  estimated_hours: true,
  actual_hours: true,
  due_date: true,
  completed_at: true,
  created_at: true,
  updated_at: true,
  project: { select: { id: true, project_code: true, title: true, project_manager_id: true, client: { select: { id: true, company_name: true } } } },
  status: { select: optionSelect },
  priority: { select: optionSelect },
  created_by: { select: staffSelect },
  assignees: { select: { id: true, assigned_at: true, staff: { select: staffSelect } }, orderBy: { assigned_at: 'asc' } }
}

const withFullName = staff => staff ? { ...staff, full_name: `${staff.first_name} ${staff.last_name}`.trim() } : null

const normalizeTask = task => {
  const normalizedAssignees = task.assignees.map(assignee => ({ ...assignee, assigned_at: iso(assignee.assigned_at), staff: withFullName(assignee.staff) }))

  const today = toUtcDateOnly(new Date())

  return {
    ...task,
    estimated_hours: decimal(task.estimated_hours),
    actual_hours: decimal(task.actual_hours),
    due_date: iso(task.due_date),
    completed_at: iso(task.completed_at),
    created_at: iso(task.created_at),
    updated_at: iso(task.updated_at),
    created_by: withFullName(task.created_by),
    assignees: normalizedAssignees,
    is_overdue: Boolean(task.due_date && task.due_date < today && !COMPLETED_VALUES.includes(task.status.value)),
    progress: Math.min(100, Math.round(toFiniteNumber(task.actual_hours) / Math.max(toFiniteNumber(task.estimated_hours), 1) * 100))
  }
}

const revalidateTasks = () => {
  revalidatePath('/[lang]/tasks', 'page')
  revalidatePath('/[lang]/projects', 'page')
}

const ensureTaskOptions = async () => {
  const existing = await prisma.option.findMany({ where: { category: { in: Object.keys(DEFAULT_OPTIONS) } }, select: { category: true, value: true } })
  const keys = new Set(existing.map(option => `${option.category}:${option.value}`))
  const creates = []

  Object.entries(DEFAULT_OPTIONS).forEach(([category, options]) => options.forEach(([label, value, color_code, sort_order, is_default]) => {
    if (!keys.has(`${category}:${value}`)) creates.push(prisma.option.create({ data: { category, label, value, color_code, sort_order, is_default, is_active: true } }))
  }))

  if (creates.length) await prisma.$transaction(creates)
}

const validationPayload = payload => ({
  title: payload?.title,
  project_id: payload?.project_id,
  description: payload?.description || '',
  assignee_ids: uniqueIds(payload?.assignee_ids),
  status_id: payload?.status_id,
  priority_id: payload?.priority_id,
  estimated_hours: String(payload?.estimated_hours ?? '0'),
  actual_hours: String(payload?.actual_hours ?? '0'),
  due_date: payload?.due_date || ''
})

const validateTaskRelations = async (values, current = null) => {
  const assigneeIds = uniqueIds(values.assignee_ids)

  const [project, status, priority, staffCount] = await Promise.all([
    prisma.project.findUnique({ where: { id: values.project_id }, select: { id: true } }),
    prisma.option.findFirst({ where: { id: values.status_id, category: 'TASK_STATUS', ...(current?.status_id === values.status_id ? {} : { is_active: true }) }, select: { id: true, value: true } }),
    prisma.option.findFirst({ where: { id: values.priority_id, category: 'TASK_PRIORITY', ...(current?.priority_id === values.priority_id ? {} : { is_active: true }) }, select: { id: true } }),
    assigneeIds.length ? prisma.hrmstaff.count({ where: { id: { in: assigneeIds }, status: { not: 'TERMINATED' } } }) : 0
  ])

  return { valid: Boolean(project && status && priority && staffCount === assigneeIds.length), status, assigneeIds }
}

const syncAssignees = async (transaction, taskId, staffIds) => {
  const ids = uniqueIds(staffIds)

  await transaction.taskassignee.deleteMany({ where: { task_id: taskId, ...(ids.length ? { staff_id: { notIn: ids } } : {}) } })
  if (ids.length) await transaction.taskassignee.createMany({ data: ids.map(staffId => ({ task_id: taskId, staff_id: staffId })), skipDuplicates: true })
}

export const getTasks = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const page = Math.max(1, Number.parseInt(payload.page, 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(payload.limit, 10) || DEFAULT_PAGE_SIZE))
  const isKanban = payload.view === 'KANBAN'
  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const projectId = normalizeId(payload.projectId)
  const priorityId = normalizeId(payload.priorityId)
  const statusId = normalizeId(payload.statusId)
  const assigneeId = normalizeId(payload.assigneeId)
  const visibility = visibilityWhere(context)

  const filters = {
    AND: [visibility, projectId ? { project_id: projectId } : {}, priorityId ? { priority_id: priorityId } : {}, statusId ? { status_id: statusId } : {}, assigneeId ? { assignees: { some: { staff_id: assigneeId } } } : {}, search ? { OR: [{ title: { contains: search } }, { description: { contains: search } }, { project: { is: { title: { contains: search } } } }] } : {}]
  }

  const today = toUtcDateOnly(new Date())

  try {
    await ensureTaskOptions()

    const [totalCount, tasks, inProgress, overdue, hours, statuses, priorities] = await prisma.$transaction([
      prisma.task.count({ where: filters }),
      prisma.task.findMany({ where: filters, select: taskSelect, orderBy: [{ due_date: 'asc' }, { created_at: 'desc' }], ...(isKanban ? { take: 500 } : { skip: (page - 1) * limit, take: limit }) }),
      prisma.task.count({ where: { AND: [visibility, { status: { is: { value: { in: ACTIVE_VALUES } } } }] } }),
      prisma.task.count({ where: { AND: [visibility, { due_date: { lt: today } }, { status: { is: { value: { notIn: COMPLETED_VALUES } } } }] } }),
      prisma.task.aggregate({ where: visibility, _sum: { actual_hours: true, estimated_hours: true } }),
      prisma.option.findMany({ where: { category: 'TASK_STATUS', is_active: true }, select: optionSelect, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }] }),
      prisma.option.findMany({ where: { category: 'TASK_PRIORITY', is_active: true }, select: optionSelect, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }] })
    ])

    return { success: true, data: { tasks: tasks.map(normalizeTask), totalCount, statuses, priorities, page, scope: context.globalRead ? 'GLOBAL' : 'ASSIGNED', currentStaffId: context.staffId, summary: { total: await prisma.task.count({ where: visibility }), inProgress, overdue, actualHours: toFiniteNumber(hours._sum.actual_hours), estimatedHours: toFiniteNumber(hours._sum.estimated_hours) } } }
  } catch {
    return { success: false, code: 'TASKS_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getTaskFormOptions = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    await ensureTaskOptions()
    const projectWhere = context.globalRead ? {} : context.staffId ? { OR: [{ project_manager_id: context.staffId }, { members: { some: { staff_id: context.staffId } } }, { tasks: { some: visibilityWhere(context) } }] } : { id: '__NONE__' }

    const [projects, staff, options] = await Promise.all([
      prisma.project.findMany({ where: projectWhere, select: { id: true, project_code: true, title: true, status: { select: { value: true } } }, orderBy: { title: 'asc' }, take: 500 }),
      prisma.hrmstaff.findMany({ where: context.globalRead ? { status: { not: 'TERMINATED' } } : { id: context.staffId || '__NONE__' }, select: staffSelect, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }], take: 500 }),
      prisma.option.findMany({ where: { category: { in: ['TASK_STATUS', 'TASK_PRIORITY'] }, is_active: true }, select: { ...optionSelect, category: true }, orderBy: [{ category: 'asc' }, { sort_order: 'asc' }, { label: 'asc' }] })
    ])

    return { success: true, data: { projects, staff: staff.map(withFullName), statuses: options.filter(option => option.category === 'TASK_STATUS'), priorities: options.filter(option => option.category === 'TASK_PRIORITY') } }
  } catch {
    return { success: false, code: 'OPTIONS_LOAD_FAILED', error: context.translations.messages.optionsLoadFailed }
  }
}

export const getTaskDetail = async (id, payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const task = await prisma.task.findFirst({ where: { AND: [{ id: normalizeId(id) }, visibilityWhere(context)] }, select: taskSelect })

    if (!task) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    return { success: true, data: normalizeTask(task) }
  } catch {
    return { success: false, code: 'DETAIL_LOAD_FAILED', error: context.translations.messages.detailLoadFailed }
  }
}

export const createTask = async (payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const validation = safeParse(createTaskSchema(context.translations.validation), validationPayload(payload))

  if (!validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }
  const relations = await validateTaskRelations(validation.output)

  if (!relations.valid) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidRelation }

  try {
    const created = await prisma.$transaction(async transaction => {
      const task = await transaction.task.create({ data: { project_id: validation.output.project_id, title: validation.output.title, description: validation.output.description || null, status_id: validation.output.status_id, priority_id: validation.output.priority_id, created_by_id: context.staffId, estimated_hours: new Prisma.Decimal(toFiniteNumber(validation.output.estimated_hours)), actual_hours: new Prisma.Decimal(toFiniteNumber(validation.output.actual_hours)), due_date: validation.output.due_date ? toUtcDateOnly(validation.output.due_date) : null, completed_at: COMPLETED_VALUES.includes(relations.status.value) ? new Date() : null, ...(relations.assigneeIds.length ? { assignees: { create: relations.assigneeIds.map(staffId => ({ staff_id: staffId })) } } : {}) } })

      await transaction.auditlog.create({ data: { user_id: context.session.user.id, action: 'TASK_CREATED', module: 'TASKS', details: { taskId: task.id, projectId: task.project_id, assigneeIds: relations.assigneeIds } } })

      return task
    })

    revalidateTasks()

    return { success: true, data: { id: created.id }, message: context.translations.messages.created }
  } catch {
    return { success: false, code: 'CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateTask = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const taskId = normalizeId(id)
  const validation = safeParse(createTaskSchema(context.translations.validation), validationPayload(payload))

  if (!taskId || !validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues?.[0]?.message || context.translations.messages.notFound }

  try {
    const current = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, status_id: true, priority_id: true, completed_at: true } })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    const relations = await validateTaskRelations(validation.output, current)

    if (!relations.valid) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidRelation }
    await prisma.$transaction(async transaction => {
      await transaction.task.update({ where: { id: taskId }, data: { project_id: validation.output.project_id, title: validation.output.title, description: validation.output.description || null, status_id: validation.output.status_id, priority_id: validation.output.priority_id, estimated_hours: new Prisma.Decimal(toFiniteNumber(validation.output.estimated_hours)), actual_hours: new Prisma.Decimal(toFiniteNumber(validation.output.actual_hours)), due_date: validation.output.due_date ? toUtcDateOnly(validation.output.due_date) : null, completed_at: COMPLETED_VALUES.includes(relations.status.value) ? current.completed_at || new Date() : null } })
      await syncAssignees(transaction, taskId, relations.assigneeIds)
      await transaction.auditlog.create({ data: { user_id: context.session.user.id, action: 'TASK_UPDATED', module: 'TASKS', details: { taskId, assigneeIds: relations.assigneeIds } } })
    })
    revalidateTasks()

    return { success: true, message: context.translations.messages.updated }
  } catch {
    return { success: false, code: 'UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const syncTaskAssignees = async (taskId, staffIds = [], payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const id = normalizeId(taskId)
  const ids = uniqueIds(staffIds)

  try {
    const [task, count] = await Promise.all([prisma.task.findUnique({ where: { id }, select: { id: true } }), ids.length ? prisma.hrmstaff.count({ where: { id: { in: ids }, status: { not: 'TERMINATED' } } }) : 0])

    if (!task) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (count !== ids.length) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidRelation }
    await prisma.$transaction(async transaction => {
      await syncAssignees(transaction, id, ids)
      await transaction.auditlog.create({ data: { user_id: context.session.user.id, action: 'TASK_ASSIGNEES_SYNCED', module: 'TASKS', details: { taskId: id, assigneeIds: ids } } })
    })
    revalidateTasks()

    return { success: true, message: context.translations.messages.assigneesUpdated }
  } catch {
    return { success: false, code: 'ASSIGNEE_SYNC_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateTaskStatus = async (taskId, statusId, payload = {}) => {
  const context = await getContext(payload, SELF_UPDATE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const id = normalizeId(taskId)

  try {
    const [task, status] = await Promise.all([
      prisma.task.findFirst({ where: { AND: [{ id }, visibilityWhere(context)] }, select: { id: true, completed_at: true } }),
      prisma.option.findFirst({ where: { id: normalizeId(statusId), category: 'TASK_STATUS', is_active: true }, select: { id: true, value: true } })
    ])

    if (!task) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (!status) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidRelation }

    if (!context.canManage && !COMPLETED_VALUES.includes(status.value)) {
      return { success: false, code: 'FORBIDDEN', error: context.translations.messages.forbidden }
    }

    await prisma.$transaction([
      prisma.task.update({ where: { id }, data: { status_id: status.id, completed_at: COMPLETED_VALUES.includes(status.value) ? task.completed_at || new Date() : null } }),
      prisma.auditlog.create({ data: { user_id: context.session.user.id, action: 'TASK_STATUS_UPDATED', module: 'TASKS', details: { taskId: id, status: status.value } } })
    ])
    revalidateTasks()

    return { success: true, message: context.translations.messages.statusUpdated }
  } catch {
    return { success: false, code: 'STATUS_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const logTaskHours = async (taskId, payload = {}) => {
  const context = await getContext(payload, SELF_UPDATE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const validation = safeParse(logTaskHoursSchema(context.translations.validation), { hours: String(payload?.hours ?? '') })

  if (!validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }
  const id = normalizeId(taskId)

  try {
    const task = await prisma.task.findFirst({ where: { AND: [{ id }, visibilityWhere(context)] }, select: { id: true, actual_hours: true } })

    if (!task) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    const hours = new Prisma.Decimal(toFiniteNumber(validation.output.hours))
    const hoursUpdate = task.actual_hours == null ? hours : { increment: hours }

    await prisma.$transaction([
      prisma.task.update({ where: { id }, data: { actual_hours: hoursUpdate } }),
      prisma.auditlog.create({ data: { user_id: context.session.user.id, action: 'TASK_HOURS_LOGGED', module: 'TASKS', details: { taskId: id, hours: hours.toString() } } })
    ])
    revalidateTasks()

    return { success: true, message: context.translations.messages.hoursLogged }
  } catch {
    return { success: false, code: 'HOURS_LOG_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const deleteTask = async (taskId, payload = {}) => {
  const context = await getContext(payload, DELETE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const id = normalizeId(taskId)

  try {
    const task = await prisma.task.findUnique({ where: { id }, select: { id: true, title: true } })

    if (!task) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    await prisma.$transaction([
      prisma.task.delete({ where: { id } }),
      prisma.auditlog.create({ data: { user_id: context.session.user.id, action: 'TASK_DELETED', module: 'TASKS', details: { taskId: id, title: task.title } } })
    ])
    revalidateTasks()

    return { success: true, message: context.translations.messages.deleted }
  } catch {
    return { success: false, code: 'DELETE_FAILED', error: context.translations.messages.operationFailed }
  }
}
