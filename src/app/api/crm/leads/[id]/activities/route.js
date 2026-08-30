import sanitizeHtml from 'sanitize-html'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { CRM_ACTIVITY_TYPES, CRM_WRITE_PERMISSIONS, resolveActivityStaffId } from '@/libs/crmLeads'
import { prisma } from '@/libs/prisma'
import { createActivitySchema } from '@/schemas/crm/leads'
import { getDictionary } from '@/utils/getDictionary'

const cleanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()

export async function POST(request, context) {
  const { id } = await context.params
  const payload = await request.json().catch(() => ({}))
  const locale = ['en', 'fa', 'ps'].includes(payload.locale) ? payload.locale : 'en'
  const [authorization, translations] = await Promise.all([authorizeAction(CRM_WRITE_PERMISSIONS), getDictionary(locale)])
  const dictionary = translations.crmLeads

  if (!authorization.authorized) return Response.json({ success: false, error: dictionary.messages.forbidden }, { status: authorization.code === 'FORBIDDEN' ? 403 : 401 })

  const parsed = safeParse(createActivitySchema(dictionary.validation), payload)

  if (!parsed.success) return Response.json({ success: false, error: parsed.issues[0]?.message || dictionary.validation.invalid }, { status: 400 })
  if (!CRM_ACTIVITY_TYPES.includes(parsed.output.activity_type)) return Response.json({ success: false, error: dictionary.validation.activityTypeInvalid }, { status: 400 })

  try {
    const lead = await prisma.crmlead.findUnique({ where: { id }, select: { id: true, assigned_to_id: true } })

    if (!lead) return Response.json({ success: false, error: dictionary.messages.notFound }, { status: 404 })

    const staffId = await resolveActivityStaffId(authorization.session.user.id, [lead.assigned_to_id])

    if (!staffId) return Response.json({ success: false, error: dictionary.messages.staffProfileRequired }, { status: 409 })

    const activity = await prisma.$transaction(async transaction => {
      const created = await transaction.crmactivity.create({
        data: {
          lead_id: id,
          staff_id: staffId,
          activity_type: parsed.output.activity_type,
          title: cleanText(parsed.output.title),
          description: cleanText(parsed.output.description) || null,
          due_date: parsed.output.due_date ? new Date(parsed.output.due_date) : null,
          is_completed: parsed.output.is_completed
        },
        include: { staff: { select: { id: true, first_name: true, last_name: true, position: true } } }
      })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_ACTIVITY_CREATED', module: 'CRM', details: { leadId: id, activityId: created.id } } })

      return created
    })

    return Response.json({ success: true, data: { ...activity, activity_date: activity.activity_date.toISOString(), due_date: activity.due_date?.toISOString() || null, staff: { ...activity.staff, full_name: `${activity.staff.first_name} ${activity.staff.last_name}`.trim() } }, message: dictionary.messages.activityAdded }, { status: 201 })
  } catch (error) {
    console.error('CRM activity creation failed', error)

    return Response.json({ success: false, error: dictionary.messages.operationFailed }, { status: 500 })
  }
}
