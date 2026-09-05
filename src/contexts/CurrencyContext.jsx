'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { normalizeCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const CURRENCY_PREFERENCE_KEY = 'services-dashboard.display-currency'

const CurrencyContext = createContext(null)

export const CurrencyProvider = ({ children, initialCurrency = 'AFN', exchangeRate = 65 }) => {
  const defaultCurrency = normalizeCurrency(initialCurrency)
  const [currency, setCurrency] = useState(defaultCurrency)
  const normalizedExchangeRate = toFiniteNumber(exchangeRate) || 65

  useEffect(() => {
    const savedCurrency = window.localStorage.getItem(CURRENCY_PREFERENCE_KEY)

    if (savedCurrency) setCurrency(normalizeCurrency(savedCurrency))
  }, [])

  const selectCurrency = useCallback(nextCurrency => {
    const normalizedCurrency = normalizeCurrency(nextCurrency)

    setCurrency(normalizedCurrency)
    window.localStorage.setItem(CURRENCY_PREFERENCE_KEY, normalizedCurrency)
  }, [])

  const value = useMemo(
    () => ({ currency, exchangeRate: normalizedExchangeRate, setCurrency: selectCurrency }),
    [currency, normalizedExchangeRate, selectCurrency]
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext)

  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider')

  return context
}
