import { getCompanySetupRecord } from '@/libs/companySetup'
import { getDictionary } from '@/utils/getDictionary'
import PayrollView from '@/views/hrm/payroll/PayrollView'

const PayrollPage = async props => {
  const { lang } = await props.params
  const now = new Date()
  const [dictionary, setup] = await Promise.all([getDictionary(lang), getCompanySetupRecord()])

  return <PayrollView initialMonth={now.getUTCMonth() + 1} initialYear={now.getUTCFullYear()} setup={setup} locale={lang} dictionary={dictionary.hrmPayroll} />
}

export default PayrollPage
