import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import CrmLeadsView from '@/views/crm/leads/CrmLeadsView'

const CrmLeadsPage = async props => {
  const { lang } = await props.params
  const [dictionary, setup, session] = await Promise.all([getDictionary(lang), getCompanySetupRecord(), getServerSession(authOptions)])

  return <CrmLeadsView locale={lang} dictionary={dictionary.crmLeads} currencyCode={setup.currency_code || 'AFN'} canWrite={hasAnyPermission(session, ['crm:write', 'crm_lead:write'])} canDelete={hasAnyPermission(session, ['crm:delete', 'crm_lead:delete'])} />
}

export default CrmLeadsPage
