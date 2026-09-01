import 'server-only'

import { serializeData } from '@/libs/serialize'

export const CRM_VISITOR_READ_PERMISSIONS = ['crm:read', 'crm_visitor:read']
export const CRM_VISITOR_WRITE_PERMISSIONS = ['crm:write', 'crm_visitor:write']
export const CRM_VISITOR_DELETE_PERMISSIONS = ['crm:delete', 'crm_visitor:delete']

const normalizeStaff = staff =>
  staff ? { ...staff, full_name: `${staff.first_name} ${staff.last_name}`.trim() } : null

export const normalizeVisitor = visitor => serializeData({
  ...visitor,
  visited_at: visitor.visited_at.toISOString(),
  check_out_time: visitor.check_out_time?.toISOString() || null,
  created_at: visitor.created_at.toISOString(),
  updated_at: visitor.updated_at.toISOString(),
  host_staff: normalizeStaff(visitor.host_staff)
})

export const visitorInclude = {
  host_staff: { select: { id: true, first_name: true, last_name: true, position: true } },
  converted_lead: { select: { id: true, title: true } }
}
