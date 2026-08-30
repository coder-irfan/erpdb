export const calculateStockAfterMovement = (currentStock, movementQuantity, direction) => {
  const current = Number(currentStock)
  const movement = Number(movementQuantity)
  const normalizedDirection = String(direction || '').toUpperCase()

  if (!Number.isInteger(current) || current < 0 || !Number.isInteger(movement) || movement <= 0) {
    throw new Error('INVALID_INVENTORY_QUANTITY')
  }

  if (!['IN', 'OUT'].includes(normalizedDirection)) throw new Error('INVALID_INVENTORY_MOVEMENT')
  if (normalizedDirection === 'OUT' && movement > current) throw new Error('INSUFFICIENT_STOCK')

  return normalizedDirection === 'OUT' ? current - movement : current + movement
}
