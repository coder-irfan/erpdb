const words = value =>
  String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase())

const readableValue = value => {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (value == null || value === '') return null
  if (Array.isArray(value)) return value.map(readableValue).filter(Boolean).join(', ')
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${words(key)}: ${readableValue(item)}`).filter(Boolean).join(' • ')

  return words(value)
}

/** Turns JSON metadata stored in legacy notes fields into a concise human-readable label. */
export const formatMetadata = value => {
  if (typeof value !== 'string') return readableValue(value) || ''

  try {
    const parsed = JSON.parse(value)

    return readableValue(parsed) || value
  } catch {
    return value
  }
}

export default formatMetadata
