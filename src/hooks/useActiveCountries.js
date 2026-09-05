'use client'

import { useEffect, useRef, useState } from 'react'

const EMPTY_COUNTRIES = []

const getFallbackSignature = fallback => JSON.stringify(Array.isArray(fallback) ? fallback : EMPTY_COUNTRIES)

const useActiveCountries = (enabled, fallback = EMPTY_COUNTRIES) => {
  const fallbackCache = useRef({ signature: null, value: EMPTY_COUNTRIES })
  const fallbackSignature = getFallbackSignature(fallback)

  if (fallbackCache.current.signature !== fallbackSignature) {
    fallbackCache.current = {
      signature: fallbackSignature,
      value: Array.isArray(fallback) ? fallback : EMPTY_COUNTRIES
    }
  }

  const stableFallback = fallbackCache.current.value
  const [countries, setCountries] = useState(stableFallback)

  useEffect(() => {
    setCountries(stableFallback)
  }, [stableFallback])

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()

    const load = async () => {
      try {
        const response = await fetch('/api/options/contracts/countries', {
          cache: 'no-store',
          signal: controller.signal
        })

        const result = await response.json()

        if (response.ok && result.success) setCountries(result.data.options || [])
      } catch (error) {
        if (error.name !== 'AbortError') setCountries(stableFallback)
      }
    }

    load()

    const loadWhenVisible = () => {
      if (document.visibilityState === 'visible') load()
    }

    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', loadWhenVisible)

    return () => {
      controller.abort()
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', loadWhenVisible)
    }
  }, [enabled, stableFallback])

  return countries
}

export default useActiveCountries
