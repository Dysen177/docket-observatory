/**
 * Keep case-dossier evidence selection deterministic in both the writer and reader.
 * A cache hit must use the exact same document ordering that produced the dossier.
 */
export function sortCaseDocuments(files) {
  return [...files].sort((left, right) => {
    const priorityDelta = caseDocumentPriority(right) - caseDocumentPriority(left)
    if (priorityDelta) return priorityDelta
    return documentSortKey(left).localeCompare(documentSortKey(right))
  })
}

export function caseDocumentPriority(file) {
  const title = `${file?.title ?? ''} ${file?.originalTitle ?? ''}`.toLowerCase()
  const categoryWeight = [
    ['judgment', 7],
    ['sentenc', 6],
    ['appeal', 5],
    ['forfeiture', 5],
    ['bankruptcy', 4],
    ['transcript', 4],
    ['order', 3],
  ]
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 }
  const category = categoryWeight.find(([needle]) => title.includes(needle))?.[1] ?? 1
  const proceduralWeight = /judgment|sentenc|forfeiture|appeal|mandamus/.test(title) ? 3 : 1
  return category + proceduralWeight + (priorityWeight[file?.priority] ?? 0)
}

function documentSortKey(file) {
  return [
    String(file?.docNumber ?? ''),
    String(file?.url ?? file?.sourceUrl ?? ''),
    String(file?.title ?? ''),
  ].join('|')
}
