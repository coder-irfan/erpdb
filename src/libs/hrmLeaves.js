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
  is_paid: true,
  reason: true,
  created_at: true,
  updated_at: true,
  staff: { select: { id: true, first_name: true, last_name: true, position: true, email: true } },
  leave_type: { select: { id: true, label: true, value: true, is_active: true, is_paid_leave: true } },
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

  let synchronized = 0

  for (const date of dates) {
    const existing = await transaction.hrmstafftimesheet.findUnique({
      where: { staff_id_date: { staff_id: leave.staff_id, date } },
      select: {
        id: true,
        status: true,
        project_id: true,
        check_in_time: true,
        check_out_time: true,
        hours_worked: true,
        notes: true
      }
    })

    await transaction.hrmleaveattendancebackup.upsert({
      where: { leave_id_date: { leave_id: leave.id, date } },
      update: {},
      create: {
        leave_id: leave.id,
        staff_id: leave.staff_id,
        date,
        record_existed: Boolean(existing),
        original_status: existing?.status || null,
        original_project_id: existing?.project_id || null,
        original_check_in_time: existing?.check_in_time || null,
        original_check_out_time: existing?.check_out_time || null,
        original_hours_worked: existing?.hours_worked || null,
        original_notes: existing?.notes || null
      }
    })

    await transaction.hrmstafftimesheet.upsert({
      where: { staff_id_date: { staff_id: leave.staff_id, date } },
      update: {
        leave_id: leave.id,
        project_id: null,
        status: 'LEAVE',
        check_in_time: null,
        check_out_time: null,
        hours_worked: null,
        notes: `Approved leave request ${leave.id}`
      },
      create: {
        leave_id: leave.id,
        staff_id: leave.staff_id,
        date,
        status: 'LEAVE',
        notes: `Approved leave request ${leave.id}`
      }
    })

    synchronized += 1
  }

  return synchronized
}

export const removeLeaveAttendance = async (transaction, leaveId) => {
  const backups = await transaction.hrmleaveattendancebackup.findMany({
    where: { leave_id: leaveId },
    orderBy: { date: 'asc' }
  })

  for (const backup of backups) {
    if (backup.record_existed) {
      await transaction.hrmstafftimesheet.updateMany({
        where: { staff_id: backup.staff_id, date: backup.date, leave_id: leaveId },
        data: {
          leave_id: null,
          status: backup.original_status,
          project_id: backup.original_project_id,
          check_in_time: backup.original_check_in_time,
          check_out_time: backup.original_check_out_time,
          hours_worked: backup.original_hours_worked,
          notes: backup.original_notes
        }
      })
    } else {
      await transaction.hrmstafftimesheet.deleteMany({
        where: { staff_id: backup.staff_id, date: backup.date, leave_id: leaveId }
      })
    }
  }

  if (backups.length === 0) {
    await transaction.hrmstafftimesheet.deleteMany({
      where: { leave_id: leaveId, status: 'LEAVE' }
    })
  }

  await transaction.hrmleaveattendancebackup.deleteMany({ where: { leave_id: leaveId } })

  return backups.length
}

export const hasOverlappingLeave = (transaction, { staffId, startDate, endDate, excludeId = null }) =>
  transaction.hrmstaffleave.findFirst({
    where: {
      staff_id: staffId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      start_date: { lte: endDate },
      end_date: { gte: startDate },
      status: { is: { category: 'LEAVE_STATUS', value: { not: 'REJECTED' } } }
    },
    select: { id: true }
  })
