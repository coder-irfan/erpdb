import { authorizeAction } from '@/libs/actionAuthorization'
import { SYSTEM_STATUS_VALUES } from '@/data/systemStatuses'
import { CRM_WRITE_PERMISSIONS, getCurrentStaffId } from '@/libs/crmLeads'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'

const LEAD_STATUS_VALUES = SYSTEM_STATUS_VALUES.LEAD_STATUS

export async function PATCH(request, context) {
  const { id } = await context.params
  const payload = await request.json().catch(() => ({}))
  const locale = ['en', 'fa', 'ps'].includes(payload.locale) ? payload.locale : 'en'
  const [authorization, translations] = await Promise.all([authorizeAction(CRM_WRITE_PERMISSIONS), getDictionary(locale)])
  const dictionary = translations.crmLeads

  if (!authorization.authorized) return Response.json({ success: false, error: dictionary.messages.forbidden }, { status: authorization.code === 'FORBIDDEN' ? 403 : 401 })

  try {
    const [lead, status, staffId] = await Promise.all([
      prisma.crmlead.findUnique({ where: { id }, select: { id: true, status_id: true, assigned_to_id: true } }),
      prisma.option.findFirst({ where: { id: payload.status_id, category: 'LEAD_STATUS', value: { in: LEAD_STATUS_VALUES }, is_active: true }, select: { id: true, label: true } }),
      getCurrentStaffId(authorization.session.user.id)
    ])

    if (!lead) return Response.json({ success: false, error: dictionary.messages.notFound }, { status: 404 })
    if (!status) return Response.json({ success: false, error: dictionary.messages.invalidRelations }, { status: 400 })

    const activityStaffId = staffId || lead.assigned_to_id

    if (!activityStaffId) return Response.json({ success: false, error: dictionary.messages.staffProfileRequired }, { status: 409 })

    await prisma.$transaction(async transaction => {
      await transaction.crmlead.update({ where: { id }, data: { status_id: status.id } })
      await transaction.crmactivity.create({ data: { lead_id: id, staff_id: activityStaffId, activity_type: 'FOLLOW_UP', title: dictionary.activities.statusChanged.replace('{status}', status.label), is_completed: true } })
      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_LEAD_STATUS_UPDATED', module: 'CRM', details: { leadId: id, statusId: status.id } } })
    })

    return Response.json({ success: true, message: dictionary.messages.statusUpdated })
  } catch (error) {
    console.error('CRM lead status update failed', error)

    return Response.json({ success: false, error: dictionary.messages.operationFailed }, { status: 500 })
  }
}
