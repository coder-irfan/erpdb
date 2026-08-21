import { getServerSession } from 'next-auth'

import { getFinanceExpenseDictionary } from '@/data/dictionaries/financeExpense'
import { authOptions } from '@/libs/auth'
import { hasAnyPermission } from '@/utils/rbac'
import FinanceExpenseView from '@/views/finance/expense/FinanceExpenseView'

const ExpensesPage = async props => {
  const { lang } = await props.params
  const session = await getServerSession(authOptions)

  return (
    <FinanceExpenseView
      locale={lang}
      dictionary={getFinanceExpenseDictionary(lang)}
      canWrite={hasAnyPermission(session, ['finance:write'])}
      canDelete={hasAnyPermission(session, ['finance:delete'])}
    />
  )
}

export default ExpensesPage
