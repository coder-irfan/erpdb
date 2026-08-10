import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'

import { peyda, publicSans, vazirmatn } from '@assets/fonts/fonts'
import { i18n } from '@configs/i18n'
import { getSystemMode } from '@core/utils/serverHelpers'

const InvitationAuthLayout = async props => {
  const params = await props.params
  const { children } = props
  const lang = i18n.locales.includes(params.lang) ? params.lang : i18n.defaultLocale
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

export default InvitationAuthLayout
