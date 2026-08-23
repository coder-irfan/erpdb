import { getServerSession } from 'next-auth'

import { getOptionsListPaginated } from '@/actions/options'
import { CONTRACT_TYPE_DOMAINS } from '@/data/contractTypes'
import { authOptions } from '@/libs/auth'
import { getContractTypeOptions } from '@/libs/contractTypes'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import ContractOptionsView from '@/views/options/contracts/ContractOptionsView'

const SECTIONS = [
  { category: CONTRACT_TYPE_DOMAINS.HRM, key: 'hrmTypes', icon: 'tabler-users' },
  { category: CONTRACT_TYPE_DOMAINS.CUSTOMER, key: 'customerTypes', icon: 'tabler-user-dollar' },
  { category: CONTRACT_TYPE_DOMAINS.FINANCE, key: 'financeTypes', icon: 'tabler-receipt-dollar' },
  { category: CONTRACT_TYPE_DOMAINS.OTHERS, key: 'otherTypes', icon: 'tabler-building-store' }
]

const ContractTypesPage = async props => {
  const { lang } = await props.params

  await getContractTypeOptions()

  const [dictionary, session, ...results] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    ...SECTIONS.map(section =>
      getOptionsListPaginated({ category: section.category, page: 1, limit: 100, locale: lang })
    )
  ])

  return (
    <ContractOptionsView
      initialData={Object.fromEntries(
        SECTIONS.map((section, index) => [section.category, results[index].success ? results[index].data.options : []])
      )}
      canWrite={hasAnyPermission(session, ['options:write'])}
      canDelete={hasAnyPermission(session, ['options:write', 'options:delete'])}
      locale={lang}
      dictionary={dictionary.contractOptions}
      managementDictionary={dictionary.optionsManagement}
      sections={SECTIONS}
    />
  )
}

export default ContractTypesPage
