import { createHash } from 'node:crypto'
import { gzip, gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const transcriptRoot = path.join(root, 'server', 'public-record-transcripts')
const manifestPath = path.join(transcriptRoot, 'manifest.json')
const sitemapCachePath = path.join(root, 'output', 'gwins-googlemap-1.xml')
const cacheRoot = path.join(root, 'output', 'gwins-transcript-gap-cache')
const reportPath = path.join(root, 'output', 'gwins-transcript-gap-audit.json')
const recordsPath = path.join(root, 'output', 'gwins-transcript-gap-records.json.gz')
const notebookRecordsPath = path.join(root, 'output', 'notebook-transcript-records.json.gz')
const gunzipAsync = promisify(gunzip)
const gzipAsync = promisify(gzip)
const concurrency = boundedInteger(process.env.GWINS_GAP_CONCURRENCY, 4, 1, 8)
const delayMs = boundedInteger(process.env.GWINS_GAP_DELAY_MS, 120, 0, 5000)
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0 Safari/537.36'

await mkdir(cacheRoot, { recursive: true })
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const current = await loadCurrentRecords(manifest)
const currentPageUrls = new Set(manifest.records.flatMap((record) => [...(record.originalLinks ?? []), ...(record.transcriptSourceLinks ?? [])])
  .map((link) => normalizeUrl(link.url))
  .filter((url) => url?.startsWith('gwins.org/cn/milesguo/')))
const sitemap = await readSitemap()
const pages = sitemap.filter((url) => !currentPageUrls.has(normalizeUrl(url)))
const records = []
const errors = []
let completed = 0

await concurrentMap(pages, concurrency, async (url) => {
  try {
    records.push(await readOrFetchPage(url))
  } catch (error) {
    errors.push({ url, error: String(error?.message ?? error) })
  }
  completed += 1
  if (completed === pages.length || completed % 25 === 0) process.stderr.write(`[gwins-gap] ${completed}/${pages.length}\n`)
})

records.sort((left, right) => String(left.date ?? '9999').localeCompare(String(right.date ?? '9999')) || left.url.localeCompare(right.url))
const comparison = compareWithCurrent(records, current)
const notebookComparison = await compareWithNotebook(records)
const generatedAt = new Date().toISOString()
const report = {
  schemaVersion: 1,
  generatedAt,
  sitemapPages: sitemap.length,
  currentGwinsPages: currentPageUrls.size,
  auditedGapPages: pages.length,
  fetchedPages: records.length,
  fetchErrors: errors.length,
  pagesWithReadableText: records.filter((record) => record.charCount >= 40).length,
  textCharacters: records.reduce((total, record) => total + record.charCount, 0),
  validChineseSubtitles: records.filter((record) => record.subtitleUrls.zh).length,
  validEnglishSubtitles: records.filter((record) => record.subtitleUrls.en).length,
  comparison,
  notebookComparison,
  errors,
  records: records.map(recordSummary),
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
await writeFile(recordsPath, await gzipAsync(Buffer.from(JSON.stringify({ schemaVersion: 1, generatedAt, records })), { level: 9 }))
process.stdout.write(`${JSON.stringify({ ...report, records: undefined }, null, 2)}\n`)

async function readSitemap() {
  let xml
  try {
    xml = await readFile(sitemapCachePath, 'utf8')
  } catch {
    const response = await fetch('https://gwins.org/googlemap_1.xml', { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`Sitemap HTTP ${response.status}`)
    xml = await response.text()
    await writeFile(sitemapCachePath, xml, 'utf8')
  }
  return [...new Set(xml.match(/https:\/\/gwins\.org\/cn\/milesguo\/\d+\.html/gu) ?? [])].toSorted()
}

async function loadCurrentRecords(currentManifest) {
  const records = []
  const shardNames = [...new Set(currentManifest.records.map((record) => record.dataShard).filter(Boolean))]
  for (const shardName of shardNames) {
    records.push(...JSON.parse((await gunzipAsync(await readFile(path.join(transcriptRoot, shardName)))).toString('utf8')))
  }
  return records
}

async function readOrFetchPage(url) {
  const cachePath = path.join(cacheRoot, `${createHash('sha256').update(url).digest('hex')}.json`)
  try {
    return JSON.parse(await readFile(cachePath, 'utf8'))
  } catch {
    // Cache miss; fetch the public page below.
  }
  if (delayMs) await sleep(delayMs)
  const response = await fetch(url, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const record = parsePage(await response.text(), url)
  await writeFile(cachePath, `${JSON.stringify(record)}\n`, 'utf8')
  return record
}

function parsePage(html, url) {
  const $ = cheerio.load(html)
  const title = normalizeWhitespace($('h1 .title').first().text() || $('h1').first().text() || $('title').text())
  const metadata = $('#m_t1').first()
  const publishedText = metadata.find('dd').filter((_, element) => normalizeWhitespace($(element).text()).startsWith('发布时间:')).first().text()
  const date = dateFromValue(publishedText) ?? dateFromValue(title)
  const originalLinks = metadata.find('a[href]').map((_, element) => absoluteUrl($(element).attr('href'))).get().filter(isPublicMediaUrl)
  const subtitleUrls = { zh: null, en: null }
  for (const element of metadata.find('dd').toArray()) {
    const label = normalizeWhitespace($(element).clone().children().remove().end().text())
    const href = absoluteUrl($(element).find('a[href]').attr('href'))
    if (!isValidSubtitleUrl(href)) continue
    if (label.includes('中文字幕')) subtitleUrls.zh = href
    if (label.includes('英文字幕')) subtitleUrls.en = href
  }
  const summaryHeading = $('dt').filter((_, element) => normalizeWhitespace($(element).text()).includes('内容梗概')).first()
  const text = summaryHeading.next('dd').find('div, p').map((_, element) => normalizeWhitespace($(element).text())).get().filter(Boolean).join('\n')
    || normalizeWhitespace(summaryHeading.next('dd').text())
  return {
    id: `gwins-${new URL(url).pathname.match(/(\d+)\.html/u)?.[1] ?? createHash('sha256').update(url).digest('hex').slice(0, 12)}`,
    url,
    date,
    title,
    language: detectLanguage(text),
    text,
    charCount: [...text].length,
    contentSha256: createHash('sha256').update(normalizeForHash(text)).digest('hex'),
    originalLinks: [...new Set(originalLinks)],
    subtitleUrls,
  }
}

function compareWithCurrent(candidates, references) {
  const byHash = new Map()
  const byMediaUrl = new Map()
  const byDate = Map.groupBy(references.filter((record) => record.date), (record) => record.date)
  for (const reference of references) {
    const normalizedText = normalizeForHash(reference.segments?.map((segment) => segment.text).join('\n'))
    if (normalizedText.length >= 40) byHash.set(createHash('sha256').update(normalizedText).digest('hex'), reference)
    for (const link of reference.originalLinks ?? []) {
      const normalized = normalizeUrl(link.url)
      if (normalized && !byMediaUrl.has(normalized)) byMediaUrl.set(normalized, reference)
    }
  }
  const matches = candidates.map((candidate) => {
    const exact = candidate.charCount >= 40 ? byHash.get(candidate.contentSha256) : null
    if (exact) return { candidate, reference: exact, method: 'exact_text' }
    for (const link of candidate.originalLinks) {
      const match = byMediaUrl.get(normalizeUrl(link))
      if (match) return { candidate, reference: match, method: 'media_url' }
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
  const unmatched = matches.filter((match) => !match.reference).map((match) => match.candidate)
  return {
    matched: matches.length - unmatched.length,
    unmatched: unmatched.length,
    matchMethods: countBy(matches.filter((match) => match.method), (match) => match.method),
    unmatchedSamples: unmatched.toSorted((left, right) => right.charCount - left.charCount).slice(0, 100).map(recordSummary),
  }
}

async function compareWithNotebook(candidates) {
  try {
    const notebook = JSON.parse((await gunzipAsync(await readFile(notebookRecordsPath))).toString('utf8'))
    const references = notebook.records ?? []
    const byPageUrl = new Map(references.map((record) => [normalizeUrl(record.sourcePageUrl), record]).filter(([url]) => url))
    const byHash = new Map(references.filter((record) => record.charCount >= 40).map((record) => [record.contentSha256, record]))
    const matches = candidates.map((candidate) => {
      const byPage = byPageUrl.get(normalizeUrl(candidate.url))
      if (byPage) return { candidate, reference: byPage, method: 'source_page' }
      const exact = candidate.charCount >= 40 ? byHash.get(candidate.contentSha256) : null
      if (exact) return { candidate, reference: exact, method: 'exact_text' }
      return { candidate, reference: null, method: null }
    })
    const unmatched = matches.filter((match) => !match.reference).map((match) => match.candidate)
    return {
      available: true,
      matched: matches.length - unmatched.length,
      unmatched: unmatched.length,
      matchMethods: countBy(matches.filter((match) => match.method), (match) => match.method),
      unmatchedSamples: unmatched.toSorted((left, right) => right.charCount - left.charCount).slice(0, 100).map(recordSummary),
    }
  } catch {
    return { available: false }
  }
}

function recordSummary(record) {
  return {
    id: record.id,
    url: record.url,
    date: record.date,
    title: record.title,
    language: record.language,
    charCount: record.charCount,
    contentSha256: record.contentSha256,
    originalLinks: record.originalLinks,
    subtitleUrls: record.subtitleUrls,
  }
}

function absoluteUrl(value) {
  try {
    return new URL(value, 'https://gwins.org').href
  } catch {
    return null
  }
}

function isPublicMediaUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./u, '')
    return ['youtube.com', 'youtu.be', 'rumble.com', 'gettr.com', 'odysee.com', 'twitter.com', 'x.com'].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

function isValidSubtitleUrl(value) {
  if (!value) return false
  try {
    const parsed = new URL(value)
    const basename = parsed.pathname.split('/').at(-1)
    return parsed.protocol === 'https:' && Boolean(basename && !['.srt', '_e.srt'].includes(basename) && basename.endsWith('.srt'))
  } catch {
    return false
  }
}

function dateFromValue(value) {
  const match = String(value ?? '').normalize('NFKC').match(/(?<!\d)(20(?:17|18|19|20|21|22|23))[./_-]?(\d{2})[./_-]?(\d{2})(?!\d)/u)
  if (!match) return null
  const date = `${match[1]}-${match[2]}-${match[3]}`
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date ? date : null
}

function detectLanguage(text) {
  const han = (text.match(/\p{Script=Han}/gu) ?? []).length
  const latin = (text.match(/[a-z]/giu) ?? []).length
  return latin > Math.max(300, han * 1.4) ? 'en' : han > 0 ? 'zh' : 'unknown'
}

function normalizeWhitespace(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

function normalizeForHash(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, '')
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

async function concurrentMap(items, size, worker) {
  let cursor = 0
  async function run() {
    while (cursor < items.length) await worker(items[cursor++])
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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
