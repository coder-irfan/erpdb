import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { getInventoryDictionary } from '@/data/dictionaries/inventory'
import { authorizeAction } from '@/libs/actionAuthorization'
import {
  getInventoryOptions,
  getStockState,
  INVENTORY_READ_PERMISSIONS,
  INVENTORY_WRITE_PERMISSIONS,
  inventoryPayload,
  inventorySelect,
  nextInventorySku,
  normalizeInventoryItem,
  prepareInventoryData
} from '@/libs/inventory'
import { prisma } from '@/libs/prisma'
import { inventoryItemSchema } from '@/schemas/inventory'
import { toFiniteNumber } from '@/utils/formatCurrency'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function GET(request) {
  const params = request.nextUrl.searchParams
  const locale = localeFrom(params.get('locale'))
  const dictionary = getInventoryDictionary(locale)
  const authorization = await authorizeAction(INVENTORY_READ_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  const search = (params.get('search') || '').trim()
  const categoryId = params.get('category_id') || ''
  const statusId = params.get('status_id') || ''
  const stockState = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].includes(params.get('stock_state')) ? params.get('stock_state') : ''
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.get('limit') || '10', 10) || 10))

  const where = {
    ...(categoryId && { category_id: categoryId }),
    ...(statusId && { status_id: statusId }),
    ...(search && { OR: [{ name: { contains: search } }, { sku_code: { contains: search } }] })
  }

  try {
    const options = await getInventoryOptions()

    const [filteredRows, allRows] = await Promise.all([
      prisma.inventory.findMany({ where, select: inventorySelect, orderBy: [{ updated_at: 'desc' }, { name: 'asc' }] }),
      prisma.inventory.findMany({ select: { quantity_in_stock: true, reorder_level: true, amount_base: true } })
    ])

    const matchingRows = stockState ? filteredRows.filter(item => getStockState(item) === stockState) : filteredRows
    const pagedRows = matchingRows.slice((page - 1) * limit, page * limit)

    const summary = allRows.reduce((totals, item) => {
      const state = getStockState(item)

      totals.totalItems += 1
      totals.totalValue += toFiniteNumber(item.amount_base) * item.quantity_in_stock
      if (state === 'LOW_STOCK') totals.lowStock += 1
      if (state === 'OUT_OF_STOCK') totals.outOfStock += 1

      return totals
    }, { totalItems: 0, totalValue: 0, lowStock: 0, outOfStock: 0 })

    return Response.json({
      success: true,
      data: {
        items: pagedRows.map(normalizeInventoryItem),
        totalCount: matchingRows.length,
        page,
        summary,
        options: {
          categories: options.categories,
          statuses: options.statuses,
          baseCurrency: options.setup.currency_code || 'AFN',
          exchangeRate: options.setup.usd_afn_exchange_rate || '65.0000'
        }
      }
    })
  } catch {
    return errorResponse(dictionary.messages.loadFailed, 500, 'INVENTORY_LOAD_FAILED')
  }
}

export async function POST(request) {
  let payload

  try { payload = await request.json() } catch { return errorResponse('Invalid request body.', 400, 'INVALID_REQUEST') }

  const locale = localeFrom(payload?.locale)
  const dictionary = getInventoryDictionary(locale)
  const authorization = await authorizeAction(INVENTORY_WRITE_PERMISSIONS)

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const options = await getInventoryOptions()
    const validation = safeParse(inventoryItemSchema(dictionary.validation), inventoryPayload(payload, options.setup))

    if (!validation.success) return errorResponse(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

    const prepared = await prepareInventoryData(validation.output, dictionary.validation, options)

    if (!prepared.success) return errorResponse(prepared.error, 400, 'VALIDATION_ERROR')

    let created

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        created = await prisma.$transaction(async transaction => {
          const skuCode = prepared.data.sku_code || await nextInventorySku(transaction)
          const item = await transaction.inventory.create({ data: { ...prepared.data, sku_code: skuCode }, select: inventorySelect })

          await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'INVENTORY_ITEM_CREATED', module: 'INVENTORY', details: { inventoryId: item.id, skuCode, quantity: item.quantity_in_stock } } })

          return item
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
        break
      } catch (error) {
        if (error?.code !== 'P2002' || prepared.data.sku_code || attempt === 2) throw error
      }
    }

    return Response.json({ success: true, data: normalizeInventoryItem(created), message: dictionary.messages.created }, { status: 201 })
  } catch (error) {
    if (error?.code === 'P2002') return errorResponse(dictionary.messages.duplicateSku, 409, 'DUPLICATE_SKU')

    return errorResponse(dictionary.messages.operationFailed, 500, 'INVENTORY_CREATE_FAILED')
  }
}
