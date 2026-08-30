const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const AFGHANISTAN_TIME_ZONE = 'Asia/Kabul'
export const AFGHANISTAN_WEEKEND_DAY = 5
export const DAY_IN_MILLISECONDS = 86_400_000

const toDateOnly = value => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null

    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
  }

  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null

  const date = new Date(`${value}T00:00:00.000Z`)

  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

export const getAfghanistanDateKey = value => toDateOnly(value)?.toISOString().slice(0, 10) || null

const holidayKeySet = holidayDates =>
  new Set((holidayDates || []).map(getAfghanistanDateKey).filter(Boolean))

export const isAfghanistanWorkingDay = (value, holidayDates = []) => {
  const date = toDateOnly(value)

  return Boolean(
    date &&
      date.getUTCDay() !== AFGHANISTAN_WEEKEND_DAY &&
      !holidayKeySet(holidayDates).has(getAfghanistanDateKey(date))
  )
}

export const getAfghanistanWorkingDateKeys = (startValue, endValue, holidayDates = []) => {
  const start = toDateOnly(startValue)
  const end = toDateOnly(endValue)

  if (!start || !end || end < start) return []

  const holidays = holidayKeySet(holidayDates)
  const dates = []

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor = new Date(cursor.getTime() + DAY_IN_MILLISECONDS)
  ) {
    const key = getAfghanistanDateKey(cursor)

    if (cursor.getUTCDay() !== AFGHANISTAN_WEEKEND_DAY && !holidays.has(key)) dates.push(key)
  }

  return dates
}

export const countAfghanistanWorkingDays = (startValue, endValue, holidayDates = []) =>
  getAfghanistanWorkingDateKeys(startValue, endValue, holidayDates).length

export const getPayrollMonthCalendar = monthValue => {
  if (!MONTH_PATTERN.test(monthValue || '')) throw new TypeError('Invalid payroll month')

  const [year, month] = monthValue.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  const calendarDates = []
  const workingDates = []

  for (let cursor = start; cursor < end; cursor = new Date(cursor.getTime() + DAY_IN_MILLISECONDS)) {
    const date = new Date(cursor)

    calendarDates.push(date)
    if (isAfghanistanWorkingDay(date)) workingDates.push(date)
  }

  return {
    year,
    month,
    start,
    end,
    totalDays: calendarDates.length,
    fridayCount: calendarDates.length - workingDates.length,
    workingDays: workingDates.length,
    workingDates
  }
}

export const isEarlyPayrollExecution = (monthValue, currentDateValue) => {
  const currentDate = toDateOnly(currentDateValue)

  if (!currentDate || currentDate.toISOString().slice(0, 7) !== monthValue) return false

  const calendar = getPayrollMonthCalendar(monthValue)
  const finalDate = new Date(calendar.end.getTime() - DAY_IN_MILLISECONDS)

  return currentDate < finalDate
}

export const getWorkingDaysThroughDate = (monthValue, currentDateValue, holidayDates = []) => {
  const currentDate = toDateOnly(currentDateValue)

  if (!currentDate || currentDate.toISOString().slice(0, 7) !== monthValue) return 0

  const { start, end } = getPayrollMonthCalendar(monthValue)
  const finalDate = new Date(end.getTime() - DAY_IN_MILLISECONDS)
  const throughDate = currentDate < finalDate ? currentDate : finalDate

  return countAfghanistanWorkingDays(start, throughDate, holidayDates)
}
