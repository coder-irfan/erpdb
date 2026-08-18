import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import CrmVisitorsView from '@/views/crm/visitors/CrmVisitorsView'

const CrmVisitorsPage = async props => {
  const { lang } = await props.params
  const [dictionary, session] = await Promise.all([getDictionary(lang), getServerSession(authOptions)])

  return (
    <CrmVisitorsView
      locale={lang}
      dictionary={dictionary.crmVisitors}
      canWrite={hasAnyPermission(session, ['crm:write', 'crm_visitor:write'])}
      canDelete={hasAnyPermission(session, ['crm:delete', 'crm_visitor:delete'])}
    />
  )
}

export default CrmVisitorsPage
