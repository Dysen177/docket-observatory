import { gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { publicRecordAliasGroupsForQuery } from './knowledge-dossiers.js'

const gunzipAsync = promisify(gunzip)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const transcriptRoot = path.resolve(process.env.GUO_INTEL_TRANSCRIPT_DIR ?? path.join(__dirname, 'public-record-transcripts'))
const manifestPath = path.join(transcriptRoot, 'manifest.json')
const searchShardCache = new Map()
const dataShardCache = new Map()
const translationSearchShardCache = new Map()
const translationDataShardCache = new Map()
const maxCachedShards = 1
let manifestPromise = null
const translationManifestPromises = new Map()

const aliasGroups = [
  ['喜联储', '喜聯儲', '洗联储', '洗聯儲', '喜马拉雅交易所', '喜馬拉雅交易所', 'himalaya exchange', 'himalaya reserve'],
  ['喜币', '喜幣', '洗币', '洗幣', 'h币', 'h幣', 'h coin', 'h-coin', 'hcoin'],
  ['喜美元', '洗美元', 'h美元', 'h dollar', 'h-dollar', 'hdollar'],
  ['新中国联邦', 'nfsc', 'new federal state of china'],
  ['g系列', 'g-tv', 'gtv', 'gclub', 'g fashion', 'gnews', 'g news'],
]

export async function queryPublicRecordTranscripts(query = {}, language = 'zh') {
  const manifest = await loadTranscriptManifest()
  const translationManifest = await loadTranscriptTranslationManifest(language)
  const translationMetadataById = new Map((translationManifest.records ?? []).map((record) => [record.id, record]))
  const q = scalar(query.q).trim().slice(0, 240)
  const year = scalar(query.year).trim()
  const sort = normalizeTranscriptSort(query.sort, Boolean(q))
  const limit = integer(query.limit, 30, 1, 80)
  const offset = integer(query.offset, 0, 0, Number.MAX_SAFE_INTEGER)
  const context = integer(query.context, 1, 0, 3)
  const terms = expandedSearchTerms(q)
  const candidateMetadata = (manifest.records ?? []).filter((record) => !year || year === 'all' || record.date.startsWith(`${year}-`))
  const candidateMetadataById = new Map(candidateMetadata.map((record) => [record.id, record]))
  const matchesById = new Map()
  const addMatch = (record) => {
    const current = matchesById.get(record.id)
    if (!current) {
      matchesById.set(record.id, record)
      return
    }
    if (language === 'en') {
      if (current.language === 'en' && record.language !== 'en') return
      if (current.language !== 'en' && record.language === 'en') {
        matchesById.set(record.id, record)
        return
      }
    }
    if (Number(record.score ?? 0) > Number(current.score ?? 0)) matchesById.set(record.id, record)
  }
  let matches = q ? [] : candidateMetadata.map((record) => compactMetadataRecord(record))

  if (q) {
    if (translationManifest.records?.length) {
      const translationCandidates = translationManifest.records
        .filter((record) => candidateMetadataById.has(record.id) && record.status !== 'missing' && record.searchShard)
      const metadataBySearchShard = Map.groupBy(translationCandidates, (record) => record.searchShard)
      for (const [searchShard, shardMetadata] of [...metadataBySearchShard.entries()].sort(([left], [right]) => left.localeCompare(right))) {
        const searchBuffer = await loadTranslationBinaryShard(searchShard, language)
        const matchedTranslationMetadata = shardMetadata.filter((record) => metadataMatchesTerms(record, searchBuffer, terms))
        const metadataByDataShard = Map.groupBy(matchedTranslationMetadata, (record) => record.dataShard)
        for (const [dataShard, dataMetadata] of metadataByDataShard.entries()) {
          const dataRecords = await loadTranslationDataShard(dataShard, language)
          const translationsById = new Map(dataRecords.map((record) => [record.id, record]))
          for (const metadata of dataMetadata) {
            const base = candidateMetadataById.get(metadata.id)
            const translation = translationsById.get(metadata.id)
            if (!base || !translation) continue
            const result = matchTranscript(applyEnglishTranslation(base, translation, metadata), terms, q, context)
            if (result) addMatch(result)
          }
        }
      }
    }

    const metadataBySearchShard = Map.groupBy(candidateMetadata.filter((record) => record.transcriptStatus === 'available' && record.searchShard), (record) => record.searchShard)
    for (const [searchShard, shardMetadata] of [...metadataBySearchShard.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      const searchBuffer = await loadBinaryShard(searchShard, 'search')
      const matchedMetadata = shardMetadata.filter((record) => metadataMatchesTerms(record, searchBuffer, terms))
      const metadataByDataShard = Map.groupBy(matchedMetadata, (record) => record.dataShard)
      for (const [dataShard, dataMetadata] of metadataByDataShard.entries()) {
        const dataRecords = await loadDataShard(dataShard)
        const recordsById = new Map(dataRecords.map((record) => [record.id, record]))
        for (const metadata of dataMetadata) {
          if (matchesById.has(metadata.id)) continue
          const record = recordsById.get(metadata.id)
          if (!record) continue
          const result = matchTranscript(record, terms, q, context)
          if (result) addMatch(result)
        }
      }
    }
    for (const metadata of candidateMetadata.filter((record) => record.transcriptStatus !== 'available')) {
      if (!metadataMatchesQuery(metadata, terms)) continue
      addMatch({ ...compactMetadataRecord(metadata), titleMatched: true, score: 10 })
    }
    matches = [...matchesById.values()]
  }

  matches.sort((left, right) => {
    if (q && sort === 'relevance' && right.score !== left.score) return right.score - left.score
    const dateOrder = sort === 'oldest' ? left.date.localeCompare(right.date) : right.date.localeCompare(left.date)
    if (dateOrder) return dateOrder
    if (q && right.score !== left.score) return right.score - left.score
    return left.id.localeCompare(right.id)
  })

  const page = matches.slice(offset, offset + limit)
  const displayTranslationsById = await loadDisplayTranslationRecords(page, language, translationMetadataById)

  return {
    coverage: publicCoverage(manifest),
    filters: { q, year: year || 'all', sort },
    search: {
      terms: terms.map((term) => term.value),
      aliasExpanded: terms.some((term) => term.reason === 'alias'),
      searchedOriginalTranscriptLanguage: true,
    },
    total: matches.length,
    offset,
    limit,
    hasMore: offset + limit < matches.length,
    records: page.map((record) => localizeSearchResult(record, language, translationMetadataById, displayTranslationsById)),
  }
}

async function loadDisplayTranslationRecords(records, language, translationMetadataById) {
  if (language !== 'en') return new Map()
  const requiredIds = new Set(records
    .filter((record) => record.language !== 'en' && record.hits?.length)
    .map((record) => record.id))
  if (!requiredIds.size) return new Map()
  const metadata = [...requiredIds]
    .map((id) => translationMetadataById.get(id))
    .filter((record) => record?.status !== 'missing' && record?.dataShard)
  const translations = new Map()
  for (const [dataShard, shardMetadata] of Map.groupBy(metadata, (record) => record.dataShard)) {
    const shardIds = new Set(shardMetadata.map((record) => record.id))
    for (const record of await loadTranslationDataShard(dataShard, language)) {
      if (shardIds.has(record.id)) translations.set(record.id, record)
    }
  }
  return translations
}

export async function getPublicRecordCorpusSummary(language = 'en') {
  const [manifest, translationManifest] = await Promise.all([
    loadTranscriptManifest(),
    loadTranscriptTranslationManifest(language),
  ])
  return {
    transcriptManifest: {
      coverage: manifest.coverage ?? {},
      recordCount: Array.isArray(manifest.records) ? manifest.records.length : 0,
    },
    translationManifest: {
      coverage: translationManifest.coverage ?? {},
      recordCount: Array.isArray(translationManifest.records) ? translationManifest.records.length : 0,
    },
  }
}

export async function getPublicRecordTranscript(id, language = 'zh') {
  const manifest = await loadTranscriptManifest()
  const metadata = (manifest.records ?? []).find((record) => record.id === id && record.transcriptStatus === 'available')
  if (!metadata?.dataShard) return null
  const record = (await loadDataShard(metadata.dataShard)).find((item) => item.id === id)
  if (!record) return null
  const translationMetadata = await loadTranscriptTranslationMetadata(id, language)
  const translated = translationMetadata
    ? (await loadTranslationDataShard(translationMetadata.dataShard, language)).find((item) => item.id === id)
    : null
  return localizeTranscript(translated ? applyEnglishTranslation(record, translated, translationMetadata) : record, language)
}

export async function retrieveTranscriptEvidence(query, options = {}) {
  const payload = await queryPublicRecordTranscripts({
    q: query,
    year: options.year ?? 'all',
    sort: options.sort ?? 'relevance',
    limit: Math.max(4, Math.min(24, Number(options.limit) || 12)),
    context: 1,
  }, options.language ?? 'zh')
  const citations = []
  const maxCitations = Number(options.citationLimit) || 14
  const records = options.diversifyYears ? yearDiverseRecords(payload.records) : payload.records
  // Give the model the best passage from several independent records before
  // adding a second passage from any one record. This preserves source breadth
  // and prevents a weak secondary hit from displacing a stronger co-occurrence.
  for (let hitIndex = 0; hitIndex < 2; hitIndex += 1) {
    for (const record of records) {
      const hit = record.hits[hitIndex]
      if (!hit) continue
      const citation = {
        transcriptId: record.id,
        date: record.date,
        title: record.title,
        start: hit.start,
        end: hit.end,
        text: hit.text,
        contextBefore: hit.contextBefore,
        contextAfter: hit.contextAfter,
        originalUrl: record.originalLinks[0]?.url ?? null,
        matchReason: hit.matchReason,
      }
      if (citations.some((existing) => equivalentCitation(existing, citation))) continue
      citations.push(citation)
      if (citations.length >= maxCitations) break
    }
    if (citations.length >= maxCitations) break
  }
  return { coverage: payload.coverage, totalRecords: payload.total, citations }
}

function yearDiverseRecords(records) {
  const firstByYear = []
  const remaining = []
  const recordsByYear = new Map()
  for (const record of records ?? []) {
    const year = String(record.date ?? '').slice(0, 4)
    if (!/^\d{4}$/u.test(year)) {
      remaining.push(record)
      continue
    }
    if (!recordsByYear.has(year)) recordsByYear.set(year, [])
    recordsByYear.get(year).push(record)
  }
  for (const group of recordsByYear.values()) {
    const ranked = [...group].sort((left, right) => transcriptEvidenceQuality(right) - transcriptEvidenceQuality(left))
    firstByYear.push(ranked[0])
    remaining.push(...ranked.slice(1))
  }
  return [...firstByYear, ...remaining]
}

function transcriptEvidenceQuality(record) {
  const hit = record?.hits?.[0]
  const textLength = String(hit?.text ?? '').trim().length
  const contextLength = [...(hit?.contextBefore ?? []), ...(hit?.contextAfter ?? [])]
    .reduce((total, segment) => total + String(segment?.text ?? '').trim().length, 0)
  return Math.min(900, textLength * 4)
    + Math.min(400, contextLength)
    + (hit?.matchReason === 'exact' ? 120 : 0)
    + Math.min(80, Number(record?.hits?.length ?? 0) * 10)
}

export function resetTranscriptCachesForTests() {
  manifestPromise = null
  translationManifestPromises.clear()
  searchShardCache.clear()
  dataShardCache.clear()
  translationSearchShardCache.clear()
  translationDataShardCache.clear()
}

async function loadTranscriptManifest() {
  if (!manifestPromise) {
    manifestPromise = readFile(manifestPath, 'utf8')
      .then((content) => validateManifest(JSON.parse(content)))
      .catch((error) => {
        if (error?.code === 'ENOENT') return emptyManifest()
        manifestPromise = null
        throw error
      })
  }
  return manifestPromise
}

async function loadBinaryShard(filename, kind) {
  if (kind !== 'search' || !/^(?:2017|2018|2019|2020|2021|2022|2023)\.search\.bin$/u.test(filename)) {
    throw new Error('Transcript shard name is invalid.')
  }
  const cache = searchShardCache
  if (cache.has(filename)) {
    const cached = cache.get(filename)
    cache.delete(filename)
    cache.set(filename, cached)
    return cached
  }
  const buffer = await readFile(path.join(transcriptRoot, filename))
  cache.set(filename, buffer)
  while (cache.size > maxCachedShards) cache.delete(cache.keys().next().value)
  return buffer
}

async function loadDataShard(filename) {
  if (!/^(?:2017|2018|2019|2020|2021|2022|2023)\.json\.gz$/u.test(filename)) throw new Error('Transcript data shard name is invalid.')
  if (dataShardCache.has(filename)) {
    const cached = dataShardCache.get(filename)
    dataShardCache.delete(filename)
    dataShardCache.set(filename, cached)
    return cached
  }
  const compressed = await readFile(path.join(transcriptRoot, filename))
  const records = JSON.parse((await gunzipAsync(compressed)).toString('utf8'))
  if (!Array.isArray(records)) throw new Error(`Transcript data shard ${filename} is invalid.`)
  dataShardCache.set(filename, records)
  while (dataShardCache.size > maxCachedShards) dataShardCache.delete(dataShardCache.keys().next().value)
  return records
}

async function loadTranscriptTranslationManifest(language) {
  if (language !== 'en') return emptyTranslationManifest(language)
  if (!translationManifestPromises.has(language)) {
    const promise = readFile(path.join(transcriptRoot, language, 'manifest.json'), 'utf8')
      .then((content) => validateTranslationManifest(JSON.parse(content), language))
      .catch((error) => {
        if (error?.code === 'ENOENT') return emptyTranslationManifest(language)
        translationManifestPromises.delete(language)
        throw error
      })
    translationManifestPromises.set(language, promise)
  }
  return translationManifestPromises.get(language)
}

async function loadTranscriptTranslationMetadata(id, language) {
  const manifest = await loadTranscriptTranslationManifest(language)
  return (manifest.records ?? []).find((record) => record.id === id && record.dataShard) ?? null
}

async function loadTranslationBinaryShard(filename, language) {
  if (language !== 'en' || !/^(?:2017|2018|2019|2020|2021|2022|2023)\.search\.bin$/u.test(filename)) {
    throw new Error('Transcript translation search-shard name is invalid.')
  }
  const key = `${language}/${filename}`
  if (translationSearchShardCache.has(key)) {
    const cached = translationSearchShardCache.get(key)
    translationSearchShardCache.delete(key)
    translationSearchShardCache.set(key, cached)
    return cached
  }
  const buffer = await readFile(path.join(transcriptRoot, language, filename))
  translationSearchShardCache.set(key, buffer)
  while (translationSearchShardCache.size > maxCachedShards) translationSearchShardCache.delete(translationSearchShardCache.keys().next().value)
  return buffer
}

async function loadTranslationDataShard(filename, language) {
  if (language !== 'en' || !/^(?:2017|2018|2019|2020|2021|2022|2023)\.json\.gz$/u.test(filename)) {
    throw new Error('Transcript translation data-shard name is invalid.')
  }
  const key = `${language}/${filename}`
  if (translationDataShardCache.has(key)) {
    const cached = translationDataShardCache.get(key)
    translationDataShardCache.delete(key)
    translationDataShardCache.set(key, cached)
    return cached
  }
  const compressed = await readFile(path.join(transcriptRoot, language, filename))
  const records = JSON.parse((await gunzipAsync(compressed)).toString('utf8'))
  if (!Array.isArray(records)) throw new Error(`Transcript translation data shard ${filename} is invalid.`)
  translationDataShardCache.set(key, records)
  while (translationDataShardCache.size > maxCachedShards) translationDataShardCache.delete(translationDataShardCache.keys().next().value)
  return records
}

function metadataMatchesTerms(record, buffer, terms) {
  const start = Number(record.searchOffset)
  const length = Number(record.searchLength)
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 || length < 0 || start + length > buffer.length) return false
  const document = buffer.subarray(start, start + length)
  return terms.some((term) => {
    const needle = Buffer.from(term.normalized, 'utf8')
    return document.indexOf(needle) >= 0
  })
}

function metadataMatchesQuery(record, terms) {
  const metadata = normalizeSearchText([
    record.title,
    record.date,
    ...(record.originalLinks ?? []).flatMap((link) => [link.platform, link.url]),
  ].filter(Boolean).join(' '))
  return terms.some((term) => metadata.includes(term.normalized))
}


function matchTranscript(record, terms, rawQuery, contextRadius) {
  if (!rawQuery) return compactTranscriptRecord(record, [], 0)
  const normalizedTitle = normalizeSearchText(record.title)
  const normalizedSegments = record.segments.map((segment) => normalizeSearchText(segment.text))
  const exactSubjectTerms = independentExactTerms(terms, rawQuery)
  const candidates = []
  for (const index of record.segments.keys()) {
    const normalized = normalizedSegments[index]
    const matched = bestMatchingTerm(normalized, terms)
    if (!matched) continue
    const start = Math.max(0, index - contextRadius)
    const end = Math.min(record.segments.length, index + contextRadius + 1)
    const localText = normalizedSegments.slice(start, end).join(' ')
    const localExactMatches = exactSubjectTerms.filter((term) => localText.includes(term.normalized))
    const localSegments = record.segments.slice(start, end)
    const mentionedNames = extractMentionedNames(localSegments.map((item) => item.text).join(' '), matched.value)
    candidates.push({
      index,
      contextStart: start,
      contextEnd: end,
      localExactMatchCount: localExactMatches.length,
      matchesAllExactSubjects: exactSubjectTerms.length > 1 && localExactMatches.length === exactSubjectTerms.length,
      matchSpecificity: matched.normalized.length,
      nameSpecificity: mentionedNames.reduce((value, name) => Math.max(value, normalizeSearchText(name).length), 0),
      mentionedNames,
      matched,
    })
  }
  candidates.sort(compareTranscriptHitCandidates)
  const hits = candidates.slice(0, 8).map((candidate) => {
    const segment = record.segments[candidate.index]
    return {
      segmentIndex: candidate.index,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      contextBefore: record.segments.slice(candidate.contextStart, candidate.index).map(publicSegment),
      contextAfter: record.segments.slice(candidate.index + 1, candidate.contextEnd).map(publicSegment),
      matchReason: candidate.matched.reason,
      matchedTerm: candidate.matched.value,
      mentionedNames: candidate.mentionedNames,
    }
  })
  const titleMatch = bestMatchingTerm(normalizedTitle, terms)
  if (!hits.length && !titleMatch) return null
  const topCandidate = candidates[0]
  const score = topCandidate
    ? (topCandidate.matchesAllExactSubjects ? 50_000 : 0)
      + topCandidate.localExactMatchCount * 10_000
      + (topCandidate.matched.reason === 'exact' ? 1_000 : 0)
      + Math.min(500, topCandidate.nameSpecificity * 10 + topCandidate.matchSpecificity)
      + Math.min(99, candidates.length)
      + (titleMatch ? titleMatch.reason === 'exact' ? 20 : 12 : 0)
    : titleMatch?.reason === 'exact' ? 20 : 12
  return compactTranscriptRecord(record, hits, score, Boolean(titleMatch))
}

function compareTranscriptHitCandidates(left, right) {
  return Number(right.matchesAllExactSubjects) - Number(left.matchesAllExactSubjects)
    || right.localExactMatchCount - left.localExactMatchCount
    || Number(right.matched.reason === 'exact') - Number(left.matched.reason === 'exact')
    || right.nameSpecificity - left.nameSpecificity
    || right.matchSpecificity - left.matchSpecificity
    || Number(left.index) - Number(right.index)
}

function independentExactTerms(terms, rawQuery) {
  const normalizedQuery = normalizeSearchText(rawQuery)
  const lexical = terms.filter((term) => term.reason === 'exact' && term.normalized !== normalizedQuery)
  const candidates = lexical.length ? lexical : terms.filter((term) => term.reason === 'exact')
  return candidates.filter((term, index, values) => values.findIndex((item) => item.normalized === term.normalized) === index)
}

function bestMatchingTerm(haystack, terms) {
  return terms.find((term) => haystack.includes(term.normalized)) ?? null
}

function expandedSearchTerms(query) {
  const exact = normalizeSearchText(query)
  if (!exact) return []
  const terms = [{ value: query, normalized: exact, reason: 'exact' }]
  for (const lexical of lexicalSearchTerms(query)) {
    const normalized = normalizeSearchText(lexical)
    if (normalized.length >= 2 && !terms.some((term) => term.normalized === normalized)) {
      terms.push({ value: lexical, normalized, reason: 'exact' })
    }
  }
  for (const group of [...aliasGroups, ...publicRecordAliasGroupsForQuery(query)]) {
    const normalizedGroup = group.map(normalizeSearchText)
    if (!normalizedGroup.some((alias) => exact.includes(alias) || alias.includes(exact))) continue
    for (const alias of group) {
      const normalized = normalizeSearchText(alias)
      if (!terms.some((term) => term.normalized === normalized)) terms.push({ value: alias, normalized, reason: 'alias' })
    }
  }
  return terms.sort((left, right) => (left.reason === right.reason ? right.normalized.length - left.normalized.length : left.reason === 'exact' ? -1 : 1))
}

function lexicalSearchTerms(query) {
  const quoted = [...String(query).matchAll(/[“”"']([^“”"']{2,80})[“”"']/gu)].map((match) => match[1])
  const latinStopWords = new Set(['a', 'about', 'all', 'and', 'are', 'broadcast', 'broadcasts', 'change', 'did', 'do', 'earliest', 'find', 'first', 'for', 'how', 'in', 'is', 'last', 'latest', 'mention', 'mentions', 'of', 'on', 'one', 'public', 'said', 'say', 'statements', 'the', 'time', 'timeline', 'to', 'videos', 'was', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'with'])
  const latinTokens = (String(query).match(/[a-z0-9][a-z0-9._-]*/giu) ?? []).filter((token) => token.length >= 2 && !latinStopWords.has(token.toLowerCase()))
  const latin = latinTokens.length ? [latinTokens.join(' ')] : []
  const cjkWithoutQuestionWords = String(query)
    .replace(/郭文贵|哪些|哪一|直播|视频|公开言论|文字|里面|当中|谈到|提到|怎么说|说了什么|说过|说的|谈论|是什么|如何|怎么|为什么|请|帮我|查找|搜索|关于|相关|梳理|时间线|按时间|按日期|变化|观点|看法|情况|陈述|说法|发言|原文|内容|代表性|是否|有没有|分别|所有|最早|最晚|最后|最近|何时|时候|首次|第一次|计划/gu, ' ')
    .replace(/是不是|是/gu, ' ')
    .replace(/[的了呢吗]/gu, ' ')
  const cjk = cjkWithoutQuestionWords.match(/[\p{Script=Han}]{2,24}/gu) ?? []
  return [...new Set([...quoted, ...latin, ...cjk])]
}

function extractMentionedNames(value, matchedTerm = '') {
  const text = String(value ?? '').normalize('NFKC')
  if (!text) return []
  const names = []
  const add = (name) => {
    const cleaned = String(name ?? '').replace(/\s+/gu, ' ').trim()
    if (cleaned.length >= 2 && !names.some((item) => normalizeSearchText(item) === normalizeSearchText(cleaned))) names.push(cleaned)
  }
  const patterns = [
    /(?:John|Henry\s+Sturgis|J\.?\s*P\.?)\s+Morgan\b/giu,
    /\bMorgan\s+Stanley\b/giu,
    /约翰[·・]?摩根|摩根先生|摩根夫人|摩根家族|摩根大通|摩根斯坦利|摩根银行/gu,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) add(match[0])
  }
  const subject = String(matchedTerm ?? '').trim()
  if (!names.length && subject.length >= 2 && text.includes(subject)) add(subject)
  return names.slice(0, 6)
}

function normalizeTranscriptSort(value, hasQuery) {
  const sort = scalar(value)
  if (sort === 'oldest' || sort === 'newest') return sort
  return hasQuery ? 'relevance' : 'newest'
}

function equivalentCitation(left, right) {
  if (left.transcriptId !== right.transcriptId) return false
  const leftText = normalizeSearchText(left.text)
  const rightText = normalizeSearchText(right.text)
  if (!leftText || !rightText) return false
  if (leftText === rightText) return true
  if (left.date !== right.date || Math.abs(Number(left.start) - Number(right.start)) > 15) return false
  const shorter = leftText.length <= rightText.length ? leftText : rightText
  const longer = shorter === leftText ? rightText : leftText
  return shorter.length >= 18 && longer.includes(shorter)
}

function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, '')
}

function publicCoverage(manifest) {
  const availableRecords = (manifest.records ?? []).filter((record) => record.transcriptStatus === 'available')
  const classified = availableRecords.map(classifyTranscriptRecord)
  return {
    start: manifest.coverage?.start ?? '2017-01-26',
    end: manifest.coverage?.end ?? '2023-03-14',
    catalogRecords: manifest.coverage?.catalogRecords ?? 0,
    availableTranscripts: manifest.coverage?.availableTranscripts ?? 0,
    missingTranscripts: manifest.coverage?.missingTranscripts ?? 0,
    catalogMissingTranscripts: manifest.coverage?.catalogMissingTranscripts ?? 0,
    emptyTranscripts: manifest.coverage?.emptyTranscripts ?? 0,
    linkedEquivalentTranscripts: manifest.coverage?.linkedEquivalentTranscripts ?? 0,
    matchedPublicRecords: manifest.coverage?.matchedPublicRecords ?? 0,
    transcriptsWithExternalLinks: manifest.coverage?.transcriptsWithExternalLinks ?? 0,
    duplicateTranscriptGroups: manifest.coverage?.duplicateTranscriptGroups ?? 0,
    fullBroadcasts: classified.filter((record) => record.recordKind === 'full_broadcast').length,
    excerptsAndShortVideos: classified.filter((record) => ['broadcast_excerpt', 'short_video'].includes(record.recordKind)).length,
    publicPostRecords: classified.filter((record) => record.recordKind === 'public_post').length,
    suspiciouslyShort: classified.filter((record) => record.durationQuality === 'suspiciously_short').length,
    possiblyIncomplete: classified.filter((record) => record.transcriptQuality === 'possibly_incomplete').length,
    unknownKinds: classified.filter((record) => record.recordKind === 'unknown').length,
    generatedAt: manifest.generatedAt ?? null,
  }
}

function localizeSearchResult(record, language, translationMetadataById = new Map(), displayTranslationsById = new Map()) {
  const classification = classifyTranscriptRecord(record)
  const translationMetadata = language === 'en' ? translationMetadataById.get(record.id) : null
  return {
    id: record.id,
    date: record.date,
    title: translationMetadata?.title ?? record.title,
    durationSec: record.durationSec,
    language: translationMetadata ? 'en' : record.language,
    sourceLanguage: translationMetadata ? record.language : undefined,
    translationStatus: translationMetadata?.status ?? (language === 'en' ? 'missing' : undefined),
    translationProvider: translationMetadata?.provider,
    translationModel: translationMetadata?.model,
    transcriptStatus: record.transcriptStatus,
    matchedPublicRecordId: record.matchedPublicRecordId,
    originalLinks: record.originalLinks,
    transcriptSourceLinks: record.transcriptSourceLinks ?? [],
    segmentCount: translationMetadata?.segmentCount ?? record.segmentCount,
    charCount: translationMetadata?.charCount ?? record.charCount,
    hits: localizeTranscriptHits(record.hits ?? [], language, displayTranslationsById.get(record.id)),
    titleMatched: Boolean(record.titleMatched),
    score: record.score,
    ...classification,
    classificationNote: record.transcriptStatus === 'available'
      ? classificationNote(classification, language)
      : language === 'en' ? 'Source link; transcript unavailable' : '有来源链接；暂无文字',
    coverageNote: transcriptCoverageNote(classification, language),
    transcriptBoundaryVerified: Boolean(record.transcriptBoundaryVerified),
    transcriptSourceType: record.transcriptSourceType ?? null,
    transcriptTimecoded: typeof record.transcriptTimecoded === 'boolean' ? record.transcriptTimecoded : transcriptIsTimecoded(record),
    contentNote: record.transcriptStatus === 'available'
      ? transcriptContentNote(record, language)
      : language === 'en'
        ? 'The external source link is retained, but no usable transcript is currently available. Public content is not a judicial finding.'
        : '外部来源链接已保留，当前没有可用文字；公开内容不等于法院认定。',
  }
}

function localizeTranscriptHits(hits, language, translationRecord) {
  if (language !== 'en') return hits
  const translatedSegments = Array.isArray(translationRecord?.segments) ? translationRecord.segments : []
  return hits.map((hit) => {
    const segmentIndex = Number(hit.segmentIndex)
    const translated = Number.isInteger(segmentIndex) ? translatedSegments[segmentIndex] : null
    const contextStart = Number.isInteger(segmentIndex) ? segmentIndex - (hit.contextBefore?.length ?? 0) : -1
    return {
      ...hit,
      text: String(translated?.text ?? hit.text),
      contextBefore: (hit.contextBefore ?? []).map((segment, index) => translatedPublicSegment(translatedSegments[contextStart + index], segment)),
      contextAfter: (hit.contextAfter ?? []).map((segment, index) => translatedPublicSegment(translatedSegments[segmentIndex + index + 1], segment)),
      mentionedNames: (hit.mentionedNames ?? []).map(localizeMentionedName),
    }
  })
}

function translatedPublicSegment(translated, fallback) {
  return {
    start: Number.isFinite(Number(translated?.start)) ? Number(translated.start) : fallback.start,
    end: Number.isFinite(Number(translated?.end)) ? Number(translated.end) : fallback.end,
    text: String(translated?.text ?? fallback.text),
  }
}

function localizeMentionedName(name) {
  const labels = {
    '摩根': 'Morgan',
    '摩根家族': 'Morgan family',
    '摩根先生': 'Mr. Morgan',
    '摩根夫人': 'Mrs. Morgan',
    '约翰摩根': 'John Morgan',
    '约翰·摩根': 'John Morgan',
    '摩根大通': 'JPMorgan',
    '摩根斯坦利': 'Morgan Stanley',
    '摩根银行': 'Morgan bank',
  }
  return labels[name] ?? name
}

function compactMetadataRecord(record) {
  return {
    id: record.id,
    date: record.date,
    title: record.title,
    durationSec: record.durationSec,
    language: record.language,
    transcriptStatus: record.transcriptStatus,
    matchedPublicRecordId: record.matchedPublicRecordId,
    originalLinks: record.originalLinks ?? [],
    transcriptSourceLinks: record.transcriptSourceLinks ?? [],
    segmentCount: record.segmentCount ?? 0,
    charCount: record.charCount ?? 0,
    hits: [],
    titleMatched: false,
    score: 0,
    recordKind: record.recordKind,
    durationQuality: record.durationQuality,
    transcriptQuality: record.transcriptQuality,
    transcriptQualityReasons: record.transcriptQualityReasons,
    transcriptStartSec: record.transcriptStartSec,
    transcriptEndSec: record.transcriptEndSec,
    transcriptSpanRatio: record.transcriptSpanRatio,
    transcriptBoundaryVerified: Boolean(record.transcriptBoundaryVerified),
    transcriptSourceType: record.transcriptSourceType ?? null,
    transcriptTimecoded: transcriptIsTimecoded(record),
  }
}

function compactTranscriptRecord(record, hits, score, titleMatched = false) {
  return {
    id: record.id,
    date: record.date,
    title: record.title,
    durationSec: record.durationSec,
    language: record.language,
    transcriptStatus: record.transcriptStatus,
    matchedPublicRecordId: record.matchedPublicRecordId,
    originalLinks: record.originalLinks ?? [],
    transcriptSourceLinks: record.transcriptSourceLinks ?? [],
    segmentCount: record.segments.length,
    charCount: record.charCount,
    hits,
    titleMatched,
    score,
    recordKind: record.recordKind,
    durationQuality: record.durationQuality,
    transcriptQuality: record.transcriptQuality,
    transcriptQualityReasons: record.transcriptQualityReasons,
    transcriptStartSec: record.transcriptStartSec,
    transcriptEndSec: record.transcriptEndSec,
    transcriptSpanRatio: record.transcriptSpanRatio,
    transcriptBoundaryVerified: Boolean(record.transcriptBoundaryVerified),
    transcriptSourceType: record.transcriptSourceType ?? null,
    transcriptTimecoded: transcriptIsTimecoded(record),
  }
}

function localizeTranscript(record, language) {
  const classification = classifyTranscriptRecord(record)
  return {
    id: record.id,
    date: record.date,
    title: record.title,
    durationSec: record.durationSec,
    language: record.language,
    sourceLanguage: record.sourceLanguage,
    translationStatus: record.translationStatus,
    translationProvider: record.translationProvider,
    translationModel: record.translationModel,
    transcriptStatus: record.transcriptStatus,
    completeness: record.completeness,
    matchedPublicRecordId: record.matchedPublicRecordId,
    originalLinks: record.originalLinks,
    transcriptSourceLinks: record.transcriptSourceLinks ?? [],
    segmentCount: record.segments.length,
    charCount: record.charCount,
    contentSha256: record.contentSha256,
    segments: record.segments.map(publicSegment),
    ...classification,
    classificationNote: classificationNote(classification, language),
    coverageNote: transcriptCoverageNote(classification, language),
    transcriptBoundaryVerified: Boolean(record.transcriptBoundaryVerified),
    transcriptSourceType: record.transcriptSourceType ?? null,
    transcriptTimecoded: transcriptIsTimecoded(record),
    contentNote: transcriptContentNote(record, language),
  }
}

function applyEnglishTranslation(baseRecord, translationRecord, translationMetadata = {}) {
  const translatedSegments = Array.isArray(translationRecord?.segments) ? translationRecord.segments : []
  if (!translatedSegments.length) return baseRecord
  return {
    ...baseRecord,
    title: translationRecord.title || translationMetadata.title || baseRecord.title,
    language: 'en',
    sourceLanguage: baseRecord.language,
    translationStatus: translationRecord.status ?? translationMetadata.status ?? 'translated',
    translationProvider: translationRecord.provider ?? translationMetadata.provider,
    translationModel: translationRecord.model ?? translationMetadata.model,
    segmentCount: translatedSegments.length,
    charCount: translationRecord.charCount ?? translatedSegments.reduce((sum, segment) => sum + String(segment.text ?? '').length, 0),
    contentSha256: translationRecord.contentSha256 ?? baseRecord.contentSha256,
    sourceContentSha256: translationRecord.sourceContentSha256 ?? baseRecord.contentSha256,
    segments: translatedSegments.map((segment, index) => ({
      start: Number.isFinite(Number(segment.start)) ? Number(segment.start) : Number(baseRecord.segments?.[index]?.start ?? 0),
      end: Number.isFinite(Number(segment.end)) ? Number(segment.end) : Number(baseRecord.segments?.[index]?.end ?? segment.start ?? 0),
      text: String(segment.text ?? ''),
    })),
  }
}

function transcriptContentNote(record, language) {
  if (record.transcriptSourceType === 'public_post_caption') {
    return language === 'en'
      ? 'Original account-post text or media caption. It is not a video transcript and does not establish what was said in the linked media; verify the post and media separately.'
      : '原账号公开帖文或媒体说明，不属于视频逐字稿，也不能据此认定链接视频中的完整发言；引用时请分别核对帖文与外部媒体。'
  }
  if (record.transcriptSourceType === 'public_subtitle') {
    return language === 'en'
      ? 'Public subtitle transcript; verify the speaker and quotations against the linked recording. Statements are not court findings.'
      : '公开字幕文字稿；引用前请核对具体发言人与外部原视频，公开陈述不等于法院认定。'
  }
  if (record.transcriptSourceType === 'community_human_transcript') {
    if (record.communityTranscriptAudit?.timecoded === false) {
      return language === 'en'
        ? 'Human-edited full text matched to the public recording. Precise segment timestamps were not reliably recoverable; verify quotations and timing against the linked recording.'
        : '人工整理全文，已与公开视频匹配；原始分段时间无法可靠恢复，引用与定位时请回到外部原视频核对。'
    }
    return language === 'en'
      ? 'Human-edited transcript matched to the date, title, and original recording. Verify important quotations against the linked recording; statements are not court findings.'
      : '人工整理文字稿，已按日期、标题与外部原视频进行匹配。重要引用仍请回到原视频核对；公开陈述不等于法院认定。'
  }
  if (record.transcriptSourceType === 'legacy_human_transcript') {
    if (!record.originalLinks?.length) {
      return language === 'en'
        ? 'Human-edited archival transcript with a public text-source link; an original recording link has not been recovered. Precise timestamps are unavailable, so treat quotations and timing as requiring further verification.'
        : '历史人工听写全文，已保留公开文字来源链接，但尚未找回可核对的原视频链接。原始分段时间不可用，引用与时间定位仍需进一步核验。'
    }
    return language === 'en'
      ? 'Human-edited archival transcript matched against the date, title, text, and public recording links. Precise segment timestamps are unavailable; verify quotations and timing against the linked recording.'
      : '历史人工听写全文，已按日期、标题、正文与外部原视频链接交叉匹配。原始分段时间无法可靠恢复，引用与定位时请回到原视频核对。'
  }
  if (record.transcriptSourceType === 'archival_human_transcript') {
    if (!record.originalLinks?.length && !record.transcriptSourceLinks?.length) {
      return language === 'en'
        ? 'Built-in audited public-statement text. A directly openable public source link is not available for this copy, and precise timestamps are unavailable; verify important quotations against any recovered recording.'
        : '内置审计后的公开言论文字稿；此副本暂无可直接打开的外部来源链接，原始分段时间不可用，重要引用请结合可找回的公开视频再复核。'
    }
    return language === 'en'
      ? 'Human-edited public archival text merged from open transcript collections. Precise timestamps are unavailable; verify important quotations against the linked public source or recording.'
      : '公开档案人工整理全文，来自已公开文字库交叉合并。原始分段时间不可用，重要引用请对照外部文字来源或公开视频复核。'
  }
  return language === 'en'
    ? 'This is an original-language public-video transcript. Verify the speaker and quotations against the linked recording; it is not a judicial finding.'
    : '这是历史直播或相关公开视频的原语言文字稿。引用前请核对具体发言人和外部原视频；其内容不属于法院认定。'
}

function transcriptIsTimecoded(record) {
  if (record.transcriptSourceType === 'public_post_caption') return false
  if (record.transcriptSourceType === 'legacy_human_transcript') return record.legacyTranscriptAudit?.timecoded !== false
  if (record.transcriptSourceType === 'archival_human_transcript') return false
  if (record.transcriptSourceType === 'community_human_transcript') return record.communityTranscriptAudit?.timecoded !== false
  return true
}

function classifyTranscriptRecord(record) {
  if (record?.transcriptSourceType === 'public_post_caption') {
    return {
      recordKind: 'public_post',
      durationQuality: 'unknown',
      transcriptQuality: Number(record?.segmentCount) > 0 || record?.segments?.length ? 'plausible' : 'unknown',
      transcriptQualityReasons: [],
      transcriptStartSec: null,
      transcriptEndSec: null,
      transcriptSpanRatio: null,
    }
  }
  if (record?.recordKind && record?.durationQuality && record?.transcriptQuality) {
    return {
      recordKind: record.recordKind,
      durationQuality: record.durationQuality,
      transcriptQuality: record.transcriptQuality,
      transcriptQualityReasons: Array.isArray(record.transcriptQualityReasons) ? record.transcriptQualityReasons : [],
      transcriptStartSec: finiteOrNull(record.transcriptStartSec),
      transcriptEndSec: finiteOrNull(record.transcriptEndSec),
      transcriptSpanRatio: finiteOrNull(record.transcriptSpanRatio),
    }
  }
  const title = String(record?.title ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN')
  const duration = Number(record?.durationSec)
  const hasDuration = Number.isFinite(duration) && duration > 0
  const excerptTitle = /直播重点|重点(?:\s*片段|剪辑)?|片段|剪辑|节选|精彩片段|excerpt|clip|highlights?/iu.test(title)
  const shortVideoTitle = /小视频|短视频|short\s*video/iu.test(title)
  const livestreamTitle = /直播|livestream|live\s*(?:broadcast|stream)/iu.test(title)
  const claimsComplete = /完整版|完整直播|全程|full\s*(?:version|broadcast|livestream)/iu.test(title)

  let recordKind = 'unknown'
  if (shortVideoTitle) recordKind = 'short_video'
  else if (excerptTitle) recordKind = 'broadcast_excerpt'
  else if (hasDuration && duration >= 3600) recordKind = 'full_broadcast'
  else if (!livestreamTitle && hasDuration && duration <= 600) recordKind = 'short_video'

  let durationQuality = hasDuration ? 'plausible' : 'unknown'
  if (!excerptTitle && !shortVideoTitle && livestreamTitle && duration < 600) durationQuality = 'suspiciously_short'
  if (claimsComplete && (!hasDuration || duration < 1800)) durationQuality = 'suspiciously_short'
  return { recordKind, durationQuality, ...analyzeTranscriptCoverage(record, durationQuality) }
}

function classificationNote(classification, language) {
  if (classification.transcriptQuality === 'possibly_incomplete') return language === 'en' ? 'Possibly incomplete copy' : '可能不完整副本'
  const labels = language === 'en'
    ? { full_broadcast: 'Long-form broadcast', broadcast_excerpt: 'Broadcast excerpt', short_video: 'Short public video', public_post: 'Public account post', unknown: 'Type requires review' }
    : { full_broadcast: '长时直播', broadcast_excerpt: '直播剪辑片段', short_video: '公开短视频', public_post: '公开账号帖文', unknown: '类型待核对' }
  return labels[classification.recordKind] ?? labels.unknown
}

function analyzeTranscriptCoverage(record, durationQuality) {
  const duration = Number(record?.durationSec)
  const hasDuration = Number.isFinite(duration) && duration > 0
  const segments = Array.isArray(record?.segments) ? record.segments : []
  const firstStart = finiteOrNull(record?.transcriptStartSec ?? segments[0]?.start)
  const lastEnd = finiteOrNull(record?.transcriptEndSec ?? segments.at(-1)?.end ?? segments.at(-1)?.start)
  const charCount = Number(record?.charCount)
  const reasons = []
  if (durationQuality === 'suspiciously_short') reasons.push('suspicious_duration')
  if (hasDuration && lastEnd !== null && lastEnd > duration + 5) reasons.push('timeline_overrun')
  if (hasDuration && firstStart !== null && duration >= 1800 && firstStart > 600 && firstStart / duration > 0.08) reasons.push('late_start')
  if (hasDuration && lastEnd !== null && duration >= 1800 && lastEnd < duration - 600 && (duration - lastEnd) / duration > 0.08) reasons.push('early_end')
  const transcriptSpanRatio = hasDuration && firstStart !== null && lastEnd !== null
    ? Math.max(0, Math.min(lastEnd, duration) - Math.max(0, firstStart)) / duration
    : null
  if (hasDuration && duration >= 600 && transcriptSpanRatio !== null && transcriptSpanRatio < 0.65) reasons.push('short_span')
  const charsPerMinute = hasDuration && Number.isFinite(charCount) ? charCount / (duration / 60) : null
  if (duration >= 1800 && charsPerMinute !== null && charsPerMinute < 50) reasons.push('sparse_text')
  const incompleteReasons = reasons.filter((reason) => reason !== 'timeline_overrun')
  const transcriptQuality = incompleteReasons.length ? 'possibly_incomplete' : (segments.length || Number(record?.segmentCount) > 0 ? 'plausible' : 'unknown')
  return {
    transcriptQuality,
    transcriptQualityReasons: [...new Set(reasons)],
    transcriptStartSec: firstStart,
    transcriptEndSec: lastEnd,
    transcriptSpanRatio,
  }
}

function transcriptCoverageNote(classification, language) {
  const reasons = new Set(classification.transcriptQualityReasons)
  if (classification.transcriptQuality !== 'possibly_incomplete' && !reasons.has('timeline_overrun')) return ''
  const notes = []
  if (reasons.has('suspicious_duration')) notes.push(language === 'en'
    ? 'The title suggests a livestream or complete recording, but the indexed duration is unusually short.'
    : '标题看似直播或完整版，但索引时长异常短。')
  if (reasons.has('late_start') && classification.transcriptStartSec !== null) notes.push(language === 'en'
    ? `The locally stored transcript begins at ${formatTranscriptTimestamp(classification.transcriptStartSec)} and may omit earlier audio.`
    : `本地已收录文字从 ${formatTranscriptTimestamp(classification.transcriptStartSec)} 开始，可能缺少此前内容。`)
  if (reasons.has('early_end') && classification.transcriptEndSec !== null) notes.push(language === 'en'
    ? `The locally stored transcript ends at ${formatTranscriptTimestamp(classification.transcriptEndSec)} and may omit later audio.`
    : `本地已收录文字在 ${formatTranscriptTimestamp(classification.transcriptEndSec)} 结束，可能缺少后续内容。`)
  if (reasons.has('short_span') && !reasons.has('late_start') && !reasons.has('early_end')) notes.push(language === 'en'
    ? 'The indexed text covers only part of the recorded duration.'
    : '已索引文字只覆盖了记录时长的一部分。')
  if (reasons.has('sparse_text')) notes.push(language === 'en'
    ? 'The amount of indexed text is unusually small for the recorded duration.'
    : '相对记录时长，已索引文字量异常少。')
  if (reasons.has('timeline_overrun') && classification.transcriptEndSec !== null) notes.push(language === 'en'
    ? `The public transcript timeline ends at ${formatTranscriptTimestamp(classification.transcriptEndSec)}, slightly beyond the indexed media duration; the boundary remains unverified.`
    : `公开文字时间轴结束于 ${formatTranscriptTimestamp(classification.transcriptEndSec)}，略晚于索引媒体时长；该边界尚未核准。`)
  notes.push(language === 'en' ? 'Use the external recording to verify quotations.' : '引用时请对照外部原视频复核。')
  return notes.join(language === 'en' ? ' ' : '')
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function formatTranscriptTimestamp(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function publicSegment(segment) {
  return { start: segment.start, end: segment.end, text: segment.text }
}

function validateManifest(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.records) || !Array.isArray(value.shards)) {
    throw new Error('Public-record transcript manifest is invalid.')
  }
  return value
}

function emptyManifest() {
  return { schemaVersion: 1, generatedAt: null, coverage: {}, records: [], shards: [] }
}

function validateTranslationManifest(value, language) {
  const schemaVersion = Number(value?.schemaVersion)
  if (!value || !Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > 5 || value.language !== language || !Array.isArray(value.records) || !Array.isArray(value.shards)) {
    throw new Error('Public-record transcript translation manifest is invalid.')
  }
  return value
}

function emptyTranslationManifest(language) {
  return { schemaVersion: 1, language, generatedAt: null, coverage: {}, records: [], shards: [] }
}

function scalar(value) {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

function integer(value, fallback, min, max) {
  const parsed = Number.parseInt(scalar(value), 10)
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback
}
