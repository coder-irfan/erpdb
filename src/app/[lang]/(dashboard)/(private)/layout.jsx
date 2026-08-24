import { cookies } from 'next/headers'

// MUI Imports
import Button from '@mui/material/Button'

// Layout Imports
import LayoutWrapper from '@layouts/LayoutWrapper'

// Component Imports
import Providers from '@components/Providers'
import DashboardLayout from '@components/layout/DashboardLayout'
import ScrollToTop from '@core/components/scroll-to-top'
import Breadcrumbs from '@/components/Breadcrumbs'

// Config Imports
import { i18n } from '@configs/i18n'

// Util Imports
import { getDictionary } from '@/utils/getDictionary'
import { getSystemMode } from '@core/utils/serverHelpers'

const Layout = async props => {
  const params = await props.params
  const { children } = props

  // Type guard to ensure lang is a valid Locale
  const lang = i18n.locales.includes(params.lang) ? params.lang : i18n.defaultLocale

  // Vars
  const direction = i18n.langDirection[lang]
  const dictionary = await getDictionary(lang)
  const systemMode = await getSystemMode()
  const cookieStore = await cookies()
  const savedLayout = cookieStore.get('dashboard-layout')?.value
  const initialLayout = savedLayout === 'topbar' ? 'topbar' : 'sidebar'
  const initialCollapsed = cookieStore.get('dashboard-sidebar-collapsed')?.value === 'true'

  return (
    <Providers direction={direction}>
      <LayoutWrapper systemMode={systemMode}>
        <DashboardLayout
          dictionary={dictionary}
          initialLayout={initialLayout}
          initialCollapsed={initialCollapsed}
        >
          <Breadcrumbs />
          {children}
        </DashboardLayout>
      </LayoutWrapper>
      <ScrollToTop className='mui-fixed'>
        <Button variant='contained' className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'>
          <i className='tabler-arrow-up' />
        </Button>
      </ScrollToTop>
    </Providers>
  )
}

export default Layout
