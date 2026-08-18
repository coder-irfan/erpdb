import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import InvoicesView from '@/views/invoices/InvoicesView'

const ContractInvoicesPage = async props => {
  const { lang } = await props.params
  const [dictionary, setup, session] = await Promise.all([getDictionary(lang), getCompanySetupRecord(), getServerSession(authOptions)])

  return (
    <InvoicesView
      locale={lang}
      dictionary={dictionary.contractInvoices}
      setup={setup}
      canWrite={hasAnyPermission(session, ['contracts:write', 'finance:write'])}
      canDelete={hasAnyPermission(session, ['contracts:delete', 'finance:delete'])}
    />
  )
}

export default ContractInvoicesPage
