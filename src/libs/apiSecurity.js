import 'server-only'

import { authorizeAction } from '@/libs/actionAuthorization'

export const requireAuthenticatedApi = async () => {
  const authorization = await authorizeAction([])

  if (authorization.authorized) return { authorized: true, session: authorization.session }

  return {
    authorized: false,
    response: Response.json(
      { success: false, error: authorization.error, code: authorization.code },
      { status: authorization.code === 'FORBIDDEN' ? 403 : 401 }
    )
  }
}
