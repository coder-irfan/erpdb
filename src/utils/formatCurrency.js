const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const SUPPORTED_CURRENCIES = new Set(['AFN', 'USD'])

export const normalizeCurrency = currency => (SUPPORTED_CURRENCIES.has(currency) ? currency : 'AFN')

export const toFiniteNumber = value => {
  const numericValue = Number(value ?? 0)

  return Number.isFinite(numericValue) ? numericValue : 0
}

export const formatCurrency = (value, locale = 'en', currency = 'AFN') => {
  const resolvedLocale = SUPPORTED_CURRENCIES.has(locale) ? 'en' : locale
  const resolvedCurrency = normalizeCurrency(SUPPORTED_CURRENCIES.has(locale) ? locale : currency)
  const amount = toFiniteNumber(value)

  if (resolvedCurrency === 'AFN') {
    const formatted = new Intl.NumberFormat(localeMap[resolvedLocale] || localeMap.en, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount))

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

export const convertToBaseCurrency = (amount, currency, exchangeRate, baseCurrency = 'AFN') => {
  const sourceCurrency = normalizeCurrency(currency)
  const targetCurrency = normalizeCurrency(baseCurrency)
  const numericAmount = toFiniteNumber(amount)
  const rate = toFiniteNumber(exchangeRate)

  if (sourceCurrency === targetCurrency) return numericAmount
  if (!Number.isFinite(rate) || rate <= 0) return 0

  return sourceCurrency === 'USD' ? numericAmount * rate : numericAmount / rate
}
