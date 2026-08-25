import 'server-only'

import { Prisma } from '@prisma/client'

import { prisma } from '@/libs/prisma'
import { combineUtcDateTime, getDateKeyInTimeZone, toUtcDateOnly, utcDateKey } from '@/utils/utcDate'

export const ATTENDANCE_READ_PERMISSIONS = ['hrm:read', 'hrm_timesheet:read']
export const ATTENDANCE_WRITE_PERMISSIONS = ['hrm:write', 'hrm_timesheet:write']
export const ATTENDANCE_DELETE_PERMISSIONS = ['hrm:delete', 'hrm_timesheet:delete']

const attendanceSelect = {
  id: true,
  staff_id: true,
  leave_id: true,
  status: true,
  date: true,
  check_in_time: true,
  check_out_time: true,
  hours_worked: true,
  notes: true,
  created_at: true,
  updated_at: true,
  staff: { select: { id: true, first_name: true, last_name: true, position: true, email: true } },
  project: { select: { id: true, title: true } }
}

export const getKabulToday = () => getDateKeyInTimeZone('Asia/Kabul')
export const parseDate = toUtcDateOnly
export const dateToString = utcDateKey
export const timeToString = value => value?.toISOString().slice(11, 16) ?? null
export const combineDateTime = (date, time) => (time ? combineUtcDateTime(date, time) : null)

export const calculateHours = (date, checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null

  const start = combineDateTime(date, checkIn)
  const end = combineDateTime(date, checkOut)

  if (!start || !end) return Number.NaN

  const difference = end.getTime() - start.getTime()

  if (difference < 0) return Number.NaN

  return new Prisma.Decimal((difference / 3_600_000).toFixed(2))
}

const leaveRequestPattern = /^Approved leave request (.+)$/i

export const normalizeAttendance = (record, leaveLabels = new Map()) => {
  const leaveMatch = record.notes?.match(leaveRequestPattern)
  const leaveId = record.leave_id || leaveMatch?.[1] || null
  const leaveLabel = leaveId ? leaveLabels.get(leaveId) : null

  return {
  ...record,
  date: dateToString(record.date),
  check_in_time: timeToString(record.check_in_time),
  check_out_time: timeToString(record.check_out_time),
  hours_worked: record.hours_worked?.toFixed(2) ?? null,
  created_at: record.created_at.toISOString(),
  updated_at: record.updated_at.toISOString(),
  notes: leaveMatch ? `Approved Leave Request${leaveLabel ? ` (${leaveLabel})` : ''}` : record.notes,
  leave_request_id: leaveId,
  staff: {
    ...record.staff,
    full_name: `${record.staff.first_name} ${record.staff.last_name}`.trim()
  }
  }
}

export const normalizeAttendanceInput = (values, date) => {
  const isPresent = values.status === 'PRESENT'
  const checkIn = isPresent ? values.check_in_time || null : null
  const checkOut = isPresent ? values.check_out_time || null : null

  return {
    status: values.status,
    check_in_time: combineDateTime(date, checkIn),
    check_out_time: combineDateTime(date, checkOut),
    hours_worked: isPresent ? calculateHours(date, checkIn, checkOut) : null,
    notes: values.notes || null
  }
}

export const getAttendanceDashboard = async ({ date, month, year, staffId, status, search, page = 1, limit = 10 }) => {
  const selectedDate = date || getKabulToday()
  const dayStart = parseDate(selectedDate)

  if (!dayStart) throw new TypeError('Invalid attendance date')

  const useMonthRange = Number.isInteger(month) && Number.isInteger(year)
  const rangeStart = useMonthRange ? new Date(Date.UTC(year, month - 1, 1)) : dayStart
  const rangeEnd = useMonthRange ? new Date(Date.UTC(year, month, 1)) : new Date(dayStart.getTime() + 86_400_000)

  const recordWhere = {
    date: { gte: rangeStart, lt: rangeEnd },
    ...(staffId && { staff_id: staffId }),
    ...(status && { status }),
    ...(search && {
      staff: {
        is: {
          OR: [
            { first_name: { contains: search } },
            { last_name: { contains: search } },
            { email: { contains: search } },
            { position: { contains: search } }
          ]
        }
      }
    })
  }

  const dailyWhere = { date: dayStart }

  const [records, totalCount, dailyRecords, activeStaff] = await Promise.all([
    prisma.hrmstafftimesheet.findMany({
      where: recordWhere,
      select: attendanceSelect,
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.hrmstafftimesheet.count({ where: recordWhere }),
    prisma.hrmstafftimesheet.findMany({ where: dailyWhere, select: { staff_id: true, status: true } }),
    prisma.hrmstaff.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, first_name: true, last_name: true, position: true },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
    })
  ])

  const markedIds = new Set(dailyRecords.map(record => record.staff_id))
  const leaveIds = records.map(record => record.leave_id || record.notes?.match(leaveRequestPattern)?.[1]).filter(Boolean)

  const approvedLeaves = leaveIds.length
    ? await prisma.hrmstaffleave.findMany({
        where: { id: { in: [...new Set(leaveIds)] } },
        select: { id: true, start_date: true, end_date: true, leave_type: { select: { label: true } } }
      })
    : []

  const leaveLabels = new Map(
    approvedLeaves.map(leave => [
      leave.id,
      `${leave.leave_type.label}, ${dateToString(leave.start_date)} - ${dateToString(leave.end_date)}`
    ])
  )

  const unmarkedStaff = activeStaff
    .filter(staff => !markedIds.has(staff.id))
    .map(staff => ({ ...staff, full_name: `${staff.first_name} ${staff.last_name}`.trim() }))

  return {
    records: records.map(record => normalizeAttendance(record, leaveLabels)),
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    unmarkedStaff,
    summary: {
      total_present: dailyRecords.filter(record => record.status === 'PRESENT').length,
      total_absent: dailyRecords.filter(record => record.status === 'ABSENT').length,
      total_leave: dailyRecords.filter(record => record.status === 'LEAVE').length,
      unmarked_count: unmarkedStaff.length
    }
  }
}

export { attendanceSelect }
