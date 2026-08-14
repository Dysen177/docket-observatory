const redactionRules = [
  { label: 'EMAIL', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { label: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: 'PHONE', pattern: /(?<!\d)(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?!\d)/g },
  { label: 'ACCOUNT', pattern: /\b(?:account|acct|routing|iban)\s*(?:no\.?|number|#|:)\s*[A-Z0-9-]{6,34}\b/gi },
]

export function textForAi(value, enabled = true) {
  let text = String(value ?? '')
  if (!enabled || !text) return text
  for (const rule of redactionRules) text = text.replace(rule.pattern, `[REDACTED_${rule.label}]`)
  return text
}

export function evidenceForAi(value, enabled = true) {
  if (!enabled || value == null) return value
  if (typeof value === 'string') return textForAi(value, true)
  if (Array.isArray(value)) return value.map((item) => evidenceForAi(item, true))
  if (typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, evidenceForAi(item, true)]))
}
