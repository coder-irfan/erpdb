import { toFiniteNumber } from '@/utils/formatCurrency'

const toNumber = value => (value === null || value === undefined || value === '' ? null : toFiniteNumber(value))

const parseObject = value => {
  if (typeof value !== 'string') return null

  const candidates = [value.trim(), value.match(/\{[\s\S]*\}/)?.[0]].filter(Boolean)

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {
      // Legacy plain-text summaries are handled below.
    }
  }

  return null
}

const parseLegacySummary = value => {
  const text = typeof value === 'string' ? value : ''

  const match = text.match(
    /Payable calendar:\s*([\d.]+).*?;\s*([\d.]+)\s*payable.*?,\s*([\d.]+)\s*approved paid leave days\),\s*([\d.]+)\s*absent;\s*([\d.]+)\s*hours logged/i
  )

  if (!match) return {}

  return {
    workingDays: Number(match[1]),
    payableDays: Number(match[2]),
    paidLeaveDays: Number(match[3]),
    absentDays: Number(match[4]),
    loggedHours: Number(match[5])
  }
}

export const parseSalaryTimesheetSummary = (value, fallback = {}) => {
  const fallbackValues = fallback || {}
  const parsed = parseObject(value) || parseLegacySummary(value)
  const metric = (key, fallbackValue = null) => toNumber(parsed[key] ?? fallbackValue)

  return {
    workingDays: metric('workingDays', fallbackValues.total_month_days),
    payableDays: metric('payableDays', fallbackValues.worked_days),
    absentDays: metric('absentDays', fallbackValues.off_days),
    paidLeaveDays: metric('paidLeaveDays', 0),
    loggedHours: metric('loggedHours'),
    contractNumber: typeof parsed.contractNumber === 'string' ? parsed.contractNumber.trim() : '',
    unpaidDays: metric('unpaidDays'),
    note:
      typeof parsed.note === 'string' && !/migrated from legacy/i.test(parsed.note) ? parsed.note.trim() : ''
  }
}
