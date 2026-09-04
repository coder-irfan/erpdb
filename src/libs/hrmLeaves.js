import 'server-only'

import { prisma } from '@/libs/prisma'
import { calculateLeaveWorkingDays, getLeaveWorkingDateKeys, leaveDateToString } from '@/utils/leaveDates'

export { calculateLeaveDays, calculateLeaveWorkingDays, parseLeaveDate } from '@/utils/leaveDates'

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
  duration_type: true,
  half_day_shift: true,
  is_paid: true,
  reason: true,
  created_at: true,
  updated_at: true,
  staff: { select: { id: true, first_name: true, last_name: true, position: true, email: true } },
  leave_type: { select: { id: true, label: true, value: true, is_active: true, allowed_days_per_year: true } },
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
  leave_type: {
    ...leave.leave_type,
    allowed_days_per_year:
      leave.leave_type.allowed_days_per_year == null ? null : Number(leave.leave_type.allowed_days_per_year)
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
  const holidays = await transaction.companyholiday.findMany({
    where: { is_active: true, date: { gte: leave.start_date, lte: leave.end_date } },
    select: { date: true }
  })

  const dates = getLeaveWorkingDateKeys(leave.start_date, leave.end_date, holidays.map(item => item.date)).map(
    date => new Date(`${date}T00:00:00.000Z`)
  )

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
        status: leave.is_paid ? 'LEAVE_PAID' : 'LEAVE_UNPAID',
        check_in_time: null,
        check_out_time: null,
        hours_worked: null,
        notes: `Approved leave request ${leave.id}`
      },
      create: {
        leave_id: leave.id,
        staff_id: leave.staff_id,
        date,
        status: leave.is_paid ? 'LEAVE_PAID' : 'LEAVE_UNPAID',
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
      where: { leave_id: leaveId, status: { in: ['LEAVE', 'LEAVE_PAID', 'LEAVE_UNPAID'] } }
    })
  }

  await transaction.hrmleaveattendancebackup.deleteMany({ where: { leave_id: leaveId } })

  return backups.length
}

export const hasOverlappingLeave = async (
  transaction,
  { staffId, startDate, endDate, durationType = 'FULL_DAY', halfDayShift = null, excludeId = null }
) => {
  const overlappingLeaves = await transaction.hrmstaffleave.findMany({
    where: {
      staff_id: staffId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      start_date: { lte: endDate },
      end_date: { gte: startDate },
      status: { is: { category: 'LEAVE_STATUS', value: { in: ['PENDING', 'APPROVED'] } } }
    },
    select: { id: true, start_date: true, end_date: true, duration_type: true, half_day_shift: true }
  })

  return overlappingLeaves.find(existing => {
    const isComplementaryHalfDay =
      durationType === 'HALF_DAY' &&
      Boolean(halfDayShift) &&
      existing.duration_type === 'HALF_DAY' &&
      Boolean(existing.half_day_shift) &&
      existing.start_date.getTime() === startDate.getTime() &&
      existing.end_date.getTime() === endDate.getTime() &&
      existing.half_day_shift !== halfDayShift

    return !isComplementaryHalfDay
  })
}

export const getHolidayDateKeys = async (client, startDate, endDate) => {
  const holidays = await client.companyholiday.findMany({
    where: { is_active: true, date: { gte: startDate, lte: endDate } },
    select: { date: true }
  })

  return holidays.map(item => leaveDateToString(item.date))
}

export const getLeaveBalance = async (client, { staffId, leaveTypeId, year, excludeLeaveId = null }) => {
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const yearEnd = new Date(Date.UTC(year, 11, 31))

  const [leaveType, holidays, leaves] = await Promise.all([
    client.option.findFirst({
      where: { id: leaveTypeId, category: 'LEAVE_TYPE' },
      select: { id: true, allowed_days_per_year: true }
    }),
    getHolidayDateKeys(client, yearStart, yearEnd),
    client.hrmstaffleave.findMany({
      where: {
        staff_id: staffId,
        leave_type_id: leaveTypeId,
        ...(excludeLeaveId ? { NOT: { id: excludeLeaveId } } : {}),
        start_date: { lte: yearEnd },
        end_date: { gte: yearStart },
        status: { is: { category: 'LEAVE_STATUS', value: { in: ['PENDING', 'APPROVED'] } } }
      },
      select: {
        start_date: true,
        end_date: true,
        total_days: true,
        duration_type: true,
        is_paid: true,
        status: { select: { value: true } }
      }
    })
  ])

  if (!leaveType) return null

  let taken = 0
  let pending = 0

  for (const leave of leaves) {
    if (!leave.is_paid) continue

    const clippedStart = leave.start_date < yearStart ? yearStart : leave.start_date
    const clippedEnd = leave.end_date > yearEnd ? yearEnd : leave.end_date

    const days =
      leave.duration_type === 'HALF_DAY'
        ? 0.5
        : calculateLeaveWorkingDays(clippedStart, clippedEnd, holidays)

    if (leave.status.value === 'APPROVED') taken += days
    else pending += days
  }

  const allowed = leaveType.allowed_days_per_year == null ? null : Number(leaveType.allowed_days_per_year)

  return {
    allowed,
    taken,
    pending,
    remaining: allowed == null ? null : Math.max(0, allowed - taken - pending)
  }
}

export const validateLeaveEntitlement = async (
  client,
  { staffId, leaveTypeId, startDate, endDate, excludeLeaveId = null, isPaid = true, durationType = 'FULL_DAY' }
) => {
  if (!isPaid) return { valid: true }

  const startYear = startDate.getUTCFullYear()
  const endYear = endDate.getUTCFullYear()

  for (let year = startYear; year <= endYear; year += 1) {
    const balance = await getLeaveBalance(client, { staffId, leaveTypeId, year, excludeLeaveId })

    if (!balance) return { valid: false, code: 'LEAVE_TYPE_NOT_FOUND' }
    if (balance.allowed == null) continue

    const yearStart = new Date(Date.UTC(year, 0, 1))
    const yearEnd = new Date(Date.UTC(year, 11, 31))
    const clippedStart = startDate < yearStart ? yearStart : startDate
    const clippedEnd = endDate > yearEnd ? yearEnd : endDate
    const holidays = await getHolidayDateKeys(client, clippedStart, clippedEnd)
    const requested = durationType === 'HALF_DAY' ? 0.5 : calculateLeaveWorkingDays(clippedStart, clippedEnd, holidays)

    if (requested > balance.remaining) return { valid: false, code: 'LEAVE_BALANCE_EXCEEDED', balance, requested, year }
  }

  return { valid: true }
}
