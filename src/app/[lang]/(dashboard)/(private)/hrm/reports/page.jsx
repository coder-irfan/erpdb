import { getCompanySetupRecord } from '@/libs/companySetup'
import { getBrandingSettings } from '@/libs/systemSettings'
import { getDictionary } from '@/utils/getDictionary'
import HrmReportsView from '@/views/hrm/reports/HrmReportsView'

const HrmReportsPage = async props => {
  const { lang } = await props.params
  const [dictionary, setup, branding] = await Promise.all([getDictionary(lang), getCompanySetupRecord(), getBrandingSettings()])

  return <HrmReportsView locale={lang} dictionary={dictionary.hrmReports} setup={{ ...setup, company_logo: setup.company_logo || branding.lightLogoUrl || null }} generatedAt={new Date().toISOString()} />
}

export default HrmReportsPage
