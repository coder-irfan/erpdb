// Third-party Imports
import { getServerSession } from 'next-auth'
import { Toaster } from 'sonner'

// Context Imports
import { NextAuthProvider } from '@/contexts/nextAuthProvider'
import { NotificationProvider } from '@/contexts/NotificationProvider'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import RoleNotificationStack from '@/components/ui/RoleNotificationCard'
import UnsavedChangesGuard from '@/components/forms/UnsavedChangesGuard'
import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'
import ReduxProvider from '@/redux-store/ReduxProvider'

// Styled Component Imports
import AppReactToastify from '@/libs/styles/AppReactToastify'
import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'

// Util Imports
import { getMode, getSettingsFromCookie, getSystemMode } from '@core/utils/serverHelpers'

const Providers = async props => {
  // Props
  const { children, direction } = props

  // Vars
  const [mode, settingsCookie, systemMode, session, companySetup] = await Promise.all([
    getMode(),
    getSettingsFromCookie(),
    getSystemMode(),
    getServerSession(authOptions),
    getCompanySetupRecord()
  ])

  return (
    <NextAuthProvider basePath={process.env.NEXTAUTH_BASEPATH} session={session}>
      <VerticalNavProvider>
        <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
          <CurrencyProvider initialCurrency={companySetup.currency_code} exchangeRate={companySetup.usd_afn_exchange_rate}>
            <ThemeProvider direction={direction} systemMode={systemMode}>
              <NotificationProvider>
                <ReduxProvider>
                  <UnsavedChangesGuard>{children}</UnsavedChangesGuard>
                </ReduxProvider>
                <RoleNotificationStack />
              </NotificationProvider>
              <Toaster
                position='top-right'
                dir={direction}
                richColors
                closeButton
                expand={false}
                visibleToasts={4}
                duration={4000}
                toastOptions={{
                  style: {
                    fontFamily: 'var(--font-primary), sans-serif',
                    borderRadius: 'var(--border-radius, 3px)',
                    fontSize: '14px'
                  }
                }}
              />
              <AppReactToastify direction={direction} hideProgressBar />
            </ThemeProvider>
          </CurrencyProvider>
        </SettingsProvider>
      </VerticalNavProvider>
    </NextAuthProvider>
  )
}

export default Providers
