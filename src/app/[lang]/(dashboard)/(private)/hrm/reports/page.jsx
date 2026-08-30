import { getServerSession } from 'next-auth'

import { getContractFormOptions } from '@/actions/hrm/contracts'
import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { getBrandingSettings } from '@/libs/systemSettings'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import HrmReportsView from '@/views/hrm/reports/HrmReportsView'

const EMPTY_CONTRACT_OPTIONS = {
  staff: [],
  contractTypes: [],
  policies: [],
  statuses: [],
  clients: [],
  leads: [],
  invoices: [],
  templates: [],
  options: { CONTRACT_TYPES: [], CONTRACT_STATUS: [], CONTRACT_DURATION: [], CONTRACT_COUNTRY: [], CONTRACT_LEVEL: [] },
  setup: { currency_code: 'AFN' },
  baseCurrency: 'AFN',
  exchangeRate: '65.0000'
}

const HrmReportsPage = async props => {
  const { lang } = await props.params

  const [dictionary, setup, branding, session, contractOptions] = await Promise.all([
    getDictionary(lang),
    getCompanySetupRecord(),
    getBrandingSettings(),
    getServerSession(authOptions),
    getContractFormOptions({ locale: lang })
  ])

  return (
    <HrmReportsView
      locale={lang}
      dictionary={dictionary.hrmReports}
      contractDictionary={dictionary.contractsMain}
      setup={{ ...setup, company_logo: setup.company_logo || branding.lightLogoUrl || null }}
      generatedAt={new Date().toISOString()}
      contractFormOptions={contractOptions.success ? contractOptions.data : EMPTY_CONTRACT_OPTIONS}
      canManageContracts={hasAnyPermission(session, ['hrm:write', 'hrm_contract:write'])}
      canArchiveStaff={hasAnyPermission(session, ['hrm:write', 'hrm_staff:update'])}
    />
  )
}

export default HrmReportsPage
