import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads'
import { gzip as gzipCallback, gunzip as gunzipCallback } from 'node:zlib'
import { atomicWriteJson } from './atomic-write.js'

const searchIndexVersion = 'document-search-v4'
const extractionCacheVersion = 8
const translationCacheVersion = 'translation-v7'
const validScopes = new Set(['all', 'original', 'translation', 'analysis', 'web'])
const localFileStatuses = new Set(['downloaded', 'downloaded_new_version', 'skipped_existing'])
const bloomBitCount = 32768
const bloomWordCount = bloomBitCount / 32
const searchReadConcurrency = 10
const orphanedSearchTextRetentionMs = 7 * 24 * 60 * 60 * 1000
const cacheRoot = path.resolve(process.env.GUO_INTEL_CACHE_DIR ?? path.join(process.cwd(), 'server', 'cache'))
const indexPath = path.join(cacheRoot, 'document-search-index.json')
const searchTextDirectory = path.join(cacheRoot, 'document-search-text')
const gzip = promisify(gzipCallback)
const gunzip = promisify(gunzipCallback)
const isSearchIndexWorker = !isMainThread && workerData?.task === 'build-document-search-index'
let activeIndex = null
let activeBuild = null
let activeBuildGeneration = 0
const searchTextInflight = new Map()

export async function searchDocumentCatalog(manifest, records, options = {}) {
  const query = parseDocumentSearchQuery(options.query)
  const scope = validScopes.has(options.scope) ? options.scope : 'all'
  const priority = ['critical', 'high', 'medium', 'low'].includes(options.priority) ? options.priority : 'all'
  const offset = boundedNumber(options.offset, 0, Number.MAX_SAFE_INTEGER)
  const limit = boundedNumber(options.limit, 12, 100)
  const signal = options.signal
  throwIfSearchAborted(signal)
  const indexState = await currentDocumentSearchIndex(manifest)
  const compiled = indexState.index
  const bodyHits = query.terms.length
    ? await searchIndexedBodies(compiled, query, scope, signal)
    : new Map()
  throwIfSearchAborted(signal)
  const recoveryState = compiled.searchTextFault ? await currentDocumentSearchIndex(manifest) : null

  const filtered = records.map((record) => {
    if (priority !== 'all' && record.priority !== priority) return null
    const document = compiled.bySourceUrl.get(record.sourceUrl)
    if (!query.raw) return recordAvailableInScope(record, document, scope) ? { record, score: 0 } : null
    if (!query.terms.length) return null

    const metadataMatch = searchCatalogMetadata(record, query, scope)
    const bodyMatch = bodyHits.get(record.sourceUrl)
    if (!metadataMatch && !bodyMatch) return null
    const searchMatches = [...(metadataMatch ? [metadataMatch] : []), ...(bodyMatch?.matches ?? [])]
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(withoutInternalScore)
    return {
      record: {
        ...record,
        searchMatches,
        searchScore: Math.max(metadataMatch?.score ?? 0, bodyMatch?.score ?? 0),
      },
      score: Math.max(metadataMatch?.score ?? 0, bodyMatch?.score ?? 0),
    }
  }).filter(Boolean)

  filtered.sort((left, right) => right.score - left.score || compareCatalogRecords(left.record, right.record))
  return {
    generatedAt: new Date().toISOString(),
    total: records.length,
    filtered: filtered.length,
    offset,
    limit,
    hasMore: offset + limit < filtered.length,
    catalog: filtered.slice(offset, offset + limit).map((item) => item.record),
    search: {
      schemaVersion: searchIndexVersion,
      generatedAt: compiled.generatedAt,
      query: query.raw,
      queryTruncated: query.truncated,
      scope,
      stale: indexState.stale || Boolean(recoveryState?.stale),
      building: indexState.building || Boolean(recoveryState?.building),
      coverage: compiled.coverage,
    },
  }
}

export async function refreshDocumentSearchIndex(manifest) {
  const signature = await documentSearchSignature(manifest)
  const index = await startIndexBuild(manifest, signature, false)
  return {
    schemaVersion: searchIndexVersion,
    generatedAt: index.generatedAt,
    coverage: index.coverage,
  }
}

export async function warmDocumentSearchIndex(manifest) {
  const signature = await documentSearchSignature(manifest)
  const index = activeIndex?.signature === signature ? activeIndex : await loadOrBuildIndex(manifest, signature)
  return { schemaVersion: searchIndexVersion, generatedAt: index.generatedAt, coverage: index.coverage }
}

export async function getDocumentSearchProcessingSnapshot(manifest, language = 'zh') {
  const indexState = await currentDocumentSearchIndex(manifest)
  const index = indexState.index

  const files = (manifest?.files ?? []).filter((file) => localFileStatuses.has(file?.status) && file?.url)
  const fileByUrl = new Map(files.map((file) => [file.url, file]))
  const legalReadProviders = new Set(['human_research', 'local_rules', 'openai', 'anthropic', 'gemini', 'openai_compatible', 'ollama'])
  const analysisIdentities = new Set()
  const extractedIdentities = new Set()
  const analysisProviders = new Map()
  const translations = []
  const sourceAlreadyTarget = []
  const assistiveTranslations = []
  const generatedTranslations = []
  const redactedTranslations = []

  for (const document of index.documents ?? []) {
    const documentFiles = (document.sources ?? [])
      .map((source) => fileByUrl.get(source.sourceUrl))
      .filter(Boolean)
    if (document.original) {
      for (const file of documentFiles) extractedIdentities.add(`${file.url}|${file.sha256 ?? ''}`)
    }

    for (const analysis of document.analyses ?? []) {
      if (analysis.language !== language) continue
      const provider = analysis.provider ?? 'unknown'
      for (const file of documentFiles) {
        const identity = `${file.url}|${file.sha256 ?? ''}`
        if (legalReadProviders.has(provider)) analysisIdentities.add(identity)
      }
      analysisProviders.set(`${document.contentSha256}|${provider}`, provider)
    }

    for (const translation of document.translations ?? []) {
      if (translation.language !== language) continue
      translations.push(translation)
      if (translation.status === 'assistive_only') assistiveTranslations.push(translation)
      else if (translation.status === 'no_translation_needed') sourceAlreadyTarget.push(translation)
      else if (translation.status === 'translated' && translation.coverage === 'complete' && translation.contentIntegrity === 'redacted') redactedTranslations.push(translation)
      else if (translation.status === 'translated') generatedTranslations.push(translation)
    }
  }

  const pendingLegalReadReasons = {
    analysis_cache_missing: 0,
    extraction_cache_missing: 0,
    text_extraction_unavailable: 0,
    stale_source_sha: 0,
  }
  for (const file of files) {
    const identity = `${file.url}|${file.sha256 ?? ''}`
    if (analysisIdentities.has(identity)) continue
    if (extractedIdentities.has(identity)) pendingLegalReadReasons.analysis_cache_missing += 1
    else pendingLegalReadReasons.extraction_cache_missing += 1
  }

  return {
    extracted: new Set(extractedIdentities).size,
    uniquePdfContents: index.coverage?.uniquePdfContents ?? index.documents?.length ?? 0,
    indexedOriginals: index.coverage?.indexedOriginals ?? 0,
    completeOriginals: index.coverage?.completeOriginals ?? 0,
    partialOriginals: index.coverage?.partialOriginals ?? 0,
    ocrOriginals: index.coverage?.ocrOriginals ?? 0,
    documentAi: [...analysisProviders.values()].filter((provider) => ['openai', 'anthropic', 'gemini', 'openai_compatible', 'ollama'].includes(provider)).length,
    localRuleDocumentReads: [...analysisProviders.values()].filter((provider) => provider === 'local_rules').length,
    humanResearchDocuments: [...analysisProviders.values()].filter((provider) => provider === 'human_research').length,
    professionalReviewDocuments: [...analysisProviders.values()].filter((provider) => provider === 'human_research').length,
    pendingProfessionalReviewDocuments: Math.max(
      0,
      Number(index.coverage?.uniquePdfContents ?? index.documents?.length ?? 0)
        - [...analysisProviders.values()].filter((provider) => provider === 'human_research').length,
    ),
    legalReadDocuments: analysisIdentities.size,
    pendingLegalReadDocuments: files.filter((file) => !analysisIdentities.has(`${file.url}|${file.sha256 ?? ''}`)).length,
    pendingLegalReadReasons,
    completeTranslations: generatedTranslations.filter((value) => value.coverage === 'complete').length,
    sourceAlreadyTargetLanguage: sourceAlreadyTarget.filter((value) => value.coverage === 'complete').length,
    redactedTranslations: redactedTranslations.length,
    partialTranslations: generatedTranslations.filter((value) => value.coverage === 'partial').length,
    assistiveTranslations: assistiveTranslations.length,
    stale: indexState.stale,
    building: indexState.building,
  }
}

export function parseDocumentSearchQuery(value) {
  const normalizedInput = String(value ?? '').normalize('NFKC').trim()
  const truncated = normalizedInput.length > 240
  const raw = normalizedInput.slice(0, 240)
  const terms = []
  const expression = /"([^"]+)"|(\S+)/g
  for (const match of raw.matchAll(expression)) {
    if (terms.length >= 12) break
    const source = match[1] ?? match[2] ?? ''
    const normalized = normalizeDocumentSearchText(source)
    if (!normalized) continue
    terms.push({ raw: source, normalized, phrase: match[1] != null })
  }
  return {
    raw,
    normalized: normalizeDocumentSearchText(raw.replaceAll('"', '')),
    terms,
    truncated,
  }
}

export function normalizeDocumentSearchText(value) {
  return normalizeDocumentSearchSurface(value).toLowerCase()
}

function normalizeDocumentSearchSurface(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/([A-Za-z])-\s*\n\s*([a-z])/g, '$1$2')
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/(\d)[,_，](?=\d)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

async function currentDocumentSearchIndex(manifest) {
  const signature = await documentSearchSignature(manifest)
  if (activeIndex?.signature === signature) return { index: activeIndex, stale: false, building: false }

  if (!activeIndex) {
    return { index: await loadOrBuildIndex(manifest, signature), stale: false, building: false }
  }

  void startIndexBuild(manifest, signature, false).catch(() => undefined)
  return { index: activeIndex, stale: true, building: true }
}

async function startIndexBuild(manifest, signature, force) {
  if (!force && activeIndex?.signature === signature) return activeIndex
  if (activeBuild && activeBuild.signature !== signature) await activeBuild.promise.catch(() => undefined)
  if (!force && activeIndex?.signature === signature) return activeIndex
  return trackIndexBuild(signature, async () => compileIndex(await buildSearchIndexPayload(manifest, signature)))
}

async function loadOrBuildIndex(manifest, signature) {
  return trackIndexBuild(signature, async () => {
    const persisted = await readJsonFile(indexPath)
    if (validPersistedSearchIndex(persisted, signature) && await persistedSearchTextFilesExist(persisted)) {
      scheduleOrphanedSearchTextPrune(persisted)
      return compileIndex(persisted)
    }
    return compileIndex(await buildSearchIndexPayload(manifest, signature))
  })
}

async function buildSearchIndexPayload(manifest, signature) {
  if (isSearchIndexWorker || process.env.GUO_INTEL_SEARCH_INLINE === '1') return buildDocumentSearchIndex(manifest, signature)
  await runSearchIndexWorker({ files: manifest?.files ?? [], generatedAt: manifest?.generatedAt ?? null }, signature)
  const persisted = await readJsonFile(indexPath)
  if (!validPersistedSearchIndex(persisted, signature) || !await persistedSearchTextFilesExist(persisted)) {
    throw new Error('The isolated document search index builder did not produce a valid index.')
  }
  scheduleOrphanedSearchTextPrune(persisted)
  return persisted
}

function runSearchIndexWorker(manifest, signature) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), {
      env: searchIndexWorkerEnvironment(),
      workerData: { task: 'build-document-search-index', manifest, signature },
    })
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      void worker.terminate()
      reject(new Error('The document search index worker exceeded 15 minutes.'))
    }, 15 * 60 * 1000)
    const finish = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (error) reject(error)
      else resolve()
    }
    worker.once('message', (message) => {
      finish(message?.ok ? null : new Error(message?.error || 'The document search index worker failed.'))
    })
    worker.once('error', (error) => {
      finish(error)
    })
    worker.once('exit', (code) => {
      if (!settled) finish(new Error(`The document search index worker exited without a result (code ${code ?? 'unknown'}).`))
    })
  })
}

function searchIndexWorkerEnvironment() {
  const env = {}
  for (const name of ['GUO_INTEL_CACHE_DIR', 'NODE_ENV', 'TMPDIR']) {
    if (process.env[name]) env[name] = process.env[name]
  }
  return env
}

function trackIndexBuild(signature, builder) {
  if (activeBuild?.signature === signature) return activeBuild.promise
  const generation = ++activeBuildGeneration
  const promise = builder()
    .then((index) => {
      if (generation === activeBuildGeneration) activeIndex = index
      return index
    })
    .finally(() => {
      if (activeBuild?.generation === generation) activeBuild = null
    })
  activeBuild = { signature, generation, promise }
  return promise
}

function validPersistedSearchIndex(value, signature) {
  if (value?.schemaVersion !== searchIndexVersion || value?.signature !== signature || !Array.isArray(value?.documents)) return false
  if (!value.coverage || value.documents.length !== Number(value.coverage.uniquePdfContents)) return false
  return value.documents.every((document) => {
    if (!/^[a-f0-9]{64}$/i.test(String(document?.contentSha256 ?? ''))) return false
    if (!document?.canonicalSourceUrl || !Array.isArray(document?.sources) || !document.sources.length) return false
    if (!Array.isArray(document?.translations) || !Array.isArray(document?.analyses)) return false
    if (document.original && (!validSearchCacheReference(document.original.cacheFile, 'pdf-text') || !validSearchTextReference(document.original.searchTextFile))) return false
    if (!document.translations.every((entry) => validSearchCacheReference(entry.cacheFile, 'translations') && validSearchTextReference(entry.searchTextFile))) return false
    if (!document.analyses.every((entry) => validSearchCacheReference(entry.cacheFile, 'document-ai') && validSearchTextReference(entry.searchTextFile))) return false
    return ['original', 'translation', 'analysis'].every((scope) => (
      typeof document?.bloom?.[scope] === 'string'
      && Buffer.byteLength(document.bloom[scope], 'base64') === bloomWordCount * Uint32Array.BYTES_PER_ELEMENT
    ))
  })
}

async function persistedSearchTextFilesExist(index) {
  const files = new Set()
  for (const document of index.documents) {
    if (document.original?.searchTextFile) files.add(document.original.searchTextFile)
    for (const entry of document.translations) files.add(entry.searchTextFile)
    for (const entry of document.analyses) files.add(entry.searchTextFile)
  }
  const checks = await mapWithConcurrency([...files], 32, async (cacheFile) => {
    const info = await stat(path.join(cacheRoot, cacheFile)).catch(() => null)
    return Boolean(info?.isFile() && info.size > 0)
  })
  return checks.every(Boolean)
}

function scheduleOrphanedSearchTextPrune(index) {
  if (isSearchIndexWorker) return
  setTimeout(() => void pruneOrphanedSearchTextFiles(index).catch(() => undefined), 0).unref()
}

async function pruneOrphanedSearchTextFiles(index) {
  const used = new Set()
  for (const document of index.documents) {
    if (document.original?.searchTextFile) used.add(path.basename(document.original.searchTextFile))
    for (const entry of document.translations) used.add(path.basename(entry.searchTextFile))
    for (const entry of document.analyses) used.add(path.basename(entry.searchTextFile))
  }
  const entries = await readdir(searchTextDirectory, { withFileTypes: true }).catch(() => [])
  const cutoff = Date.now() - orphanedSearchTextRetentionMs
  await mapWithConcurrency(entries, 12, async (entry) => {
    if (!entry.isFile() || used.has(entry.name)) return
    const target = path.join(searchTextDirectory, entry.name)
    const info = await stat(target).catch(() => null)
    if (info && info.mtimeMs < cutoff) await unlink(target).catch(() => undefined)
  })
}

async function buildDocumentSearchIndex(manifest, signature) {
  const files = (manifest?.files ?? []).filter((file) => localFileStatuses.has(file?.status) && file?.url && file?.sha256)
  const currentByUrl = new Map(files.map((file) => [file.url, file]))
  const currentHashes = new Set(files.map((file) => file.sha256))
  const [extractions, translations, analyses] = await Promise.all([
    scanJsonDirectory('pdf-text', async (value, cacheFile) => {
      const sha256 = value?.signature?.contentSha256 || value?.signature?.manifestSha256
      if (value?.cacheVersion !== extractionCacheVersion || !currentHashes.has(sha256) || value?.status !== 'extracted') return null
      return { sha256, entry: await indexedOriginal(value, cacheFile) }
    }),
    scanJsonDirectory('translations', async (value, cacheFile) => {
      const file = currentByUrl.get(value?.sourceUrl)
      const sha256 = value?.sourceSha256 || file?.sha256
      if (value?.schemaVersion !== translationCacheVersion || !file || file.sha256 !== sha256) return null
      if (!['translated', 'assistive_only', 'no_translation_needed'].includes(value?.status) || !translationPages(value).length) return null
      return { sha256, language: normalizedTargetLanguage(value.targetLanguage), entry: await indexedTranslation(value, cacheFile) }
    }),
    scanJsonDirectory('document-ai', async (value, cacheFile) => {
      const file = currentByUrl.get(value?.sourceUrl)
      if (!file || value?.sourceSha256 !== file.sha256 || !value?.aiStatus?.generated) return null
      const chunks = legalAnalysisChunks(value)
      if (!chunks.length) return null
      const language = documentAnalysisLanguage(value)
      return { sha256: file.sha256, language, entry: await indexedAnalysis(value, cacheFile, chunks) }
    }),
  ])

  const extractionByHash = new Map()
  for (const { sha256, entry } of extractions) {
    const current = extractionByHash.get(sha256)
    if (!current || preferExtraction(entry, current)) extractionByHash.set(sha256, entry)
  }

  const translationByHashAndLanguage = new Map()
  for (const { sha256, language, entry } of translations) {
    const key = `${sha256}|${language}`
    const current = translationByHashAndLanguage.get(key)
    if (!current || preferTranslation(entry, current)) translationByHashAndLanguage.set(key, entry)
  }

  const analysisByHashAndLanguage = new Map()
  for (const { sha256, language, entry } of analyses) {
    const key = `${sha256}|${language}`
    const current = analysisByHashAndLanguage.get(key)
    if (!current || preferAnalysis(entry, current)) analysisByHashAndLanguage.set(key, entry)
  }
  const translationsByHash = groupBy([...translationByHashAndLanguage.entries()], ([key]) => key.slice(0, 64))
  const analysesByHash = groupBy([...analysisByHashAndLanguage.entries()], ([key]) => key.slice(0, 64))

  const filesByHash = groupBy(files, (file) => file.sha256)
  const documents = []
  let completeOriginals = 0
  let partialOriginals = 0
  let ocrOriginals = 0
  let translatedComplete = 0
  let translatedPartial = 0
  let assistiveTranslations = 0
  let analysisDocuments = 0
  for (const [sha256, groupedFiles] of filesByHash) {
    const sources = groupedFiles.map(searchSource).sort((left, right) => right.authority - left.authority || left.sourceUrl.localeCompare(right.sourceUrl))
    const originalEntry = extractionByHash.get(sha256)
    const original = originalEntry ? withoutSearchBloom(originalEntry) : null
    if (original?.coverage === 'complete') completeOriginals += 1
    else if (original) partialOriginals += 1
    if (original?.ocrUsed) ocrOriginals += 1

    const translationEntries = (translationsByHash.get(sha256) ?? []).map(([, entry]) => entry)
    const indexedTranslations = translationEntries.map(withoutSearchBloom)
    for (const translation of indexedTranslations) {
      if (translation.status === 'assistive_only') assistiveTranslations += 1
      else if (translation.coverage === 'complete') translatedComplete += 1
      else translatedPartial += 1
    }

    const analysisEntries = (analysesByHash.get(sha256) ?? []).map(([, entry]) => entry)
    const indexedAnalyses = analysisEntries.map(withoutSearchBloom)
    if (indexedAnalyses.length) analysisDocuments += 1
    const bloom = emptyBloomSet()
    if (originalEntry) mergeBloom(bloom.original, originalEntry.searchBloom)
    for (const translation of translationEntries) mergeBloom(bloom.translation, translation.searchBloom)
    for (const analysis of analysisEntries) mergeBloom(bloom.analysis, analysis.searchBloom)
    documents.push({
      contentSha256: sha256,
      canonicalSourceUrl: sources[0]?.sourceUrl ?? groupedFiles[0].url,
      sources,
      original,
      translations: indexedTranslations,
      analyses: indexedAnalyses,
      bloom: serializeBloomSet(bloom),
    })
  }

  const payload = {
    schemaVersion: searchIndexVersion,
    signature,
    generatedAt: new Date().toISOString(),
    manifestGeneratedAt: manifest?.generatedAt ?? null,
    documents,
    coverage: {
      manifestPdfFiles: files.length,
      uniquePdfContents: filesByHash.size,
      indexedOriginals: documents.filter((document) => document.original).length,
      completeOriginals,
      partialOriginals,
      missingOriginals: Math.max(0, filesByHash.size - extractionByHash.size),
      ocrOriginals,
      translatedComplete,
      translatedPartial,
      assistiveTranslations,
      analysisDocuments,
    },
  }
  await mkdir(cacheRoot, { recursive: true, mode: 0o700 })
  await atomicWriteJson(indexPath, payload, { directoryMode: 0o700 })
  return payload
}

function compileIndex(payload) {
  const documents = payload.documents.map((document) => ({ ...document, bloom: deserializeBloomSet(document.bloom) }))
  const bySourceUrl = new Map()
  for (const document of documents) {
    for (const source of document.sources) bySourceUrl.set(source.sourceUrl, document)
  }
  return { ...payload, documents, bySourceUrl }
}

function emptyBloomSet() {
  return {
    original: new Uint32Array(bloomWordCount),
    translation: new Uint32Array(bloomWordCount),
    analysis: new Uint32Array(bloomWordCount),
  }
}

function buildSectionBloom(sections) {
  const bloom = new Uint32Array(bloomWordCount)
  addSectionsToBloom(bloom, sections)
  return bloom
}

function mergeBloom(target, source) {
  for (let index = 0; index < bloomWordCount; index += 1) target[index] |= source[index]
}

function serializeBloomSet(bloom) {
  return Object.fromEntries(Object.entries(bloom).map(([scope, value]) => [scope, Buffer.from(value.buffer).toString('base64')]))
}

function deserializeBloomSet(serialized) {
  const bloom = emptyBloomSet()
  for (const scope of ['original', 'translation', 'analysis']) {
    const source = Buffer.from(String(serialized?.[scope] ?? ''), 'base64')
    if (source.byteLength !== bloom[scope].byteLength) continue
    Buffer.from(bloom[scope].buffer).set(source)
  }
  return bloom
}

function addSectionsToBloom(bloom, sections) {
  for (const section of sections) {
    const normalized = normalizeDocumentSearchText(section.text)
    for (const token of documentIndexTokens(normalized)) addBloomToken(bloom, token)
  }
}

function addBloomToken(bloom, token) {
  const [first, second] = bloomHashes(token)
  for (let index = 0; index < 3; index += 1) {
    const bit = (first + Math.imul(index, second)) & (bloomBitCount - 1)
    bloom[bit >>> 5] |= 1 << (bit & 31)
  }
}

function bloomContainsToken(bloom, token) {
  const [first, second] = bloomHashes(token)
  for (let index = 0; index < 3; index += 1) {
    const bit = (first + Math.imul(index, second)) & (bloomBitCount - 1)
    if ((bloom[bit >>> 5] & (1 << (bit & 31))) === 0) return false
  }
  return true
}

function bloomHashes(value) {
  let first = 2166136261
  let second = 0x9e3779b9
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    first = Math.imul(first ^ code, 16777619)
    second = Math.imul(second ^ code, 2246822519)
  }
  second |= 1
  return [first >>> 0, second >>> 0]
}

function bloomContainsQuery(bloom, tokens) {
  return tokens.every((token) => bloomContainsToken(bloom, token))
}

function documentMatchesBloom(document, tokens, scope) {
  if (scope === 'all') {
    return bloomContainsQuery(document.bloom.original, tokens)
      || bloomContainsQuery(document.bloom.translation, tokens)
      || bloomContainsQuery(document.bloom.analysis, tokens)
  }
  if (!['original', 'translation', 'analysis'].includes(scope)) return false
  return bloomContainsQuery(document.bloom[scope], tokens)
}

async function searchIndexedBodies(index, query, scope, signal) {
  const hits = new Map()
  const queryTokens = queryIndexTokens(query)
  const queryLanguage = searchQueryLanguage(query)
  const candidates = candidateDocumentIndexes(index, query, scope, queryTokens)
  const results = await mapWithConcurrency(candidates, searchReadConcurrency, async (documentIndex) => {
    if (signal?.aborted) return null
    const document = index.documents[documentIndex]
    const matches = []
    const originalMayMatch = ['all', 'original'].includes(scope)
      && document.original
      && bloomContainsQuery(document.bloom.original, queryTokens)
    if (originalMayMatch) {
      const body = await readSearchText(document.original.searchTextFile)
      const match = bestIndexedTextMatch(body, query, document.original.pageNumbers)
      if (match) matches.push(searchMatchForPage(document, document.original, match, 'body_original', 700))
    }

    const translationMayMatch = ['all', 'translation'].includes(scope)
      && bloomContainsQuery(document.bloom.translation, queryTokens)
    if (translationMayMatch && (scope === 'translation' || matches.length === 0)) {
      for (const translation of entriesForQueryLanguage(document.translations, queryLanguage)) {
        const body = await readSearchText(translation.searchTextFile)
        const match = bestIndexedTextMatch(body, query, translation.pageNumbers)
        if (!match) continue
        const qualityScore = translation.status === 'assistive_only' ? 470 : translation.coverage === 'complete' ? 620 : 540
        matches.push(searchMatchForPage(document, translation, match, 'body_translation', qualityScore))
      }
    }

    const analysisMayMatch = ['all', 'analysis'].includes(scope)
      && bloomContainsQuery(document.bloom.analysis, queryTokens)
    if (analysisMayMatch && (scope === 'analysis' || matches.length === 0)) {
      for (const analysis of entriesForQueryLanguage(document.analyses, queryLanguage)) {
        const body = await readSearchText(analysis.searchTextFile)
        const match = bestIndexedChunkMatch(body, query)
        if (match) matches.push(searchMatchForAnalysis(document, analysis, match))
      }
    }
    if (!matches.length) return null
    matches.sort((left, right) => right.score - left.score)
    return { document, result: { score: matches[0].score, matches: matches.slice(0, 3) } }
  }, signal)
  throwIfSearchAborted(signal)
  for (const item of results) {
    if (!item) continue
    for (const source of item.document.sources) hits.set(source.sourceUrl, item.result)
  }
  return hits
}

function searchQueryLanguage(query) {
  const value = query.terms.map((term) => term.normalized).join(' ')
  const hasHan = /\p{Script=Han}/u.test(value)
  const hasLatin = /[a-z]/i.test(value)
  if (hasHan === hasLatin) return null
  return hasHan ? 'zh' : 'en'
}

function entriesForQueryLanguage(entries, language) {
  if (!language) return entries
  const matching = entries.filter((entry) => entry.language === language)
  return matching.length ? matching : entries
}

async function readSearchText(cacheFile) {
  if (!validSearchTextReference(cacheFile)) return ''
  if (searchTextInflight.has(cacheFile)) return searchTextInflight.get(cacheFile)
  let promise
  promise = readFile(path.join(cacheRoot, cacheFile))
    .then((compressed) => gunzip(compressed))
    .then((body) => body.toString('utf8'))
    .catch(async (error) => {
      const confirmedCorruption = ['Z_DATA_ERROR', 'Z_BUF_ERROR'].includes(error?.code)
      if (confirmedCorruption) await unlink(path.join(cacheRoot, cacheFile)).catch(() => undefined)
      if (confirmedCorruption || error?.code === 'ENOENT') markActiveSearchIndexForRecovery()
      return ''
    })
    .finally(() => {
      if (searchTextInflight.get(cacheFile) === promise) searchTextInflight.delete(cacheFile)
    })
  searchTextInflight.set(cacheFile, promise)
  return promise
}

function markActiveSearchIndexForRecovery() {
  if (!activeIndex || activeIndex.searchTextFault) return
  activeIndex.searchTextFault = true
  activeIndex.signature = `recovery-required:${Date.now()}`
}

function candidateDocumentIndexes(index, query, scope, tokens = queryIndexTokens(query)) {
  if (!tokens.length) return index.documents.keys()
  return index.documents.map((document, documentIndex) => documentMatchesBloom(document, tokens, scope) ? documentIndex : -1).filter((value) => value >= 0)
}

function queryIndexTokens(query) {
  const tokens = new Set()
  for (const term of query.terms) {
    for (const token of documentIndexTokens(term.normalized)) tokens.add(token)
  }
  return [...tokens]
}

function documentIndexTokens(value) {
  const text = String(value ?? '')
  const tokens = []
  for (const match of text.matchAll(/[a-z0-9§]+(?:[.()/-][a-z0-9§]+)*/g)) {
    tokens.push(match[0])
    for (const segment of match[0].split(/[^a-z0-9§]+/).filter(Boolean)) tokens.push(segment)
  }
  for (const match of text.matchAll(/\p{Script=Han}+/gu)) {
    const characters = [...match[0]]
    if (characters.length === 1) tokens.push(characters[0])
    else for (let index = 0; index < characters.length - 1; index += 1) tokens.push(`${characters[index]}${characters[index + 1]}`)
  }
  return tokens
}

function searchCatalogMetadata(record, query, scope) {
  if (scope === 'web' && record.resourceKind !== 'web_page') return null
  if (scope === 'analysis' && record.resourceKind === 'web_page') return null
  if (scope !== 'all' && scope !== 'analysis' && scope !== 'web') return null
  const aliases = record.searchAliases ?? []
  const docNumber = normalizeDocumentSearchText(record.docNumber ?? '')
  const caseId = normalizeDocumentSearchText(record.caseId ?? '')
  const title = normalizeDocumentSearchText(`${record.title ?? ''} ${record.originalTitle ?? ''}`)
  const direct = normalizeDocumentSearchText([
    record.docNumber ? `doc ${record.docNumber} document ${record.docNumber} 文件 ${record.docNumber}` : '',
    record.caseId,
    record.title,
    record.originalTitle,
    record.category,
    record.sourceLabel,
    record.sourceVerification?.label,
    aliases.join(' '),
  ].filter(Boolean).join(' '))
  const analysis = normalizeDocumentSearchText([
    record.summary,
    record.plainEnglish,
    record.searchText,
  ].filter(Boolean).join(' '))
  const web = record.resourceKind === 'web_page' ? normalizeDocumentSearchText(`${direct} ${analysis}`) : ''
  const normalizedQuery = query.normalized
  const docExpression = normalizedQuery.match(/^(?:doc(?:ument)?|文件)\s*([0-9]+(?:-[0-9]+)?)$/)?.[1]
  if (scope === 'all' && docNumber && (normalizedQuery === docNumber || docExpression === docNumber)) {
    return metadataMatch(record, query, 'docket_number', 1400)
  }
  if (scope === 'all' && caseId && normalizedQuery === caseId) return metadataMatch(record, query, 'docket_number', 1360)
  if (scope === 'all' && title === normalizedQuery) return metadataMatch(record, query, 'title', 1240)
  if (scope === 'all' && aliases.some((alias) => normalizeDocumentSearchText(alias) === normalizedQuery)) return metadataMatch(record, query, 'title', 1160)
  if (scope === 'web' && textMatchesQuery(web, query)) return metadataMatch(record, query, 'web_page', 680)
  if (scope === 'all' && textMatchesQuery(direct, query)) return metadataMatch(record, query, record.resourceKind === 'web_page' ? 'web_page' : 'title', 1040)
  if (['all', 'analysis'].includes(scope) && textMatchesQuery(analysis, query)) return metadataMatch(record, query, record.resourceKind === 'web_page' ? 'web_page' : 'legal_analysis', record.resourceKind === 'web_page' ? 650 : 430)
  return null
}

function metadataMatch(record, query, kind, score) {
  return {
    kind,
    score,
    pageNumber: null,
    snippet: kind === 'docket_number' || kind === 'title' ? record.title : record.plainEnglish || record.summary || record.title,
    terms: query.terms.map((term) => term.raw),
    language: detectLanguage(record.title),
    coverage: kind === 'web_page' ? (record.researchQuality?.key === 'body_verified' ? 'complete' : 'partial') : 'metadata',
    contentIntegrity: kind === 'web_page' ? 'archived_web_page' : 'metadata',
    sourceUrl: record.sourceUrl,
    alternatives: [],
  }
}

function bestIndexedTextMatch(body, query, pageNumbers = []) {
  if (!body) return null
  const positions = []
  for (const term of query.terms) {
    const index = tokenMatchIndex(body, term.normalized)
    if (index < 0) return null
    positions.push(index)
  }
  const sectionIndexes = positions.map((position) => sectionIndexAt(body, position))
  const sectionScores = new Map()
  for (const sectionIndex of sectionIndexes) sectionScores.set(sectionIndex, (sectionScores.get(sectionIndex) ?? 0) + 1)
  const primarySection = [...sectionScores.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0]?.[0] ?? 0
  const primaryPosition = positions.find((position, index) => sectionIndexes[index] === primarySection) ?? positions[0] ?? 0
  const sectionStart = primarySection === 0 ? 0 : body.lastIndexOf('\u0000', primaryPosition) + 1
  const nextBoundary = body.indexOf('\u0000', primaryPosition)
  const sectionEnd = nextBoundary < 0 ? body.length : nextBoundary
  const sectionText = body.slice(sectionStart, sectionEnd)
  const uniqueSections = new Set(sectionIndexes)
  const span = positions.length > 1 ? Math.max(...positions) - Math.min(...positions) : 0
  let relevance = query.terms.filter((term) => term.phrase).length * 35
  if (query.normalized && regexMatchIndex(body, new RegExp(escapeRegExp(query.normalized), 'i')) >= 0) relevance += 100
  if (uniqueSections.size === 1 && span <= 120) relevance += 80
  else if (uniqueSections.size === 1 && span <= 500) relevance += 35
  else relevance += 15
  return {
    page: { pageNumber: pageNumbers[primarySection] ?? primarySection + 1, text: sectionText },
    firstIndex: Math.max(0, primaryPosition - sectionStart),
    normalizedLength: sectionText.length,
    relevance,
    terms: query.terms.map((term) => term.raw),
    matchedPageNumbers: [...new Set(sectionIndexes.map((sectionIndex) => pageNumbers[sectionIndex] ?? sectionIndex + 1))].sort((left, right) => left - right),
    distributed: uniqueSections.size > 1,
  }
}

function bestIndexedChunkMatch(body, query) {
  const match = bestIndexedTextMatch(body, query)
  if (!match) return null
  return {
    chunk: { text: match.page.text },
    firstIndex: match.firstIndex,
    normalizedLength: match.normalizedLength,
    relevance: match.relevance,
    terms: match.terms,
  }
}

function sectionIndexAt(body, position) {
  let sectionIndex = 0
  for (let index = body.indexOf('\u0000'); index >= 0 && index < position; index = body.indexOf('\u0000', index + 1)) sectionIndex += 1
  return sectionIndex
}

function textMatchesQuery(text, query) {
  return query.terms.every((term) => tokenMatchIndex(text, term.normalized) >= 0)
}

function tokenMatchIndex(text, token) {
  if (!token) return -1
  const escaped = escapeRegExp(token)
  if (/^\d+$/.test(token)) return regexMatchIndex(text, new RegExp(`(^|[^0-9])${escaped}(?=[^0-9]|$)`, 'i'))
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(token) || /^[a-z0-9]{1,3}$/.test(token)) {
    return regexMatchIndex(text, new RegExp(`(^|[^a-z0-9])${escaped}(?=[^a-z0-9]|$)`, 'i'))
  }
  return regexMatchIndex(text, new RegExp(escaped, 'i'))
}

function regexMatchIndex(text, expression) {
  const match = expression.exec(text)
  if (!match) return -1
  return match.index + (match[1]?.length ?? 0)
}

function searchMatchForPage(document, section, match, kind, baseScore) {
  return {
    kind,
    score: baseScore + match.relevance + (section.coverage === 'complete' ? 20 : 0),
    pageNumber: match.page.pageNumber,
    matchedPageNumbers: match.matchedPageNumbers,
    snippet: excerptAroundMatch(match.page.text, match.firstIndex, match.normalizedLength),
    terms: match.terms,
    language: kind === 'body_translation' ? section.language : detectLanguage(match.page.text),
    coverage: section.coverage,
    contentIntegrity: section.contentIntegrity ?? 'source_original',
    engine: section.engine ?? null,
    sourceUrl: document.canonicalSourceUrl,
    alternatives: document.sources.slice(1, 5).map(publicSearchSource),
  }
}

function searchMatchForAnalysis(document, analysis, match) {
  return {
    kind: 'legal_analysis',
    score: 430 + match.relevance,
    pageNumber: null,
    snippet: excerptAroundMatch(match.chunk.text, match.firstIndex, match.normalizedLength),
    terms: match.terms,
    language: analysis.language,
    coverage: 'analysis',
    contentIntegrity: analysis.provider,
    engine: analysis.mode,
    sourceUrl: document.canonicalSourceUrl,
    alternatives: document.sources.slice(1, 5).map(publicSearchSource),
  }
}

function excerptAroundMatch(text, normalizedIndex, normalizedLength) {
  const compact = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  const approximate = normalizedLength > 0 ? Math.round((normalizedIndex / normalizedLength) * compact.length) : 0
  let start = Math.max(0, approximate - 105)
  let end = Math.min(compact.length, approximate + 230)
  if (start > 0) start = Math.max(start, compact.lastIndexOf(' ', start) + 1)
  if (end < compact.length) {
    const nextSpace = compact.indexOf(' ', end)
    if (nextSpace >= 0 && nextSpace - end < 40) end = nextSpace
  }
  return `${start > 0 ? '...' : ''}${compact.slice(start, end)}${end < compact.length ? '...' : ''}`
}

function recordAvailableInScope(record, document, scope) {
  if (scope === 'all') return true
  if (scope === 'web') return record.resourceKind === 'web_page'
  if (record.resourceKind === 'web_page') return false
  if (scope === 'original') return Boolean(document?.original)
  if (scope === 'translation') return Boolean(document?.translations.length)
  if (scope === 'analysis') return Boolean(document?.analyses.length || record.searchText)
  return true
}

async function indexedOriginal(value, cacheFile) {
  const pages = extractionPages(value)
  const searchText = await writeSearchText('original', pages)
  return {
    cacheFile,
    searchTextFile: searchText.cacheFile,
    pageNumbers: searchText.sectionNumbers,
    status: value.status,
    engine: value.engine,
    coverage: value.coverage ?? 'partial',
    totalPages: value.totalPages ?? null,
    pagesParsed: value.pagesParsed ?? 0,
    charCount: value.charCount ?? 0,
    contentIntegrity: 'source_original',
    ocrUsed: String(value.engine ?? '').toLowerCase().includes('tesseract'),
    searchBloom: buildSectionBloom(pages),
  }
}

async function indexedTranslation(value, cacheFile) {
  const pages = translationPages(value)
  const searchText = await writeSearchText('translation', pages)
  return {
    cacheFile,
    searchTextFile: searchText.cacheFile,
    pageNumbers: searchText.sectionNumbers,
    sourceUrl: value.sourceUrl,
    status: value.status,
    language: normalizedTargetLanguage(value.targetLanguage),
    mode: value.mode,
    coverage: value.coverage ?? 'partial',
    contentIntegrity: value.contentIntegrity ?? 'unknown',
    translatedAt: value.translatedAt ?? null,
    searchBloom: buildSectionBloom(pages),
  }
}

async function indexedAnalysis(value, cacheFile, chunks) {
  const searchText = await writeSearchText('analysis', chunks)
  return {
    cacheFile,
    searchTextFile: searchText.cacheFile,
    sectionKinds: chunks.map((chunk) => chunk.kind),
    sourceUrl: value.sourceUrl,
    language: documentAnalysisLanguage(value),
    provider: value.aiStatus?.provider ?? 'unknown',
    mode: value.aiStatus?.mode ?? '',
    searchBloom: buildSectionBloom(chunks),
  }
}

async function writeSearchText(scope, sections) {
  const normalizedSections = sections.map((section) => normalizeDocumentSearchSurface(section.text))
  const body = normalizedSections.join('\u0000')
  const hash = createHash('sha256').update(`${searchIndexVersion}\u0000${scope}\u0000${body}`).digest('hex')
  const filename = `${scope}-${hash}.txt.gz`
  const cacheFile = path.posix.join('document-search-text', filename)
  const target = path.join(searchTextDirectory, filename)
  const existing = await stat(target).catch(() => null)
  if (!existing?.isFile()) {
    await mkdir(searchTextDirectory, { recursive: true, mode: 0o700 })
    const temporary = path.join(searchTextDirectory, `.${filename}.${process.pid}.${randomUUID()}.tmp`)
    try {
      await writeFile(temporary, await gzip(body, { level: 6 }), { mode: 0o600, flag: 'wx' })
      await rename(temporary, target)
    } finally {
      await unlink(temporary).catch(() => undefined)
    }
  }
  return {
    cacheFile,
    sectionNumbers: sections.map((section, index) => Number(section.pageNumber ?? index + 1)),
  }
}

function withoutSearchBloom(entry) {
  const { searchBloom: _searchBloom, ...publicEntry } = entry
  return publicEntry
}

function extractionPages(value) {
  const pages = (value?.pageSnippets ?? [])
    .map((page, index) => ({ pageNumber: Number(page?.pageNumber ?? index + 1), text: String(page?.text ?? '').trim() }))
    .filter((page) => page.text)
  if (pages.length) return pages
  const text = String(value?.snippet ?? '').trim()
  return text ? [{ pageNumber: 1, text }] : []
}

function translationPages(value) {
  const pages = (value?.pageTranslations ?? [])
    .map((page, index) => ({ pageNumber: Number(page?.pageNumber ?? index + 1), text: String(page?.translatedText ?? '').trim() }))
    .filter((page) => page.text)
  if (pages.length) return pages
  const text = String(value?.translatedText ?? '').trim()
  return text ? [{ pageNumber: 1, text }] : []
}

function legalAnalysisChunks(value) {
  const chunks = [
    ['summary', value?.summary],
    ['plain_language', value?.plainEnglish],
    ...(value?.legalReading ?? []).map((text) => ['legal_reading', text]),
    ...(value?.caseConnections ?? []).map((text) => ['case_connection', text]),
    ...(value?.whyItMatters ?? []).map((text) => ['why_it_matters', text]),
    ...(value?.riskFlags ?? []).map((text) => ['risk', text]),
    ...(value?.aiFindings ?? []).map((finding) => [finding?.section ?? 'finding', finding?.text]),
  ]
  const seen = new Set()
  return chunks.map(([kind, text]) => ({ kind, text: String(text ?? '').trim() }))
    .filter((chunk) => chunk.text && !seen.has(chunk.text) && seen.add(chunk.text))
}

function searchSource(file) {
  return {
    sourceUrl: file.url,
    sourcePage: file.sourcePage ?? file.url,
    sourceId: file.sourceId,
    sourceLabel: file.sourceLabel ?? file.sourceId,
    authority: sourceAuthority(file),
  }
}

function publicSearchSource(source) {
  return {
    sourceUrl: source.sourceUrl,
    sourcePage: source.sourcePage,
    sourceLabel: source.sourceLabel,
    sourceId: source.sourceId,
  }
}

function sourceAuthority(file) {
  const sourceId = String(file?.sourceId ?? '').toLowerCase()
  const url = String(file?.url ?? '').toLowerCase()
  if (sourceId.includes('pacer')) return 600
  if (sourceId.includes('courtlistener') || sourceId.includes('recap')) return 500
  if (/\.(?:uscourts|justice|sec)\.gov\b/.test(url) || /\/uscourts\.gov\b/.test(url)) return 400
  if (sourceId.includes('himalaya-restoration')) return 220
  if (sourceId.includes('nfsc')) return 100
  return 300
}

function preferExtraction(candidate, current) {
  const weight = (value) => value?.coverage === 'complete' ? 2 : value?.coverage === 'partial' ? 1 : 0
  return weight(candidate) > weight(current)
    || weight(candidate) === weight(current) && Number(candidate?.pagesParsed ?? 0) > Number(current?.pagesParsed ?? 0)
    || weight(candidate) === weight(current) && Number(candidate?.pagesParsed ?? 0) === Number(current?.pagesParsed ?? 0) && Number(candidate?.charCount ?? 0) > Number(current?.charCount ?? 0)
}

function preferTranslation(candidate, current) {
  const weight = (value) => value?.status === 'translated' && value?.coverage === 'complete' && value?.contentIntegrity === 'source_complete'
    ? 5
    : value?.status === 'translated' && value?.coverage === 'complete'
      ? 4
      : value?.status === 'translated'
        ? 3
        : value?.status === 'assistive_only'
          ? 1
          : 0
  return weight(candidate) > weight(current)
    || weight(candidate) === weight(current) && String(candidate?.translatedAt ?? '') > String(current?.translatedAt ?? '')
}

function preferAnalysis(candidate, current) {
  const weight = (value) => ({ human_research: 5, openai: 4, anthropic: 4, gemini: 4, openai_compatible: 4, ollama: 4, local_rules: 2 }[value?.provider ?? value?.aiStatus?.provider] ?? 1)
  return weight(candidate) > weight(current)
}

function documentAnalysisLanguage(value) {
  if (['zh', 'en'].includes(value?.analysisLanguage)) return value.analysisLanguage
  return detectLanguage([value?.summary, value?.plainEnglish, ...(value?.legalReading ?? [])].join(' '))
}

function normalizedTargetLanguage(value) {
  return /chinese|中文|简体/i.test(String(value ?? '')) ? 'zh' : 'en'
}

function detectLanguage(value) {
  return /[\u3400-\u9fff]/u.test(String(value ?? '')) ? 'zh' : 'en'
}

async function documentSearchSignature(manifest) {
  const directories = ['pdf-text', 'translations', 'document-ai']
  const stamps = await Promise.all(directories.map(async (name) => {
    const info = await stat(path.join(cacheRoot, name)).catch(() => null)
    return [name, info?.mtimeMs ?? 0]
  }))
  const files = (manifest?.files ?? [])
    .map((file) => [file.url, file.sha256, file.status, file.path])
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
  return createHash('sha256').update(JSON.stringify({ version: searchIndexVersion, files, stamps })).digest('hex')
}

async function scanJsonDirectory(relativeDirectory, transform) {
  const directory = path.join(cacheRoot, relativeDirectory)
  let entries = []
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
  const filenames = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map((entry) => entry.name)
  const values = await mapWithConcurrency(filenames, 3, async (filename) => {
    const value = await readJsonFile(path.join(directory, filename))
    return value ? transform(value, path.posix.join(relativeDirectory, filename)) : null
  })
  return values.filter(Boolean)
}

function validSearchCacheReference(cacheFile, expectedDirectory) {
  const normalized = path.posix.normalize(String(cacheFile ?? ''))
  const [directory, filename, ...rest] = normalized.split('/')
  if (rest.length || !['pdf-text', 'translations', 'document-ai'].includes(directory)) return false
  if (expectedDirectory && directory !== expectedDirectory) return false
  return /^[a-zA-Z0-9._-]+\.json$/.test(filename ?? '')
}

function validSearchTextReference(cacheFile) {
  const normalized = path.posix.normalize(String(cacheFile ?? ''))
  const [directory, filename, ...rest] = normalized.split('/')
  return rest.length === 0
    && directory === 'document-search-text'
    && /^(?:original|translation|analysis)-[a-f0-9]{64}\.txt\.gz$/i.test(filename ?? '')
}

async function mapWithConcurrency(values, concurrency, mapper, signal) {
  const results = new Array(values.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, values.length)) }, async () => {
    while (cursor < values.length && !signal?.aborted) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(values[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

function throwIfSearchAborted(signal) {
  if (!signal?.aborted) return
  const error = new Error('Document search was cancelled.')
  error.name = 'AbortError'
  throw error
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

function groupBy(values, keyFor) {
  const groups = new Map()
  for (const value of values) {
    const key = keyFor(value)
    const group = groups.get(key) ?? []
    group.push(value)
    groups.set(key, group)
  }
  return groups
}

function compareCatalogRecords(left, right) {
  const leftDate = left.publishedAt ?? left.capturedAt ?? ''
  const rightDate = right.publishedAt ?? right.capturedAt ?? ''
  if (leftDate !== rightDate) return rightDate.localeCompare(leftDate)
  return String(right.docNumber ?? '').localeCompare(String(left.docNumber ?? ''), undefined, { numeric: true })
}

function withoutInternalScore(match) {
  const { score: _score, ...publicMatch } = match
  return publicMatch
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function boundedNumber(value, fallback, max) {
  if (value == null || String(value).trim() === '') return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(0, Math.floor(parsed)))
}

if (isSearchIndexWorker) {
  void buildDocumentSearchIndex(workerData.manifest, workerData.signature)
    .then(() => parentPort?.postMessage({ ok: true }))
    .catch((error) => {
      parentPort?.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) })
    })
}
