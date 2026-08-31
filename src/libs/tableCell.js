export const EMPTY_TABLE_CELL = '—'

export const formatTableCellValue = value =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '') ? EMPTY_TABLE_CELL : value
