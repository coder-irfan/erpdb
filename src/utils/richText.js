import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'a', 'div', 'label', 'input', 'span']

export const sanitizeRichText = value => sanitizeHtml(String(value || ''), {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    ul: ['data-type'],
    li: ['data-type', 'data-checked'],
    input: ['type', 'checked', 'disabled']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }, true),
    input: sanitizeHtml.simpleTransform('input', { type: 'checkbox', disabled: 'disabled' }, true)
  }
})
