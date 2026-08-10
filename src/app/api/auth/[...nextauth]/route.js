// Third-party Imports
import NextAuth from 'next-auth'
import { getToken } from 'next-auth/jwt'

// Lib Imports
import { authOptions, REMEMBERED_SESSION_MAX_AGE, STANDARD_SESSION_MAX_AGE } from '@/libs/auth'

/*
 * As we do not have backend server, the refresh token feature has not been incorporated into the template.
 * Please refer https://next-auth.js.org/tutorials/refresh-token-rotation link for a reference.
 */
const nextAuthHandler = NextAuth(authOptions)

const isSessionCookie = setCookieHeader =>
  /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token(?:\.\d+)?=/i.test(setCookieHeader)

const setCookieLifetime = (setCookieHeader, maxAge) => {
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString()
  const cookieWithoutLifetime = setCookieHeader.replace(/;\s*Expires=[^;]*/gi, '').replace(/;\s*Max-Age=[^;]*/gi, '')

  return `${cookieWithoutLifetime}; Expires=${expires}; Max-Age=${maxAge}`
}

const applySessionCookieLifetime = (response, maxAge) => {
  const setCookieHeaders = response.headers.getSetCookie?.() || []

  if (setCookieHeaders.length === 0) return response

  const headers = new Headers(response.headers)

  headers.delete('set-cookie')

  for (const setCookieHeader of setCookieHeaders) {
    headers.append(
      'set-cookie',
      isSessionCookie(setCookieHeader) ? setCookieLifetime(setCookieHeader, maxAge) : setCookieHeader
    )
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

const handler = async (request, context) => {
  const isSessionRequest = request.nextUrl.pathname.endsWith('/api/auth/session')

  const token = isSessionRequest
    ? await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
    : null

  const response = await nextAuthHandler(request, context)

  if (!token) return response

  const maxAge = token.rememberMe ? REMEMBERED_SESSION_MAX_AGE : STANDARD_SESSION_MAX_AGE

  return applySessionCookieLifetime(response, maxAge)
}

export { handler as GET, handler as POST }
