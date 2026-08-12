const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

export const formatCurrency = (value, locale = 'en', currency = 'AFN') =>
  new Intl.NumberFormat(localeMap[locale] || localeMap.en, {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0))
