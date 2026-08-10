import { getPermissionsGroupedByModule, getRolesWithPermissions } from '@/app/actions/roleActions'
import { getAvailableStaffForInvitation, getUsersWithRoles } from '@/app/actions/userActions'
import { getDictionary } from '@/utils/getDictionary'
import RolesPermissionsView from '@/views/options/roles-permissions'

const RolesPermissionsPage = async props => {
  const { lang } = await props.params
  const dictionary = await getDictionary(lang)
  const requestContext = { locale: lang }

  const [rolesResult, permissionsResult, usersResult, staffResult] = await Promise.all([
    getRolesWithPermissions(requestContext),
    getPermissionsGroupedByModule(requestContext),
    getUsersWithRoles(requestContext),
    getAvailableStaffForInvitation(requestContext)
  ])

  const failedResult = [rolesResult, permissionsResult, usersResult, staffResult].find(result => !result.success)

  return (
    <RolesPermissionsView
      dictionary={dictionary.rolesPermissions}
      locale={lang}
      initialRoles={rolesResult.success ? rolesResult.data : []}
      permissionGroups={permissionsResult.success ? permissionsResult.data : []}
      initialUsers={usersResult.success ? usersResult.data : []}
      initialStaff={staffResult.success ? staffResult.data : []}
      initialError={failedResult?.error || null}
    />
  )
}

export default RolesPermissionsPage
