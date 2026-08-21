import sanitizeHtml from 'sanitize-html'

import { safeParse } from 'valibot'

import { getInventoryDictionary } from '@/data/dictionaries/inventory'
import { authorizeAction } from '@/libs/actionAuthorization'
import { prisma } from '@/libs/prisma'
import { inventoryCategorySchema } from '@/schemas/inventory'

const OPTION_TYPE = 'INVENTORY_CATEGORY'
const READ_PERMISSIONS = ['options:read', 'finance:read', 'finance_inventory:read']
const WRITE_PERMISSIONS = ['options:write', 'finance:write', 'finance_inventory:write']
const DELETE_PERMISSIONS = ['options:delete', 'finance:delete', 'finance_inventory:delete']
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })
const optionSelect = { id: true, category: true, label: true, value: true, description: true, is_active: true, is_default: true, sort_order: true }
const normalizePayload = payload => ({ name: payload?.name || '', description: payload?.description || '', is_active: payload?.is_active !== false })
const clean = value => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).trim()
const valueFrom = name => clean(name).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')

const getContext = async (request, permissions, payload = null) => {
  const params = request.nextUrl.searchParams
  const type = params.get('type')
  const locale = localeFrom(payload?.locale || params.get('locale'))
  const dictionary = getInventoryDictionary(locale)

  if (type !== OPTION_TYPE) return { error: errorResponse(dictionary.messages.invalidOptionType, 400, 'INVALID_OPTION_TYPE') }

  const authorization = await authorizeAction(permissions)

  if (!authorization.authorized) return { error: errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code) }

  return { authorization, dictionary, params }
}

export async function GET(request) {
  const context = await getContext(request, READ_PERMISSIONS)

  if (context.error) return context.error

  const options = await prisma.option.findMany({ where: { category: OPTION_TYPE }, select: optionSelect, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }] })

  return Response.json({ success: true, data: { options } })
}

export async function POST(request) {
  let payload

  try { payload = await request.json() } catch { return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST') }

  const context = await getContext(request, WRITE_PERMISSIONS, payload)

  if (context.error) return context.error

  const validation = safeParse(inventoryCategorySchema(context.dictionary.validation), normalizePayload(payload))

  if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  try {
    const option = await prisma.$transaction(async transaction => {
      const value = valueFrom(validation.output.name)
      const created = await transaction.option.create({ data: { category: OPTION_TYPE, label: clean(validation.output.name), value, description: clean(validation.output.description) || null, is_active: validation.output.is_active }, select: optionSelect })

      await transaction.auditlog.create({ data: { user_id: context.authorization.session.user.id, action: 'INVENTORY_CATEGORY_CREATED', module: 'OPTIONS', details: { optionId: created.id, value } } })

      return created
    })

    return Response.json({ success: true, data: option, message: context.dictionary.categoryMessages.created }, { status: 201 })
  } catch (error) {
    if (error?.code === 'P2002') return errorResponse(context.dictionary.categoryMessages.duplicate, 409, 'DUPLICATE_CATEGORY')

    return errorResponse(context.dictionary.messages.operationFailed, 500, 'OPTION_CREATE_FAILED')
  }
}

export async function PUT(request) {
  let payload

  try { payload = await request.json() } catch { return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST') }

  const context = await getContext(request, WRITE_PERMISSIONS, payload)

  if (context.error) return context.error

  const id = context.params.get('id')
  const validation = safeParse(inventoryCategorySchema(context.dictionary.validation), normalizePayload(payload))

  if (!id) return errorResponse(context.dictionary.messages.notFound, 404, 'OPTION_NOT_FOUND')
  if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  try {
    const option = await prisma.$transaction(async transaction => {
      const current = await transaction.option.findFirst({ where: { id, category: OPTION_TYPE }, select: { id: true } })

      if (!current) return null

      const updated = await transaction.option.update({ where: { id }, data: { label: clean(validation.output.name), description: clean(validation.output.description) || null, is_active: validation.output.is_active }, select: optionSelect })

      await transaction.auditlog.create({ data: { user_id: context.authorization.session.user.id, action: 'INVENTORY_CATEGORY_UPDATED', module: 'OPTIONS', details: { optionId: id } } })

      return updated
    })

    if (!option) return errorResponse(context.dictionary.messages.notFound, 404, 'OPTION_NOT_FOUND')

    return Response.json({ success: true, data: option, message: context.dictionary.categoryMessages.updated })
  } catch {
    return errorResponse(context.dictionary.messages.operationFailed, 500, 'OPTION_UPDATE_FAILED')
  }
}

export async function PATCH(request) {
  let payload

  try { payload = await request.json() } catch { return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST') }

  const context = await getContext(request, WRITE_PERMISSIONS, payload)

  if (context.error) return context.error

  const id = context.params.get('id')
  const isActive = payload?.is_active

  if (!id || typeof isActive !== 'boolean') return errorResponse(context.dictionary.validation.required, 400, 'VALIDATION_ERROR')

  const option = await prisma.option.findFirst({ where: { id, category: OPTION_TYPE }, select: { id: true } })

  if (!option) return errorResponse(context.dictionary.messages.notFound, 404, 'OPTION_NOT_FOUND')

  const updated = await prisma.$transaction(async transaction => {
    const result = await transaction.option.update({ where: { id }, data: { is_active: isActive }, select: optionSelect })

    await transaction.auditlog.create({ data: { user_id: context.authorization.session.user.id, action: isActive ? 'INVENTORY_CATEGORY_ACTIVATED' : 'INVENTORY_CATEGORY_DEACTIVATED', module: 'OPTIONS', details: { optionId: id } } })

    return result
  })

  return Response.json({ success: true, data: updated, message: context.dictionary.categoryMessages.statusUpdated })
}

export async function DELETE(request) {
  const context = await getContext(request, DELETE_PERMISSIONS)

  if (context.error) return context.error

  const id = context.params.get('id')

  if (!id) return errorResponse(context.dictionary.messages.notFound, 404, 'OPTION_NOT_FOUND')

  const option = await prisma.option.findFirst({ where: { id, category: OPTION_TYPE }, select: { id: true, label: true, _count: { select: { inventory_categories: true } } } })

  if (!option) return errorResponse(context.dictionary.messages.notFound, 404, 'OPTION_NOT_FOUND')
  if (option._count.inventory_categories > 0) return errorResponse(context.dictionary.categoryMessages.inUse, 409, 'CATEGORY_IN_USE')

  await prisma.$transaction([
    prisma.option.delete({ where: { id } }),
    prisma.auditlog.create({ data: { user_id: context.authorization.session.user.id, action: 'INVENTORY_CATEGORY_DELETED', module: 'OPTIONS', details: { optionId: id, label: option.label } } })
  ])

  return Response.json({ success: true, message: context.dictionary.categoryMessages.deleted })
}

