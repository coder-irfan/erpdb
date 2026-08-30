import { SYSTEM_BASE_CURRENCY, convertAfnToUsd, formatCurrency, normalizeCurrency, normalizeToAfn, toFiniteNumber } from '@/utils/formatCurrency'

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
  const nativeCurrency = normalizeCurrency(currency)

  const baseAmount = amountBase == null
    ? normalizeToAfn(amount, nativeCurrency, exchangeRate)
    : toFiniteNumber(amountBase)

  return (
    <span className={`inline-flex flex-col ${className}`.trim()}>
      <span className={`whitespace-nowrap font-semibold ${primaryClassName}`.trim()}>
        {formatCurrency(baseAmount, locale, SYSTEM_BASE_CURRENCY)}
      </span>
      <span className={`whitespace-nowrap text-xs font-normal text-textSecondary ${secondaryClassName}`.trim()}>
        ({formatCurrency(nativeCurrency === 'USD' ? amount : convertAfnToUsd(baseAmount, exchangeRate), locale, 'USD')})
      </span>
    </span>
  )
}

export default DualCurrencyAmount
