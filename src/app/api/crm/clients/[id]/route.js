import { Prisma } from '@prisma/client'
import sanitizeHtml from 'sanitize-html'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { CRM_CLIENT_DELETE_PERMISSIONS, CRM_CLIENT_READ_PERMISSIONS, CRM_CLIENT_WRITE_PERMISSIONS, normalizeClientDetail } from '@/libs/crmClients'
import { prisma } from '@/libs/prisma'
import { createClientSchema } from '@/schemas/crm/clients'
import { getDictionary } from '@/utils/getDictionary'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const cleanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

const getContext = async (request, permissions) => {
  const locale = localeFrom(request.nextUrl.searchParams.get('locale'))
  const [authorization, dictionary] = await Promise.all([authorizeAction(permissions), getDictionary(locale)])

  return { authorization, dictionary: dictionary.crmClients }
}

const optionSelect = { id: true, label: true, value: true, color_code: true }

export async function GET(request, context) {
  const { authorization, dictionary } = await getContext(request, CRM_CLIENT_READ_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const { id } = await context.params

    const client = await prisma.crmclient.findUnique({
      where: { id },
      include: {
        country: { select: { id: true, label: true, value: true } },
        account_manager: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            position: true,
            email: true,
            phone: true,
            user: { select: { image: true } }
          }
        },
        lead: { include: { source: { select: optionSelect }, activities: { include: { staff: { select: { id: true, first_name: true, last_name: true, position: true } } } } } },
        projects: { select: { id: true, project_code: true, title: true, budget: true, currency: true, exchange_rate: true, amount_base: true, start_date: true, end_date: true, status: { select: optionSelect } }, orderBy: { created_at: 'desc' } },
        contracts: { select: { id: true, contract_number: true, title: true, total_amount: true, currency: true, exchange_rate: true, amount_base: true, start_date: true, end_date: true, status: { select: optionSelect } }, orderBy: { created_at: 'desc' } },
        invoices: { select: { id: true, invoice_number: true, amount: true, currency: true, exchange_rate: true, amount_base: true, issued_date: true, due_date: true, status: { select: optionSelect } }, orderBy: { created_at: 'desc' } },
        activities: { include: { staff: { select: { id: true, first_name: true, last_name: true, position: true } } }, orderBy: { activity_date: 'desc' } }
      }
    })

    if (!client) return errorResponse(dictionary.messages.notFound, 404, 'CLIENT_NOT_FOUND')

    return Response.json({ success: true, data: normalizeClientDetail(client) })
  } catch (error) {
    console.error('CRM client detail query failed', error)

    return errorResponse(dictionary.messages.loadFailed, 500, 'CLIENT_LOAD_FAILED')
  }
}

export async function PUT(request, context) {
  const { authorization, dictionary } = await getContext(request, CRM_CLIENT_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const { id } = await context.params
    const payload = await request.json()
    const parsed = safeParse(createClientSchema(dictionary.validation), payload)

    if (!parsed.success) return errorResponse(parsed.issues[0]?.message || dictionary.validation.invalid, 400, 'VALIDATION_ERROR')

    const values = parsed.output

    const client = await prisma.crmclient.findUnique({ where: { id }, select: { id: true, country_id: true } })

    const [emailOwner, manager, country] = await Promise.all([
      prisma.crmclient.findUnique({ where: { email: values.email.toLowerCase() }, select: { id: true } }),
      values.account_manager_id ? prisma.hrmstaff.findFirst({ where: { id: values.account_manager_id, status: 'ACTIVE' }, select: { id: true } }) : null,
      values.country_id ? prisma.option.findFirst({ where: { id: values.country_id, category: 'COUNTRY', ...(client?.country_id === values.country_id ? {} : { is_active: true }) }, select: { id: true } }) : null
    ])

    if (!client) return errorResponse(dictionary.messages.notFound, 404, 'CLIENT_NOT_FOUND')
    if (emailOwner && emailOwner.id !== id) return errorResponse(dictionary.messages.emailExists, 409, 'EMAIL_EXISTS')
    if (values.account_manager_id && !manager) return errorResponse(dictionary.messages.invalidManager, 400, 'INVALID_MANAGER')
    if (values.country_id && !country) return errorResponse(dictionary.validation.invalid, 400, 'INVALID_COUNTRY')

    await prisma.$transaction([
      prisma.crmclient.update({ where: { id }, data: {
        company_name: cleanText(values.company_name),
        primary_contact_name: cleanText(values.primary_contact_name),
        email: values.email.toLowerCase(),
        phone: cleanText(values.phone),
        address: cleanText(values.address) || null,
        country_id: values.country_id || null,
        tax_id: cleanText(values.tax_number) || null,
        account_manager_id: values.account_manager_id || null,
        status: values.status,
        notes: cleanText(values.notes) || null
      } }),
      prisma.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_CLIENT_UPDATED', module: 'CRM', details: { clientId: id } } })
    ])

    return Response.json({ success: true, message: dictionary.messages.updated })
  } catch (error) {
    console.error('CRM client update failed', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return errorResponse(dictionary.messages.emailExists, 409, 'EMAIL_EXISTS')

    return errorResponse(dictionary.messages.operationFailed, 500, 'CLIENT_UPDATE_FAILED')
  }
}

export async function PATCH(request, context) {
  const { authorization, dictionary } = await getContext(request, CRM_CLIENT_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const { id } = await context.params
    const payload = await request.json()
    const status = typeof payload?.status === 'string' ? payload.status.trim().toUpperCase() : ''

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return errorResponse(dictionary.validation.invalid, 400, 'INVALID_STATUS')
    }

    const client = await prisma.crmclient.findUnique({ where: { id }, select: { id: true, status: true } })

    if (!client) return errorResponse(dictionary.messages.notFound, 404, 'CLIENT_NOT_FOUND')

    if (client.status !== status) {
      await prisma.$transaction([
        prisma.crmclient.update({ where: { id }, data: { status } }),
        prisma.auditlog.create({
          data: {
            user_id: authorization.session.user.id,
            action: 'CRM_CLIENT_STATUS_UPDATED',
            module: 'CRM',
            details: { clientId: id, fromStatus: client.status, toStatus: status }
          }
        })
      ])
    }

    return Response.json({ success: true, message: dictionary.messages.statusUpdated })
  } catch (error) {
    console.error('CRM client status update failed', error)

    return errorResponse(dictionary.messages.operationFailed, 500, 'CLIENT_STATUS_UPDATE_FAILED')
  }
}

export async function DELETE(request, context) {
  const { authorization, dictionary } = await getContext(request, CRM_CLIENT_DELETE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const { id } = await context.params

    const client = await prisma.crmclient.findUnique({
      where: { id },
      select: {
        id: true,
        projects: { where: { status: { value: 'ACTIVE' } }, select: { id: true }, take: 1 },
        contracts: { where: { status: { value: 'ACTIVE' } }, select: { id: true }, take: 1 }
      }
    })

    if (!client) return errorResponse(dictionary.messages.notFound, 404, 'CLIENT_NOT_FOUND')
    if (client.projects.length || client.contracts.length) return errorResponse(dictionary.messages.deleteBlocked, 409, 'ACTIVE_DEPENDENCIES')

    await prisma.$transaction([
      prisma.crmclient.delete({ where: { id } }),
      prisma.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_CLIENT_DELETED', module: 'CRM', details: { clientId: id } } })
    ])

    return Response.json({ success: true, message: dictionary.messages.deleted })
  } catch (error) {
    console.error('CRM client deletion failed', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return errorResponse(dictionary.messages.deleteBlocked, 409, 'DEPENDENCIES_EXIST')

    return errorResponse(dictionary.messages.operationFailed, 500, 'CLIENT_DELETE_FAILED')
  }
}
