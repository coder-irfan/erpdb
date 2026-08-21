import { getServerSession } from 'next-auth'

import { getFinanceSalaryDictionary } from '@/data/dictionaries/financeSalary'
import { authOptions } from '@/libs/auth'
import { hasAnyPermission } from '@/utils/rbac'
import FinanceSalaryView from '@/views/finance/salary/FinanceSalaryView'

const SalaryPage = async props => {
  const { lang } = await props.params
  const session = await getServerSession(authOptions)

  return (
    <FinanceSalaryView
      locale={lang}
      dictionary={getFinanceSalaryDictionary(lang)}
      canWrite={hasAnyPermission(session, ['finance:write', 'finance_salary:write'])}
      canDelete={hasAnyPermission(session, ['finance:delete', 'finance_salary:delete'])}
    />
  )
}

export default SalaryPage
