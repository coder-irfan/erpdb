import { boolean, literal, maxLength, object, optional, picklist, pipe, regex, string, trim, union } from 'valibot'

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/
const POSITIVE_MONEY_PATTERN = /^(?=.*[1-9])\d+(?:\.\d{1,4})?$/
const INTEGER_PATTERN = /^\d+$/
const SIGNED_INTEGER_PATTERN = /^-?[1-9]\d*$/
const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$/
const OPTION_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &()/_-]{1,99}$/

export const inventoryItemSchema = messages => object({
  name: pipe(string(messages.required), trim(), maxLength(150, messages.nameTooLong)),
  sku_code: union([literal(''), pipe(string(), trim(), regex(SKU_PATTERN, messages.skuInvalid))]),
  category_id: pipe(string(messages.required), trim()),
  quantity_in_stock: pipe(string(messages.quantityInvalid), trim(), regex(INTEGER_PATTERN, messages.quantityInvalid)),
  unit_price: pipe(string(messages.priceInvalid), trim(), regex(POSITIVE_MONEY_PATTERN, messages.priceInvalid)),
  reorder_level: pipe(string(messages.quantityInvalid), trim(), regex(INTEGER_PATTERN, messages.quantityInvalid)),
  currency: picklist(['AFN', 'USD'], messages.currencyInvalid),
  exchange_rate: pipe(string(messages.rateInvalid), trim(), regex(POSITIVE_MONEY_PATTERN, messages.rateInvalid))
})

export const inventoryAdjustmentSchema = messages => object({
  quantity_delta: pipe(string(messages.adjustmentInvalid), trim(), regex(SIGNED_INTEGER_PATTERN, messages.adjustmentInvalid)),
  direction: picklist(['IN', 'OUT'], messages.required),
  movement_type: optional(
    picklist(['ADDITION', 'DEDUCTION', 'DAMAGE', 'RETURN', 'TRANSFER_IN', 'TRANSFER_OUT'], messages.required),
    'ADDITION'
  ),
  occurred_at: optional(pipe(string(), trim()), ''),
  reference_id: optional(pipe(string(), trim(), maxLength(191, messages.descriptionTooLong)), ''),
  related_inventory_id: optional(pipe(string(), trim()), ''),
  source_vendor: optional(pipe(string(), trim(), maxLength(191, messages.descriptionTooLong)), ''),
  reason: optional(union([literal(''), picklist(['ASSIGNED_TO_STAFF', 'CLIENT_PROJECT', 'INTERNAL_OFFICE_USE', 'DAMAGED_LOST_WRITTEN_OFF'], messages.required)]), ''),
  assigned_staff_id: optional(pipe(string(), trim()), ''),
  notes: optional(pipe(string(), trim(), maxLength(2000, messages.descriptionTooLong)), '')
})

export const inventoryCategorySchema = messages => object({
  name: pipe(string(messages.required), trim(), regex(OPTION_NAME_PATTERN, messages.categoryNameInvalid)),
  description: optional(pipe(string(), trim(), maxLength(1000, messages.descriptionTooLong)), ''),
  is_active: optional(boolean(), true)
})
