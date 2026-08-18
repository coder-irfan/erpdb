import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import ContractsView from '@/views/contracts/ContractsView'

const ContractsPage = async props => {
  const { lang } = await props.params
  const [dictionary, session] = await Promise.all([getDictionary(lang), getServerSession(authOptions)])

  return (
    <ContractsView
      locale={lang}
      dictionary={dictionary.contractsMain}
      canWrite={hasAnyPermission(session, ['contracts:write'])}
      canDelete={hasAnyPermission(session, ['contracts:delete'])}
      canRunAudit={process.env.NODE_ENV !== 'production' && hasAnyPermission(session, ['contracts:write'])}
    />
  )
}

export default ContractsPage
