import { notFound } from 'next/navigation'

import { getFinanceExpenseDetail } from '@/actions/financeExpense'
import { getCompanySetupRecord } from '@/libs/companySetup'
import FinanceExpensePrint from '@/views/finance/expense/FinanceExpensePrint'

const FinanceExpensePrintPage = async props => {
  const { id, lang } = await props.params

  const [result, setup] = await Promise.all([
    getFinanceExpenseDetail(id, { locale: lang }),
    getCompanySetupRecord()
  ])

  if (!result.success) notFound()

  return <FinanceExpensePrint expense={result.data} setup={setup} locale={lang} />
}

export default FinanceExpensePrintPage
