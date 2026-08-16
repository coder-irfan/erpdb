import sanitizeHtml from 'sanitize-html'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { CRM_VISITOR_READ_PERMISSIONS, CRM_VISITOR_WRITE_PERMISSIONS, normalizeVisitor, visitorInclude } from '@/libs/crmVisitors'
import { prisma } from '@/libs/prisma'
import { createVisitorSchema } from '@/schemas/crm/visitors'
import { getDictionary } from '@/utils/getDictionary'

const MAX_PAGE_SIZE = 100
const DAY_MS = 86_400_000
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const cleanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

const getContext = async (request, permissions) => {
  const locale = localeFrom(request.nextUrl.searchParams.get('locale'))
  const [authorization, dictionary] = await Promise.all([authorizeAction(permissions), getDictionary(locale)])

  return { authorization, dictionary: dictionary.crmVisitors }
}

const getDateRange = value => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (!value || value === 'TODAY') return { gte: today, lt: new Date(today.getTime() + DAY_MS) }
  if (value === 'ALL') return undefined
  if (value === 'LAST_7_DAYS') return { gte: new Date(today.getTime() - 6 * DAY_MS), lt: new Date(today.getTime() + DAY_MS) }
  if (value === 'LAST_30_DAYS') return { gte: new Date(today.getTime() - 29 * DAY_MS), lt: new Date(today.getTime() + DAY_MS) }

  const [startValue, endValue] = value.split(',')
  const start = new Date(startValue)
  const end = new Date(endValue || startValue)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { gte: today, lt: new Date(today.getTime() + DAY_MS) }

  return { gte: new Date(start.getFullYear(), start.getMonth(), start.getDate()), lt: new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1) }
}

export async function GET(request) {
  const { authorization, dictionary } = await getContext(request, CRM_VISITOR_READ_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  const params = request.nextUrl.searchParams
  const search = (params.get('search') || '').trim()
  const hostStaffId = params.get('host_staff_id') || ''
  const status = ['CHECKED_IN', 'COMPLETED'].includes(params.get('status')) ? params.get('status') : ''
  const dateRange = getDateRange(params.get('date_range') || 'TODAY')
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(params.get('limit') || '10', 10) || 10))

  const sharedWhere = {
    ...(hostStaffId && { host_staff_id: hostStaffId }),
    ...(search && { OR: [{ full_name: { contains: search } }, { company_name: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }] })
  }

  const where = { ...sharedWhere, ...(status && { status }), ...(dateRange && { visited_at: dateRange }) }
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayWhere = { ...sharedWhere, visited_at: { gte: today, lt: new Date(today.getTime() + DAY_MS) } }

  try {
    const [visitors, totalCount, totalToday, activeGuests, completedToday, convertedCount, staff] = await Promise.all([
      prisma.crmVisitor.findMany({ where, include: visitorInclude, orderBy: { visited_at: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.crmVisitor.count({ where }),
      prisma.crmVisitor.count({ where: todayWhere }),
      prisma.crmVisitor.count({ where: { ...sharedWhere, status: 'CHECKED_IN', check_out_time: null } }),
      prisma.crmVisitor.count({ where: { ...todayWhere, status: 'COMPLETED' } }),
      prisma.crmVisitor.count({ where: { ...sharedWhere, converted_lead_id: { not: null } } }),
      prisma.hrmStaff.findMany({ where: { status: 'ACTIVE' }, select: { id: true, first_name: true, last_name: true, position: true }, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }] })
    ])

    return Response.json({ success: true, data: {
      visitors: visitors.map(normalizeVisitor),
      totalCount,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      summary: { totalToday, activeGuests, completedToday, convertedCount },
      options: { staff: staff.map(item => ({ ...item, full_name: `${item.first_name} ${item.last_name}`.trim() })) }
    } })
  } catch (error) {
    console.error('CRM visitors query failed', error)

    return errorResponse(dictionary.messages.loadFailed, 500, 'VISITORS_LOAD_FAILED')
  }
}

export async function POST(request) {
  const { authorization, dictionary } = await getContext(request, CRM_VISITOR_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const payload = await request.json()
    const parsed = safeParse(createVisitorSchema(dictionary.validation), payload)

    if (!parsed.success) return errorResponse(parsed.issues[0]?.message || dictionary.validation.invalid, 400, 'VALIDATION_ERROR')

    const values = parsed.output
    const host = await prisma.hrmStaff.findFirst({ where: { id: values.host_staff_id, status: 'ACTIVE' }, select: { id: true } })

    if (!host) return errorResponse(dictionary.messages.invalidHost, 400, 'INVALID_HOST')

    const visitor = await prisma.$transaction(async transaction => {
      const created = await transaction.crmVisitor.create({ data: {
        full_name: cleanText(values.full_name),
        phone: cleanText(values.phone),
        email: values.email.toLowerCase() || null,
        company_name: cleanText(values.company_name) || null,
        purpose: cleanText(values.purpose),
        host_staff_id: values.host_staff_id,
        notes: cleanText(values.notes) || null,
        status: 'CHECKED_IN',
        visited_at: new Date()
      }, include: visitorInclude })

      await transaction.auditLog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_VISITOR_CHECKED_IN', module: 'CRM', details: { visitorId: created.id } } })

      return created
    })

    return Response.json({ success: true, data: normalizeVisitor(visitor), message: dictionary.messages.created }, { status: 201 })
  } catch (error) {
    console.error('CRM visitor creation failed', error)

    return errorResponse(dictionary.messages.operationFailed, 500, 'VISITOR_CREATE_FAILED')
  }
}
