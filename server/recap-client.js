import * as cheerio from 'cheerio'
import { readTextWithLimit, safeFetch } from './safe-fetch.js'
import { resolvedSecret } from './settings-store.js'

const recapTargets = [
  { caseId: 'sdny-23-cr-118', courtId: 'nysd', court: 'S.D.N.Y.', docketNumber: '1:23-cr-00118', courtListenerDocketId: 67012324, label: 'S.D.N.Y. criminal case' },
  { caseId: 'ca2-26-1853', courtId: 'ca2', court: 'Second Circuit', docketNumber: '26-1853', courtListenerDocketId: 73605152, label: 'Second Circuit direct criminal appeal' },
  { caseId: 'sdny-23-cv-2200', courtId: 'nysd', court: 'S.D.N.Y.', docketNumber: '1:23-cv-02200', courtListenerDocketId: 67011674, label: 'S.D.N.Y. SEC civil case' },
  { caseId: 'dconn-22-50073', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '22-50073', courtListenerDocketId: 63003532, label: 'D. Conn. bankruptcy case' },
  { caseId: 'bkd-22-05032', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '22-05032', courtListenerDocketId: 66575175, label: 'D. Conn. bankruptcy adversary proceeding' },
  { caseId: 'dconn-26-mc-00042', courtId: 'ctd', court: 'D. Conn.', docketNumber: '3:26-mc-00042', courtListenerDocketId: 73139213, label: 'D. Conn. withdrawal proceeding 3:26-mc-00042' },
  { caseId: 'dconn-26-mc-00043', courtId: 'ctd', court: 'D. Conn.', docketNumber: '3:26-mc-00043', courtListenerDocketId: 73139242, label: 'D. Conn. withdrawal proceeding 3:26-mc-00043' },
  { caseId: 'dconn-26-mc-00044', courtId: 'ctd', court: 'D. Conn.', docketNumber: '3:26-mc-00044', courtListenerDocketId: 73139287, label: 'D. Conn. withdrawal proceeding 3:26-mc-00044' },
  { caseId: 'dconn-26-mc-00045', courtId: 'ctd', court: 'D. Conn.', docketNumber: '3:26-mc-00045', courtListenerDocketId: 73139323, label: 'D. Conn. withdrawal proceeding 3:26-mc-00045' },
  { caseId: 'dconn-26-mc-00046', courtId: 'ctd', court: 'D. Conn.', docketNumber: '3:26-mc-00046', courtListenerDocketId: 73139787, label: 'D. Conn. withdrawal proceeding 3:26-mc-00046' },
  { caseId: 'dconn-26-mc-00047', courtId: 'ctd', court: 'D. Conn.', docketNumber: '3:26-mc-00047', courtListenerDocketId: 73139854, label: 'D. Conn. withdrawal proceeding 3:26-mc-00047' },
  { caseId: 'dconn-26-mc-00048', courtId: 'ctd', court: 'D. Conn.', docketNumber: '3:26-mc-00048', courtListenerDocketId: 73139912, label: 'D. Conn. withdrawal proceeding 3:26-mc-00048' },
  { caseId: 'dconn-26-mc-00049', courtId: 'ctd', court: 'D. Conn.', docketNumber: '3:26-mc-00049', courtListenerDocketId: 73140581, label: 'D. Conn. withdrawal proceeding 3:26-mc-00049' },
  { caseId: 'ca2-24-2504', courtId: 'ca2', court: 'Second Circuit', docketNumber: '24-2504', courtListenerDocketId: 72017619, label: 'Second Circuit asset appeal' },
  { caseId: 'edny-26-mc-2795', courtId: 'nyed', court: 'E.D.N.Y.', docketNumber: '1:26-mc-02795', courtListenerDocketId: 73581840, label: 'E.D.N.Y. Section 1782 related proceeding' },
  { caseId: 'ca2-26-563-dx', courtId: 'ca2', court: 'Second Circuit', docketNumber: '26-563', courtListenerDocketId: 73162417, label: 'Second Circuit In re DX proceeding arising from 1:23-cr-00118' },
  { caseId: 'bkd-24-05021-bannon', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '24-05021', courtListenerDocketId: 68240777, label: 'Despins v. Bannon Strategic Advisors, Inc.' },
  { caseId: 'bkd-24-05249-aca', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '24-05249', courtListenerDocketId: 68254946, label: 'Despins v. ACA Capital Group Ltd.' },
  { caseId: 'bkd-24-05246-wa-hf', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '24-05246', courtListenerDocketId: 68254326, label: 'Despins v. WA & HF LLC' },
  { caseId: 'bkd-24-05006-aws', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '24-05006', courtListenerDocketId: 68239714, label: 'Despins v. Amazon Web Services, Inc.' },
  { caseId: 'bkd-24-05057-amazon', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '24-05057', courtListenerDocketId: 68241991, label: 'Despins v. Amazon.com, Inc.' },
  { caseId: 'bkd-hk-int-despins', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '22-05003', courtListenerDocketId: 63226971, label: 'HK International Funds Investments (USA) Limited v. Despins' },
  { caseId: 'bkd-24-05275-lamp', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '24-05275', courtListenerDocketId: 68256882, label: 'Despins v. Lamp Capital LLC' },
  { caseId: 'bkd-25-05088-1stdibs', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '25-05088', courtListenerDocketId: 71117828, label: 'Despins v. 1stdibs.com Inc.' },
  { caseId: 'bkd-25-05094-ny-blinds', courtId: 'ctb', court: 'D. Conn. Bankruptcy Court', docketNumber: '25-05094', courtListenerDocketId: 71118337, label: 'Despins v. NY Blinds and Shades Inc.' },
  { caseId: 'az-voice-of-guo', courtId: 'azd', court: 'D. Ariz.', docketNumber: '2:21-cv-01079', courtListenerDocketId: 60004239, label: 'Zhang v. Voice of Guo Media Incorporated' },
]

let publicFeedSnapshot = null
let publicFeedPromise = null
let publicSearchSnapshot = null
let publicSearchPromise = null
let publicPortfolioSnapshot = null
let publicPortfolioPromise = null
let recapArchiveSnapshot = null
let recapArchivePromise = null
let publicSearchRequestQueue = Promise.resolve()
const publicSearchRequestTimes = []
const snapshotTtlMs = 60_000
const publicSearchWindowMs = 60_500
const publicSearchWindowLimit = 5

export async function scanPublicRecapSearch(options = {}) {
  const requestedTargets = publicSearchTargets(options)
  const pageLimit = boundedInteger(options.pageLimit, 1, 5, 1)
  const cacheKey = `${requestedTargets.map((target) => target.courtListenerDocketId).join(',')}:${pageLimit}`
  if (publicSearchSnapshot?.key === cacheKey && Date.now() - publicSearchSnapshot.at < snapshotTtlMs) {
    return publicSearchSnapshot.value
  }
  if (publicSearchPromise?.key === cacheKey) return publicSearchPromise.value
  const scan = performPublicRecapSearch(requestedTargets, pageLimit)
  publicSearchPromise = { key: cacheKey, value: scan }
  try {
    const value = await scan
    publicSearchSnapshot = { key: cacheKey, at: Date.now(), value }
    return value
  } finally {
    publicSearchPromise = null
  }
}

export async function scanPublicRecapPortfolio(options = {}) {
  const query = cleanText(options.query || '"22-50073"').slice(0, 200)
  const courtId = cleanText(options.courtId || 'ctb').replace(/[^a-z0-9_-]/gi, '').slice(0, 24)
  const pageLimit = boundedInteger(options.pageLimit, 1, 5, 5)
  const cacheKey = `${query}:${courtId}:${pageLimit}`
  if (publicPortfolioSnapshot?.key === cacheKey && Date.now() - publicPortfolioSnapshot.at < snapshotTtlMs) {
    return publicPortfolioSnapshot.value
  }
  if (publicPortfolioPromise?.key === cacheKey) return publicPortfolioPromise.value
  const scan = performPublicRecapPortfolioSearch(query, courtId, pageLimit)
  publicPortfolioPromise = { key: cacheKey, value: scan }
  try {
    const value = await scan
    publicPortfolioSnapshot = { key: cacheKey, at: Date.now(), value }
    return value
  } finally {
    publicPortfolioPromise = null
  }
}

function publicSearchTargets(options) {
  const targetIds = Array.isArray(options.targetIds)
    ? new Set(options.targetIds.map(Number).filter((value) => Number.isInteger(value) && value > 0))
    : null
  return recapTargets.filter((target) => !targetIds || targetIds.has(Number(target.courtListenerDocketId)))
}

async function performPublicRecapSearch(targets, pageLimit) {
  const targetResults = []
  for (let index = 0; index < targets.length; index += 20) {
    const batch = targets.slice(index, index + 20)
    try {
      const rows = await searchPublicRecapTargetBatch(batch, pageLimit)
      const rowsByDocket = new Map(rows.map((row) => [Number(row.docket_id), row]))
      for (const target of batch) targetResults.push(publicSearchTargetResult(target, rowsByDocket.get(Number(target.courtListenerDocketId))))
    } catch (error) {
      for (const target of batch) {
        targetResults.push({
          ...target,
          matchingDockets: 0,
          docketEntries: 0,
          availableDocuments: 0,
          latestDate: null,
          docketUrls: [],
          events: [],
          documents: [],
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
  return {
    mode: 'public_search',
    targets: targetResults.map(({ events: _events, documents: _documents, ...target }) => target),
    events: dedupeBy(targetResults.flatMap((target) => target.events), (event) => event.id)
      .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id)),
    documents: dedupeBy(targetResults.flatMap((target) => target.documents), (document) => document.url),
  }
}

async function performPublicRecapPortfolioSearch(query, courtId, pageLimit) {
  let url = new URL('https://www.courtlistener.com/api/rest/v4/search/')
  url.searchParams.set('q', query)
  if (courtId) url.searchParams.set('court', courtId)
  url.searchParams.set('type', 'r')
  const rowsByDocket = new Map()
  let pagesScanned = 0
  while (url && pagesScanned < pageLimit) {
    const payload = await fetchPublicSearchJson(url)
    for (const row of payload.results ?? []) {
      const docketId = Number(row.docket_id)
      if (!Number.isInteger(docketId) || docketId <= 0) continue
      rowsByDocket.set(docketId, row)
    }
    const next = typeof payload.next === 'string' ? publicCourtListenerApiUrl(payload.next) : null
    url = next ? new URL(next) : null
    pagesScanned += 1
  }

  const knownTargetById = new Map(recapTargets.map((target) => [Number(target.courtListenerDocketId), target]))
  const targetResults = []
  for (const [docketId, row] of rowsByDocket.entries()) {
    const knownTarget = knownTargetById.get(docketId)
    const dynamicCourtId = cleanText(row.court_id || courtId || 'unknown').replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'unknown'
    const target = knownTarget ?? {
      caseId: `discovered-${dynamicCourtId}-${docketId}`,
      courtId: dynamicCourtId,
      court: cleanText(row.court_citation_string || row.court || dynamicCourtId),
      docketNumber: cleanText(row.docketNumber) || 'Unverified docket number',
      courtListenerDocketId: docketId,
      label: cleanText(row.caseName || row.case_name_full || `CourtListener docket ${docketId}`),
    }
    const events = []
    const documents = []
    for (const document of row.recap_documents ?? []) {
      const event = publicSearchEvent(target, row, document)
      if (event) events.push(event)
      const record = publicSearchDocument(target, row, document)
      if (record) documents.push(record)
    }
    const dates = events.map((event) => event.date).filter(Boolean).sort()
    targetResults.push({
      ...target,
      title: cleanText(row.caseName || row.case_name_full || target.label),
      matchingDockets: 1,
      docketEntries: events.length,
      availableDocuments: documents.length,
      latestDate: dates.at(-1) ?? (cleanText(row.dateTerminated || row.dateFiled).slice(0, 10) || null),
      dateFiled: cleanText(row.dateFiled).slice(0, 10) || null,
      dateTerminated: cleanText(row.dateTerminated).slice(0, 10) || null,
      parties: Array.isArray(row.party) ? row.party.map(cleanText).filter(Boolean).slice(0, 80) : [],
      docketUrls: [`https://www.courtlistener.com/docket/${docketId}/`],
      events,
      documents,
    })
  }
  return {
    mode: 'public_portfolio_search',
    query,
    courtId,
    pagesScanned,
    targets: targetResults.map(({ events: _events, documents: _documents, ...target }) => target),
    events: dedupeBy(targetResults.flatMap((target) => target.events), (event) => event.id)
      .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id)),
    documents: dedupeBy(targetResults.flatMap((target) => target.documents), (document) => document.url),
  }
}

async function searchPublicRecapTargetBatch(targets, pageLimit) {
  let url = new URL('https://www.courtlistener.com/api/rest/v4/search/')
  url.searchParams.set('q', `docket_id:(${targets.map((target) => target.courtListenerDocketId).join(' OR ')})`)
  url.searchParams.set('type', 'r')
  let pages = 0
  const rows = []
  while (url && pages < pageLimit) {
    const payload = await fetchPublicSearchJson(url)
    const requestedIds = new Set(targets.map((target) => Number(target.courtListenerDocketId)))
    rows.push(...(payload.results ?? []).filter((row) => requestedIds.has(Number(row.docket_id))))
    const next = typeof payload.next === 'string' ? publicCourtListenerApiUrl(payload.next) : null
    url = next ? new URL(next) : null
    pages += 1
  }
  return rows
}

function publicSearchTargetResult(target, row) {
  const events = []
  const documents = []
  if (row) {
    for (const document of row.recap_documents ?? []) {
      const event = publicSearchEvent(target, row, document)
      if (event) events.push(event)
      const record = publicSearchDocument(target, row, document)
      if (record) documents.push(record)
    }
  }
  const dates = events.map((event) => event.date).filter(Boolean).sort()
  return {
    ...target,
    matchingDockets: row ? 1 : 0,
    docketEntries: events.length,
    availableDocuments: documents.length,
    latestDate: dates.at(-1) ?? null,
    docketUrls: row ? [`https://www.courtlistener.com/docket/${target.courtListenerDocketId}/`] : [],
    events: dedupeBy(events, (event) => event.id),
    documents: dedupeBy(documents, (document) => document.url),
  }
}

async function fetchPublicSearchJson(url) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await reservePublicSearchRequestSlot()
    const response = await safeFetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'guo-intel-local/0.1 (+local research app)',
      },
    }, { timeoutMs: 20000, includeOpenAI: false })
    const body = await readTextWithLimit(response, 10 * 1024 * 1024)
    if (response.ok) return JSON.parse(body)
    if (response.status === 429 && attempt === 0) {
      const retryDelayMs = publicSearchRetryDelay(response, body)
      if (retryDelayMs <= 5_000) {
        await sleep(retryDelayMs)
        continue
      }
    }
    const error = new Error(`CourtListener public search returned HTTP ${response.status}: ${body.slice(0, 220)}`)
    error.statusCode = response.status
    throw error
  }
  throw new Error('CourtListener public search retry was exhausted.')
}

function publicSearchRetryDelay(response, body) {
  const retryAfter = response.headers.get('retry-after')
  const headerSeconds = retryAfter == null ? Number.NaN : Number(retryAfter)
  const bodySeconds = Number(String(body).match(/available in\s+(\d+)\s+seconds?/i)?.[1])
  const seconds = Number.isFinite(headerSeconds) && headerSeconds >= 0
    ? headerSeconds
    : Number.isFinite(bodySeconds) && bodySeconds >= 0
      ? bodySeconds
      : 60
  return Math.min(65_000, Math.max(1_000, Math.ceil(seconds * 1000) + 500))
}

async function reservePublicSearchRequestSlot() {
  const operation = publicSearchRequestQueue.catch(() => undefined).then(async () => {
    while (true) {
      const now = Date.now()
      while (publicSearchRequestTimes.length && publicSearchRequestTimes[0] <= now - publicSearchWindowMs) {
        publicSearchRequestTimes.shift()
      }
      if (publicSearchRequestTimes.length < publicSearchWindowLimit) {
        publicSearchRequestTimes.push(Date.now())
        return
      }
      const waitMs = Math.max(250, publicSearchRequestTimes[0] + publicSearchWindowMs - now)
      await sleep(waitMs)
    }
  })
  publicSearchRequestQueue = operation.catch(() => undefined)
  return operation
}

function publicSearchEvent(target, row, document) {
  const date = String(document.entry_date_filed ?? '').slice(0, 10)
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) return null
  const entryNumber = publicSearchDocumentNumber(document)
  const description = cleanText(document.description || document.short_description || `RECAP docket entry ${entryNumber || ''}`)
  const category = categoryFor(description)
  return {
    id: `recap-search-${target.caseId}-${target.courtListenerDocketId}-${document.id ?? `${date}-${entryNumber}`}`,
    date,
    dateBasis: 'court_filed',
    dateConfidence: 'high',
    title: entryNumber ? `RECAP docket entry ${entryNumber}: ${shorten(description, 112)}` : `RECAP docket update: ${shorten(description, 112)}`,
    summary: shorten(description, 1600),
    impact: impactFor(category),
    caseId: target.caseId,
    relatedCaseIds: [target.caseId],
    court: target.court,
    docketNumber: target.docketNumber,
    courtListenerDocketId: target.courtListenerDocketId,
    filingNumber: entryNumber || null,
    category,
    severity: severityFor(category, description),
    sourceId: 'courtlistener-recap',
    sourceLabel: 'CourtListener public RECAP search',
    sourceType: 'CourtListener / RECAP',
    sourceUrl: courtListenerPageUrl(document.absolute_url) || `https://www.courtlistener.com/docket/${target.courtListenerDocketId}/`,
    confidence: 'high',
    assertionType: 'Public RECAP search metadata',
    entities: entitiesFor(`${row.caseName ?? ''} ${description}`),
    tags: tagsFor(description),
  }
}

function publicSearchDocument(target, row, document) {
  if (!document?.is_available || !document.filepath_local) return null
  const url = courtListenerStorageUrl(document.filepath_local)
  if (!url) return null
  const docNumber = publicSearchDocumentNumber(document)
  const description = cleanText(document.description || document.short_description || `RECAP document ${docNumber || document.id || ''}`)
  return {
    sourceId: 'courtlistener-recap',
    caseId: target.caseId,
    courtId: target.courtId,
    court: target.court,
    docketNumber: target.docketNumber,
    courtListenerDocketId: target.courtListenerDocketId,
    sourcePage: courtListenerPageUrl(document.absolute_url) || `https://www.courtlistener.com/docket/${target.courtListenerDocketId}/`,
    sourceLabel: `${target.label} public RECAP search`,
    title: description,
    docNumber: docNumber || null,
    filedAt: String(document.entry_date_filed ?? '').slice(0, 10) || null,
    url,
    subdir: `${target.caseId}-recap`,
    recapDocumentId: document.id ?? null,
    pacerDocumentId: document.pacer_doc_id || null,
    pageCount: document.page_count ?? null,
    discoveryMethod: 'courtlistener_public_structured_search',
  }
}

function publicSearchDocumentNumber(document) {
  const entryNumber = String(document.entry_number ?? document.document_number ?? '').trim()
  const attachment = String(document.attachment_number ?? '').trim()
  return entryNumber ? `${entryNumber}${attachment ? `-${attachment}` : ''}` : ''
}

function publicCourtListenerApiUrl(value) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' && url.hostname === 'www.courtlistener.com' && url.pathname.startsWith('/api/rest/v4/search/')
      ? url.toString()
      : ''
  } catch {
    return ''
  }
}

export async function scanPublicRecapFeeds(options = {}) {
  if (!options.targetIds?.length && publicFeedSnapshot && Date.now() - publicFeedSnapshot.at < snapshotTtlMs) {
    return publicFeedSnapshot.value
  }
  if (!options.targetIds?.length && publicFeedPromise) return publicFeedPromise
  const scan = performPublicRecapFeedScan(options)
  if (options.targetIds?.length) return scan
  publicFeedPromise = scan.then((value) => {
    publicFeedSnapshot = { at: Date.now(), value }
    return value
  }).finally(() => {
    publicFeedPromise = null
  })
  return publicFeedPromise
}

async function performPublicRecapFeedScan(options = {}) {
  const targetIds = Array.isArray(options.targetIds) ? new Set(options.targetIds.map(String)) : null
  const targets = recapTargets.filter((target) => !targetIds || targetIds.has(String(target.courtListenerDocketId)))
  const settled = await Promise.allSettled(targets.map(async (target) => {
    const feedUrl = publicFeedUrl(target)
    const response = await safeFetch(feedUrl, {
      headers: {
        Accept: 'application/atom+xml,application/xml;q=0.9,text/xml;q=0.8',
        'User-Agent': 'guo-intel-local/0.1 (+local research app)',
      },
    }, { timeoutMs: 20000, includeOpenAI: false })
    const body = await readTextWithLimit(response, 5 * 1024 * 1024)
    if (!response.ok) {
      const error = new Error(`CourtListener public feed returned HTTP ${response.status}: ${body.slice(0, 220)}`)
      error.statusCode = response.status
      throw error
    }
    const events = parsePublicRecapFeed(body, target)
    return {
      ...target,
      feedUrl,
      matchingDockets: events.length ? 1 : 0,
      docketEntries: events.length,
      availableDocuments: 0,
      latestDate: events[0]?.date ?? null,
      docketUrls: events[0]?.sourceUrl ? [events[0].sourceUrl] : [],
      events,
    }
  }))

  const targetResults = settled.map((result, index) => {
    if (result.status === 'fulfilled') return result.value
    const target = targets[index]
    return {
      ...target,
      feedUrl: publicFeedUrl(target),
      matchingDockets: 0,
      docketEntries: 0,
      availableDocuments: 0,
      latestDate: null,
      docketUrls: [],
      events: [],
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    }
  })
  const events = targetResults.flatMap((target) => target.events)
  return {
    mode: 'public_feed',
    targets: targetResults.map(({ events: _events, ...target }) => target),
    events: dedupeBy(events, (event) => event.id).sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id)),
    documents: [],
  }
}

export function parsePublicRecapFeed(xml, target) {
  if (!target?.courtListenerDocketId || !target?.caseId) return []
  const $ = cheerio.load(String(xml ?? ''), { xmlMode: true })
  const events = []
  $('entry').each((_, element) => {
    const link = $(element).find('link[rel="alternate"]').first().attr('href') || $(element).find('id').first().text()
    const parsedLink = publicDocketEntryLink(link, target.courtListenerDocketId)
    if (!parsedLink) return
    // CourtListener's RECAP SearchFeed maps docket-entry entry_date_filed to
    // Atom <published>. Feed-level <updated> is never a filing-date fallback.
    const date = cleanText($(element).find('published').first().text()).slice(0, 10)
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) return

    const feedTitle = cleanText($(element).find('title').first().text())
    const summary = atomSummaryText($(element).find('summary').first().text())
    const filingNumber = parsedLink.attachmentNumber
      ? `${parsedLink.entryNumber}-${parsedLink.attachmentNumber}`
      : parsedLink.entryNumber
    const description = summary || `${feedTitle || target.label} docket entry ${filingNumber}`
    const category = categoryFor(description)
    events.push({
      id: `recap-feed-${target.caseId}-${target.courtListenerDocketId}-${filingNumber}`,
      date,
      dateBasis: 'court_filed',
      dateConfidence: 'high',
      title: `RECAP docket entry ${filingNumber}: ${shorten(description, 112)}`,
      summary: shorten(description, 1600),
      impact: impactFor(category),
      caseId: target.caseId,
      relatedCaseIds: [target.caseId],
      court: target.court,
      docketNumber: target.docketNumber,
      courtListenerDocketId: target.courtListenerDocketId,
      filingNumber,
      category,
      severity: severityFor(category, description),
      sourceId: 'courtlistener-recap',
      sourceLabel: 'CourtListener public RECAP feed',
      sourceType: 'CourtListener / RECAP',
      sourceUrl: parsedLink.url,
      confidence: 'high',
      assertionType: 'Public RECAP feed metadata',
      entities: entitiesFor(`${feedTitle} ${description}`),
      tags: tagsFor(description),
    })
  })
  return dedupeBy(events, (event) => event.id).sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id))
}

export async function scanRecapArchive(options = {}) {
  const token = resolvedSecret('courtlistenerToken')
  if (!token) {
    const error = new Error('CourtListener / RECAP token is not configured.')
    error.statusCode = 401
    throw error
  }

  const pageLimit = boundedInteger(options.pageLimit, 1, 100, 3)
  const cacheKey = `${token.slice(0, 6)}:${pageLimit}`
  if (recapArchiveSnapshot?.key === cacheKey && Date.now() - recapArchiveSnapshot.at < snapshotTtlMs) {
    return recapArchiveSnapshot.value
  }
  if (recapArchivePromise?.key === cacheKey) return recapArchivePromise.value
  const scan = performRecapArchiveScan(token, pageLimit)
  recapArchivePromise = { key: cacheKey, value: scan }
  try {
    const value = await scan
    recapArchiveSnapshot = { key: cacheKey, at: Date.now(), value }
    return value
  } finally {
    recapArchivePromise = null
  }
}

async function performRecapArchiveScan(token, pageLimit) {
  const docketResults = []
  const events = []
  const documents = []

  for (const target of recapTargets) {
    const docketUrl = new URL(`/api/rest/v4/dockets/${target.courtListenerDocketId}/`, 'https://www.courtlistener.com/')
    const docket = await fetchRecapJson(docketUrl, token)
    const dockets = Number(docket?.id) === target.courtListenerDocketId ? [docket] : []
    const targetResult = {
      ...target,
      matchingDockets: dockets.length,
      docketEntries: 0,
      availableDocuments: 0,
      docketUrls: dockets.map((docket) => courtListenerPageUrl(docket.absolute_url)).filter(Boolean),
    }

    for (const docket of dockets) {
      const entryUrl = new URL('https://www.courtlistener.com/api/rest/v4/docket-entries/')
      entryUrl.searchParams.set('docket', String(docket.id))
      entryUrl.searchParams.set('order_by', '-date_filed,-entry_number')
      const entries = await fetchRecapPages(entryUrl, token, pageLimit)
      targetResult.docketEntries += entries.length

      for (const entry of entries) {
        const event = recapEvent(target, docket, entry)
        if (event) events.push(event)
        for (const document of entry.recap_documents ?? []) {
          const record = recapDocument(target, docket, entry, document)
          if (record) {
            documents.push(record)
            targetResult.availableDocuments += 1
          }
        }
      }
    }
    docketResults.push(targetResult)
  }

  return {
    targets: docketResults,
    events: dedupeBy(events, (event) => event.id).sort((left, right) => right.date.localeCompare(left.date)),
    documents: dedupeBy(documents, (document) => document.url),
  }
}

async function fetchRecapPages(initialUrl, token, pageLimit) {
  const records = []
  let nextUrl = initialUrl.toString()
  let page = 0
  while (nextUrl && page < pageLimit) {
    const payload = await fetchRecapJson(nextUrl, token)
    records.push(...(payload.results ?? []))
    nextUrl = payload.next || ''
    page += 1
  }
  return records
}

async function fetchRecapJson(url, token) {
  const target = String(url)
  const response = await safeFetch(target, {
    headers: {
      Authorization: `Token ${token}`,
      Accept: 'application/json',
      'User-Agent': 'guo-intel-local/0.1 (+local research app)',
    },
  }, { timeoutMs: 20000, includeOpenAI: false })
  const body = await readTextWithLimit(response, 10 * 1024 * 1024)
  if (!response.ok) {
    const error = new Error(`CourtListener API returned HTTP ${response.status}: ${body.slice(0, 220)}`)
    error.statusCode = response.status
    throw error
  }
  return JSON.parse(body)
}

function recapEvent(target, docket, entry) {
  const date = String(entry.date_filed ?? '').slice(0, 10)
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) return null
  const entryNumber = String(entry.entry_number ?? entry.id ?? '').trim()
  const description = cleanText(entry.description || recapDocumentDescriptions(entry.recap_documents) || 'RECAP docket entry')
  const category = categoryFor(description)
  const sourceUrl = courtListenerPageUrl(docket.absolute_url) || 'https://www.courtlistener.com/recap/'
  return {
    id: `recap-${target.caseId}-${entry.id ?? `${date}-${entryNumber}`}`,
    date,
    dateBasis: 'court_filed',
    dateConfidence: 'high',
    title: entryNumber ? `RECAP docket entry ${entryNumber}: ${shorten(description, 112)}` : `RECAP docket update: ${shorten(description, 112)}`,
    summary: description,
    impact: impactFor(category),
    caseId: target.caseId,
    relatedCaseIds: [target.caseId],
    court: target.court,
    docketNumber: target.docketNumber,
    courtListenerDocketId: target.courtListenerDocketId,
    filingNumber: entryNumber || null,
    category,
    severity: severityFor(category, description),
    sourceId: 'courtlistener-recap',
    sourceLabel: 'CourtListener / RECAP',
    sourceType: 'CourtListener / RECAP',
    sourceUrl,
    confidence: 'high',
    assertionType: 'RECAP docket entry',
    entities: entitiesFor(description),
    tags: tagsFor(description),
  }
}

function recapDocument(target, docket, entry, document) {
  if (!document?.is_available || !document.filepath_local) return null
  const url = courtListenerStorageUrl(document.filepath_local)
  if (!url) return null
  const entryNumber = String(entry.entry_number ?? '').trim()
  const attachment = String(document.attachment_number ?? '').trim()
  const docNumber = entryNumber ? `${entryNumber}${attachment ? `-${attachment}` : ''}` : String(document.document_number ?? document.id ?? '')
  const description = cleanText(document.description || entry.description || `RECAP document ${docNumber}`)
  return {
    sourceId: 'courtlistener-recap',
    caseId: target.caseId,
    courtListenerDocketId: target.courtListenerDocketId,
    sourcePage: courtListenerPageUrl(docket.absolute_url) || 'https://www.courtlistener.com/recap/',
    sourceLabel: `${target.label} RECAP archive`,
    title: description,
    docNumber: docNumber || null,
    url,
    subdir: `${target.caseId}-recap`,
    recapDocumentId: document.id ?? null,
    pacerDocumentId: document.pacer_doc_id ?? null,
    pageCount: document.page_count ?? null,
  }
}

function courtListenerStorageUrl(value) {
  try {
    const url = new URL(String(value), 'https://storage.courtlistener.com/')
    return url.protocol === 'https:'
      && url.hostname === 'storage.courtlistener.com'
      && !url.port
      && !url.username
      && !url.password
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function courtListenerPageUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(String(value), 'https://www.courtlistener.com/')
    return url.protocol === 'https:' && url.hostname === 'www.courtlistener.com' ? url.toString() : ''
  } catch {
    return ''
  }
}

function publicFeedUrl(target) {
  const url = new URL('https://www.courtlistener.com/feed/search/')
  url.searchParams.set('q', `docket_id:${target.courtListenerDocketId}`)
  url.searchParams.set('type', 'r')
  return url.toString()
}

function publicDocketEntryLink(value, expectedDocketId) {
  try {
    const url = new URL(String(value))
    if (url.protocol !== 'https:' || url.hostname !== 'www.courtlistener.com' || url.username || url.password) return null
    const match = url.pathname.match(/^\/docket\/(\d+)\/(\d+)(?:\/(\d+))?\/[^/]+\/?$/)
    if (!match || Number(match[1]) !== Number(expectedDocketId)) return null
    return {
      url: `${url.origin}${url.pathname}`,
      entryNumber: match[2],
      attachmentNumber: match[3] ?? '',
    }
  } catch {
    return null
  }
}

function atomSummaryText(value) {
  if (!value) return ''
  const $ = cheerio.load(String(value))
  $('a').remove()
  return cleanText($.text())
}

function recapDocumentDescriptions(documents) {
  return (documents ?? []).map((document) => cleanText(document.description ?? '')).filter(Boolean).join('; ')
}

function categoryFor(value) {
  const lower = value.toLowerCase()
  if (lower.includes('mandamus')) return 'Mandamus'
  if (lower.includes('notice of appeal') || lower.includes('appeal')) return 'Appeal'
  if (lower.includes('sentenc')) return 'Sentencing'
  if (lower.includes('forfeiture') || lower.includes('853') || lower.includes('remission')) return 'Forfeiture'
  if (lower.includes('judgment')) return 'Judgment'
  if (lower.includes('transcript')) return 'Transcript'
  if (lower.includes('bankrupt') || lower.includes('trustee') || lower.includes('turnover')) return 'Bankruptcy'
  if (lower.includes('order')) return 'Order'
  return 'Docket Filing'
}

function severityFor(category, value) {
  if (['Judgment', 'Sentencing', 'Appeal'].includes(category)) return 'critical'
  if (['Mandamus', 'Forfeiture', 'Bankruptcy'].includes(category)) return 'high'
  if (/\b(grant|deny|denied|hearing|deadline)\b/i.test(value)) return 'medium'
  return 'low'
}

function impactFor(category) {
  const values = {
    Appeal: 'May change the controlling appellate schedule, issue preservation, or available relief; verify the operative filing and order.',
    Mandamus: 'Signals an extraordinary-writ dispute; legal effect depends on the appellate court disposition.',
    Forfeiture: 'May affect asset recovery, third-party claim deadlines, ownership disputes, or remission strategy.',
    Sentencing: 'May affect the judgment, appellate issues, custody exposure, loss findings, and forfeiture framework.',
    Judgment: 'May define finality, appeal timing, and post-judgment enforcement posture.',
    Bankruptcy: 'May affect estate ownership, turnover, sale, settlement, or related appellate rights.',
  }
  return values[category] ?? 'New RECAP docket activity; read the linked entry and available PDF before relying on it.'
}

function entitiesFor(value) {
  const lower = value.toLowerCase()
  const entities = []
  if (/guo|kwok|miles/.test(lower)) entities.push('ho-wan-kwok')
  if (/william je|kin ming je/.test(lower)) entities.push('kin-ming-je')
  if (/yvette|yanping wang/.test(lower)) entities.push('yanping-wang')
  if (lower.includes('gtv')) entities.push('gtv-media')
  if (lower.includes('hk international')) entities.push('hk-international')
  return entities
}

function tagsFor(value) {
  const lower = value.toLowerCase()
  const tags = [
    ['appeal', 'appeal'],
    ['forfeiture', 'forfeiture'],
    ['853', '853(n)'],
    ['bankrupt', 'bankruptcy'],
    ['trustee', 'trustee'],
    ['sentenc', 'sentencing'],
    ['transcript', 'transcript'],
    ['gtv', 'GTV'],
  ].filter(([needle]) => lower.includes(needle)).map(([, tag]) => tag)
  if (/\bSEC\b|Securities\s+and\s+Exchange\s+Commission|\bdisgorg(?:e|ed|ement|ing)?\b|\bFair\s+Fund\b/i.test(value)) tags.push('SEC')
  return tags
}

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function shorten(value, maximum) {
  return value.length > maximum ? `${value.slice(0, maximum - 1)}...` : value
}

function dedupeBy(values, keyFor) {
  return [...new Map(values.map((value) => [keyFor(value), value])).values()]
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)))
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export { recapTargets }
