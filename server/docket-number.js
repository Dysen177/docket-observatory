/**
 * Normalize and compare docket document numbers without losing attachment
 * suffixes such as 81-21. A suffix identifies a distinct filing attachment,
 * not a duplicate of the parent document.
 */
export function normalizeDocketNumber(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const match = text.match(/^(?:doc(?:ument)?\s*)?(\d+(?:-\d+)*)\b/i)
  return match?.[1] ?? text
}

export function docketNumberParts(value) {
  const normalized = normalizeDocketNumber(value)
  const match = normalized.match(/^\d+(?:-\d+)*$/)
  if (!match) return []
  return normalized.split('-').map((part) => Number(part))
}

export function compareDocketNumbers(left, right) {
  const leftParts = docketNumberParts(left)
  const rightParts = docketNumberParts(right)
  if (leftParts.length && rightParts.length) {
    const length = Math.max(leftParts.length, rightParts.length)
    for (let index = 0; index < length; index += 1) {
      const leftPart = leftParts[index]
      const rightPart = rightParts[index]
      if (leftPart == null) return -1
      if (rightPart == null) return 1
      if (leftPart !== rightPart) return leftPart - rightPart
    }
    return 0
  }

  const leftNumber = Number(String(left ?? '').match(/\d+/)?.[0] ?? 0)
  const rightNumber = Number(String(right ?? '').match(/\d+/)?.[0] ?? 0)
  if (leftNumber !== rightNumber) return leftNumber - rightNumber
  return String(left ?? '').localeCompare(String(right ?? ''))
}
