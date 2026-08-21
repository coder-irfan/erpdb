import { getCompanySetupRecord } from '@/libs/companySetup'
import { getDictionary } from '@/utils/getDictionary'
import FinanceReportsView from '@/views/finance/reports/FinanceReportsView'

const FinanceReportsPage = async props => {
  const { lang } = await props.params
  const [dictionary, setup] = await Promise.all([getDictionary(lang), getCompanySetupRecord()])

  return (
    <FinanceReportsView
      locale={lang}
      dictionary={dictionary.financeReports}
      setup={setup}
      generatedAt={new Date().toISOString()}
    />
  )
}

export default FinanceReportsPage
