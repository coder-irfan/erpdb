import 'server-only'

import sanitizeHtml from 'sanitize-html'

import { Prisma } from '@prisma/client'

import { getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { serializeData } from '@/libs/serialize'
import { nextSequentialNumber } from '@/libs/sequentialNumbers'
import { SYSTEM_BASE_CURRENCY, convertAfnToUsd, convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'
import { formatLedgerText } from '@/utils/ledgerDisplay'
import { calculateStockAfterMovement } from '@/utils/inventoryCalculations'

export const INVENTORY_READ_PERMISSIONS = ['finance:read', 'finance_inventory:read']
export const INVENTORY_WRITE_PERMISSIONS = ['finance:write', 'finance_inventory:write']
export const INVENTORY_DELETE_PERMISSIONS = ['finance:delete', 'finance_inventory:delete']
export const INVENTORY_MOVEMENT_TYPES = [
  'OPENING_BALANCE',
  'ADDITION',
  'DEDUCTION',
  'DAMAGE',
  'RETURN',
  'TRANSFER_IN',
  'TRANSFER_OUT'
]
export const INVENTORY_STOCK_OUT_REASONS = [
  'ASSIGNED_TO_STAFF',
  'CLIENT_PROJECT',
  'INTERNAL_OFFICE_USE',
  'DAMAGED_LOST_WRITTEN_OFF'
]

const IN_MOVEMENT_TYPES = new Set(['OPENING_BALANCE', 'ADDITION', 'RETURN', 'TRANSFER_IN'])
const OUT_MOVEMENT_TYPES = new Set(['DEDUCTION', 'DAMAGE', 'TRANSFER_OUT'])

export const optionSelect = { id: true, label: true, value: true, color_code: true, is_active: true, is_default: true }

export const inventorySelect = {
  id: true,
  name: true,
  category_id: true,
  sku_code: true,
  quantity_in_stock: true,
  unit_price: true,
  status_id: true,
  reorder_level: true,
  created_at: true,
  updated_at: true,
  amount_base: true,
  currency: true,
  exchange_rate: true,
  category: { select: optionSelect },
  status: { select: optionSelect }
}

export const inventoryMovementSelect = {
  id: true,
  inventory_id: true,
  movement_type: true,
  direction: true,
  quantity: true,
  quantity_before: true,
  quantity_after: true,
  occurred_at: true,
  reference_id: true,
  related_inventory_id: true,
  source_vendor: true,
  reason: true,
  assigned_staff_id: true,
  notes: true,
  created_by_user_id: true,
  created_at: true,
  created_by_user: { select: { id: true, name: true, email: true } },
  assigned_staff: { select: { id: true, first_name: true, last_name: true, position: true } }
}

const numberString = (value, scale = 2) => value == null ? null : toFiniteNumber(value).toFixed(scale)
const iso = value => value?.toISOString() || null

export const getStockState = item => {
  const quantity = Number(item.quantity_in_stock || 0)
  const reorderLevel = Number(item.reorder_level || 0)

  if (quantity <= 0) return 'OUT_OF_STOCK'
  if (quantity <= reorderLevel) return 'LOW_STOCK'

  return 'IN_STOCK'
}

export const normalizeInventoryItem = item => serializeData({
  ...item,
  unit_price: numberString(item.unit_price),
  amount_base: numberString(item.amount_base),
  exchange_rate: numberString(item.exchange_rate, 4),
  total_value: numberString(toFiniteNumber(item.unit_price) * item.quantity_in_stock),
  total_value_base: numberString(toFiniteNumber(item.amount_base) * item.quantity_in_stock),
  unit_value_usd: numberString(item.currency === 'USD' ? item.unit_price : convertAfnToUsd(item.unit_price, item.exchange_rate)),
  total_value_usd: numberString(
    (item.currency === 'USD' ? toFiniteNumber(item.unit_price) : convertAfnToUsd(item.unit_price, item.exchange_rate)) * item.quantity_in_stock
  ),
  stock_state: getStockState(item),
  created_at: iso(item.created_at),
  updated_at: iso(item.updated_at)
})

export const normalizeInventoryMovement = movement => serializeData({
  ...movement,
  source_vendor: formatLedgerText(movement.source_vendor),
  reason: formatLedgerText(movement.reason),
  assigned_staff: movement.assigned_staff
    ? { ...movement.assigned_staff, full_name: `${movement.assigned_staff.first_name} ${movement.assigned_staff.last_name}`.trim() }
    : null,
  notes: formatLedgerText(movement.notes),
  occurred_at: iso(movement.occurred_at),
  created_at: iso(movement.created_at)
})

export const getInventoryBalances = async (client, inventoryIds, asOf = null) => {
  if (!inventoryIds.length) return new Map()

  const groups = await client.inventorymovement.groupBy({
    by: ['inventory_id', 'direction'],
    where: {
      inventory_id: { in: inventoryIds },
      ...(asOf ? { occurred_at: { lte: asOf } } : {})
    },
    _sum: { quantity: true }
  })

  const balances = new Map(inventoryIds.map(id => [id, 0]))

  for (const group of groups) {
    const signedQuantity = (group._sum.quantity || 0) * (group.direction === 'OUT' ? -1 : 1)

    balances.set(group.inventory_id, (balances.get(group.inventory_id) || 0) + signedQuantity)
  }

  return balances
}

export const ensureInventoryLedgerBaseline = async () => {
  const legacyItems = await prisma.inventory.findMany({
    where: { quantity_in_stock: { gt: 0 }, movements: { none: {} } },
    select: { id: true, quantity_in_stock: true, created_at: true },
    take: 5000
  })

  if (!legacyItems.length) return 0

  return prisma.$transaction(async transaction => {
    let created = 0

    for (const item of legacyItems) {
      const movementCount = await transaction.inventorymovement.count({
        where: { inventory_id: item.id }
      })

      if (movementCount > 0) continue

      await transaction.inventorymovement.create({
        data: {
          inventory_id: item.id,
          movement_type: 'OPENING_BALANCE',
          direction: 'IN',
          quantity: item.quantity_in_stock,
          quantity_before: 0,
          quantity_after: item.quantity_in_stock,
          occurred_at: item.created_at,
          reference_id: `legacy-${item.id}`,
          notes: 'Opening balance migrated from the legacy stock quantity.'
        }
      })
      created += 1
    }

    return created
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export const recordInventoryMovement = async (
  transaction,
  {
    inventoryId,
    movementType,
    direction,
    quantity,
    occurredAt = new Date(),
    referenceId = null,
    relatedInventoryId = null,
    sourceVendor = null,
    reason = null,
    assignedStaffId = null,
    notes = null,
    createdByUserId = null
  }
) => {
  const item = await transaction.inventory.findUnique({
    where: { id: inventoryId },
    select: { id: true, quantity_in_stock: true, reorder_level: true }
  })

  if (!item) throw new Error('INVENTORY_NOT_FOUND')

  const normalizedType = String(movementType || '').toUpperCase()
  const normalizedDirection = String(direction || '').toUpperCase()
  const movementQuantity = Number.parseInt(quantity, 10)

  if (!INVENTORY_MOVEMENT_TYPES.includes(normalizedType) || !['IN', 'OUT'].includes(normalizedDirection)) {
    throw new Error('INVALID_INVENTORY_MOVEMENT')
  }

  if (
    (normalizedDirection === 'IN' && !IN_MOVEMENT_TYPES.has(normalizedType)) ||
    (normalizedDirection === 'OUT' && !OUT_MOVEMENT_TYPES.has(normalizedType))
  ) {
    throw new Error('INVALID_INVENTORY_MOVEMENT')
  }

  if (!Number.isInteger(movementQuantity) || movementQuantity <= 0) {
    throw new Error('INVALID_INVENTORY_QUANTITY')
  }

  const normalizedReason = String(reason || '').toUpperCase()

  if (normalizedDirection === 'OUT' && normalizedType !== 'TRANSFER_OUT' && !INVENTORY_STOCK_OUT_REASONS.includes(normalizedReason)) {
    throw new Error('INVALID_INVENTORY_REASON')
  }

  if (normalizedDirection === 'IN' && (normalizedReason || assignedStaffId)) {
    throw new Error('INVALID_INVENTORY_REASON')
  }

  if (normalizedReason === 'ASSIGNED_TO_STAFF') {
    const staff = assignedStaffId
      ? await transaction.hrmstaff.findFirst({ where: { id: assignedStaffId, status: 'ACTIVE' }, select: { id: true } })
      : null

    if (!staff) throw new Error('INVALID_INVENTORY_ASSIGNEE')
  } else if (assignedStaffId) {
    throw new Error('INVALID_INVENTORY_ASSIGNEE')
  }

  const existingMovements = await transaction.inventorymovement.findMany({
    where: { inventory_id: inventoryId },
    select: { direction: true, quantity: true, occurred_at: true }
  })

  const latestOccurredAt = existingMovements.reduce(
    (latest, movement) => (!latest || movement.occurred_at > latest ? movement.occurred_at : latest),
    null
  )

  if (Number.isNaN(occurredAt?.getTime?.())) throw new Error('INVALID_INVENTORY_MOVEMENT_DATE')
  if (latestOccurredAt && occurredAt < latestOccurredAt) throw new Error('BACKDATED_INVENTORY_MOVEMENT')

  let currentBalance = existingMovements.reduce(
    (total, movement) => total + movement.quantity * (movement.direction === 'OUT' ? -1 : 1),
    0
  )

  if (existingMovements.length === 0 && item.quantity_in_stock > 0) {
    await transaction.inventorymovement.create({
      data: {
        inventory_id: inventoryId,
        movement_type: 'OPENING_BALANCE',
        direction: 'IN',
        quantity: item.quantity_in_stock,
        quantity_before: 0,
        quantity_after: item.quantity_in_stock,
        reference_id: `legacy-${inventoryId}`,
        notes: 'Opening balance migrated from the legacy stock quantity.'
      }
    })
    currentBalance = item.quantity_in_stock
  }

  const nextBalance = calculateStockAfterMovement(currentBalance, movementQuantity, normalizedDirection)

  const stockState = getStockState({ quantity_in_stock: nextBalance, reorder_level: item.reorder_level })

  const automaticStatus = await transaction.option.findUnique({
    where: { category_value: { category: 'INVENTORY_STATUS', value: stockState } },
    select: { id: true }
  })

  if (!automaticStatus) throw new Error('STATUS_NOT_CONFIGURED')

  const movement = await transaction.inventorymovement.create({
    data: {
      inventory_id: inventoryId,
      movement_type: normalizedType,
      direction: normalizedDirection,
      quantity: movementQuantity,
      quantity_before: currentBalance,
      quantity_after: nextBalance,
      occurred_at: occurredAt,
      reference_id: referenceId,
      related_inventory_id: normalizedType.startsWith('TRANSFER_') ? relatedInventoryId : null,
      source_vendor: normalizedDirection === 'IN' ? sanitizeHtml(sourceVendor || '', { allowedTags: [], allowedAttributes: {} }).trim() || null : null,
      reason: normalizedDirection === 'OUT' ? normalizedReason || null : null,
      assigned_staff_id: normalizedReason === 'ASSIGNED_TO_STAFF' ? assignedStaffId : null,
      notes: sanitizeHtml(notes || '', { allowedTags: [], allowedAttributes: {} }).trim() || null,
      created_by_user_id: createdByUserId
    },
    select: inventoryMovementSelect
  })

  const updatedItem = await transaction.inventory.update({
    where: { id: inventoryId },
    data: { quantity_in_stock: nextBalance, status_id: automaticStatus.id },
    select: inventorySelect
  })

  return { item: updatedItem, movement }
}

export const inventoryPayload = (payload, setup) => ({
  name: payload?.name || '',
  sku_code: String(payload?.sku_code || '').trim().toUpperCase(),
  category_id: payload?.category_id || '',
  quantity_in_stock: String(payload?.quantity_in_stock ?? '0'),
  unit_price: String(payload?.unit_price ?? ''),
  reorder_level: String(payload?.reorder_level ?? '5'),
  currency: payload?.currency || SYSTEM_BASE_CURRENCY,
  exchange_rate: String(payload?.exchange_rate || setup.usd_afn_exchange_rate || '')
})

export const getInventoryOptions = async () => {
  const [categories, statuses, staff, setup] = await Promise.all([
    prisma.option.findMany({ where: { category: 'INVENTORY_CATEGORY', is_active: true }, select: optionSelect, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }] }),
    prisma.option.findMany({ where: { category: 'INVENTORY_STATUS', is_active: true }, select: optionSelect, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }] }),
    prisma.hrmstaff.findMany({ where: { status: 'ACTIVE' }, select: { id: true, first_name: true, last_name: true, position: true }, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }], take: 1000 }),
    getCompanySetupRecord()
  ])

  return { categories, statuses, staff: staff.map(item => ({ ...item, full_name: `${item.first_name} ${item.last_name}`.trim() })), setup }
}

export const prepareInventoryData = async (values, messages, options, current = null) => {
  const category = options.categories.find(option => option.id === values.category_id)

  if (!category) return { success: false, error: messages.invalidRelation }

  const quantity = Number.parseInt(values.quantity_in_stock, 10)
  const reorderLevel = Number.parseInt(values.reorder_level, 10)
  const unitPrice = toFiniteNumber(values.unit_price)
  const exchangeRate = toFiniteNumber(values.exchange_rate)

  if (current && quantity !== current.quantity_in_stock) {
    return { success: false, error: messages.stockLocked || messages.quantityInvalid }
  }

  const effectiveQuantity = current ? current.quantity_in_stock : 0
  const stockState = getStockState({ quantity_in_stock: effectiveQuantity, reorder_level: reorderLevel })
  const automaticStatus = options.statuses.find(option => option.value === stockState)

  if (!automaticStatus) return { success: false, error: messages.statusMissing }

  return {
    success: true,
    openingQuantity: current ? 0 : quantity,
    data: {
      name: sanitizeHtml(values.name, { allowedTags: [], allowedAttributes: {} }).trim(),
      ...(values.sku_code && { sku_code: values.sku_code }),
      category_id: category.id,
      quantity_in_stock: effectiveQuantity,
      unit_price: new Prisma.Decimal(unitPrice),
      status_id: automaticStatus.id,
      reorder_level: reorderLevel,
      amount_base: new Prisma.Decimal(
        convertToBaseCurrency(unitPrice, values.currency, exchangeRate, SYSTEM_BASE_CURRENCY)
      ),
      currency: values.currency,
      exchange_rate: new Prisma.Decimal(exchangeRate),
      ...(current && !values.sku_code && { sku_code: current.sku_code })
    }
  }
}

export const nextInventorySku = async (client = prisma) => {
  return nextSequentialNumber(client, 'inventory', { prefix: 'ITM-', digits: 3 })
}
