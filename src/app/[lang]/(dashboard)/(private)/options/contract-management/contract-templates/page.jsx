import { getServerSession } from 'next-auth'

import { getOptionsListPaginated } from '@/actions/options'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import ContractPolicyTable from '@/views/options/contracts/ContractPolicyTable'

const EMPTY_RESULT = { options: [], totalCount: 0, page: 1, totalPages: 1 }

const ContractTemplatesPage = async props => {
  const { lang } = await props.params

  const [dictionary, session, result] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    getOptionsListPaginated({ category: 'CONTRACT_POLICY', locale: lang })
  ])

  return (
    <ContractPolicyTable
      initialResult={result.success ? result.data : EMPTY_RESULT}
      initialError={result.success ? null : result.error}
      canCreate={hasAnyPermission(session, ['options:write', 'options:create'])}
      canUpdate={hasAnyPermission(session, ['options:write', 'options:update'])}
      canDelete={hasAnyPermission(session, ['options:write', 'options:delete'])}
      locale={lang}
      dictionary={dictionary.optionsManagement}
    />
  )
}

export default ContractTemplatesPage
