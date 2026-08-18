import sanitizeHtml from 'sanitize-html'

import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { CRM_VISITOR_WRITE_PERMISSIONS } from '@/libs/crmVisitors'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const cleanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function POST(request, context) {
  const locale = localeFrom(request.nextUrl.searchParams.get('locale'))
  const [authorization, appDictionary] = await Promise.all([authorizeAction(CRM_VISITOR_WRITE_PERMISSIONS), getDictionary(locale)])
  const dictionary = appDictionary.crmVisitors

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const { id } = await context.params
    const visitor = await prisma.crmVisitor.findUnique({ where: { id }, include: { converted_lead: { select: { id: true } } } })

    if (!visitor) return errorResponse(dictionary.messages.notFound, 404, 'VISITOR_NOT_FOUND')
    if (visitor.converted_lead) return errorResponse(dictionary.messages.alreadyConverted, 409, 'ALREADY_CONVERTED')
    if (!visitor.email) return errorResponse(dictionary.messages.emailRequiredForLead, 409, 'EMAIL_REQUIRED')
    if (!visitor.host_staff_id) return errorResponse(dictionary.messages.invalidHost, 409, 'HOST_REQUIRED')

    const [source, status, setup] = await Promise.all([
      prisma.option.findFirst({ where: { category: 'LEAD_SOURCE', value: 'WALK_IN', is_active: true }, select: { id: true } }),
      prisma.option.findFirst({ where: { category: 'LEAD_STATUS', value: 'NEW', is_active: true }, select: { id: true } }),
      getCompanySetupRecord()
    ])

    if (!source || !status) return errorResponse(dictionary.messages.pipelineOptionsMissing, 409, 'PIPELINE_OPTIONS_MISSING')

    const leadTitle = cleanText(visitor.company_name || visitor.full_name)
    const leadNotes = [visitor.purpose, visitor.notes].filter(Boolean).join('\n\n')

    const lead = await prisma.$transaction(async transaction => {
      const created = await transaction.crmLead.create({ data: {
        title: leadTitle,
        contact_name: visitor.full_name,
        company_name: visitor.company_name,
        email: visitor.email.toLowerCase(),
        phone: visitor.phone,
        source_id: source.id,
        status_id: status.id,
        assigned_to_id: visitor.host_staff_id,
        currency: setup.currency_code,
        exchange_rate: setup.usd_afn_exchange_rate,
        amount_base: 0,
        notes: leadNotes || null,
        activities: { create: { staff_id: visitor.host_staff_id, activity_type: 'NOTE', title: dictionary.conversion.activityTitle, description: dictionary.conversion.activityDescription } }
      }, select: { id: true, title: true } })

      const conversionNote = dictionary.conversion.note.replace('{title}', created.title)

      await transaction.crmVisitor.update({ where: { id }, data: { converted_lead_id: created.id, notes: [visitor.notes, conversionNote].filter(Boolean).join('\n\n') } })
      await transaction.auditLog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_VISITOR_CONVERTED_TO_LEAD', module: 'CRM', details: { visitorId: id, leadId: created.id } } })

      return created
    })

    return Response.json({ success: true, data: { leadId: lead.id }, message: dictionary.messages.converted }, { status: 201 })
  } catch (error) {
    console.error('CRM visitor lead conversion failed', error)

    return errorResponse(dictionary.messages.operationFailed, 500, 'VISITOR_CONVERSION_FAILED')
  }
}
