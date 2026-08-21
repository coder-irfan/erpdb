import 'server-only'

import { prisma } from '@/libs/prisma'
import { leaveDateToString } from '@/utils/leaveDates'

export { calculateLeaveDays, parseLeaveDate } from '@/utils/leaveDates'

export const LEAVE_READ_PERMISSIONS = ['hrm:read', 'hrm_leave:read']
export const LEAVE_WRITE_PERMISSIONS = ['hrm:write', 'hrm_leave:write']
export const LEAVE_DELETE_PERMISSIONS = ['hrm:delete', 'hrm_leave:delete']

export const getCurrentStaff = userId =>
  prisma.hrmstaff.findUnique({
    where: { user_id: userId },
    select: { id: true, first_name: true, last_name: true, position: true, email: true }
  })

export const leaveSelect = {
  id: true,
  staff_id: true,
  leave_type_id: true,
  status_id: true,
  approved_by_id: true,
  approved_by_user_id: true,
  start_date: true,
  end_date: true,
  total_days: true,
  reason: true,
  created_at: true,
  updated_at: true,
  staff: { select: { id: true, first_name: true, last_name: true, position: true, email: true } },
  leave_type: { select: { id: true, label: true, value: true, is_active: true } },
  status: { select: { id: true, label: true, value: true, is_active: true } },
  approved_by: { select: { id: true, first_name: true, last_name: true, position: true } },
  approved_by_user: { select: { id: true, name: true, email: true } }
}

export const normalizeLeave = leave => ({
  ...leave,
  total_days: Number(leave.total_days),
  start_date: leaveDateToString(leave.start_date),
  end_date: leaveDateToString(leave.end_date),
  created_at: leave.created_at.toISOString(),
  updated_at: leave.updated_at.toISOString(),
  staff: {
    ...leave.staff,
    full_name: `${leave.staff.first_name} ${leave.staff.last_name}`.trim()
  },
  approved_by: leave.approved_by
    ? {
        ...leave.approved_by,
        full_name: `${leave.approved_by.first_name} ${leave.approved_by.last_name}`.trim()
      }
    : leave.approved_by_user
      ? {
          id: leave.approved_by_user.id,
          full_name: leave.approved_by_user.name || leave.approved_by_user.email
        }
      : null
})

export const createLeaveAttendance = async (transaction, leave) => {
  const dates = []

  for (
    let cursor = new Date(leave.start_date);
    cursor <= leave.end_date;
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    dates.push(new Date(cursor))
  }

  if (dates.length === 0) return 0

  const result = await transaction.hrmstafftimesheet.createMany({
    data: dates.map(date => ({
      staff_id: leave.staff_id,
      date,
      status: 'LEAVE',
      notes: `Approved leave request ${leave.id}`
    })),
    skipDuplicates: true
  })

  return result.count
}
