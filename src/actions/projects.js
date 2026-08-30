'use server'

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { getProjectsDictionary } from '@/data/dictionaries/projects'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { isOverdue } from '@/libs/financialStatuses'
import { activeStaffContractRelation } from '@/libs/hrmContractAccess'
import { prisma } from '@/libs/prisma'
import { nextSequentialNumber, withSequentialNumberRetry } from '@/libs/sequentialNumbers'
import { createProjectSchema } from '@/schemas/projects'
import { toUtcDateOnly } from '@/utils/contractDuration'
import { SYSTEM_BASE_CURRENCY, convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'
import { sanitizeRichText } from '@/utils/richText'

const READ_PERMISSIONS = ['projects:read', 'projects:write']
const WRITE_PERMISSIONS = ['projects:write']
const DELETE_PERMISSIONS = ['projects:delete']
const PROJECT_STATUS_VALUES = Object.freeze(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
const ACTIVE_VALUES = Object.freeze(['PLANNING', 'IN_PROGRESS', 'ON_HOLD'])
const CLOSED_VALUES = ['COMPLETED', 'CANCELLED']
const APPROVED_TIMESHEET_STATUS = 'APPROVED'
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)
const normalizeId = value => (typeof value === 'string' ? value.trim() : '')
const iso = value => value?.toISOString() ?? null
const numberString = (value, precision = 2) => value == null ? null : value.toFixed(precision)

const getContext = async (payload, permissions) => {
  const locale = normalizeLocale(payload?.locale)
  const authorization = await authorizeAction(permissions)
  const translations = getProjectsDictionary(locale)

  if (!authorization.authorized) {
    return {
      authorized: false,
      code: authorization.code,
      error: authorization.code === 'UNAUTHENTICATED' ? translations.messages.unauthenticated : translations.messages.forbidden,
      locale,
      translations
    }
  }

  return { authorized: true, session: authorization.session, locale, translations }
}

const optionSelect = { id: true, label: true, value: true, color_code: true, is_default: true, is_active: true }

const staffSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  position: true,
  user: { select: { image: true } }
}

const projectSelect = {
  id: true,
  contract_id: true,
  client_id: true,
  project_code: true,
  title: true,
  description: true,
  status_id: true,
  priority_id: true,
  project_area: true,
  project_sponsor: true,
  project_manager_id: true,
  estimated_hours: true,
  actual_hours: true,
  budget: true,
  currency: true,
  exchange_rate: true,
  amount_base: true,
  start_date: true,
  end_date: true,
  actual_end_date: true,
  created_at: true,
  updated_at: true,
  client: { select: { id: true, company_name: true, primary_contact_name: true, email: true, phone: true, address: true } },
  contract: { select: { id: true, contract_number: true, title: true, total_amount: true, currency: true, amount_base: true, start_date: true, end_date: true, status: { select: optionSelect }, contract_type: { select: optionSelect } } },
  project_manager: { select: staffSelect },
  status: { select: optionSelect },
  priority: { select: optionSelect },
  members: { select: { id: true, role: true, assigned_at: true, staff: { select: staffSelect } }, orderBy: { assigned_at: 'asc' } }
}

const withFullName = staff => staff ? { ...staff, full_name: `${staff.first_name} ${staff.last_name}`.trim() } : null

const normalizeProject = (project, approvedHours = project.actual_hours) => ({
  ...project,
  estimated_hours: numberString(project.estimated_hours),
  actual_hours: numberString(approvedHours),
  logged_hours: numberString(approvedHours),
  budget: numberString(project.budget),
  exchange_rate: numberString(project.exchange_rate, 4),
  amount_base: numberString(project.amount_base),
  start_date: iso(project.start_date),
  end_date: iso(project.end_date),
  actual_end_date: iso(project.actual_end_date),
  created_at: iso(project.created_at),
  updated_at: iso(project.updated_at),
  project_manager: withFullName(project.project_manager),
  members: project.members?.map(member => ({ ...member, assigned_at: iso(member.assigned_at), staff: withFullName(member.staff) })) || [],
  contract: project.contract ? {
    ...project.contract,
    total_amount: numberString(project.contract.total_amount),
    amount_base: numberString(project.contract.amount_base),
    start_date: iso(project.contract.start_date),
    end_date: iso(project.contract.end_date)
  } : null,
  is_overdue: isOverdue({ dueDate: project.end_date, completed: project.status?.value === 'COMPLETED', today: toUtcDateOnly(new Date()) }),
  progress: project.status?.value === 'COMPLETED'
    ? 100
    : Math.min(100, Math.round((toFiniteNumber(approvedHours) / Math.max(toFiniteNumber(project.estimated_hours), 1)) * 100))
})

const revalidateProjects = () => {
  revalidatePath('/[lang]/projects', 'page')
  revalidatePath('/[lang]/crm/clients', 'page')
}

const validationPayload = payload => ({
  title: payload?.title,
  description: payload?.description || '',
  client_id: payload?.client_id,
  contract_id: payload?.contract_id || '',
  project_manager_id: payload?.project_manager_id || '',
  status_id: payload?.status_id,
  priority_id: payload?.priority_id,
  project_area: payload?.project_area || '',
  project_sponsor: payload?.project_sponsor || '',
  estimated_hours: String(payload?.estimated_hours ?? '0'),
  actual_hours: String(payload?.actual_hours ?? '0'),
  budget: String(payload?.budget ?? ''),
  currency: payload?.currency || 'AFN',
  exchange_rate: String(payload?.exchange_rate ?? '65'),
  start_date: payload?.start_date,
  end_date: payload?.end_date,
  actual_end_date: payload?.actual_end_date || ''
})

const prepareProjectData = async (values, translations, current = null) => {
  const [client, contract, manager, status, priority, setup] = await Promise.all([
    prisma.crmclient.findUnique({ where: { id: values.client_id }, select: { id: true } }),
    values.contract_id ? prisma.contract.findUnique({ where: { id: values.contract_id }, select: { id: true, client_id: true } }) : null,
    values.project_manager_id ? prisma.hrmstaff.findFirst({ where: { id: values.project_manager_id, status: 'ACTIVE', contracts: activeStaffContractRelation({ startDate: new Date() }) }, select: { id: true } }) : null,
    prisma.option.findFirst({ where: { id: values.status_id, category: 'PROJECT_STATUS', value: { in: PROJECT_STATUS_VALUES }, ...(current?.status_id === values.status_id ? {} : { is_active: true }) }, select: { id: true, value: true } }),
    prisma.option.findFirst({ where: { id: values.priority_id, category: 'PROJECT_PRIORITY', ...(current?.priority_id === values.priority_id ? {} : { is_active: true }) }, select: { id: true } }),
    getCompanySetupRecord()
  ])

  if (!client || !status || !priority || (values.contract_id && (!contract || contract.client_id !== values.client_id)) || (values.project_manager_id && !manager)) {
    return { success: false, error: translations.validation.invalidRelation }
  }

  const startDate = toUtcDateOnly(values.start_date)
  const endDate = toUtcDateOnly(values.end_date)
  const budget = toFiniteNumber(values.budget)
  const rate = toFiniteNumber(values.exchange_rate)

  if (!startDate || !endDate || endDate < startDate) return { success: false, error: translations.validation.dateRangeInvalid }
  if (rate <= 0) return { success: false, error: translations.validation.positiveInvalid }

  return {
    success: true,
    data: {
      title: values.title,
      description: sanitizeRichText(values.description) || null,
      client_id: values.client_id,
      contract_id: values.contract_id || null,
      project_manager_id: values.project_manager_id || null,
      status_id: values.status_id,
      priority_id: values.priority_id,
      project_area: values.project_area || null,
      project_sponsor: values.project_sponsor || null,
      estimated_hours: new Prisma.Decimal(toFiniteNumber(values.estimated_hours)),
      actual_hours: new Prisma.Decimal(current ? toFiniteNumber(values.actual_hours ?? current.actual_hours) : 0),
      budget: new Prisma.Decimal(budget),
      currency: values.currency,
      exchange_rate: new Prisma.Decimal(rate),
      amount_base: new Prisma.Decimal(convertToBaseCurrency(budget, values.currency, rate, SYSTEM_BASE_CURRENCY)),
      start_date: startDate,
      end_date: endDate,
      actual_end_date: current && status.value === 'COMPLETED'
        ? current.actual_end_date || toUtcDateOnly(new Date())
        : current?.actual_end_date || null
    }
  }
}

export const getProjects = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const page = Math.max(1, Number.parseInt(payload.page, 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(payload.limit, 10) || DEFAULT_PAGE_SIZE))
  const search = typeof payload.search === 'string' ? payload.search.trim() : ''
  const clientId = normalizeId(payload.clientId)
  const managerId = normalizeId(payload.managerId)
  const statusId = normalizeId(payload.statusId)
  const priorityId = normalizeId(payload.priorityId)

  const where = {
    AND: [
      clientId ? { client_id: clientId } : {}, managerId ? { project_manager_id: managerId } : {},
      statusId ? { status_id: statusId } : {}, priorityId ? { priority_id: priorityId } : {},
      search ? { OR: [{ project_code: { contains: search } }, { title: { contains: search } }, { project_sponsor: { contains: search } }] } : {}
    ]
  }

  const activeWhere = { status: { is: { value: { in: ACTIVE_VALUES } } } }
  const today = toUtcDateOnly(new Date())

  try {
    const [totalCount, projects, active, totals, approvedHours, activeApprovedHours, estimatedHours, overdueCount, setup, statuses, priorities] = await prisma.$transaction([
      prisma.project.count({ where }),
      prisma.project.findMany({ where, select: projectSelect, orderBy: [{ end_date: 'asc' }, { created_at: 'desc' }], skip: (page - 1) * limit, take: limit }),
      prisma.project.count({ where: activeWhere }),
      prisma.project.aggregate({ _sum: { budget: true, amount_base: true } }),
      prisma.hrmstafftimesheet.groupBy({ by: ['project_id'], where: { project_id: { not: null }, status: APPROVED_TIMESHEET_STATUS }, _sum: { hours_worked: true } }),
      prisma.hrmstafftimesheet.aggregate({ where: { status: APPROVED_TIMESHEET_STATUS, project: { is: { status: { is: { value: { in: ACTIVE_VALUES } } } } } }, _sum: { hours_worked: true } }),
      prisma.project.aggregate({ where: activeWhere, _sum: { estimated_hours: true } }),
      prisma.project.count({ where: { end_date: { lt: today }, status: { is: { value: { not: 'COMPLETED' } } } } }),
      prisma.setup.findUnique({ where: { scope: 'GLOBAL' }, select: { currency_code: true } }),
      prisma.option.findMany({ where: { category: 'PROJECT_STATUS', value: { in: PROJECT_STATUS_VALUES }, is_active: true }, select: optionSelect, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }] }),
      prisma.option.findMany({ where: { category: 'PROJECT_PRIORITY', is_active: true }, select: optionSelect, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }] })
    ])

    const hoursByProject = new Map(approvedHours.map(row => [row.project_id, toFiniteNumber(row._sum.hours_worked)]))

    return { success: true, data: { projects: projects.map(project => normalizeProject(project, hoursByProject.get(project.id) || 0)), totalCount, page, baseCurrency: SYSTEM_BASE_CURRENCY, statuses, priorities, summary: { activeCount: active, budget: toFiniteNumber(totals._sum.budget), amountBase: toFiniteNumber(totals._sum.amount_base), actualHours: toFiniteNumber(activeApprovedHours._sum.hours_worked), estimatedHours: toFiniteNumber(estimatedHours._sum.estimated_hours), overdueCount } } }
  } catch {
    return { success: false, code: 'PROJECTS_LOAD_FAILED', error: context.translations.messages.loadFailed }
  }
}

export const getProjectFormOptions = async (payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const [clients, staff, contracts, options, setup] = await Promise.all([
      prisma.crmclient.findMany({ where: { status: 'ACTIVE' }, select: { id: true, company_name: true, primary_contact_name: true }, orderBy: { company_name: 'asc' }, take: 500 }),
      prisma.hrmstaff.findMany({ where: { status: 'ACTIVE', contracts: activeStaffContractRelation({ startDate: new Date() }) }, select: staffSelect, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }], take: 500 }),
      prisma.contract.findMany({ where: { client_id: { not: null } }, select: { id: true, client_id: true, contract_number: true, title: true, total_amount: true, currency: true, exchange_rate: true, amount_base: true }, orderBy: { created_at: 'desc' }, take: 500 }),
      prisma.option.findMany({ where: { category: { in: ['PROJECT_STATUS', 'PROJECT_PRIORITY'] }, is_active: true, OR: [{ category: 'PROJECT_PRIORITY' }, { value: { in: PROJECT_STATUS_VALUES } }] }, select: { ...optionSelect, category: true }, orderBy: [{ category: 'asc' }, { sort_order: 'asc' }, { label: 'asc' }] }),
      getCompanySetupRecord()
    ])

    return { success: true, data: { clients, staff: staff.map(withFullName), contracts: contracts.map(contract => ({ ...contract, total_amount: numberString(contract.total_amount), exchange_rate: numberString(contract.exchange_rate, 4), amount_base: numberString(contract.amount_base) })), statuses: options.filter(option => option.category === 'PROJECT_STATUS'), priorities: options.filter(option => option.category === 'PROJECT_PRIORITY'), baseCurrency: SYSTEM_BASE_CURRENCY, exchangeRate: setup.usd_afn_exchange_rate || '65.0000' } }
  } catch {
    return { success: false, code: 'OPTIONS_LOAD_FAILED', error: context.translations.messages.optionsLoadFailed }
  }
}

export const getProjectDetail = async (id, payload = {}) => {
  const context = await getContext(payload, READ_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const projectId = normalizeId(id)

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ...projectSelect,
        timesheets: { where: { status: APPROVED_TIMESHEET_STATUS }, select: { id: true, task_id: true, date: true, status: true, hours_worked: true, notes: true, check_in_time: true, check_out_time: true, staff: { select: staffSelect }, task: { select: { id: true, title: true } } }, orderBy: { date: 'desc' } },
        tasks: { select: { id: true, title: true }, orderBy: { created_at: 'desc' } },
        expenses: { where: { approval_status: 'PAID' }, select: { id: true, vendor_payee: true, approval_status: true, expense_date: true, details: true, sub_total: true, currency: true, amount_base: true, expense_type: { select: optionSelect }, spent_by: { select: staffSelect } }, orderBy: { expense_date: 'desc' } },
        incomes: { select: { id: true, name: true, status: true, total_amount: true, paid_amount: true, currency: true, amount_base: true, created_at: true, income_type: { select: optionSelect }, received_by: { select: staffSelect } }, orderBy: { created_at: 'desc' } }
      }
    })

    if (!project) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    const loggedHours = project.timesheets.reduce((sum, row) => sum + toFiniteNumber(row.hours_worked), 0)
    const normalized = normalizeProject(project, loggedHours)

    return { success: true, data: { ...normalized,
      timesheets: project.timesheets.map(row => ({ ...row, date: iso(row.date), check_in_time: iso(row.check_in_time), check_out_time: iso(row.check_out_time), hours_worked: numberString(row.hours_worked), staff: withFullName(row.staff) })),
      expenses: project.expenses.map(row => ({ ...row, expense_date: iso(row.expense_date), sub_total: numberString(row.sub_total), amount_base: numberString(row.amount_base), spent_by: withFullName(row.spent_by) })),
      incomes: project.incomes.map(row => ({ ...row, total_amount: numberString(row.total_amount), paid_amount: numberString(row.paid_amount), amount_base: numberString(row.amount_base), created_at: iso(row.created_at), received_by: withFullName(row.received_by) })),
      financeSummary: { revenue: project.incomes.reduce((sum, row) => sum + toFiniteNumber(row.amount_base), 0), expenses: project.expenses.reduce((sum, row) => sum + toFiniteNumber(row.amount_base), 0) }
    } }
  } catch {
    return { success: false, code: 'DETAIL_LOAD_FAILED', error: context.translations.messages.detailLoadFailed }
  }
}

export const createProject = async (payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const validation = safeParse(createProjectSchema(context.translations.validation), validationPayload(payload))

  if (!validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues[0]?.message }
  const prepared = await prepareProjectData(validation.output, context.translations)

  if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }

  try {
    const created = await withSequentialNumberRetry(() => prisma.$transaction(async transaction => {
      const projectCode = await nextSequentialNumber(transaction, 'project', {
        prefix: `PRJ-${new Date().getUTCFullYear()}-`,
        digits: 3
      })

      const project = await transaction.project.create({ data: { ...prepared.data, project_code: projectCode } })

      await transaction.auditlog.create({ data: { user_id: context.session.user.id, action: 'PROJECT_CREATED', module: 'PROJECTS', details: { projectId: project.id, projectCode } } })

      return project
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }))

    revalidateProjects()

    return { success: true, data: { id: created.id }, message: context.translations.messages.created }
  } catch (error) {
    return { success: false, code: error?.code === 'P2002' ? 'DUPLICATE' : 'CREATE_FAILED', error: error?.code === 'P2002' ? context.translations.messages.duplicate : context.translations.messages.operationFailed }
  }
}

export const updateProject = async (id, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const projectId = normalizeId(id)
  const validation = safeParse(createProjectSchema(context.translations.validation), validationPayload(payload))

  if (!projectId || !validation.success) return { success: false, code: 'VALIDATION_ERROR', error: validation.issues?.[0]?.message || context.translations.messages.notFound }

  try {
    const current = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, project_code: true, status_id: true, priority_id: true, actual_hours: true, actual_end_date: true } })

    if (!current) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    const prepared = await prepareProjectData(validation.output, context.translations, current)

    if (!prepared.success) return { success: false, code: 'VALIDATION_ERROR', error: prepared.error }
    await prisma.$transaction([
      prisma.project.update({ where: { id: projectId }, data: prepared.data }),
      prisma.auditlog.create({ data: { user_id: context.session.user.id, action: 'PROJECT_UPDATED', module: 'PROJECTS', details: { projectId, projectCode: current.project_code } } })
    ])
    revalidateProjects()

    return { success: true, message: context.translations.messages.updated }
  } catch {
    return { success: false, code: 'UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateProjectStatus = async (id, statusId, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const projectId = normalizeId(id)
  const normalizedStatusId = normalizeId(statusId)

  if (!projectId || !normalizedStatusId) {
    return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidRelation }
  }

  try {
    const [project, status] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { id: true, project_code: true, actual_end_date: true, end_date: true, estimated_hours: true, project_manager_id: true } }),
      prisma.option.findFirst({
        where: { id: normalizedStatusId, category: 'PROJECT_STATUS', is_active: true },
        select: { id: true, value: true }
      })
    ])

    if (!project) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }

    if (!status) {
      return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidRelation }
    }

    const updated = await prisma.$transaction(async transaction => {
      const approved = await transaction.hrmstafftimesheet.aggregate({
        where: { project_id: projectId, status: APPROVED_TIMESHEET_STATUS },
        _sum: { hours_worked: true }
      })

      const loggedHours = toFiniteNumber(approved._sum.hours_worked)

      const reviewReason = status.value !== 'COMPLETED' && (
        loggedHours >= toFiniteNumber(project.estimated_hours) || toUtcDateOnly(new Date()) > project.end_date
      )
        ? loggedHours >= toFiniteNumber(project.estimated_hours) ? 'ESTIMATED_HOURS_REACHED' : 'TARGET_DEADLINE_REACHED'
        : null

      const result = await transaction.project.update({
        where: { id: projectId },
        data: {
          status_id: status.id,
          ...(status.value === 'COMPLETED' && { actual_end_date: project.actual_end_date || toUtcDateOnly(new Date()) })
        },
        select: projectSelect
      })

      await transaction.auditlog.create({
        data: {
          user_id: context.session.user.id,
          action: 'PROJECT_STATUS_UPDATED',
          module: 'PROJECTS',
          details: { projectId, projectCode: project.project_code, status: status.value }
        }
      })

      if (reviewReason) {
        await transaction.auditlog.create({
          data: {
            action: 'PROJECT_REVIEW_REQUIRED',
            module: 'PROJECTS',
            details: {
              projectId,
              projectCode: project.project_code,
              projectManagerId: project.project_manager_id,
              reason: reviewReason,
              loggedHours,
              estimatedHours: toFiniteNumber(project.estimated_hours)
            }
          }
        })
      }

      return { result, loggedHours }
    })

    revalidateProjects()

    return { success: true, data: normalizeProject(updated.result, updated.loggedHours), message: context.translations.messages.statusUpdated }
  } catch {
    return { success: false, code: 'STATUS_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const deleteProject = async (id, payload = {}) => {
  const context = await getContext(payload, DELETE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const projectId = normalizeId(id)

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, project_code: true, _count: { select: { timesheets: true, expenses: true, incomes: true, tasks: true } } } })

    if (!project) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    if (Object.values(project._count).some(Boolean)) return { success: false, code: 'IN_USE', error: context.translations.messages.inUse }
    await prisma.$transaction([
      prisma.projectmember.deleteMany({ where: { project_id: projectId } }),
      prisma.project.delete({ where: { id: projectId } }),
      prisma.auditlog.create({ data: { user_id: context.session.user.id, action: 'PROJECT_DELETED', module: 'PROJECTS', details: { projectId, projectCode: project.project_code } } })
    ])
    revalidateProjects()

    return { success: true, message: context.translations.messages.deleted }
  } catch {
    return { success: false, code: 'DELETE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const assignProjectMember = async (projectId, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const id = normalizeId(projectId)
  const staffId = normalizeId(payload.staff_id)
  const role = typeof payload.role === 'string' ? payload.role.trim().slice(0, 191) : ''

  try {
    const [project, staff] = await Promise.all([prisma.project.findUnique({ where: { id }, select: { id: true } }), prisma.hrmstaff.findFirst({ where: { id: staffId, status: 'ACTIVE', contracts: activeStaffContractRelation({ startDate: new Date() }) }, select: { id: true } })])

    if (!project || !staff) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidRelation }
    await prisma.$transaction([
      prisma.projectmember.upsert({ where: { project_id_staff_id: { project_id: id, staff_id: staffId } }, update: { role: role || null }, create: { project_id: id, staff_id: staffId, role: role || null } }),
      prisma.auditlog.create({ data: { user_id: context.session.user.id, action: 'PROJECT_MEMBER_ASSIGNED', module: 'PROJECTS', details: { projectId: id, staffId, role: role || null } } })
    ])
    revalidateProjects()

    return { success: true, message: context.translations.messages.memberAssigned }
  } catch {
    return { success: false, code: 'MEMBER_ASSIGN_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const removeProjectMember = async (projectId, memberId, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }

  try {
    const id = normalizeId(projectId)
    const normalizedMemberId = normalizeId(memberId)
    const member = await prisma.projectmember.findFirst({ where: { id: normalizedMemberId, project_id: id }, select: { id: true, staff_id: true } })

    if (!member) return { success: false, code: 'NOT_FOUND', error: context.translations.messages.notFound }
    await prisma.$transaction([
      prisma.projectmember.delete({ where: { id: member.id } }),
      prisma.auditlog.create({ data: { user_id: context.session.user.id, action: 'PROJECT_MEMBER_REMOVED', module: 'PROJECTS', details: { projectId: id, staffId: member.staff_id } } })
    ])
    revalidateProjects()

    return { success: true, message: context.translations.messages.memberRemoved }
  } catch {
    return { success: false, code: 'MEMBER_REMOVE_FAILED', error: context.translations.messages.operationFailed }
  }
}

export const updateProjectContract = async (projectId, contractId, payload = {}) => {
  const context = await getContext(payload, WRITE_PERMISSIONS)

  if (!context.authorized) return { success: false, code: context.code, error: context.error }
  const id = normalizeId(projectId)
  const normalizedContractId = normalizeId(contractId)

  try {
    const project = await prisma.project.findUnique({ where: { id }, select: { id: true, client_id: true } })
    const contract = normalizedContractId ? await prisma.contract.findUnique({ where: { id: normalizedContractId }, select: { id: true, client_id: true } }) : null

    if (!project || (normalizedContractId && (!contract || contract.client_id !== project.client_id))) return { success: false, code: 'VALIDATION_ERROR', error: context.translations.validation.invalidRelation }
    await prisma.$transaction([
      prisma.project.update({ where: { id }, data: { contract_id: normalizedContractId || null } }),
      prisma.auditlog.create({ data: { user_id: context.session.user.id, action: 'PROJECT_CONTRACT_UPDATED', module: 'PROJECTS', details: { projectId: id, contractId: normalizedContractId || null } } })
    ])
    revalidateProjects()

    return { success: true, message: context.translations.messages.contractUpdated }
  } catch {
    return { success: false, code: 'CONTRACT_UPDATE_FAILED', error: context.translations.messages.operationFailed }
  }
}
