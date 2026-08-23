/*
 * Mode, skin and semi-dark preferences may be restored from the settings cookie.
 * Layout and content-width values are locked by the settings context and cannot be overridden by stored settings.
 */
const themeConfig = {
  templateName: 'Vuexy',
  homePageUrl: '/dashboard',
  settingsCookieName: 'vuexy-mui-next-demo-1',
  mode: 'system', // 'system', 'light', 'dark'
  skin: 'default', // 'default', 'bordered'
  primaryColorLight: '#022483',
  secondaryColorLight: '#F38022',
  primaryColorDark: '#366AFC',
  secondaryColorDark: '#FF9D42',
  semiDark: false, // true, false
  layout: 'horizontal',
  layoutPadding: 24, // Common padding for header, content, footer layout components (in px)
  compactContentWidth: 1440, // in px
  navbar: {
    type: 'fixed', // 'fixed', 'static'
    contentWidth: 'wide',
    floating: true, //! true, false (This will not work in the Horizontal Layout)
    detached: true, //! true, false (This will not work in the Horizontal Layout or floating navbar is enabled)
    blur: true // true, false
  },
  contentWidth: 'wide',
  footer: {
    type: 'static', // 'fixed', 'static'
    contentWidth: 'wide',
    detached: true //! true, false (This will not work in the Horizontal Layout)
  },
  disableRipple: false, // true, false
  toastPosition: 'top-right' // 'top-right', 'top-center', 'top-left', 'bottom-right', 'bottom-center', 'bottom-left'
}

export default themeConfig
