const PAYMENT_METHOD_LABELS = {
  BANK_TRANSFER: 'Bank Transfer',
  CASH: 'Cash',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  MOBILE_MONEY: 'Mobile Money',
  CHEQUE: 'Cheque',
  CHECK: 'Check',
  MANUAL_CASH: 'Manual Cash',
  MANUAL_BANK: 'Manual Bank',
  SALARY_DEDUCTION: 'Salary Deduction'
}

const humanizeKey = value =>
  String(value || '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())

const parseJson = value => {
  if (typeof value !== 'string') return value

  const trimmed = value.trim()

  if (!trimmed || !/^[{[]/.test(trimmed)) return value

  try {

    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

export const formatPaymentMethod = value => {
  const parsed = parseJson(value)

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {

    return formatPaymentMethod(parsed.payment_method || parsed.paymentMethod || parsed.method || parsed.label || parsed.value)
  }

  const method = String(parsed || '').trim()

  if (!method) return ''

  return PAYMENT_METHOD_LABELS[method.toUpperCase()] || humanizeKey(method)
}

export const formatLedgerText = value => {
  const parsed = parseJson(value)

  if (parsed == null || parsed === '') return ''
  if (typeof parsed !== 'object') return String(parsed)
  if (Array.isArray(parsed)) return parsed.map(formatLedgerText).filter(Boolean).join(' · ')

  const entries = []
  const paymentMethod = parsed.payment_method || parsed.paymentMethod

  if (paymentMethod) entries.push(formatPaymentMethod(paymentMethod))
  if (parsed.seeded === true) entries.push('Seeded Entry')

  Object.entries(parsed).forEach(([key, entry]) => {
    if (['payment_method', 'paymentMethod', 'seeded'].includes(key) || entry == null || entry === '') return
    const formattedValue = typeof entry === 'object' ? formatLedgerText(entry) : humanizeKey(entry)

    entries.push(formattedValue === humanizeKey(key) ? formattedValue : `${humanizeKey(key)}: ${formattedValue}`)
  })

  return entries.join(' · ')
}
