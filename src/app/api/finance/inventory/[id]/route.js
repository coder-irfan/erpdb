import { safeParse } from 'valibot'

import { getInventoryDictionary } from '@/data/dictionaries/inventory'
import { authorizeAction } from '@/libs/actionAuthorization'
import {
  getInventoryOptions,
  getStockState,
  INVENTORY_DELETE_PERMISSIONS,
  INVENTORY_WRITE_PERMISSIONS,
  inventoryPayload,
  inventorySelect,
  normalizeInventoryItem,
  prepareInventoryData
} from '@/libs/inventory'
import { prisma } from '@/libs/prisma'
import { inventoryAdjustmentSchema, inventoryItemSchema } from '@/schemas/inventory'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function PUT(request, routeContext) {
  const { id } = await routeContext.params
  let payload

  try { payload = await request.json() } catch { return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST') }

  const dictionary = getInventoryDictionary(localeFrom(payload?.locale))
  const authorization = await authorizeAction(INVENTORY_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const [current, options] = await Promise.all([prisma.inventory.findUnique({ where: { id }, select: inventorySelect }), getInventoryOptions()])

    if (!current) return errorResponse(dictionary.messages.notFound, 404, 'INVENTORY_NOT_FOUND')

    const validation = safeParse(inventoryItemSchema(dictionary.validation), inventoryPayload(payload, options.setup))

    if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

    const prepared = await prepareInventoryData(validation.output, dictionary.validation, options, current)

    if (!prepared.success) return errorResponse(prepared.error, 400, 'VALIDATION_ERROR')

    const updated = await prisma.$transaction(async transaction => {
      const item = await transaction.inventory.update({ where: { id }, data: prepared.data, select: inventorySelect })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'INVENTORY_ITEM_UPDATED', module: 'INVENTORY', details: { inventoryId: id, skuCode: item.sku_code, quantity: item.quantity_in_stock } } })

      return item
    })

    return Response.json({ success: true, data: normalizeInventoryItem(updated), message: dictionary.messages.updated })
  } catch (error) {
    if (error?.code === 'P2002') return errorResponse(dictionary.messages.duplicateSku, 409, 'DUPLICATE_SKU')

    return errorResponse(dictionary.messages.operationFailed, 500, 'INVENTORY_UPDATE_FAILED')
  }
}

export async function PATCH(request, routeContext) {
  const { id } = await routeContext.params
  let payload

  try { payload = await request.json() } catch { return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST') }

  const dictionary = getInventoryDictionary(localeFrom(payload?.locale))
  const authorization = await authorizeAction(INVENTORY_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  const signedDelta = payload?.direction === 'OUT' ? `-${String(payload?.quantity_delta || '').replace(/^-/, '')}` : String(payload?.quantity_delta || '').replace(/^-/, '')
  const validation = safeParse(inventoryAdjustmentSchema(dictionary.validation), { quantity_delta: signedDelta, direction: payload?.direction })

  if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  try {
    const options = await getInventoryOptions()
    const statusByValue = new Map(options.statuses.map(option => [option.value, option]))

    const result = await prisma.$transaction(async transaction => {
      const current = await transaction.inventory.findUnique({ where: { id }, select: inventorySelect })

      if (!current) return { error: 'NOT_FOUND' }

      const delta = Number.parseInt(validation.output.quantity_delta, 10)
      const nextQuantity = current.quantity_in_stock + delta

      if (nextQuantity < 0) return { error: 'INSUFFICIENT_STOCK' }

      const stockState = getStockState({ quantity_in_stock: nextQuantity, reorder_level: current.reorder_level })
      const automaticStatus = statusByValue.get(stockState)

      if (!automaticStatus) return { error: 'STATUS_MISSING' }

      const item = await transaction.inventory.update({ where: { id }, data: { quantity_in_stock: nextQuantity, status_id: automaticStatus.id }, select: inventorySelect })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'INVENTORY_QUANTITY_ADJUSTED', module: 'INVENTORY', details: { inventoryId: id, skuCode: item.sku_code, direction: validation.output.direction, adjustment: Math.abs(delta), previousQuantity: current.quantity_in_stock, newQuantity: nextQuantity } } })

      return { item }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (result.error === 'NOT_FOUND') return errorResponse(dictionary.messages.notFound, 404, 'INVENTORY_NOT_FOUND')
    if (result.error === 'INSUFFICIENT_STOCK') return errorResponse(dictionary.messages.insufficientStock, 409, 'INSUFFICIENT_STOCK')
    if (result.error === 'STATUS_MISSING') return errorResponse(dictionary.validation.statusMissing, 409, 'STATUS_NOT_CONFIGURED')

    return Response.json({ success: true, data: normalizeInventoryItem(result.item), message: dictionary.messages.adjusted })
  } catch {
    return errorResponse(dictionary.messages.operationFailed, 500, 'INVENTORY_ADJUST_FAILED')
  }
}

export async function DELETE(request, routeContext) {
  const { id } = await routeContext.params
  const dictionary = getInventoryDictionary(localeFrom(request.nextUrl.searchParams.get('locale')))
  const authorization = await authorizeAction(INVENTORY_DELETE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  const current = await prisma.inventory.findUnique({ where: { id }, select: { id: true, name: true, sku_code: true } })

  if (!current) return errorResponse(dictionary.messages.notFound, 404, 'INVENTORY_NOT_FOUND')

  await prisma.$transaction([
    prisma.inventory.delete({ where: { id } }),
    prisma.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'INVENTORY_ITEM_DELETED', module: 'INVENTORY', details: { inventoryId: id, skuCode: current.sku_code, name: current.name } } })
  ])

  return Response.json({ success: true, message: dictionary.messages.deleted })
}
