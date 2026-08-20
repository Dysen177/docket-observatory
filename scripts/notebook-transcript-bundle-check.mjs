import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { gunzip, gzip } from 'node:zlib'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const defaultBundleRoot = path.join(root, 'output', 'mega-guo-audit')
const bundleRoot = path.resolve(process.env.NOTEBOOK_TRANSCRIPT_BUNDLE_DIR ?? defaultBundleRoot)
const reportPath = path.resolve(process.env.NOTEBOOK_TRANSCRIPT_AUDIT_PATH ?? path.join(root, 'output', 'notebook-transcript-audit.json'))
const gunzipAsync = promisify(gunzip)
const gzipAsync = promisify(gzip)
const recordsPath = path.resolve(process.env.NOTEBOOK_TRANSCRIPT_RECORDS_PATH ?? path.join(root, 'output', 'notebook-transcript-records.json.gz'))
const manifestPath = path.join(root, 'server', 'public-record-transcripts', 'manifest.json')

const files = (await collectFiles(bundleRoot)).filter((filename) => filename.endsWith('.txt') && filename.includes(`${path.sep}18个文件${path.sep}`))
const sections = []
for (const filename of files) {
  sections.push(...parseBundleFile(await readFile(filename, 'utf8'), filename))
}

const usable = sections.filter((section) => section.charCount >= 40 && (!section.date || isCoverageDate(section.date)))
const byHash = Map.groupBy(usable, (section) => section.contentSha256)
const duplicateGroups = [...byHash.values()].filter((group) => group.length > 1)
const unique = [...byHash.values()].map((group) => group.toSorted(compareCandidateQuality)[0])
const byDate = Map.groupBy(unique.filter((section) => section.date), (section) => section.date)
const bySourceRecordId = Map.groupBy(unique.filter((section) => section.sourceRecordId), (section) => section.sourceRecordId)
const versionGroups = Map.groupBy(
  unique.filter((section) => section.sourceRecordId),
  (section) => `${section.sourceRecordId}\t${section.language}\t${section.textKind}`,
)
const selectedVersions = [...versionGroups.values()].map((group) => group.toSorted(compareCandidateQuality)[0])
const comparison = await compareWithCurrentCorpus(unique)
const report = {
  generatedAt: new Date().toISOString(),
  bundleRoot,
  files: files.length,
  parsedSections: sections.length,
  usableSections: usable.length,
  uniqueSections: unique.length,
  duplicateGroups: duplicateGroups.length,
  duplicateCopies: duplicateGroups.reduce((total, group) => total + group.length - 1, 0),
  totalCharacters: usable.reduce((total, section) => total + section.charCount, 0),
  uniqueCharacters: unique.reduce((total, section) => total + section.charCount, 0),
  datedSections: unique.filter((section) => section.date).length,
  undatedSections: unique.filter((section) => !section.date).length,
  dates: byDate.size,
  earliestDate: [...byDate.keys()].toSorted()[0] ?? null,
  latestDate: [...byDate.keys()].toSorted().at(-1) ?? null,
  dateCollisions: [...byDate.entries()].filter(([, group]) => group.length > 1).length,
  sourceRecordIds: bySourceRecordId.size,
  sectionsWithoutSourceRecordId: unique.filter((section) => !section.sourceRecordId).length,
  sourceRecordIdCollisions: [...bySourceRecordId.values()].filter((group) => group.length > 1).length,
  recordVersionGroups: versionGroups.size,
  supersededVersions: unique.filter((section) => section.sourceRecordId).length - selectedVersions.length,
  textKinds: countBy(unique, (section) => section.textKind),
  languages: countBy(unique, (section) => section.language),
  qualityWarnings: countBy(unique.flatMap((section) => section.qualityWarnings), (warning) => warning),
  comparison,
  sections: unique.map((section) => ({
    id: section.id,
    date: section.date,
    headingTitle: section.headingTitle,
    title: section.title,
    sourceRecordId: section.sourceRecordId,
    sourcePageUrl: section.sourcePageUrl,
    originalLinks: section.originalLinks,
    savedAt: section.savedAt,
    language: section.language,
    textKind: section.textKind,
    qualityWarnings: section.qualityWarnings,
    charCount: section.charCount,
    contentSha256: section.contentSha256,
    sourceFile: path.relative(bundleRoot, section.sourceFile).split(path.sep).join('/'),
    sourceOrdinal: section.sourceOrdinal,
  })),
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
await writeFile(recordsPath, await gzipAsync(Buffer.from(JSON.stringify({
  schemaVersion: 1,
  generatedAt: report.generatedAt,
  records: unique,
})), { level: 9 }))
process.stdout.write(`${JSON.stringify({ ...report, sections: undefined }, null, 2)}\n`)

async function collectFiles(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await collectFiles(filename))
    else if (entry.isFile()) output.push(filename)
  }
  return output
}

async function compareWithCurrentCorpus(candidates) {
  let manifest
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    return { available: false }
  }
  const current = []
  const shardNames = [...new Set((manifest.records ?? []).map((record) => record.dataShard).filter(Boolean))]
  for (const shardName of shardNames) {
    const records = JSON.parse((await gunzipAsync(await readFile(path.join(root, 'server', 'public-record-transcripts', shardName)))).toString('utf8'))
    current.push(...records)
  }
  const currentById = new Map(current.map((record) => [record.id, record]))
  const currentByDate = Map.groupBy(current, (record) => record.date)
  const currentByHash = Map.groupBy(current, (record) => normalizeForHash(record.segments?.map((segment) => segment.text).join('\n')))
  const currentByUrl = new Map()
  for (const record of current) {
    for (const link of [...(record.originalLinks ?? []), ...(record.transcriptSourceLinks ?? [])]) {
      const normalized = normalizeUrl(link?.url)
      if (normalized && !currentByUrl.has(normalized)) currentByUrl.set(normalized, record)
    }
  }
  const matches = candidates.map((candidate) => resolveCurrentMatch(candidate, { currentById, currentByDate, currentByHash, currentByUrl }))
  const confidentGroupMatches = Map.groupBy(
    matches.filter((match) => match.record && match.candidate.sourceRecordId),
    (match) => match.candidate.sourceRecordId,
  )
  for (const match of matches) {
    if (match.record || !match.candidate.sourceRecordId) continue
    const group = confidentGroupMatches.get(match.candidate.sourceRecordId) ?? []
    const currentIds = [...new Set(group.map((candidateMatch) => candidateMatch.record.id))]
    if (currentIds.length !== 1) continue
    match.record = group[0].record
    match.method = 'record_variant_group'
  }
  const matched = matches.filter((match) => match.record)
  const idMatched = matches.filter((match) => match.method === 'record_id')
  const exactTextMatches = candidates.filter((candidate) => currentByHash.has(normalizeForHash(candidate.text)) && normalizeForHash(candidate.text).length >= 40)
  const longerVersions = matched.filter(({ candidate, record }) => {
    return candidate.charCount >= Math.max(1000, Number(record?.charCount ?? 0) * 1.15)
  })
  const unmatchedIds = matches
    .filter((match) => match.candidate.sourceRecordId && !match.record)
    .map((match) => match.candidate)
    .toSorted((left, right) => right.charCount - left.charCount)
  const unmatchedUndated = matches
    .filter((match) => !match.candidate.date && !match.record)
    .map((match) => match.candidate)
    .toSorted((left, right) => right.charCount - left.charCount)
  const matchedSourceRecordIds = new Set(matched.map((match) => match.candidate.sourceRecordId).filter(Boolean))
  const unmatchedSourceRecordIds = [...new Set(candidates.map((candidate) => candidate.sourceRecordId).filter(Boolean))]
    .filter((sourceRecordId) => !matchedSourceRecordIds.has(sourceRecordId))
  const methodCounts = countBy(matched, (match) => match.method)
  return {
    available: true,
    currentRecords: current.length,
    matchedVersions: matched.length,
    matchMethods: methodCounts,
    idMatched: idMatched.length,
    idUnmatched: unmatchedIds.length,
    matchedSourceRecordIds: matchedSourceRecordIds.size,
    unmatchedSourceRecordIds: unmatchedSourceRecordIds.length,
    undatedUnmatched: unmatchedUndated.length,
    exactTextMatches: exactTextMatches.length,
    candidateLongerThanCurrent: longerVersions.length,
    unmatchedIdSamples: unmatchedIds.slice(0, 40).map(candidateSummary),
    undatedUnmatchedSamples: unmatchedUndated.slice(0, 40).map(candidateSummary),
    longerVersionSamples: longerVersions.toSorted((left, right) => right.candidate.charCount - left.candidate.charCount).slice(0, 40).map(({ candidate, record, method }) => ({
      ...candidateSummary(candidate),
      currentId: record.id,
      currentCharCount: record.charCount ?? null,
      matchMethod: method,
    })),
  }
}

function resolveCurrentMatch(candidate, indexes) {
  const normalizedText = normalizeForHash(candidate.text)
  const exact = normalizedText.length >= 40 ? indexes.currentByHash.get(normalizedText)?.[0] : null
  if (exact) return { candidate, record: exact, method: 'exact_text' }
  for (const link of [candidate.sourcePageUrl, ...candidate.originalLinks]) {
    const byUrl = indexes.currentByUrl.get(normalizeUrl(link))
    if (byUrl) return { candidate, record: byUrl, method: 'source_url' }
  }
  if (candidate.sourceRecordId && indexes.currentById.has(candidate.sourceRecordId)) {
    return { candidate, record: indexes.currentById.get(candidate.sourceRecordId), method: 'record_id' }
  }
  const sameDate = indexes.currentByDate.get(candidate.date) ?? []
  const titleMatches = sameDate
    .map((record) => ({ record, score: titleSimilarity(candidate.title, record.title) }))
    .filter((match) => match.score >= 0.7)
    .toSorted((left, right) => right.score - left.score)
  if (titleMatches.length && (titleMatches.length === 1 || titleMatches[0].score > titleMatches[1].score)) {
    return { candidate, record: titleMatches[0].record, method: 'date_title', titleScore: titleMatches[0].score }
  }
  return { candidate, record: null, method: null }
}

function candidateSummary(candidate) {
  return {
    sourceRecordId: candidate.sourceRecordId,
    date: candidate.date,
    title: candidate.title,
    charCount: candidate.charCount,
    language: candidate.language,
    textKind: candidate.textKind,
    qualityWarnings: candidate.qualityWarnings,
    sourcePageUrl: candidate.sourcePageUrl,
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

function parseBundleFile(source, sourceFile) {
  // Every heading must participate in slicing. Filtering undated headings before
  // slicing makes the previous dated item swallow one or more unrelated files.
  const headings = [...String(source).matchAll(/^=*[\t ]*【[\t ]*([^】\r\n]+?)[\t ]*】[\t ]*$/gmu)]
    .map((heading) => ({ heading, headingTitle: normalizeTitle(heading[1]) }))
  return headings.map((heading, index) => {
    const bodyStart = (heading.heading.index ?? 0) + heading.heading[0].length
    const bodyEnd = headings[index + 1]?.heading.index ?? source.length
    const extracted = extractBundleContent(source.slice(bodyStart, bodyEnd))
    const title = normalizeTitle(extracted.metadataTitle || heading.headingTitle)
    const date = dateFromTitle(title) ?? dateFromTitle(heading.headingTitle)
    const text = extracted.text
    const normalizedText = normalizeForHash(text)
    const language = detectLanguage(text, title)
    const textKind = classifyTextKind(text, title)
    const qualityWarnings = classifyQualityWarnings({ date, title, text, textKind, sourcePageUrl: extracted.sourcePageUrl })
    return {
      id: `notebook-${createHash('sha256').update(`${title}\n${normalizedText}`).digest('hex').slice(0, 16)}`,
      date,
      headingTitle: heading.headingTitle,
      title,
      sourceRecordId: sourceRecordIdFromTitle(title) ?? sourceRecordIdFromTitle(heading.headingTitle),
      sourcePageUrl: extracted.sourcePageUrl,
      originalLinks: extracted.originalLinks,
      savedAt: extracted.savedAt,
      language,
      textKind,
      qualityWarnings,
      text,
      charCount: [...text].length,
      contentSha256: createHash('sha256').update(normalizedText).digest('hex'),
      sourceFile,
      sourceOrdinal: index + 1,
    }
  })
}

function normalizeTitle(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\.txt$/iu, '')
    .replace(/(?:_?匹配)+$/u, '')
    .replace(/[\t ]+/gu, ' ')
    .trim()
}

function normalizeBody(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code === 0x09 || code === 0x0A || code === 0x0D || (code > 0x1F && code !== 0x7F)
    })
    .join('')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

function extractBundleContent(value) {
  const lines = String(value ?? '').normalize('NFKC').split(/\r?\n/u)
  let sourcePageUrl = null
  let savedAt = null
  let metadataTitle = null
  const originalLinks = []
  const bodyLines = []
  for (const rawLine of lines) {
    const line = rawLine.trim()
    const metadata = line.match(/^(标题|保存时间|来源|视频链接\d*)[:：][\t ]*(.*)$/u)
    if (!metadata) {
      bodyLines.push(rawLine)
      continue
    }
    const [, label, metadataValue] = metadata
    if (label === '标题') metadataTitle = metadataValue || null
    else if (label === '来源' && isHttpsUrl(metadataValue)) sourcePageUrl = metadataValue
    else if (label === '保存时间') savedAt = metadataValue || null
    else if (label.startsWith('视频链接') && isHttpsUrl(metadataValue)) originalLinks.push(metadataValue)
  }
  return {
    text: normalizeBody(bodyLines.join('\n')),
    metadataTitle,
    sourcePageUrl,
    originalLinks: [...new Set(originalLinks)],
    savedAt,
  }
}

function detectLanguage(text, title) {
  if (/(?:^|[^a-z])en(?:glish)?(?:[^a-z]|$)/iu.test(title) || /_e(?:\.|_|$)/iu.test(title)) return 'en'
  const han = (text.match(/\p{Script=Han}/gu) ?? []).length
  const latin = (text.match(/[a-z]/giu) ?? []).length
  return latin > Math.max(300, han * 1.4) ? 'en' : han > 0 ? 'zh' : 'unknown'
}

function classifyTextKind(text, title) {
  const srtCues = text.match(/(?:^|\n)\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}/gu) ?? []
  if (srtCues.length >= 3 || /匹配|simplified|traditional|subtitle|\bsrt\b/iu.test(title)) return 'subtitle_text'
  const timestamps = text.match(/(?:^|\n)[[(]?(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?[\])]?[\t ]+/gu) ?? []
  if (timestamps.length >= 5) return 'timecoded_transcript'
  return 'editorial_text'
}

function classifyQualityWarnings({ date, title, text, textKind, sourcePageUrl }) {
  const warnings = []
  const charCount = [...text].length
  if (!date) warnings.push('date_unresolved')
  if (!sourcePageUrl) warnings.push('source_page_missing')
  if (charCount > 180000) warnings.push('extreme_length_review')
  if (/\b(?:部分|节选|摘要|梳理|不全)\b|前半部不全|excerpt|summary|partial/iu.test(title)) warnings.push('title_claims_partial_or_summary')
  if (textKind === 'editorial_text' && charCount < 500) warnings.push('short_editorial_text')
  if (/^=*[\t ]*【[^】\r\n]+】[\t ]*$/mu.test(text)) warnings.push('embedded_heading')
  return warnings
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:'
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

function normalizeForHash(value) {
  return String(value ?? '').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, '')
}

function dateFromTitle(title) {
  const value = String(title).normalize('NFKC')
  const compact = value.match(/(?<!\d)(20(?:17|18|19|20|21|22|23))[./_-]?(\d{2})[./_-]?(\d{2})(?!\d)/u)
  const chinese = value.match(/(?<!\d)(20(?:17|18|19|20|21|22|23))年(\d{1,2})月(\d{1,2})日/u)
  const matched = compact ?? chinese
  if (!matched) return null
  const date = `${matched[1]}-${String(matched[2]).padStart(2, '0')}-${String(matched[3]).padStart(2, '0')}`
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(timestamp)) return null
  const parsed = new Date(timestamp)
  return parsed.toISOString().slice(0, 10) === date ? date : null
}

function isCoverageDate(date) {
  return date >= '2017-01-26' && date <= '2023-03-14'
}

function sourceRecordIdFromTitle(title) {
  const matched = String(title).normalize('NFKC').match(/(?<!\d)(20(?:17|18|19|20|21|22|23))[./_-]?(\d{2})[./_-]?(\d{2})(?:[_-](\d{1,2}))?(?!\d)/u)
  if (!matched) return null
  const date = `${matched[1]}-${matched[2]}-${matched[3]}`
  if (dateFromTitle(matched[0]) !== date) return null
  return `${date}-${Number(matched[4] ?? 1)}`
}

function compareCandidateQuality(left, right) {
  const warningDifference = left.qualityWarnings.length - right.qualityWarnings.length
  if (warningDifference) return warningDifference
  const kindPriority = { timecoded_transcript: 3, subtitle_text: 2, editorial_text: 1 }
  const kindDifference = (kindPriority[right.textKind] ?? 0) - (kindPriority[left.textKind] ?? 0)
  if (kindDifference) return kindDifference
  if (right.charCount !== left.charCount) return right.charCount - left.charCount
  return left.sourceFile.localeCompare(right.sourceFile) || left.sourceOrdinal - right.sourceOrdinal
}

function countBy(values, selector) {
  return Object.fromEntries([...Map.groupBy(values, selector).entries()].map(([key, group]) => [key, group.length]).toSorted(([left], [right]) => String(left).localeCompare(String(right))))
}
