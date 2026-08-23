import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { getBrandingSettings } from '@/libs/systemSettings'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import ContractsView from '@/views/contracts/ContractsView'

const ContractsPage = async props => {
  const { lang } = await props.params
  const [dictionary, session, setup, branding] = await Promise.all([getDictionary(lang), getServerSession(authOptions), getCompanySetupRecord(), getBrandingSettings()])

  return (
    <ContractsView
      locale={lang}
      dictionary={dictionary.contractsMain}
      setup={{ ...setup, company_logo: setup.company_logo || branding.lightLogoUrl || null }}
      canWrite={hasAnyPermission(session, ['contracts:write'])}
      canDelete={hasAnyPermission(session, ['contracts:delete'])}
      canRunAudit={process.env.NODE_ENV !== 'production' && hasAnyPermission(session, ['contracts:write'])}
    />
  )
}

export default ContractsPage
