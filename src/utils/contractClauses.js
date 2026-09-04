const escapeHtml = value =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

export const appendContractClauses = (template, clauses = []) => {
  const selected = clauses.filter(clause => clause?.description)

  if (selected.length === 0) return template || ''

  const content = selected.map(clause => `<h3>${escapeHtml(clause.label)}</h3>${clause.description}`).join('')

  return `${template || ''}<hr><h2>Selected Legal Clauses</h2>${content}`
}
