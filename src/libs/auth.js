// Third-party Imports
import CredentialProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { encode as encodeJwt } from 'next-auth/jwt'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcrypt'

// Lib Imports
import { prisma } from '@/libs/prisma'

export const STANDARD_SESSION_MAX_AGE = 2 * 24 * 60 * 60
export const REMEMBERED_SESSION_MAX_AGE = 7 * 24 * 60 * 60

const getUserAccess = userId =>
  prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      locale: true,
      account_status: true,
      last_login_at: true,
      roles: {
        where: { is_active: true },
        select: {
          name: true,
          role_permissions: {
            select: {
              permission: {
                select: { key: true }
              }
            }
          }
        }
      }
    }
  })

const getAccessClaims = user => ({
  roles: user.roles.map(role => role.name),
  permissions: [
    ...new Set(user.roles.flatMap(role => role.role_permissions.map(rolePermission => rolePermission.permission.key)))
  ]
})

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,

  // ** Configure one or more authentication providers
  // ** Please refer to https://next-auth.js.org/configuration/options#providers for more `providers` options
  providers: [
    CredentialProvider({
      // ** The name to display on the sign in form (e.g. 'Sign in with...')
      // ** For more details on Credentials Provider, visit https://next-auth.js.org/providers/credentials
      name: 'Credentials',
      type: 'credentials',

      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'checkbox' }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password
        const rememberMe = credentials?.rememberMe === 'true'

        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            password_hash: true,
            account_status: true
          }
        })

        if (!user?.password_hash || user.account_status !== 'ACTIVE') return null

        const passwordMatches = await bcrypt.compare(password, user.password_hash)

        if (!passwordMatches) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          rememberMe
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })

    // ** ...add more providers here
  ],

  // ** Please refer to https://next-auth.js.org/configuration/options#session for more `session` options
  session: {
    /*
     * Choose how you want to save the user session.
     * The default is `jwt`, an encrypted JWT (JWE) stored in the session cookie.
     * If you use an `adapter` however, NextAuth default it to `database` instead.
     * You can still force a JWT session by explicitly defining `jwt`.
     * When using `database`, the session cookie will only contain a `sessionToken` value,
     * which is used to look up the session in the database.
     * If you use a custom credentials provider, user accounts will not be persisted in a database by NextAuth.js (even if one is configured).
     * The option to use JSON Web Tokens for session tokens must be enabled to use a custom credentials provider.
     */
    strategy: 'jwt',

    // ** Seconds - How long until an idle session expires and is no longer valid
    maxAge: REMEMBERED_SESSION_MAX_AGE
  },

  jwt: {
    encode: params =>
      encodeJwt({
        ...params,
        maxAge: params.token?.rememberMe ? REMEMBERED_SESSION_MAX_AGE : STANDARD_SESSION_MAX_AGE
      })
  },

  // ** Please refer to https://next-auth.js.org/configuration/options#pages for more `pages` options
  pages: {
    signIn: '/login'
  },

  // ** Please refer to https://next-auth.js.org/configuration/options#callbacks for more `callbacks` options
  callbacks: {
    /*
     * While using `jwt` as a strategy, `jwt()` callback will be called before
     * the `session()` callback. So we have to add custom parameters in `token`
     * via `jwt()` callback to make them accessible in the `session()` callback
     */
    async jwt({ token, user }) {
      const userId = user?.id || token.sub

      if (user) {
        token.rememberMe = user.rememberMe === true
      }

      if (!userId) return token

      const accessUser = await getUserAccess(userId)

      if (!accessUser) {
        token.accountStatus = 'INACTIVE'
        token.roles = []
        token.permissions = []

        return token
      }

      const accessClaims =
        accessUser.account_status === 'ACTIVE' ? getAccessClaims(accessUser) : { roles: [], permissions: [] }

      if (user && accessUser.account_status === 'ACTIVE') {
        const currentSessionStartedAt = new Date()

        // Keep the old value in the new session before replacing it. This lets
        // the profile show the current session separately from the prior login.
        token.previousLoginAt = accessUser.last_login_at?.toISOString() ?? null
        token.currentSessionStartedAt = currentSessionStartedAt.toISOString()

        await prisma.user.update({
          where: { id: accessUser.id },
          data: { last_login_at: currentSessionStartedAt }
        })
      }

      token.id = accessUser.id
      token.name = accessUser.name
      token.email = accessUser.email
      token.picture = accessUser.image
      token.locale = accessUser.locale
      token.accountStatus = accessUser.account_status
      token.roles = accessClaims.roles
      token.permissions = accessClaims.permissions

      return token
    },
    async session({ session, token }) {
      const sessionMaxAge = token.rememberMe ? REMEMBERED_SESSION_MAX_AGE : STANDARD_SESSION_MAX_AGE

      session.expires = new Date(Date.now() + sessionMaxAge * 1000).toISOString()

      if (session.user) {
        session.user.id = token.id || token.sub
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
        session.user.locale = token.locale
        session.user.accountStatus = token.accountStatus
        session.user.roles = token.roles || []
        session.user.permissions = token.permissions || []
        session.user.rememberMe = token.rememberMe === true
        session.user.currentSessionStartedAt = token.currentSessionStartedAt || null
        session.user.previousLoginAt = token.previousLoginAt || null
      }

      return session
    }
  }
}
