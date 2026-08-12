import 'server-only'

import { Prisma } from '@prisma/client'

import { prisma } from '@/libs/prisma'

export const ATTENDANCE_READ_PERMISSIONS = ['hrm:read', 'hrm_timesheet:read']
export const ATTENDANCE_WRITE_PERMISSIONS = ['hrm:write', 'hrm_timesheet:write']
export const ATTENDANCE_DELETE_PERMISSIONS = ['hrm:delete', 'hrm_timesheet:delete']

const attendanceSelect = {
  id: true,
  staff_id: true,
  status: true,
  date: true,
  check_in_time: true,
  check_out_time: true,
  hours_worked: true,
  notes: true,
  created_at: true,
  updated_at: true,
  staff: { select: { id: true, first_name: true, last_name: true, position: true, email: true } }
}

export const getKabulToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kabul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

export const parseDate = value => new Date(`${value}T00:00:00.000Z`)
export const dateToString = value => value.toISOString().slice(0, 10)
export const timeToString = value => value?.toISOString().slice(11, 16) ?? null
export const combineDateTime = (date, time) => (time ? new Date(`${date}T${time}:00.000Z`) : null)

export const calculateHours = (date, checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null

  const start = combineDateTime(date, checkIn)
  const end = combineDateTime(date, checkOut)
  const difference = end.getTime() - start.getTime()

  if (difference < 0) return Number.NaN

  return new Prisma.Decimal((difference / 3_600_000).toFixed(2))
}

export const normalizeAttendance = record => ({
  ...record,
  date: dateToString(record.date),
  check_in_time: timeToString(record.check_in_time),
  check_out_time: timeToString(record.check_out_time),
  hours_worked: record.hours_worked?.toFixed(2) ?? null,
  created_at: record.created_at.toISOString(),
  updated_at: record.updated_at.toISOString(),
  staff: {
    ...record.staff,
    full_name: `${record.staff.first_name} ${record.staff.last_name}`.trim()
  }
})

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

export const getAttendanceDashboard = async ({ date, month, year, staffId, status }) => {
  const selectedDate = date || getKabulToday()
  const dayStart = parseDate(selectedDate)
  const useMonthRange = Number.isInteger(month) && Number.isInteger(year)
  const rangeStart = useMonthRange ? new Date(Date.UTC(year, month - 1, 1)) : dayStart
  const rangeEnd = useMonthRange ? new Date(Date.UTC(year, month, 1)) : new Date(dayStart.getTime() + 86_400_000)

  const recordWhere = {
    date: { gte: rangeStart, lt: rangeEnd },
    ...(staffId && { staff_id: staffId }),
    ...(status && { status })
  }

  const dailyWhere = { date: dayStart }

  const [records, dailyRecords, activeStaff] = await Promise.all([
    prisma.hrmStaffTimesheet.findMany({ where: recordWhere, select: attendanceSelect, orderBy: [{ date: 'desc' }, { created_at: 'desc' }] }),
    prisma.hrmStaffTimesheet.findMany({ where: dailyWhere, select: { staff_id: true, status: true } }),
    prisma.hrmStaff.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, first_name: true, last_name: true, position: true },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
    })
  ])

  const markedIds = new Set(dailyRecords.map(record => record.staff_id))

  const unmarkedStaff = activeStaff
    .filter(staff => !markedIds.has(staff.id))
    .map(staff => ({ ...staff, full_name: `${staff.first_name} ${staff.last_name}`.trim() }))

  return {
    records: records.map(normalizeAttendance),
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
