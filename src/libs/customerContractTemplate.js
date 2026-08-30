import 'server-only'

import sanitizeHtml from 'sanitize-html'

import { replaceContractTemplateTokens } from '@/utils/contractTemplateTokens'
import { utcDateKey } from '@/utils/utcDate'

const CONTRACT_HTML_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  's',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'hr',
  'pre',
  'code',
  'span',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td'
]

const escapeHtml = value =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const safeDate = value => (value ? utcDateKey(value) : '')

export const compileCustomerContractTemplate = ({
  template,
  contract,
  client,
  accountManager,
  setup,
  contractNumber,
  contractType,
  durationLabel
}) => {
  const contactName = client.primary_contact_name || client.company_name
  const contractAmount = contract.total_amount?.toFixed?.(2) || String(contract.total_amount || '0.00')
  const amount = `${contractAmount} ${contract.currency}`

  const replacements = {
    name: contactName,
    company_name: client.company_name,
    contact_name: contactName,
    position: 'Client representative',
    email: client.email,
    phone: client.phone || 'N/A',
    address: client.address || 'N/A',
    client_email: client.email,
    client_phone: client.phone || 'N/A',
    client_address: client.address || 'N/A',
    tax_id: client.tax_id || 'N/A',
    contract_number: contractNumber,
    contract_title: contract.title,
    contract_type: contractType.label,
    amount,
    currency: contract.currency,
    payment_terms: durationLabel || 'As agreed',
    start_date: safeDate(contract.start_date),
    end_date: safeDate(contract.end_date),
    signed_date: safeDate(contract.signed_date) || 'Pending signature',
    created_date: safeDate(new Date()),
    project_name: 'N/A',
    project_code: 'N/A',
    project_area: 'N/A',
    project_sponsor: client.company_name,
    project_manager: accountManager?.full_name || 'N/A',
    project_start_date: safeDate(contract.start_date),
    project_end_date: safeDate(contract.end_date),
    org_name: setup.company_name,
    org_address: setup.company_address || 'N/A',
    org_email: setup.company_email || 'N/A',
    org_phone: setup.company_phone || 'N/A',
    org_tax_id: setup.company_tax_id || 'N/A',
    signatory_name: setup.signatory_name || accountManager?.full_name || 'N/A',
    signatory_title: setup.signatory_title || accountManager?.position || 'N/A'
  }

  const compiled = replaceContractTemplateTokens(template, replacements, escapeHtml)

  return sanitizeHtml(compiled, {
    allowedTags: CONTRACT_HTML_TAGS,
    allowedAttributes: {
      '*': ['style'],
      table: ['class'],
      th: ['colspan', 'rowspan', 'colwidth'],
      td: ['colspan', 'rowspan', 'colwidth']
    },
    allowedStyles: {
      '*': {
        'text-align': [/^(?:left|right|center|justify)$/],
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
        'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
        'font-family': [/^[a-z0-9 ,"'-]+$/i],
        'font-size': [/^[0-9.]+(?:px|rem|em|pt|%)$/],
        'line-height': [/^[0-9.]+$/],
        'margin-left': [/^[0-9.]+(?:px|rem|em)$/]
      }
    }
  }).trim()
}
