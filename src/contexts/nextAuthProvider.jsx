'use client'

// React Imports
import { useEffect, useRef } from 'react'

// Third-party Imports
import { SessionProvider, signOut, useSession } from 'next-auth/react'

// Lib Imports
import { USER_DEACTIVATED_CODE } from '@/libs/authDeactivation'

const getLoginUrl = () => {
  const locale = window.location.pathname.split('/').filter(Boolean)[0]
  const localizedLogin = locale ? `/${locale}/login` : '/login'

  return `${localizedLogin}?error=${USER_DEACTIVATED_CODE}`
}

const clearClientStorage = () => {
  try {
    window.localStorage.clear()
    window.sessionStorage.clear()
  } catch {
    // Storage can be unavailable in private browsing or hardened browsers.
  }
}

const DeactivationEnforcer = ({ children }) => {
  const { data: session } = useSession()
  const handlingDeactivation = useRef(false)

  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      if (response.status === 401 && !handlingDeactivation.current) {
        try {
          const body = await response.clone().json()
          let deactivated = body?.code === USER_DEACTIVATED_CODE

          if (!deactivated) {
            const sessionResponse = await originalFetch('/api/auth/session', { cache: 'no-store' })
            const currentSession = sessionResponse.ok ? await sessionResponse.json() : null

            deactivated = currentSession?.error === USER_DEACTIVATED_CODE
          }

          if (deactivated) {
            handlingDeactivation.current = true
            clearClientStorage()
            await signOut({ redirect: false }).catch(() => undefined)
            window.location.replace(getLoginUrl())
          }
        } catch {
          // Non-JSON 401 responses are handled by their original callers.
        }
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  useEffect(() => {
    if (session?.error !== USER_DEACTIVATED_CODE || handlingDeactivation.current) return

    handlingDeactivation.current = true
    clearClientStorage()

    signOut({ redirect: false })
      .catch(() => undefined)
      .finally(() => window.location.replace(getLoginUrl()))
  }, [session])

  return children
}

export const NextAuthProvider = ({ children, ...rest }) => {
  return (
    <SessionProvider refetchInterval={15} refetchOnWindowFocus {...rest}>
      <DeactivationEnforcer>{children}</DeactivationEnforcer>
    </SessionProvider>
  )
}
