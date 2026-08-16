import { Prisma } from '@prisma/client'
import sanitizeHtml from 'sanitize-html'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import {
  CRM_READ_PERMISSIONS,
  CRM_WRITE_PERMISSIONS,
  getCurrentStaffId,
  leadInclude,
  normalizeLead,
  parseOptionalDate
} from '@/libs/crmLeads'
import { prisma } from '@/libs/prisma'
import { createLeadSchema } from '@/schemas/crm/leads'
import { getDictionary } from '@/utils/getDictionary'

const MAX_PAGE_SIZE = 200
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

const getContext = async (request, permissions) => {
  const locale = localeFrom(request.nextUrl.searchParams.get('locale'))
  const [authorization, dictionary] = await Promise.all([authorizeAction(permissions), getDictionary(locale)])

  return { authorization, dictionary: dictionary.crmLeads, locale }
}

const cleanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()

export async function GET(request) {
  const { authorization, dictionary } = await getContext(request, CRM_READ_PERMISSIONS)

  if (!authorization.authorized) {
    return errorResponse(
      authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated,
      authorization.code === 'FORBIDDEN' ? 403 : 401,
      authorization.code
    )
  }

  const params = request.nextUrl.searchParams
  const view = params.get('view') === 'kanban' ? 'kanban' : 'table'
  const search = (params.get('search') || '').trim()
  const statusId = params.get('status_id') || ''
  const sourceId = params.get('source_id') || ''
  const assignedToId = params.get('assigned_to_id') || ''
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const requestedLimit = Number.parseInt(params.get('limit') || '10', 10) || 10
  const limit = view === 'kanban' ? MAX_PAGE_SIZE : Math.min(MAX_PAGE_SIZE, Math.max(1, requestedLimit))

  const where = {
    ...(statusId && { status_id: statusId }),
    ...(sourceId && { source_id: sourceId }),
    ...(assignedToId && { assigned_to_id: assignedToId }),
    ...(search && {
      OR: [
        { title: { contains: search } },
        { company_name: { contains: search } },
        { contact_name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ]
    })
  }

  try {
    const [leads, totalCount, summaryLeads, statuses, sources, staff] = await Promise.all([
      prisma.crmLead.findMany({
        where,
        include: leadInclude,
        orderBy: [{ next_follow_up_date: 'asc' }, { created_at: 'desc' }],
        skip: view === 'kanban' ? 0 : (page - 1) * limit,
        take: limit
      }),
      prisma.crmLead.count({ where }),
      prisma.crmLead.findMany({ where, select: { estimated_value: true, next_follow_up_date: true, converted_client: { select: { id: true } }, status: { select: { value: true } } } }),
      prisma.option.findMany({ where: { category: 'LEAD_STATUS', is_active: true }, select: { id: true, label: true, value: true, color_code: true }, orderBy: { sort_order: 'asc' } }),
      prisma.option.findMany({ where: { category: 'LEAD_SOURCE', is_active: true }, select: { id: true, label: true, value: true, color_code: true }, orderBy: { sort_order: 'asc' } }),
      prisma.hrmStaff.findMany({ where: { status: 'ACTIVE' }, select: { id: true, first_name: true, last_name: true, position: true }, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }] })
    ])

    const today = new Date()
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const endOfToday = new Date(startOfToday.getTime() + 86_400_000 - 1)
    const activeLeads = summaryLeads.filter(lead => !['WON', 'LOST'].includes(lead.status.value))
    const convertedCount = summaryLeads.filter(lead => lead.converted_client).length

    return Response.json({
      success: true,
      data: {
        leads: leads.map(normalizeLead),
        totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        summary: {
          totalActive: activeLeads.length,
          pipelineValue: activeLeads.reduce((total, lead) => total + Number(lead.estimated_value || 0), 0).toFixed(2),
          followUpsToday: activeLeads.filter(lead => lead.next_follow_up_date && lead.next_follow_up_date >= startOfToday && lead.next_follow_up_date <= endOfToday).length,
          wonDeals: summaryLeads.filter(lead => lead.status.value === 'WON').length,
          conversionRate: summaryLeads.length ? Number(((convertedCount / summaryLeads.length) * 100).toFixed(2)) : 0
        },
        options: {
          statuses,
          sources,
          staff: staff.map(item => ({ ...item, full_name: `${item.first_name} ${item.last_name}`.trim() }))
        }
      }
    })
  } catch (error) {
    console.error('CRM leads query failed', error)

    return errorResponse(dictionary.messages.loadFailed, 500, 'LEADS_LOAD_FAILED')
  }
}

export async function POST(request) {
  const { authorization, dictionary } = await getContext(request, CRM_WRITE_PERMISSIONS)

  if (!authorization.authorized) {
    return errorResponse(
      authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated,
      authorization.code === 'FORBIDDEN' ? 403 : 401,
      authorization.code
    )
  }

  try {
    const payload = await request.json()

    const parsed = safeParse(createLeadSchema(dictionary.validation), {
      ...payload,
      estimated_value: Number(payload.estimated_value || 0)
    })

    if (!parsed.success) return errorResponse(parsed.issues[0]?.message || dictionary.validation.invalid, 400, 'VALIDATION_ERROR')

    const values = parsed.output

    const [source, status, assignedStaff, currentStaffId] = await Promise.all([
      prisma.option.findFirst({ where: { id: values.source_id, category: 'LEAD_SOURCE', is_active: true }, select: { id: true } }),
      prisma.option.findFirst({ where: { id: values.status_id, category: 'LEAD_STATUS', is_active: true }, select: { id: true } }),
      values.assigned_to_id ? prisma.hrmStaff.findFirst({ where: { id: values.assigned_to_id, status: 'ACTIVE' }, select: { id: true } }) : null,
      getCurrentStaffId(authorization.session.user.id)
    ])

    if (!source || !status || (values.assigned_to_id && !assignedStaff)) return errorResponse(dictionary.messages.invalidRelations, 400, 'INVALID_RELATIONS')

    const activityStaffId = currentStaffId || assignedStaff?.id

    if (!activityStaffId) return errorResponse(dictionary.messages.staffProfileRequired, 409, 'STAFF_PROFILE_REQUIRED')

    const lead = await prisma.$transaction(async transaction => {
      const created = await transaction.crmLead.create({
        data: {
          title: cleanText(values.title),
          contact_name: cleanText(values.contact_name),
          company_name: cleanText(values.company_name) || null,
          email: values.email.toLowerCase(),
          phone: cleanText(values.phone) || null,
          source_id: values.source_id,
          status_id: values.status_id,
          assigned_to_id: values.assigned_to_id || null,
          estimated_value: new Prisma.Decimal(values.estimated_value),
          next_follow_up_date: parseOptionalDate(values.next_follow_up_date),
          notes: cleanText(values.notes) || null,
          activities: { create: { staff_id: activityStaffId, activity_type: 'NOTE', title: dictionary.activities.leadCreated } }
        },
        include: leadInclude
      })

      await transaction.auditLog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_LEAD_CREATED', module: 'CRM', details: { leadId: created.id } } })

      return created
    })

    return Response.json({ success: true, data: normalizeLead(lead), message: dictionary.messages.created }, { status: 201 })
  } catch (error) {
    console.error('CRM lead creation failed', error)

    return errorResponse(dictionary.messages.operationFailed, 500, 'LEAD_CREATE_FAILED')
  }
}
