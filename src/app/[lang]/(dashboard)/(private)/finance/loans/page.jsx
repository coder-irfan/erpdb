import { getServerSession } from 'next-auth'

import { getFinanceLoanDictionary } from '@/data/dictionaries/financeLoan'
import { authOptions } from '@/libs/auth'
import { hasAnyPermission } from '@/utils/rbac'
import FinanceLoansView from '@/views/finance/loans/FinanceLoansView'

const LoansPage = async props => {
  const { lang } = await props.params
  const session = await getServerSession(authOptions)

  return <FinanceLoansView locale={lang} dictionary={getFinanceLoanDictionary(lang)} canWrite={hasAnyPermission(session, ['finance:write', 'finance_loan:write'])} />
}

export default LoansPage
