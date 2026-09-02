const LOCALES = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

export const AFGHAN_SOLAR_MONTHS = {
  en: ['Hamal', 'Sawr', 'Jawza', 'Saratan', 'Asad', 'Sunbula', 'Mizan', 'Aqrab', 'Qaws', 'Jadi', 'Dalw', 'Hoot'],
  fa: ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'],
  ps: ['وری', 'غویی', 'غبرګولی', 'چنګاښ', 'زمری', 'وږی', 'تله', 'لړم', 'لیندۍ', 'مرغومی', 'سلواغه', 'کب']
}

const WEEKDAYS = {
  fa: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
  ps: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']
}

export const normalizeAppLocale = locale => {
  const language = String(locale || 'en')
    .toLowerCase()
    .split(/[-_]/)[0]

  return language === 'fa' || language === 'ps' ? language : 'en'
}

export const getAppLocale = locale => LOCALES[normalizeAppLocale(locale)]

const dateFrom = value => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (!value) return null

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00.000Z` : value
  const date = new Date(normalized)

  return Number.isNaN(date.getTime()) ? null : date
}

const localizeNumber = (value, locale) =>
  new Intl.NumberFormat(getAppLocale(locale), { useGrouping: false }).format(Number(value))

export const getAfghanSolarParts = (value, { timeZone = 'UTC' } = {}) => {
  const date = dateFrom(value)

  if (!date) return null

  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone
  }).formatToParts(date)

  const part = type => Number(parts.find(item => item.type === type)?.value)

  return { date, year: part('year'), month: part('month'), day: part('day') }
}

export const formatAfghanMonth = (value, locale = 'en', options = {}) => {
  const language = normalizeAppLocale(locale)

  if (language === 'en' && !options.solar) {
    const date = dateFrom(value)

    return date
      ? new Intl.DateTimeFormat('en-US', {
          month: options.short ? 'short' : 'long',
          timeZone: options.timeZone || 'UTC'
        }).format(date)
      : '—'
  }

  const parts = getAfghanSolarParts(value, options)

  return parts ? AFGHAN_SOLAR_MONTHS[language][parts.month - 1] : '—'
}

export const formatAfghanTime = (value, locale = 'en', options = {}) => {
  const date = dateFrom(value)

  if (!date) return '—'

  return new Intl.DateTimeFormat(getAppLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
    ...(options.second ? { second: '2-digit' } : {}),
    ...(options.timeZone ? { timeZone: options.timeZone } : {})
  }).format(date)
}

export const formatAfghanDate = (value, locale = 'en', options = {}) => {
  const language = normalizeAppLocale(locale)
  const date = dateFrom(value)

  if (!date) return '—'

  if (language === 'en' && !options.solar) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: options.dateStyle || 'medium',
      ...(options.timeZone ? { timeZone: options.timeZone } : {})
    }).format(date)
  }

  const parts = getAfghanSolarParts(date, options)
  const year = localizeNumber(parts.year, language)
  const month = AFGHAN_SOLAR_MONTHS[language][parts.month - 1]
  const day = localizeNumber(parts.day, language)
  const style = options.dateStyle || 'medium'

  if (style === 'short') return `${year}/${localizeNumber(parts.month, language)}/${day}`

  const formatted = `${day} ${month} ${year}`

  return style === 'full' ? `${WEEKDAYS[language][date.getUTCDay()]}، ${formatted}` : formatted
}

export const formatAfghanDateTime = (value, locale = 'en', options = {}) => {
  const date = formatAfghanDate(value, locale, options)

  return date === '—' ? date : `${date}، ${formatAfghanTime(value, locale, options)}`
}

export const formatAfghanMonthYear = (value, locale = 'en', options = {}) => {
  const language = normalizeAppLocale(locale)
  const parts = getAfghanSolarParts(value, options)

  if (!parts) return '—'

  if (language === 'en' && !options.solar) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: options.timeZone || 'UTC'
    }).format(parts.date)
  }

  return `${AFGHAN_SOLAR_MONTHS[language][parts.month - 1]} ${localizeNumber(parts.year, language)}`
}
