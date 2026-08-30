import { getServerSession } from 'next-auth'

import { getFinanceExpenseDictionary } from '@/data/dictionaries/financeExpense'
import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { hasAnyPermission } from '@/utils/rbac'
import FinanceExpenseView from '@/views/finance/expense/FinanceExpenseView'

const ExpensesPage = async props => {
  const { lang } = await props.params
  const [session, setup] = await Promise.all([getServerSession(authOptions), getCompanySetupRecord()])

  return (
    <FinanceExpenseView
      locale={lang}
      dictionary={getFinanceExpenseDictionary(lang)}
      canWrite={hasAnyPermission(session, ['finance:write'])}
      canDelete={hasAnyPermission(session, ['finance:delete'])}
      canApprove={hasAnyPermission(session, ['finance_expense:approve'])}
      canPay={hasAnyPermission(session, ['finance_expense:pay'])}
      setup={setup}
    />
  )
}

export default ExpensesPage
