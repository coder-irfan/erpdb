import 'server-only'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
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

  if (!session?.user || session.user.accountStatus !== 'ACTIVE') {
    return {
      authorized: false,
      code: 'UNAUTHENTICATED',
      error: 'Authentication is required.'
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
