// Component Imports
import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'

// Font Imports
import { peyda, publicSans, vazirmatn } from '@assets/fonts/fonts'

// Config Imports
import { i18n } from '@configs/i18n'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

const Layout = async props => {
  const params = await props.params
  const { children } = props

  // Type guard to ensure lang is a valid Locale
  const lang = i18n.locales.includes(params.lang) ? params.lang : i18n.defaultLocale

  // Vars
  const direction = i18n.langDirection[lang]
  const systemMode = await getSystemMode()

  return (
    <Providers direction={direction}>
      <BlankLayout
        className={`${publicSans.variable} ${peyda.variable} ${vazirmatn.variable} locale-${lang} font-primary`}
        systemMode={systemMode}
      >
        {children}
      </BlankLayout>
    </Providers>
  )
}

export default Layout
