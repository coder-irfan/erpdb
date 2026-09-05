'use client'

import { SYSTEM_BASE_CURRENCY, normalizeCurrency, normalizeToAfn, toFiniteNumber } from '@/utils/formatCurrency'
import { useCurrency } from '@/contexts/CurrencyContext'

/**
 * AFN-first monetary renderer. Pass amountBase when the server already
 * persisted the normalized value; otherwise the native amount is converted
 * with the entry's locked exchange rate.
 */
const DualCurrencyAmount = ({
  amount,
  currency = SYSTEM_BASE_CURRENCY,
  exchangeRate = 1,
  amountBase,
  locale = 'en',
  className = '',
  primaryClassName = '',
  secondaryClassName = ''
}) => {
  const { currentCurrency: displayCurrency, formatCurrency } = useCurrency()
  const nativeCurrency = normalizeCurrency(currency)

  const baseAmount = amountBase == null
    ? normalizeToAfn(amount, nativeCurrency, exchangeRate)
    : toFiniteNumber(amountBase)

  const equivalentCurrency = displayCurrency === 'USD' ? 'AFN' : 'USD'

  return (
    <span className={`inline-flex flex-col ${className}`.trim()}>
      <span className={`whitespace-nowrap font-semibold ${primaryClassName}`.trim()}>
        {formatCurrency(baseAmount, locale, SYSTEM_BASE_CURRENCY, displayCurrency)}
      </span>
      <span className={`whitespace-nowrap text-xs font-normal text-textSecondary ${secondaryClassName}`.trim()}>
        ({formatCurrency(baseAmount, locale, SYSTEM_BASE_CURRENCY, equivalentCurrency)})
      </span>
    </span>
  )
}

export default DualCurrencyAmount
