const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_IN_MS = 86_400_000

export const DASHBOARD_PERIOD_KEYS = Object.freeze({
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
  THIS_QUARTER: 'THIS_QUARTER',
  THIS_YEAR: 'THIS_YEAR',
  ALL_TIME: 'ALL_TIME',
  CUSTOM: 'CUSTOM'
})

export const DASHBOARD_PERIOD_OPTIONS = Object.freeze(Object.values(DASHBOARD_PERIOD_KEYS))

const startOfUtcDay = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
const startOfUtcMonth = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
const startOfUtcQuarter = date => new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1))
const startOfUtcYear = date => new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
const addUtcDays = (date, amount) => new Date(date.getTime() + amount * DAY_IN_MS)
const addUtcMonths = (date, amount) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1))
const addUtcYears = (date, amount) => new Date(Date.UTC(date.getUTCFullYear() + amount, date.getUTCMonth(), 1))
const dateKey = date => date?.toISOString().slice(0, 10) || null

const parseDateKey = value => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null

  const parsed = new Date(`${value}T00:00:00.000Z`)

  return Number.isNaN(parsed.getTime()) || dateKey(parsed) !== value ? null : parsed
}

export const getDashboardPresetDates = (period, now = new Date()) => {
  const today = startOfUtcDay(now)
  const monthStart = startOfUtcMonth(today)
  let start = monthStart
  let endExclusive = addUtcMonths(monthStart, 1)

  if (period === DASHBOARD_PERIOD_KEYS.LAST_MONTH) {
    start = addUtcMonths(monthStart, -1)
    endExclusive = monthStart
  } else if (period === DASHBOARD_PERIOD_KEYS.THIS_QUARTER) {
    start = startOfUtcQuarter(today)
    endExclusive = addUtcMonths(start, 3)
  } else if (period === DASHBOARD_PERIOD_KEYS.THIS_YEAR) {
    start = startOfUtcYear(today)
    endExclusive = addUtcYears(start, 1)
  } else if (period === DASHBOARD_PERIOD_KEYS.ALL_TIME) {
    start = null
    endExclusive = addUtcDays(today, 1)
  }

  return {
    startDate: dateKey(start),
    endDate: dateKey(addUtcDays(endExclusive, -1))
  }
}

export const resolveDashboardPeriod = (payload = {}, now = new Date()) => {
  const requestedPeriod = String(payload.period || '').toUpperCase()

  const period = DASHBOARD_PERIOD_OPTIONS.includes(requestedPeriod)
    ? requestedPeriod
    : DASHBOARD_PERIOD_KEYS.THIS_MONTH

  let start
  let endExclusive

  if (period === DASHBOARD_PERIOD_KEYS.CUSTOM) {
    start = parseDateKey(payload.startDate)
    const inclusiveEnd = parseDateKey(payload.endDate)

    if (!start || !inclusiveEnd || inclusiveEnd < start) {
      return resolveDashboardPeriod({ period: DASHBOARD_PERIOD_KEYS.THIS_MONTH }, now)
    }

    endExclusive = addUtcDays(inclusiveEnd, 1)
  } else {
    const preset = getDashboardPresetDates(period, now)

    start = parseDateKey(preset.startDate)
    endExclusive = addUtcDays(parseDateKey(preset.endDate), 1)
  }

  let previousStart = null
  let previousEndExclusive = null

  if (start) {
    if (period === DASHBOARD_PERIOD_KEYS.THIS_MONTH || period === DASHBOARD_PERIOD_KEYS.LAST_MONTH) {
      previousStart = addUtcMonths(start, -1)
      previousEndExclusive = start
    } else if (period === DASHBOARD_PERIOD_KEYS.THIS_QUARTER) {
      previousStart = addUtcMonths(start, -3)
      previousEndExclusive = start
    } else if (period === DASHBOARD_PERIOD_KEYS.THIS_YEAR) {
      previousStart = addUtcYears(start, -1)
      previousEndExclusive = start
    } else {
      const duration = endExclusive.getTime() - start.getTime()

      previousStart = new Date(start.getTime() - duration)
      previousEndExclusive = start
    }
  }

  return {
    key: period,
    start,
    endExclusive,
    previousStart,
    previousEndExclusive,
    startDate: dateKey(start),
    endDate: dateKey(addUtcDays(endExclusive, -1)),
    previousStartDate: dateKey(previousStart),
    previousEndDate: previousEndExclusive ? dateKey(addUtcDays(previousEndExclusive, -1)) : null
  }
}
