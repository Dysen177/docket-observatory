import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const cacheRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-search-'))
process.env.GUO_INTEL_CACHE_DIR = cacheRoot

const { refreshDocumentSearchIndex, searchDocumentCatalog } = await import('../server/document-search.js')

const originalUrl = 'https://storage.courtlistener.com/recap/example.1.0.pdf'
const duplicateUrl = 'https://nfsc.example/archive/example.1.0.pdf'
const newUrl = 'https://storage.courtlistener.com/recap/example.2.0.pdf'
const originalSha256 = 'a'.repeat(64)
const newSha256 = 'b'.repeat(64)

function manifestFile(url, sha256, docNumber, sourceId = 'courtlistener-recap', sourceLabel = 'CourtListener / RECAP') {
  return {
    url,
    sha256,
    status: 'downloaded',
    path: `/managed/doc-${docNumber}.pdf`,
    sourceId,
    sourceLabel,
    sourcePage: url,
  }
}

function catalogRecord(url, docNumber, sourceId = 'courtlistener-recap', sourceLabel = 'CourtListener / RECAP') {
  return {
    id: `record-${docNumber}`,
    sourceUrl: url,
    priority: 'high',
    resourceKind: 'pdf',
    docNumber,
    caseId: 'fixture-case',
    title: `Fixture document ${docNumber}`,
    originalTitle: `Fixture document ${docNumber}`,
    category: 'Motion',
    sourceId,
    sourceLabel,
    sourceVerification: { label: 'Official docket copy' },
    searchAliases: [],
    summary: '',
    plainEnglish: '',
    searchText: '',
  }
}

function extraction(sha256, pages) {
  return {
    cacheVersion: 8,
    status: 'extracted',
    engine: 'pdf-parse',
    coverage: 'complete',
    totalPages: pages.length,
    pagesParsed: pages.length,
    charCount: pages.reduce((total, page) => total + page.text.length, 0),
    pageSnippets: pages,
    signature: { contentSha256: sha256, manifestSha256: sha256 },
  }
}

async function writeJson(relativePath, value) {
  const target = path.join(cacheRoot, relativePath)
  await mkdir(path.dirname(target), { recursive: true })
  const temporary = `${target}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, JSON.stringify(value), 'utf8')
    await rename(temporary, target)
  } finally {
    await unlink(temporary).catch(() => undefined)
  }
}

async function search(manifest, records, query) {
  return searchDocumentCatalog(manifest, records, { query, scope: 'original', priority: 'all', offset: 0, limit: 20 })
}

try {
  await Promise.all([
    mkdir(path.join(cacheRoot, 'translations'), { recursive: true }),
    mkdir(path.join(cacheRoot, 'document-ai'), { recursive: true }),
    writeJson('pdf-text/original.json', extraction(originalSha256, [
      { pageNumber: 1, text: 'Alpha evidence appears on the first page. The verified total is 6,537.' },
      { pageNumber: 2, text: 'Omega jurisdiction appears only on the second page.' },
    ])),
  ])

  const firstManifest = { files: [
    manifestFile(originalUrl, originalSha256, '1'),
    manifestFile(duplicateUrl, originalSha256, '1', 'nfsc-criminal-mirror', 'NFSC backup mirror'),
  ] }
  const firstRecords = [
    catalogRecord(originalUrl, '1'),
    catalogRecord(duplicateUrl, '1', 'nfsc-criminal-mirror', 'NFSC backup mirror'),
  ]
  await refreshDocumentSearchIndex(firstManifest)

  const crossPage = await search(firstManifest, firstRecords, 'alpha omega')
  assert.equal(crossPage.filtered, 1)
  assert.equal(crossPage.total, 1)
  assert.equal(crossPage.catalog[0].sourceUrl, originalUrl)
  assert.equal(crossPage.catalog[0].sourceAlternatives.some((source) => source.sourceUrl === duplicateUrl), true)
  assert.deepEqual(crossPage.catalog[0].searchMatches[0].matchedPageNumbers, [1, 2])
  assert.match(crossPage.catalog[0].searchMatches[0].snippet, /Alpha/)
  assert.equal((await search(firstManifest, firstRecords, '"alpha omega"')).filtered, 0)
  assert.equal((await search(firstManifest, firstRecords, 'alpha nonexistent')).filtered, 0)

  const commaNumber = await search(firstManifest, firstRecords, '6,537')
  const plainNumber = await search(firstManifest, firstRecords, '6537')
  assert.equal(commaNumber.filtered, 1)
  assert.equal(plainNumber.filtered, 1)

  await writeJson('pdf-text/new.json', extraction(newSha256, [
    { pageNumber: 1, text: 'A newly downloaded filing contains the unique term heliotrope.' },
  ]))
  const secondManifest = { files: [...firstManifest.files, manifestFile(newUrl, newSha256, '2')] }
  const secondRecords = [...firstRecords, catalogRecord(newUrl, '2')]
  const refreshed = await refreshDocumentSearchIndex(secondManifest)
  assert.equal(refreshed.coverage.manifestPdfFiles, 3)
  assert.equal(refreshed.coverage.uniquePdfContents, 2)
  assert.equal((await search(secondManifest, secondRecords, 'heliotrope')).catalog[0]?.docNumber, '2')

  await writeJson('pdf-text/new.json', extraction(newSha256, [
    { pageNumber: 1, text: 'The corrected filing replaces that term with vermilion.' },
  ]))
  await refreshDocumentSearchIndex(secondManifest)
  assert.equal((await search(secondManifest, secondRecords, 'heliotrope')).filtered, 0)
  assert.equal((await search(secondManifest, secondRecords, 'vermilion')).catalog[0]?.docNumber, '2')

  const indexPath = path.join(cacheRoot, 'document-search-index.json')
  const indexBeforeRecovery = JSON.parse(await readFile(indexPath, 'utf8'))
  const missingSearchTextFile = indexBeforeRecovery.documents.find((document) => document.contentSha256 === newSha256).original.searchTextFile
  await unlink(path.join(cacheRoot, missingSearchTextFile))
  const degradedSearch = await search(secondManifest, secondRecords, 'vermilion')
  assert.equal(degradedSearch.search.stale, true)
  assert.equal(degradedSearch.search.building, true)
  await refreshDocumentSearchIndex(secondManifest)
  assert.equal((await search(secondManifest, secondRecords, 'vermilion')).catalog[0]?.docNumber, '2')

  const corruptedIndex = JSON.parse(await readFile(indexPath, 'utf8'))
  corruptedIndex.documents[0].bloom.original = 'invalid'
  await writeFile(indexPath, JSON.stringify(corruptedIndex), 'utf8')
  const reloadedSearch = await import(`../server/document-search.js?recovery=${Date.now()}`)
  const recovered = await reloadedSearch.warmDocumentSearchIndex(secondManifest)
  assert.equal(recovered.coverage.indexedOriginals, 2)

  console.log(JSON.stringify({
    status: 'ok',
    scenarios: ['exact-content-deduplication', 'canonical-source-preference', 'alternate-source-retention', 'cross-page-and', 'quoted-phrase-boundary', 'case-preserving-snippet', 'numeric-normalization', 'new-file-indexing', 'rewritten-cache-invalidation', 'missing-body-background-recovery', 'corrupt-index-recovery'],
  }, null, 2))
} finally {
  await rm(cacheRoot, { recursive: true, force: true })
}
