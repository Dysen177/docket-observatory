import * as cheerio from 'cheerio'
import path from 'node:path'
import { readTextWithLimit, safeFetch } from './safe-fetch.js'
import { normalizeDocketNumber } from './docket-number.js'

export const HIMALAYA_RESTORATION_CURRENT_ROOT = 'https://bragey5.dreamhosters.com/'
export const HIMALAYA_RESTORATION_HISTORICAL_ROOT = 'https://himalayarestoration.com/'

const waybackCdxRoot = 'https://web.archive.org/cdx/search/cdx'
const historicalSubdir = 'sdny-23-cr-118-himalaya-restoration-archive'
const recapSubdir = 'sdny-23-cr-118-recap'
const recapDocketId = 67012324
const recapPacerCaseId = 595325
const recapDocketSlug = 'united-states-v-guo'
const currentApiTargets = [
  `${HIMALAYA_RESTORATION_CURRENT_ROOT}wp-json/wp/v2/pages?per_page=100&_fields=id,date,modified,slug,link,title,content,excerpt`,
  `${HIMALAYA_RESTORATION_CURRENT_ROOT}wp-json/wp/v2/posts?per_page=100&_fields=id,date,modified,slug,link,title,content,excerpt`,
  `${HIMALAYA_RESTORATION_CURRENT_ROOT}wp-json/wp/v2/media?per_page=100&_fields=id,date,modified,slug,link,title,caption,description,media_type,mime_type,source_url`,
]

// These page snapshots remain an offline fallback when the CDX service is temporarily unavailable.
// Runtime discovery can add older English/Chinese pages without touching form-submission endpoints.
const historicalPageFallback = [
  ['home', '20230706150803', ''],
  ['news-update-2023', '20240527170517', '2023/06/29/news-update/'],
  ['case-123-cr-00118-at-20240527', '20240527145006', '2023/12/16/case-123-cr-00118-at/'],
  ['case-123-cr-00118-at-20241203', '20241203224627', '2023/12/16/case-123-cr-00118-at/'],
  ['case-123-cr-00118-at-20250126', '20250126070947', '2023/12/16/case-123-cr-00118-at/'],
  ['case-123-cr-00118-at', '20250213081815', '2023/12/16/case-123-cr-00118-at/'],
  ['urgent-forfeiture-process', '20250322201611', '2025/03/07/urgent-forfeiture-stage-claim-filing-process/'],
  ['formerfeds-march-22-update', '20250422215549', '2025/03/22/march-22-2025-breaking-update-formerfedsgroup-takes-bold-action-to-protect-thousands-of-hex-victims/'],
  ['april-5-motion-package-20250406', '20250406000752', '2025/04/05/a-call-for-justice-motions-filed-to-restore-seized-funds-to-himalaya-exchange-investors/'],
  ['april-5-motion-package-20250407', '20250407045837', '2025/04/05/a-call-for-justice-motions-filed-to-restore-seized-funds-to-himalaya-exchange-investors/'],
  ['april-5-motion-package', '20250422234149', '2025/04/05/a-call-for-justice-motions-filed-to-restore-seized-funds-to-himalaya-exchange-investors/'],
  ['april-8-forfeiture-update-20250408', '20250408064647', '2025/04/08/important-update-on-himalaya-exchange-forfeiture-process/'],
  ['april-8-forfeiture-update', '20250422213842', '2025/04/08/important-update-on-himalaya-exchange-forfeiture-process/'],
  ['affidavit', '20250422231817', 'affidavit/'],
  ['author-user', '20240615113456', 'author/user/'],
  ['category-news-updates', '20240527164716', 'category/news-updates/'],
  ['customers', '20230706150745', 'customers/'],
  ['employees', '20230706150758', 'employees/'],
  ['news-updates', '20230706150800', 'news-updates/'],
  ['step2', '20240527153842', 'step2/'],
  ['zh-home', '20240527153552', 'zh/'],
  ['zh-news-update-2023', '20250213085644', 'zh/2023/06/29/news-update/'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/'],
  ['zh-urgent-forfeiture-process', '20250321073625', 'zh/2025/03/07/urgent-forfeiture-stage-claim-filing-process/'],
  ['zh-formerfeds-march-22-update', '20250323043616', 'zh/2025/03/22/march-22-2025-breaking-update-formerfedsgroup-takes-bold-action-to-protect-thousands-of-hex-victims/'],
  ['zh-category-news-updates', '20240615113619', 'zh/category/news-updates/'],
  ['zh-customers', '20230706150801', 'zh/customers/'],
  ['zh-employees', '20240527163756', 'zh/employees/'],
  ['zh-news-updates', '20240527170208', 'zh/news-updates/'],
].map(([id, timestamp, pathname]) => historicalPage(id, timestamp, pathname))

// Verified against the domain-level CDX PDF index on 2026-08-14. This fallback prevents an
// intermittent CDX 503 from making already known public court files disappear from the library.
const historicalPdfFallback = [
  ['20241004013344', 'wp-content/uploads/2023/12/198-1.pdf'],
  ['20250126071233', 'wp-content/uploads/2023/12/198-10.pdf'],
  ['20241004013750', 'wp-content/uploads/2023/12/198-11.pdf'],
  ['20241004021938', 'wp-content/uploads/2023/12/198-12.pdf'],
  ['20241203060908', 'wp-content/uploads/2023/12/198-13.pdf'],
  ['20241004024431', 'wp-content/uploads/2023/12/198-2.pdf'],
  ['20250126071103', 'wp-content/uploads/2023/12/198-4.pdf'],
  ['20250126071544', 'wp-content/uploads/2023/12/198-8.pdf'],
  ['20241004012606', 'wp-content/uploads/2023/12/198-9.pdf'],
  ['20250126071405', 'wp-content/uploads/2023/12/208-1.pdf'],
  ['20241203002001', 'wp-content/uploads/2023/12/208-4.pdf'],
  ['20241004023303', 'wp-content/uploads/2023/12/208-5.pdf'],
  ['20241004011712', 'wp-content/uploads/2023/12/208-6.pdf'],
  ['20241004025437', 'wp-content/uploads/2023/12/208.pdf'],
  ['20241004025659', 'wp-content/uploads/2023/12/209-2.pdf'],
  ['20241004013701', 'wp-content/uploads/2023/12/209-3.pdf'],
  ['20241004013446', 'wp-content/uploads/2023/12/209-5.pdf'],
  ['20241004024827', 'wp-content/uploads/2023/12/229-1.pdf'],
  ['20241004013256', 'wp-content/uploads/2023/12/229-2.pdf'],
  ['20241004024344', 'wp-content/uploads/2023/12/229-3.pdf'],
  ['20241004013109', 'wp-content/uploads/2023/12/229-4.pdf'],
  ['20250126071615', 'wp-content/uploads/2023/12/229.pdf'],
  ['20241004014944', 'wp-content/uploads/2023/12/Case-23_cr_00118-Doc-190-CN.pdf'],
  ['20241004023407', 'wp-content/uploads/2023/12/Case-23_cr_00118-Doc-192-CN.pdf'],
  ['20241004032252', 'wp-content/uploads/2023/12/Case-23_cr_00118-Doc-194-CN.pdf'],
  ['20241206041856', 'wp-content/uploads/2023/12/Case-23_cr_00118-Doc-196-CN.pdf'],
  ['20241004031322', 'wp-content/uploads/2023/12/Case-23_cr_00118-Doc-202-CN.pdf'],
  ['20250323044022', 'wp-content/uploads/2025/03/ecf-506.pdf'],
  ['20250406001126', 'wp-content/uploads/2025/04/612-1.pdf'],
  ['20250406001408', 'wp-content/uploads/2025/04/612-2.pdf'],
  ['20250406000922', 'wp-content/uploads/2025/04/612-3.pdf'],
  ['20250406000941', 'wp-content/uploads/2025/04/612-4.pdf'],
  ['20250406000946', 'wp-content/uploads/2025/04/612-5.pdf'],
  ['20250406001137', 'wp-content/uploads/2025/04/612-6.pdf'],
  ['20250406001033', 'wp-content/uploads/2025/04/612.pdf'],
  ['20250408070848', 'wp-content/uploads/2025/04/Exhibit-A-cover.pdf'],
  ['20250408070344', 'wp-content/uploads/2025/04/Exhibit-B-cover.pdf'],
  ['20250408070704', 'wp-content/uploads/2025/04/Final-motion.pdf'],
].map(([timestamp, pathname]) => ({
  timestamp,
  originalUrl: new URL(pathname, HIMALAYA_RESTORATION_HISTORICAL_ROOT).toString(),
  captureMimeType: 'application/pdf',
}))

// Verified public links that were present on archived project pages but have no independent
// application/pdf capture. Keeping this metadata locally makes a fresh installation resilient
// to transient Wayback page-replay failures without pretending that a missing PDF snapshot exists.
const historicalLinkedDocumentFallback = [
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/Case-23_cr_00118-Doc-191-CN-1.pdf', '中文文件 191'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/Case-23_cr_00118-Doc-193-CN.pdf', '中文文件 193'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/Case-23_cr_00118-Doc-195-CN.pdf', '中文文件 195'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/198.pdf', 'Docket'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/198-3.pdf', 'Exhibit B'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/198-5.pdf', 'Exhibit D'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/198-6.pdf', 'Exhibit E'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/198-7.pdf', 'Exhibit E1'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/Case-23_cr_00118-Doc-200-CN.pdf', '中文文件 200'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/207.pdf', '207'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/207-1.pdf', '207-1'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/207-2.pdf', '207-2'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/207-3.pdf', '207-3'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/208-2.pdf', '208-2'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/208-3.pdf', '208-3'],
  ['case-123-cr-00118-at-20240527', '20240527145006', '2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/208-7.pdf', '208-7'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/209.pdf', '209'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/209-1.pdf', '209-1'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/209-4.pdf', '209-4'],
  ['zh-case-123-cr-00118-at', '20250318063231', 'zh/2023/12/16/case-123-cr-00118-at/', 'wp-content/uploads/2023/12/209-6.pdf', '209-6'],
  ['formerfeds-march-22-update', '20250422215549', '2025/03/22/march-22-2025-breaking-update-formerfedsgroup-takes-bold-action-to-protect-thousands-of-hex-victims/', 'wp-content/uploads/2025/03/ecf-512.pdf', 'ecf-512.pdf'],
  ['april-5-motion-package', '20250422234149', '2025/04/05/a-call-for-justice-motions-filed-to-restore-seized-funds-to-himalaya-exchange-investors/', 'wp-content/uploads/2025/04/ecf-643-1.pdf', 'ecf-643-1.pdf'],
].map(([archivePageId, archiveTimestamp, sourcePath, documentPath, anchorText]) => ({
  originalUrl: new URL(documentPath, HIMALAYA_RESTORATION_HISTORICAL_ROOT).toString(),
  anchorText,
  sourcePage: waybackReplayUrl(archiveTimestamp, new URL(sourcePath, HIMALAYA_RESTORATION_HISTORICAL_ROOT).toString()),
  originalSourcePage: new URL(sourcePath, HIMALAYA_RESTORATION_HISTORICAL_ROOT).toString(),
  archivePageId,
  archiveTimestamp,
}))

// Each coordinate below was confirmed against the public CourtListener/RECAP storage endpoint
// on 2026-08-14. Doc. 196 is deliberately absent: its public RECAP storage URL returned 404,
// while the historical project copy remains available from the archive and backup mirror.
const verifiedHistoricalRecapDocNumbers = new Set([
  '190', '191', '192', '193', '194', '195',
  '198', '198-1', '198-2', '198-3', '198-4', '198-5', '198-6', '198-7',
  '198-8', '198-9', '198-10', '198-11', '198-12', '198-13',
  '200', '202',
  '207', '207-1', '207-2', '207-3',
  '208', '208-1', '208-2', '208-3', '208-4', '208-5', '208-6', '208-7',
  '209', '209-1', '209-2', '209-3', '209-4', '209-5', '209-6',
  '229', '229-1', '229-2', '229-3', '229-4',
  '506', '512',
  '612', '612-1', '612-2', '612-3', '612-4', '612-5', '612-6',
  '643-1',
])

function historicalPage(id, timestamp, pathname) {
  return {
    id,
    timestamp,
    capturedAt: timestampToIso(timestamp),
    url: new URL(pathname, HIMALAYA_RESTORATION_HISTORICAL_ROOT).toString(),
  }
}

function timestampToIso(timestamp) {
  const value = String(timestamp ?? '')
  if (!/^\d{14}$/.test(value)) return null
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}Z`
}

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

async function fetchText(url, timeoutMs = 30000) {
  const response = await safeFetch(url, {
    headers: {
      'User-Agent': 'guo-intel-local/0.1 (+public legal archive research)',
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    },
  }, { timeoutMs, includeOpenAI: false })
  const text = await readTextWithLimit(response)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return { response, text }
}

async function fetchCdxRows(parameters, timeoutMs = 90000) {
  const url = new URL(waybackCdxRoot)
  for (const [name, value] of Object.entries(parameters)) {
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) url.searchParams.append(name, item)
  }
  const { text } = await fetchText(url.toString(), timeoutMs)
  const payload = JSON.parse(text)
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) throw new Error('Unexpected Wayback CDX response shape.')
  const headings = payload[0]
  return payload.slice(1).map((row) => Object.fromEntries(headings.map((heading, index) => [heading, row[index]])))
}

function htmlRecord(item, kind) {
  const titleHtml = item?.title?.rendered ?? ''
  const contentHtml = item?.content?.rendered ?? item?.description?.rendered ?? ''
  const excerptHtml = item?.excerpt?.rendered ?? item?.caption?.rendered ?? ''
  const $ = cheerio.load(`<main>${contentHtml}${excerptHtml}</main>`)
  const titleText = cleanText(cheerio.load(`<span>${titleHtml}</span>`).text())
  const externalLinks = [...new Set($('a[href], iframe[src], embed[src], object[data]')
    .map((_, element) => $(element).attr('href') ?? $(element).attr('src') ?? $(element).attr('data'))
    .get()
    .filter(Boolean))]
  const sourceUrl = item?.link ?? item?.source_url ?? ''
  return {
    id: `current-${kind}-${item.id}`,
    resourceKind: 'web_page',
    sourceId: 'himalaya-restoration',
    caseId: 'sdny-23-cr-118',
    kind,
    sourceUrl,
    originalUrl: sourceUrl,
    sourceLabel: 'Himalaya Restoration public project site',
    title: titleText || cleanText(item?.slug || sourceUrl),
    publishedAt: item?.date ?? null,
    modifiedAt: item?.modified ?? null,
    capturedAt: null,
    text: cleanText($('main').text()),
    externalLinks,
    searchAliases: himalayaSearchAliases(),
  }
}

function waybackReplayUrl(timestamp, originalUrl) {
  return `https://web.archive.org/web/${timestamp}id_/${originalUrl}`
}

function historicalDocumentTitle(originalUrl, anchorText) {
  const pathname = new URL(originalUrl).pathname
  const filename = decodeURIComponent(path.basename(pathname))
  const label = cleanText(cheerio.load(`<span>${String(anchorText ?? '')}</span>`).text())
  if (!/[\p{L}\p{N}]/u.test(label)) return filename
  return label && label.toLowerCase() !== filename.toLowerCase() ? label : filename
}

function normalizedArchiveOriginalUrl(value) {
  const directMatch = String(value ?? '').match(/^https?:\/\/web\.archive\.org\/web\/\d+(?:id_)?\/(https?:\/\/.*)$/i)
  return directMatch ? directMatch[1] : String(value ?? '')
}

function isHistoricalProjectHost(hostname) {
  return ['himalayarestoration.com', 'www.himalayarestoration.com'].includes(String(hostname ?? '').toLowerCase())
}

function canonicalHistoricalUrl(value) {
  const url = new URL(value)
  if (!isHistoricalProjectHost(url.hostname)) return url.toString()
  url.protocol = 'https:'
  url.hostname = 'himalayarestoration.com'
  return url.toString()
}

function docketNumberFromHistoricalLink(originalUrl, anchorText = '') {
  const filename = decodeURIComponent(path.basename(new URL(originalUrl).pathname, '.pdf'))
  const explicit = `${anchorText} ${filename}`.match(/(?:Doc(?:ument)?|ECF)[- _#:]*(\d+(?:[-.]\d+)*)/i)?.[1]
  const leading = filename.match(/^(\d+(?:-\d+)*)/)?.[1]
  return normalizeDocketNumber(explicit ?? leading ?? '') || null
}

function historicalDocument(snapshot, metadata = {}) {
  const originalUrl = canonicalHistoricalUrl(snapshot.originalUrl)
  const docNumber = docketNumberFromHistoricalLink(originalUrl, metadata.anchorText)
  return {
    sourceId: 'himalaya-restoration-archive',
    caseId: 'sdny-23-cr-118',
    sourcePage: metadata.sourcePage ?? `https://web.archive.org/web/*/${originalUrl}`,
    originalSourcePage: metadata.originalSourcePage ?? null,
    sourceLabel: 'Himalaya Restoration historical public archive',
    title: historicalDocumentTitle(originalUrl, metadata.anchorText),
    docNumber,
    originalUrl,
    url: waybackReplayUrl(snapshot.timestamp, originalUrl),
    subdir: historicalSubdir,
    archivedAt: timestampToIso(snapshot.timestamp),
    archiveTimestamp: snapshot.timestamp,
    archivePageId: metadata.archivePageId ?? null,
    waybackDigest: snapshot.digest ?? null,
    archiveAvailability: snapshot.archiveAvailability ?? 'pdf_snapshot',
    archiveDiscovery: metadata.sourcePage ? 'archived_page_link' : 'cdx_pdf_index',
    captureMimeType: snapshot.captureMimeType ?? null,
    searchAliases: himalayaSearchAliases(docNumber),
  }
}

function recapCoordinates(docNumber) {
  const match = String(docNumber ?? '').match(/^(\d+)(?:-(\d+))?$/)
  if (!match) return null
  return { entryNumber: match[1], attachmentNumber: match[2] ?? '0' }
}

function recapDetailUrl(entryNumber, attachmentNumber) {
  const coordinates = attachmentNumber === '0' ? entryNumber : `${entryNumber}/${attachmentNumber}`
  return `https://www.courtlistener.com/docket/${recapDocketId}/${coordinates}/${recapDocketSlug}/`
}

function recapStorageUrl(entryNumber, attachmentNumber) {
  const stem = `gov.uscourts.nysd.${recapPacerCaseId}`
  return `https://storage.courtlistener.com/recap/${stem}/${stem}.${entryNumber}.${attachmentNumber}.pdf`
}

function isHistoricalTranslationVariant(document) {
  try {
    return /-CN(?:-\d+)?\.pdf$/i.test(decodeURIComponent(new URL(document.originalUrl).pathname))
  } catch {
    return false
  }
}

function historicalRecapCounterpart(document) {
  const docNumber = normalizeDocketNumber(document.docNumber)
  if (!docNumber || !verifiedHistoricalRecapDocNumbers.has(docNumber)) return null
  const coordinates = recapCoordinates(docNumber)
  if (!coordinates) return null
  const translatedVariant = isHistoricalTranslationVariant(document)
  return {
    sourceId: 'courtlistener-recap',
    caseId: 'sdny-23-cr-118',
    courtId: 'nysd',
    court: 'S.D.N.Y.',
    docketNumber: '1:23-cr-00118',
    courtListenerDocketId: recapDocketId,
    sourcePage: recapDetailUrl(coordinates.entryNumber, coordinates.attachmentNumber),
    sourceLabel: 'CourtListener/RECAP public docket counterpart',
    title: translatedVariant
      ? `Official English RECAP counterpart for Doc ${docNumber}`
      : `RECAP Doc ${docNumber}: ${document.title}`,
    docNumber,
    url: recapStorageUrl(coordinates.entryNumber, coordinates.attachmentNumber),
    subdir: recapSubdir,
    discoveryMethod: 'himalaya_historical_link_reconciled_to_public_recap',
    relationStatus: 'tracked',
    counterpartKind: translatedVariant ? 'official_english_counterpart' : 'same_docket_document',
    equivalenceStatus: translatedVariant
      ? 'official_english_counterpart_distinct_translation_variant'
      : 'same_docket_coordinates_pending_hash_comparison',
    historicalProjectOriginalUrl: document.originalUrl,
    historicalProjectSourcePage: document.sourcePage,
    historicalProjectTitle: document.title,
    recapAvailabilityVerifiedAt: '2026-08-14',
    searchAliases: himalayaSearchAliases(docNumber),
  }
}

function collectHistoricalPdfMetadata(html, page) {
  const $ = cheerio.load(html)
  const documents = new Map()
  $('a[href], iframe[src], embed[src], object[data]').each((_, element) => {
    const observedUrl = $(element).attr('href') ?? $(element).attr('src') ?? $(element).attr('data') ?? ''
    const originalUrl = normalizedArchiveOriginalUrl(observedUrl)
    if (!/\.pdf(?:$|[?#])/i.test(originalUrl)) return
    let normalizedUrl = ''
    try {
      normalizedUrl = new URL(originalUrl, page.url).toString()
    } catch {
      return
    }
    if (!isHistoricalProjectHost(new URL(normalizedUrl).hostname)) return
    const canonicalUrl = canonicalHistoricalUrl(normalizedUrl)
    documents.set(canonicalUrl, {
      originalUrl: canonicalUrl,
      anchorText: cleanText($(element).text() || $(element).attr('title') || $(element).attr('aria-label')),
      sourcePage: page.replayUrl,
      originalSourcePage: page.url,
      archivePageId: page.id,
      archiveTimestamp: page.timestamp,
    })
  })
  return documents
}

function validHistoricalPageUrl(value) {
  try {
    const url = new URL(value)
    const pathname = decodeURIComponent(url.pathname).toLowerCase()
    if (!isHistoricalProjectHost(url.hostname)) return false
    if (url.search || url.hash || pathname.includes('/wp-admin') || pathname.includes('/wp-login')) return false
    if (pathname.includes('/wp-json') || pathname.includes('/.well-known') || pathname.includes('/feed')) return false
    if (/\.(?:pdf|jpe?g|png|gif|svg|css|js|xml|zip)$/i.test(pathname)) return false
    return pathname.endsWith('/')
  } catch {
    return false
  }
}

function cdxPageId(originalUrl) {
  const pathname = new URL(originalUrl).pathname.replace(/^\/+|\/+$/g, '') || 'home'
  return `cdx-${pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80)}`
}

function pageMayContainCourtFiles(value) {
  try {
    const pathname = new URL(value).pathname.toLowerCase()
    return [
      '/2023/12/16/case-123-cr-00118-at/',
      '/2025/03/22/march-22-2025-breaking-update-formerfedsgroup-takes-bold-action-to-protect-thousands-of-hex-victims/',
      '/2025/04/05/a-call-for-justice-motions-filed-to-restore-seized-funds-to-himalaya-exchange-investors/',
      '/2025/04/08/important-update-on-himalaya-exchange-forfeiture-process/',
    ].some((suffix) => pathname.endsWith(suffix))
  } catch {
    return false
  }
}

function selectHistoricalPageCaptures(captures) {
  const byUrl = new Map()
  for (const capture of captures) {
    const url = canonicalHistoricalUrl(capture.url)
    const group = byUrl.get(url) ?? []
    group.push({ ...capture, url })
    byUrl.set(url, group)
  }
  const selected = []
  for (const group of byUrl.values()) {
    const unique = [...new Map(group.map((page) => [page.timestamp, page])).values()]
      .sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)))
    if (pageMayContainCourtFiles(unique[0]?.url)) selected.push(...unique)
    else if (unique.length) selected.push(unique.at(-1))
  }
  return selected.sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)))
}

async function discoverHistoricalPages() {
  try {
    const rows = await fetchCdxRows({
      url: 'himalayarestoration.com/*',
      output: 'json',
      fl: 'timestamp,original,statuscode,mimetype,digest',
      filter: ['statuscode:200'],
      collapse: 'digest',
      from: '2023',
      to: '2026',
    })
    const captures = rows
      .filter((row) => validHistoricalPageUrl(row.original))
      .map((row) => ({
        id: cdxPageId(row.original),
        timestamp: row.timestamp,
        capturedAt: timestampToIso(row.timestamp),
        url: row.original,
        digest: row.digest ?? null,
      }))
    if (captures.length) return selectHistoricalPageCaptures([...historicalPageFallback, ...captures])
  } catch {
    // Keep the verified fallback below. CDX regularly returns transient 503 responses.
  }
  return historicalPageFallback
}

async function mapConcurrent(items, limit, worker) {
  const results = []
  let cursor = 0
  const runners = Array.from({ length: Math.max(1, limit) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

async function discoverHistoricalPdfs() {
  try {
    const rows = await fetchCdxRows({
      url: 'himalayarestoration.com/wp-content/uploads/*',
      output: 'json',
      fl: 'timestamp,original,statuscode,mimetype,digest',
      filter: ['statuscode:200', 'mimetype:application/pdf'],
      collapse: 'urlkey',
      from: '2023',
      to: '2026',
    })
    const snapshots = rows
      .filter((row) => /\.pdf(?:$|[?#])/i.test(row.original))
      .map((row) => ({
        timestamp: row.timestamp,
        originalUrl: canonicalHistoricalUrl(row.original),
        digest: row.digest ?? null,
        captureMimeType: row.mimetype ?? 'application/pdf',
      }))
    if (snapshots.length) return snapshots
  } catch {
    // The verified fallback still preserves the full known public PDF index.
  }
  return historicalPdfFallback
}

function himalayaSearchAliases(docNumber = null) {
  return [
    'Himalaya Restoration', 'Himalaya Exchange', 'HEX', '喜交所', '喜马拉雅交易所',
    docNumber ? `Doc ${docNumber}` : '',
  ].filter(Boolean)
}

function historicalPageRecord(page, title, body, externalLinks) {
  return {
    id: `historical-${page.id}`,
    resourceKind: 'web_page',
    sourceId: 'himalaya-restoration-archive',
    caseId: 'sdny-23-cr-118',
    kind: 'historical_page',
    sourceUrl: page.replayUrl,
    originalUrl: page.url,
    sourceLabel: 'Himalaya Restoration historical public archive',
    title: title || page.url,
    publishedAt: null,
    modifiedAt: null,
    capturedAt: page.capturedAt,
    text: body,
    externalLinks,
    searchAliases: himalayaSearchAliases(),
  }
}

export async function scanCurrentHimalayaRestoration() {
  const records = []
  for (const url of currentApiTargets) {
    const { text } = await fetchText(url)
    const payload = JSON.parse(text)
    const kind = url.includes('/pages?') ? 'page' : url.includes('/posts?') ? 'post' : 'media'
    for (const item of Array.isArray(payload) ? payload : []) records.push(htmlRecord(item, kind))
  }
  const publicRecords = records.filter((record) => record.sourceUrl && record.title && record.title !== 'Sample Page')
  const documents = publicRecords.flatMap((record) => record.externalLinks
    .filter((url) => /\.pdf(?:$|[?#])/i.test(url))
    .map((url) => ({
      sourceId: 'himalaya-restoration',
      caseId: 'sdny-23-cr-118',
      sourcePage: record.sourceUrl,
      sourceLabel: 'Himalaya Restoration public project site',
      title: historicalDocumentTitle(url, ''),
      docNumber: docketNumberFromHistoricalLink(url),
      originalUrl: url,
      url,
      subdir: 'sdny-23-cr-118-himalaya-restoration',
      searchAliases: himalayaSearchAliases(docketNumberFromHistoricalLink(url)),
    })))
  return { records: publicRecords, documents }
}

export async function scanHistoricalHimalayaRestoration() {
  const [pageTargets, pdfSnapshots] = await Promise.all([
    discoverHistoricalPages(),
    discoverHistoricalPdfs(),
  ])
  const pdfByOriginalUrl = new Map(pdfSnapshots.map((snapshot) => [canonicalHistoricalUrl(snapshot.originalUrl), snapshot]))
  const pdfMetadata = new Map(historicalLinkedDocumentFallback
    .map((metadata) => [canonicalHistoricalUrl(metadata.originalUrl), metadata]))
  const pagesByUrl = new Map()

  const captureResults = await mapConcurrent(pageTargets, 4, async (target) => {
    const page = { ...target, replayUrl: waybackReplayUrl(target.timestamp, target.url) }
    try {
      const { text } = await fetchText(page.replayUrl, 60000)
      const $ = cheerio.load(text)
      const title = cleanText($('title').text()).replace(/\s*\|\s*Himalaya Restoration\s*$/i, '')
      const body = cleanText($('article, .et_pb_post_content, main, #main-content').first().text())
      const externalLinks = [...new Set($('a[href], iframe[src], embed[src], object[data]')
        .map((_, element) => $(element).attr('href') ?? $(element).attr('src') ?? $(element).attr('data'))
        .get()
        .filter(Boolean)
        .map((value) => normalizedArchiveOriginalUrl(value)))]
      const pageDocuments = collectHistoricalPdfMetadata(text, page)
      return { page, title, body, externalLinks, pageDocuments, status: 'ok' }
    } catch (error) {
      return { page, status: 'error', error: error instanceof Error ? error.message : String(error) }
    }
  })

  for (const result of captureResults.sort((left, right) => String(left.page.timestamp).localeCompare(String(right.page.timestamp)))) {
    const { page } = result
    const aggregate = pagesByUrl.get(page.url) ?? {
      url: page.url,
      id: page.id,
      captureCount: 0,
      failedCaptureCount: 0,
      documentUrls: new Set(),
      latestSuccessful: null,
      latestError: null,
    }
    aggregate.captureCount += 1
    if (result.status === 'ok') {
      for (const [originalUrl, metadata] of result.pageDocuments) pdfMetadata.set(originalUrl, metadata)
      for (const originalUrl of result.pageDocuments.keys()) aggregate.documentUrls.add(originalUrl)
      aggregate.latestSuccessful = { ...page, title: result.title, text: result.body, externalLinks: result.externalLinks, status: 'ok' }
    } else {
      aggregate.failedCaptureCount += 1
      aggregate.latestError = { ...page, title: page.url, text: '', status: 'error', error: result.error }
    }
    pagesByUrl.set(page.url, aggregate)
  }

  const pages = []
  const records = []
  for (const aggregate of pagesByUrl.values()) {
    const selected = aggregate.latestSuccessful ?? aggregate.latestError
    if (!selected) continue
    const page = {
      ...selected,
      captureCount: aggregate.captureCount,
      failedCaptureCount: aggregate.failedCaptureCount,
      documentCount: aggregate.documentUrls.size,
    }
    pages.push(page)
    records.push({
      ...historicalPageRecord(page, page.title, page.text, page.externalLinks ?? []),
      captureStatus: page.status,
      captureError: page.error ?? null,
    })
  }

  const documentSnapshots = new Map(pdfByOriginalUrl)
  for (const [originalUrl, metadata] of pdfMetadata) {
    if (documentSnapshots.has(originalUrl)) continue
    documentSnapshots.set(originalUrl, {
      timestamp: metadata.archiveTimestamp,
      originalUrl,
      digest: null,
      captureMimeType: null,
      archiveAvailability: 'linked_no_pdf_capture',
    })
  }

  const documents = [...documentSnapshots.values()].map((snapshot) => historicalDocument(snapshot, pdfMetadata.get(canonicalHistoricalUrl(snapshot.originalUrl))))
  const recapDocuments = documents
    .map(historicalRecapCounterpart)
    .filter(Boolean)
  const capturedPdfCount = pdfByOriginalUrl.size
  const linkedDocumentCount = pdfMetadata.size
  return {
    pages,
    records,
    documents,
    recapDocuments,
    cdxPdfCount: capturedPdfCount,
    capturedPdfCount,
    linkedDocumentCount,
    unavailableLinkedPdfCount: documents.filter((document) => document.archiveAvailability === 'linked_no_pdf_capture').length,
    pageCaptureCount: pageTargets.length,
    successfulPageCount: pages.filter((page) => page.status === 'ok').length,
    failedPageCount: pages.filter((page) => page.status !== 'ok').length,
  }
}

export async function scanHimalayaRestorationArchive() {
  const [current, historical] = await Promise.all([
    scanCurrentHimalayaRestoration(),
    scanHistoricalHimalayaRestoration(),
  ])
  return {
    current,
    historical,
    records: [...current.records, ...historical.records],
    documents: [...new Map([...current.documents, ...historical.documents].map((document) => [document.originalUrl ?? document.url, document])).values()],
    recapDocuments: [...new Map(historical.recapDocuments.map((document) => [document.url, document])).values()],
  }
}

export function himalayaRestorationSearchAliases() {
  return himalayaSearchAliases()
}
