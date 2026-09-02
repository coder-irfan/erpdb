import { toUtcDateOnly } from '@/utils/utcDate'

export { toUtcDateOnly } from '@/utils/utcDate'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const DURATION_PATTERN = /(?<![-\d.,])(\d+(?:[.,]\d+)?)\s*(years?|yrs?|y|months?|mos?|mo|weeks?|wks?|w|days?|d)\b/i

const durationSources = option => {
  if (typeof option === 'string' || typeof option === 'number') return [option]
  if (!option || typeof option !== 'object') return []

  return [
    option.amount && option.unit ? `${option.amount} ${option.unit}` : null,
    option.label,
    option.value,
    option.description
  ].filter(value => value !== null && value !== undefined && value !== '')
}

export const parseDurationOption = option => {
  const match = durationSources(option)
    .map(source =>
      String(source)
        .trim()
        .replaceAll('_', ' ')
        .replace(/(?<=\d)-(?=[a-z])/gi, ' ')
    )
    .map(source => source.match(DURATION_PATTERN))
    .find(Boolean)

  if (!match) return null

  const amount = Number(match[1].replace(',', '.'))
  const unit = match[2].toLowerCase()

  if (!Number.isFinite(amount) || amount <= 0) return null
  if (unit === 'y' || unit.startsWith('year') || unit.startsWith('yr')) return { amount, unit: 'YEAR' }
  if (unit === 'mo' || unit.startsWith('month') || unit.startsWith('mos')) return { amount, unit: 'MONTH' }
  if (unit === 'w' || unit.startsWith('week') || unit.startsWith('wk')) return { amount, unit: 'WEEK' }

  return { amount, unit: 'DAY' }
}

export const formatContractDuration = (option, fallback = '') => {
  const parsed = parseDurationOption(option || { value: fallback })

  if (parsed) {
    const unit = `${parsed.unit[0]}${parsed.unit.slice(1).toLowerCase()}`
    const plural = parsed.amount === 1 ? '' : 's'

    return `${parsed.amount} ${unit}${plural}`
  }

  const source = option?.label || option?.value || fallback

  return String(source || '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase())
}

export const calculateContractEndDate = (startDate, durationOption) => {
  const start = toUtcDateOnly(startDate)
  const duration = parseDurationOption(durationOption)

  if (!start || !duration) return null

  const result = new Date(start)

  if (duration.unit === 'YEAR') {
    const wholeYears = Math.trunc(duration.amount)
    const originalDay = result.getUTCDate()

    result.setUTCDate(1)
    result.setUTCFullYear(result.getUTCFullYear() + wholeYears)
    result.setUTCDate(
      Math.min(originalDay, new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate())
    )
    if (duration.amount !== wholeYears)
      result.setUTCDate(result.getUTCDate() + Math.round((duration.amount - wholeYears) * 365))
  } else if (duration.unit === 'MONTH') {
    const wholeMonths = Math.trunc(duration.amount)
    const originalDay = result.getUTCDate()

    result.setUTCDate(1)
    result.setUTCMonth(result.getUTCMonth() + wholeMonths)
    result.setUTCDate(
      Math.min(originalDay, new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate())
    )
    if (duration.amount !== wholeMonths)
      result.setUTCDate(result.getUTCDate() + Math.round((duration.amount - wholeMonths) * 30))
  } else {
    const days = duration.unit === 'WEEK' ? duration.amount * 7 : duration.amount

    result.setUTCDate(result.getUTCDate() + Math.round(days))
  }

  return Number.isNaN(result.getTime()) ? null : result
}

export const getRemainingDays = (endDate, now = new Date()) => {
  const end = toUtcDateOnly(endDate instanceof Date ? endDate : String(endDate).slice(0, 10))
  const today = toUtcDateOnly(now)

  if (!end || !today) return 0

  return Math.ceil((end.getTime() - today.getTime()) / DAY_IN_MS)
}

export const getDateRangeDuration = (startDate, endDate) => {
  const start = toUtcDateOnly(startDate)
  const end = toUtcDateOnly(endDate)

  if (!start || !end) return null

  const totalDays = Math.round((end.getTime() - start.getTime()) / DAY_IN_MS)

  if (totalDays < 0) return { isValid: false, months: 0, days: 0, totalDays }

  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth()
  let monthAnchor = months > 0 ? calculateContractEndDate(start, { value: `${months} Months` }) : new Date(start)

  if (monthAnchor > end) {
    months -= 1
    monthAnchor = months > 0 ? calculateContractEndDate(start, { value: `${months} Months` }) : new Date(start)
  }

  const days = Math.round((end.getTime() - monthAnchor.getTime()) / DAY_IN_MS)

  return { isValid: true, months, days, totalDays }
}

export const formatDateRangeDuration = (startDate, endDate) => {
  const start = toUtcDateOnly(startDate)
  const end = toUtcDateOnly(endDate)

  if (!start || !end || end < start) return ''

  let years = end.getUTCFullYear() - start.getUTCFullYear()
  let months = end.getUTCMonth() - start.getUTCMonth()

  if (end.getUTCDate() < start.getUTCDate()) months -= 1

  if (months < 0) {
    years -= 1
    months += 12
  }

  const parts = []

  if (years) parts.push(`${years} Year${years === 1 ? '' : 's'}`)
  if (months) parts.push(`${months} Month${months === 1 ? '' : 's'}`)

  if (parts.length === 0) {
    const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / DAY_IN_MS))

    return `${days} Day${days === 1 ? '' : 's'}`
  }

  return parts.join(', ')
}

export const toDateInputValue = value => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}
