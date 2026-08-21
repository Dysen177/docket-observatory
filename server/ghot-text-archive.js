import { createHash, randomUUID } from 'node:crypto'
import { chmod, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzip, gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import { readTextWithLimit, safeFetch } from './safe-fetch.js'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const archiveOrigin = 'https://ghot.ai'
const archiveListUrl = `${archiveOrigin}/api/archive/docs`
const bundledArchivePath = path.join(__dirname, 'ghot-text-archive.json.gz')
const runtimeArchivePath = path.resolve(
  process.env.GUO_INTEL_CACHE_DIR ?? path.join(process.cwd(), 'server', 'cache'),
  'ghot-text-archive.json.gz',
)
const supportedLanguages = ['zh', 'en']
const archiveSchemaVersion = 1
let activeArchivePromise = null

export function ghotTextArchivePaths() {
  return { bundled: bundledArchivePath, runtime: runtimeArchivePath }
}

export async function loadGhotTextArchive() {
  if (!activeArchivePromise) activeArchivePromise = loadPreferredArchive()
  return activeArchivePromise
}

export async function syncGhotTextArchive(options = {}) {
  const outputPath = path.resolve(options.outputPath ?? runtimeArchivePath)
  const forceAll = options.forceAll === true
  const refreshRecentCourtCount = boundedInteger(options.refreshRecentCourtCount, 0, 50, 12)
  const concurrency = boundedInteger(options.concurrency, 1, 8, 4)
  const requestDelayMs = boundedInteger(options.requestDelayMs, 0, 2000, 80)
  const languages = normalizeLanguages(options.languages)
  const previous = await readArchive(outputPath)
    ?? (outputPath === bundledArchivePath ? null : await readArchive(runtimeArchivePath))
    ?? await readArchive(bundledArchivePath)
  const listPayload = await fetchJson(archiveListUrl, 8 * 1024 * 1024)
  const listedRecords = Array.isArray(listPayload?.records) ? listPayload.records.map(normalizeListRecord).filter(Boolean) : []
  if (!listedRecords.length) throw new Error('GHOT text archive returned an empty document list.')

  const previousBySlug = new Map((previous?.records ?? []).map((record) => [record.slug, record]))
  const recentCourtSlugs = new Set(listedRecords
    .filter((record) => record.docKind === 'court_filing')
    .sort((left, right) => compareDocNumber(right.docNum, left.docNum))
    .slice(0, refreshRecentCourtCount)
    .map((record) => record.slug))
  const refreshSlugs = new Set(listedRecords.filter((record) => {
    const prior = previousBySlug.get(record.slug)
    return forceAll
      || !prior
      || prior.listSignature !== record.listSignature
      || record.docKind !== 'court_filing'
      || recentCourtSlugs.has(record.slug)
      || languages.some((language) => !prior.details?.[language])
  }).map((record) => record.slug))

  let fetchedDetails = 0
  let retainedDetails = 0
  const failures = []
  const records = await concurrentMap(listedRecords, concurrency, async (record) => {
    const prior = previousBySlug.get(record.slug)
    const details = {}
    for (const language of languages) {
      if (!refreshSlugs.has(record.slug) && prior?.details?.[language]) {
        details[language] = prior.details[language]
        retainedDetails += 1
        continue
      }
      if (requestDelayMs) await delay(requestDelayMs)
      try {
        details[language] = normalizeDetail(await fetchJson(
          `${archiveOrigin}/api/archive/docs/${encodeURIComponent(record.slug)}?lang=${language}`,
          2 * 1024 * 1024,
        ), record, language)
        fetchedDetails += 1
      } catch (error) {
        if (prior?.details?.[language]) {
          details[language] = prior.details[language]
          retainedDetails += 1
        } else {
          details[language] = detailFromListRecord(record, language)
        }
        failures.push({ slug: record.slug, language, error: safeError(error) })
      }
    }
    return { ...record, details }
  })

  const payload = {
    schemaVersion: archiveSchemaVersion,
    source: {
      name: 'GHOT text archive',
      origin: archiveOrigin,
      listUrl: archiveListUrl,
      canonicalArchiveUrl: `${archiveOrigin}/archive/docs`,
      evidenceRole: 'secondary_public_archive',
    },
    fetchedAt: new Date().toISOString(),
    languages,
    counts: countArchiveRecords(records),
    records,
    sync: {
      listedRecords: listedRecords.length,
      refreshedRecords: refreshSlugs.size,
      fetchedDetails,
      retainedDetails,
      failures,
    },
  }
  await writeCompressedArchive(outputPath, payload)
  activeArchivePromise = Promise.resolve(payload)
  return payload
}

export async function retrieveGhotArchiveEvidence(query, tokens = [], language = 'zh', limit = 4, options = {}) {
  const archive = await loadGhotTextArchive()
  const normalizedQuery = normalizeArchiveText(query)
  if (!archive?.records?.length || !normalizedQuery) return []
  const english = language === 'en'
  const requestedDocNumbers = new Set([...String(query ?? '').matchAll(/(?:doc(?:ument)?\.?|文件|案卷)\s*#?\s*(\d+(?:-\d+)?)/giu)].map((match) => match[1]))
  const definitionIntent = /是什么|什么意思|含义|解释|介绍|define|definition|what (?:is|does)|meaning|explain/iu.test(String(query ?? ''))
  const includeCourt = options.includeCourt === true || requestedDocNumbers.size > 0
  const searchTerms = [...new Set([normalizedQuery, ...(tokens ?? []).map(normalizeArchiveText)].filter((term) => term.length >= 2))]
  const candidates = []

  for (const record of archive.records) {
    if (record.docKind === 'site_guide') continue
    if (record.docKind === 'court_filing' && !includeCourt) continue
    const detail = selectDetail(record, english ? 'en' : 'zh')
    const title = String(detail?.title ?? '').trim()
    const abstract = String(detail?.abstract ?? '').trim()
    const longSummary = String(detail?.longSummaryMd ?? '').trim()
    const normalizedTitle = normalizeArchiveText(title)
    const normalizedTags = (record.tags ?? []).map(normalizeArchiveText)
    const normalizedAbstract = normalizeArchiveText(abstract)
    const normalizedSummary = normalizeArchiveText(longSummary)
    let score = 0
    for (const term of searchTerms) {
      if (!term) continue
      if (normalizedTitle && (normalizedQuery.includes(normalizedTitle) || normalizedTitle.includes(term))) score += 60
      if (normalizedTags.some((tag) => tag && (tag.includes(term) || term.includes(tag)))) score += 36
      if (normalizedAbstract.includes(term)) score += 16
      if (normalizedSummary.includes(term)) score += 3
    }
    if (requestedDocNumbers.has(String(record.docNum ?? ''))) score += 160
    if (definitionIntent && record.docKind === 'concept') score += 24
    if (/新中国联邦|nfsc|newfederalstateofchina/iu.test(normalizedQuery) && record.slug === 'nfsc-declaration') score += 80
    if (score <= 0) continue
    candidates.push({ record, detail, score })
  }

  return candidates
    .sort((left, right) => right.score - left.score
      || archiveKindPriority(right.record.docKind) - archiveKindPriority(left.record.docKind)
      || compareDocNumber(right.record.docNum, left.record.docNum)
      || String(left.record.slug).localeCompare(String(right.record.slug), 'en-US'))
    .slice(0, Math.max(0, Math.min(8, Number(limit) || 4)))
    .map(({ record, detail, score }) => ({
      kind: 'archive_reference',
      archiveKind: record.docKind,
      archiveSlug: record.slug,
      archiveMatchScore: score,
      title: detail.title || record.slug,
      subtitle: english
        ? `GHOT public text archive · ${archiveKindLabel(record.docKind, 'en')}`
        : `GHOT 公开文字档案 · ${archiveKindLabel(record.docKind, 'zh')}`,
      date: record.publishedDate ?? record.addedAt?.slice(0, 10) ?? null,
      timestamp: null,
      pageNumber: null,
      sourceUrl: `${archiveOrigin}/${english ? 'en/' : ''}archive/docs/${encodeURIComponent(record.slug)}`,
      sourceLabel: 'GHOT',
      excerpt: limitText(mostDetailedArchiveSummary(detail), 6500),
      excerpts: [],
      contextBefore: [],
      contextAfter: [],
      evidenceClass: record.docKind === 'court_filing'
        ? (english
            ? 'Secondary archive summary; verify the PDF and official docket before relying on legal conclusions'
            : '外部二级档案摘要；法律结论须回到 PDF 原件和官方案卷核验')
        : (english
            ? 'External public archive reference; attributed claims require primary-source or independent verification'
            : '外部公开档案参考；其中转述的主张仍需原始材料或独立来源核验'),
    }))
}

function normalizeListRecord(value) {
  const slug = String(value?.slug ?? '').trim()
  if (!slug) return null
  const record = {
    slug,
    docKind: String(value.docKind ?? '').trim() || 'unknown',
    docNum: value.docNum == null ? null : String(value.docNum),
    publishedDate: dateOnly(value.publishedDate),
    addedAt: isoDate(value.addedAt),
    authors: stringArray(value.authors),
    tags: stringArray(value.tags),
    hasLongSummary: value.hasLongSummary === true,
    versions: (Array.isArray(value.versions) ? value.versions : []).map((version) => ({
      language: String(version?.language ?? '').trim(),
      title: String(version?.title ?? '').trim(),
      abstract: String(version?.abstract ?? '').trim(),
      pageCount: finiteNumber(version?.pageCount),
      sourceUrl: safeHttpsUrl(version?.sourceUrl, archiveOrigin),
      downloadUrl: safeHttpsUrl(version?.downloadUrl, archiveOrigin),
    })).filter((version) => supportedLanguages.includes(version.language)),
  }
  record.listSignature = createHash('sha256').update(JSON.stringify(record)).digest('hex')
  return record
}

function normalizeDetail(value, record, language) {
  if (!value || value.error) throw new Error(value?.error || `GHOT returned no ${language} detail for ${record.slug}.`)
  return {
    language,
    title: String(value.title ?? detailFromListRecord(record, language).title).trim(),
    abstract: String(value.abstract ?? '').trim(),
    longSummaryMd: String(value.longSummaryMd ?? '').trim(),
    sourceUrl: safeHttpsUrl(value.sourceUrl, archiveOrigin),
    downloadUrl: safeHttpsUrl(value.downloadUrl, archiveOrigin),
    availableLanguages: stringArray(value.availableLanguages).filter((item) => ['zh', 'en', 'ja'].includes(item)),
  }
}

function detailFromListRecord(record, language) {
  const version = record.versions.find((item) => item.language === language)
    ?? record.versions.find((item) => item.language === 'zh')
    ?? record.versions[0]
    ?? {}
  return {
    language,
    title: String(version.title ?? record.slug),
    abstract: String(version.abstract ?? ''),
    longSummaryMd: '',
    sourceUrl: version.sourceUrl ?? null,
    downloadUrl: version.downloadUrl ?? null,
    availableLanguages: record.versions.map((item) => item.language),
  }
}

function selectDetail(record, language) {
  return record.details?.[language] ?? record.details?.zh ?? record.details?.en ?? detailFromListRecord(record, language)
}

async function loadPreferredArchive() {
  const runtime = await readArchive(runtimeArchivePath)
  const bundled = await readArchive(bundledArchivePath)
  if (!runtime) return bundled
  if (!bundled) return runtime
  return Date.parse(runtime.fetchedAt ?? '') >= Date.parse(bundled.fetchedAt ?? '') ? runtime : bundled
}

async function readArchive(filePath) {
  try {
    const data = await gunzipAsync(await readFile(filePath))
    const value = JSON.parse(data.toString('utf8'))
    return value?.schemaVersion === archiveSchemaVersion && Array.isArray(value.records) ? value : null
  } catch {
    return null
  }
}

async function fetchJson(url, maximumBytes) {
  const response = await safeFetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'guo-intel-local/0.1 (+local research archive sync)',
    },
  }, { timeoutMs: 30000, includeOpenAI: false })
  if (!response.ok) throw new Error(`GHOT archive request returned HTTP ${response.status}.`)
  return JSON.parse(await readTextWithLimit(response, maximumBytes))
}

async function writeCompressedArchive(filePath, payload) {
  const directory = path.dirname(filePath)
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.part`
  await writeFile(temporaryPath, await gzipAsync(Buffer.from(JSON.stringify(payload))), { mode: 0o600 })
  await rename(temporaryPath, filePath)
  await chmod(filePath, 0o600).catch(() => undefined)
}

async function concurrentMap(values, concurrency, worker) {
  const result = new Array(values.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= values.length) return
      result[index] = await worker(values[index], index)
    }
  })
  await Promise.all(runners)
  return result
}

function countArchiveRecords(records) {
  const byKind = {}
  for (const record of records) byKind[record.docKind] = (byKind[record.docKind] ?? 0) + 1
  return { total: records.length, byKind }
}

function normalizeLanguages(value) {
  const requested = Array.isArray(value) ? value : supportedLanguages
  const normalized = [...new Set(requested.map((item) => String(item)).filter((item) => supportedLanguages.includes(item)))]
  return normalized.length ? normalized : [...supportedLanguages]
}

function archiveKindPriority(kind) {
  return ({ concept: 5, declaration: 4, report: 3, court_filing: 2, site_guide: 1 })[kind] ?? 0
}

function archiveKindLabel(kind, language) {
  const labels = language === 'en'
    ? { concept: 'glossary', declaration: 'declaration', report: 'report', court_filing: 'court filing', site_guide: 'site guide' }
    : { concept: '名词解释', declaration: '宣言', report: '报告/文献', court_filing: '案卷解读', site_guide: '站点指南' }
  return labels[kind] ?? kind
}

function normalizeArchiveText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, '')
}

function mostDetailedArchiveSummary(detail) {
  const summaries = [detail?.longSummaryMd, detail?.abstract]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
  return summaries[0] ?? ''
}

function stringArray(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item ?? '').trim()).filter(Boolean))]
}

function safeHttpsUrl(value, base) {
  if (!value) return null
  try {
    const url = new URL(String(value), base)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function dateOnly(value) {
  const match = String(value ?? '').match(/^\d{4}-\d{2}-\d{2}/u)
  return match?.[0] ?? null
}

function isoDate(value) {
  const parsed = Date.parse(String(value ?? ''))
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function finiteNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function compareDocNumber(left, right) {
  const leftParts = String(left ?? '').match(/\d+|[a-z]+/giu) ?? []
  const rightParts = String(right ?? '').match(/\d+|[a-z]+/giu) ?? []
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const a = leftParts[index] ?? ''
    const b = rightParts[index] ?? ''
    const an = Number(a)
    const bn = Number(b)
    const delta = Number.isFinite(an) && Number.isFinite(bn) ? an - bn : a.localeCompare(b, 'en-US')
    if (delta) return delta
  }
  return 0
}

function limitText(value, maximum) {
  const text = String(value ?? '').trim()
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1).trimEnd()}…`
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : fallback
}

function safeError(error) {
  return error instanceof Error ? error.message : String(error)
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export async function ghotTextArchiveFileInfo() {
  const info = await stat(runtimeArchivePath).catch(() => stat(bundledArchivePath).catch(() => null))
  return info ? { bytes: info.size, modifiedAt: info.mtime.toISOString() } : null
}
