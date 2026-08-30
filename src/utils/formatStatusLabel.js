const RAW_ENUM_PATTERN = /^[A-Z0-9_\s-]+$/

export const formatStatusLabel = (value, preferredLabel) => {
  const label = String(preferredLabel || '').trim()

  if (label && !RAW_ENUM_PATTERN.test(label)) return label

  const rawValue = String(label || value || '').trim()

  if (!rawValue) return '-'

  return rawValue
    .replace(/[_-]+/g, ' ')
    .toLocaleLowerCase()
    .replace(/\b\w/g, character => character.toLocaleUpperCase())
}
