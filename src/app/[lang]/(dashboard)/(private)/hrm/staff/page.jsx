import { getServerSession } from 'next-auth'

import { getAvailableStaffUsers, getStaffList, getStaffStats } from '@/actions/hrm/staff'
import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import StaffListTable from '@/views/hrm/staff/StaffListTable'

const EMPTY_RESULT = { staff: [], totalCount: 0, page: 1, totalPages: 1, positions: [] }
const EMPTY_STATS = { total: 0, active: 0, inactive: 0, terminated: 0 }

const StaffPage = async props => {
  const { lang } = await props.params
  const dictionary = await getDictionary(lang)
  const session = await getServerSession(authOptions)
  const canCreate = hasAnyPermission(session, ['hrm:write', 'hrm_staff:create'])
  const canUpdate = hasAnyPermission(session, ['hrm:write', 'hrm_staff:update'])
  const requestContext = { locale: lang }

  const [listResult, statsResult, usersResult, setup] = await Promise.all([
    getStaffList(requestContext),
    getStaffStats(requestContext),
    canCreate || canUpdate ? getAvailableStaffUsers(requestContext) : Promise.resolve({ success: true, data: [] }),
    getCompanySetupRecord()
  ])

  const failedResult = [listResult, statsResult, usersResult].find(result => !result.success)

  return (
    <StaffListTable
      initialResult={listResult.success ? listResult.data : EMPTY_RESULT}
      initialStats={statsResult.success ? statsResult.data : EMPTY_STATS}
      initialUsers={usersResult.success ? usersResult.data : []}
      initialError={failedResult?.error || null}
      canCreate={canCreate}
      canUpdate={canUpdate}
      baseCurrency={setup.currency_code}
      locale={lang}
      dictionary={dictionary.hrmStaff}
      contractDictionary={dictionary.hrmContracts}
    />
  )
}

export default StaffPage
