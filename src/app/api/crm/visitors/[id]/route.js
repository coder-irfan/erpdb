import sanitizeHtml from 'sanitize-html'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { CRM_VISITOR_DELETE_PERMISSIONS, CRM_VISITOR_WRITE_PERMISSIONS, normalizeVisitor, visitorInclude } from '@/libs/crmVisitors'
import { prisma } from '@/libs/prisma'
import { createVisitorSchema } from '@/schemas/crm/visitors'
import { getDictionary } from '@/utils/getDictionary'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const cleanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

const getContext = async (request, permissions) => {
  const locale = localeFrom(request.nextUrl.searchParams.get('locale'))
  const [authorization, dictionary] = await Promise.all([authorizeAction(permissions), getDictionary(locale)])

  return { authorization, dictionary: dictionary.crmVisitors }
}

export async function PUT(request, context) {
  const { authorization, dictionary } = await getContext(request, CRM_VISITOR_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const { id } = await context.params
    const payload = await request.json()
    const parsed = safeParse(createVisitorSchema(dictionary.validation), payload)

    if (!parsed.success) return errorResponse(parsed.issues[0]?.message || dictionary.validation.invalid, 400, 'VALIDATION_ERROR')

    const values = parsed.output

    const [visitor, host] = await Promise.all([
      prisma.crmvisitor.findUnique({ where: { id }, select: { id: true } }),
      prisma.hrmstaff.findFirst({ where: { id: values.host_staff_id, status: 'ACTIVE' }, select: { id: true } })
    ])

    if (!visitor) return errorResponse(dictionary.messages.notFound, 404, 'VISITOR_NOT_FOUND')
    if (!host) return errorResponse(dictionary.messages.invalidHost, 400, 'INVALID_HOST')

    const updated = await prisma.$transaction(async transaction => {
      const record = await transaction.crmvisitor.update({ where: { id }, data: {
        full_name: cleanText(values.full_name),
        phone: cleanText(values.phone),
        email: values.email.toLowerCase() || null,
        company_name: cleanText(values.company_name) || null,
        purpose: cleanText(values.purpose),
        host_staff_id: values.host_staff_id,
        notes: cleanText(values.notes) || null
      }, include: visitorInclude })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_VISITOR_UPDATED', module: 'CRM', details: { visitorId: id } } })

      return record
    })

    return Response.json({ success: true, data: normalizeVisitor(updated), message: dictionary.messages.updated })
  } catch (error) {
    console.error('CRM visitor update failed', error)

    return errorResponse(dictionary.messages.operationFailed, 500, 'VISITOR_UPDATE_FAILED')
  }
}

export async function DELETE(request, context) {
  const { authorization, dictionary } = await getContext(request, CRM_VISITOR_DELETE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const { id } = await context.params
    const visitor = await prisma.crmvisitor.findUnique({ where: { id }, select: { id: true } })

    if (!visitor) return errorResponse(dictionary.messages.notFound, 404, 'VISITOR_NOT_FOUND')

    await prisma.$transaction([
      prisma.crmvisitor.delete({ where: { id } }),
      prisma.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_VISITOR_DELETED', module: 'CRM', details: { visitorId: id } } })
    ])

    return Response.json({ success: true, message: dictionary.messages.deleted })
  } catch (error) {
    console.error('CRM visitor deletion failed', error)

    return errorResponse(dictionary.messages.operationFailed, 500, 'VISITOR_DELETE_FAILED')
  }
}

