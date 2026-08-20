import { createHash } from 'node:crypto'
import { gzip, gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const wikiRoot = path.resolve(process.env.BEARBLOG_WIKI_DIR ?? path.join(root, 'output', 'nfscflame-wiki-audit-20260817'))
const cacheRoot = path.resolve(process.env.BEARBLOG_CACHE_DIR ?? path.join(root, 'output', 'bearblog-transcript-cache'))
const reportPath = path.resolve(process.env.BEARBLOG_AUDIT_PATH ?? path.join(root, 'output', 'bearblog-transcript-audit.json'))
const recordsPath = path.resolve(process.env.BEARBLOG_RECORDS_PATH ?? path.join(root, 'output', 'bearblog-transcript-records.json.gz'))
const currentManifestPath = path.join(root, 'server', 'public-record-transcripts', 'manifest.json')
const notebookRecordsPath = path.join(root, 'output', 'notebook-transcript-records.json.gz')
const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)
const concurrency = boundedInteger(process.env.BEARBLOG_CONCURRENCY, 3, 1, 10)
const requestDelayMs = boundedInteger(process.env.BEARBLOG_DELAY_MS, 350, 0, 5000)
const requestTimeoutMs = boundedInteger(process.env.BEARBLOG_TIMEOUT_MS, 30_000, 5000, 120_000)
const maxFetchAttempts = boundedInteger(process.env.BEARBLOG_FETCH_ATTEMPTS, 6, 1, 10)
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0 Safari/537.36'
let requestGate = Promise.resolve()
let lastRequestAt = 0

await mkdir(cacheRoot, { recursive: true })
const urls = await collectBearBlogUrls(wikiRoot)
const records = []
const errors = []
let completed = 0

await concurrentMap(urls, concurrency, async (url) => {
  try {
    const record = await readOrFetchRecord(url)
    records.push(record)
    reportProgress(++completed, urls.length, record.date ?? 'undated', record.charCount)
  } catch (error) {
    errors.push({ url, error: String(error?.message ?? error) })
    reportProgress(++completed, urls.length, 'error', 0)
  }
})

records.sort((left, right) => String(left.date ?? '9999').localeCompare(String(right.date ?? '9999')) || left.url.localeCompare(right.url))
const covered = records.filter((record) => record.date && isCoverageDate(record.date))
const usable = covered.filter((record) => record.charCount >= 40)
const byHash = Map.groupBy(usable, (record) => record.contentSha256)
const duplicateGroups = [...byHash.values()].filter((group) => group.length > 1)
const unique = [...byHash.values()].map((group) => group.toSorted(compareRecordQuality)[0])
const currentComparison = await compareWithCurrentCorpus(unique)
const notebookComparison = await compareWithNotebookBundle(unique)
const generatedAt = new Date().toISOString()
const report = {
  schemaVersion: 1,
  generatedAt,
  wikiRoot,
  discoveredUrls: urls.length,
  fetchedRecords: records.length,
  fetchErrors: errors.length,
  outsideCoverage: records.length - covered.length,
  usableRecords: usable.length,
  uniqueRecords: unique.length,
  duplicateGroups: duplicateGroups.length,
  duplicateCopies: duplicateGroups.reduce((total, group) => total + group.length - 1, 0),
  totalCharacters: usable.reduce((total, record) => total + record.charCount, 0),
  uniqueCharacters: unique.reduce((total, record) => total + record.charCount, 0),
  dates: new Set(unique.map((record) => record.date)).size,
  earliestDate: unique.map((record) => record.date).toSorted()[0] ?? null,
  latestDate: unique.map((record) => record.date).toSorted().at(-1) ?? null,
  recordKinds: countBy(unique, (record) => record.recordKind),
  languages: countBy(unique, (record) => record.language),
  currentComparison,
  notebookComparison,
  errors: errors.slice(0, 100),
  records: unique.map(recordSummary),
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
await writeFile(recordsPath, await gzipAsync(Buffer.from(JSON.stringify({ schemaVersion: 1, generatedAt, records: unique })), { level: 9 }))
process.stdout.write(`${JSON.stringify({ ...report, records: undefined }, null, 2)}\n`)

async function collectBearBlogUrls(directory) {
  const urls = new Set()
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue
    const source = await readFile(path.join(directory, entry.name), 'utf8')
    for (const match of source.matchAll(/https:\/\/milesguovideotextlibrary\.bearblog\.dev\/[^\s)>]+/gu)) {
      try {
        const parsed = new URL(match[0])
        parsed.hash = ''
        parsed.search = ''
        urls.add(parsed.href)
      } catch {
        // Ignore malformed links in the community-maintained index.
      }
    }
  }
  return [...urls].toSorted()
}

async function readOrFetchRecord(url) {
  const cachePath = path.join(cacheRoot, `${createHash('sha256').update(url).digest('hex')}.json`)
  try {
    return JSON.parse(await readFile(cachePath, 'utf8'))
  } catch {
    // Cache miss; fetch the public article below.
  }
  const response = await fetchWithRetry(url)
  const record = parseArticle(await response.text(), url)
  await writeFile(cachePath, `${JSON.stringify(record)}\n`, 'utf8')
  return record
}

async function fetchWithRetry(url) {
  for (let attempt = 1; attempt <= maxFetchAttempts; attempt += 1) {
    await waitForRequestSlot()
    let response
    try {
      response = await fetch(url, {
        headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': userAgent },
        signal: AbortSignal.timeout(requestTimeoutMs),
      })
    } catch (error) {
      if (attempt === maxFetchAttempts) throw error
      await sleep(Math.min(30_000, 1000 * (2 ** (attempt - 1))))
      continue
    }
    if (response.ok) return response
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === maxFetchAttempts) {
      throw new Error(`HTTP ${response.status}`)
    }
    const retryAfter = Number(response.headers.get('retry-after'))
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(60_000, 1500 * (2 ** (attempt - 1)))
    await sleep(backoff)
  }
  throw new Error('Fetch attempts exhausted')
}

async function waitForRequestSlot() {
  const previous = requestGate
  let release
  requestGate = new Promise((resolve) => { release = resolve })
  await previous
  const waitMs = Math.max(0, lastRequestAt + requestDelayMs - Date.now())
  if (waitMs) await sleep(waitMs)
  lastRequestAt = Date.now()
  release()
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function parseArticle(html, url) {
  const $ = cheerio.load(html)
  const main = $('main').first()
  const title = normalizeWhitespace(main.find('h1').first().text() || $('meta[name="title"]').attr('content'))
  const publishedAt = main.find('time').first().attr('datetime') ?? null
  main.find('form, nav, script, style').remove()
  const originalLinks = []
  const textParts = []
  for (const element of main.find('p, blockquote, li').toArray()) {
    const value = normalizeWhitespace($(element).text())
    if (!value) continue
    if (isPublicUrl(value)) {
      originalLinks.push(value)
      continue
    }
    if (/^\d{1,4}$/u.test(value)) continue
    if (/^\d{1,2}\s+[A-Z][a-z]{2},\s+20\d{2}$/u.test(value)) continue
    textParts.push(value)
  }
  for (const href of main.find('a[href]').map((_, element) => $(element).attr('href')).get()) {
    if (isPublicUrl(href)) originalLinks.push(href)
  }
  const text = textParts.join('\n').trim()
  const date = dateFromValue(title) ?? dateFromValue(new URL(url).pathname)
  const language = detectLanguage(text)
  return {
    id: `bearblog-${createHash('sha256').update(url).digest('hex').slice(0, 16)}`,
    url,
    date,
    title,
    publishedAt,
    recordKind: classifyRecordKind(title),
    language,
    text,
    charCount: [...text].length,
    contentSha256: createHash('sha256').update(normalizeForHash(text)).digest('hex'),
    originalLinks: [...new Set(originalLinks)],
  }
}

async function compareWithCurrentCorpus(candidates) {
  let manifest
  try {
    manifest = JSON.parse(await readFile(currentManifestPath, 'utf8'))
  } catch {
    return { available: false }
  }
  const current = []
  for (const shard of [...new Set(manifest.records.map((record) => record.dataShard).filter(Boolean))]) {
    current.push(...JSON.parse((await gunzipAsync(await readFile(path.join(root, 'server', 'public-record-transcripts', shard)))).toString('utf8')))
  }
  return compareCandidateSets(candidates, current.map((record) => ({
    id: record.id,
    date: record.date,
    title: record.title,
    text: record.segments?.map((segment) => segment.text).join('\n') ?? '',
    originalLinks: [...(record.originalLinks ?? []), ...(record.transcriptSourceLinks ?? [])].map((link) => link.url),
  })))
}

async function compareWithNotebookBundle(candidates) {
  try {
    const notebook = JSON.parse((await gunzipAsync(await readFile(notebookRecordsPath))).toString('utf8'))
    return compareCandidateSets(candidates, notebook.records ?? [])
  } catch {
    return { available: false }
  }
}

function compareCandidateSets(candidates, references) {
  const byHash = new Map()
  const byUrl = new Map()
  const byDate = Map.groupBy(references.filter((record) => record.date), (record) => record.date)
  for (const reference of references) {
    const hash = createHash('sha256').update(normalizeForHash(reference.text)).digest('hex')
    if (normalizeForHash(reference.text).length >= 40 && !byHash.has(hash)) byHash.set(hash, reference)
    for (const link of [reference.url, reference.sourcePageUrl, ...(reference.originalLinks ?? [])]) {
      const normalized = normalizeUrl(typeof link === 'string' ? link : link?.url)
      if (normalized && !byUrl.has(normalized)) byUrl.set(normalized, reference)
    }
  }
  const matches = candidates.map((candidate) => {
    const exact = byHash.get(candidate.contentSha256)
    if (exact) return { candidate, reference: exact, method: 'exact_text' }
    for (const link of candidate.originalLinks) {
      const byLink = byUrl.get(normalizeUrl(link))
      if (byLink) return { candidate, reference: byLink, method: 'media_url' }
    }
    const sameDate = (byDate.get(candidate.date) ?? [])
      .map((reference) => ({ reference, score: titleSimilarity(candidate.title, reference.title) }))
      .filter((match) => match.score >= 0.72)
      .toSorted((left, right) => right.score - left.score)
    if (sameDate.length && (sameDate.length === 1 || sameDate[0].score > sameDate[1].score)) {
      return { candidate, reference: sameDate[0].reference, method: 'date_title' }
    }
    return { candidate, reference: null, method: null }
  })
  const unmatched = matches.filter((match) => !match.reference).map((match) => match.candidate).toSorted((left, right) => right.charCount - left.charCount)
  return {
    available: true,
    referenceRecords: references.length,
    matched: matches.length - unmatched.length,
    unmatched: unmatched.length,
    matchMethods: countBy(matches.filter((match) => match.method), (match) => match.method),
    unmatchedSamples: unmatched.slice(0, 80).map(recordSummary),
  }
}

function recordSummary(record) {
  return {
    id: record.id,
    date: record.date,
    title: record.title,
    url: record.url,
    recordKind: record.recordKind,
    language: record.language,
    charCount: record.charCount,
    contentSha256: record.contentSha256,
    originalLinks: record.originalLinks,
  }
}

function classifyRecordKind(title) {
  if (/\bGETTR\b/iu.test(title)) return 'public_post_video'
  if (/直播|live\s*(?:broadcast|stream)/iu.test(title)) return 'full_broadcast'
  if (/小视频|短视频|short/iu.test(title)) return 'short_video'
  if (/采访|访谈|interview/iu.test(title)) return 'interview'
  return 'historical_video'
}

function detectLanguage(text) {
  const han = (text.match(/\p{Script=Han}/gu) ?? []).length
  const latin = (text.match(/[a-z]/giu) ?? []).length
  return latin > Math.max(300, han * 1.4) ? 'en' : han > 0 ? 'zh' : 'unknown'
}

function dateFromValue(value) {
  const match = String(value ?? '').normalize('NFKC').match(/(?<!\d)(20(?:17|18|19|20|21|22|23))[./_-]?(\d{2})[./_-]?(\d{2})(?!\d)/u)
  if (!match) return null
  const date = `${match[1]}-${match[2]}-${match[3]}`
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date ? date : null
}

function isCoverageDate(date) {
  return date >= '2017-01-26' && date <= '2023-03-14'
}

function isPublicUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

function normalizeUrl(value) {
  try {
    const parsed = new URL(value)
    parsed.hash = ''
    parsed.search = ''
    return `${parsed.hostname.toLowerCase().replace(/^www\./u, '')}${parsed.pathname.replace(/\/$/u, '')}`
  } catch {
    return null
  }
}

function normalizeWhitespace(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

function normalizeForHash(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, '')
}

function titleSimilarity(left, right) {
  const leftGrams = titleNgrams(left)
  const rightGrams = titleNgrams(right)
  if (!leftGrams.size || !rightGrams.size) return 0
  const intersection = [...leftGrams].filter((token) => rightGrams.has(token)).length
  return intersection / Math.max(leftGrams.size, rightGrams.size)
}

function titleNgrams(value) {
  const normalized = normalizeForHash(value).replace(/20(?:17|18|19|20|21|22|23)\d{4}/gu, '')
  if (normalized.length < 2) return new Set(normalized ? [normalized] : [])
  return new Set(Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2)))
}

function compareRecordQuality(left, right) {
  if (right.originalLinks.length !== left.originalLinks.length) return right.originalLinks.length - left.originalLinks.length
  if (right.charCount !== left.charCount) return right.charCount - left.charCount
  return left.url.localeCompare(right.url)
}

async function concurrentMap(items, size, worker) {
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor++
      await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run))
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback
}

function countBy(values, selector) {
  return Object.fromEntries([...Map.groupBy(values, selector).entries()].map(([key, group]) => [key, group.length]).toSorted(([left], [right]) => String(left).localeCompare(String(right))))
}

function reportProgress(done, total, label, charCount) {
  if (done === total || done % 25 === 0) process.stderr.write(`[bearblog] ${done}/${total} ${label} ${charCount}\n`)
}
