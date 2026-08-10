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

  const port = Number(getRequiredEnvironmentValue('SMTP_PORT'))

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a valid positive integer.')
  }

  transporter = nodemailer.createTransport({
    host: getRequiredEnvironmentValue('SMTP_HOST'),
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: getRequiredEnvironmentValue('EMAIL_USER'),
      pass: getRequiredEnvironmentValue('EMAIL_PASS')
    }
  })

  return transporter
}

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

    await getTransporter().sendMail({
      from: `"${fromName.replaceAll('"', '')}" <${emailUser}>`,
      to: toEmail,
      subject: translations.subject,
      text: `${translations.intro}\n\n${translations.button}: ${resetUrl.toString()}\n\n${translations.expiry}`,
      html: `
        <div lang="${locale}" dir="${direction}" style="background:#f4f5fa;padding:32px 16px;font-family:Arial,sans-serif;color:#2f2b3d;text-align:${textAlign};">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;padding:32px;box-shadow:0 2px 12px rgba(47,43,61,.08);">
            <h1 style="margin:0 0 16px;font-size:24px;">${translations.title}</h1>
            <p style="margin:0 0 24px;line-height:1.6;">${translations.intro}</p>
            <a href="${resetUrl.toString()}" style="display:inline-block;background:#7367f0;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">${translations.button}</a>
            <p style="margin:24px 0 0;line-height:1.6;color:#6d6b77;">${translations.expiry}</p>
          </div>
        </div>
      `
    })
  } catch (error) {
    throw new Error('Unable to deliver the password reset email.', { cause: error })
  }
}
