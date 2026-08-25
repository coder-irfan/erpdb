const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const utcDateKey = value => {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

export const utcMonthKey = value => utcDateKey(value)?.slice(0, 7) || null

export const parseUtcDate = (value, { endOfDay = false } = {}) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null

    return new Date(Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      ...(endOfDay ? [23, 59, 59, 999] : [0, 0, 0, 0])
    ))
  }

  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null

  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)

  return Number.isNaN(date.getTime()) || utcDateKey(date) !== value ? null : date
}

export const toUtcDateOnly = value => parseUtcDate(value)
export const toUtcEndOfDay = value => parseUtcDate(value, { endOfDay: true })

export const getDateKeyInTimeZone = (timeZone = 'Asia/Kabul', value = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(value)

export const combineUtcDateTime = (date, time) => {
  if (!DATE_PATTERN.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) return null

  const combined = new Date(`${date}T${time}:00.000Z`)

  return Number.isNaN(combined.getTime()) || utcDateKey(combined) !== date ? null : combined
}
