import { revalidatePath } from 'next/cache'

import { getServerSession } from 'next-auth'
import { safeParse } from 'valibot'

import { SYSTEM_SETTING_ID } from '@/configs/branding'
import { authOptions } from '@/libs/auth'
import { DEFAULT_COMPANY_SETUP, getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { createCompanySetupSchema } from '@/schemas/setup'
import { hasAnyPermission } from '@/utils/rbac'

const SETUP_PERMISSIONS = ['setup:manage', 'settings:manage']
const SAFE_IMAGE_PATH = /^\/(?:images|uploads\/(?:images|logos))\/[a-zA-Z0-9/_-]+\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/
const SAFE_FAVICON_PATH = /^(?:\/favicon\.ico|\/(?:images|uploads\/(?:favicons|images))\/[a-zA-Z0-9/_-]+\.(?:ico|png|svg))$/

const jsonError = (error, status, code) => Response.json({ success: false, error, code }, { status })

const getAuthorizedSession = async () => {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.accountStatus !== 'ACTIVE') return null
  if (!hasAnyPermission(session, SETUP_PERMISSIONS)) return null

  return session
}

const nullableText = value => value?.trim() || null

const normalizeLocalPath = (value, pattern) => {
  if (!value) return null

  const normalized = value.trim()

  return pattern.test(normalized) && !normalized.includes('..') ? normalized : undefined
}

export async function GET() {
  const session = await getAuthorizedSession()

  if (!session) return jsonError('You do not have permission to access company setup.', 403, 'FORBIDDEN')

  try {
    const [company, branding] = await Promise.all([
      getCompanySetupRecord(),
      prisma.systemSetting.findUnique({ where: { id: SYSTEM_SETTING_ID } })
    ])

    return Response.json({
      success: true,
      data: {
        ...company,
        lightLogoUrl: branding?.lightLogoUrl ?? null,
        darkLogoUrl: branding?.darkLogoUrl ?? null,
        faviconUrl: branding?.faviconUrl ?? null
      }
    })
  } catch {
    return jsonError('Company setup could not be loaded.', 500, 'SETUP_LOAD_FAILED')
  }
}

export async function PUT(request) {
  const session = await getAuthorizedSession()

  if (!session) return jsonError('You do not have permission to update company setup.', 403, 'FORBIDDEN')

  let payload

  try {
    payload = await request.json()
  } catch {
    return jsonError('The setup request is invalid.', 400, 'INVALID_REQUEST')
  }

  const validation = safeParse(createCompanySetupSchema(), {
    app_name: payload?.app_name || DEFAULT_COMPANY_SETUP.app_name,
    company_name: payload?.company_name,
    company_logo: payload?.company_logo || '',
    company_email: payload?.company_email || '',
    company_phone: payload?.company_phone || '',
    company_address: payload?.company_address || '',
    company_tax_id: payload?.company_tax_id || '',
    signatory_name: payload?.signatory_name || '',
    signatory_title: payload?.signatory_title || '',
    signatory_stamp: payload?.signatory_stamp || '',
    default_work_start: payload?.default_work_start || DEFAULT_COMPANY_SETUP.default_work_start,
    default_work_end: payload?.default_work_end || DEFAULT_COMPANY_SETUP.default_work_end,
    lightLogoUrl: payload?.lightLogoUrl || '',
    darkLogoUrl: payload?.darkLogoUrl || '',
    faviconUrl: payload?.faviconUrl || '',
    updateNavigationBranding: payload?.updateNavigationBranding ?? true
  })

  if (!validation.success) {
    return jsonError(validation.issues[0]?.message || 'Review the setup fields and try again.', 400, 'VALIDATION_ERROR')
  }

  const companyLogo = normalizeLocalPath(validation.output.company_logo, SAFE_IMAGE_PATH)
  const signatoryStamp = normalizeLocalPath(validation.output.signatory_stamp, SAFE_IMAGE_PATH)
  const lightLogoUrl = normalizeLocalPath(validation.output.lightLogoUrl, SAFE_IMAGE_PATH)
  const darkLogoUrl = normalizeLocalPath(validation.output.darkLogoUrl, SAFE_IMAGE_PATH)
  const faviconUrl = normalizeLocalPath(validation.output.faviconUrl, SAFE_FAVICON_PATH)

  if ([companyLogo, signatoryStamp, lightLogoUrl, darkLogoUrl, faviconUrl].some(value => value === undefined)) {
    return jsonError('Select valid locally uploaded image files.', 400, 'INVALID_IMAGE_PATH')
  }

  if (validation.output.default_work_end <= validation.output.default_work_start) {
    return jsonError('Work end time must be later than work start time.', 400, 'INVALID_WORK_HOURS')
  }

  try {
    await prisma.$transaction([
      prisma.setup.upsert({
        where: { scope: 'GLOBAL' },
        update: {
          app_name: validation.output.app_name,
          company_name: validation.output.company_name,
          company_logo: companyLogo,
          company_email: nullableText(validation.output.company_email),
          company_phone: nullableText(validation.output.company_phone),
          company_address: nullableText(validation.output.company_address),
          company_tax_id: nullableText(validation.output.company_tax_id),
          signatory_name: nullableText(validation.output.signatory_name),
          signatory_title: nullableText(validation.output.signatory_title),
          signatory_stamp: signatoryStamp,
          default_work_start: validation.output.default_work_start,
          default_work_end: validation.output.default_work_end
        },
        create: {
          app_name: validation.output.app_name,
          company_name: validation.output.company_name,
          company_logo: companyLogo,
          company_email: nullableText(validation.output.company_email),
          company_phone: nullableText(validation.output.company_phone),
          company_address: nullableText(validation.output.company_address),
          company_tax_id: nullableText(validation.output.company_tax_id),
          signatory_name: nullableText(validation.output.signatory_name),
          signatory_title: nullableText(validation.output.signatory_title),
          signatory_stamp: signatoryStamp,
          default_work_start: validation.output.default_work_start,
          default_work_end: validation.output.default_work_end
        }
      }),
      prisma.systemSetting.upsert({
        where: { id: SYSTEM_SETTING_ID },
        update: { lightLogoUrl, darkLogoUrl, faviconUrl },
        create: { id: SYSTEM_SETTING_ID, lightLogoUrl, darkLogoUrl, faviconUrl }
      }),
      prisma.auditLog.create({
        data: {
          user_id: session.user.id,
          action: 'COMPANY_SETUP_UPDATED',
          module: 'SETUP',
          details: { companyName: validation.output.company_name }
        }
      })
    ])

    revalidatePath('/', 'layout')
    revalidatePath('/[lang]/setup', 'page')

    const company = await getCompanySetupRecord()

    return Response.json({
      success: true,
      data: { ...company, lightLogoUrl, darkLogoUrl, faviconUrl },
      message: 'Company letterhead and branding settings saved successfully.'
    })
  } catch {
    return jsonError('Company setup could not be saved. Please try again.', 500, 'SETUP_UPDATE_FAILED')
  }
}
