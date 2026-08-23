'use client'

// React Imports
import { useEffect, useMemo } from 'react'

// MUI Imports
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import CssBaseline from '@mui/material/CssBaseline'

// Third-party Imports
import { useMedia } from 'react-use'
import stylisRTLPlugin from 'stylis-plugin-rtl'

// Component Imports
import ModeChanger from './ModeChanger'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Core Theme Imports
import defaultCoreTheme from '@core/theme'

const CustomThemeProvider = props => {
  // Props
  const { children, direction, systemMode } = props

  // Hooks
  const { settings } = useSettings()
  const isDark = useMedia('(prefers-color-scheme: dark)', systemMode === 'dark')

  // Vars
  const isServer = typeof window === 'undefined'
  let currentMode

  if (isServer) {
    currentMode = systemMode
  } else {
    if (settings.mode === 'system') {
      currentMode = isDark ? 'dark' : 'light'
    } else {
      currentMode = settings.mode
    }
  }

  useEffect(() => {
    const root = document.documentElement
    const primaryColorLight = settings.primaryColorLight || themeConfig.primaryColorLight
    const secondaryColorLight = settings.secondaryColorLight || themeConfig.secondaryColorLight
    const primaryColorDark = settings.primaryColorDark || themeConfig.primaryColorDark
    const secondaryColorDark = settings.secondaryColorDark || themeConfig.secondaryColorDark

    root.style.setProperty('--primary-color-light', primaryColorLight)
    root.style.setProperty('--secondary-color-light', secondaryColorLight)
    root.style.setProperty('--primary-color-dark', primaryColorDark)
    root.style.setProperty('--secondary-color-dark', secondaryColorDark)
    root.style.setProperty('--primary-color', currentMode === 'dark' ? primaryColorDark : primaryColorLight)
    root.style.setProperty('--secondary-color', currentMode === 'dark' ? secondaryColorDark : secondaryColorLight)
  }, [
    currentMode,
    settings.primaryColorLight,
    settings.secondaryColorLight,
    settings.primaryColorDark,
    settings.secondaryColorDark
  ])

  // Keep the light and dark palettes defined in colorSchemes.js authoritative.
  const theme = useMemo(() => {
    const coreTheme = defaultCoreTheme(settings, currentMode, direction)

    return createTheme({
      ...coreTheme,
      cssVariables: {
        colorSchemeSelector: 'data'
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.skin,
    settings.primaryColorLight,
    settings.secondaryColorLight,
    settings.primaryColorDark,
    settings.secondaryColorDark,
    currentMode,
    direction
  ])

  return (
    <AppRouterCacheProvider
      options={{
        prepend: true,
        ...(direction === 'rtl' && {
          key: 'rtl',
          stylisPlugins: [stylisRTLPlugin]
        })
      }}
    >
      <ThemeProvider
        theme={theme}
        defaultMode={systemMode}
        modeStorageKey={`${themeConfig.templateName.toLowerCase().split(' ').join('-')}-mui-template-mode`}
        forceThemeRerender
      >
        <>
          <ModeChanger systemMode={systemMode} />
          <CssBaseline />
          {children}
        </>
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}

export default CustomThemeProvider
