import { getServerSession } from 'next-auth'

import { getOptionsListPaginated } from '@/actions/options'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import ContractOptionsView from '@/views/options/contracts/ContractOptionsView'

const CATEGORIES = ['CONTRACT_TYPE', 'CONTRACT_DURATION', 'CONTRACT_LEVEL', 'CONTRACT_COUNTRY', 'CONTRACT_STATUS', 'INVOICE_STATUS', 'PAYMENT_METHOD']

const ContractOptionsPage = async props => {
  const { lang } = await props.params

  const [dictionary, session, ...results] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    ...CATEGORIES.map(category => getOptionsListPaginated({ category, page: 1, limit: 100, locale: lang }))
  ])

  return (
    <ContractOptionsView
      initialData={Object.fromEntries(CATEGORIES.map((category, index) => [category, results[index].success ? results[index].data.options : []]))}
      canWrite={hasAnyPermission(session, ['options:write'])}
      canDelete={hasAnyPermission(session, ['options:write', 'options:delete'])}
      locale={lang}
      dictionary={dictionary.contractOptions}
      managementDictionary={dictionary.optionsManagement}
    />
  )
}

export default ContractOptionsPage
