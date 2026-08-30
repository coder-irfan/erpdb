import { revalidatePath } from 'next/cache'

import { getServerSession } from 'next-auth'
import { safeParse } from 'valibot'
import { Prisma } from '@prisma/client'

import { SYSTEM_SETTING_ID } from '@/configs/branding'
import { authOptions } from '@/libs/auth'
import { USER_DEACTIVATED_CODE, USER_DEACTIVATED_MESSAGE } from '@/libs/authDeactivation'
import { DEFAULT_COMPANY_SETUP, getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { createCompanySetupSchema } from '@/schemas/setup'
import { SYSTEM_BASE_CURRENCY, convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'
import { hasAnyPermission } from '@/utils/rbac'

const SETUP_PERMISSIONS = ['setup:manage', 'settings:manage']
const SAFE_IMAGE_PATH = /^\/(?:images|uploads\/(?:images|logos))\/[a-zA-Z0-9/_-]+\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/
const SAFE_FAVICON_PATH = /^(?:\/favicon\.ico|\/(?:images|uploads\/(?:favicons|images))\/[a-zA-Z0-9/_-]+\.(?:ico|png|svg))$/

const jsonError = (error, status, code) => Response.json({ success: false, error, code }, { status })

const getAuthorizedSession = async () => {
  const session = await getServerSession(authOptions)

  if (!session?.user) return { session: null, code: 'UNAUTHENTICATED' }

  if (session.error === USER_DEACTIVATED_CODE || session.user.accountStatus !== 'ACTIVE') {
    return { session: null, code: USER_DEACTIVATED_CODE }
  }

  if (!hasAnyPermission(session, SETUP_PERMISSIONS)) return { session: null, code: 'FORBIDDEN' }

  return { session, code: null }
}

const authorizationError = code =>
  code === USER_DEACTIVATED_CODE
    ? jsonError(USER_DEACTIVATED_MESSAGE, 401, USER_DEACTIVATED_CODE)
    : jsonError(
        code === 'UNAUTHENTICATED'
          ? 'Authentication is required.'
          : 'You do not have permission to access company setup.',
        code === 'UNAUTHENTICATED' ? 401 : 403,
        code
      )

const nullableText = value => value?.trim() || null

const rebaseStoredAmounts = async (transaction, baseCurrency) => {
  const models = [
    ['hrmstaff', 'salary', 'salary_currency', 'salary_exchange_rate'],
    ['hrmstaffcontract', 'base_salary', 'currency', 'exchange_rate'],
    ['crmlead', 'estimated_value', 'currency', 'exchange_rate'],
    ['project', 'budget', 'currency', 'exchange_rate'],
    ['contract', 'total_amount', 'currency', 'exchange_rate'],
    ['contractinvoice', 'amount', 'currency', 'exchange_rate'],
    ['financeincome', 'total_amount', 'currency', 'exchange_rate'],
    ['financeexpense', 'sub_total', 'currency', 'exchange_rate'],
    ['financesalary', 'payable_amount', 'currency', 'exchange_rate'],
    ['financeloan', 'total_amount', 'currency', 'exchange_rate'],
    ['loanrepayment', 'amount', 'currency', 'exchange_rate'],
    ['inventory', 'unit_price', 'currency', 'exchange_rate']
  ]

  for (const [model, amountField, currencyField, rateField] of models) {
    const rows = await transaction[model].findMany({
      select: { id: true, [amountField]: true, [currencyField]: true, [rateField]: true }
    })

    for (const row of rows) {
      await transaction[model].update({
        where: { id: row.id },
        data: {
          amount_base: new Prisma.Decimal(
            convertToBaseCurrency(row[amountField] || 0, row[currencyField], row[rateField], baseCurrency)
          )
        }
      })
    }
  }
}

const refreshCurrentCompensationRates = async (transaction, baseCurrency, exchangeRate) => {
  const [staff, activeContracts] = await Promise.all([
    transaction.hrmstaff.findMany({
      select: { id: true, salary: true, salary_currency: true }
    }),
    transaction.hrmstaffcontract.findMany({
      where: { status: { is: { value: 'ACTIVE' } } },
      select: { id: true, base_salary: true, currency: true }
    })
  ])

  for (const member of staff) {
    await transaction.hrmstaff.update({
      where: { id: member.id },
      data: {
        salary_exchange_rate: new Prisma.Decimal(exchangeRate),
        amount_base: new Prisma.Decimal(
          convertToBaseCurrency(member.salary, member.salary_currency, exchangeRate, baseCurrency)
        )
      }
    })
  }

  for (const contract of activeContracts) {
    await transaction.hrmstaffcontract.update({
      where: { id: contract.id },
      data: {
        exchange_rate: new Prisma.Decimal(exchangeRate),
        amount_base: new Prisma.Decimal(
          convertToBaseCurrency(contract.base_salary, contract.currency, exchangeRate, baseCurrency)
        )
      }
    })
  }
}

const normalizeLocalPath = (value, pattern) => {
  if (!value) return null

  const normalized = value.trim()

  return pattern.test(normalized) && !normalized.includes('..') ? normalized : undefined
}

export async function GET() {
  const authorization = await getAuthorizedSession()

  if (!authorization.session) return authorizationError(authorization.code)

  try {
    const [company, branding] = await Promise.all([
      getCompanySetupRecord(),
      prisma.systemsetting.findUnique({ where: { id: SYSTEM_SETTING_ID } })
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
  const authorization = await getAuthorizedSession()

  if (!authorization.session) return authorizationError(authorization.code)

  const { session } = authorization

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
    currency_code: SYSTEM_BASE_CURRENCY,
    usd_afn_exchange_rate: String(
      payload?.usd_afn_exchange_rate || DEFAULT_COMPANY_SETUP.usd_afn_exchange_rate
    ),
    default_work_start: payload?.default_work_start || DEFAULT_COMPANY_SETUP.default_work_start,
    default_work_end: payload?.default_work_end || DEFAULT_COMPANY_SETUP.default_work_end,
    weekend_days: '5',
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

  if (Number(validation.output.usd_afn_exchange_rate) <= 0) {
    return jsonError('The USD/AFN exchange rate must be greater than zero.', 400, 'INVALID_EXCHANGE_RATE')
  }

  const weekendDays = '5'

  try {
    const currentSetup = await prisma.setup.findUnique({
      where: { scope: 'GLOBAL' },
      select: { currency_code: true, usd_afn_exchange_rate: true }
    })

    await prisma.$transaction(async transaction => {
      await transaction.setup.upsert({
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
          currency_code: SYSTEM_BASE_CURRENCY,
          currency_symbol: validation.output.currency_code === 'USD' ? '$' : '؋',
          usd_afn_exchange_rate: validation.output.usd_afn_exchange_rate,
          default_work_start: validation.output.default_work_start,
          default_work_end: validation.output.default_work_end,
          weekend_days: weekendDays
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
          currency_code: SYSTEM_BASE_CURRENCY,
          currency_symbol: validation.output.currency_code === 'USD' ? '$' : '؋',
          usd_afn_exchange_rate: validation.output.usd_afn_exchange_rate,
          default_work_start: validation.output.default_work_start,
          default_work_end: validation.output.default_work_end,
          weekend_days: weekendDays
        }
      })

      await transaction.systemsetting.upsert({
        where: { id: SYSTEM_SETTING_ID },
        update: { lightLogoUrl, darkLogoUrl, faviconUrl },
        create: { id: SYSTEM_SETTING_ID, lightLogoUrl, darkLogoUrl, faviconUrl }
      })

      const previousBaseCurrency = currentSetup?.currency_code || DEFAULT_COMPANY_SETUP.currency_code

      const previousExchangeRate = toFiniteNumber(
        currentSetup?.usd_afn_exchange_rate || DEFAULT_COMPANY_SETUP.usd_afn_exchange_rate
      )

      const nextExchangeRate = toFiniteNumber(validation.output.usd_afn_exchange_rate)

      if (previousBaseCurrency !== SYSTEM_BASE_CURRENCY) {
        await rebaseStoredAmounts(transaction, SYSTEM_BASE_CURRENCY)
      }

      if (
        previousBaseCurrency !== SYSTEM_BASE_CURRENCY ||
        Math.abs(previousExchangeRate - nextExchangeRate) > 0.00005
      ) {
        await refreshCurrentCompensationRates(
          transaction,
          SYSTEM_BASE_CURRENCY,
          nextExchangeRate
        )
      }

      await transaction.auditlog.create({
        data: {
          user_id: session.user.id,
          action: 'COMPANY_SETUP_UPDATED',
          module: 'SETUP',
          details: {
            companyName: validation.output.company_name,
            baseCurrency: SYSTEM_BASE_CURRENCY,
            previousBaseCurrency,
            previousUsdAfnExchangeRate: previousExchangeRate,
            usdAfnExchangeRate: nextExchangeRate,
            weekendDays
          }
        }
      })
    })

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
