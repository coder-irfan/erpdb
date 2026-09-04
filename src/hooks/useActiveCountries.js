'use client'

import { useEffect, useState } from 'react'

const useActiveCountries = (enabled, fallback = []) => {
  const [countries, setCountries] = useState(fallback)

  useEffect(() => {
    setCountries(fallback)
  }, [fallback])

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
        if (error.name !== 'AbortError') setCountries(fallback)
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
  }, [enabled, fallback])

  return countries
}

export default useActiveCountries
