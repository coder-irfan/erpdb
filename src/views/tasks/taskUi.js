const FALLBACK_COLORS = { TO_DO: 'secondary', IN_PROGRESS: 'primary', ACTIVE: 'primary', REVIEW: 'warning', COMPLETED: 'success', DONE: 'success', LOW: 'success', MEDIUM: 'info', HIGH: 'warning', URGENT: 'error' }
const PALETTE_COLORS = new Set(['primary', 'secondary', 'success', 'error', 'info', 'warning'])

export const optionChipProps = option => {
  const configured = option?.color_code?.toLowerCase()

  if (PALETTE_COLORS.has(configured)) return { color: configured }
  if (/^#[0-9a-f]{6}$/i.test(configured || '')) return { sx: { color: configured, backgroundColor: `${configured}18`, borderColor: `${configured}55` } }

  return { color: FALLBACK_COLORS[option?.value] || 'default' }
}

export const staffInitials = name => name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || '?'

