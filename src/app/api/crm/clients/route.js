import { Prisma } from '@prisma/client'
import sanitizeHtml from 'sanitize-html'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { CRM_CLIENT_READ_PERMISSIONS, CRM_CLIENT_WRITE_PERMISSIONS, normalizeClientListItem } from '@/libs/crmClients'
import { prisma } from '@/libs/prisma'
import { createClientSchema } from '@/schemas/crm/clients'
import { toFiniteNumber } from '@/utils/formatCurrency'
import { getDictionary } from '@/utils/getDictionary'

const MAX_PAGE_SIZE = 100
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const cleanText = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

const getContext = async (request, permissions) => {
  const locale = localeFrom(request.nextUrl.searchParams.get('locale'))
  const [authorization, dictionary] = await Promise.all([authorizeAction(permissions), getDictionary(locale)])

  return { authorization, dictionary: dictionary.crmClients }
}

export async function GET(request) {
  const { authorization, dictionary } = await getContext(request, CRM_CLIENT_READ_PERMISSIONS)

  if (!authorization.authorized) {
    return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)
  }

  const params = request.nextUrl.searchParams
  const search = (params.get('search') || '').trim()
  const accountManagerId = params.get('account_manager_id') || ''
  const status = ['ACTIVE', 'INACTIVE'].includes(params.get('status')) ? params.get('status') : ''
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(params.get('limit') || '10', 10) || 10))

  const where = {
    ...(accountManagerId && { account_manager_id: accountManagerId }),
    ...(status && { status }),
    ...(search && { OR: [{ company_name: { contains: search } }, { primary_contact_name: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }] })
  }

  try {
    const [clients, totalCount, summaryClients, staff, countries] = await Promise.all([
      prisma.crmclient.findMany({
        where,
        include: {
          country: { select: { id: true, label: true, value: true } },
          account_manager: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              position: true,
              user: { select: { image: true } }
            }
          },
          lead: { select: { id: true, title: true, source: { select: { id: true, label: true, value: true } } } },
          invoices: { select: { amount_base: true, status: { select: { value: true } } } },
          _count: { select: { projects: true, contracts: true, invoices: true, activities: true } }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.crmclient.count({ where }),
      prisma.crmclient.findMany({ where, select: { status: true, projects: { select: { status: { select: { value: true } } } }, invoices: { select: { amount_base: true, status: { select: { value: true } } } } } }),
      prisma.hrmstaff.findMany({ where: { status: 'ACTIVE' }, select: { id: true, first_name: true, last_name: true, position: true }, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }] }),
      prisma.option.findMany({ where: { category: 'COUNTRY', is_active: true }, select: { id: true, label: true, value: true }, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }] })
    ])

    const allInvoices = summaryClients.flatMap(client => client.invoices)
    const paidInvoices = allInvoices.filter(invoice => invoice.status.value === 'PAID')
    const pendingInvoices = allInvoices.filter(invoice => invoice.status.value !== 'PAID')

    return Response.json({
      success: true,
      data: {
        clients: clients.map(normalizeClientListItem),
        totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        summary: {
          totalActive: summaryClients.filter(client => client.status === 'ACTIVE').length,
          lifetimeRevenue: paidInvoices.reduce((total, invoice) => total + toFiniteNumber(invoice.amount_base), 0).toFixed(2),
          activeProjects: summaryClients.reduce((total, client) => total + client.projects.filter(project => project.status.value === 'ACTIVE').length, 0),
          pendingBalance: pendingInvoices.reduce((total, invoice) => total + toFiniteNumber(invoice.amount_base), 0).toFixed(2)
        },
        options: { staff: staff.map(item => ({ ...item, full_name: `${item.first_name} ${item.last_name}`.trim() })), countries }
      }
    })
  } catch (error) {
    console.error('CRM clients query failed', error)

    return errorResponse(dictionary.messages.loadFailed, 500, 'CLIENTS_LOAD_FAILED')
  }
}

export async function POST(request) {
  const { authorization, dictionary } = await getContext(request, CRM_CLIENT_WRITE_PERMISSIONS)

  if (!authorization.authorized) {
    return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)
  }

  try {
    const payload = await request.json()
    const parsed = safeParse(createClientSchema(dictionary.validation), payload)

    if (!parsed.success) return errorResponse(parsed.issues[0]?.message || dictionary.validation.invalid, 400, 'VALIDATION_ERROR')

    const values = parsed.output

    const [existing, manager, country] = await Promise.all([
      prisma.crmclient.findUnique({ where: { email: values.email.toLowerCase() }, select: { id: true } }),
      values.account_manager_id ? prisma.hrmstaff.findFirst({ where: { id: values.account_manager_id, status: 'ACTIVE' }, select: { id: true } }) : null,
      values.country_id ? prisma.option.findFirst({ where: { id: values.country_id, category: 'COUNTRY', is_active: true }, select: { id: true } }) : null
    ])

    if (existing) return errorResponse(dictionary.messages.emailExists, 409, 'EMAIL_EXISTS')
    if (values.account_manager_id && !manager) return errorResponse(dictionary.messages.invalidManager, 400, 'INVALID_MANAGER')
    if (values.country_id && !country) return errorResponse(dictionary.validation.invalid, 400, 'INVALID_COUNTRY')

    const client = await prisma.$transaction(async transaction => {
      const created = await transaction.crmclient.create({ data: {
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
      } })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_CLIENT_CREATED', module: 'CRM', details: { clientId: created.id } } })

      return created
    })

    return Response.json({ success: true, data: { id: client.id }, message: dictionary.messages.created }, { status: 201 })
  } catch (error) {
    console.error('CRM client creation failed', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return errorResponse(dictionary.messages.emailExists, 409, 'EMAIL_EXISTS')

    return errorResponse(dictionary.messages.operationFailed, 500, 'CLIENT_CREATE_FAILED')
  }
}
