const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const SUPPORTED_CURRENCIES = new Set(['AFN', 'USD'])

export const SYSTEM_BASE_CURRENCY = 'AFN'

export const normalizeCurrency = currency => (SUPPORTED_CURRENCIES.has(currency) ? currency : 'AFN')

export const toFiniteNumber = value => {
  const numericValue = Number(value ?? 0)

  return Number.isFinite(numericValue) ? numericValue : 0
}

/**
 * Round monetary values at the system boundary instead of truncating them.
 * Keeping this in one place also prevents binary floating-point residue from
 * leaking into API payloads after additions, conversions, or subtractions.
 */
export const roundMoney = (value, fractionDigits = 2) => {
  const amount = toFiniteNumber(value)
  const digits = Math.max(0, Math.min(10, Number.parseInt(fractionDigits, 10) || 0))
  const factor = 10 ** digits
  const epsilon = Number.EPSILON * Math.sign(amount || 1)

  return Math.round((amount + epsilon) * factor) / factor
}

export const roundAfn = value => roundMoney(value, 0)

export const subtractMoney = (minuend, subtrahend, fractionDigits = 2) =>
  roundMoney(roundMoney(minuend, fractionDigits) - roundMoney(subtrahend, fractionDigits), fractionDigits)

export const formatCurrency = (value, locale = 'en', currency = 'AFN') => {
  const resolvedLocale = SUPPORTED_CURRENCIES.has(locale) ? 'en' : locale
  const resolvedCurrency = normalizeCurrency(SUPPORTED_CURRENCIES.has(locale) ? locale : currency)
  const amount = toFiniteNumber(value)

  if (resolvedCurrency === 'AFN') {
    const formatted = new Intl.NumberFormat(localeMap[resolvedLocale] || localeMap.en, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(roundAfn(amount))

    return `${formatted} AFN`
  }

  return new Intl.NumberFormat(localeMap[resolvedLocale] || localeMap.en, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Converts a native monetary amount to the immutable ERP ledger currency.
 * For AFN the effective rate is always 1; for USD the stored/snapshotted rate
 * is the number of AFN per USD.
 */
export const normalizeToAfn = (amount, currency = SYSTEM_BASE_CURRENCY, exchangeRate = 1) => {
  const sourceCurrency = normalizeCurrency(currency)
  const numericAmount = toFiniteNumber(amount)

  if (sourceCurrency === SYSTEM_BASE_CURRENCY) return roundMoney(numericAmount)

  const rate = toFiniteNumber(exchangeRate)

  return rate > 0 ? roundMoney(numericAmount * rate) : 0
}

export const effectiveAfnExchangeRate = (currency, exchangeRate) =>
  normalizeCurrency(currency) === SYSTEM_BASE_CURRENCY ? 1 : toFiniteNumber(exchangeRate)

export const sumInAfn = (entries, getMoney = entry => entry) =>
  roundMoney(
    (entries || []).reduce((total, entry) => {
      const money = getMoney(entry) || {}

      return total + normalizeToAfn(money.amount, money.currency, money.exchangeRate)
    }, 0)
  )

export const convertToBaseCurrency = (amount, currency, exchangeRate, baseCurrency = 'AFN') => {
  const sourceCurrency = normalizeCurrency(currency)
  const targetCurrency = normalizeCurrency(baseCurrency)
  const numericAmount = toFiniteNumber(amount)
  const rate = toFiniteNumber(exchangeRate)

  if (targetCurrency === SYSTEM_BASE_CURRENCY) return normalizeToAfn(numericAmount, sourceCurrency, exchangeRate)
  if (sourceCurrency === targetCurrency) return roundMoney(numericAmount)
  if (!Number.isFinite(rate) || rate <= 0) return 0

  return roundMoney(sourceCurrency === 'USD' ? numericAmount * rate : numericAmount / rate)
}

export const convertAfnToUsd = (amountInAfn, exchangeRate) => {
  const amount = toFiniteNumber(amountInAfn)
  const rate = toFiniteNumber(exchangeRate)

  return rate > 0 ? amount / rate : 0
}
