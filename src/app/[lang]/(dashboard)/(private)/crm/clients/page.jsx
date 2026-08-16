import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import CrmClientsView from '@/views/crm/clients/CrmClientsView'

const CrmClientsPage = async props => {
  const { lang } = await props.params
  const [dictionary, setup, session] = await Promise.all([getDictionary(lang), getCompanySetupRecord(), getServerSession(authOptions)])

  return <CrmClientsView locale={lang} dictionary={dictionary.crmClients} currencyCode={setup.currency_code || 'AFN'} canWrite={hasAnyPermission(session, ['crm:write', 'crm_client:write'])} canDelete={hasAnyPermission(session, ['crm:delete', 'crm_client:delete'])} />
}

export default CrmClientsPage
