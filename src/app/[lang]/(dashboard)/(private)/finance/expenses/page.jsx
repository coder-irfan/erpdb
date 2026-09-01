import { getServerSession } from 'next-auth'

import { getFinanceExpenseDictionary } from '@/data/dictionaries/financeExpense'
import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { serializeData } from '@/libs/serialize'
import { hasAdministrativeRole, hasAnyPermission } from '@/utils/rbac'
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
      canApprove={
        hasAdministrativeRole(session) ||
        hasAnyPermission(session, ['finance_expense:approve', 'setup:manage', 'settings:manage', 'settings_roles:manage'])
      }
      canPay={hasAnyPermission(session, ['finance_expense:pay'])}
      setup={serializeData(setup)}
    />
  )
}

export default ExpensesPage
