'use server'

import { revalidatePath } from 'next/cache'

import { i18n } from '@/configs/i18n'
import { SYSTEM_SETTING_ID } from '@/configs/branding'
import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { getBrandingSettings } from '@/libs/systemSettings'
import { getDictionary } from '@/utils/getDictionary'

const SETTING_PERMISSIONS = ['setup:manage', 'settings:manage']
const SAFE_LOGO_PATH = /^\/(?:images|uploads\/logos)\/[a-zA-Z0-9/_-]+\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/
const SAFE_FAVICON_PATH = /^(?:\/favicon\.ico|\/(?:images|uploads\/favicons)\/[a-zA-Z0-9/_-]+\.(?:ico|png|svg))$/

const normalizeLocale = locale => (i18n.locales.includes(locale) ? locale : i18n.defaultLocale)

const normalizeStoredPath = (value, allowedPath) => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') return undefined

  const normalizedValue = value.trim()

  return allowedPath.test(normalizedValue) && !normalizedValue.includes('..') ? normalizedValue : undefined
}

export const getSystemSettings = async () => {
  const authorization = await authorizeAction(SETTING_PERMISSIONS)

  if (!authorization.authorized) {
    return { success: false, code: authorization.code, error: authorization.error }
  }

  const [branding, company] = await Promise.all([getBrandingSettings(), getCompanySetupRecord()])

  return { success: true, data: { ...branding, ...company } }
}

export const updateLogoSettings = async payload => {
  const authorization = await authorizeAction(SETTING_PERMISSIONS)

  if (!authorization.authorized) {
    return { success: false, code: authorization.code, error: authorization.error }
  }

  const locale = normalizeLocale(payload?.locale)
  const dictionary = await getDictionary(locale)
  const translations = dictionary.setupBranding
  const lightLogoUrl = normalizeStoredPath(payload?.lightLogoUrl, SAFE_LOGO_PATH)
  const darkLogoUrl = normalizeStoredPath(payload?.darkLogoUrl, SAFE_LOGO_PATH)
  const faviconUrl = normalizeStoredPath(payload?.faviconUrl, SAFE_FAVICON_PATH)

  if (lightLogoUrl === undefined || darkLogoUrl === undefined || faviconUrl === undefined) {
    return { success: false, code: 'INVALID_LOGO_PATH', error: translations.invalidLogoPath }
  }

  try {
    await prisma.$transaction([
      prisma.systemSetting.upsert({
        where: { id: SYSTEM_SETTING_ID },
        update: { lightLogoUrl, darkLogoUrl, faviconUrl },
        create: {
          id: SYSTEM_SETTING_ID,
          lightLogoUrl,
          darkLogoUrl,
          faviconUrl
        }
      }),
      prisma.auditLog.create({
        data: {
          user_id: authorization.session.user.id,
          action: 'BRANDING_UPDATED',
          module: 'SETUP',
          details: { lightLogoUrl, darkLogoUrl, faviconUrl }
        }
      })
    ])

    revalidatePath('/', 'layout')

    const settings = await getBrandingSettings()

    return { success: true, data: settings, message: translations.saved }
  } catch {
    return { success: false, code: 'SETTINGS_UPDATE_FAILED', error: translations.saveFailed }
  }
}
