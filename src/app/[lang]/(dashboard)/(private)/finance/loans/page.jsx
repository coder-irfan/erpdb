import { getServerSession } from 'next-auth'

import { getFinanceLoanDictionary } from '@/data/dictionaries/financeLoan'
import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { serializeData } from '@/libs/serialize'
import { hasAdministrativeRole, hasAnyPermission } from '@/utils/rbac'
import FinanceLoansView from '@/views/finance/loans/FinanceLoansView'

const LoansPage = async props => {
  const { lang } = await props.params
  const [session, setup] = await Promise.all([getServerSession(authOptions), getCompanySetupRecord()])

  return (
    <FinanceLoansView
      locale={lang}
      dictionary={getFinanceLoanDictionary(lang)}
      canWrite={hasAnyPermission(session, ['finance:write', 'finance_loan:write'])}
      canManageStatus={hasAdministrativeRole(session)}
      setup={serializeData(setup)}
    />
  )
}

export default LoansPage
