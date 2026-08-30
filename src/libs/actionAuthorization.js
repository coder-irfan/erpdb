import 'server-only'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { USER_DEACTIVATED_CODE, USER_DEACTIVATED_MESSAGE } from '@/libs/authDeactivation'
import { hasAnyPermission } from '@/utils/rbac'

export const authorizeAction = async (permissionKeys = []) => {
  let session

  try {
    session = await getServerSession(authOptions)
  } catch {
    return {
      authorized: false,
      code: 'UNAUTHENTICATED',
      error: 'Authentication could not be verified.'
    }
  }

  if (!session?.user) {
    return {
      authorized: false,
      code: 'UNAUTHENTICATED',
      error: 'Authentication is required.'
    }
  }

  if (
    session.error === USER_DEACTIVATED_CODE ||
    session.user.accountStatus !== 'ACTIVE' ||
    (session.user.staffStatus && session.user.staffStatus !== 'ACTIVE')
  ) {
    return {
      authorized: false,
      code: USER_DEACTIVATED_CODE,
      error: USER_DEACTIVATED_MESSAGE
    }
  }

  if (permissionKeys.length > 0 && !hasAnyPermission(session, permissionKeys)) {
    return {
      authorized: false,
      code: 'FORBIDDEN',
      error: 'You do not have permission to perform this action.'
    }
  }

  return { authorized: true, session }
}
