import assert from 'node:assert/strict'
import { copyFile, readFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { buildDocumentCatalog } from '../server/document-analysis.js'
import { refreshDocumentSearchIndex } from '../server/document-search.js'
import { extractPdfSnippetForFile } from '../server/pdf-extraction.js'
import { createSeedState } from '../server/seed.js'

const root = path.resolve(import.meta.dirname, '..')
const manifest = JSON.parse(await readFile(path.join(root, 'downloads', 'court-files-complete', 'manifest.json'), 'utf8'))
const cachedState = await readFile(path.join(root, 'server', 'cache', 'state.json'), 'utf8').catch(() => '')
const state = cachedState ? JSON.parse(cachedState) : createSeedState()

function normalizeDocket(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, '')
    .replace(/^(\d+:\d{2,4}-(?:cr|cv|mc|mj|md|bk|ap)-)0*(\d+)(?:-[a-z]{1,6})+$/, '$1$2')
    .replace(/^(\d+:\d{2,4}-(?:cr|cv|mc|mj|md|bk|ap)-)0*(\d+)$/, '$1$2')
}

function assertNoRepeatedResults(result, query) {
  const sourceUrls = result.catalog.map((record) => record.sourceUrl)
  assert.equal(new Set(sourceUrls).size, sourceUrls.length, `${query} repeated a canonical source URL`)

  const filingCoordinates = result.catalog
    .map((record) => {
      const docket = normalizeDocket(record.docketNumber)
      const document = String(record.docNumber ?? '').trim().toLowerCase()
      return docket && document ? `${docket}|${document}` : ''
    })
    .filter(Boolean)
  assert.equal(new Set(filingCoordinates).size, filingCoordinates.length, `${query} repeated a logical docket filing`)
}

async function search(query, scope = 'all', limit = 5, offset = 0) {
  const result = await buildDocumentCatalog(manifest, state, 'zh', { query, scope, priority: 'all', offset, limit })
  assertNoRepeatedResults(result, query || '<unfiltered>')
  return result
}

const docket = await search('Doc 612')
assert.equal(docket.catalog[0]?.docNumber, '612')
assert.equal(docket.catalog[0]?.searchMatches?.[0]?.kind, 'docket_number')

const attachment = await search('643-1')
assert.equal(attachment.catalog[0]?.docNumber, '643-1')
assert.equal(attachment.catalog[0]?.searchMatches?.[0]?.kind, 'docket_number')

const original = await search('"constructive trust"', 'original')
assert.equal(original.catalog[0]?.searchMatches?.[0]?.kind, 'body_original')
assert.ok(Number(original.catalog[0]?.searchMatches?.[0]?.pageNumber) > 0)
assert.match(original.catalog[0]?.searchMatches?.[0]?.snippet ?? '', /constructive trust/i)

const translation = await search('推定信托', 'translation')
assert.equal(translation.catalog[0]?.searchMatches?.[0]?.kind, 'body_translation')
assert.equal(translation.catalog[0]?.searchMatches?.[0]?.contentIntegrity, 'assistive_glossary')
assert.ok(Number(translation.catalog[0]?.searchMatches?.[0]?.pageNumber) > 0)

const analysis = await search('"victim notification"', 'analysis')
assert.equal(analysis.catalog[0]?.searchMatches?.[0]?.kind, 'legal_analysis')

const web = await search('提交宣誓书', 'web')
assert.equal(web.catalog[0]?.searchMatches?.[0]?.kind, 'web_page')

const commaNumber = await search('6,537')
const plainNumber = await search('6537')
assert.deepEqual(
  commaNumber.catalog.slice(0, 3).map((record) => record.id),
  plainNumber.catalog.slice(0, 3).map((record) => record.id),
)

for (const query of ['HID', '"Bradford Geyer"', '"Rule 32.2"', '"21 U.S.C. § 853(n)"']) {
  const result = await search(query)
  assert.ok(result.filtered > 0, `${query} should return at least one result`)
}

const geyer = await search('geyer', 'all', 100)
assert.equal(geyer.catalog.filter((record) => record.docNumber === '761').length, 1)
assert.equal(geyer.catalog.filter((record) => record.docNumber === '712').length, 1)

const deduplicationQueries = ['Kwok', 'Guo', 'GTV', 'Himalaya', 'bankruptcy', 'motion', 'Wang', '郭文贵']
for (const query of deduplicationQueries) {
  const firstPage = await search(query, 'all', 100)
  assert.ok(firstPage.filtered > 0, `${query} should exercise at least one real catalog result`)
  if (!firstPage.hasMore) continue
  const secondPage = await search(query, 'all', 100, 100)
  const combined = { catalog: [...firstPage.catalog, ...secondPage.catalog] }
  assertNoRepeatedResults(combined, `${query} across pages`)
}

const renameCandidate = manifest.files.find((file) => file?.path && file?.sha256 && file?.status !== 'error')
assert.ok(renameCandidate, 'A local PDF is required for the cache identity check')
const originalExtraction = await extractPdfSnippetForFile(renameCandidate)
const temporaryPath = path.join(path.dirname(renameCandidate.path), `.search-cache-rename-check-${process.pid}.pdf`)
try {
  await copyFile(renameCandidate.path, temporaryPath)
  const renamedExtraction = await extractPdfSnippetForFile({
    ...renameCandidate,
    path: temporaryPath,
    url: `${renameCandidate.url}#renamed-cache-check`,
  })
  assert.equal(renamedExtraction.textHash, originalExtraction.textHash)
  assert.equal(renamedExtraction.extractedAt, originalExtraction.extractedAt)
} finally {
  await unlink(temporaryPath).catch(() => undefined)
  await extractPdfSnippetForFile(renameCandidate)
}

const refreshedIndex = await refreshDocumentSearchIndex(manifest)
assert.equal(refreshedIndex.coverage.indexedOriginals, refreshedIndex.coverage.uniquePdfContents)

console.log(JSON.stringify({
  status: 'ok',
  indexedOriginals: refreshedIndex.coverage.indexedOriginals,
  uniquePdfContents: refreshedIndex.coverage.uniquePdfContents,
  checkedQueries: 21,
  deduplicationQueries,
  cacheIdentity: 'sha256-stable-across-path-and-url-change',
}, null, 2))
