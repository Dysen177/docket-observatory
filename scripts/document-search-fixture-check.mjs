import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const cacheRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-search-'))
process.env.GUO_INTEL_CACHE_DIR = cacheRoot

const { initializeSettingsStore } = await import('../server/settings-store.js')
await initializeSettingsStore()
const { buildDocumentCatalog } = await import('../server/document-analysis.js')
const { compareDocumentCatalogRecords, refreshDocumentSearchIndex, searchDocumentCatalog } = await import('../server/document-search.js')

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
    categoryKey: 'Motion',
    sourceId,
    sourceLabel,
    sourceVerification: { label: 'Official docket copy' },
    searchAliases: [],
    summary: '',
    plainEnglish: '',
    searchText: '',
  }
}

function filingRecord(url, overrides = {}) {
  return {
    ...catalogRecord(url, overrides.docNumber ?? '712', overrides.sourceId ?? 'courtlistener-recap', overrides.sourceLabel ?? 'CourtListener / RECAP'),
    ...overrides,
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

function assertNoRepeatedResults(result, query) {
  const sourceUrls = result.catalog.map((record) => record.sourceUrl)
  assert.equal(new Set(sourceUrls).size, sourceUrls.length, `${query} repeated a canonical source URL`)
  const filingCoordinates = result.catalog
    .map((record) => {
      const docket = String(record.docketNumber ?? '').trim().toLowerCase()
        .replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, '')
        .replace(/^(\d+:\d{2,4}-(?:cr|cv|mc|mj|md|bk|ap)-)0*(\d+)(?:-[a-z]{1,6})+$/, '$1$2')
      const document = String(record.docNumber ?? '').trim().toLowerCase()
      return docket && document ? `${docket}|${document}` : ''
    })
    .filter(Boolean)
  assert.equal(new Set(filingCoordinates).size, filingCoordinates.length, `${query} repeated a logical docket filing`)
}

async function search(manifest, records, query, scope = 'original') {
  const result = await searchDocumentCatalog(manifest, records, { query, scope, priority: 'all', offset: 0, limit: 20 })
  assertNoRepeatedResults(result, query || '<unfiltered>')
  return result
}

try {
  const catalogOrderFixture = [
    { caseId: 'bkd-24-05249-aca', docketNumber: '24-05249', categoryKey: 'Docket Filing', priority: 'critical', docNumber: '331', title: 'Bankruptcy 331', publishedAt: '2026-08-21', sourceUrl: 'https://example.test/bankruptcy-331' },
    { caseId: 'sdny-23-cr-118', docketNumber: '1:23-cr-00118-AT', categoryKey: 'Motion', priority: 'low', docNumber: '868', title: 'Criminal 868', publishedAt: '2020-01-01', sourceUrl: 'https://example.test/criminal-868' },
    { caseId: 'ca2-26-1853', docketNumber: '26-1853', categoryKey: 'Appeal', priority: 'critical', docNumber: '15', title: 'Direct appeal 15', publishedAt: '2026-08-20', sourceUrl: 'https://example.test/appeal-15' },
    { caseId: 'sdny-23-cr-118', docketNumber: '1:23-cr-00118', categoryKey: 'Order', priority: 'critical', docNumber: '331-2', title: 'Criminal attachment 2', publishedAt: '2024-01-01', sourceUrl: 'https://example.test/criminal-331-2' },
    { caseId: 'sdny-23-cr-118', docketNumber: '1:23-cr-00118', categoryKey: 'Docket Filing', priority: 'high', docNumber: '869', title: 'Criminal 869', publishedAt: '2019-01-01', sourceUrl: 'https://example.test/criminal-869' },
    { caseId: 'sdny-23-cr-118', docketNumber: '1:23-cr-00118', categoryKey: 'Docket Filing', priority: 'low', docNumber: '331', title: 'Criminal 331', publishedAt: '2026-08-20', sourceUrl: 'https://example.test/criminal-331' },
    { caseId: 'discovered-nysd-main-alias', docketNumber: '1:23-cr-00118', categoryKey: 'Docket Filing', priority: 'medium', docNumber: '331-1', title: 'Criminal attachment 1', publishedAt: '2025-01-01', sourceUrl: 'https://example.test/criminal-331-1' },
    { caseId: 'sdny-23-cr-118', docketNumber: '1:23-cr-00118', categoryKey: 'Docket Filing', priority: 'critical', docNumber: '1', title: 'Criminal 1', publishedAt: '2026-08-21', sourceUrl: 'https://example.test/criminal-1' },
    { caseId: 'sdny-23-cr-118', docketNumber: '1:23-cr-00118', categoryKey: 'Docket Filing', priority: 'critical', docNumber: null, title: 'Criminal unnumbered', publishedAt: '2099-01-01', sourceUrl: 'https://example.test/criminal-unnumbered' },
    { caseId: 'sdny-23-cv-2200', docketNumber: '1:23-cv-02200', categoryKey: 'Civil Enforcement', priority: 'critical', docNumber: '44', title: 'Civil 44', publishedAt: '2026-08-21', sourceUrl: 'https://example.test/civil-44' },
    { resourceKind: 'web_page', caseId: 'sdny-23-cr-118', docketNumber: '1:23-cr-00118', categoryKey: 'Source record', priority: 'critical', docNumber: null, title: 'Website source', publishedAt: '2099-01-01', sourceUrl: 'https://example.test/web-source' },
  ]
  assert.deepEqual(catalogOrderFixture.toSorted(compareDocumentCatalogRecords).map((record) => record.sourceUrl), [
    'https://example.test/criminal-869',
    'https://example.test/criminal-868',
    'https://example.test/criminal-331-2',
    'https://example.test/criminal-331-1',
    'https://example.test/criminal-331',
    'https://example.test/criminal-1',
    'https://example.test/criminal-unnumbered',
    'https://example.test/appeal-15',
    'https://example.test/civil-44',
    'https://example.test/bankruptcy-331',
    'https://example.test/web-source',
  ])

  const changedDates = catalogOrderFixture.map((record, index) => ({
    ...record,
    publishedAt: index % 2 ? '2001-01-01' : '2099-12-31',
    capturedAt: index % 2 ? '2099-12-31' : '2001-01-01',
    priority: index % 2 ? 'low' : 'critical',
  }))
  assert.deepEqual(
    changedDates.toSorted(compareDocumentCatalogRecords).map((record) => record.sourceUrl),
    catalogOrderFixture.toSorted(compareDocumentCatalogRecords).map((record) => record.sourceUrl),
  )

  const docketEvent870 = {
    id: 'fixture-recap-870',
    date: '2026-08-18',
    title: 'RECAP docket entry 870: United States v. GUO docket entry 870',
    summary: 'United States v. GUO docket entry 870',
    impact: 'Read the linked entry and available PDF before relying on it.',
    caseId: 'sdny-23-cr-118',
    docketNumber: '1:23-cr-00118',
    courtListenerDocketId: 67012324,
    filingNumber: '870',
    category: 'Docket Filing',
    severity: 'low',
    sourceId: 'courtlistener-recap',
    sourceLabel: 'RECAP',
    sourceType: 'CourtListener / RECAP',
    sourceUrl: 'https://www.courtlistener.com/docket/67012324/870/united-states-v-guo/',
    confidence: 'high',
    assertionType: 'Public RECAP feed metadata',
  }
  const metadataOnlyManifest = { files: [], sourceRecords: [] }
  const metadataOnlyState = { cases: [], events: [docketEvent870] }
  const metadataCatalog = await buildDocumentCatalog(metadataOnlyManifest, metadataOnlyState, 'zh', {
    query: '870', scope: 'all', priority: 'all', offset: 0, limit: 20,
  })
  assert.equal(metadataCatalog.catalog[0]?.docNumber, '870')
  assert.equal(metadataCatalog.catalog[0]?.resourceKind, 'docket_entry')
  assert.equal(metadataCatalog.catalog[0]?.status, 'metadata_only')
  assert.equal(metadataCatalog.catalog[0]?.priority, 'low')
  assert.equal(metadataCatalog.catalog[0]?.confidence, 'high')
  assert.match(metadataCatalog.catalog[0]?.plainEnglish, /没有可下载 PDF 或可读正文/u)
  assert.equal(metadataCatalog.filtered, 1)
  const reversedMetadataCatalog = await buildDocumentCatalog(metadataOnlyManifest, metadataOnlyState, 'zh', {
    query: '870文件', scope: 'all', priority: 'all', offset: 0, limit: 20,
  })
  assert.equal(reversedMetadataCatalog.filtered, 1)
  assert.equal(reversedMetadataCatalog.catalog[0]?.docNumber, '870')

  const appealHumanUrl = 'https://storage.courtlistener.com/recap/appeal.17.0.pdf'
  const appealLocalRulesUrl = 'https://storage.courtlistener.com/recap/appeal.16.1.pdf'
  const appealLocalPdfUrl = 'https://storage.courtlistener.com/recap/appeal.15.0.pdf'
  const appealManifest = { files: [
    manifestFile(appealHumanUrl, 'c'.repeat(64), '17'),
    manifestFile(appealLocalRulesUrl, 'd'.repeat(64), '16-1'),
    manifestFile(appealLocalPdfUrl, 'e'.repeat(64), '15'),
  ] }
  const appealRecords = [
    filingRecord(appealHumanUrl, { docNumber: '17', caseId: 'ca2-26-1853', docketNumber: '26-1853', status: 'downloaded', aiStatus: { provider: 'human_research' }, title: 'Case manager notice' }),
    filingRecord(appealLocalRulesUrl, { docNumber: '16-1', caseId: 'ca2-26-1853', docketNumber: '26-1853', status: 'downloaded', aiStatus: { provider: 'local_rules' }, title: 'Counsel substitution motion' }),
    filingRecord(appealLocalPdfUrl, { docNumber: '15', caseId: 'ca2-26-1853', docketNumber: '26-1853', status: 'downloaded', title: 'Form B' }),
    filingRecord('https://www.courtlistener.com/docket/73605152/16/2/united-states-of-america-v-guo/', {
      docNumber: '16-2',
      caseId: 'ca2-26-1853',
      docketNumber: '26-1853',
      resourceKind: 'docket_entry',
      status: 'metadata_only',
      aiStatus: { provider: null },
      title: 'Docket metadata only',
    }),
  ]
  await refreshDocumentSearchIndex(appealManifest)
  const appealDocketSearch = await search(appealManifest, appealRecords, '26-1853', 'all')
  assert.deepEqual(appealDocketSearch.catalog.map((record) => record.docNumber), ['17', '16-1', '15', '16-2'])
  assert.equal(appealDocketSearch.catalog.every((record) => record.searchMatches[0]?.kind === 'docket_number'), true)

  const defaultOrderManifest = { files: [manifestFile(appealLocalPdfUrl, 'e'.repeat(64), '869')] }
  const defaultOrderRecords = [
    filingRecord(appealLocalPdfUrl, { docNumber: '869', caseId: 'sdny-23-cr-118', docketNumber: '1:23-cr-00118', status: 'downloaded', title: 'Downloaded filing 869' }),
    filingRecord('https://www.courtlistener.com/docket/67012324/870/united-states-v-guo/', {
      docNumber: '870',
      caseId: 'sdny-23-cr-118',
      docketNumber: '1:23-cr-00118',
      resourceKind: 'docket_entry',
      status: 'metadata_only',
      title: 'Metadata-only filing 870',
    }),
  ]
  await refreshDocumentSearchIndex(defaultOrderManifest)
  const defaultOrder = await searchDocumentCatalog(defaultOrderManifest, defaultOrderRecords, {
    query: '', scope: 'all', priority: 'all', offset: 0, limit: 20, language: 'zh',
  })
  assert.deepEqual(defaultOrder.catalog.map((record) => record.docNumber), ['870', '869'])

  const downloaded870Url = 'https://storage.courtlistener.com/recap/guo.870.0.pdf'
  const downloaded870Manifest = {
    files: [{
      ...manifestFile(downloaded870Url, 'c'.repeat(64), '870'),
      docNumber: '870',
      caseId: 'sdny-23-cr-118',
      docketNumber: '1:23-cr-00118-AT',
      title: 'Case 1:23-cr-00118 Document 870',
      filedAt: '2026-08-18',
    }],
    sourceRecords: [],
  }
  const downloadedCatalog = await buildDocumentCatalog(downloaded870Manifest, metadataOnlyState, 'zh', {
    query: '870', scope: 'all', priority: 'all', offset: 0, limit: 20,
  })
  assert.equal(downloadedCatalog.catalog.filter((record) => record.docNumber === '870').length, 1)
  assert.equal(downloadedCatalog.catalog[0]?.resourceKind, 'pdf')
  assert.equal(downloadedCatalog.catalog[0]?.sourceUrl, downloaded870Url)

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

  const specificityInheritance = await search(firstManifest, [
    filingRecord(originalUrl, { docNumber: '1', offlineRead: { specificity: 0 }, plainEnglish: 'Generic metadata read.' }),
    filingRecord(duplicateUrl, { docNumber: '1', sourceId: 'nfsc-criminal-mirror', sourceLabel: 'NFSC backup mirror', offlineRead: { specificity: 5 }, plainEnglish: 'Specific same-filing read.' }),
  ], '')
  assert.equal(specificityInheritance.catalog[0].sourceUrl, originalUrl)
  assert.equal(specificityInheritance.catalog[0].plainEnglish, 'Specific same-filing read.')

  const humanReadInheritance = await search(firstManifest, [
    filingRecord(originalUrl, { docNumber: '1', aiStatus: { provider: 'local_rules' }, offlineRead: { specificity: 6 }, plainEnglish: 'Specific local read.' }),
    filingRecord(duplicateUrl, { docNumber: '1', sourceId: 'nfsc-criminal-mirror', sourceLabel: 'NFSC backup mirror', aiStatus: { provider: 'human_research' }, offlineRead: { specificity: 0 }, plainEnglish: 'Version-locked human read.' }),
  ], '')
  assert.equal(humanReadInheritance.catalog[0].sourceUrl, originalUrl)
  assert.equal(humanReadInheritance.catalog[0].plainEnglish, 'Version-locked human read.')

  const crossPage = await search(firstManifest, firstRecords, 'alpha omega')
  assert.equal(crossPage.filtered, 1)
  assert.equal(crossPage.total, 1)
  assert.equal(crossPage.catalog[0].sourceUrl, originalUrl)
  assert.equal(crossPage.catalog[0].sourceAlternatives.some((source) => source.sourceUrl === duplicateUrl), true)
  assert.deepEqual(crossPage.catalog[0].searchMatches[0].matchedPageNumbers, [1, 2])
  assert.match(crossPage.catalog[0].searchMatches[0].snippet, /Alpha/)
  assert.equal((await search(firstManifest, firstRecords, '"alpha omega"')).filtered, 0)
  assert.equal((await search(firstManifest, firstRecords, 'alpha nonexistent')).filtered, 0)

  const geyerUrl = 'https://storage.courtlistener.com/recap/geyer.712.0.pdf'
  const geyerMirrorUrl = 'https://nfsc.example/archive/geyer.712.0.pdf'
  const geyerManifest = { files: [
    manifestFile(geyerUrl, originalSha256, '712'),
    manifestFile(geyerMirrorUrl, originalSha256, '712', 'nfsc-criminal-mirror', 'NFSC backup mirror'),
  ] }
  const geyerRecords = [
    filingRecord(geyerUrl, { id: 'geyer-court', caseId: 'courtlistener-geyer', docketNumber: '1:23-cr-00118', title: 'Geyer filing / Doc 712' }),
    filingRecord(geyerMirrorUrl, { id: 'geyer-mirror', caseId: 'nfsc-geyer', docketNumber: '1:23-cr-00118-AT', sourceId: 'nfsc-criminal-mirror', sourceLabel: 'NFSC backup mirror', title: 'Geyer filing / Doc 712' }),
  ]
  await refreshDocumentSearchIndex(geyerManifest)
  const docketAliasSearch = await search(geyerManifest, geyerRecords, 'Geyer', 'all')
  assert.equal(docketAliasSearch.filtered, 1)
  assert.equal(docketAliasSearch.total, 1)
  assert.match(docketAliasSearch.catalog[0].searchMatches[0].snippet, /Geyer/)
  assert.equal(docketAliasSearch.catalog[0].sourceAlternatives.some((source) => source.sourceUrl === geyerMirrorUrl), true)
  const analysisDocketSearch = await search(geyerManifest, geyerRecords, 'Doc 712', 'analysis')
  assert.equal(analysisDocketSearch.filtered, 1)
  assert.equal(analysisDocketSearch.catalog[0].docNumber, '712')
  assert.equal(analysisDocketSearch.catalog[0].searchMatches[0].kind, 'docket_number')

  await refreshDocumentSearchIndex(firstManifest)
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

  const relevanceRecords = [
    filingRecord(originalUrl, { title: 'Target appears in a general filing', originalTitle: 'Target appears in a general filing', category: 'Docket Filing', categoryKey: 'Docket Filing' }),
    filingRecord(duplicateUrl, { title: 'Target appears in a general filing', originalTitle: 'Target appears in a general filing', category: 'Docket Filing', categoryKey: 'Docket Filing', sourceId: 'nfsc-criminal-mirror', sourceLabel: 'NFSC backup mirror' }),
    filingRecord(newUrl, { docNumber: '2', title: 'Target', originalTitle: '', category: 'Appeal', categoryKey: 'Appeal' }),
  ]
  const relevanceSearch = await search(secondManifest, relevanceRecords, 'Target', 'all')
  assert.deepEqual(relevanceSearch.catalog.map((record) => record.docNumber), ['2', '712'])

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
    scenarios: ['primary-criminal-case-first', 'case-grouped-descending-document-number-order', 'date-and-priority-independent-catalog-order', 'metadata-only-docket-entry-search', 'unfiltered-docket-order-ignores-availability', 'docket-search-local-availability-order', 'downloaded-pdf-supersedes-metadata-entry', 'search-relevance-before-catalog-order', 'query-independent-deduplication', 'exact-content-deduplication', 'docket-judge-suffix-deduplication', 'canonical-source-preference', 'alternate-source-retention', 'same-filing-specific-read-inheritance', 'human-read-priority', 'analysis-scope-docket-metadata', 'cross-page-and', 'quoted-phrase-boundary', 'case-preserving-snippet', 'numeric-normalization', 'new-file-indexing', 'rewritten-cache-invalidation', 'missing-body-background-recovery', 'corrupt-index-recovery'],
  }, null, 2))
} finally {
  await rm(cacheRoot, { recursive: true, force: true })
}
