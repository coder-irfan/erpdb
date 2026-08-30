import 'server-only'

import nodemailer from 'nodemailer'

import { i18n } from '@/configs/i18n'
import { getDictionary } from '@/utils/getDictionary'

let transporter

const getRequiredEnvironmentValue = name => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required email configuration: ${name}`)
  }

  return value
}

const getTransporter = () => {
  if (transporter) return transporter

  const port = Number(process.env.SMTP_PORT) || 465

  transporter = nodemailer.createTransport({
    host: getRequiredEnvironmentValue('SMTP_HOST'),
    port,
    secure: Number(process.env.SMTP_PORT) === 465,
    connectionTimeout: 10_000,
    socketTimeout: 10_000,
    greetingTimeout: 5_000,
    auth: {
      user: getRequiredEnvironmentValue('EMAIL_USER'),
      pass: getRequiredEnvironmentValue('EMAIL_PASS')
    }
  })

  return transporter
}

const dispatchMail = async options => {
  try {
    return await getTransporter().sendMail(options)
  } catch (error) {
    console.error('SMTP mail dispatch failed.', error)
    throw error
  }
}

const escapeHtml = value =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

export const sendPasswordResetEmail = async (toEmail, resetToken, requestedLocale) => {
  try {
    const locale = i18n.locales.includes(requestedLocale) ? requestedLocale : i18n.defaultLocale
    const dictionary = await getDictionary(locale)
    const translations = dictionary.auth.email
    const applicationUrl = getRequiredEnvironmentValue('NEXTAUTH_URL')
    const emailUser = getRequiredEnvironmentValue('EMAIL_USER')
    const fromName = process.env.EMAIL_FROM_NAME || 'ERP System'
    const resetUrl = new URL(`/${locale}/reset-password`, applicationUrl)
    const direction = i18n.langDirection[locale]
    const textAlign = direction === 'rtl' ? 'right' : 'left'

    resetUrl.searchParams.set('token', resetToken)

    await dispatchMail({
      from: `"${fromName.replaceAll('"', '')}" <${emailUser}>`,
      to: toEmail,
      subject: translations.subject,
      text: `${translations.intro}\n\n${translations.button}: ${resetUrl.toString()}\n\n${translations.expiry}`,
      html: `
        <div lang="${locale}" dir="${direction}" style="background:#f4f5fa;padding:32px 16px;font-family:Arial,sans-serif;color:#2f2b3d;text-align:${textAlign};">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;padding:32px;box-shadow:0 2px 12px rgba(47,43,61,.08);">
            <h1 style="margin:0 0 16px;font-size:24px;">${translations.title}</h1>
            <p style="margin:0 0 24px;line-height:1.6;">${translations.intro}</p>
            <a href="${resetUrl.toString()}" style="display:inline-block;background:#022483;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">${translations.button}</a>
            <p style="margin:24px 0 0;line-height:1.6;color:#6d6b77;">${translations.expiry}</p>
          </div>
        </div>
      `
    })
  } catch (error) {
    console.error('Password reset email delivery failed.', error)
    throw new Error('Unable to deliver the password reset email.', { cause: error })
  }
}

export const sendUserInvitationEmail = async (toEmail, invitationToken, requestedLocale, inviteeName) => {
  try {
    const locale = i18n.locales.includes(requestedLocale) ? requestedLocale : i18n.defaultLocale
    const dictionary = await getDictionary(locale)
    const translations = dictionary.auth.invitationEmail
    const applicationUrl = getRequiredEnvironmentValue('NEXTAUTH_URL')
    const emailUser = getRequiredEnvironmentValue('EMAIL_USER')
    const fromName = process.env.EMAIL_FROM_NAME || 'ERP System'
    const invitationUrl = new URL(`/${locale}/auth/accept-invite`, applicationUrl)
    const direction = i18n.langDirection[locale]
    const textAlign = direction === 'rtl' ? 'right' : 'left'
    const greeting = translations.greeting.replace('{name}', inviteeName || toEmail)

    invitationUrl.searchParams.set('token', invitationToken)

    await dispatchMail({
      from: `"${fromName.replaceAll('"', '')}" <${emailUser}>`,
      to: toEmail,
      subject: translations.subject,
      text: `${greeting}\n\n${translations.intro}\n\n${translations.button}: ${invitationUrl.toString()}\n\n${translations.expiry}`,
      html: `
        <div lang="${locale}" dir="${direction}" style="background:#f4f5fa;padding:32px 16px;font-family:Arial,sans-serif;color:#2f2b3d;text-align:${textAlign};">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;padding:32px;box-shadow:0 2px 12px rgba(47,43,61,.08);">
            <h1 style="margin:0 0 16px;font-size:24px;">${escapeHtml(translations.title)}</h1>
            <p style="margin:0 0 12px;line-height:1.6;">${escapeHtml(greeting)}</p>
            <p style="margin:0 0 24px;line-height:1.6;">${escapeHtml(translations.intro)}</p>
            <a href="${invitationUrl.toString()}" style="display:inline-block;background:#022483;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">${escapeHtml(translations.button)}</a>
            <p style="margin:24px 0 0;line-height:1.6;color:#6d6b77;">${escapeHtml(translations.expiry)}</p>
          </div>
        </div>
      `
    })
  } catch (error) {
    console.error('User invitation email delivery failed.', error)
    throw new Error('Unable to deliver the user invitation email.', { cause: error })
  }
}

export const sendContractExpirationEmail = async ({
  toEmail,
  clientName,
  contractNumber,
  contractTitle,
  endDate,
  remainingDays,
  companyName
}) => {
  const emailUser = getRequiredEnvironmentValue('EMAIL_USER')
  const fromName = process.env.EMAIL_FROM_NAME || companyName || 'ERP System'
  const safeCompanyName = escapeHtml(companyName || fromName)
  const safeClientName = escapeHtml(clientName || toEmail)
  const safeContractNumber = escapeHtml(contractNumber)
  const safeContractTitle = escapeHtml(contractTitle)

  const formattedEndDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(endDate)

  const subject = `${contractNumber} expires in ${remainingDays} days`

  await dispatchMail({
    from: `"${fromName.replaceAll('"', '')}" <${emailUser}>`,
    to: toEmail,
    subject,
    text: `Hello ${clientName || ''},\n\nContract ${contractNumber} (${contractTitle}) expires on ${formattedEndDate}, in ${remainingDays} days. Please contact ${companyName || fromName} to discuss renewal.`,
    html: `
      <div style="background:#f4f5fa;padding:32px 16px;font-family:Arial,sans-serif;color:#2f2b3d;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(47,43,61,.08);">
          <div style="background:#022483;color:#ffffff;padding:24px 30px;">
            <div style="font-size:13px;opacity:.82;text-transform:uppercase;letter-spacing:.08em;">Contract expiration notice</div>
            <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;">${safeContractNumber}</h1>
          </div>
          <div style="padding:30px;">
            <p style="margin:0 0 16px;line-height:1.7;">Hello ${safeClientName},</p>
            <p style="margin:0 0 22px;line-height:1.7;">Your contract <strong>${safeContractTitle}</strong> will expire in <strong>${remainingDays} days</strong>.</p>
            <div style="background:#f8f8fb;border:1px solid #e7e7ef;border-radius:10px;padding:18px 20px;">
              <div style="font-size:12px;color:#6d6b77;text-transform:uppercase;letter-spacing:.06em;">Expiration date</div>
              <div style="margin-top:6px;font-size:18px;font-weight:700;">${escapeHtml(formattedEndDate)}</div>
            </div>
            <p style="margin:22px 0 0;line-height:1.7;color:#6d6b77;">Please contact ${safeCompanyName} if you would like to discuss renewal or changes to your service.</p>
          </div>
        </div>
      </div>
    `
  })
}

export const sendContractRenewalReviewEmail = async ({
  toEmail,
  recipientName,
  recipientRole,
  contractNumber,
  contractTitle,
  endDate,
  remainingDays,
  companyName
}) => {
  const emailUser = getRequiredEnvironmentValue('EMAIL_USER')
  const fromName = process.env.EMAIL_FROM_NAME || companyName || 'ERP System'

  const formattedEndDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(endDate)

  const roleMessage =
    recipientRole === 'ACCOUNT_MANAGER'
      ? 'Please review the agreement with the client and record the renewal decision.'
      : 'Your agreement is ready for renewal review. Your account manager will contact you about the next term.'

  await dispatchMail({
    from: `"${fromName.replaceAll('"', '')}" <${emailUser}>`,
    to: toEmail,
    subject: `Renewal review required: ${contractNumber}`,
    text: `Hello ${recipientName || ''},\n\nContract ${contractNumber} (${contractTitle}) reaches its end date on ${formattedEndDate}. ${roleMessage}`,
    html: `
      <div style="background:#f4f5fa;padding:32px 16px;font-family:Arial,sans-serif;color:#2f2b3d;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(47,43,61,.08);">
          <div style="background:#022483;color:#ffffff;padding:24px 30px;">
            <div style="font-size:13px;opacity:.82;text-transform:uppercase;letter-spacing:.08em;">Renewal review</div>
            <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;">${escapeHtml(contractNumber)}</h1>
          </div>
          <div style="padding:30px;">
            <p style="margin:0 0 16px;line-height:1.7;">Hello ${escapeHtml(recipientName || toEmail)},</p>
            <p style="margin:0 0 20px;line-height:1.7;"><strong>${escapeHtml(contractTitle)}</strong> is due for renewal review${remainingDays >= 0 ? ` in ${remainingDays} days` : ''}.</p>
            <div style="background:#f8f8fb;border:1px solid #e7e7ef;border-radius:10px;padding:18px 20px;">
              <div style="font-size:12px;color:#6d6b77;text-transform:uppercase;letter-spacing:.06em;">Current end date</div>
              <div style="margin-top:6px;font-size:18px;font-weight:700;">${escapeHtml(formattedEndDate)}</div>
            </div>
            <p style="margin:22px 0 0;line-height:1.7;color:#6d6b77;">${escapeHtml(roleMessage)}</p>
          </div>
        </div>
      </div>
    `
  })
}
