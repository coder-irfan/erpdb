'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  convertToBaseCurrency,
  formatCurrency as formatMoney,
  normalizeCurrency,
  toFiniteNumber
} from '@/utils/formatCurrency'

const CURRENCY_PREFERENCE_KEY = 'services-dashboard.display-currency'

const CurrencyContext = createContext(null)

export const CurrencyProvider = ({ children, initialCurrency = 'AFN', exchangeRate = 65 }) => {
  const defaultCurrency = normalizeCurrency(initialCurrency)
  const [currentCurrency, setCurrentCurrency] = useState(defaultCurrency)
  const normalizedExchangeRate = toFiniteNumber(exchangeRate) || 65

  useEffect(() => {
    const savedCurrency = window.localStorage.getItem(CURRENCY_PREFERENCE_KEY)

    if (savedCurrency) {
      const normalizedCurrency = normalizeCurrency(savedCurrency)

      setCurrentCurrency(current => (current === normalizedCurrency ? current : normalizedCurrency))
    }
  }, [])

  const selectCurrency = useCallback(nextCurrency => {
    const normalizedCurrency = normalizeCurrency(nextCurrency)

    setCurrentCurrency(current => (current === normalizedCurrency ? current : normalizedCurrency))
    window.localStorage.setItem(CURRENCY_PREFERENCE_KEY, normalizedCurrency)
  }, [])

  const convertCurrency = useCallback(
    (amount, sourceCurrency = 'AFN', targetCurrency = currentCurrency) =>
      convertToBaseCurrency(amount, sourceCurrency, normalizedExchangeRate, targetCurrency),
    [currentCurrency, normalizedExchangeRate]
  )

  const formatCurrency = useCallback(
    (amount, locale = 'en', sourceCurrency = 'AFN', targetCurrency = currentCurrency) =>
      formatMoney(convertCurrency(amount, sourceCurrency, targetCurrency), locale, targetCurrency),
    [convertCurrency, currentCurrency]
  )

  const value = useMemo(
    () => ({
      currentCurrency,

      // Kept as an alias while existing consumers migrate to the clearer name.
      currency: currentCurrency,
      exchangeRate: normalizedExchangeRate,
      setCurrency: selectCurrency,
      convertCurrency,
      formatCurrency
    }),
    [convertCurrency, currentCurrency, formatCurrency, normalizedExchangeRate, selectCurrency]
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext)

  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider')

  return context
}
