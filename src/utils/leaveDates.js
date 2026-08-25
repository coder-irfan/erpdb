import { getDateKeyInTimeZone, toUtcDateOnly, utcDateKey } from '@/utils/utcDate'

const DAY_IN_MILLISECONDS = 86_400_000

export const parseLeaveDate = toUtcDateOnly

export const leaveDateToString = utcDateKey

export const getKabulToday = () => getDateKeyInTimeZone('Asia/Kabul')

export const calculateLeaveDays = (startDate, endDate) => {
  const start = parseLeaveDate(startDate)
  const end = parseLeaveDate(endDate)
  const difference = end && start ? end.getTime() - start.getTime() : Number.NaN

  return Number.isFinite(difference) ? Math.floor(difference / DAY_IN_MILLISECONDS) + 1 : 0
}
