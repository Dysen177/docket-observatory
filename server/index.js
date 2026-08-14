import express from 'express'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { open, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeEvent, buildPortfolioAnalysis, localAnalyzeEvent } from './analysis.js'
import { runSourceAdapters } from './adapters.js'
import { getAutomationRun, startAutomationRun } from './automation-runner.js'
import { analyzeDocumentBySourceUrl, buildDocumentAnalysis, buildDocumentCatalog } from './document-analysis.js'
import { localizeCompletenessAudit, localizeDocumentManifest, localizePayload, localizeRelationshipAudit, localizeSourceStatus, translateLegalTextToZh } from './i18n.js'
import { localizedMonitoringProfile } from './monitoring-profile.js'
import { buildLitigationPositions } from './litigation-positions.js'
import { buildProceduralCalendar } from './procedural-calendar.js'
import { createSeedState } from './seed.js'
import networkPolicy from './network-policy.cjs'
import { getPublicSettings, initializeSettingsStore, recordIntegrationDiagnostic, updateSettings, resolvedSecret } from './settings-store.js'
import { atomicWriteJson } from './atomic-write.js'
import { readCompletenessAudit, refreshCompletenessAudit } from './completeness-audit.js'
import { readRelationshipAudit, refreshRelationshipAudit } from './relationship-audit.js'
import { compareDocketNumbers, normalizeDocketNumber } from './docket-number.js'
import { documentVariantKey } from './document-variant.js'
import { ollamaGenerateJson } from './local-legal-ai.js'
import { refreshDocumentSearchIndex, warmDocumentSearchIndex } from './document-search.js'
import { cloudGenerateText, cloudModelForPurpose, cloudProviderConfigured, cloudProviderLabel, isCloudAiProvider } from './cloud-ai.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const cacheDir = path.resolve(process.env.GUO_INTEL_CACHE_DIR ?? path.join(__dirname, 'cache'))
const statePath = path.join(cacheDir, 'state.json')
const documentRoot = path.resolve(process.env.GUO_INTEL_DOWNLOAD_DIR ?? path.join(__dirname, '..', 'downloads', 'court-files-complete'))
const bundledDocumentRoot = process.env.GUO_INTEL_BUNDLED_DOWNLOAD_DIR
  ? path.resolve(process.env.GUO_INTEL_BUNDLED_DOWNLOAD_DIR)
  : null
const documentManifestPath = path.join(documentRoot, 'manifest.json')
const auditOutputDir = path.resolve(process.env.GUO_INTEL_AUDIT_OUTPUT_DIR ?? path.join(__dirname, '..', 'output', 'audit'))
const port = Number(process.env.GUO_INTEL_API_PORT ?? 4177)
const dashboardCache = new Map()
const { isAllowedLocalhostOrigin, isAllowedOutboundUrl } = networkPolicy
const expensiveRequestTimes = []

await initializeSettingsStore()

const app = express()
app.disable('x-powered-by')
app.use(securityHeaders)
app.use('/api', dynamicApiCacheHeaders)
app.use(express.json({ limit: '2mb' }))
app.use(corsForLocalApp)
app.use(protectDesktopSession)
app.use(protectLocalRequests)
app.use([
  '/api/analyze',
  '/api/analyze-document',
  '/api/document-analysis',
  '/api/document-file',
  '/api/automation/start',
  '/api/completeness-audit/refresh',
  '/api/relationship-audit/refresh',
  '/api/refresh',
  '/api/settings/test-ai',
  '/api/settings/test-local-ai',
  '/api/settings/test-source',
], limitExpensiveRequests)

function securityHeaders(_request, response, next) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  response.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "style-src 'self'",
      "style-src-attr 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self' http://localhost:4177 http://127.0.0.1:4177",
    ].join('; '),
  )
  next()
}

function dynamicApiCacheHeaders(request, response, next) {
  if (request.path !== '/document-file') {
    response.setHeader('Cache-Control', 'no-store, max-age=0')
    response.setHeader('Pragma', 'no-cache')
    response.setHeader('Expires', '0')
  }
  next()
}

function corsForLocalApp(request, response, next) {
  const origin = request.headers.origin
  if (origin && !isAllowedLocalhostOrigin(origin)) {
    response.status(403).json({ error: 'Origin is not allowed for the local application API.' })
    return
  }
  if (isAllowedLocalhostOrigin(origin)) {
    if (origin) response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Docket-Observatory-Request, X-Docket-Observatory-Session')
  if (request.method === 'OPTIONS') {
    if (!isAllowedLocalhostOrigin(origin)) {
      response.sendStatus(403)
      return
    }
    response.sendStatus(204)
    return
  }
  next()
}

function protectLocalRequests(request, response, next) {
  if (!request.path.startsWith('/api/') || request.path === '/api/health') {
    next()
    return
  }
  if (request.get('X-Docket-Observatory-Request') !== '1') {
    response.status(403).json({ error: 'Missing local application request header.' })
    return
  }
  next()
}

function protectDesktopSession(request, response, next) {
  const expected = process.env.GUO_INTEL_LOCAL_API_TOKEN
  if (!expected) {
    next()
    return
  }
  const supplied = request.get('X-Docket-Observatory-Session') ?? ''
  const expectedBytes = Buffer.from(expected)
  const suppliedBytes = Buffer.from(supplied)
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    response.status(403).json({ error: 'Invalid local desktop session.' })
    return
  }
  next()
}

function limitExpensiveRequests(_request, response, next) {
  const now = Date.now()
  while (expensiveRequestTimes.length && expensiveRequestTimes[0] <= now - 60000) expensiveRequestTimes.shift()
  if (expensiveRequestTimes.length >= 40) {
    response.setHeader('Retry-After', '60')
    response.status(429).json({ error: 'Too many expensive local requests; retry in one minute.' })
    return
  }
  expensiveRequestTimes.push(now)
  next()
}

if (process.env.GUO_INTEL_SERVE_STATIC === '1') {
  const distDir = path.join(__dirname, '..', 'dist')
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (_request, response) => {
    response.sendFile(path.join(distDir, 'index.html'))
  })
}

let state = await loadState()
let automaticWorkTimer = null
let automaticInitialTimer = null
let automaticRetryTimer = null
let automaticWorkBusy = false
let refreshPromise = null
let completenessAuditPromise = null
let relationshipAuditPromise = null
let stateSaveQueue = Promise.resolve()

function clearDashboardCache() {
  dashboardCache.clear()
}

function configureAutomaticScheduler() {
  if (automaticWorkTimer) clearInterval(automaticWorkTimer)
  if (automaticInitialTimer) clearTimeout(automaticInitialTimer)
  if (automaticRetryTimer) clearTimeout(automaticRetryTimer)
  automaticWorkTimer = null
  automaticInitialTimer = null
  automaticRetryTimer = null
  if (!getPublicSettings().settings.autoRefresh) return
  const intervalMs = getPublicSettings().settings.refreshIntervalMinutes * 60 * 1000
  automaticInitialTimer = setTimeout(() => {
    automaticInitialTimer = null
    void runInitialAutomaticWork(intervalMs)
  }, 2500)
  automaticInitialTimer.unref?.()
}

async function runInitialAutomaticWork(intervalMs) {
  const previous = await getAutomationRun('en').catch(() => null)
  const completedAt = Date.parse(previous?.completedAt ?? '')
  const ageMs = Number.isFinite(completedAt) ? Date.now() - completedAt : Number.POSITIVE_INFINITY
  if (previous?.status === 'complete' && ageMs >= 0 && ageMs < intervalMs) {
    scheduleNextAutomaticWork(Math.max(2500, intervalMs - ageMs))
    return
  }
  await runAutomaticWork()
  scheduleNextAutomaticWork(intervalMs)
}

function scheduleNextAutomaticWork(delayMs) {
  if (!getPublicSettings().settings.autoRefresh) return
  if (automaticWorkTimer) clearTimeout(automaticWorkTimer)
  automaticWorkTimer = setTimeout(async () => {
    automaticWorkTimer = null
    await runAutomaticWork()
    scheduleNextAutomaticWork(getPublicSettings().settings.refreshIntervalMinutes * 60 * 1000)
  }, delayMs)
  automaticWorkTimer.unref?.()
}

async function runAutomaticWork() {
  if (automaticWorkBusy) return
  if (automaticRetryTimer) clearTimeout(automaticRetryTimer)
  automaticRetryTimer = null
  automaticWorkBusy = true
  try {
    const currentRun = await getAutomationRun('en')
    if (currentRun.status === 'running') return
    if (getPublicSettings().settings.autoProcessDocuments) {
      const automaticLanguage = getPublicSettings().settings.automationLanguage
      const processingScope = getPublicSettings().settings.automaticProcessingScope
      const processingLimit = getPublicSettings().settings.automaticProcessingLimit
      await runAndWaitForAutomation(
        {
          refreshSources: () => refreshStateFromSources(),
          getState: () => state,
          loadRawDocumentManifest,
          refreshCompletenessAudit: refreshAutomaticCompletenessAudit,
          refreshDocumentSearchIndex,
        },
        {
          lang: automaticLanguage === 'en' ? 'en' : 'zh',
          outputLanguages: automaticLanguage,
          mode: processingScope === 'all' ? 'full' : 'deep',
          includeAi: getPublicSettings().settings.includeAi,
          includeTranslation: getPublicSettings().settings.includeTranslation,
          processingScope,
          limit: processingScope === 'all' ? 'all' : processingLimit,
        },
      )
      if (automaticRefreshNeedsRetry()) scheduleAutomaticRetry()
      return
    }
    await refreshStateFromSources()
    await refreshAutomaticCompletenessAudit()
    if (automaticRefreshNeedsRetry()) scheduleAutomaticRetry()
  } catch (error) {
    console.error(`Automatic work failed: ${error instanceof Error ? error.message : String(error)}`)
    scheduleAutomaticRetry()
  } finally {
    automaticWorkBusy = false
  }
}

async function refreshAutomaticCompletenessAudit() {
  try {
    const audit = await refreshCompletenessAudit({
      cacheDir,
      outputDir: auditOutputDir,
      manifest: await loadRawDocumentManifest(),
      state,
      portfolioPageLimit: 1,
    })
    await refreshRelationshipAudit({
      cacheDir,
      outputDir: auditOutputDir,
      manifest: await loadRawDocumentManifest(),
      completenessAudit: audit,
    })
    return audit
  } catch (error) {
    console.error(`Automatic completeness audit failed; preserving the prior successful cache: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

function automaticRefreshNeedsRetry() {
  const enabledSourceIds = new Set(state.sources.filter((source) => source.enabled).map((source) => source.id))
  const currentStatuses = state.sourceStatuses.filter((status) => enabledSourceIds.has(status.sourceId))
  const publicNetworkStatuses = currentStatuses.filter((status) => !['needs_credentials', 'needs_implementation'].includes(status.status))
  return publicNetworkStatuses.some((status) => status.retryable === true
    || status.status === 'error'
    || status.lastAttempt?.retryable === true
    || status.lastAttempt?.status === 'error')
}

function scheduleAutomaticRetry() {
  if (!getPublicSettings().settings.autoRefresh || automaticRetryTimer) return
  const delayMs = getPublicSettings().settings.networkRetryMinutes * 60 * 1000
  automaticRetryTimer = setTimeout(() => {
    automaticRetryTimer = null
    void runAutomaticWork()
  }, delayMs)
  automaticRetryTimer.unref?.()
}

async function runAndWaitForAutomation(callbacks, options) {
  const started = await startAutomationRun(callbacks, options)
  while (true) {
    const current = await getAutomationRun(options.lang)
    if (current.id !== started.id || current.status !== 'running') return current
    await new Promise((resolve) => setTimeout(resolve, 750))
  }
}

configureAutomaticScheduler()

async function loadState() {
  const seed = createSeedState()
  try {
    const raw = await readFile(statePath, 'utf8')
    const cached = JSON.parse(raw)
    const sourceById = new Map(seed.sources.map((source) => [source.id, source]))
    return {
      ...seed,
      ...cached,
      cases: seed.cases,
      entities: seed.entities,
      sources: seed.sources,
      policyWatch: seed.policyWatch,
      events: mergeEvents(seed.events, sanitizeStateEvents(cached.events, sourceById, seed)),
      sourceStatuses: mergeStatuses(seed.sourceStatuses, cached.sourceStatuses ?? []),
    }
  } catch {
    return seed
  }
}

function sanitizeStateEvents(events, sourceById, referenceState) {
  if (!Array.isArray(events)) return []
  const caseIds = new Set(referenceState.cases.map((item) => item.id))
  const entityIds = new Set(referenceState.entities.map((item) => item.id))
  return events.flatMap((event) => {
    if (!event || typeof event !== 'object') return []
    const id = boundedText(event.id, 240)
    const date = validIsoDate(event.date)
    const title = boundedText(event.title, 1000)
    const caseId = boundedText(event.caseId, 160)
    if (!id || !date || !title || !caseIds.has(caseId)) return []
    const source = sourceById.get(event.sourceId)
    if (!source) return []
    const sourceUrl = safePublicSourceUrl(event.sourceUrl) || safePublicSourceUrl(source?.url)
    if (!sourceUrl) return []
    return [{
      ...event,
      id,
      date,
      dateBasis: sanitizeEventDateBasis(event, source.id),
      dateConfidence: sanitizeEventDateConfidence(event, source.id),
      title,
      summary: boundedText(event.summary, 12000, title),
      impact: boundedText(event.impact, 12000),
      caseId,
      court: boundedText(event.court, 300),
      docketNumber: boundedText(event.docketNumber, 160),
      filingNumber: event.filingNumber == null ? null : boundedText(event.filingNumber, 100),
      category: boundedText(event.category, 100, 'Docket Filing'),
      severity: ['low', 'medium', 'high', 'critical'].includes(event.severity) ? event.severity : 'low',
      sourceId: source.id,
      sourceLabel: source.shortName,
      sourceType: source.type,
      sourceUrl,
      confidence: ['low', 'medium', 'high'].includes(event.confidence) ? event.confidence : source.confidence,
      assertionType: boundedText(event.assertionType, 300, 'Docket entry'),
      relatedCaseIds: Array.isArray(event.relatedCaseIds) ? event.relatedCaseIds.filter((value) => caseIds.has(value)).slice(0, 32) : [],
      entities: Array.isArray(event.entities) ? event.entities.filter((value) => entityIds.has(value)).slice(0, 64) : [],
      tags: Array.isArray(event.tags) ? event.tags.map((value) => boundedText(value, 120)).filter(Boolean).slice(0, 64) : [],
    }]
  })
}

function boundedText(value, maximum, fallback = '') {
  if (typeof value !== 'string') return fallback
  const normalized = value.replaceAll('\0', '').trim()
  return normalized ? normalized.slice(0, maximum) : fallback
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? '' : value
}

function sanitizeEventDateBasis(event, sourceId) {
  const allowed = new Set(['court_filed', 'court_entered', 'agency_published', 'source_reported'])
  if (allowed.has(event.dateBasis)) return event.dateBasis
  if (sourceId === 'courtlistener-recap' && [
    'RECAP docket entry',
    'Public RECAP search metadata',
    'Public RECAP feed metadata',
  ].includes(event.assertionType)) return 'court_filed'
  return null
}

function sanitizeEventDateConfidence(event, sourceId) {
  if (['low', 'medium', 'high'].includes(event.dateConfidence)) return event.dateConfidence
  return sourceId === 'courtlistener-recap' && sanitizeEventDateBasis(event, sourceId) === 'court_filed'
    ? 'high'
    : null
}

function safePublicSourceUrl(value) {
  return isAllowedOutboundUrl(value, { includeOpenAI: false }) ? String(value) : ''
}

async function saveState() {
  const snapshot = {
    version: state.version,
    generatedAt: state.generatedAt,
    events: state.events,
    sourceStatuses: state.sourceStatuses,
    lastRefresh: state.lastRefresh,
  }
  stateSaveQueue = stateSaveQueue.catch(() => undefined).then(() => atomicWriteJson(statePath, snapshot))
  return stateSaveQueue
}

async function loadDocumentManifest() {
  try {
    const manifest = await loadRawDocumentManifest()
    const files = Array.isArray(manifest.files) ? manifest.files : []
    const availableFiles = files
      .filter((file) => file.status !== 'error')
      .sort((a, b) => compareDocumentOrder(b, a))
      .slice(0, 30)
    const totalErrorCount = files.filter((file) => file.status === 'error').length
    const errorFiles = files
      .filter((file) => file.status === 'error')
      .sort((a, b) => compareDocumentOrder(b, a))
      .slice(0, 12)
    const downloadedCount = files.filter((file) => file.status === 'downloaded').length
    const newVersionCount = files.filter((file) => file.status === 'downloaded_new_version').length
    const skippedExistingCount = files.filter((file) => file.status === 'skipped_existing').length

    return {
      available: true,
      generatedAt: manifest.generatedAt,
      root: manifest.root,
      counts: {
        ...manifest.counts,
        downloaded: downloadedCount,
        skippedExisting: skippedExistingCount,
        newVersions: newVersionCount,
        localAvailable: downloadedCount + newVersionCount + skippedExistingCount,
        errors: totalErrorCount || manifest.counts?.errors || 0,
      },
      sourcePages: manifest.sourcePages,
      credentialRequired: manifest.credentialRequired,
      sampleFiles: availableFiles.map(documentFileSummary),
      errorFiles: errorFiles.map(documentFileSummary),
    }
  } catch {
    return emptyDocumentManifest()
  }
}

async function loadRawDocumentManifest() {
  const writableManifest = await readDocumentManifest(documentRoot, 'writable')
  const bundledManifest = bundledDocumentRoot
    ? await readDocumentManifest(bundledDocumentRoot, 'bundled')
    : null
  return mergeDocumentManifests(bundledManifest, writableManifest)
}

async function readDocumentManifest(root, storage) {
  try {
    const raw = await readFile(path.join(root, 'manifest.json'), 'utf8')
    const manifest = JSON.parse(raw)
    return {
      ...manifest,
      root,
      sourcePages: (manifest.sourcePages ?? []).flatMap((page) => {
        const safeUrl = safePublicSourceUrl(page?.url)
        return safeUrl ? [{ ...page, url: safeUrl }] : []
      }).slice(0, 64),
      credentialRequired: (manifest.credentialRequired ?? [])
        .filter((item) => item && typeof item === 'object')
        .slice(0, 64)
        .map((item) => ({
          ...item,
          source: safePublicSourceUrl(item.source) || null,
        })),
      sourceRecords: (manifest.sourceRecords ?? []).flatMap((record) => {
        const sourceUrl = safePublicSourceUrl(record?.sourceUrl)
        const originalUrl = safePublicSourceUrl(record?.originalUrl)
        if (!sourceUrl) return []
        return [{
          ...record,
          sourceUrl,
          originalUrl: originalUrl || null,
          externalLinks: (record.externalLinks ?? []).map(safePublicSourceUrl).filter(Boolean).slice(0, 64),
          text: boundedText(record.text, 100000),
        }]
      }).slice(0, 256),
      files: (manifest.files ?? []).map((file) => {
        const normalizedFile = {
          ...file,
          storage: file.storage ?? storage,
          originalUrl: safePublicSourceUrl(file.originalUrl),
          originalSourcePage: safePublicSourceUrl(file.originalSourcePage),
          historicalProjectSourcePage: safePublicSourceUrl(file.historicalProjectSourcePage),
          recapCounterpart: sanitizeNestedDocumentSource(file.recapCounterpart),
          historicalProjectCounterpart: sanitizeNestedDocumentSource(file.historicalProjectCounterpart),
          sameDocketAlternatives: (file.sameDocketAlternatives ?? [])
            .map(sanitizeNestedDocumentSource)
            .filter(Boolean)
            .slice(0, 16),
          alternateSources: (file.alternateSources ?? [])
            .map(sanitizeNestedDocumentSource)
            .filter(Boolean)
            .slice(0, 16),
        }
        const safeUrl = safePublicSourceUrl(normalizedFile.url)
        if (!safeUrl) {
          return {
            ...normalizedFile,
            status: 'error',
            path: '',
            error: 'Document source URL is outside the application network policy.',
          }
        }
        return {
          ...normalizedFile,
          url: safeUrl,
          sourcePage: safePublicSourceUrl(normalizedFile.sourcePage),
          path: managedDocumentPath(normalizedFile, normalizedFile.storage === 'bundled' ? bundledDocumentRoot : root),
        }
      }),
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    return null
  }
}

function sanitizeNestedDocumentSource(value) {
  if (!value || typeof value !== 'object') return null
  const url = safePublicSourceUrl(value.url)
  const sourcePage = safePublicSourceUrl(value.sourcePage)
  const originalUrl = safePublicSourceUrl(value.originalUrl)
  if (!url && !sourcePage && !originalUrl) return null
  return {
    ...value,
    url,
    sourcePage,
    originalUrl,
  }
}

function managedDocumentPath(file, fallbackRoot) {
  const storageRoot = file.storage === 'bundled' ? bundledDocumentRoot : fallbackRoot
  if (!storageRoot || !file.subdir || !file.filename) return file.path ?? ''
  return path.join(storageRoot, file.subdir, file.filename)
}

function mergeDocumentManifests(bundledManifest, writableManifest) {
  if (!bundledManifest && !writableManifest) {
    return {
      generatedAt: null,
      root: documentRoot,
      counts: { collected: 0, downloaded: 0, skippedExisting: 0, errors: 0 },
      sourcePages: [],
      credentialRequired: [],
      sourceRecords: [],
      files: [],
    }
  }
  const byUrl = new Map((bundledManifest?.files ?? []).filter((file) => file.url).map((file) => [file.url, file]))
  for (const file of writableManifest?.files ?? []) {
    if (!file.url) continue
    if (file.status !== 'error' || !byUrl.has(file.url)) byUrl.set(file.url, file)
  }
  const files = [...byUrl.values()]
  const sourceRecordsByUrl = new Map((bundledManifest?.sourceRecords ?? []).filter((record) => record.sourceUrl).map((record) => [record.sourceUrl, record]))
  for (const record of writableManifest?.sourceRecords ?? []) {
    if (record.sourceUrl) sourceRecordsByUrl.set(record.sourceUrl, record)
  }
  return {
    ...(bundledManifest ?? {}),
    ...(writableManifest ?? {}),
    generatedAt: writableManifest?.generatedAt ?? bundledManifest?.generatedAt ?? null,
    root: writableManifest?.root ?? bundledManifest?.root ?? documentRoot,
    sourcePages: writableManifest?.sourcePages?.length ? writableManifest.sourcePages : bundledManifest?.sourcePages ?? [],
    credentialRequired: writableManifest?.credentialRequired ?? bundledManifest?.credentialRequired ?? [],
    sourceRecords: [...sourceRecordsByUrl.values()],
    counts: {
      collected: files.length,
      downloaded: files.filter((file) => file.status === 'downloaded').length,
      newVersions: files.filter((file) => file.status === 'downloaded_new_version').length,
      skippedExisting: files.filter((file) => file.status === 'skipped_existing').length,
      errors: files.filter((file) => file.status === 'error').length,
      bundled: files.filter((file) => file.storage === 'bundled').length,
    },
    files,
  }
}

async function verifiedManagedPdfPath(filePath, expectedSha256 = '') {
  const targetPath = await realpath(path.resolve(filePath))
  const roots = await Promise.all(
    [documentRoot, bundledDocumentRoot]
      .filter(Boolean)
      .map(async (root) => {
        try {
          return await realpath(root)
        } catch {
          return null
        }
      }),
  )
  const insideManagedRoot = roots.some((root) => root && (targetPath === root || targetPath.startsWith(`${root}${path.sep}`)))
  if (!insideManagedRoot || path.extname(targetPath).toLowerCase() !== '.pdf') {
    const error = new Error('Document path is outside the managed PDF library.')
    error.statusCode = 403
    throw error
  }
  const handle = await open(targetPath, 'r')
  try {
    const header = Buffer.alloc(5)
    const { bytesRead } = await handle.read(header, 0, header.length, 0)
    if (bytesRead !== 5 || header.toString('ascii') !== '%PDF-') {
      const error = new Error('Managed document is not a valid PDF.')
      error.statusCode = 422
      throw error
    }
  } finally {
    await handle.close()
  }
  if (expectedSha256) {
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(targetPath)) hash.update(chunk)
    if (hash.digest('hex') !== expectedSha256) {
      const error = new Error('Managed document failed the manifest SHA-256 integrity check.')
      error.statusCode = 409
      throw error
    }
  }
  return targetPath
}

function documentFileSummary(file) {
  return {
    title: file.title,
    docNumber: file.docNumber,
    caseId: file.caseId,
    sourceId: file.sourceId,
    sourceLabel: file.sourceLabel,
    variantKey: documentVariantKey(file),
    sourceUrl: file.url,
    localPath: file.path ? file.filename || path.basename(file.path) : '',
    bytes: file.bytes ?? 0,
    status: file.status,
    error: file.error,
  }
}

function emptyDocumentManifest() {
  return {
    available: false,
    generatedAt: null,
    root: path.dirname(documentManifestPath),
    counts: { collected: 0, downloaded: 0, skippedExisting: 0, localAvailable: 0, errors: 0 },
    sourcePages: [],
    credentialRequired: [],
    sampleFiles: [],
    errorFiles: [],
  }
}

function compareDocumentOrder(left, right) {
  const docketOrder = compareDocketNumbers(left.docNumber, right.docNumber)
  if (docketOrder) return docketOrder
  return String(left.title ?? left.url ?? '').localeCompare(String(right.title ?? right.url ?? ''))
}

function mergeEvents(primary, incoming, replacementSourceIds = new Set()) {
  const byIdentity = new Map()
  const retained = primary.filter((event) => !replacementSourceIds.has(event.sourceId))
  for (const event of [...retained, ...incoming]) {
    const identity = eventMergeIdentity(event)
    const previous = byIdentity.get(identity)
    byIdentity.set(identity, preferredEventRecord(previous, event))
  }
  return [...byIdentity.values()].sort((a, b) => b.date.localeCompare(a.date) || compareFilingNumber(b.filingNumber, a.filingNumber))
}

function eventMergeIdentity(event) {
  if (event.sourceId === 'courtlistener-recap' && event.courtListenerDocketId && event.filingNumber) {
    return `courtlistener-recap:${event.courtListenerDocketId}:${normalizeDocketNumber(event.filingNumber)}`
  }
  return `id:${event.id}`
}

function preferredEventRecord(previous, incoming) {
  if (!previous) return incoming
  const score = (event) => {
    if (event.assertionType === 'RECAP docket entry') return 3
    if (event.assertionType === 'Public RECAP search metadata') return 2
    if (event.assertionType === 'Public RECAP feed metadata') return 1
    return 0
  }
  return score(incoming) >= score(previous)
    ? { ...previous, ...incoming }
    : { ...incoming, ...previous }
}

function mergeStatuses(primary, incoming) {
  const bySource = new Map(primary.map((status) => [status.sourceId, status]))
  for (const status of incoming) {
    const previous = bySource.get(status.sourceId)
    bySource.set(status.sourceId, mergeSourceStatus(previous, status))
  }
  return [...bySource.values()]
}

function mergeSourceStatus(previous, current) {
  if (!previous || !['error', 'timeout'].includes(current.status)) return current

  if (previous.status === 'stale') {
    return { ...previous, lastAttempt: current }
  }
  if (!['ok', 'limited'].includes(previous.status)) return current

  // A transient failed poll must not erase the last usable source state. Keep
  // the failed attempt visible alongside the last successful observation.
  return {
    ...previous,
    status: 'stale',
    lastAttempt: current,
  }
}

function compareFilingNumber(left, right) {
  return compareDocketNumbers(left, right)
}

function requestLanguage(request) {
  return scalarQuery(request.query.lang) === 'en' ? 'en' : 'zh'
}

function documentAnalysisOptions(request) {
  return {
    catalog: scalarQuery(request.query.catalog) === 'full' ? 'full' : 'compact',
    includeSnippets: scalarQuery(request.query.includeSnippets) === '1',
    catalogLimit: scalarQuery(request.query.catalogLimit),
  }
}

function documentCatalogOptions(request, signal) {
  return {
    query: scalarQuery(request.query.q),
    priority: scalarQuery(request.query.priority),
    scope: scalarQuery(request.query.scope),
    offset: scalarQuery(request.query.offset),
    limit: scalarQuery(request.query.limit),
    signal,
  }
}

function scalarQuery(value) {
  return typeof value === 'string' ? value : ''
}

function dashboardPayload(lang = 'zh') {
  const cacheKey = `${lang}:${state.generatedAt}:${state.events.length}:${state.sourceStatuses.map((status) => `${status.sourceId}:${status.status}:${status.checkedAt ?? ''}`).join('|')}`
  const cached = dashboardCache.get(cacheKey)
  if (cached) return cached

  const events = [...state.events].sort((a, b) => b.date.localeCompare(a.date) || compareFilingNumber(b.filingNumber, a.filingNumber))
  const latestEvent = events[0] ?? null
  const latestAnalysis = latestEvent ? localAnalyzeEvent(latestEvent, state, lang) : null
  const sourceStatusById = new Map(state.sourceStatuses.map((status) => [status.sourceId, status]))

  const cases = state.cases.map((caseRecord) => {
    const directEvents = events.filter((event) => event.caseId === caseRecord.id)
    const relatedEvents = events.filter((event) => event.caseId === caseRecord.id || event.relatedCaseIds.includes(caseRecord.id))
    return {
      ...caseRecord,
      eventCount: relatedEvents.length,
      latestEvent: directEvents[0] ?? relatedEvents[0] ?? null,
      latestRelatedEvent: directEvents[0] ? relatedEvents.find((event) => event.caseId !== caseRecord.id) ?? null : null,
      sourceStatuses: caseRecord.sourceIds.map((sourceId) => sourceStatusById.get(sourceId)).filter(Boolean),
    }
  })

  const officialCount = events.filter((event) => ['Official Agency', 'Official Court'].includes(event.sourceType)).length
  const recapUsable = ['ok', 'limited'].includes(sourceStatusById.get('courtlistener-recap')?.status)
  const recapCount = recapUsable ? events.filter((event) => event.sourceType === 'CourtListener / RECAP').length : 0
  const claimsAgentCount = events.filter((event) => event.sourceType === 'Claims Agent').length
  const mirrorCount = events.filter((event) => event.sourceType === 'Mirror').length
  const actionSources = state.sourceStatuses.filter((status) => !['ok', 'disabled'].includes(status.status)).length

  const selectedAiProvider = getPublicSettings().settings.aiProvider
  const payload = localizePayload({
    generatedAt: state.generatedAt,
    lastRefresh: state.lastRefresh ?? null,
    aiMode: isCloudAiProvider(selectedAiProvider) && cloudProviderConfigured(selectedAiProvider)
      ? `${cloudProviderLabel(selectedAiProvider)} 结构化分析（${cloudModelForPurpose('analysis')}）`
      : '本地确定性法律规则分析（非生成式 AI）；云端或本机模型为可选增强',
    metrics: {
      totalEvents: events.length,
      criticalEvents: events.filter((event) => event.severity === 'critical').length,
      monitoredCases: state.cases.length,
      monitoredEntities: state.entities.length,
      officialCount,
      officialCourtCount: events.filter((event) => event.sourceType === 'Official Court').length,
      officialAgencyCount: events.filter((event) => event.sourceType === 'Official Agency').length,
      recapCount,
      claimsAgentCount,
      mirrorCount,
      actionSources,
    },
    cases,
    entities: state.entities,
    events,
    sources: state.sources,
    sourceStatuses: state.sourceStatuses,
    policyWatch: state.policyWatch,
    portfolioAnalysis: buildPortfolioAnalysis(state, lang),
    latestAnalysis,
    notes: state.notes,
  }, lang)
  dashboardCache.set(cacheKey, payload)
  return payload
}

function filteredEvents(query, events = state.events) {
  const q = scalarQuery(query.q).trim().toLowerCase()
  const caseId = scalarQuery(query.caseId).trim()
  const category = scalarQuery(query.category).trim()
  const sourceType = scalarQuery(query.sourceType).trim()

  return events.filter((event) => {
    const matchesCase = !caseId || event.caseId === caseId || event.relatedCaseIds.includes(caseId)
    const matchesCategory = !category || event.category === category
    const matchesSource = !sourceType || event.sourceType === sourceType
    const haystack = `${event.title} ${event.summary} ${event.docketNumber} ${event.filingNumber} ${event.tags.join(' ')}`.toLowerCase()
    const matchesQuery = !q || haystack.includes(q)
    return matchesCase && matchesCategory && matchesSource && matchesQuery
  })
}

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    generatedAt: state.generatedAt,
    lastRefresh: state.lastRefresh ?? null,
    openaiConfigured: Boolean(resolvedSecret('openaiApiKey')),
    cloudAiProvider: getPublicSettings().settings.aiProvider,
    cloudAiConfigured: cloudProviderConfigured(getPublicSettings().settings.aiProvider),
    secureStorageAvailable: getPublicSettings().secureStorageAvailable,
  })
})

app.get('/api/settings', (request, response) => {
  response.json(settingsPayload(requestLanguage(request)))
})

app.put('/api/settings', async (request, response, next) => {
  try {
    await updateSettings({ settings: request.body?.settings, secrets: request.body?.secrets })
    configureAutomaticScheduler()
    response.json(settingsPayload(requestLanguage(request)))
  } catch (error) {
    next(error)
  }
})

app.post('/api/settings/test-source', async (request, response, next) => {
  try {
    const sourceId = String(request.body?.sourceId ?? '')
    const source = state.sources.find((item) => item.id === sourceId)
    if (!source) {
      const error = new Error('Source not found.')
      error.statusCode = 404
      throw error
    }
    const result = await runSourceAdapters([source])
    const status = result.statuses[0] ?? null
    if (status) {
      state = { ...state, sourceStatuses: mergeStatuses(state.sourceStatuses, [status]) }
      clearDashboardCache()
      await saveState()
      await recordIntegrationDiagnostic(sourceId, status)
    }
    response.json({ sourceId, status: status ? localizeSourceStatus(status, requestLanguage(request)) : null })
  } catch (error) {
    next(error)
  }
})

app.post('/api/settings/test-ai', async (request, response) => {
  const provider = String(request.body?.provider || getPublicSettings().settings.aiProvider)
  try {
    if (!isCloudAiProvider(provider)) {
      const error = new Error('Select a cloud AI provider before running this test.')
      error.statusCode = 400
      throw error
    }
    const configuredSettings = getPublicSettings().settings
    const purpose = configuredSettings.aiProvider === provider
      ? 'analysis'
      : configuredSettings.translationProvider === provider
        ? 'translation'
        : 'analysis'
    const startedAt = Date.now()
    const result = await testCloudAiConnection(provider, purpose)
    const latencyMs = Date.now() - startedAt
    await recordIntegrationDiagnostic(provider, {
      status: 'ok',
      checkedAt: new Date().toISOString(),
      latencyMs,
      itemCount: 1,
      message: `${cloudProviderLabel(provider)} metadata-only connection test passed.`,
    })
    response.json({
      status: 'ok',
      provider,
      model: result.model,
      latencyMs,
      message: requestLanguage(request) === 'en'
        ? `${cloudProviderLabel(provider)} responded to a metadata-only test.`
        : `${cloudProviderLabel(provider)} 已通过仅含元数据的连接测试。`,
    })
  } catch (error) {
    const statusCode = Number(error?.statusCode ?? 502)
    const message = safeAiTestError(error)
    await recordIntegrationDiagnostic(provider, {
      status: 'error',
      checkedAt: new Date().toISOString(),
      latencyMs: null,
      itemCount: 0,
      message,
    }).catch(() => undefined)
    response.status(statusCode >= 400 && statusCode < 600 ? statusCode : 502).json({
      status: 'error',
      provider,
      message: requestLanguage(request) === 'en' ? message : translateAiTestError(error, provider),
    })
  }
})

app.post('/api/settings/test-local-ai', async (request, response) => {
  try {
    const startedAt = Date.now()
    const result = await testLocalAiConnection()
    const latencyMs = Date.now() - startedAt
    await recordIntegrationDiagnostic('local-ai', {
      status: 'ok',
      checkedAt: new Date().toISOString(),
      latencyMs,
      itemCount: 1,
      message: 'Local Ollama metadata-only connection test passed.',
    })
    response.json({
      status: 'ok',
      provider: 'ollama',
      model: result.model,
      latencyMs,
      message: requestLanguage(request) === 'en' ? 'Local Ollama responded to a metadata-only test.' : '本机 Ollama 已通过仅含元数据的连接测试。',
    })
  } catch (error) {
    const statusCode = Number(error?.statusCode ?? 502)
    const message = safeAiTestError(error)
    await recordIntegrationDiagnostic('local-ai', {
      status: 'error',
      checkedAt: new Date().toISOString(),
      latencyMs: null,
      itemCount: 0,
      message,
    }).catch(() => undefined)
    response.status(statusCode >= 400 && statusCode < 600 ? statusCode : 502).json({
      status: 'error',
      provider: 'ollama',
      message: requestLanguage(request) === 'en' ? message : translateDiagnosticMessage(message),
    })
  }
})

app.get('/api/dashboard', (request, response) => {
  response.json(dashboardPayload(requestLanguage(request)))
})

app.get('/api/events', (request, response) => {
  const payload = dashboardPayload(requestLanguage(request))
  response.json({ events: filteredEvents(request.query, payload.events) })
})

app.get('/api/sources', (request, response) => {
  const payload = dashboardPayload(requestLanguage(request))
  response.json({ sources: payload.sources, sourceStatuses: payload.sourceStatuses })
})

app.get('/api/cases', (request, response) => {
  response.json({ cases: dashboardPayload(requestLanguage(request)).cases })
})

app.get('/api/entities', (request, response) => {
  response.json({ entities: dashboardPayload(requestLanguage(request)).entities })
})

app.get('/api/calendar', (request, response) => {
  response.json(buildProceduralCalendar(state, requestLanguage(request)))
})

app.get('/api/litigation-positions', (request, response) => {
  const lang = requestLanguage(request)
  response.json(buildLitigationPositions(state, dashboardPayload(lang), lang))
})

app.get('/api/documents', async (request, response) => {
  response.json(localizeDocumentManifest(await loadDocumentManifest(), requestLanguage(request)))
})

app.get('/api/document-file', async (request, response, next) => {
  try {
    const sourceUrl = typeof request.query.sourceUrl === 'string' ? request.query.sourceUrl : ''
    const manifest = await loadRawDocumentManifest()
    const file = (manifest.files ?? []).find((item) => item.url === sourceUrl && item.status !== 'error')
    if (!file?.path) {
      const error = new Error('Document is not available in the managed library.')
      error.statusCode = 404
      throw error
    }
    const targetPath = await verifiedManagedPdfPath(file.path, file.sha256)
    response.setHeader('Cache-Control', 'private, max-age=3600')
    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.filename || 'court-document.pdf')}`)
    response.sendFile(targetPath)
  } catch (error) {
    next(error)
  }
})

app.get('/api/monitoring-profile', (request, response) => {
  response.json(localizedMonitoringProfile(requestLanguage(request)))
})

app.get('/api/document-analysis', async (request, response, next) => {
  try {
    response.json(await buildDocumentAnalysis(await loadRawDocumentManifest(), state, requestLanguage(request), documentAnalysisOptions(request)))
  } catch (error) {
    next(error)
  }
})

app.get('/api/document-catalog', async (request, response, next) => {
  const controller = new AbortController()
  const cancelSearch = () => {
    if (!response.writableEnded) controller.abort()
  }
  response.on('close', cancelSearch)
  try {
    const payload = await buildDocumentCatalog(
      await loadRawDocumentManifest(),
      state,
      requestLanguage(request),
      documentCatalogOptions(request, controller.signal),
    )
    if (!controller.signal.aborted) response.json(payload)
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') return
    next(error)
  } finally {
    response.off('close', cancelSearch)
  }
})

app.get('/api/completeness-audit', async (request, response, next) => {
  try {
    const manifest = await loadRawDocumentManifest()
    const audit = await readCompletenessAudit(cacheDir, manifest, state)
    response.json(localizeCompletenessAudit(audit, requestLanguage(request)))
  } catch (error) {
    next(error)
  }
})

app.get('/api/relationship-audit', async (request, response, next) => {
  try {
    const manifest = await loadRawDocumentManifest()
    const completenessAudit = await readCompletenessAudit(cacheDir, manifest, state)
    response.json(localizeRelationshipAudit(await readRelationshipAudit({ cacheDir, manifest, completenessAudit }), requestLanguage(request)))
  } catch (error) {
    next(error)
  }
})

app.post('/api/relationship-audit/refresh', async (request, response, next) => {
  try {
    if (!relationshipAuditPromise) {
      relationshipAuditPromise = (async () => {
        const manifest = await loadRawDocumentManifest()
        const completenessAudit = await readCompletenessAudit(cacheDir, manifest, state)
        return refreshRelationshipAudit({
          cacheDir,
          outputDir: auditOutputDir,
          manifest,
          completenessAudit,
        })
      })().finally(() => {
        relationshipAuditPromise = null
      })
    }
    response.json(localizeRelationshipAudit(await relationshipAuditPromise, requestLanguage(request)))
  } catch (error) {
    next(error)
  }
})

app.post('/api/completeness-audit/refresh', async (request, response, next) => {
  try {
    if (!completenessAuditPromise) {
      completenessAuditPromise = (async () => {
        await refreshStateFromSources()
        return refreshCompletenessAudit({
          cacheDir,
          outputDir: auditOutputDir,
          manifest: await loadRawDocumentManifest(),
          state,
        })
      })().finally(() => {
        completenessAuditPromise = null
      })
    }
    const audit = await completenessAuditPromise
    await refreshRelationshipAudit({
      cacheDir,
      outputDir: auditOutputDir,
      manifest: await loadRawDocumentManifest(),
      completenessAudit: audit,
    })
    response.json(localizeCompletenessAudit(audit, requestLanguage(request)))
  } catch (error) {
    next(error)
  }
})

app.post('/api/analyze-document', async (request, response, next) => {
  try {
    const sourceUrl = typeof request.body?.sourceUrl === 'string' ? request.body.sourceUrl : ''
    response.json({ document: await analyzeDocumentBySourceUrl(sourceUrl, await loadRawDocumentManifest(), state, requestLanguage(request)) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/automation', async (request, response, next) => {
  try {
    response.json(await getAutomationRun(requestLanguage(request)))
  } catch (error) {
    next(error)
  }
})

app.post('/api/automation/start', async (request, response, next) => {
  try {
    const lang = requestLanguage(request)
    const run = await startAutomationRun(
      {
        refreshSources: () => refreshStateFromSources(),
        getState: () => state,
        loadRawDocumentManifest,
        refreshCompletenessAudit: refreshAutomaticCompletenessAudit,
        refreshDocumentSearchIndex,
      },
      {
        lang,
        mode: typeof request.body?.mode === 'string' ? request.body.mode : 'deep',
        outputLanguages: ['zh', 'en', 'both'].includes(request.body?.outputLanguages)
          ? request.body.outputLanguages
          : getPublicSettings().settings.automationLanguage,
        includeAi: typeof request.body?.includeAi === 'boolean' ? request.body.includeAi : getPublicSettings().settings.includeAi,
        includeTranslation: typeof request.body?.includeTranslation === 'boolean' ? request.body.includeTranslation : getPublicSettings().settings.includeTranslation,
        limit: request.body?.limit,
        pageLimit: request.body?.pageLimit,
        charLimit: request.body?.charLimit,
      },
    )
    response.status(202).json(run)
  } catch (error) {
    next(error)
  }
})

app.post('/api/analyze', async (request, response) => {
  const eventId = String(request.body?.eventId ?? '')
  const event = state.events.find((item) => item.id === eventId)
  if (!event) {
    response.status(404).json({ error: 'Event not found.' })
    return
  }
  const analysis = await analyzeEvent(event, state, requestLanguage(request))
  const localized = localizePayload({ ...dashboardPayload(requestLanguage(request)), latestAnalysis: analysis }, requestLanguage(request))
  response.json({ eventId, analysis: localized.latestAnalysis })
})

app.post('/api/refresh', async (request, response) => {
  await refreshStateFromSources()
  response.json(dashboardPayload(requestLanguage(request)))
})

async function refreshStateFromSources() {
  if (refreshPromise) return refreshPromise
  refreshPromise = performSourceRefresh().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

async function performSourceRefresh() {
  const startedAt = new Date().toISOString()
  const result = await runSourceAdapters(state.sources)
  const sourceById = new Map(state.sources.map((source) => [source.id, source]))
  const sanitizedEvents = sanitizeStateEvents(result.events, sourceById, state)
  state = {
    ...state,
    generatedAt: new Date().toISOString(),
    lastRefresh: {
      startedAt,
      completedAt: new Date().toISOString(),
      fetchedEvents: sanitizedEvents.length,
      sourceCount: result.statuses.length,
    },
    events: mergeEvents(
      state.events,
      sanitizedEvents,
      new Set(
        result.statuses
          .filter((status) => ['ok', 'limited'].includes(status.status) && sanitizedEvents.some((event) => event.sourceId === status.sourceId))
          .map((status) => status.sourceId),
      ),
    ),
    sourceStatuses: mergeStatuses(state.sourceStatuses, result.statuses),
  }
  clearDashboardCache()
  await saveState()
  return state
}

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API route not found.' })
})

app.use((_request, response) => {
  response.status(404).type('text/plain').send('Not found.')
})

app.use((error, _request, response, _next) => {
  const statusCode = Number(error?.statusCode ?? error?.status ?? 500)
  const publicMessage = error?.expose === true || statusCode === 503
    ? error instanceof Error ? error.message : 'Service is temporarily unavailable.'
    : statusCode >= 500 ? 'Internal server error.' : error instanceof Error ? error.message : 'Request failed.'
  if (statusCode >= 500 && statusCode !== 503) {
    console.error(error)
  }
  response.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
    error: publicMessage,
  })
})

export const apiServerReady = new Promise((resolve, reject) => {
  const server = app.listen(port, '127.0.0.1')
  server.once('error', reject)
  server.once('listening', () => {
    console.log(`Docket Observatory API listening on http://127.0.0.1:${port}`)
    void loadRawDocumentManifest()
      .then((manifest) => warmDocumentSearchIndex(manifest))
      .then((result) => console.log(`Full-text search index ready: ${result.coverage.indexedOriginals}/${result.coverage.uniquePdfContents} unique PDF contents`))
      .catch((error) => console.error(`Full-text search warmup failed: ${error instanceof Error ? error.message : String(error)}`))
    resolve(server)
  })
})

function settingsPayload(lang = 'zh') {
  const publicSettings = getPublicSettings()
  return {
    ...publicSettings,
    dataDirectory: lang === 'en' ? 'Managed court-file library' : '受管理的法院文件库',
    cacheDirectory: lang === 'en' ? 'Private local application cache' : '私有本地应用缓存',
    integrationDiagnostics: Object.fromEntries(
      Object.entries(publicSettings.integrationDiagnostics).map(([id, diagnostic]) => [id, {
        ...diagnostic,
        message: lang === 'en' ? diagnostic.message : translateDiagnosticMessage(diagnostic.message),
      }]),
    ),
    sourceDiagnostics: state.sourceStatuses.map((status) => localizeSourceStatus(status, lang)),
  }
}

function translateDiagnosticMessage(message) {
  if (message.includes('metadata-only connection test passed.')) return `${message.replace(' metadata-only connection test passed.', '')} 仅元数据连接测试已通过。`
  if (message.includes('is not configured in Settings')) return `尚未在设置页配置 ${message.split(' is not configured')[0]}。`
  return translateLegalTextToZh(message)
}

async function testCloudAiConnection(provider, purpose = 'analysis') {
  const model = cloudModelForPurpose(purpose)
  const outputText = await cloudGenerateText({
    provider,
    purpose,
    maxOutputTokens: 32,
    timeoutMs: 60000,
    reasoning: false,
    system: 'This is a metadata-only connection test. Do not request or infer any document content.',
    user: 'Respond with the single word OK.',
  })
  if (!/^\s*OK[.!]?\s*$/i.test(outputText)) {
    const error = new Error(`${cloudProviderLabel(provider)} responded without the expected connection-test output.`)
    error.statusCode = 502
    throw error
  }
  return { model }
}

async function testLocalAiConnection() {
  const value = await ollamaGenerateJson({
    schemaName: 'connection_test',
    system: 'You are a local connection test. Return JSON only.',
    user: JSON.stringify({ ok: true, instruction: 'Return {"ok":true}. Do not include any other keys.' }),
    timeoutMs: 60000,
  })
  if (value?.ok !== true) {
    const error = new Error('Local Ollama responded without the expected connection-test output.')
    error.statusCode = 502
    throw error
  }
  return { model: getPublicSettings().settings.localAiModel }
}

function safeAiTestError(error) {
  const message = error instanceof Error ? error.message : 'Cloud AI connection test failed.'
  return message
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .slice(0, 240)
}

function translateAiTestError(error, provider) {
  const message = safeAiTestError(error)
  const label = cloudProviderLabel(provider)
  if (message.includes('not configured')) return `尚未在设置页配置 ${label}。`
  if (message.includes('401') || message.includes('403')) return `${label} 凭证无效或已被拒绝，请检查设置页中的 API Key。`
  if (message.includes('429')) return `${label} 返回频率或额度限制，请检查账户额度后重试。`
  if (message.includes('HTTP')) return `${label} 连接失败：${message}`
  return `${label} 连接测试失败：${message}`
}
