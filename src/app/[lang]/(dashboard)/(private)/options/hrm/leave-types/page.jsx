import { getServerSession } from 'next-auth'

import { getOptionsListPaginated } from '@/actions/options'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import LeaveTypeTable from '@/views/options/hrm/LeaveTypeTable'

const EMPTY_RESULT = { options: [], totalCount: 0, page: 1, totalPages: 1 }

const LeaveTypesPage = async props => {
  const { lang } = await props.params
  const dictionary = await getDictionary(lang)
  const session = await getServerSession(authOptions)
  const result = await getOptionsListPaginated({ category: 'LEAVE_TYPE', locale: lang })

  return (
    <LeaveTypeTable
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

export default LeaveTypesPage
