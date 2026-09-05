'use client'

import { SYSTEM_BASE_CURRENCY, convertAfnToUsd, formatCurrency, normalizeCurrency, normalizeToAfn, toFiniteNumber } from '@/utils/formatCurrency'
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
  const { currency: displayCurrency, exchangeRate: displayExchangeRate } = useCurrency()
  const nativeCurrency = normalizeCurrency(currency)

  const baseAmount = amountBase == null
    ? normalizeToAfn(amount, nativeCurrency, exchangeRate)
    : toFiniteNumber(amountBase)

  const displayAmount =
    displayCurrency === 'USD' ? convertAfnToUsd(baseAmount, displayExchangeRate) : baseAmount

  const equivalentCurrency = displayCurrency === 'USD' ? 'AFN' : 'USD'

  const equivalentAmount =
    equivalentCurrency === 'USD' ? convertAfnToUsd(baseAmount, displayExchangeRate) : baseAmount

  return (
    <span className={`inline-flex flex-col ${className}`.trim()}>
      <span className={`whitespace-nowrap font-semibold ${primaryClassName}`.trim()}>
        {formatCurrency(displayAmount, locale, displayCurrency)}
      </span>
      <span className={`whitespace-nowrap text-xs font-normal text-textSecondary ${secondaryClassName}`.trim()}>
        ({formatCurrency(equivalentAmount, locale, equivalentCurrency)})
      </span>
    </span>
  )
}

export default DualCurrencyAmount
