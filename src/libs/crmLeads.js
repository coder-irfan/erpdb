import 'server-only'

import { prisma } from '@/libs/prisma'

export const CRM_READ_PERMISSIONS = ['crm:read', 'crm_lead:read']
export const CRM_WRITE_PERMISSIONS = ['crm:write', 'crm_lead:write']
export const CRM_DELETE_PERMISSIONS = ['crm:delete', 'crm_lead:delete']
export const CRM_ACTIVITY_TYPES = ['CALL', 'MEETING', 'EMAIL', 'NOTE', 'FOLLOW_UP']

export const getCurrentStaffId = async userId => {
  const staff = await prisma.hrmstaff.findUnique({ where: { user_id: userId }, select: { id: true } })

  return staff?.id || null
}

export const leadInclude = {
  source: { select: { id: true, label: true, value: true, color_code: true } },
  status: { select: { id: true, label: true, value: true, color_code: true } },
  assigned_to: { select: { id: true, first_name: true, last_name: true, position: true } },
  converted_client: { select: { id: true } },
  activities: {
    select: {
      id: true,
      activity_type: true,
      title: true,
      description: true,
      activity_date: true,
      due_date: true,
      is_completed: true,
      staff: { select: { id: true, first_name: true, last_name: true, position: true } }
    },
    orderBy: { activity_date: 'desc' }
  }
}

const normalizeStaff = staff =>
  staff ? { ...staff, full_name: `${staff.first_name} ${staff.last_name}`.trim() } : null

export const normalizeLead = lead => ({
  ...lead,
  estimated_value: lead.estimated_value?.toFixed(2) || '0.00',
  exchange_rate: lead.exchange_rate.toFixed(4),
  amount_base: lead.amount_base.toFixed(2),
  next_follow_up_date: lead.next_follow_up_date?.toISOString() || null,
  created_at: lead.created_at.toISOString(),
  updated_at: lead.updated_at.toISOString(),
  assigned_to: normalizeStaff(lead.assigned_to),
  activities: lead.activities.map(activity => ({
    ...activity,
    activity_date: activity.activity_date.toISOString(),
    due_date: activity.due_date?.toISOString() || null,
    staff: normalizeStaff(activity.staff)
  }))
})

export const parseOptionalDate = value => (value ? new Date(value) : null)
