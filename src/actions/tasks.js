'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { getTasksDictionary } from '@/data/dictionaries/tasks'
import { authorizeAction } from '@/libs/actionAuthorization'
import { ACTIVE_OPERATIONAL_STATUSES, isOverdue } from '@/libs/financialStatuses'
import { prisma } from '@/libs/prisma'
import { createTaskSchema, logTaskHoursSchema } from '@/schemas/tasks'
import { toUtcDateOnly } from '@/utils/contractDuration'
import { toFiniteNumber } from '@/utils/formatCurrency'
import { hasPermission } from '@/utils/rbac'
import { sanitizeRichText } from '@/utils/richText'

const READ_PERMISSIONS = ['tasks:read', 'tasks:read_assigned', 'tasks:write']
const WRITE_PERMISSIONS = ['tasks:write']
const SELF_UPDATE_PERMISSIONS = ['tasks:write', 'tasks:read_assigned']
const DELETE_PERMISSIONS = ['tasks:delete']
const ACTIVE_VALUES = ACTIVE_OPERATIONAL_STATUSES
const COMPLETED_VALUES = ['COMPLETED', 'DONE']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const TO_DO_VALUES = ['TO_DO', 'TODO']

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

  const staff = await prisma.hrmstaff.findFirst({
    where: {
      OR: [
        { user_id: session.user.id },
        ...(session.user.email ? [{ email: session.user.email }] : [])
      ]
    },
    select: { id: true, first_name: true, last_name: true }
  })

  return { authorized: true, session, locale, translations, staffId: staff?.id || null, globalRead, canManage: hasPermission(session, 'tasks:write'), canDelete: hasPermission(session, 'tasks:delete') }
}

const visibilityWhere = context => {
  if (context.globalRead) return {}
  if (!context.staffId) return { id: '__NO_VISIBLE_TASK__' }

  return { OR: [{ created_by_id: context.staffId }, { assignees: { some: { staff_id: context.staffId } } }] }
}

const optionSelect = { id: true, label: true, value: true, color_code: true, is_default: true, is_active: true }

const staffSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  position: true,
  user: { select: { image: true } }
}

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
  project: { select: { id: true, project_code: true, title: true, project_manager_id: true, client: { select: { id: true, company_name: true } }, members: { select: { staff: { select: staffSelect } } } } },
  status: { select: optionSelect },
  priority: { select: optionSelect },
  created_by: { select: staffSelect },
  assignees: { select: { id: true, assigned_at: true, staff: { select: staffSelect } }, orderBy: { assigned_at: 'asc' } },
  subtasks: { select: { id: true, parent_id: true, title: true, is_completed: true, sort_order: true }, orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] },
  _count: { select: { attachments: true, comments: true } }
}

const taskDetailSelect = {
  ...taskSelect,
  time_logs: {
    select: {
      id: true,
      work_date: true,
      worked_hours: true,
      notes: true,
      created_at: true,
      staff: { select: staffSelect }
    },
    orderBy: [{ work_date: 'desc' }, { created_at: 'desc' }]
  },
  attachments: { select: { id: true, attachment_type: true, name: true, url: true, mime_type: true, file_size: true, created_at: true }, orderBy: { created_at: 'desc' } },
  comments: { select: { id: true, body: true, created_at: true, author: { select: staffSelect } }, orderBy: { created_at: 'asc' } }
}

const withFullName = staff => staff ? { ...staff, full_name: `${staff.first_name} ${staff.last_name}`.trim() } : null

const normalizeTask = task => {
  const normalizedAssignees = task.assignees.map(assignee => ({ ...assignee, assigned_at: iso(assignee.assigned_at), staff: withFullName(assignee.staff) }))
  const subtaskTotal = task.subtasks?.length || 0
  const subtaskCompleted = task.subtasks?.filter(subtask => subtask.is_completed).length || 0

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
    project: { ...task.project, members: task.project.members?.map(member => ({ staff: withFullName(member.staff) })) || [] },
    assignees: normalizedAssignees,
    subtask_summary: { total: subtaskTotal, completed: subtaskCompleted, percentage: subtaskTotal ? Math.round(subtaskCompleted / subtaskTotal * 100) : 0 },
    time_logs: task.time_logs?.map(entry => ({
      ...entry,
      work_date: iso(entry.work_date),
      worked_hours: decimal(entry.worked_hours),
      created_at: iso(entry.created_at),
      staff: withFullName(entry.staff)
    })) || [],
    attachments: task.attachments?.map(entry => ({ ...entry, created_at: iso(entry.created_at) })) || [],
    comments: task.comments?.map(entry => ({ ...entry, created_at: iso(entry.created_at), author: withFullName(entry.author) })) || [],
    is_overdue: isOverdue({ dueDate: task.due_date, completed: COMPLETED_VALUES.includes(task.status.value), today }),
    progress: Math.round(toFiniteNumber(task.actual_hours) / Math.max(toFiniteNumber(task.estimated_hours), 1) * 100),
    scope_completed: COMPLETED_VALUES.includes(task.status.value),
    hours_variance: decimal(new Prisma.Decimal(toFiniteNumber(task.estimated_hours) - toFiniteNumber(task.actual_hours)))
  }
}

const revalidateTasks = () => {
  revalidatePath('/[lang]/tasks', 'page')
  revalidatePath('/[lang]/projects', 'page')
}

const validationPayload = payload => ({
  title: payload?.title,
  project_id: payload?.project_id,
  description: payload?.description || '',
  assignee_ids: uniqueIds(payload?.assignee_ids),
  status_id: payload?.status_id,
  priority_id: payload?.priority_id,
  estimated_hours: String(payload?.estimated_hours ?? '0'),
  due_date: payload?.due_date || ''
})

const validDueDate = (dueDate, earliestDate) => {
  if (!dueDate) return true

  const due = toUtcDateOnly(dueDate)
  const earliest = toUtcDateOnly(earliestDate)

  return Boolean(due && earliest && due >= earliest)
}

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
    const task = await prisma.task.findFirst({ where: { AND: [{ id: normalizeId(id) }, visibilityWhere(context)] }, select: taskDetailSelect })

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

  if (!validDueDate(validation.output.due_date, toUtcDateOnly(new Date()))) {
    return { success: false, code: 'INVALID_DUE_DATE', error: context.translations.validation.dueDateBeforeCreated }
  }

  const relations = await validateTaskRelations(validation.output)

  if (!relations.valid) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidRelation }

  try {
    const created = await prisma.$transaction(async transaction => {
      const task = await transaction.task.create({ data: { project_id: validation.output.project_id, title: validation.output.title, description: sanitizeRichText(validation.output.description) || null, status_id: validation.output.status_id, priority_id: validation.output.priority_id, created_by_id: context.staffId, estimated_hours: new Prisma.Decimal(toFiniteNumber(validation.output.estimated_hours)), actual_hours: new Prisma.Decimal(0), due_date: validation.output.due_date ? toUtcDateOnly(validation.output.due_date) : null, completed_at: COMPLETED_VALUES.includes(relations.status.value) ? new Date() : null, ...(relations.assigneeIds.length ? { assignees: { create: relations.assigneeIds.map(staffId => ({ staff_id: staffId })) } } : {}) } })

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
    const current = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, status_id: true, priority_id: true, completed_at: true, created_at: true } })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    const earliestDueDate = toUtcDateOnly(new Date()) > toUtcDateOnly(current.created_at) ? toUtcDateOnly(new Date()) : toUtcDateOnly(current.created_at)

    if (!validDueDate(validation.output.due_date, earliestDueDate)) {
      return { success: false, code: 'INVALID_DUE_DATE', error: context.translations.validation.dueDateBeforeCreated }
    }

    const relations = await validateTaskRelations(validation.output, current)

    if (!relations.valid) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidRelation }
    await prisma.$transaction(async transaction => {
      await transaction.task.update({ where: { id: taskId }, data: { project_id: validation.output.project_id, title: validation.output.title, description: sanitizeRichText(validation.output.description) || null, status_id: validation.output.status_id, priority_id: validation.output.priority_id, estimated_hours: new Prisma.Decimal(toFiniteNumber(validation.output.estimated_hours)), due_date: validation.output.due_date ? toUtcDateOnly(validation.output.due_date) : null, completed_at: COMPLETED_VALUES.includes(relations.status.value) ? current.completed_at || new Date() : null } })
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
  if (!context.staffId) return { success: false, code: 'STAFF_PROFILE_REQUIRED', error: context.translations.messages.staffProfileRequired }

  const validation = safeParse(logTaskHoursSchema(context.translations.validation), {
    hours: String(payload?.hours ?? ''),
    work_date: payload?.work_date,
    notes: payload?.notes || ''
  })

  if (!validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }
  const id = normalizeId(taskId)

  try {
    const task = await prisma.task.findFirst({
      where: { AND: [{ id }, visibilityWhere(context)] },
      select: {
        id: true,
        project_id: true,
        status_id: true,
        actual_hours: true,
        created_at: true,
        status: { select: { value: true } },
        project: { select: { status: { select: { value: true } } } }
      }
    })

    if (!task) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    if (COMPLETED_VALUES.includes(task.status.value)) {
      return { success: false, code: 'TASK_COMPLETED', error: context.translations.messages.taskCompleted }
    }

    if (task.project.status.value === 'COMPLETED') {
      return { success: false, code: 'PROJECT_COMPLETED', error: context.translations.messages.projectCompleted }
    }

    const workDate = toUtcDateOnly(validation.output.work_date)
    const createdDate = toUtcDateOnly(task.created_at)
    const today = toUtcDateOnly(new Date())

    if (!workDate || workDate < createdDate || workDate > today) {
      return { success: false, code: 'INVALID_WORK_DATE', error: context.translations.validation.workDateInvalid }
    }

    const hours = new Prisma.Decimal(toFiniteNumber(validation.output.hours))

    const inProgressStatus = TO_DO_VALUES.includes(task.status.value)
      ? await prisma.option.findFirst({ where: { category: 'TASK_STATUS', value: 'IN_PROGRESS', is_active: true }, select: { id: true } })
      : null

    if (TO_DO_VALUES.includes(task.status.value) && !inProgressStatus) {
      return { success: false, code: 'STATUS_CONFIGURATION_MISSING', error: context.translations.messages.operationFailed }
    }

    const result = await prisma.$transaction(async transaction => {
      const updated = await transaction.task.update({
        where: { id },
        data: {
          actual_hours: task.actual_hours == null ? hours : { increment: hours }
        },
        select: { actual_hours: true }
      })

      const statusTransition = inProgressStatus
        ? await transaction.task.updateMany({
            where: { id, status_id: task.status_id },
            data: { status_id: inProgressStatus.id, completed_at: null }
          })
        : null

      const timeLog = await transaction.tasktimesheet.create({
        data: {
          task_id: task.id,
          project_id: task.project_id,
          staff_id: context.staffId,
          created_by_user_id: context.session.user.id,
          work_date: workDate,
          worked_hours: hours,
          notes: validation.output.notes || null
        },
        select: { id: true }
      })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'TASK_HOURS_LOGGED',
          module: 'TASKS',
          details: {
            taskId: id,
            projectId: task.project_id,
            timesheetId: timeLog.id,
            workDate: validation.output.work_date,
            hours: hours.toString(),
            actualHours: updated.actual_hours?.toString(),
            autoTransitioned: statusTransition?.count === 1
          }
        }
      })

      return updated
    })

    revalidateTasks()

    return { success: true, data: { actualHours: decimal(result.actual_hours) }, message: context.translations.messages.hoursLogged }
  } catch {
    return { success: false, code: 'HOURS_LOG_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const attachTimesheetToTask = async (taskId, timesheetId, payload = {}) => {
  const context = await getContext(payload, SELF_UPDATE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const id = normalizeId(taskId)
  const entryId = normalizeId(timesheetId)

  try {
    const [task, timesheet] = await Promise.all([
      prisma.task.findFirst({
        where: { AND: [{ id }, visibilityWhere(context)] },
        select: { id: true, project_id: true, project: { select: { status: { select: { value: true } } } } }
      }),
      prisma.hrmstafftimesheet.findUnique({
        where: { id: entryId },
        select: { id: true, staff_id: true, project_id: true, status: true }
      })
    ])

    if (!task || !timesheet || timesheet.project_id !== task.project_id) {
      return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    }

    if (!context.canManage && timesheet.staff_id !== context.staffId) {
      return { success: false, code: 'FORBIDDEN', error: context.translations.messages.forbidden }
    }

    if (timesheet.status !== 'APPROVED') {
      return { success: false, code: 'TIMESHEET_NOT_APPROVED', error: context.translations.messages.timesheetApprovalRequired }
    }

    if (task.project.status.value === 'COMPLETED') {
      return { success: false, code: 'PROJECT_COMPLETED', error: context.translations.messages.projectCompleted }
    }

    await prisma.$transaction([
      prisma.hrmstafftimesheet.update({ where: { id: entryId }, data: { task_id: task.id } }),
      prisma.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'TASK_TIMESHEET_ATTACHED',
          module: 'TASKS',
          details: { taskId: task.id, timesheetId: entryId, projectId: task.project_id }
        }
      })
    ])
    revalidateTasks()

    return { success: true, message: context.translations.messages.timesheetAttached }
  } catch {
    return { success: false, code: 'TIMESHEET_ATTACH_FAILED', error: context.translations.messages.operationFailed }
  }
}

const getCollaborativeTask = (context, taskId) => prisma.task.findFirst({
  where: { AND: [{ id: normalizeId(taskId) }, visibilityWhere(context)] },
  select: { id: true, project_id: true }
})

export const addTaskSubtask = async (taskId, payload = {}) => {
  const context = await getContext(payload, SELF_UPDATE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const parentId = normalizeId(payload.parent_id)

  if (!title || title.length > 191) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.subtaskInvalid }

  try {
    const task = await getCollaborativeTask(context, taskId)

    if (!task) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const parent = parentId ? await prisma.tasksubtask.findFirst({ where: { id: parentId, task_id: task.id }, select: { id: true } }) : null

    if (parentId && !parent) return { success: false, code: 'INVALID_PARENT', error: context.translations.validation.subtaskInvalid }

    const aggregate = await prisma.tasksubtask.aggregate({ where: { task_id: task.id, parent_id: parentId || null }, _max: { sort_order: true } })

    const created = await prisma.tasksubtask.create({
      data: { task_id: task.id, parent_id: parentId || null, title, created_by_id: context.staffId, sort_order: (aggregate._max.sort_order ?? -1) + 1 },
      select: { id: true }
    })

    revalidateTasks()

    return { success: true, data: created, message: context.translations.messages.subtaskAdded }
  } catch {
    return { success: false, code: 'SUBTASK_CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const toggleTaskSubtask = async (taskId, subtaskId, payload = {}) => {
  const context = await getContext(payload, SELF_UPDATE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const task = await getCollaborativeTask(context, taskId)
    const subtask = task ? await prisma.tasksubtask.findFirst({ where: { id: normalizeId(subtaskId), task_id: task.id }, select: { id: true, is_completed: true } }) : null

    if (!subtask) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    await prisma.tasksubtask.update({ where: { id: subtask.id }, data: { is_completed: !subtask.is_completed } })
    revalidateTasks()

    return { success: true, message: context.translations.messages.subtaskUpdated }
  } catch {
    return { success: false, code: 'SUBTASK_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const addTaskAttachment = async (taskId, payload = {}) => {
  const context = await getContext(payload, SELF_UPDATE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const type = payload.attachment_type === 'LINK' ? 'LINK' : 'FILE'
  const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 191) : ''
  const url = typeof payload.url === 'string' ? payload.url.trim() : ''
  const validUrl = type === 'LINK' ? /^https?:\/\//i.test(url) : /^\/uploads\/task-attachments\/[a-zA-Z0-9._-]+$/.test(url)

  if (!name || !validUrl) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.attachmentInvalid }

  try {
    const task = await getCollaborativeTask(context, taskId)

    if (!task) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const created = await prisma.taskattachment.create({
      data: {
        task_id: task.id,
        created_by_user_id: context.session.user.id,
        attachment_type: type,
        name,
        url,
        mime_type: typeof payload.mime_type === 'string' ? payload.mime_type.slice(0, 191) : null,
        file_size: Number.isInteger(payload.file_size) ? payload.file_size : null
      },
      select: { id: true }
    })

    revalidateTasks()

    return { success: true, data: created, message: context.translations.messages.attachmentAdded }
  } catch {
    return { success: false, code: 'ATTACHMENT_CREATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const addTaskComment = async (taskId, payload = {}) => {
  const context = await getContext(payload, SELF_UPDATE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  if (!context.staffId) return { success: false, code: 'STAFF_PROFILE_REQUIRED', error: context.translations.messages.staffProfileRequired }
  const body = typeof payload.body === 'string' ? payload.body.trim() : ''

  if (!body || body.length > 5000) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.commentInvalid }

  try {
    const task = await getCollaborativeTask(context, taskId)

    if (!task) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    const created = await prisma.$transaction(async transaction => {
      const comment = await transaction.taskcomment.create({ data: { task_id: task.id, author_id: context.staffId, body }, select: { id: true } })

      await transaction.auditlog.create({
        data: { user_id: context.session.user.id, action: 'TASK_COMMENT_ADDED', module: 'TASKS', details: { taskId: task.id, commentId: comment.id, mentions: [...body.matchAll(/@([\p{L}\p{N}_. -]+)/gu)].map(match => match[1].trim()) } }
      })

      return comment
    })

    revalidateTasks()

    return { success: true, data: created, message: context.translations.messages.commentAdded }
  } catch {
    return { success: false, code: 'COMMENT_CREATE_FAILED', error: context.translations.messages.operationFailed }
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
