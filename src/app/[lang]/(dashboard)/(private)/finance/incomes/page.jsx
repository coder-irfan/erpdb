import { getServerSession } from 'next-auth'

import { getFinanceIncomeDictionary } from '@/data/dictionaries/financeIncome'
import { authOptions } from '@/libs/auth'
import { hasAnyPermission } from '@/utils/rbac'
import FinanceIncomeView from '@/views/finance/income/FinanceIncomeView'

const IncomesPage = async props => {
  const { lang } = await props.params
  const session = await getServerSession(authOptions)

  return (
    <FinanceIncomeView
      locale={lang}
      dictionary={getFinanceIncomeDictionary(lang)}
      canWrite={hasAnyPermission(session, ['finance:write'])}
      canDelete={hasAnyPermission(session, ['finance:delete'])}
    />
  )
}

export default IncomesPage
