import { getServerSession } from 'next-auth'

import { getContractFormOptions, getStaffContracts } from '@/actions/hrm/contracts'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import StaffContractsView from '@/views/hrm/contracts/StaffContractsView'

const EMPTY_RESULT = { contracts: [], totalCount: 0, page: 1, totalPages: 1 }
const EMPTY_OPTIONS = { staff: [], policies: [], statuses: [], setup: { currency_code: 'AFN' } }

const StaffContractsPage = async props => {
  const { lang } = await props.params

  const [dictionary, session, contractsResult, optionsResult] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    getStaffContracts({ locale: lang }),
    getContractFormOptions({ locale: lang })
  ])

  return (
    <StaffContractsView
      initialResult={contractsResult.success ? contractsResult.data : EMPTY_RESULT}
      initialError={contractsResult.success ? null : contractsResult.error}
      formOptions={optionsResult.success ? optionsResult.data : EMPTY_OPTIONS}
      canWrite={hasAnyPermission(session, ['hrm:write', 'hrm_contract:write'])}
      locale={lang}
      dictionary={dictionary.hrmContracts}
    />
  )
}

export default StaffContractsPage
