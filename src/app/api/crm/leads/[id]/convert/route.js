import { authorizeAction } from '@/libs/actionAuthorization'
import { CRM_WRITE_PERMISSIONS, getCurrentStaffId } from '@/libs/crmLeads'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'

export async function POST(request, context) {
  const { id } = await context.params
  const payload = await request.json().catch(() => ({}))
  const locale = ['en', 'fa', 'ps'].includes(payload.locale) ? payload.locale : 'en'
  const [authorization, translations] = await Promise.all([authorizeAction(CRM_WRITE_PERMISSIONS), getDictionary(locale)])
  const dictionary = translations.crmLeads

  if (!authorization.authorized) return Response.json({ success: false, error: dictionary.messages.forbidden }, { status: authorization.code === 'FORBIDDEN' ? 403 : 401 })

  try {
    const [lead, wonStatus, currentStaffId] = await Promise.all([
      prisma.crmLead.findUnique({ where: { id }, include: { converted_client: { select: { id: true } } } }),
      prisma.option.findFirst({ where: { category: 'LEAD_STATUS', value: 'WON', is_active: true }, select: { id: true } }),
      getCurrentStaffId(authorization.session.user.id)
    ])

    if (!lead) return Response.json({ success: false, error: dictionary.messages.notFound }, { status: 404 })
    if (lead.converted_client) return Response.json({ success: false, error: dictionary.messages.alreadyConverted }, { status: 409 })
    if (!wonStatus) return Response.json({ success: false, error: dictionary.messages.wonStatusMissing }, { status: 409 })

    const activityStaffId = currentStaffId || lead.assigned_to_id

    if (!activityStaffId) return Response.json({ success: false, error: dictionary.messages.staffProfileRequired }, { status: 409 })

    const existingClient = await prisma.crmClient.findUnique({ where: { email: lead.email }, select: { id: true } })

    if (existingClient) return Response.json({ success: false, error: dictionary.messages.clientEmailExists }, { status: 409 })

    const client = await prisma.$transaction(async transaction => {
      const created = await transaction.crmClient.create({
        data: {
          lead_id: lead.id,
          company_name: lead.company_name || lead.title,
          primary_contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          account_manager_id: lead.assigned_to_id,
          status: 'ACTIVE'
        }
      })

      await transaction.crmLead.update({ where: { id }, data: { status_id: wonStatus.id } })
      await transaction.crmActivity.create({ data: { lead_id: id, client_id: created.id, staff_id: activityStaffId, activity_type: 'FOLLOW_UP', title: dictionary.activities.converted, is_completed: true } })
      await transaction.auditLog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_LEAD_CONVERTED', module: 'CRM', details: { leadId: id, clientId: created.id } } })

      return created
    })

    return Response.json({ success: true, data: { clientId: client.id }, message: dictionary.messages.converted })
  } catch (error) {
    console.error('CRM lead conversion failed', error)

    return Response.json({ success: false, error: dictionary.messages.operationFailed }, { status: 500 })
  }
}
