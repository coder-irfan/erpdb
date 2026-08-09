// MUI Imports
import Button from '@mui/material/Button'

// Layout Imports
import LayoutWrapper from '@layouts/LayoutWrapper'
import HorizontalLayout from '@layouts/HorizontalLayout'

// Component Imports
import Providers from '@components/Providers'
import Header from '@components/layout/horizontal/Header'
import HorizontalFooter from '@components/layout/horizontal/Footer'
import ScrollToTop from '@core/components/scroll-to-top'

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

  return (
    <Providers direction={direction}>
      <LayoutWrapper systemMode={systemMode}>
        <HorizontalLayout header={<Header dictionary={dictionary} />} footer={<HorizontalFooter />}>
          {children}
        </HorizontalLayout>
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
