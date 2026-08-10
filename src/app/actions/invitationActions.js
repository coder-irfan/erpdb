'use server'

import { createHash } from 'node:crypto'

import bcrypt from 'bcrypt'
import { safeParse } from 'valibot'

import { i18n } from '@/configs/i18n'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'
import { createAcceptInvitationSchema, createInvitationTokenSchema } from '@/utils/validation/authSchemas'

const INVITATION_IDENTIFIER_PREFIX = 'invite:'

const getLocalizedInvitation = async payload => {
  const locale = i18n.locales.includes(payload?.locale) ? payload.locale : i18n.defaultLocale
  const dictionary = await getDictionary(locale)

  return { locale, translations: dictionary.auth.acceptInvite }
}

const hashInvitationToken = token => createHash('sha256').update(token).digest('hex')

const getInvitationUserId = identifier =>
  identifier.startsWith(INVITATION_IDENTIFIER_PREFIX)
    ? identifier.slice(INVITATION_IDENTIFIER_PREFIX.length)
    : null

const findInvitation = token =>
  prisma.verificationToken.findUnique({
    where: { token: hashInvitationToken(token) }
  })

const invalidInvitation = translations => ({
  success: false,
  code: 'INVALID_INVITATION',
  error: translations.messages.invalidToken
})

export const getInvitationDetails = async payload => {
  const { translations } = await getLocalizedInvitation(payload)
  const validation = safeParse(createInvitationTokenSchema(translations.validation), { token: payload?.token })

  if (!validation.success) return invalidInvitation(translations)

  try {
    const invitation = await findInvitation(validation.output.token)
    const userId = invitation ? getInvitationUserId(invitation.identifier) : null

    if (!invitation || !userId || invitation.expires <= new Date()) {
      if (invitation) {
        await prisma.verificationToken.deleteMany({ where: { token: invitation.token } }).catch(() => undefined)
      }

      return invalidInvitation(translations)
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, account_status: 'PENDING_ACTIVATION' },
      select: { id: true, name: true, email: true }
    })

    if (!user?.email) return invalidInvitation(translations)

    return {
      success: true,
      data: { name: user.name || '', email: user.email, expiresAt: invitation.expires.toISOString() }
    }
  } catch {
    return { success: false, code: 'INVITATION_LOAD_FAILED', error: translations.messages.loadFailed }
  }
}

export const acceptInvitationAction = async payload => {
  const { translations } = await getLocalizedInvitation(payload)

  const validation = safeParse(createAcceptInvitationSchema(translations.validation), {
    token: payload?.token,
    name: payload?.name,
    password: payload?.password,
    confirmPassword: payload?.confirmPassword
  })

  if (!validation.success) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.issues[0]?.message || translations.validation.invalidSubmission
    }
  }

  try {
    const invitation = await findInvitation(validation.output.token)
    const userId = invitation ? getInvitationUserId(invitation.identifier) : null
    const now = new Date()

    if (!invitation || !userId || invitation.expires <= now) {
      if (invitation) {
        await prisma.verificationToken.deleteMany({ where: { token: invitation.token } }).catch(() => undefined)
      }

      return invalidInvitation(translations)
    }

    const passwordHash = await bcrypt.hash(validation.output.password, 10)

    const invitationAccepted = await prisma.$transaction(async transaction => {
      const consumedToken = await transaction.verificationToken.deleteMany({
        where: {
          identifier: invitation.identifier,
          token: invitation.token,
          expires: { gt: now }
        }
      })

      if (consumedToken.count !== 1) return false

      const activatedUser = await transaction.user.updateMany({
        where: { id: userId, account_status: 'PENDING_ACTIVATION' },
        data: {
          name: validation.output.name,
          password_hash: passwordHash,
          account_status: 'ACTIVE',
          emailVerified: now
        }
      })

      if (activatedUser.count !== 1) return false

      await transaction.verificationToken.deleteMany({ where: { identifier: invitation.identifier } })
      await transaction.auditLog.create({
        data: { user_id: userId, action: 'INVITATION_ACCEPTED', module: 'AUTH' }
      })

      return true
    })

    if (!invitationAccepted) return invalidInvitation(translations)

    return { success: true, message: translations.messages.success }
  } catch {
    return { success: false, code: 'INVITATION_ACCEPT_FAILED', error: translations.messages.failed }
  }
}
