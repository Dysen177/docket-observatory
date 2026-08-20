import { readFile } from 'node:fs/promises'
import { publicRecordCaseLinks } from './public-record-case-links.js'

const corpusUrl = new URL('./public-record-corpus.json', import.meta.url)
const fixedCoverage = Object.freeze({
  start: '2017-01-26',
  end: '2023-03-14',
  arrestDate: '2023-03-15',
})
const allowedPlatforms = new Set(['youtube', 'gettr', 'rumble', 'odysee', 'x'])
const platformHosts = new Map([
  ['gettr', new Set(['gettr.com', 'www.gettr.com'])],
  ['odysee', new Set(['odysee.com'])],
  ['rumble', new Set(['rumble.com', 'www.rumble.com'])],
  ['x', new Set(['x.com', 'www.x.com'])],
  ['youtube', new Set(['youtube.com', 'www.youtube.com', 'youtu.be'])],
])
const speakerAliases = ['郭文贵', '郭文貴', 'Guo Wengui', 'Miles Guo', 'Ho Wan Kwok']

let corpusPromise = null

function scalar(value) {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

function integer(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(scalar(value), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

function sourceAllowed(source) {
  try {
    const url = new URL(String(source?.url ?? ''))
    const platform = String(source?.platform ?? '').toLowerCase()
    return url.protocol === 'https:' && allowedPlatforms.has(platform) && platformHosts.get(platform)?.has(url.hostname.toLowerCase()) === true
  } catch {
    return false
  }
}

function canonicalSourceIdentity(source) {
  const url = new URL(String(source?.url ?? ''))
  const platform = String(source?.platform ?? '').toLowerCase()
  if (platform === 'youtube') {
    const videoId = url.hostname.toLowerCase() === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|live|shorts)\/([^/?#]+)/)?.[1]
    if (videoId) return `youtube:${videoId}`
  }
  url.hash = ''
  return `${platform}:${url.toString()}`
}

function normalizedIdentityTitle(record) {
  return `${record.date}\u0000${String(record.originalTitle ?? '').normalize('NFKC').trim().toLocaleLowerCase('zh-CN')}`
}

function archivalSequence(record) {
  for (const source of [record.primarySource, ...(record.alternatives ?? [])]) {
    const match = String(source?.sourceTitle ?? '').trim().match(/(?:[_\s-])(\d{1,2})$/)
    if (match) return Number.parseInt(match[1], 10)
  }
  return Number.MAX_SAFE_INTEGER
}

function enrichRecordIdentity(records) {
  const groups = new Map()
  for (const record of records) {
    const key = normalizedIdentityTitle(record)
    const group = groups.get(key) ?? []
    group.push(record)
    groups.set(key, group)
  }

  const contextById = new Map()
  for (const group of groups.values()) {
    const ordered = [...group].sort((left, right) => archivalSequence(left) - archivalSequence(right)
      || left.primarySource.url.localeCompare(right.primarySource.url))
    ordered.forEach((record, index) => contextById.set(record.id, {
      sameTitleCount: ordered.length,
      sameTitleIndex: index + 1,
    }))
  }

  return records.map((record) => ({ ...record, ...contextById.get(record.id) }))
}

function displayTitleIdentity(record, language) {
  return `${record.date}\u0000${localizedText(record.title, language).normalize('NFKC').trim().toLocaleLowerCase(language === 'en' ? 'en-US' : 'zh-CN')}`
}

function enrichDisplayTitleContext(records, language) {
  const groups = new Map()
  for (const record of records) {
    const key = displayTitleIdentity(record, language)
    const group = groups.get(key) ?? []
    group.push(record)
    groups.set(key, group)
  }
  const contextById = new Map()
  for (const group of groups.values()) {
    group.forEach((record, index) => contextById.set(record.id, {
      displayTitleCount: group.length,
      displayTitleIndex: index + 1,
    }))
  }
  return contextById
}

function validIsoDate(year, month, day) {
  const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value
}

function datesFromText(value) {
  const text = String(value ?? '')
  const dates = new Set()
  for (const match of text.matchAll(/(?<!\d)(20(?:1[7-9]|2[0-3]))[./_-]([01]?\d)[./_-]([0-3]?\d)(?!\d)/g)) {
    const date = validIsoDate(match[1], match[2], match[3])
    if (date) dates.add(date)
  }
  for (const match of text.matchAll(/(?<!\d)(20(?:1[7-9]|2[0-3]))([01]\d)([0-3]\d)(?!\d)/g)) {
    const date = validIsoDate(match[1], match[2], match[3])
    if (date) dates.add(date)
  }
  for (const match of text.matchAll(/(?<!\d)(20(?:1[7-9]|2[0-3]))\s*年?\s*([01]?\d)\s*月\s*([0-3]?\d)\s*(?:日|号)?(?!\d)/g)) {
    const date = validIsoDate(match[1], match[2], match[3])
    if (date) dates.add(date)
  }
  return dates
}

function leadingMonthDayDate(value, year) {
  const match = String(value ?? '').trim().match(/^(?:[（(][^）)]*[）)]\s*)?([01]?\d)\s*月\s*([0-3]?\d)\s*(?:日|号)/)
  return match ? validIsoDate(year, match[1], match[2]) : null
}

function sourceDateContext(record) {
  const candidates = new Set()
  for (const source of [record.primarySource, ...(record.alternatives ?? [])]) {
    for (const date of datesFromText(source?.sourceTitle)) candidates.add(date)
    const leadingDate = leadingMonthDayDate(source?.sourceTitle, record.date.slice(0, 4))
    if (leadingDate) candidates.add(leadingDate)
    try {
      const url = new URL(source?.url ?? '')
      if (source?.platform === 'rumble' || source?.platform === 'odysee') {
        for (const date of datesFromText(decodeURIComponent(url.pathname))) candidates.add(date)
      }
    } catch {
      // Invalid URLs are removed during corpus validation.
    }
  }
  const sourceDateCandidates = [...candidates].sort()
  const differingDates = sourceDateCandidates.filter((date) => date !== record.date)
  const recordTime = Date.parse(`${record.date}T00:00:00Z`)
  const dateStatus = sourceDateCandidates.length === 0
    ? 'unstated'
    : differingDates.length === 0
      ? 'matched'
      : differingDates.every((date) => Math.abs(Date.parse(`${date}T00:00:00Z`) - recordTime) <= 24 * 60 * 60 * 1000)
        ? 'adjacent'
        : 'conflict'
  return { dateStatus, sourceDateCandidates }
}

function normalizeSearchText(value, language) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase(language === 'en' ? 'en-US' : 'zh-CN')
    .replace(/[\p{P}\p{S}\s]+/gu, ' ')
    .trim()
}

function matchesSearch(values, query, language) {
  const normalizedQuery = normalizeSearchText(query, language)
  if (!normalizedQuery) return true
  const normalizedHaystack = normalizeSearchText(values.filter(Boolean).join(' '), language)
  const compactQuery = normalizedQuery.replace(/\s+/g, '')
  const compactHaystack = normalizedHaystack.replace(/\s+/g, '')
  if (normalizedHaystack.includes(normalizedQuery) || compactHaystack.includes(compactQuery)) return true
  return normalizedQuery.split(/\s+/).every((token) => normalizedHaystack.includes(token))
}

function validateCorpus(raw) {
  if (!raw || !Array.isArray(raw.records) || !raw.coverage) throw new Error('Historical public-record corpus is invalid.')
  for (const [field, expected] of Object.entries(fixedCoverage)) {
    if (raw.coverage[field] !== expected) {
      throw new Error(`Historical public-record ${field} must remain ${expected}.`)
    }
  }
  const records = raw.records.filter((record) => {
    if (!record?.id || !/^\d{4}-\d{2}-\d{2}$/.test(record.date ?? '')) return false
    if (record.date < fixedCoverage.start || record.date > fixedCoverage.end) return false
    return sourceAllowed(record.primarySource)
  }).map((record) => ({
    ...record,
    alternatives: Array.isArray(record.alternatives)
      ? record.alternatives.filter(sourceAllowed)
      : [],
  }))
  const ids = new Set()
  const sourceUrls = new Set()
  const sourceIdentities = new Set()
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`Historical public-record id is duplicated: ${record.id}`)
    ids.add(record.id)
    for (const source of [record.primarySource, ...record.alternatives]) {
      if (sourceUrls.has(source.url)) throw new Error(`Historical public-record source is assigned more than once: ${source.url}`)
      sourceUrls.add(source.url)
      const sourceIdentity = canonicalSourceIdentity(source)
      if (sourceIdentities.has(sourceIdentity)) throw new Error(`Historical public-record media is assigned more than once: ${sourceIdentity}`)
      sourceIdentities.add(sourceIdentity)
    }
  }
  return { ...raw, records: enrichRecordIdentity(records) }
}

async function loadCorpus() {
  if (!corpusPromise) {
    corpusPromise = readFile(corpusUrl, 'utf8')
      .then((content) => validateCorpus(JSON.parse(content)))
      .catch((error) => {
        corpusPromise = null
        throw error
      })
  }
  return corpusPromise
}

function localizedText(value, language) {
  if (!value || typeof value !== 'object') return String(value ?? '')
  return String(value[language] ?? value.zh ?? value.en ?? '')
}

function localizedUploader(value, language) {
  const uploader = String(value ?? '')
  if (language !== 'en') return uploader
  return uploader.replace(/[（(]\s*NFSC代理中\s*[）)]/gu, '(NFSC proxy account)')
}

function localizeSource(source, language) {
  return {
    platform: source.platform,
    url: source.url,
    uploader: localizedUploader(source.uploader, language),
    sourceTitle: source.sourceTitle ?? '',
    durationSec: Number.isFinite(source.durationSec) ? source.durationSec : null,
    checkedAt: source.checkedAt ?? null,
    role: source.role ?? 'archival_repost',
  }
}

function localizeRecord(record, language, displayTitleContext = {}) {
  const dateContext = sourceDateContext(record)
  return {
    id: record.id,
    date: record.date,
    title: localizedText(record.title, language),
    originalTitle: record.originalTitle ?? '',
    summary: localizedText(record.summary, language),
    speaker: language === 'en' ? 'Guo-related archive item' : '郭文贵相关历史归档',
    attributionStatus: 'source_metadata_only',
    recordType: record.recordType ?? 'historical_livestream',
    verificationStatus: record.verificationStatus ?? 'source_link_recorded',
    completeness: record.completeness ?? 'unknown',
    dateStatus: dateContext.dateStatus,
    sourceDateCandidates: dateContext.sourceDateCandidates,
    sourceCount: 1 + record.alternatives.length,
    sameTitleCount: record.sameTitleCount ?? 1,
    sameTitleIndex: record.sameTitleIndex ?? 1,
    displayTitleCount: displayTitleContext.displayTitleCount ?? 1,
    displayTitleIndex: displayTitleContext.displayTitleIndex ?? 1,
    primarySource: localizeSource(record.primarySource, language),
    alternatives: record.alternatives.map((source) => localizeSource(source, language)),
    tags: Array.isArray(record.tags) ? record.tags : [],
    caseLinks: publicRecordCaseLinks(record, language),
  }
}

function buildSummary(corpus, records) {
  const platformCounts = Object.fromEntries([...allowedPlatforms].map((platform) => [platform, 0]))
  const yearCounts = new Map()
  for (const record of records) {
    const recordPlatforms = new Set([record.primarySource, ...(record.alternatives ?? [])].map((source) => source?.platform))
    for (const platform of recordPlatforms) {
      if (allowedPlatforms.has(platform)) platformCounts[platform] += 1
    }
    const year = record.date.slice(0, 4)
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1)
  }
  return {
    coverageStart: corpus.coverage.start,
    coverageEnd: corpus.coverage.end,
    arrestDate: corpus.coverage.arrestDate,
    totalRecords: records.length,
    sourceLinkCount: records.reduce((count, record) => count + 1 + (record.alternatives?.length ?? 0), 0),
    discoveryLeadCount: corpus.coverage.discoveryLeadCount ?? records.length,
    unresolvedSourceLeads: corpus.coverage.unresolvedSourceLeads ?? 0,
    duplicateLeads: corpus.coverage.duplicateLeads ?? 0,
    sameTitleGroups: new Set(records.filter((record) => (record.sameTitleCount ?? 1) > 1).map(normalizedIdentityTitle)).size,
    dateConflictCount: records.filter((record) => sourceDateContext(record).dateStatus === 'conflict').length,
    dateAdjacentCount: records.filter((record) => sourceDateContext(record).dateStatus === 'adjacent').length,
    platformCounts,
    yearCounts: [...yearCounts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([year, count]) => ({ year, count })),
    generatedAt: corpus.generatedAt ?? null,
  }
}

export async function queryPublicRecords(query = {}, language = 'zh') {
  const corpus = await loadCorpus()
  const q = scalar(query.q).trim().slice(0, 200)
  const queryDates = [...datesFromText(q)]
  const exactQueryDate = queryDates.length === 1 ? queryDates[0] : ''
  const year = scalar(query.year).trim()
  const platform = scalar(query.platform).trim().toLowerCase()
  const sort = scalar(query.sort).trim() === 'oldest' ? 'oldest' : 'newest'
  const limit = integer(query.limit, 60, 1, 120)
  const offset = integer(query.offset, 0, 0, Number.MAX_SAFE_INTEGER)

  const filtered = corpus.records.filter((record) => {
    if (year && year !== 'all' && record.date.slice(0, 4) !== year) return false
    if (exactQueryDate && record.date !== exactQueryDate && !sourceDateContext(record).sourceDateCandidates.includes(exactQueryDate)) return false
    if (platform && platform !== 'all') {
      const platforms = [record.primarySource, ...(record.alternatives ?? [])].map((source) => source?.platform)
      if (!platforms.includes(platform)) return false
    }
    if (!q) return true
    const sources = [record.primarySource, ...(record.alternatives ?? [])]
    return matchesSearch([
      record.date,
      localizedText(record.title, language),
      localizedText(record.title, language === 'en' ? 'zh' : 'en'),
      localizedText(record.summary, language),
      localizedText(record.summary, language === 'en' ? 'zh' : 'en'),
      record.originalTitle,
      ...speakerAliases,
      record.recordType,
      record.completeness,
      ...sources.flatMap((source) => [source?.platform, source?.uploader, source?.sourceTitle, source?.url]),
      ...(record.tags ?? []),
    ], q, language)
  }).sort((left, right) => {
    const dateOrder = sort === 'oldest' ? left.date.localeCompare(right.date) : right.date.localeCompare(left.date)
    if (dateOrder) return dateOrder
    return normalizedIdentityTitle(left).localeCompare(normalizedIdentityTitle(right), language === 'en' ? 'en-US' : 'zh-CN')
      || (left.sameTitleIndex ?? 1) - (right.sameTitleIndex ?? 1)
      || left.id.localeCompare(right.id)
  })

  const displayTitleContext = enrichDisplayTitleContext(filtered, language)
  return {
    summary: buildSummary(corpus, corpus.records),
    filters: { q, year: year || 'all', platform: platform || 'all', sort },
    total: filtered.length,
    offset,
    limit,
    hasMore: offset + limit < filtered.length,
    records: filtered.slice(offset, offset + limit).map((record) => localizeRecord(record, language, displayTitleContext.get(record.id))),
  }
}
