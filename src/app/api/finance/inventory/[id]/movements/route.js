import { randomUUID } from 'node:crypto'

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { getInventoryDictionary } from '@/data/dictionaries/inventory'
import { authorizeAction } from '@/libs/actionAuthorization'
import {
  ensureInventoryLedgerBaseline,
  getInventoryOptions,
  INVENTORY_READ_PERMISSIONS,
  INVENTORY_WRITE_PERMISSIONS,
  inventoryMovementSelect,
  normalizeInventoryItem,
  normalizeInventoryMovement,
  recordInventoryMovement
} from '@/libs/inventory'
import { prisma } from '@/libs/prisma'
import { inventoryAdjustmentSchema } from '@/schemas/inventory'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function GET(request, routeContext) {
  const { id } = await routeContext.params
  const dictionary = getInventoryDictionary(localeFrom(request.nextUrl.searchParams.get('locale')))
  const authorization = await authorizeAction(INVENTORY_READ_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  await ensureInventoryLedgerBaseline()

  const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('limit') || '25', 10) || 25))

  const [item, movements, totalCount] = await Promise.all([
    prisma.inventory.findUnique({ where: { id }, select: { id: true } }),
    prisma.inventorymovement.findMany({
      where: { inventory_id: id },
      select: inventoryMovementSelect,
      orderBy: [{ occurred_at: 'desc' }, { created_at: 'desc' }],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.inventorymovement.count({ where: { inventory_id: id } })
  ])

  if (!item) return errorResponse(dictionary.messages.notFound, 404, 'INVENTORY_NOT_FOUND')

  return Response.json({
    success: true,
    data: { movements: movements.map(normalizeInventoryMovement), totalCount, page }
  })
}

export async function POST(request, routeContext) {
  const { id } = await routeContext.params
  let payload

  try { payload = await request.json() } catch { return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST') }

  const dictionary = getInventoryDictionary(localeFrom(payload?.locale))
  const authorization = await authorizeAction(INVENTORY_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  const isTransfer = String(payload?.movement_type || '').toUpperCase() === 'TRANSFER_OUT'
  const direction = isTransfer ? 'OUT' : String(payload?.direction || '').toUpperCase()

  const signedQuantity = direction === 'OUT'
    ? `-${String(payload?.quantity || payload?.quantity_delta || '').replace(/^-/, '')}`
    : String(payload?.quantity || payload?.quantity_delta || '').replace(/^-/, '')

  const validation = safeParse(inventoryAdjustmentSchema(dictionary.validation), {
    quantity_delta: signedQuantity,
    direction,
    movement_type: String(payload?.movement_type || (direction === 'OUT' ? 'DEDUCTION' : 'ADDITION')).toUpperCase(),
    occurred_at: payload?.occurred_at || '',
    reference_id: payload?.reference_id || '',
    related_inventory_id: payload?.destination_inventory_id || payload?.related_inventory_id || '',
    notes: payload?.notes || ''
  })

  if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  if (validation.output.movement_type === 'TRANSFER_IN') {
    return errorResponse(dictionary.validation.adjustmentInvalid, 400, 'TRANSFER_OUT_REQUIRED')
  }

  if (isTransfer && (!validation.output.related_inventory_id || validation.output.related_inventory_id === id)) {
    return errorResponse(dictionary.validation.invalidRelation, 400, 'INVALID_TRANSFER_DESTINATION')
  }

  const occurredAt = validation.output.occurred_at ? new Date(validation.output.occurred_at) : new Date()

  if (Number.isNaN(occurredAt.getTime())) {
    return errorResponse(dictionary.validation.adjustmentInvalid, 400, 'INVALID_MOVEMENT_DATE')
  }

  try {
    await getInventoryOptions()
    const referenceId = validation.output.reference_id || (isTransfer ? `transfer-${randomUUID()}` : null)

    const result = await prisma.$transaction(async transaction => {
      const source = await recordInventoryMovement(transaction, {
        inventoryId: id,
        movementType: validation.output.movement_type,
        direction: validation.output.direction,
        quantity: Math.abs(Number.parseInt(validation.output.quantity_delta, 10)),
        occurredAt,
        referenceId,
        relatedInventoryId: validation.output.related_inventory_id || null,
        notes: validation.output.notes,
        createdByUserId: authorization.session.user.id
      })

      let destination = null

      if (isTransfer) {
        destination = await recordInventoryMovement(transaction, {
          inventoryId: validation.output.related_inventory_id,
          movementType: 'TRANSFER_IN',
          direction: 'IN',
          quantity: source.movement.quantity,
          occurredAt: source.movement.occurred_at,
          referenceId,
          relatedInventoryId: id,
          notes: validation.output.notes,
          createdByUserId: authorization.session.user.id
        })
      }

      await transaction.auditlog.create({
        data: {
          user_id: authorization.session.user.id,
          action: isTransfer ? 'INVENTORY_TRANSFER_RECORDED' : 'INVENTORY_MOVEMENT_RECORDED',
          module: 'INVENTORY',
          details: {
            inventoryId: id,
            movementId: source.movement.id,
            destinationInventoryId: destination?.item.id || null,
            destinationMovementId: destination?.movement.id || null,
            referenceId,
            movementType: validation.output.movement_type,
            quantity: source.movement.quantity
          }
        }
      })

      return { source, destination }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return Response.json({
      success: true,
      data: {
        item: normalizeInventoryItem(result.source.item),
        movement: normalizeInventoryMovement(result.source.movement),
        destination: result.destination
          ? {
              item: normalizeInventoryItem(result.destination.item),
              movement: normalizeInventoryMovement(result.destination.movement)
            }
          : null
      },
      message: dictionary.messages.adjusted
    }, { status: 201 })
  } catch (error) {
    if (error?.message === 'INVENTORY_NOT_FOUND') return errorResponse(dictionary.messages.notFound, 404, 'INVENTORY_NOT_FOUND')
    if (error?.message === 'INSUFFICIENT_STOCK') return errorResponse(dictionary.messages.insufficientStock, 409, 'INSUFFICIENT_STOCK')
    if (error?.message === 'STATUS_NOT_CONFIGURED') return errorResponse(dictionary.validation.statusMissing, 409, 'STATUS_NOT_CONFIGURED')
    if (['INVALID_INVENTORY_MOVEMENT', 'INVALID_INVENTORY_QUANTITY', 'INVALID_INVENTORY_MOVEMENT_DATE', 'BACKDATED_INVENTORY_MOVEMENT'].includes(error?.message)) return errorResponse(dictionary.validation.adjustmentInvalid, 400, error.message)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return errorResponse(dictionary.validation.invalidRelation, 409, 'INVALID_RELATION')

    return errorResponse(dictionary.messages.operationFailed, 500, 'INVENTORY_MOVEMENT_FAILED')
  }
}
