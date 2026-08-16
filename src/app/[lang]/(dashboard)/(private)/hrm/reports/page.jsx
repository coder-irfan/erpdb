import { getCompanySetupRecord } from '@/libs/companySetup'
import { getDictionary } from '@/utils/getDictionary'
import HrmReportsView from '@/views/hrm/reports/HrmReportsView'

const HrmReportsPage = async props => {
  const { lang } = await props.params
  const [dictionary, setup] = await Promise.all([getDictionary(lang), getCompanySetupRecord()])

  return <HrmReportsView locale={lang} dictionary={dictionary.hrmReports} setup={setup} generatedAt={new Date().toISOString()} />
}

export default HrmReportsPage
