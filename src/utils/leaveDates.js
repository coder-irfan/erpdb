import { getDateKeyInTimeZone, toUtcDateOnly, utcDateKey } from '@/utils/utcDate'
import { getAfghanistanWorkingDateKeys } from '@/utils/payrollCalendar'

export const parseLeaveDate = toUtcDateOnly

export const leaveDateToString = utcDateKey

export const getKabulToday = () => getDateKeyInTimeZone('Asia/Kabul')

export const getLeaveWorkingDateKeys = (startDate, endDate, holidayDates = []) => {
  const start = parseLeaveDate(startDate)
  const end = parseLeaveDate(endDate)

  if (!start || !end || end < start) return []

  return getAfghanistanWorkingDateKeys(start, end, holidayDates)
}

export const calculateLeaveWorkingDays = (startDate, endDate, holidayDates = []) =>
  getLeaveWorkingDateKeys(startDate, endDate, holidayDates).length

// Kept as a compatibility export; all leave duration math uses the same Afghanistan working calendar.
export const calculateLeaveDays = calculateLeaveWorkingDays
