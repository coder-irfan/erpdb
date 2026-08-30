import { getServerSession } from 'next-auth'

import { getOptionsListPaginated } from '@/actions/options'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import SingleCategoryOptionsView from '@/views/options/shared/SingleCategoryOptionsView'

const ContractCountriesOptionsPage = async props => {
  const { lang } = await props.params

  const [dictionary, session, result] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    getOptionsListPaginated({ category: 'COUNTRY', page: 1, limit: 200, locale: lang })
  ])

  return (
    <SingleCategoryOptionsView
      category='COUNTRY'
      initialOptions={result.success ? result.data.options : []}
      canWrite={hasAnyPermission(session, ['options:write', 'options:create', 'options:update'])}
      canDelete={hasAnyPermission(session, ['options:write', 'options:delete'])}
      locale={lang}
      dictionary={dictionary.optionsManagement.contractCountries}
      managementDictionary={dictionary.optionsManagement}
      icon='tabler-world'
    />
  )
}

export default ContractCountriesOptionsPage
