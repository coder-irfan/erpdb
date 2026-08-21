import 'server-only'

import sanitizeHtml from 'sanitize-html'

import { Prisma } from '@prisma/client'

import { getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { convertToBaseCurrency, toFiniteNumber } from '@/utils/formatCurrency'

export const INVENTORY_READ_PERMISSIONS = ['finance:read', 'finance_inventory:read']
export const INVENTORY_WRITE_PERMISSIONS = ['finance:write', 'finance_inventory:write']
export const INVENTORY_DELETE_PERMISSIONS = ['finance:delete', 'finance_inventory:delete']

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

const numberString = (value, scale = 2) => value == null ? null : toFiniteNumber(value).toFixed(scale)
const iso = value => value?.toISOString() || null

export const getStockState = item => {
  const quantity = Number(item.quantity_in_stock || 0)
  const reorderLevel = Number(item.reorder_level || 0)

  if (quantity <= 0) return 'OUT_OF_STOCK'
  if (quantity <= reorderLevel) return 'LOW_STOCK'

  return 'IN_STOCK'
}

export const normalizeInventoryItem = item => ({
  ...item,
  unit_price: numberString(item.unit_price),
  amount_base: numberString(item.amount_base),
  exchange_rate: numberString(item.exchange_rate, 4),
  total_value: numberString(toFiniteNumber(item.unit_price) * item.quantity_in_stock),
  total_value_base: numberString(toFiniteNumber(item.amount_base) * item.quantity_in_stock),
  stock_state: getStockState(item),
  created_at: iso(item.created_at),
  updated_at: iso(item.updated_at)
})

export const ensureInventoryOptions = async () => {
  const defaults = [
    ['INVENTORY_CATEGORY', 'General', 'GENERAL', 'secondary', 1, true],
    ['INVENTORY_STATUS', 'In Stock', 'IN_STOCK', 'success', 1, true],
    ['INVENTORY_STATUS', 'Low Stock', 'LOW_STOCK', 'warning', 2, false],
    ['INVENTORY_STATUS', 'Out of Stock', 'OUT_OF_STOCK', 'error', 3, false]
  ]

  await prisma.$transaction(defaults.map(([category, label, value, colorCode, sortOrder, isDefault]) => prisma.option.upsert({
    where: { category_value: { category, value } },
    update: {},
    create: { category, label, value, color_code: colorCode, sort_order: sortOrder, is_default: isDefault, is_active: true }
  })))
}

export const inventoryPayload = (payload, setup) => ({
  name: payload?.name || '',
  sku_code: String(payload?.sku_code || '').trim().toUpperCase(),
  category_id: payload?.category_id || '',
  quantity_in_stock: String(payload?.quantity_in_stock ?? '0'),
  unit_price: String(payload?.unit_price ?? ''),
  reorder_level: String(payload?.reorder_level ?? '5'),
  status_id: payload?.status_id || '',
  currency: payload?.currency || setup.currency_code || 'AFN',
  exchange_rate: String(payload?.exchange_rate || setup.usd_afn_exchange_rate || '')
})

export const getInventoryOptions = async () => {
  await ensureInventoryOptions()

  const [categories, statuses, setup] = await Promise.all([
    prisma.option.findMany({ where: { category: 'INVENTORY_CATEGORY', is_active: true }, select: optionSelect, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }] }),
    prisma.option.findMany({ where: { category: 'INVENTORY_STATUS', is_active: true }, select: optionSelect, orderBy: [{ sort_order: 'asc' }, { label: 'asc' }] }),
    getCompanySetupRecord()
  ])

  return { categories, statuses, setup }
}

export const prepareInventoryData = async (values, messages, options, current = null) => {
  const category = options.categories.find(option => option.id === values.category_id)
  const requestedStatus = options.statuses.find(option => option.id === values.status_id)

  if (!category || !requestedStatus) return { success: false, error: messages.invalidRelation }

  const quantity = Number.parseInt(values.quantity_in_stock, 10)
  const reorderLevel = Number.parseInt(values.reorder_level, 10)
  const unitPrice = toFiniteNumber(values.unit_price)
  const exchangeRate = toFiniteNumber(values.exchange_rate)
  const stockState = getStockState({ quantity_in_stock: quantity, reorder_level: reorderLevel })
  const automaticStatus = options.statuses.find(option => option.value === stockState)

  if (!automaticStatus) return { success: false, error: messages.statusMissing }

  const statusId = stockState === 'IN_STOCK' && requestedStatus.value !== 'LOW_STOCK' && requestedStatus.value !== 'OUT_OF_STOCK'
    ? requestedStatus.id
    : automaticStatus.id

  return {
    success: true,
    data: {
      name: sanitizeHtml(values.name, { allowedTags: [], allowedAttributes: {} }).trim(),
      ...(values.sku_code && { sku_code: values.sku_code }),
      category_id: category.id,
      quantity_in_stock: quantity,
      unit_price: new Prisma.Decimal(unitPrice),
      status_id: statusId,
      reorder_level: reorderLevel,
      amount_base: new Prisma.Decimal(convertToBaseCurrency(unitPrice, values.currency, exchangeRate, 'USD')),
      currency: values.currency,
      exchange_rate: new Prisma.Decimal(exchangeRate),
      ...(current && !values.sku_code && { sku_code: current.sku_code })
    }
  }
}

export const nextInventorySku = async (client = prisma) => {
  const latest = await client.inventory.findFirst({ where: { sku_code: { startsWith: 'INV-' } }, select: { sku_code: true }, orderBy: { sku_code: 'desc' } })
  const sequence = Number.parseInt(latest?.sku_code.slice(4), 10) || 0

  return `INV-${String(sequence + 1).padStart(5, '0')}`
}
