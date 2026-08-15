import { readFile } from 'node:fs/promises'

const corpusUrl = new URL('./public-record-corpus.json', import.meta.url)
const fixedCoverage = Object.freeze({
  start: '2017-01-26',
  end: '2023-03-14',
  casePhaseStart: '2023-03-15',
})
const allowedPlatforms = new Set(['youtube', 'gettr', 'rumble', 'odysee', 'x'])
const allowedSourceHosts = new Set([
  'gettr.com',
  'www.gettr.com',
  'odysee.com',
  'rumble.com',
  'www.rumble.com',
  'x.com',
  'www.x.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
])

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
    return url.protocol === 'https:' && allowedSourceHosts.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
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
  return { ...raw, records }
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

function localizeSource(source) {
  return {
    platform: source.platform,
    url: source.url,
    uploader: source.uploader ?? '',
    sourceTitle: source.sourceTitle ?? '',
    durationSec: Number.isFinite(source.durationSec) ? source.durationSec : null,
    checkedAt: source.checkedAt ?? null,
    role: source.role ?? 'archival_repost',
  }
}

function localizeRecord(record, language) {
  return {
    id: record.id,
    date: record.date,
    title: localizedText(record.title, language),
    originalTitle: record.originalTitle ?? '',
    summary: localizedText(record.summary, language),
    speaker: language === 'en' ? 'Guo Wengui / Miles Guo' : '郭文贵 / Miles Guo',
    recordType: record.recordType ?? 'historical_livestream',
    verificationStatus: record.verificationStatus ?? 'verified_repost_link',
    completeness: record.completeness ?? 'unknown',
    primarySource: localizeSource(record.primarySource),
    alternatives: record.alternatives.map(localizeSource),
    tags: Array.isArray(record.tags) ? record.tags : [],
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
    casePhaseStart: corpus.coverage.casePhaseStart,
    totalRecords: records.length,
    unresolvedSourceLeads: corpus.coverage.unresolvedSourceLeads ?? 0,
    platformCounts,
    yearCounts: [...yearCounts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([year, count]) => ({ year, count })),
    generatedAt: corpus.generatedAt ?? null,
  }
}

export async function queryPublicRecords(query = {}, language = 'zh') {
  const corpus = await loadCorpus()
  const q = scalar(query.q).trim().toLocaleLowerCase(language === 'en' ? 'en-US' : 'zh-CN')
  const year = scalar(query.year).trim()
  const platform = scalar(query.platform).trim().toLowerCase()
  const sort = scalar(query.sort).trim() === 'oldest' ? 'oldest' : 'newest'
  const limit = integer(query.limit, 60, 1, 120)
  const offset = integer(query.offset, 0, 0, Number.MAX_SAFE_INTEGER)

  const filtered = corpus.records.filter((record) => {
    if (year && year !== 'all' && record.date.slice(0, 4) !== year) return false
    if (platform && platform !== 'all') {
      const platforms = [record.primarySource, ...(record.alternatives ?? [])].map((source) => source?.platform)
      if (!platforms.includes(platform)) return false
    }
    if (!q) return true
    const haystack = [
      record.date,
      localizedText(record.title, language),
      localizedText(record.title, language === 'en' ? 'zh' : 'en'),
      record.originalTitle,
      record.primarySource?.uploader,
      record.primarySource?.sourceTitle,
      ...(record.tags ?? []),
    ].filter(Boolean).join(' ').toLocaleLowerCase(language === 'en' ? 'en-US' : 'zh-CN')
    return haystack.includes(q)
  }).sort((left, right) => sort === 'oldest'
    ? left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
    : right.date.localeCompare(left.date) || right.id.localeCompare(left.id))

  return {
    summary: buildSummary(corpus, corpus.records),
    filters: { q, year: year || 'all', platform: platform || 'all', sort },
    total: filtered.length,
    offset,
    limit,
    hasMore: offset + limit < filtered.length,
    records: filtered.slice(offset, offset + limit).map((record) => localizeRecord(record, language)),
  }
}
