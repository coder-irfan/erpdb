'use client'
import { createContext, useMemo, useState } from 'react'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useObjectCookie } from '@core/hooks/useObjectCookie'

// Initial Settings Context
export const SettingsContext = createContext(null)

const lockedLayoutSettings = {
  layout: 'horizontal',
  navbarContentWidth: 'wide',
  contentWidth: 'wide',
  footerContentWidth: 'wide'
}

const lockLayoutSettings = settings => ({ ...settings, ...lockedLayoutSettings })

// Settings Provider
export const SettingsProvider = props => {
  // Initial Settings
  const initialSettings = {
    mode: themeConfig.mode,
    skin: themeConfig.skin,
    semiDark: themeConfig.semiDark,
    layout: themeConfig.layout,
    navbarContentWidth: themeConfig.navbar.contentWidth,
    contentWidth: themeConfig.contentWidth,
    footerContentWidth: themeConfig.footer.contentWidth,
    primaryColorLight: themeConfig.primaryColorLight,
    secondaryColorLight: themeConfig.secondaryColorLight,
    primaryColorDark: themeConfig.primaryColorDark,
    secondaryColorDark: themeConfig.secondaryColorDark
  }

  const updatedInitialSettings = lockLayoutSettings({
    ...initialSettings,
    mode: props.mode || themeConfig.mode
  })

  // Cookies
  const [settingsCookie, updateSettingsCookie] = useObjectCookie(
    themeConfig.settingsCookieName,
    JSON.stringify(props.settingsCookie) !== '{}' ? props.settingsCookie : updatedInitialSettings
  )

  // State
  const [_settingsState, _updateSettingsState] = useState(() => {
    const persistedSettings = JSON.stringify(settingsCookie) !== '{}' ? settingsCookie : {}

    return lockLayoutSettings({
      ...updatedInitialSettings,
      ...persistedSettings,
      primaryColorLight:
        persistedSettings.primaryColorLight || persistedSettings.primaryColor || themeConfig.primaryColorLight,
      secondaryColorLight:
        persistedSettings.secondaryColorLight || persistedSettings.secondaryColor || themeConfig.secondaryColorLight,
      primaryColorDark: persistedSettings.primaryColorDark || themeConfig.primaryColorDark,
      secondaryColorDark: persistedSettings.secondaryColorDark || themeConfig.secondaryColorDark
    })
  })

  const updateSettings = (settings, options) => {
    const { updateCookie = true } = options || {}

    _updateSettingsState(prev => {
      const newSettings = lockLayoutSettings({ ...prev, ...settings })

      // Update cookie if needed
      if (updateCookie) updateSettingsCookie(newSettings)

      return newSettings
    })
  }

  /**
   * Updates the settings for page with the provided settings object.
   * Updated settings won't be saved to cookie hence will be reverted once navigating away from the page.
   *
   * @param settings - The partial settings object containing the properties to update.
   * @returns A function to reset the page settings.
   *
   * @example
   * useEffect(() => {
   *     return updatePageSettings({ theme: 'dark' });
   * }, []);
   */
  const updatePageSettings = settings => {
    updateSettings(settings, { updateCookie: false })

    // Returns a function to reset the page settings
    return () => updateSettings(lockLayoutSettings(settingsCookie), { updateCookie: false })
  }

  const resetSettings = () => {
    updateSettings(initialSettings)
  }

  const isSettingsChanged = useMemo(
    () => JSON.stringify(initialSettings) !== JSON.stringify(_settingsState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [_settingsState]
  )

  return (
    <SettingsContext.Provider
      value={{
        settings: _settingsState,
        updateSettings,
        isSettingsChanged,
        resetSettings,
        updatePageSettings
      }}
    >
      {props.children}
    </SettingsContext.Provider>
  )
}
