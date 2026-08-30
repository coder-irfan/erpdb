import sanitizeHtml from 'sanitize-html'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { CRM_CLIENT_WRITE_PERMISSIONS } from '@/libs/crmClients'
import { CRM_ACTIVITY_TYPES, parseOptionalDate, resolveActivityStaffId } from '@/libs/crmLeads'
import { prisma } from '@/libs/prisma'
import { createActivitySchema } from '@/schemas/crm/leads'
import { getDictionary } from '@/utils/getDictionary'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const cleanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function POST(request, context) {
  const locale = localeFrom(request.nextUrl.searchParams.get('locale'))
  const [authorization, appDictionary] = await Promise.all([authorizeAction(CRM_CLIENT_WRITE_PERMISSIONS), getDictionary(locale)])
  const dictionary = appDictionary.crmClients

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const { id } = await context.params
    const payload = await request.json()
    const parsed = safeParse(createActivitySchema(dictionary.validation), payload)

    if (!parsed.success) return errorResponse(parsed.issues[0]?.message || dictionary.validation.invalid, 400, 'VALIDATION_ERROR')
    if (!CRM_ACTIVITY_TYPES.includes(parsed.output.activity_type)) return errorResponse(dictionary.validation.activityTypeInvalid, 400, 'INVALID_ACTIVITY_TYPE')

    const client = await prisma.crmclient.findUnique({
      where: { id },
      select: { id: true, account_manager_id: true, lead: { select: { assigned_to_id: true } } }
    })

    if (!client) return errorResponse(dictionary.messages.notFound, 404, 'CLIENT_NOT_FOUND')

    const staffId = await resolveActivityStaffId(authorization.session.user.id, [client.account_manager_id, client.lead?.assigned_to_id])

    if (!staffId) return errorResponse(dictionary.messages.staffProfileRequired, 409, 'STAFF_PROFILE_REQUIRED')

    await prisma.$transaction([
      prisma.crmactivity.create({ data: {
        client_id: id,
        staff_id: staffId,
        activity_type: parsed.output.activity_type,
        title: cleanText(parsed.output.title),
        description: cleanText(parsed.output.description) || null,
        due_date: parseOptionalDate(parsed.output.due_date),
        is_completed: parsed.output.is_completed
      } }),
      prisma.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_CLIENT_ACTIVITY_ADDED', module: 'CRM', details: { clientId: id, activityType: parsed.output.activity_type } } })
    ])

    return Response.json({ success: true, message: dictionary.messages.activityAdded }, { status: 201 })
  } catch (error) {
    console.error('CRM client activity creation failed', error)

    return errorResponse(dictionary.messages.operationFailed, 500, 'CLIENT_ACTIVITY_CREATE_FAILED')
  }
}
