import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads'
import { gzip as gzipCallback, gunzip as gunzipCallback } from 'node:zlib'
import { atomicWriteJson } from './atomic-write.js'
import { compareDocketNumbers, docketNumberParts } from './docket-number.js'
import { normalizeLegalMetadataText } from './legal-metadata.js'
import { documentAnalysisQualityCurrent } from './document-language-quality.js'
import { pdfExtractionCacheVersion } from './pdf-extraction.js'

const searchIndexVersion = 'document-search-v8'
const translationCacheVersion = 'translation-v7'
const validScopes = new Set(['all', 'original', 'translation', 'analysis', 'web'])
const localFileStatuses = new Set(['downloaded', 'downloaded_new_version', 'skipped_existing'])
const bloomBitCount = 32768
const bloomWordCount = bloomBitCount / 32
const searchReadConcurrency = 10
const orphanedSearchTextRetentionMs = 7 * 24 * 60 * 60 * 1000
const primaryCriminalCaseId = 'sdny-23-cr-118'
const primaryCriminalDocket = '1:23-cr-118'
const relatedCriminalCaseOrder = new Map([
  ['ca2-26-1853', 0],
  ['ca2-26-563-dx', 1],
])
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
  const language = options.language === 'en' ? 'en' : 'zh'
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
  const logicalKeys = buildLogicalCatalogRecordKeys(records, compiled)

  const matchedRecords = records.map((record) => {
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

  const exactDocketMatches = ['all', 'analysis'].includes(scope)
    ? matchedRecords.filter((item) => exactDocketCoordinateMatch(item.record, query))
    : []
  const exactDocumentNumber = exactDocketMatches.length ? null : ['all', 'analysis'].includes(scope) ? exactDocumentNumberQuery(query) : null
  const exactDocumentMatches = exactDocumentNumber
    ? matchedRecords.filter((item) => normalizeDocumentSearchText(item.record.docNumber ?? '') === exactDocumentNumber)
    : []
  const selectedRecords = exactDocketMatches.length
    ? exactDocketMatches
    : exactDocumentMatches.length
      ? exactDocumentMatches
      : matchedRecords
  const filtered = collapseLogicalCatalogResults(selectedRecords, records, compiled, logicalKeys, language)
  filtered.sort((left, right) => (
    right.score - left.score
    || (query.raw ? searchResultAvailabilityRank(right.record) - searchResultAvailabilityRank(left.record) : 0)
    || compareDocumentCatalogRecords(left.record, right.record)
  ))
  return {
    generatedAt: new Date().toISOString(),
    total: new Set(logicalKeys.values()).size,
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

function exactDocumentNumberQuery(query) {
  const value = query.normalized
  if (/^[0-9]+(?:-[0-9]+)?$/.test(value)) return value
  return value.match(/^(?:doc(?:ument)?|文件|文书|案卷)\s*([0-9]+(?:-[0-9]+)?)$/)?.[1]
    ?? value.match(/^([0-9]+(?:-[0-9]+)?)\s*(?:号)?(?:文件|文书|案卷)$/)?.[1]
    ?? null
}

function exactDocketCoordinateMatch(record, query) {
  const docket = normalizeDocumentSearchText(record?.docketNumber ?? '')
  return Boolean(docket && query.normalized === docket)
}

function searchResultAvailabilityRank(record) {
  const localPdf = record?.resourceKind === 'pdf' && localFileStatuses.has(record?.status)
  if (!localPdf) return 0
  if (record?.aiStatus?.provider === 'human_research') return 400
  if (record?.aiStatus?.provider === 'local_rules') return 300
  return 200
}

function collapseLogicalCatalogResults(items, records, compiled, logicalKeys, language) {
  const allRecordGroups = groupBy(records, (record) => logicalKeys.get(catalogRecordIdentity(record)))
  const groups = groupBy(items, (item) => logicalKeys.get(catalogRecordIdentity(item.record)))
  return [...groups.entries()].map(([key, matchedGroup]) => {
    const matchedBySourceUrl = new Map(matchedGroup.map((item) => [item.record.sourceUrl, item]))
    const group = (allRecordGroups.get(key) ?? matchedGroup.map((item) => item.record)).map((record) => (
      matchedBySourceUrl.get(record.sourceUrl) ?? { record, score: 0 }
    ))
    const documents = [...new Map(group
      .map((item) => compiled.bySourceUrl.get(item.record.sourceUrl))
      .filter(Boolean)
      .map((document) => [document.contentSha256, document])).values()]
    const canonical = [...group].sort((left, right) => (
      canonicalCatalogRank(right, compiled) - canonicalCatalogRank(left, compiled)
      || right.score - left.score
      || compareDocumentCatalogRecords(left.record, right.record)
    ))[0]
    const readDonor = [...group].sort((left, right) => (
      logicalReadRank(right.record) - logicalReadRank(left.record)
      || canonicalCatalogRank(right, compiled) - canonicalCatalogRank(left, compiled)
    ))[0]?.record
    const score = Math.max(...matchedGroup.map((item) => item.score))
    const searchMatches = uniqueSearchMatches(matchedGroup)
    const sourceAlternatives = mergeLogicalSourceAlternatives(canonical.record, group, documents, compiled, language)
    return {
      record: {
        ...canonical.record,
        ...(readDonor?.plainEnglish && readDonor.sourceUrl !== canonical.record.sourceUrl
          ? { plainEnglish: readDonor.plainEnglish }
          : {}),
        ...(searchMatches.length ? { searchMatches, searchScore: score } : {}),
        ...(sourceAlternatives.length ? { sourceAlternatives } : {}),
      },
      score,
    }
  })
}

function logicalReadRank(record) {
  const providerRank = {
    human_research: 10000,
    openai: 8000,
    anthropic: 8000,
    gemini: 8000,
    openai_compatible: 8000,
    ollama: 8000,
    local_rules: 2000,
  }[record?.aiStatus?.provider] ?? 0
  const specificity = Number(record?.offlineRead?.specificity ?? 0)
  const hasRead = String(record?.plainEnglish ?? '').trim() ? 100 : 0
  return providerRank + specificity * 10 + hasRead
}

function buildLogicalCatalogRecordKeys(records, compiled) {
  const parents = records.map((_, index) => index)
  const find = (index) => {
    let root = index
    while (parents[root] !== root) root = parents[root]
    while (parents[index] !== index) {
      const next = parents[index]
      parents[index] = root
      index = next
    }
    return root
  }
  const union = (left, right) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot
  }
  const filingOwners = new Map()
  const hashGroups = new Map()

  records.forEach((record, index) => {
    if (record.resourceKind === 'web_page') return
    const docNumber = String(record.docNumber ?? '').trim().toLowerCase()
    if (docNumber) {
      const docket = normalizeDocketCoordinate(record.docketNumber)
      const filingKeys = [
        docket ? `docket:${docket}:${docNumber}` : '',
        record.caseId ? `case:${record.caseId}:${docNumber}` : '',
      ].filter(Boolean)
      for (const key of filingKeys) {
        if (filingOwners.has(key)) union(index, filingOwners.get(key))
        else filingOwners.set(key, index)
      }
    }
    const document = compiled.bySourceUrl.get(record.sourceUrl)
    if (!document?.contentSha256) return
    const hashKey = `${document.contentSha256}:${docNumber}`
    const group = hashGroups.get(hashKey) ?? []
    group.push(index)
    hashGroups.set(hashKey, group)
  })

  for (const indexes of hashGroups.values()) {
    const dockets = new Set(indexes
      .map((index) => normalizeDocketCoordinate(records[index].docketNumber))
      .filter(Boolean))
    if (dockets.size > 1) continue
    for (const index of indexes.slice(1)) union(indexes[0], index)
  }

  return new Map(records.map((record, index) => [catalogRecordIdentity(record), `logical:${find(index)}`]))
}

function normalizeDocketCoordinate(value) {
  const docket = String(value ?? '').trim().toLowerCase().replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, '')
  if (!docket) return ''
  // District docket exports sometimes append the judge's initials to the same filing coordinate.
  // Keep defendant/sequence suffixes intact; only strip a final alphabetic judge suffix.
  const match = docket.match(/^(\d+:\d{2,4}-(?:cr|cv|mc|mj|md|bk|ap)-)0*(\d+)(?:-[a-z]{1,6})+$/)
  if (match) return `${match[1]}${match[2]}`
  const canonical = docket.match(/^(\d+:\d{2,4}-(?:cr|cv|mc|mj|md|bk|ap)-)0*(\d+)$/)
  return canonical ? `${canonical[1]}${canonical[2]}` : docket
}

function catalogRecordIdentity(record) {
  return `${record.resourceKind ?? 'pdf'}:${record.id ?? record.sourceUrl}`
}

function canonicalCatalogRank(item, compiled) {
  const record = item.record
  const document = compiled.bySourceUrl.get(record.sourceUrl)
  const source = document?.sources.find((candidate) => candidate.sourceUrl === record.sourceUrl)
  return (record.status === 'error' ? -100000 : 0)
    + (record.variantKey === 'source' ? 10000 : 0)
    + (record.sourceVerification?.primary ? 5000 : 0)
    + (record.sourceUrl === document?.canonicalSourceUrl ? 1000 : 0)
    + Number(source?.authority ?? 0)
}

function uniqueSearchMatches(group) {
  const matches = group
    .sort((left, right) => right.score - left.score)
    .flatMap((item) => item.record.searchMatches ?? [])
  const seen = new Set()
  return matches.filter((match) => {
    const key = [match.kind, match.pageNumber ?? '', match.snippet ?? ''].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 3)
}

function mergeLogicalSourceAlternatives(canonicalRecord, group, documents, compiled, language) {
  const alternatives = []
  const existingAlternatives = group.flatMap((item) => item.record.sourceAlternatives ?? [])
  const recordBySourceUrl = new Map(group.map((item) => [item.record.sourceUrl, item.record]))
  const canonicalDocument = compiled.bySourceUrl.get(canonicalRecord.sourceUrl)
  for (const document of documents) {
    for (const source of document.sources ?? []) {
      if (source.sourceUrl === canonicalRecord.sourceUrl) continue
      const record = recordBySourceUrl.get(source.sourceUrl)
      const byteIdentical = document.contentSha256 === canonicalDocument?.contentSha256
      const languageVariant = record?.variantKey && record.variantKey !== canonicalRecord.variantKey
      const displaySource = { ...source, sourceLabel: record?.sourceLabel ?? source.sourceLabel }
      alternatives.push({
        sourceId: source.sourceId,
        sourceLabel: displaySource.sourceLabel,
        sourceUrl: source.sourceUrl,
        sourcePage: source.sourcePage,
        kind: byteIdentical ? 'byte_identical_alternate' : languageVariant ? 'language_variant' : 'same_docket_alternative',
        equivalenceStatus: byteIdentical ? 'byte_identical' : languageVariant ? 'distinct_language_variant' : 'docket_coordinates_match_bytes_differ',
        localAvailable: record?.status !== 'error',
        sha256: document.contentSha256,
        label: logicalAlternativeLabel(displaySource, record, byteIdentical, languageVariant, language),
        note: logicalAlternativeNote(byteIdentical, languageVariant, language),
      })
    }
  }
  alternatives.push(...existingAlternatives)
  const seen = new Set()
  return alternatives.filter((alternative) => {
    if (!alternative?.sourceUrl || alternative.sourceUrl === canonicalRecord.sourceUrl || seen.has(alternative.sourceUrl)) return false
    seen.add(alternative.sourceUrl)
    return true
  }).sort(compareLogicalAlternatives)
}

function compareLogicalAlternatives(left, right) {
  const rank = (value) => {
    if (value.kind === 'language_variant') return 0
    if (String(value.sourceId).includes('pacer') || String(value.sourceId).includes('courtlistener')) return 1
    if (value.kind === 'same_docket_alternative') return 2
    if (value.kind === 'byte_identical_alternate') return 3
    return 4
  }
  return rank(left) - rank(right) || String(left.sourceLabel).localeCompare(String(right.sourceLabel))
}

function logicalAlternativeLabel(source, record, byteIdentical, languageVariant, language) {
  if (languageVariant) {
    const variant = record?.variantLabel || (language === 'en' ? 'Language variant' : '语言版本')
    return `${variant} · ${source.sourceLabel}`
  }
  if (byteIdentical) {
    return language === 'en'
      ? `Byte-identical copy · ${source.sourceLabel}`
      : `字节完全一致的副本 · ${source.sourceLabel}`
  }
  return language === 'en'
    ? `Same-filing public version · ${source.sourceLabel}`
    : `同一案卷文件的公开版本 · ${source.sourceLabel}`
}

function logicalAlternativeNote(byteIdentical, languageVariant, language) {
  if (languageVariant) {
    return language === 'en'
      ? 'This is a distinct language version retained under the same logical docket filing; it is not an additional court event.'
      : '这是归入同一逻辑案卷文件的不同语言版本，不代表另一次法院事件。'
  }
  if (byteIdentical) {
    return language === 'en'
      ? 'SHA-256 establishes byte-for-byte identity; this is retained as an alternative source, not a separate filing.'
      : 'SHA-256 已确认两份 PDF 逐字节一致；这是保留的替代来源，不是另一份案卷文件。'
  }
  return language === 'en'
    ? 'The docket coordinates match, but the PDF bytes differ; both versions remain available for verification.'
    : '案卷坐标一致，但 PDF 字节不同；两个版本都保留供核验。'
}

export async function refreshDocumentSearchIndex(manifest) {
  const signature = await documentSearchSignature(manifest)
  const index = await startIndexBuild(manifest, signature, true)
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
  return normalizeLegalMetadataText(value)
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
      resourceLimits: {
        maxOldGenerationSizeMb: 512,
        maxYoungGenerationSizeMb: 64,
        codeRangeSizeMb: 32,
        stackSizeMb: 4,
      },
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
  // A full install contains more than a gigabyte across these JSON caches.
  // Scan cache families in stages so their parsed PDF bodies do not overlap.
  const extractions = await scanJsonDirectory('pdf-text', async (value, cacheFile) => {
    const sha256 = value?.signature?.contentSha256 || value?.signature?.manifestSha256
    if (value?.cacheVersion !== pdfExtractionCacheVersion || !currentHashes.has(sha256) || value?.status !== 'extracted') return null
    return { sha256, entry: await indexedOriginal(value, cacheFile) }
  })
  const translations = await scanJsonDirectory('translations', async (value, cacheFile) => {
    const file = currentByUrl.get(value?.sourceUrl)
    const sha256 = value?.sourceSha256 || file?.sha256
    if (value?.schemaVersion !== translationCacheVersion || !file || file.sha256 !== sha256) return null
    if (!['translated', 'assistive_only', 'no_translation_needed'].includes(value?.status) || !translationPages(value).length) return null
    return { sha256, language: normalizedTargetLanguage(value.targetLanguage), entry: await indexedTranslation(value, cacheFile) }
  })
  const analyses = await scanJsonDirectory('document-ai', async (value, cacheFile) => {
    const file = currentByUrl.get(value?.sourceUrl)
    if (!file || value?.sourceSha256 !== file.sha256 || !value?.aiStatus?.generated) return null
    const language = documentAnalysisLanguage(value)
    if (!documentAnalysisQualityCurrent({ ...value, analysisLanguage: language })) return null
    const chunks = legalAnalysisChunks(value)
    if (!chunks.length) return null
    return { sha256: file.sha256, language, entry: await indexedAnalysis(value, cacheFile, chunks) }
  })

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
  const docketNumber = normalizeDocumentSearchText(record.docketNumber ?? '')
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
  const docExpression = exactDocumentNumberQuery(query)
  if (['all', 'analysis'].includes(scope) && docNumber && (normalizedQuery === docNumber || docExpression === docNumber)) {
    return metadataMatch(record, query, 'docket_number', 1400)
  }
  if (['all', 'analysis'].includes(scope) && docketNumber && normalizedQuery === docketNumber) return metadataMatch(record, query, 'docket_number', 1360)
  if (['all', 'analysis'].includes(scope) && caseId && normalizedQuery === caseId) return metadataMatch(record, query, 'docket_number', 1360)
  if (['all', 'analysis'].includes(scope) && title === normalizedQuery) return metadataMatch(record, query, 'title', 1240)
  if (['all', 'analysis'].includes(scope) && aliases.some((alias) => normalizeDocumentSearchText(alias) === normalizedQuery)) return metadataMatch(record, query, 'title', 1160)
  if (scope === 'web' && textMatchesQuery(web, query)) return metadataMatch(record, query, 'web_page', 680)
  if (['all', 'analysis'].includes(scope) && textMatchesQuery(analysis, query)) return metadataMatch(record, query, record.resourceKind === 'web_page' ? 'web_page' : 'legal_analysis', record.resourceKind === 'web_page' ? 650 : 430)
  if (['all', 'analysis'].includes(scope) && textMatchesQuery(direct, query)) {
    const score = scope === 'analysis' ? 390 : 1040
    return metadataMatch(record, query, record.resourceKind === 'web_page' ? 'web_page' : 'title', score)
  }
  return null
}

function metadataMatch(record, query, kind, score) {
  const originalTitle = String(record.originalTitle ?? '')
  const titleSnippet = originalTitle && textMatchesQuery(normalizeDocumentSearchText(originalTitle), query)
    ? originalTitle
    : record.title
  return {
    kind,
    score,
    pageNumber: null,
    snippet: kind === 'docket_number' ? record.title : kind === 'title' ? titleSnippet : record.summary || record.plainEnglish || record.title,
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
    generatedAt: value.generatedAt ?? value.aiStatus?.reviewedAt ?? null,
    charCount: chunks.reduce((total, chunk) => total + chunk.text.length, 0),
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
    || weight(candidate) === weight(current) && String(candidate?.generatedAt ?? '') > String(current?.generatedAt ?? '')
    || weight(candidate) === weight(current) && String(candidate?.generatedAt ?? '') === String(current?.generatedAt ?? '') && Number(candidate?.charCount ?? 0) > Number(current?.charCount ?? 0)
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
  const files = (manifest?.files ?? [])
    .map((file) => [file.url, file.sha256, file.status, file.path])
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
  // Cache files are written continuously during automation. Their directory
  // mtimes must not make every foreground search launch another full rebuild.
  // Automation calls refreshDocumentSearchIndex explicitly after its batch;
  // manifest changes still invalidate the index immediately.
  return createHash('sha256').update(JSON.stringify({ version: searchIndexVersion, files })).digest('hex')
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
  const values = await mapWithConcurrency(filenames, 2, async (filename) => {
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

export function compareDocumentCatalogRecords(left, right) {
  const leftCase = documentCatalogCaseGroup(left)
  const rightCase = documentCatalogCaseGroup(right)
  if (leftCase.familyRank !== rightCase.familyRank) return leftCase.familyRank - rightCase.familyRank
  if (leftCase.caseRank !== rightCase.caseRank) return leftCase.caseRank - rightCase.caseRank

  const caseOrder = leftCase.key.localeCompare(rightCase.key, 'en', { numeric: true, sensitivity: 'base' })
  if (caseOrder) return caseOrder

  const documentNumberOrder = compareCatalogDocumentNumbers(left.docNumber, right.docNumber)
  if (documentNumberOrder) return documentNumberOrder

  return String(left.categoryKey ?? left.category ?? '').localeCompare(String(right.categoryKey ?? right.category ?? ''), 'en', { sensitivity: 'base' })
    || String(left.title ?? '').localeCompare(String(right.title ?? ''), undefined, { numeric: true, sensitivity: 'base' })
    || String(left.docketNumber ?? '').localeCompare(String(right.docketNumber ?? ''), undefined, { numeric: true, sensitivity: 'base' })
    || String(left.caseId ?? '').localeCompare(String(right.caseId ?? ''), undefined, { numeric: true, sensitivity: 'base' })
    || String(left.sourceUrl ?? '').localeCompare(String(right.sourceUrl ?? ''))
}

function documentCatalogCaseGroup(record) {
  const caseId = String(record.caseId ?? '').trim().toLowerCase()
  const docket = normalizeDocketCoordinate(record.docketNumber)
  const key = docket || caseId || `source:${String(record.sourceId ?? record.sourceUrl ?? '').trim().toLowerCase()}`

  if (record.resourceKind === 'web_page') return { familyRank: 6, caseRank: 0, key }

  if (caseId === primaryCriminalCaseId || docket === primaryCriminalDocket) {
    return { familyRank: 0, caseRank: 0, key: primaryCriminalDocket }
  }

  if (relatedCriminalCaseOrder.has(caseId)) {
    return { familyRank: 1, caseRank: relatedCriminalCaseOrder.get(caseId), key }
  }

  if (/(?:^|-)cr-|(?:^|-)mj-/.test(docket) || /(?:^|-)cr(?:iminal)?(?:-|$)/.test(caseId)) {
    return { familyRank: 2, caseRank: 0, key }
  }

  if (caseId === 'sdny-23-cv-2200' || caseId.startsWith('sec-') || record.categoryKey === 'Civil Enforcement' || record.categoryKey === 'Fair Fund') {
    return { familyRank: 3, caseRank: caseId === 'sdny-23-cv-2200' ? 0 : 1, key }
  }

  if (isBankruptcyCatalogRecord(record, caseId)) {
    const bankruptcyCaseOrder = caseId === 'dconn-22-50073'
      ? 0
      : caseId === 'ca2-24-2504'
        ? 1
        : caseId === 'scotus-26-194'
          ? 2
          : 3
    return { familyRank: 4, caseRank: bankruptcyCaseOrder, key }
  }

  if (docket || caseId) return { familyRank: 5, caseRank: 0, key }
  return { familyRank: 6, caseRank: 0, key }
}

function isBankruptcyCatalogRecord(record, caseId) {
  const docket = String(record.docketNumber ?? '').trim().toLowerCase()
  return caseId.startsWith('bkd-')
    || caseId.startsWith('discovered-ctb-')
    || caseId.startsWith('discovered-nysb-')
    || caseId === 'dconn-22-50073'
    || caseId === 'ca2-24-2504'
    || caseId === 'scotus-26-194'
    || caseId.startsWith('dconn-26-')
    || /(?:^|-)bk-/.test(docket)
    || ['Bankruptcy', 'Bankruptcy Appeal'].includes(record.categoryKey)
}

function compareCatalogDocumentNumbers(left, right) {
  const leftText = String(left ?? '').trim()
  const rightText = String(right ?? '').trim()
  if (!leftText || !rightText) return leftText ? -1 : rightText ? 1 : 0

  const leftIsNumeric = docketNumberParts(leftText).length > 0
  const rightIsNumeric = docketNumberParts(rightText).length > 0
  if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1
  if (leftIsNumeric) return compareDocketNumbers(rightText, leftText)
  return leftText.localeCompare(rightText, undefined, { numeric: true, sensitivity: 'base' })
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
