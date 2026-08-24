'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const LayoutPreferenceContext = createContext(null)

export const LAYOUT_COOKIE = 'dashboard-layout'
export const COLLAPSED_COOKIE = 'dashboard-sidebar-collapsed'

const persistPreference = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Cookies remain the persistence fallback when browser storage is unavailable.
  }

  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
}

export const LayoutPreferenceProvider = ({ initialLayout = 'sidebar', initialCollapsed = false, children }) => {
  const [layout, setLayoutState] = useState(initialLayout)
  const [isCollapsed, setCollapsedState] = useState(initialCollapsed)

  const setLayout = useCallback(value => {
    const nextLayout = value === 'topbar' ? 'topbar' : 'sidebar'

    setLayoutState(nextLayout)
    persistPreference(LAYOUT_COOKIE, nextLayout)
  }, [])

  const setIsCollapsed = useCallback(value => {
    setCollapsedState(current => {
      const nextCollapsed = typeof value === 'function' ? Boolean(value(current)) : Boolean(value)

      persistPreference(COLLAPSED_COOKIE, String(nextCollapsed))

      return nextCollapsed
    })
  }, [])

  const value = useMemo(
    () => ({
      layout,
      isCollapsed,
      setLayout,
      setIsCollapsed,
      toggleLayout: () => setLayout(layout === 'sidebar' ? 'topbar' : 'sidebar'),
      toggleCollapsed: () => setIsCollapsed(current => !current)
    }),
    [isCollapsed, layout, setIsCollapsed, setLayout]
  )

  return <LayoutPreferenceContext.Provider value={value}>{children}</LayoutPreferenceContext.Provider>
}

export const useLayoutPreference = () => {
  const context = useContext(LayoutPreferenceContext)

  if (!context) throw new Error('useLayoutPreference must be used within LayoutPreferenceProvider')

  return context
}
