import { getServerSession } from 'next-auth'

import { getOptionsListPaginated } from '@/actions/options'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import CrmLeadOptionsView from '@/views/options/crm/CrmLeadOptionsView'

const CrmLeadOptionsPage = async props => {
  const { lang } = await props.params

  const [dictionary, session, statuses, sources] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    getOptionsListPaginated({ category: 'LEAD_STATUS', page: 1, limit: 100, locale: lang }),
    getOptionsListPaginated({ category: 'LEAD_SOURCE', page: 1, limit: 100, locale: lang })
  ])

  return (
    <CrmLeadOptionsView
      initialData={{
        LEAD_STATUS: statuses.success ? statuses.data.options : [],
        LEAD_SOURCE: sources.success ? sources.data.options : []
      }}
      canWrite={hasAnyPermission(session, ['options:write', 'crm:write', 'crm_lead:write'])}
      canDelete={hasAnyPermission(session, ['options:write', 'options:delete'])}
      locale={lang}
      dictionary={dictionary.crmLeadOptions}
      managementDictionary={dictionary.optionsManagement}
    />
  )
}

export default CrmLeadOptionsPage
