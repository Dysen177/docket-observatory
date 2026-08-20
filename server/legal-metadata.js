export function normalizeLegalMetadataText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/ยง/gu, '§')
    .replace(/\bOCt\b/gu, 'Oct')
    .replace(/[\s\u00a0]*[\uFF08(]+\s*$/u, '')
}
