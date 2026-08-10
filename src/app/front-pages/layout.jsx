// MUI Imports
import Button from '@mui/material/Button'
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Context Imports
import { BrandingProvider } from '@/contexts/BrandingProvider'
import { IntersectionProvider } from '@/contexts/intersectionContext'

// Component Imports
import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'
import FrontLayout from '@components/layout/front-pages'
import ScrollToTop from '@core/components/scroll-to-top'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'
import { getBrandingSettings } from '@/libs/systemSettings'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

export const metadata = {
  title: 'Vuexy - MUI Next.js Admin Dashboard Template',
  description:
    'Vuexy - MUI Next.js Admin Dashboard Template - is the most developer friendly & highly customizable Admin Dashboard Template based on MUI v5.'
}

const Layout = async ({ children }) => {
  // Vars
  const [systemMode, branding] = await Promise.all([getSystemMode(), getBrandingSettings()])

  return (
    <html id='__next' suppressHydrationWarning>
      <body className='flex is-full min-bs-full flex-auto flex-col'>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        <BrandingProvider branding={branding}>
          <Providers direction='ltr'>
            <BlankLayout systemMode={systemMode}>
              <IntersectionProvider>
                <FrontLayout>
                  {children}
                  <ScrollToTop className='mui-fixed'>
                    <Button
                      variant='contained'
                      className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'
                    >
                      <i className='tabler-arrow-up' />
                    </Button>
                  </ScrollToTop>
                </FrontLayout>
              </IntersectionProvider>
            </BlankLayout>
          </Providers>
        </BrandingProvider>
      </body>
    </html>
  )
}

export default Layout
