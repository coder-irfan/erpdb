import { Prisma } from '@prisma/client'
import sanitizeHtml from 'sanitize-html'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { CRM_DELETE_PERMISSIONS, CRM_WRITE_PERMISSIONS, leadInclude, normalizeLead, parseOptionalDate } from '@/libs/crmLeads'
import { prisma } from '@/libs/prisma'
import { createLeadSchema } from '@/schemas/crm/leads'
import { getDictionary } from '@/utils/getDictionary'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })
const cleanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()

const getContext = async (request, permissions) => {
  const locale = localeFrom(request.nextUrl.searchParams.get('locale'))
  const [authorization, translations] = await Promise.all([authorizeAction(permissions), getDictionary(locale)])

  return { authorization, dictionary: translations.crmLeads }
}

export async function PUT(request, context) {
  const { id } = await context.params
  const { authorization, dictionary } = await getContext(request, CRM_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(dictionary.messages.forbidden, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const payload = await request.json()
    const parsed = safeParse(createLeadSchema(dictionary.validation), { ...payload, estimated_value: Number(payload.estimated_value || 0) })

    if (!parsed.success) return errorResponse(parsed.issues[0]?.message || dictionary.validation.invalid, 400, 'VALIDATION_ERROR')

    const values = parsed.output

    const [existing, source, status, assignedStaff] = await Promise.all([
      prisma.crmLead.findUnique({ where: { id }, select: { id: true } }),
      prisma.option.findFirst({ where: { id: values.source_id, category: 'LEAD_SOURCE', is_active: true }, select: { id: true } }),
      prisma.option.findFirst({ where: { id: values.status_id, category: 'LEAD_STATUS', is_active: true }, select: { id: true } }),
      values.assigned_to_id ? prisma.hrmStaff.findFirst({ where: { id: values.assigned_to_id, status: 'ACTIVE' }, select: { id: true } }) : null
    ])

    if (!existing) return errorResponse(dictionary.messages.notFound, 404, 'LEAD_NOT_FOUND')
    if (!source || !status || (values.assigned_to_id && !assignedStaff)) return errorResponse(dictionary.messages.invalidRelations, 400, 'INVALID_RELATIONS')

    const lead = await prisma.$transaction(async transaction => {
      const updated = await transaction.crmLead.update({
        where: { id },
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
          notes: cleanText(values.notes) || null
        },
        include: leadInclude
      })

      await transaction.auditLog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_LEAD_UPDATED', module: 'CRM', details: { leadId: id } } })

      return updated
    })

    return Response.json({ success: true, data: normalizeLead(lead), message: dictionary.messages.updated })
  } catch (error) {
    console.error('CRM lead update failed', error)

    return errorResponse(dictionary.messages.operationFailed, 500, 'LEAD_UPDATE_FAILED')
  }
}

export async function DELETE(request, context) {
  const { id } = await context.params
  const { authorization, dictionary } = await getContext(request, CRM_DELETE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(dictionary.messages.forbidden, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const lead = await prisma.crmLead.findUnique({ where: { id }, select: { id: true, converted_client: { select: { id: true } }, contracts: { select: { id: true }, take: 1 } } })

    if (!lead) return errorResponse(dictionary.messages.notFound, 404, 'LEAD_NOT_FOUND')
    if (lead.converted_client || lead.contracts.length) return errorResponse(dictionary.messages.deleteBlocked, 409, 'LEAD_IN_USE')

    await prisma.$transaction([
      prisma.crmLead.delete({ where: { id } }),
      prisma.auditLog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_LEAD_DELETED', module: 'CRM', details: { leadId: id } } })
    ])

    return Response.json({ success: true, message: dictionary.messages.deleted })
  } catch (error) {
    console.error('CRM lead deletion failed', error)

    return errorResponse(dictionary.messages.operationFailed, 500, 'LEAD_DELETE_FAILED')
  }
}
