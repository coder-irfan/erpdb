// Next Imports
import { headers } from 'next/headers'

// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import { config } from '@fortawesome/fontawesome-svg-core'
import 'react-perfect-scrollbar/dist/css/styles.css'

// HOC Imports
import TranslationWrapper from '@/hocs/TranslationWrapper'

// Context Imports
import { BrandingProvider } from '@/contexts/BrandingProvider'

// Font Imports
import { peyda, publicSans, vazirmatn } from '@assets/fonts/fonts'

// Config Imports
import { i18n } from '@configs/i18n'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'
import { getBrandingSettings } from '@/libs/systemSettings'
import { prisma } from '@/libs/prisma'

// Style Imports
import '@/app/globals.css'
import '@fortawesome/fontawesome-svg-core/styles.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

config.autoAddCss = false

export const generateMetadata = async () => {
  let faviconUrl = '/favicon.ico'

  try {
    const settings = await prisma.systemSetting.findFirst({
      select: { faviconUrl: true }
    })

    faviconUrl = settings?.faviconUrl || faviconUrl
  } catch {
    // Keep the built-in favicon when settings are unavailable during startup.
  }

  return {
    title: 'ERP Dashboard System',
    description: 'Enterprise resource planning system',
    icons: { icon: faviconUrl }
  }
}

const RootLayout = async props => {
  const params = await props.params
  const { children } = props

  // Type guard to ensure lang is a valid Locale
  const lang = i18n.locales.includes(params.lang) ? params.lang : i18n.defaultLocale

  // Vars
  const [headersList, systemMode, branding] = await Promise.all([headers(), getSystemMode(), getBrandingSettings()])
  const direction = i18n.langDirection[lang]

  return (
    <TranslationWrapper headersList={headersList} lang={lang}>
      <html
        id='__next'
        lang={lang}
        dir={direction}
        className={`${publicSans.variable} ${peyda.variable} ${vazirmatn.variable} locale-${lang}`}
        suppressHydrationWarning
      >
        <body className='flex is-full min-bs-full flex-auto flex-col'>
          <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
          <BrandingProvider branding={branding}>{children}</BrandingProvider>
        </body>
      </html>
    </TranslationWrapper>
  )
}

export default RootLayout
