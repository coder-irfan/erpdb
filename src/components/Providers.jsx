// Third-party Imports
import { getServerSession } from 'next-auth'
import { Toaster } from 'sonner'

// Context Imports
import { NextAuthProvider } from '@/contexts/nextAuthProvider'
import { NotificationProvider } from '@/contexts/NotificationProvider'
import RoleNotificationStack from '@/components/ui/RoleNotificationCard'
import UnsavedChangesGuard from '@/components/forms/UnsavedChangesGuard'
import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'
import ReduxProvider from '@/redux-store/ReduxProvider'

// Styled Component Imports
import AppReactToastify from '@/libs/styles/AppReactToastify'
import { authOptions } from '@/libs/auth'

// Util Imports
import { getMode, getSettingsFromCookie, getSystemMode } from '@core/utils/serverHelpers'

const Providers = async props => {
  // Props
  const { children, direction } = props

  // Vars
  const [mode, settingsCookie, systemMode, session] = await Promise.all([
    getMode(),
    getSettingsFromCookie(),
    getSystemMode(),
    getServerSession(authOptions)
  ])

  return (
    <NextAuthProvider basePath={process.env.NEXTAUTH_BASEPATH} session={session}>
      <VerticalNavProvider>
        <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
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
        </SettingsProvider>
      </VerticalNavProvider>
    </NextAuthProvider>
  )
}

export default Providers
