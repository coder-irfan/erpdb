import { getServerSession } from 'next-auth'

import { getOptionsListPaginated } from '@/actions/options'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import PositionTable from '@/views/options/hrm/PositionTable'

const EMPTY_RESULT = { options: [], totalCount: 0, page: 1, totalPages: 1 }

const StaffPositionsPage = async props => {
  const { lang } = await props.params
  const dictionary = await getDictionary(lang)
  const session = await getServerSession(authOptions)
  const result = await getOptionsListPaginated({ category: 'STAFF_POSITION', locale: lang })

  return (
    <PositionTable
      initialResult={result.success ? result.data : EMPTY_RESULT}
      initialError={result.success ? null : result.error}
      canCreate={hasAnyPermission(session, ['options:write', 'options:create'])}
      canUpdate={hasAnyPermission(session, ['options:write', 'options:update'])}
      canDelete={hasAnyPermission(session, ['options:write', 'options:delete'])}
      locale={lang}
      dictionary={dictionary.optionsManagement}
    />
  )
}

export default StaffPositionsPage
