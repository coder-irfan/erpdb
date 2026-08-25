import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { getInventoryDictionary } from '@/data/dictionaries/inventory'
import { authorizeAction } from '@/libs/actionAuthorization'
import {
  ensureInventoryLedgerBaseline,
  getInventoryBalances,
  getInventoryOptions,
  INVENTORY_DELETE_PERMISSIONS,
  INVENTORY_WRITE_PERMISSIONS,
  inventoryPayload,
  inventorySelect,
  normalizeInventoryItem,
  prepareInventoryData,
  recordInventoryMovement
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
    await ensureInventoryLedgerBaseline()
    const [current, options] = await Promise.all([prisma.inventory.findUnique({ where: { id }, select: inventorySelect }), getInventoryOptions()])

    if (!current) return errorResponse(dictionary.messages.notFound, 404, 'INVENTORY_NOT_FOUND')

    const balances = await getInventoryBalances(prisma, [id])
    const currentWithLedgerBalance = { ...current, quantity_in_stock: balances.get(id) || 0 }

    const validation = safeParse(inventoryItemSchema(dictionary.validation), inventoryPayload(payload, options.setup))

    if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

    const prepared = await prepareInventoryData(validation.output, dictionary.validation, options, currentWithLedgerBalance)

    if (!prepared.success) return errorResponse(prepared.error, 400, 'VALIDATION_ERROR')

    const updated = await prisma.$transaction(async transaction => {
      const item = await transaction.inventory.update({ where: { id }, data: prepared.data, select: inventorySelect })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'INVENTORY_ITEM_UPDATED', module: 'INVENTORY', details: { inventoryId: id, skuCode: item.sku_code, quantity: item.quantity_in_stock } } })

      return item
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

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

  const movementType = String(
    payload?.movement_type || (payload?.direction === 'OUT' ? 'DEDUCTION' : 'ADDITION')
  ).toUpperCase()

  const validation = safeParse(inventoryAdjustmentSchema(dictionary.validation), {
    quantity_delta: signedDelta,
    direction: payload?.direction,
    movement_type: movementType,
    occurred_at: payload?.occurred_at || '',
    reference_id: payload?.reference_id || '',
    related_inventory_id: payload?.related_inventory_id || '',
    notes: payload?.notes || ''
  })

  if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  if (validation.output.movement_type.startsWith('TRANSFER_')) {
    return errorResponse(dictionary.validation.adjustmentInvalid, 400, 'TRANSFER_ENDPOINT_REQUIRED')
  }

  const occurredAt = validation.output.occurred_at ? new Date(validation.output.occurred_at) : new Date()

  if (Number.isNaN(occurredAt.getTime())) {
    return errorResponse(dictionary.validation.adjustmentInvalid, 400, 'INVALID_MOVEMENT_DATE')
  }

  try {
    await getInventoryOptions()

    const result = await prisma.$transaction(async transaction => {
      const movement = await recordInventoryMovement(transaction, {
        inventoryId: id,
        movementType: validation.output.movement_type,
        direction: validation.output.direction,
        quantity: Math.abs(Number.parseInt(validation.output.quantity_delta, 10)),
        occurredAt,
        referenceId: validation.output.reference_id || null,
        relatedInventoryId: validation.output.related_inventory_id || null,
        notes: validation.output.notes,
        createdByUserId: authorization.session.user.id
      })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'INVENTORY_MOVEMENT_RECORDED', module: 'INVENTORY', details: { inventoryId: id, movementId: movement.movement.id, movementType: validation.output.movement_type, direction: validation.output.direction, quantity: movement.movement.quantity, previousQuantity: movement.movement.quantity_before, newQuantity: movement.movement.quantity_after } } })

      return movement
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return Response.json({ success: true, data: normalizeInventoryItem(result.item), message: dictionary.messages.adjusted })
  } catch (error) {
    if (error?.message === 'INVENTORY_NOT_FOUND') return errorResponse(dictionary.messages.notFound, 404, 'INVENTORY_NOT_FOUND')
    if (error?.message === 'INSUFFICIENT_STOCK') return errorResponse(dictionary.messages.insufficientStock, 409, 'INSUFFICIENT_STOCK')
    if (error?.message === 'STATUS_NOT_CONFIGURED') return errorResponse(dictionary.validation.statusMissing, 409, 'STATUS_NOT_CONFIGURED')
    if (['INVALID_INVENTORY_MOVEMENT', 'INVALID_INVENTORY_QUANTITY', 'INVALID_INVENTORY_MOVEMENT_DATE', 'BACKDATED_INVENTORY_MOVEMENT'].includes(error?.message)) return errorResponse(dictionary.validation.adjustmentInvalid, 400, error.message)

    return errorResponse(dictionary.messages.operationFailed, 500, 'INVENTORY_ADJUST_FAILED')
  }
}

export async function DELETE(request, routeContext) {
  const { id } = await routeContext.params
  const dictionary = getInventoryDictionary(localeFrom(request.nextUrl.searchParams.get('locale')))
  const authorization = await authorizeAction(INVENTORY_DELETE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  const current = await prisma.inventory.findUnique({
    where: { id },
    select: { id: true, name: true, sku_code: true, _count: { select: { movements: true } } }
  })

  if (!current) return errorResponse(dictionary.messages.notFound, 404, 'INVENTORY_NOT_FOUND')

  if (current._count.movements > 0) {
    return errorResponse(dictionary.messages.deleteBlocked || dictionary.messages.operationFailed, 409, 'INVENTORY_HAS_MOVEMENTS')
  }

  await prisma.$transaction([
    prisma.inventory.delete({ where: { id } }),
    prisma.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'INVENTORY_ITEM_DELETED', module: 'INVENTORY', details: { inventoryId: id, skuCode: current.sku_code, name: current.name } } })
  ])

  return Response.json({ success: true, message: dictionary.messages.deleted })
}
