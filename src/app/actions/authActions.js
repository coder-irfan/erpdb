'use server'

import { randomBytes } from 'node:crypto'

import { cookies, headers } from 'next/headers'

import bcrypt from 'bcrypt'
import { safeParse } from 'valibot'

import { prisma } from '@/libs/prisma'
import { sendPasswordResetEmail } from '@/libs/mailer'
import { REMEMBERED_SESSION_MAX_AGE, STANDARD_SESSION_MAX_AGE } from '@/libs/auth'
import { i18n } from '@/configs/i18n'
import { getDictionary } from '@/utils/getDictionary'
import {
  createForgotPasswordSchema,
  createLoginSchema,
  createResetPasswordSchema
} from '@/utils/validation/authSchemas'

const PASSWORD_RESET_EXPIRATION_MS = 60 * 60 * 1000

const getFormValues = (formData, fields) =>
  Object.fromEntries(fields.map(field => [field, formData?.get ? formData.get(field) : formData?.[field]]))

const getValidationMessage = (result, fallback) => result.issues?.[0]?.message || fallback

const getBooleanValue = value => value === true || value === 'true' || value === 'on' || value === '1'

const getLocalizedAuth = async formData => {
  const submittedLocale = formData?.get ? formData.get('locale') : formData?.locale
  const locale = i18n.locales.includes(submittedLocale) ? submittedLocale : i18n.defaultLocale
  const dictionary = await getDictionary(locale)

  return { locale, translations: dictionary.auth }
}

const getApplicationUrl = async () => {
  if (process.env.NEXTAUTH_URL) {
    return new URL(process.env.NEXTAUTH_URL).origin
  }

  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host')
  const protocol = requestHeaders.get('x-forwarded-proto') || 'http'

  if (!host) throw new Error('Unable to determine the application URL.')

  return `${protocol}://${host}`
}

const getSetCookieHeaders = response => {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie()
  }

  const setCookie = response.headers.get('set-cookie')

  return setCookie ? [setCookie] : []
}

const getCookiePair = setCookieHeader => setCookieHeader.split(';', 1)[0]

const parseResponseCookie = setCookieHeader => {
  const [nameValue, ...attributes] = setCookieHeader.split(';').map(part => part.trim())
  const separatorIndex = nameValue.indexOf('=')
  const name = nameValue.slice(0, separatorIndex)
  const encodedValue = nameValue.slice(separatorIndex + 1)
  const options = {}

  for (const attribute of attributes) {
    const [attributeName, ...attributeValueParts] = attribute.split('=')
    const attributeValue = attributeValueParts.join('=')

    switch (attributeName.toLowerCase()) {
      case 'domain':
        options.domain = attributeValue
        break
      case 'expires':
        options.expires = new Date(attributeValue)
        break
      case 'httponly':
        options.httpOnly = true
        break
      case 'max-age':
        options.maxAge = Number(attributeValue)
        break
      case 'path':
        options.path = attributeValue
        break
      case 'samesite':
        options.sameSite = attributeValue.toLowerCase()
        break
      case 'secure':
        options.secure = true
        break
      default:
        break
    }
  }

  let value = encodedValue

  try {
    value = decodeURIComponent(encodedValue)
  } catch {
    // Keep the original cookie value when it is not URI encoded.
  }

  return { name, value, options }
}

// NextAuth v4 does not expose a server-side signIn helper. This performs the
// equivalent credentials callback and forwards the resulting session cookies.
const signIn = async (provider, options) => {
  if (provider !== 'credentials') throw new Error('Unsupported authentication provider.')

  const applicationUrl = await getApplicationUrl()
  const cookieStore = await cookies()

  const requestCookieHeader = cookieStore
    .getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ')

  const csrfResponse = await fetch(`${applicationUrl}/api/auth/csrf`, {
    headers: requestCookieHeader ? { cookie: requestCookieHeader } : undefined,
    cache: 'no-store'
  })

  if (!csrfResponse.ok) throw new Error('Unable to initialize authentication.')

  const { csrfToken } = await csrfResponse.json()
  const csrfCookies = getSetCookieHeaders(csrfResponse)
  const callbackCookieHeader = [requestCookieHeader, ...csrfCookies.map(getCookiePair)].filter(Boolean).join('; ')

  const callbackResponse = await fetch(`${applicationUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      cookie: callbackCookieHeader
    },
    body: new URLSearchParams({
      email: options.email,
      password: options.password,
      rememberMe: String(options.rememberMe === true),
      csrfToken,
      callbackUrl: options.callbackUrl || applicationUrl,
      json: 'true'
    }),
    cache: 'no-store',
    redirect: 'manual'
  })

  const responseBody = await callbackResponse.json()
  const redirectUrl = new URL(responseBody.url, applicationUrl)
  const error = redirectUrl.searchParams.get('error')

  if (!callbackResponse.ok || error) {
    return { ok: false, error: error || 'CredentialsSignin' }
  }

  for (const setCookieHeader of getSetCookieHeaders(callbackResponse)) {
    const responseCookie = parseResponseCookie(setCookieHeader)

    if (responseCookie.name.endsWith('session-token')) {
      const sessionMaxAge = options.rememberMe ? REMEMBERED_SESSION_MAX_AGE : STANDARD_SESSION_MAX_AGE

      responseCookie.options.maxAge = sessionMaxAge
      responseCookie.options.expires = new Date(Date.now() + sessionMaxAge * 1000)
    }

    cookieStore.set(responseCookie.name, responseCookie.value, responseCookie.options)
  }

  return { ok: true, error: null }
}

export const loginAction = async formData => {
  const { translations } = await getLocalizedAuth(formData)
  const values = getFormValues(formData, ['email', 'password', 'rememberMe'])

  values.rememberMe = getBooleanValue(values.rememberMe)

  const validation = safeParse(createLoginSchema(translations.validation), values)

  if (!validation.success) {
    return { success: false, message: getValidationMessage(validation, translations.validation.invalidSubmission) }
  }

  try {
    const result = await signIn('credentials', {
      email: validation.output.email,
      password: validation.output.password,
      rememberMe: validation.output.rememberMe,
      redirect: false
    })

    if (!result.ok) {
      return { success: false, message: translations.messages.invalidCredentials }
    }

    return { success: true, message: translations.messages.signInSuccess }
  } catch {
    return { success: false, message: translations.messages.signInUnavailable }
  }
}

export const forgotPasswordAction = async formData => {
  const { locale, translations } = await getLocalizedAuth(formData)
  const validation = safeParse(createForgotPasswordSchema(translations.validation), getFormValues(formData, ['email']))

  if (!validation.success) {
    return { success: false, message: getValidationMessage(validation, translations.validation.invalidSubmission) }
  }

  const email = validation.output.email

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    })

    if (!user?.email) {
      return { success: true, message: translations.messages.resetRequestSuccess }
    }

    const resetToken = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MS)

    await prisma.$transaction([
      prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
      prisma.verificationToken.create({
        data: {
          identifier: user.email,
          token: resetToken,
          expires
        }
      }),
      prisma.auditLog.create({
        data: {
          user_id: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          module: 'AUTH',
          details: { email: user.email }
        }
      })
    ])

    try {
      await sendPasswordResetEmail(user.email, resetToken, locale)
    } catch {
      await prisma.verificationToken.deleteMany({ where: { token: resetToken } }).catch(() => undefined)
    }

    return { success: true, message: translations.messages.resetRequestSuccess }
  } catch {
    return { success: true, message: translations.messages.resetRequestSuccess }
  }
}

export const resetPasswordAction = async formData => {
  const { translations } = await getLocalizedAuth(formData)

  const validation = safeParse(
    createResetPasswordSchema(translations.validation),
    getFormValues(formData, ['token', 'password', 'confirmPassword'])
  )

  if (!validation.success) {
    return { success: false, message: getValidationMessage(validation, translations.validation.invalidSubmission) }
  }

  const { token, password } = validation.output
  const now = new Date()

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    })

    if (!verificationToken || verificationToken.expires <= now) {
      if (verificationToken) {
        await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined)
      }

      return { success: false, message: translations.messages.invalidResetToken }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const passwordWasReset = await prisma.$transaction(async transaction => {
      const consumedToken = await transaction.verificationToken.deleteMany({
        where: {
          token,
          identifier: verificationToken.identifier,
          expires: { gt: now }
        }
      })

      if (consumedToken.count !== 1) return false

      const user = await transaction.user.findUnique({
        where: { email: verificationToken.identifier },
        select: { id: true }
      })

      if (!user) return false

      await transaction.user.update({
        where: { id: user.id },
        data: { password_hash: passwordHash }
      })

      await transaction.verificationToken.deleteMany({
        where: { identifier: verificationToken.identifier }
      })

      await transaction.auditLog.create({
        data: {
          user_id: user.id,
          action: 'PASSWORD_RESET_COMPLETED',
          module: 'AUTH'
        }
      })

      return true
    })

    if (!passwordWasReset) {
      return { success: false, message: translations.messages.invalidResetToken }
    }

    return { success: true, message: translations.messages.resetSuccess }
  } catch {
    return { success: false, message: translations.messages.resetUnavailable }
  }
}
