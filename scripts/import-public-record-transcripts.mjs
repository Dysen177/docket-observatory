import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { gzip } from 'node:zlib'
import { promisify } from 'node:util'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { x as extractTar } from 'tar'
import * as cheerio from 'cheerio'

const gzipAsync = promisify(gzip)
const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outputDir = path.resolve(process.env.TRANSCRIPT_OUTPUT_DIR ?? path.join(root, 'server', 'public-record-transcripts'))
const workDir = path.resolve(process.env.TRANSCRIPT_IMPORT_CACHE_DIR ?? path.join(root, 'output', 'transcript-import-cache'))
const archiveOrigin = 'https://ghot.ai'
const archiveDataUrl = `${archiveOrigin}/static/data/archive-videos.js`
const communityArchiveOrigin = 'https://mubeitech.com'
const communityArchiveIndexUrl = `${communityArchiveOrigin}/api/live`
const legacyTranscriptRepository = 'https://github.com/qiuwenhuifx/txt'
const legacyTranscriptArchiveUrl = 'https://codeload.github.com/qiuwenhuifx/txt/tar.gz/refs/heads/master'
const legacyTranscriptSources = [
  {
    ownerRepo: 'qiuwenhuifx/txt',
    repositoryUrl: legacyTranscriptRepository,
    archiveUrl: legacyTranscriptArchiveUrl,
    branch: 'master',
    checkout: 'archive',
  },
  {
    ownerRepo: 'georgejerry/txt',
    repositoryUrl: 'https://github.com/georgejerry/txt',
    branch: 'master',
    checkout: 'sparse-git',
  },
  {
    ownerRepo: 'chinatwtparty.blogspot.com',
    repositoryUrl: 'https://chinatwtparty.blogspot.com',
    sitemapUrl: 'https://chinatwtparty.blogspot.com/sitemap.xml',
    checkout: 'blogger',
  },
]
const publicPostRepository = 'https://github.com/Royguo0317/txt'
const publicPostBranch = 'master'
const corpusPath = path.join(root, 'server', 'public-record-corpus.json')
const concurrency = boundedInteger(argumentValue('concurrency'), 3, 1, 6)
const limit = boundedInteger(argumentValue('limit'), Number.MAX_SAFE_INTEGER, 1, Number.MAX_SAFE_INTEGER)
const force = process.argv.includes('--force')
const refreshPublicSubtitles = process.argv.includes('--refresh-public-subtitles')
const auditAllPublicSubtitles = process.argv.includes('--audit-all-public-subtitles')
const refreshCommunityTranscripts = process.argv.includes('--refresh-community-transcripts')
const forceCommunityTranscripts = process.argv.includes('--force-community-transcripts')
const refreshLegacyTranscripts = process.argv.includes('--refresh-legacy-transcripts')
const refreshPublicPosts = process.argv.includes('--refresh-public-posts')
const requestDelayMs = boundedInteger(argumentValue('delay-ms'), 180, 0, 5000)
const fetchableTranscriptStatuses = new Set(['done', 'preexisting', 'hidden'])
const communityOverlayPath = path.join(workDir, 'community-overlay.json')
const communityDetailDir = path.join(workDir, 'community-details')
const legacyOverlayPath = path.join(workDir, 'legacy-transcript-overlay.json')
const legacyArchivePath = path.join(workDir, 'legacy-transcript-source.tar.gz')
const legacySourceDir = path.join(workDir, 'legacy-transcript-source')
const publicPostOverlayPath = path.join(workDir, 'public-post-overlay.json')
const publicPostSourceDir = path.join(workDir, 'public-post-source')
const verifiedTranscriptCorrections = [
  {
    id: '2022-01-17-2',
    durationSec: 123.922,
    minimumImprovementRatio: 2,
    segments: [
      { start: 67.3, end: 73.225, text: '兄弟姐妹们 要想征服敌人你不征服自己能行吗' },
      { start: 76.2, end: 80.575, text: '兄弟姐妹们 任何情况下别忘了健身' },
      { start: 82.4, end: 85.457, text: '今天大直播有很多战友流泪' },
      { start: 86.289, end: 89.361, text: '流泪没比中国人流的再多的了' },
      { start: 91.089, end: 94.225, text: '你只流泪你的敌人要你流血' },
      { start: 95.185, end: 98.321, text: '你跪下来他要打断你的脊椎' },
      { start: 99.281, end: 102.609, text: '只有铲除敌人 消灭敌人' },
      { start: 103.185, end: 107.345, text: '征服敌人你才能不流泪' },
      { start: 107.857, end: 109.457, text: '让你家人不流血' },
      { start: 110.161, end: 111.697, text: '那就先征服自己' },
      { start: 112.273, end: 116.561, text: '兄弟姐妹们 一切都已经开始' },
    ],
  },
]
const highConfidenceTranscriptCorrections = [
  [/洗联储/gu, '喜联储'],
  [/洗聯儲/gu, '喜聯儲'],
  [/洗币/gu, '喜币'],
  [/洗幣/gu, '喜幣'],
  [/洗美元/gu, '喜美元'],
  [/盗过贼/gu, '盗国贼'],
  [/盜過賊/gu, '盜國賊'],
  [/买美贼/gu, '卖美贼'],
  [/買美賊/gu, '賣美賊'],
  [/法治经(?=法治社会|法治基金|工作人员|那些|的人|开始|以来)/gu, '法治基金'],
  [/稳定比(?=,|，|。|可以|能够|能|和|、|金|随时|未来)/gu, '稳定币'],
  [/金比(?=,|，|。|可以|能够|能|和|、|随时|未来)/gu, '金币'],
  [/财富的努力/gu, '财富的奴隶'],
]

await mkdir(outputDir, { recursive: true })
await mkdir(workDir, { recursive: true })
if (refreshCommunityTranscripts) await mkdir(communityDetailDir, { recursive: true })

const [catalog, publicCorpus] = await Promise.all([
  fetchCatalog(),
  readFile(corpusPath, 'utf8').then(JSON.parse),
])
const matchIndex = buildPublicRecordMatchIndex(publicCorpus.records ?? [])
const records = catalog.records.slice(0, limit)
let imported = []
let completed = 0

await concurrentMap(records, concurrency, async (record) => {
  const cached = await readCachedRecord(record.id)
  const cachedNeedsMetadata = cached?.transcriptStatus === 'missing' && !cached.originalLinks?.length
  const cachedSkippedPublicTranscript = cached?.transcriptStatus !== 'available' && record.sttStatus === 'hidden'
  if (cached && !force && !cachedNeedsMetadata && !cachedSkippedPublicTranscript) {
    let normalized = normalizeCachedRecord(cached)
    if (refreshPublicSubtitles && (auditAllPublicSubtitles ? hasPublicSubtitlePage(normalized) : needsPublicSubtitleAudit(normalized))) {
      normalized = await enrichWithPublicSubtitle(normalized)
      await writeFile(cachePath(record.id), `${JSON.stringify(normalized)}\n`, 'utf8')
    }
    imported.push(normalized)
    reportProgress(++completed, records.length, record.id, normalized.publicSubtitleAudit?.selected ? 'public-subtitle' : 'cached')
    return
  }

  let result = await importRecord(record, matchIndex)
  if (refreshPublicSubtitles && (auditAllPublicSubtitles ? hasPublicSubtitlePage(result) : needsPublicSubtitleAudit(result))) result = await enrichWithPublicSubtitle(result)
  imported.push(result)
  await writeFile(cachePath(record.id), `${JSON.stringify(result)}\n`, 'utf8')
  reportProgress(++completed, records.length, record.id, result.transcriptStatus)
})

imported.sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
let communityAudit = null
if (refreshCommunityTranscripts) {
  const overlay = await refreshCommunityTranscriptOverlay(imported, matchIndex)
  communityAudit = overlay.audit
  imported.push(...overlay.syntheticRecords)
  await writeFile(communityOverlayPath, `${JSON.stringify(overlay)}\n`, 'utf8')
  } else {
    const overlay = await readCommunityOverlay()
    communityAudit = overlay?.audit ?? null
    imported.push(...(overlay?.syntheticRecords ?? []))
  }

let legacyAudit = null
if (refreshLegacyTranscripts) {
  const overlay = await refreshLegacyTranscriptOverlay(imported, matchIndex)
  legacyAudit = overlay.audit
  applyLegacyTranscriptOverlay(imported, overlay)
  await writeFile(legacyOverlayPath, `${JSON.stringify(overlay)}\n`, 'utf8')
} else {
  const overlay = await readLegacyTranscriptOverlay()
  legacyAudit = overlay?.audit ?? null
  if (overlay) applyLegacyTranscriptOverlay(imported, overlay)
}

let publicPostAudit = null
if (refreshPublicPosts) {
  const overlay = await refreshPublicPostOverlay(imported, matchIndex)
  publicPostAudit = overlay.audit
  imported.push(...overlay.syntheticRecords)
  await writeFile(publicPostOverlayPath, `${JSON.stringify(overlay)}\n`, 'utf8')
} else {
  const overlay = await readPublicPostOverlay()
  publicPostAudit = overlay?.audit ?? null
  imported.push(...(overlay?.syntheticRecords ?? []))
}

applyVerifiedTranscriptCorrections(imported)

imported = imported.map((record) => stripVerificationSourceMetadata(normalizeCachedRecord(record)))
imported.sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
const linkedEquivalentTranscripts = linkEquivalentTranscripts(imported)
const upgradedSparseTranscripts = linkSparseEquivalentTranscripts(imported)
const available = imported.filter((record) => record.transcriptStatus === 'available')
for (const record of imported) Object.assign(record, classifyTranscriptRecord(record))
const byYear = Map.groupBy(available, (record) => record.date.slice(0, 4))
const shardSummaries = []
const storageMetadata = new Map()

for (const [year, yearRecords] of [...byYear.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  const searchFilename = `${year}.search.bin`
  const searchChunks = []
  let searchOffset = 0
  for (const record of yearRecords) {
    const searchChunk = Buffer.from(normalizeSearchDocument(record), 'utf8')
    storageMetadata.set(record.id, {
      dataShard: `${year}.json.gz`,
      searchShard: searchFilename,
      searchOffset,
      searchLength: searchChunk.length,
    })
    searchChunks.push(searchChunk)
    searchOffset += searchChunk.length
  }
  const serialized = JSON.stringify(yearRecords)
  const compressed = await gzipAsync(Buffer.from(serialized), { level: 9 })
  await atomicBufferWrite(path.join(outputDir, `${year}.json.gz`), compressed)
  await atomicBufferWrite(path.join(outputDir, searchFilename), Buffer.concat(searchChunks, searchOffset))
  shardSummaries.push({
    id: year,
    dataFilename: `${year}.json.gz`,
    searchFilename,
    recordCount: yearRecords.length,
    dataBytes: compressed.length,
    searchBytes: searchOffset,
  })
}

function normalizeCachedRecord(record) {
  const segments = normalizeSegmentCandidates(record.segments)
  const joined = segments.map((segment) => `${segment.start}\t${segment.end}\t${segment.text}`).join('\n')
  const transcriptEnd = finiteNumber(segments.at(-1)?.end ?? segments.at(-1)?.start)
  const strictBoundary = record.transcriptSourceType !== 'public_subtitle'
    || transcriptBoundaryFitsDuration({ end: transcriptEnd }, record.durationSec)
  return {
    ...record,
    title: normalizeTranscriptText(record.title),
    segments,
    transcriptBoundaryVerified: strictBoundary ? Boolean(record.transcriptBoundaryVerified) : false,
    publicSubtitleAudit: record.publicSubtitleAudit && !strictBoundary
      ? { ...record.publicSubtitleAudit, boundaryVerified: false }
      : record.publicSubtitleAudit,
    charCount: segments.reduce((count, segment) => count + segment.text.length, 0),
    contentSha256: segments.length ? createHash('sha256').update(joined).digest('hex') : null,
    upstreamTranscriptStatus: record.upstreamTranscriptStatus
      ?? (record.transcriptStatus === 'available' ? 'available' : record.transcriptStatus),
  }
}

function classifyTranscriptRecord(record) {
  if (record?.transcriptSourceType === 'public_post_caption') {
    return {
      recordKind: 'public_post',
      durationQuality: 'unknown',
      transcriptQuality: record.segments?.length ? 'plausible' : 'unknown',
      transcriptQualityReasons: [],
      transcriptStartSec: null,
      transcriptEndSec: null,
      transcriptSpanRatio: null,
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

function analyzeTranscriptCoverage(record, durationQuality) {
  const duration = Number(record?.durationSec)
  const hasDuration = Number.isFinite(duration) && duration > 0
  const segments = Array.isArray(record?.segments) ? record.segments : []
  const firstStart = finiteNumber(segments[0]?.start)
  const lastEnd = finiteNumber(segments.at(-1)?.end ?? segments.at(-1)?.start)
  const charCount = Number(record?.charCount)
  const reasons = []
  if (durationQuality === 'suspiciously_short') reasons.push('suspicious_duration')
  if (!record?.transcriptBoundaryVerified && hasDuration && lastEnd !== null && lastEnd > duration + 5) reasons.push('timeline_overrun')
  if (!record?.transcriptBoundaryVerified && hasDuration && firstStart !== null && duration >= 1800 && firstStart > 600 && firstStart / duration > 0.08) reasons.push('late_start')
  if (!record?.transcriptBoundaryVerified && hasDuration && lastEnd !== null && duration >= 1800 && lastEnd < duration - 600 && (duration - lastEnd) / duration > 0.08) reasons.push('early_end')
  const transcriptSpanRatio = hasDuration && firstStart !== null && lastEnd !== null
    ? Math.max(0, Math.min(lastEnd, duration) - Math.max(0, firstStart)) / duration
    : null
  if (!record?.transcriptBoundaryVerified && hasDuration && duration >= 600 && transcriptSpanRatio !== null && transcriptSpanRatio < 0.65) reasons.push('short_span')
  const charsPerMinute = hasDuration && Number.isFinite(charCount) ? charCount / (duration / 60) : null
  if (duration >= 1800 && charsPerMinute !== null && charsPerMinute < 50) reasons.push('sparse_text')
  const incompleteReasons = reasons.filter((reason) => reason !== 'timeline_overrun')
  return {
    transcriptQuality: incompleteReasons.length ? 'possibly_incomplete' : (segments.length ? 'plausible' : 'unknown'),
    transcriptQualityReasons: [...new Set(reasons)],
    transcriptStartSec: firstStart,
    transcriptEndSec: lastEnd,
    transcriptSpanRatio,
  }
}

const liveShardNames = new Set(shardSummaries.flatMap((item) => [item.dataFilename, item.searchFilename]))
for (const year of ['2017', '2018', '2019', '2020', '2021', '2022', '2023']) {
  for (const filename of [`${year}.json.gz`, `${year}.records.bin`, `${year}.search.bin`]) {
    if (!liveShardNames.has(filename)) await rm(path.join(outputDir, filename), { force: true })
  }
}

const duplicateHashes = duplicateHashGroups(available)
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  coverage: {
    start: '2017-01-26',
    end: '2023-03-14',
    catalogRecords: catalog.records.length,
    catalogTranscriptComplete: catalog.stats.sttDone ?? null,
    importedRecords: imported.length,
    availableTranscripts: available.length,
    missingTranscripts: imported.length - available.length,
    catalogMissingTranscripts: imported.filter((record) => record.upstreamTranscriptStatus === 'missing').length,
    emptyTranscripts: imported.filter((record) => record.upstreamTranscriptStatus === 'empty').length,
    linkedEquivalentTranscripts,
    upgradedSparseTranscripts,
    matchedPublicRecords: available.filter((record) => record.matchedPublicRecordId).length,
    transcriptsWithExternalLinks: available.filter((record) => record.originalLinks.length > 0 || record.transcriptSourceLinks?.length > 0).length,
    duplicateTranscriptGroups: duplicateHashes.length,
    fullBroadcasts: available.filter((record) => record.recordKind === 'full_broadcast').length,
    excerptsAndShortVideos: available.filter((record) => ['broadcast_excerpt', 'short_video'].includes(record.recordKind)).length,
    suspiciouslyShort: available.filter((record) => record.durationQuality === 'suspiciously_short').length,
    possiblyIncomplete: available.filter((record) => record.transcriptQuality === 'possibly_incomplete').length,
    unknownKinds: available.filter((record) => record.recordKind === 'unknown').length,
    communityMatchedRecords: communityAudit?.metadataMatchedRecords ?? imported.filter((record) => record.communityTranscriptAudit?.matched).length,
    communitySelectedTranscripts: imported.filter((record) => record.transcriptSourceType === 'community_human_transcript').length,
    communityAddedRecords: imported.filter((record) => record.communityTranscriptAudit?.synthetic).length,
    legacyMatchedRecords: legacyAudit?.matchedRecords ?? imported.filter((record) => record.legacyTranscriptAudit?.matched).length,
    legacySelectedTranscripts: imported.filter((record) => record.transcriptSourceType === 'legacy_human_transcript').length,
    legacyAddedRecords: imported.filter((record) => record.legacyTranscriptAudit?.synthetic).length,
    publicPostRecords: imported.filter((record) => record.transcriptSourceType === 'public_post_caption').length,
    publicPostCharacters: imported.filter((record) => record.transcriptSourceType === 'public_post_caption')
      .reduce((total, record) => total + (Number(record.charCount) || 0), 0),
    transcriptCharacters: available.reduce((total, record) => total + (Number(record.charCount) || 0), 0),
  },
  shards: shardSummaries,
  records: imported.map((record) => ({
    id: record.id,
    date: record.date,
    title: record.title,
    durationSec: record.durationSec,
    language: record.language,
    transcriptStatus: record.transcriptStatus,
    upstreamTranscriptStatus: record.upstreamTranscriptStatus,
    completeness: record.completeness,
    recordKind: record.recordKind,
    durationQuality: record.durationQuality,
    transcriptQuality: record.transcriptQuality,
    transcriptQualityReasons: record.transcriptQualityReasons,
    transcriptStartSec: record.transcriptStartSec,
    transcriptEndSec: record.transcriptEndSec,
    transcriptSpanRatio: record.transcriptSpanRatio,
    transcriptBoundaryVerified: Boolean(record.transcriptBoundaryVerified),
    transcriptSourceType: record.transcriptSourceType ?? null,
    publicSubtitleAudit: record.publicSubtitleAudit ?? null,
    communityTranscriptAudit: record.communityTranscriptAudit ?? null,
    legacyTranscriptAudit: record.legacyTranscriptAudit ?? null,
    publicPostAudit: record.publicPostAudit ?? null,
    ...(storageMetadata.get(record.id) ?? {
      dataShard: null,
      dataOffset: null,
      dataLength: null,
      searchShard: null,
      searchOffset: null,
      searchLength: null,
    }),
    segmentCount: record.segments.length,
    charCount: record.charCount,
    contentSha256: record.contentSha256,
    matchedPublicRecordId: record.matchedPublicRecordId,
    originalLinks: record.originalLinks,
    transcriptSourceLinks: record.transcriptSourceLinks ?? [],
    importError: record.importError,
    linkedTranscriptId: record.linkedTranscriptId ?? null,
  })),
  audit: {
    upstreamCatalogUrl: archiveDataUrl,
    importedAt: new Date().toISOString(),
    duplicateHashes,
    communityArchive: communityAudit,
    legacyTranscriptArchive: legacyAudit,
    publicPostArchive: publicPostAudit,
  },
}
await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(manifest.coverage, null, 2)}\n`)

async function importRecord(record, matchIndex) {
  const transcriptIsFetchable = fetchableTranscriptStatuses.has(record.sttStatus) && Boolean(record.transcriptUrl)
  const base = {
    id: record.id,
    date: record.date,
    title: normalizeWhitespace(record.title),
    durationSec: finiteNumber(record.durationSec),
    language: record.language || 'unknown',
    transcriptStatus: 'missing',
    upstreamTranscriptStatus: transcriptIsFetchable ? 'pending_fetch' : 'missing',
    completeness: transcriptIsFetchable ? 'catalog_complete' : 'catalog_missing',
    matchedPublicRecordId: null,
    originalLinks: [],
    segments: [],
    charCount: 0,
    contentSha256: null,
    importError: null,
    sourceAudit: {
      catalogId: record.id,
      catalogPage: `${archiveOrigin}/archive/videos/${encodeURIComponent(record.id)}`,
      transcriptUrl: record.transcriptUrl ? new URL(record.transcriptUrl, archiveOrigin).toString() : null,
      fetchedAt: new Date().toISOString(),
    },
  }
  const metadata = await fetchJson(new URL(`/api/videos/${encodeURIComponent(record.id)}`, archiveOrigin)).catch(() => null)
  const originalLinks = collectOriginalLinks(metadata?.record)
  const matchedPublicRecordId = matchPublicRecord(record, originalLinks, matchIndex)
  if (!transcriptIsFetchable) {
    return { ...base, originalLinks, matchedPublicRecordId }
  }

  try {
    const transcript = await fetchJson(new URL(record.transcriptUrl, archiveOrigin))
    const segments = normalizeSegments(transcript)
    const joined = segments.map((segment) => `${segment.start}\t${segment.end}\t${segment.text}`).join('\n')
    return {
      ...base,
      transcriptStatus: segments.length ? 'available' : 'empty',
      upstreamTranscriptStatus: segments.length ? (record.sttStatus === 'hidden' ? 'hidden_available' : 'available') : 'empty',
      completeness: segments.length ? (transcript.source || 'available') : 'empty',
      matchedPublicRecordId,
      originalLinks,
      segments,
      charCount: segments.reduce((count, segment) => count + segment.text.length, 0),
      contentSha256: segments.length ? createHash('sha256').update(joined).digest('hex') : null,
    }
  } catch (error) {
    return { ...base, transcriptStatus: 'error', upstreamTranscriptStatus: 'error', completeness: 'import_error', originalLinks, matchedPublicRecordId, importError: String(error?.message ?? error).slice(0, 500) }
  }
}

function needsPublicSubtitleAudit(record) {
  if (!hasPublicSubtitlePage(record)) return false
  if (record.publicSubtitleAudit) {
    const invalidSelectedSubtitle = record.publicSubtitleAudit.selected && !transcriptFitsDuration(record.publicSubtitleAudit, record.durationSec)
    const placeholderFailure = record.publicSubtitleAudit.status === 'error' && /\/\.srt returned HTTP 404/u.test(record.publicSubtitleAudit.error ?? '')
    return invalidSelectedSubtitle || placeholderFailure
  }
  if (record.transcriptStatus !== 'available') return true
  return Number(record.durationSec) >= 3600 && classifyTranscriptRecord(record).transcriptQuality === 'possibly_incomplete'
}

function hasPublicSubtitlePage(record) {
  return Boolean(record?.originalLinks?.some((link) => link.platform === 'gwins.org'))
}

async function enrichWithPublicSubtitle(record) {
  const pageUrl = record.originalLinks.find((link) => link.platform === 'gwins.org')?.url
  const fetchedAt = new Date().toISOString()
  if (!pageUrl) return record
  try {
    const baseline = record.transcriptSourceType === 'public_subtitle' && !transcriptFitsDuration(record.publicSubtitleAudit, record.durationSec)
      ? await restoreArchiveTranscript(record)
      : record
    const html = await fetchPublicText(new URL(pageUrl), 'text/html')
    const subtitleUrl = extractChineseSubtitleUrl(html, pageUrl)
    if (!subtitleUrl) return { ...baseline, publicSubtitleAudit: { pageUrl, subtitleUrl: null, status: 'unavailable', selected: false, boundaryVerified: false, fetchedAt } }
    const subtitleText = await fetchPublicText(new URL(subtitleUrl), 'text/plain')
    const segments = parseSrtSegments(subtitleText)
    if (!segments.length) return { ...baseline, publicSubtitleAudit: { pageUrl, subtitleUrl, status: 'empty', selected: false, boundaryVerified: false, fetchedAt } }
    const candidate = transcriptMetrics(segments, baseline.durationSec)
    const current = transcriptMetrics(baseline.segments, baseline.durationSec)
    const boundaryVerified = transcriptBoundaryFitsDuration(candidate, baseline.durationSec) && transcriptBoundariesAgree(current, candidate, baseline.durationSec)
    const selected = shouldPreferPublicSubtitle(baseline, current, candidate)
    const publicSubtitleAudit = {
      pageUrl,
      subtitleUrl,
      status: 'available',
      selected,
      boundaryVerified,
      segmentCount: segments.length,
      charCount: candidate.charCount,
      start: candidate.start,
      end: candidate.end,
      spanRatio: candidate.spanRatio,
      fetchedAt,
    }
    if (!selected) return { ...baseline, transcriptBoundaryVerified: baseline.transcriptBoundaryVerified || boundaryVerified, publicSubtitleAudit }
    const joined = segments.map((segment) => `${segment.start}\t${segment.end}\t${segment.text}`).join('\n')
    return {
      ...baseline,
      transcriptStatus: 'available',
      completeness: 'verified_public_subtitle',
      transcriptSourceType: 'public_subtitle',
      transcriptBoundaryVerified: boundaryVerified,
      segments,
      charCount: candidate.charCount,
      contentSha256: createHash('sha256').update(joined).digest('hex'),
      publicSubtitleAudit,
    }
  } catch (error) {
    return { ...record, publicSubtitleAudit: { pageUrl, subtitleUrl: null, status: 'error', selected: false, boundaryVerified: false, error: String(error?.message ?? error).slice(0, 300), fetchedAt } }
  }
}

function extractChineseSubtitleUrl(html, pageUrl) {
  const candidates = [...String(html).matchAll(/href=["']([^"']+\.srt(?:\?[^"']*)?)["']/giu)].map((match) => match[1])
  const selected = candidates.find((value) => !/(?:^|\/)(?:_|_e|_en)?\.srt(?:\?|$)/iu.test(value) && !/(?:^|\/)_(?:e|en)\.srt(?:\?|$)/iu.test(value))
  return selected ? new URL(selected, pageUrl).toString() : null
}

async function restoreArchiveTranscript(record) {
  const transcriptUrl = record.sourceAudit?.transcriptUrl
  if (!transcriptUrl) return record
  const transcript = await fetchJson(new URL(transcriptUrl))
  const segments = normalizeSegments(transcript)
  const joined = segments.map((segment) => `${segment.start}\t${segment.end}\t${segment.text}`).join('\n')
  return {
    ...record,
    transcriptStatus: segments.length ? 'available' : 'empty',
    completeness: segments.length ? (transcript.source || 'available') : 'empty',
    transcriptSourceType: null,
    transcriptBoundaryVerified: false,
    segments,
    charCount: segments.reduce((count, segment) => count + segment.text.length, 0),
    contentSha256: segments.length ? createHash('sha256').update(joined).digest('hex') : null,
  }
}

function parseSrtSegments(value) {
  const blocks = String(value).replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n').split(/\n{2,}/u)
  const segments = []
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    const timingIndex = lines.findIndex((line) => line.includes('-->'))
    if (timingIndex < 0) continue
    const timing = lines[timingIndex].match(/(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/u)
    if (!timing) continue
    const text = normalizeWhitespace(cheerio.load(lines.slice(timingIndex + 1).join(' '), null, false).text())
    if (!text) continue
    segments.push({ start: parseSrtTimestamp(timing[1]), end: parseSrtTimestamp(timing[2]), text })
  }
  return segments.filter((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.end >= segment.start)
    .sort((left, right) => left.start - right.start)
}

function parseSrtTimestamp(value) {
  const match = String(value).match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/u)
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4].padEnd(3, '0')) / 1000
}

function applyVerifiedTranscriptCorrections(records) {
  for (const correction of verifiedTranscriptCorrections) {
    const existing = records.find((record) => record.id === correction.id)
    if (!existing) continue
    const metrics = transcriptMetrics(correction.segments, correction.durationSec)
    const currentCharacters = existing.segments?.reduce((sum, segment) => sum + String(segment.text ?? '').length, 0) ?? 0
    if (!transcriptBoundaryFitsDuration(metrics, correction.durationSec)) continue
    if (metrics.charCount < currentCharacters * correction.minimumImprovementRatio) continue
    Object.assign(existing, {
      segments: correction.segments,
      transcriptStatus: 'available',
      upstreamTranscriptStatus: 'verified_correction',
      completeness: 'verified_transcript',
      transcriptSourceType: 'verified_transcript',
      transcriptBoundaryVerified: true,
      publicSubtitleAudit: null,
      importError: null,
    })
  }
}

function stripVerificationSourceMetadata(record) {
  const output = { ...record }
  output.originalLinks = (output.originalLinks ?? []).filter((link) => !isVerificationSiteUrl(link?.url))
  output.transcriptSourceLinks = (output.transcriptSourceLinks ?? []).filter((link) => !isVerificationSiteUrl(link?.url))
  if (isVerificationSiteUrl(output.publicSubtitleAudit?.pageUrl) || isVerificationSiteUrl(output.publicSubtitleAudit?.subtitleUrl)) {
    output.publicSubtitleAudit = null
  }
  delete output.gettrSearchTranscriptAudit
  if (output.upstreamTranscriptStatus === 'public_gettrsearch_available') output.upstreamTranscriptStatus = 'public_subtitle_available'
  return output
}

function isVerificationSiteUrl(value) {
  try {
    const host = new URL(String(value ?? '')).hostname.replace(/^www\./u, '').toLowerCase()
    return host === 'gettrsearch.com' || host === 'gettrsearchassets.s3.amazonaws.com'
  } catch {
    return false
  }
}

function transcriptMetrics(segments, durationSec) {
  const list = Array.isArray(segments) ? segments : []
  const start = finiteNumber(list[0]?.start)
  const end = finiteNumber(list.at(-1)?.end ?? list.at(-1)?.start)
  const duration = Number(durationSec)
  return {
    start,
    end,
    charCount: list.reduce((count, segment) => count + String(segment?.text ?? '').length, 0),
    spanRatio: Number.isFinite(duration) && duration > 0 && start !== null && end !== null
      ? Math.max(0, Math.min(end, duration) - Math.max(0, start)) / duration
      : null,
  }
}

function transcriptBoundariesAgree(current, candidate, durationSec) {
  if (current.start === null || current.end === null || candidate.start === null || candidate.end === null) return false
  const tolerance = Math.max(90, Number(durationSec) * 0.02)
  return Math.abs(current.start - candidate.start) <= tolerance && Math.abs(current.end - candidate.end) <= tolerance
}

function shouldPreferPublicSubtitle(record, current, candidate) {
  if (!transcriptFitsDuration(candidate, record.durationSec)) return false
  if (record.transcriptStatus !== 'available' || !record.segments?.length) return true
  if (candidate.spanRatio === null || current.spanRatio === null) return false
  const comparableCoverage = candidate.spanRatio >= current.spanRatio - 0.03
  const materiallyBetterCoverage = candidate.spanRatio >= current.spanRatio + 0.08
  const enoughText = candidate.charCount >= current.charCount * 0.45
  return enoughText && (comparableCoverage || materiallyBetterCoverage)
}

function transcriptFitsDuration(candidate, durationSec) {
  const duration = Number(durationSec)
  const end = Number(candidate?.end)
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(end)) return false
  return end <= duration + Math.max(120, duration * 0.03)
}

function transcriptBoundaryFitsDuration(candidate, durationSec) {
  const duration = Number(durationSec)
  const end = Number(candidate?.end)
  return Number.isFinite(duration) && duration > 0 && Number.isFinite(end) && end <= duration + 5
}

async function readCommunityOverlay() {
  try {
    const parsed = JSON.parse(await readFile(communityOverlayPath, 'utf8'))
    return {
      audit: parsed?.audit ?? null,
      syntheticRecords: Array.isArray(parsed?.syntheticRecords) ? parsed.syntheticRecords.map(normalizeCachedRecord) : [],
    }
  } catch {
    return null
  }
}

async function readLegacyTranscriptOverlay() {
  try {
    const parsed = JSON.parse(await readFile(legacyOverlayPath, 'utf8'))
    return {
      audit: parsed?.audit ?? null,
      recordPatches: Array.isArray(parsed?.recordPatches) ? parsed.recordPatches.map(normalizeLegacyPatch) : [],
      syntheticRecords: Array.isArray(parsed?.syntheticRecords) ? parsed.syntheticRecords.map(normalizeCachedRecord) : [],
    }
  } catch {
    return null
  }
}

async function readPublicPostOverlay() {
  try {
    const parsed = JSON.parse(await readFile(publicPostOverlayPath, 'utf8'))
    return {
      audit: parsed?.audit ?? null,
      syntheticRecords: Array.isArray(parsed?.syntheticRecords) ? parsed.syntheticRecords.map(normalizeCachedRecord) : [],
    }
  } catch {
    return null
  }
}

function normalizeLegacyPatch(patch) {
  const segments = normalizeSegmentCandidates(patch?.segments)
  return {
    ...patch,
    segments,
    charCount: segments.reduce((total, segment) => total + segment.text.length, 0),
    contentSha256: transcriptHash(segments),
  }
}

function applyLegacyTranscriptOverlay(records, overlay) {
  const byId = new Map(records.map((record) => [record.id, record]))
  for (const rawPatch of overlay.recordPatches ?? []) {
    const record = byId.get(rawPatch.id)
    if (!record) continue
    const patch = normalizeLegacyPatch(rawPatch)
    Object.assign(record, patch)
  }
  for (const rawRecord of overlay.syntheticRecords ?? []) {
    if (byId.has(rawRecord.id)) continue
    const record = normalizeCachedRecord(rawRecord)
    records.push(record)
    byId.set(record.id, record)
  }
}

async function refreshPublicPostOverlay(records, matchIndex) {
  const fetchedAt = new Date().toISOString()
  const source = await fetchPublicPostCandidates()
  const candidates = dedupePublicPostCandidates(source.candidates)
  const syntheticRecords = []
  let matchedExistingRecords = 0

  for (const candidate of candidates) {
    if (findPublicPostDuplicate(candidate, records)) {
      matchedExistingRecords += 1
      continue
    }
    const segments = candidate.paragraphs.map((text) => ({ start: 0, end: 0, text }))
    const originalLinks = candidate.originalLinks
    syntheticRecords.push({
      id: `public-post-${createHash('sha256').update(candidate.sourcePaths.join('\n')).digest('hex').slice(0, 16)}`,
      date: candidate.date,
      title: candidate.title,
      durationSec: null,
      language: candidate.language,
      transcriptStatus: 'available',
      upstreamTranscriptStatus: 'public_post_available',
      completeness: 'public_post_caption',
      matchedPublicRecordId: matchPublicRecord({ date: candidate.date, title: candidate.title }, originalLinks, matchIndex),
      originalLinks,
      transcriptSourceLinks: candidate.sourcePageUrls.map((url) => ({ platform: 'github_transcript', url })),
      segments,
      charCount: segments.reduce((total, segment) => total + segment.text.length, 0),
      contentSha256: transcriptHash(segments),
      importError: null,
      transcriptSourceType: 'public_post_caption',
      transcriptBoundaryVerified: false,
      publicPostAudit: {
        repositoryUrl: publicPostRepository,
        sourcePageUrls: candidate.sourcePageUrls,
        sourcePaths: candidate.sourcePaths,
        selected: true,
        synthetic: true,
        timecoded: false,
        mediaLinks: originalLinks.length,
        charCount: candidate.charCount,
        fetchedAt,
      },
    })
  }

  return {
    syntheticRecords,
    audit: {
      repositoryUrl: publicPostRepository,
      sourceCommit: source.commit,
      markdownFiles: source.markdownFiles,
      parsedPosts: source.candidates.length,
      deduplicatedPosts: candidates.length,
      matchedExistingRecords,
      addedDistinctRecords: syntheticRecords.length,
      sourceCharacters: candidates.reduce((total, candidate) => total + candidate.charCount, 0),
      postsWithMediaLinks: candidates.filter((candidate) => candidate.originalLinks.length > 0).length,
      fetchedAt,
    },
  }
}

async function fetchPublicPostCandidates() {
  await rm(publicPostSourceDir, { recursive: true, force: true })
  await execFileAsync('git', ['clone', '--depth=1', '--filter=blob:none', '--no-checkout', publicPostRepository, publicPostSourceDir], { maxBuffer: 4 * 1024 * 1024 })
  await execFileAsync('git', ['-C', publicPostSourceDir, 'sparse-checkout', 'init', '--no-cone'], { maxBuffer: 4 * 1024 * 1024 })
  await execFileAsync('git', ['-C', publicPostSourceDir, 'sparse-checkout', 'set', '/content/getter/README.md', '/content/getter/content/**/*.md'], { maxBuffer: 4 * 1024 * 1024 })
  await execFileAsync('git', ['-C', publicPostSourceDir, 'checkout'], { maxBuffer: 4 * 1024 * 1024 })
  const commit = String((await execFileAsync('git', ['-C', publicPostSourceDir, 'rev-parse', 'HEAD'])).stdout).trim() || null
  const contentRoot = path.join(publicPostSourceDir, 'content', 'getter', 'content')
  const files = await collectLegacyMarkdownFiles(contentRoot)
  const candidates = []
  for (const filename of files) {
    const relativePath = path.relative(publicPostSourceDir, filename).split(path.sep).join('/')
    const candidate = parsePublicPost(await readFile(filename, 'utf8'), relativePath, commit)
    if (candidate) candidates.push(candidate)
  }
  await rm(publicPostSourceDir, { recursive: true, force: true })
  return { candidates, commit, markdownFiles: files.length }
}

function parsePublicPost(markdown, sourcePath, commit) {
  const metadata = String(markdown ?? '').match(/`郭文[贵貴]MILES\s+(20(?:20|21)-\d{2}-\d{2})T[^`]+`/u)
  if (!metadata) return null
  const firstDivider = markdown.indexOf('---')
  const lastDivider = markdown.lastIndexOf('---')
  const body = markdown.slice(firstDivider >= 0 ? firstDivider + 3 : 0, lastDivider > firstDivider ? lastDivider : markdown.length)
    .replace(/`郭文[贵貴]MILES[^`]+`[^\n]*\n?/u, '')
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/gu, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replace(/https?:\/\/\S+/gu, ' ')
    .replace(/<[^>]*>/gu, ' ')
  const paragraphs = body.split(/\n+/u).map(cleanLegacyMarkdown).map(normalizeWhitespace).filter((text) => text.length >= 2)
  const charCount = paragraphs.reduce((total, paragraph) => total + paragraph.length, 0)
  if (charCount < 2) return null
  const title = publicPostTitle(paragraphs.join(' '))
  const sourcePageUrl = `${publicPostRepository}/blob/${commit ?? publicPostBranch}/${sourcePath.split('/').map(encodeURIComponent).join('/')}`
  return {
    date: metadata[1],
    title,
    paragraphs,
    charCount,
    language: /[\p{Script=Han}]/u.test(paragraphs.join('')) ? 'zh' : 'en',
    originalLinks: extractPublicPostLinks(markdown),
    sourcePaths: [`Royguo0317/txt:${sourcePath}`],
    sourcePageUrls: [sourcePageUrl],
  }
}

function publicPostTitle(value) {
  const text = normalizeWhitespace(value)
  const characters = Array.from(text)
  if (characters.length <= 120) return text
  const preview = characters.slice(0, 120).join('')
  const sentence = preview.match(/^.{30,110}?[。！？!?](?:\s|$)/u)?.[0]
  return `${sentence?.trim() || characters.slice(0, 112).join('').trim()}...`
}

function extractPublicPostLinks(markdown) {
  const links = []
  const seen = new Set()
  for (const match of String(markdown ?? '').matchAll(/\]\((https?:\/\/[^)\s]+)\)/giu)) {
    try {
      const url = new URL(match[1].replace(/&amp;/giu, '&'))
      const host = url.hostname.replace(/^www\./u, '').toLowerCase()
      if (host === 'github.com'
        || /\.(?:jpe?g|png|gif|webp)$/iu.test(url.pathname)
        || url.pathname.includes('/cdn-cgi/image/')
        || `${url.pathname}${url.hash}`.includes('/UserInfo/')) continue
      url.protocol = 'https:'
      const canonical = canonicalMediaUrl(url.toString())
      if (!canonical || seen.has(canonical)) continue
      seen.add(canonical)
      links.push({ platform: platformForUrl(url), url: url.toString() })
    } catch {
      // Ignore malformed links from the historic export.
    }
  }
  return links
}

function dedupePublicPostCandidates(candidates) {
  const output = []
  const sorted = [...candidates].sort((left, right) => left.date.localeCompare(right.date) || left.sourcePaths[0].localeCompare(right.sourcePaths[0]))
  for (const candidate of sorted) {
    const candidateNormalized = normalizeSearchDocumentText(candidate.paragraphs.join(' '))
    const duplicate = output.find((existing) => {
      const existingNormalized = normalizeSearchDocumentText(existing.paragraphs.join(' '))
      return existingNormalized === candidateNormalized
        || (existing.date === candidate.date && publicPostsEquivalent(existing, candidate))
    })
    if (!duplicate) {
      output.push(candidate)
      continue
    }
    if (candidate.charCount > duplicate.charCount) {
      duplicate.title = candidate.title
      duplicate.paragraphs = candidate.paragraphs
      duplicate.charCount = candidate.charCount
      duplicate.language = candidate.language
    }
    duplicate.originalLinks = mergeOriginalLinks(duplicate.originalLinks, candidate.originalLinks)
    duplicate.sourcePaths = [...new Set([...duplicate.sourcePaths, ...candidate.sourcePaths])]
    duplicate.sourcePageUrls = [...new Set([...duplicate.sourcePageUrls, ...candidate.sourcePageUrls])]
  }
  return output
}

function publicPostsEquivalent(left, right) {
  const a = left.paragraphs.join(' ')
  const b = right.paragraphs.join(' ')
  const normalizedA = normalizeSearchDocumentText(a)
  const normalizedB = normalizeSearchDocumentText(b)
  if (normalizedA === normalizedB) return true
  const ratio = Math.min(normalizedA.length, normalizedB.length) / Math.max(normalizedA.length, normalizedB.length)
  return ratio >= 0.85 && transcriptTextOverlap(a, b) >= 0.95
}

function findPublicPostDuplicate(candidate, records) {
  const candidateUrls = new Set(candidate.originalLinks.map((link) => canonicalMediaUrl(link.url)).filter(Boolean))
  const candidateText = candidate.paragraphs.join(' ')
  const candidateNormalized = normalizeSearchDocumentText(candidateText)
  return records.find((record) => {
    if (record.date !== candidate.date) return false
    if ((record.originalLinks ?? []).some((link) => candidateUrls.has(canonicalMediaUrl(link.url)))) return true
    const title = normalizeSearchDocumentText(record.title)
    if (candidateNormalized.length >= 20 && title.length >= 20 && (candidateNormalized.startsWith(title) || title.startsWith(candidateNormalized.slice(0, Math.min(100, candidateNormalized.length))))) return true
    if (record.transcriptStatus !== 'available' || !record.segments?.length) return false
    const recordText = record.segments.map((segment) => segment.text).join(' ')
    const ratio = Math.min(candidateNormalized.length, normalizeSearchDocumentText(recordText).length) / Math.max(candidateNormalized.length, normalizeSearchDocumentText(recordText).length)
    return ratio >= 0.8 && transcriptTextOverlap(candidateText, recordText) >= 0.9
  }) ?? null
}

async function refreshLegacyTranscriptOverlay(records, matchIndex) {
  const fetchedAt = new Date().toISOString()
  const source = await fetchLegacyTranscriptCandidates()
  const candidates = mergeLegacyTranscriptCandidates(source.candidates)
  const assignments = matchLegacyTranscriptCandidates(records, candidates)
  const resolvedCandidateIds = new Set(assignments.keys())
  const recordPatchById = new Map()
  const matchedRecordIds = new Set()
  let selectedTranscripts = 0
  let compositeMatches = 0

  for (const [candidateId, assignment] of assignments.entries()) {
    const candidate = candidates.find((item) => item.id === candidateId)
    if (!candidate) continue
    for (const record of assignment.records) matchedRecordIds.add(record.id)
    if (assignment.records.length !== 1) {
      compositeMatches += 1
      continue
    }
    const patch = legacyTranscriptPatch(assignment.records[0], candidate, assignment.method, fetchedAt)
    if (!patch) continue
    const existing = recordPatchById.get(patch.id)
    if (!existing || patch.charCount > existing.charCount) recordPatchById.set(patch.id, patch)
  }

  const syntheticRecords = []
  let duplicateCandidates = 0
  for (const candidate of candidates) {
    if (assignments.has(candidate.id)) continue
    if (isLegacyMultiDateDuplicate(candidate, records)) {
      duplicateCandidates += 1
      resolvedCandidateIds.add(candidate.id)
      continue
    }
    if (isLegacySameDateCompositeDuplicate(candidate, records)) {
      duplicateCandidates += 1
      resolvedCandidateIds.add(candidate.id)
      continue
    }
    const duplicate = findLegacyTranscriptDuplicate(candidate, records)
    if (duplicate) {
      duplicateCandidates += 1
      matchedRecordIds.add(duplicate.id)
      resolvedCandidateIds.add(candidate.id)
      continue
    }
    if (candidate.charCount < 500) continue
    const durationSec = candidate.estimatedDurationSec ?? null
    const segments = untimedLegacySegments(candidate.paragraphs, durationSec)
    const record = {
      id: `legacy-${createHash('sha256').update(candidate.sourcePaths.join('\n')).digest('hex').slice(0, 16)}`,
      date: candidate.date,
      title: candidate.title,
      durationSec,
      language: 'zh',
      transcriptStatus: 'available',
      upstreamTranscriptStatus: 'legacy_available',
      completeness: 'legacy_human_transcript',
      matchedPublicRecordId: matchPublicRecord({ date: candidate.date, title: candidate.title }, candidate.originalLinks, matchIndex),
      originalLinks: candidate.originalLinks,
      transcriptSourceLinks: legacySourceLinks(candidate),
      segments,
      charCount: segments.reduce((total, segment) => total + segment.text.length, 0),
      contentSha256: transcriptHash(segments),
      importError: null,
      transcriptSourceType: 'legacy_human_transcript',
      transcriptBoundaryVerified: false,
      legacyTranscriptAudit: legacyTranscriptAudit(candidate, fetchedAt, false, true, 'distinct_public_source'),
    }
    syntheticRecords.push(record)
    resolvedCandidateIds.add(candidate.id)
  }

  const recordPatches = [...recordPatchById.values()]
  selectedTranscripts = recordPatches.length
  const unresolvedCandidates = candidates.filter((candidate) => !resolvedCandidateIds.has(candidate.id))
  return {
    recordPatches,
    syntheticRecords,
    audit: {
      repositoryUrl: legacyTranscriptRepository,
      archiveUrl: legacyTranscriptArchiveUrl,
      sourceCommit: source.commit,
      sources: source.sources,
      markdownFiles: source.markdownFiles,
      directTranscriptFiles: source.candidates.length,
      groupedCandidates: candidates.length,
      sourceCharacters: candidates.reduce((total, candidate) => total + candidate.charCount, 0),
      matchedCandidates: assignments.size + duplicateCandidates,
      matchedRecords: matchedRecordIds.size,
      compositeMatches,
      selectedTranscripts,
      addedDistinctRecords: syntheticRecords.length,
      unresolvedCandidates: unresolvedCandidates.length,
      unresolvedCandidateSummaries: unresolvedCandidates.map((candidate) => ({
        date: candidate.date,
        title: candidate.title,
        charCount: candidate.charCount,
        sourcePaths: candidate.sourcePaths,
      })),
      fetchedAt,
    },
  }
}

async function fetchLegacyTranscriptCandidates() {
  const candidates = []
  const sources = []
  for (const source of legacyTranscriptSources) {
    const result = await fetchLegacyTranscriptSource(source)
    candidates.push(...result.candidates)
    sources.push(result.audit)
  }
  return {
    candidates,
    sources,
    commit: sources[0]?.commit ?? null,
    markdownFiles: sources.reduce((total, source) => total + source.markdownFiles, 0),
  }
}

async function fetchLegacyTranscriptSource(source) {
  if (source.checkout === 'blogger') return fetchLegacyBloggerSource(source)
  const slug = source.ownerRepo.replace(/[^a-z0-9_-]/giu, '_')
  const sourceDir = `${legacySourceDir}-${slug}`
  const archivePath = `${legacyArchivePath}.${slug}`
  await rm(sourceDir, { recursive: true, force: true })
  let commit = null
  if (source.checkout === 'sparse-git') {
    await execFileAsync('git', ['clone', '--depth=1', '--filter=blob:none', '--no-checkout', source.repositoryUrl, sourceDir], { maxBuffer: 4 * 1024 * 1024 })
    await execFileAsync('git', ['-C', sourceDir, 'sparse-checkout', 'init', '--no-cone'], { maxBuffer: 4 * 1024 * 1024 })
    await execFileAsync('git', ['-C', sourceDir, 'sparse-checkout', 'set', '/README.md', '/content/**/*.md'], { maxBuffer: 4 * 1024 * 1024 })
    await execFileAsync('git', ['-C', sourceDir, 'checkout'], { maxBuffer: 4 * 1024 * 1024 })
    commit = String((await execFileAsync('git', ['-C', sourceDir, 'rev-parse', 'HEAD'])).stdout).trim() || null
  } else {
    const response = await fetch(source.archiveUrl, {
      headers: {
        Accept: 'application/gzip',
        'User-Agent': 'Docket-Observatory-Legacy-Transcript-Auditor/0.1 (+https://github.com/Dysen177/docket-observatory)',
      },
    })
    if (!response.ok) throw new Error(`${source.ownerRepo} transcript archive returned HTTP ${response.status}`)
    await writeFile(archivePath, Buffer.from(await response.arrayBuffer()))
    await mkdir(sourceDir, { recursive: true })
    await extractTar({ file: archivePath, cwd: sourceDir, strip: 1 })
    try {
      const commitResponse = await fetch(`https://api.github.com/repos/${source.ownerRepo}/commits/${source.branch}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Docket-Observatory-Legacy-Transcript-Auditor/0.1' },
      })
      if (commitResponse.ok) commit = String((await commitResponse.json())?.sha ?? '') || null
    } catch {
      // The archive itself remains usable when the optional commit lookup is unavailable.
    }
  }

  const files = await collectLegacyMarkdownFiles(path.join(sourceDir, 'content'))
  const candidates = []
  for (const filename of files) {
    const markdown = await readFile(filename, 'utf8')
    const relativePath = path.relative(sourceDir, filename).split(path.sep).join('/')
    const candidate = parseLegacyTranscript(markdown, relativePath, { ...source, commit })
    if (candidate) candidates.push(candidate)
  }
  await rm(sourceDir, { recursive: true, force: true })
  await rm(archivePath, { force: true })
  return {
    candidates,
    audit: {
      ownerRepo: source.ownerRepo,
      repositoryUrl: source.repositoryUrl,
      commit,
      markdownFiles: files.length,
      directTranscriptFiles: candidates.length,
      directTranscriptCharacters: candidates.reduce((total, candidate) => total + candidate.charCount, 0),
    },
  }
}

async function fetchLegacyBloggerSource(source) {
  const sitemap = await fetchBloggerText(source.sitemapUrl, 'application/xml')
  const pageUrls = [...sitemap.matchAll(/<loc>(https:\/\/chinatwtparty\.blogspot\.com\/[^<]+)<\/loc>/gu)]
    .map((match) => match[1].replace(/&amp;/giu, '&'))
  const candidates = []
  await concurrentMap(pageUrls, Math.min(concurrency, 4), async (url) => {
    const html = await fetchBloggerText(url, 'text/html')
    const candidate = parseLegacyBloggerTranscript(html, url, source)
    if (candidate) candidates.push(candidate)
  })
  candidates.sort((left, right) => left.date.localeCompare(right.date) || left.sourcePaths[0].localeCompare(right.sourcePaths[0]))
  return {
    candidates,
    audit: {
      ownerRepo: source.ownerRepo,
      repositoryUrl: source.repositoryUrl,
      commit: null,
      markdownFiles: pageUrls.length,
      directTranscriptFiles: candidates.length,
      directTranscriptCharacters: candidates.reduce((total, candidate) => total + candidate.charCount, 0),
    },
  }
}

async function fetchBloggerText(value, accept) {
  const url = new URL(value)
  let lastError = null
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await delay(requestDelayMs * attempt)
      const response = await fetch(url, {
        headers: {
          Accept: accept,
          'User-Agent': 'Docket-Observatory-Legacy-Transcript-Auditor/0.1 (+https://github.com/Dysen177/docket-observatory)',
        },
      })
      if (response.ok) return response.text()
      lastError = new Error(`${url.pathname} returned HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await delay(250 * attempt)
  }
  throw lastError ?? new Error(`${url.pathname} could not be downloaded`)
}

function parseLegacyBloggerTranscript(html, pageUrl, source) {
  const $ = cheerio.load(html)
  const body = $('.post-body.entry-content').first()
  const title = normalizeWhitespace($('h3.post-title.entry-title').first().text() || $('title').first().text().split(' - ')[0])
  if (!body.length || !title) return null
  body.find('script,style,iframe,noscript,.separator,.sharedaddy').remove()
  body.find('br').replaceWith('\n')
  body.find('p,div,li,blockquote').append('\n')
  const paragraphs = body.text().split(/\n+/u).map(cleanLegacyMarkdown).filter((text) => text.length >= 2)
  const published = pageUrl.match(/\/(20(?:17|18))\/(\d{2})\//u)
  const sourcePath = published ? `content/${published[1]}/${published[2]}/${new URL(pageUrl).pathname.split('/').filter(Boolean).at(-1)}.html` : pageUrl
  const date = legacyBroadcastDate(title, sourcePath)
  const charCount = paragraphs.reduce((total, paragraph) => total + paragraph.length, 0)
  if (!date || charCount < 500 || !isDirectLegacyTranscript(title, paragraphs)) return null
  const hrefText = body.find('a[href],video[src],source[src]').map((_, node) => $(node).attr('href') || $(node).attr('src') || '').get().join('\n')
  return {
    id: createHash('sha256').update(`${source.ownerRepo}:${pageUrl}`).digest('hex').slice(0, 20),
    date,
    title,
    paragraphs,
    charCount,
    originalLinks: extractLegacyPublicLinks(hrefText),
    estimatedDurationSec: legacyEstimatedDuration(body.text()),
    sourcePaths: [`${source.ownerRepo}:${pageUrl}`],
    sourcePageUrls: [pageUrl],
    sourceRepositoryUrls: [source.repositoryUrl],
  }
}

async function collectLegacyMarkdownFiles(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await collectLegacyMarkdownFiles(target))
    else if (entry.name.endsWith('.md') && !entry.name.startsWith('README')) output.push(target)
  }
  return output.sort()
}

function parseLegacyTranscript(markdown, sourcePath, source) {
  const heading = legacyArticleHeading(markdown)
  const title = heading.title
  const date = legacyBroadcastDate(title, sourcePath)
  const paragraphs = legacyTranscriptParagraphs(markdown, title, heading.bodyStart)
  const charCount = paragraphs.reduce((total, paragraph) => total + paragraph.length, 0)
  if (!date || charCount < 500 || !isDirectLegacyTranscript(title, paragraphs)) return null
  const originalLinks = extractLegacyPublicLinks(markdown)
  const sourcePageUrl = `${source.repositoryUrl}/blob/${source.commit ?? source.branch}/${sourcePath.split('/').map(encodeURIComponent).join('/')}`
  const sourceKey = `${source.ownerRepo}:${sourcePath}`
  return {
    id: createHash('sha256').update(sourceKey).digest('hex').slice(0, 20),
    date,
    title: title || `${date} public statement transcript`,
    paragraphs,
    charCount,
    originalLinks,
    estimatedDurationSec: legacyEstimatedDuration(markdown),
    sourcePaths: [sourceKey],
    sourcePageUrls: [sourcePageUrl],
    sourceRepositoryUrls: [source.repositoryUrl],
  }
}

function legacyArticleHeading(markdown) {
  const headings = [...String(markdown ?? '').matchAll(/^#{1,2}\s+(.+)$/gmu)]
    .map((match) => ({ title: cleanLegacyMarkdown(match[1]), bodyStart: Number(match.index) + match[0].length }))
    .filter((heading) => heading.title)
  const informative = headings.find((heading) => !/^郭文[貴贵]先生[視视]頻频的文字版(?:轉载自.*)?$/u.test(heading.title))
  return informative ?? headings[0] ?? { title: '', bodyStart: 0 }
}

function cleanLegacyMarkdown(value) {
  return replaceUnpairedSurrogates(String(value ?? ''))
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&(?:nbsp|amp|quot|#39);/giu, ' ')
    .replace(/[\\*_~`#>|]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

function legacyTranscriptParagraphs(markdown, title, bodyStart = 0) {
  const body = markdown.slice(Math.max(0, bodyStart))
  const paragraphs = []
  const seen = new Set()
  for (const block of body.split(/\n\s*\n/gu)) {
    if (!block.trim() || /!\[[^\]]*\]\([^)]*\)/u.test(block.trim())) continue
    const text = cleanLegacyMarkdown(block.replace(/https?:\/\/\S+/giu, ' '))
    if (!text || normalizeSearchDocumentText(text) === normalizeSearchDocumentText(title)) continue
    if (/^(?:战友之声|戰友之聲|郭媒体|郭媒體).{0,24}(?:听写组|聽寫組|义工|義工)$/u.test(text)) continue
    if (/^\d{1,3}\s*[-–—]\s*\d{1,3}\s*[\p{Script=Han}A-Za-z .]{0,24}$/u.test(text)) continue
    const normalized = normalizeSearchDocumentText(text)
    if (normalized.length >= 60 && seen.has(normalized)) continue
    if (normalized.length >= 60) seen.add(normalized)
    paragraphs.push(text)
  }
  return paragraphs
}

function isDirectLegacyTranscript(title, paragraphs) {
  const heading = String(title ?? '')
  const textSample = paragraphs.slice(0, 12).join(' ')
  const transcriptSignal = /文字版|文字稿|直播|报平安|報平安|访谈|訪談|broadcast/iu.test(heading)
  const titleNamesGuo = /郭文贵|郭文貴|文贵|文貴|郭先生|郭媒体|郭媒體|报平安|報平安/iu.test(heading)
  const directSpeaker = /(?:^|\s)(?:文贵|文貴|郭文贵|郭文貴)\s*[：:]/u.test(textSample)
  if (/^翻译|^翻譯/u.test(heading) && !directSpeaker) return false
  return (transcriptSignal && titleNamesGuo) || directSpeaker
}

function legacyBroadcastDate(title, sourcePath) {
  const normalized = String(title ?? '').normalize('NFKC').replace(/\s+/gu, ' ')
  const pathYear = sourcePath.match(/content\/(20(?:1[7-9]|2[0-3]))\//u)?.[1] ?? null
  const adjacentDays = normalized.match(/(20(?:1[7-9]|2[0-3]))\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号|號)\s*(\d{1,2})\s*(?:日|号|號)/u)
  if (adjacentDays) return validLegacyDate(adjacentDays[1], adjacentDays[2], adjacentDays[4])
  const chinese = normalized.match(/(20(?:1[7-9]|2[0-3]))\s*年?\s*(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号|號)?/u)
  if (chinese) return validLegacyDate(chinese[1], chinese[2], chinese[3])
  const separated = normalized.match(/\b(20(?:1[7-9]|2[0-3]))[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})\b/u)
  if (separated) return validLegacyDate(separated[1], separated[2], separated[3])
  const compact = normalized.match(/\b(20(?:1[7-9]|2[0-3]))(\d{2})(\d{2})\b/u)
  if (compact) return validLegacyDate(compact[1], compact[2], compact[3])
  const usDate = normalized.match(/\b(\d{1,2})\/(\d{1,2})\/(?:20)?(17|18|19|20|21|22|23)\b/u)
  if (usDate) return validLegacyDate(`20${usDate[3]}`, usDate[1], usDate[2])
  const monthNames = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 }
  const english = normalized.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s*(20(?:1[7-9]|2[0-3]))\b/iu)
  if (english) return validLegacyDate(english[3], monthNames[english[1].toLowerCase()], english[2])
  if (!pathYear) return null
  const monthDay = normalized.match(/(?:^|[^\d])(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号|號)/u)
    ?? normalized.match(/(?:^|[^\d])(\d{1,2})[./-](\d{1,2})(?:[^\d]|$)/u)
  if (monthDay) return inferredLegacyDate(pathYear, monthDay[1], monthDay[2], sourcePath)
  const compactMonthDay = normalized.match(/(?:文字版|直播|版)\s*(\d{3,4})(?:[^\d]|$)/u)
  if (compactMonthDay) {
    const value = compactMonthDay[1]
    return inferredLegacyDate(pathYear, value.slice(0, -2), value.slice(-2), sourcePath)
  }
  const standaloneMonthDay = normalized.match(/(?:^|[^\d])((?!20(?:17|18|19|20|21|22|23))\d{3,4})(?:[^\d]|$)/u)
  if (standaloneMonthDay) {
    const value = standaloneMonthDay[1]
    return inferredLegacyDate(pathYear, value.slice(0, -2), value.slice(-2), sourcePath)
  }
  return null
}

function inferredLegacyDate(pathYear, month, day, sourcePath) {
  let candidate = validLegacyDate(pathYear, month, day)
  if (!candidate) return null
  const published = sourcePath.match(/\/(20(?:1[7-9]|2[0-3]))(\d{2})(\d{2})-/u)
  if (!published) return candidate
  const publishedDate = validLegacyDate(published[1], published[2], published[3])
  if (!publishedDate) return candidate
  const candidateTime = Date.parse(`${candidate}T00:00:00Z`)
  const publishedTime = Date.parse(`${publishedDate}T00:00:00Z`)
  if (candidateTime > publishedTime + 7 * 24 * 60 * 60 * 1000 && Number(pathYear) > 2017) {
    candidate = validLegacyDate(Number(pathYear) - 1, month, day) ?? candidate
  }
  return candidate
}

function validLegacyDate(year, month, day) {
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  const candidate = new Date(Date.UTC(y, m - 1, d))
  if (candidate.getUTCFullYear() !== y || candidate.getUTCMonth() !== m - 1 || candidate.getUTCDate() !== d) return null
  const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return iso >= '2017-01-26' && iso <= '2023-03-14' ? iso : null
}

function extractLegacyPublicLinks(markdown) {
  const candidates = [
    ...[...String(markdown ?? '').matchAll(/\]\((https?:\/\/[^)\s]+)\)/giu)].map((match) => match[1]),
    ...[...String(markdown ?? '').matchAll(/https?:\/\/[^\s)\]]+/giu)].map((match) => match[0]),
  ]
  const allowedHosts = /(?:^|\.)(?:youtube\.com|youtu\.be|twitter\.com|x\.com|livestream\.com|vimeo\.com|gettr\.com|rumble\.com|odysee\.com|gtv\.org|gtv\.com)$/iu
  const seen = new Set()
  const links = []
  for (const raw of candidates) {
    try {
      const cleaned = raw.replace(/\\([_-])/gu, '$1').replace(/&amp;/giu, '&').replace(/[.,;]+$/gu, '')
      const parsed = new URL(cleaned)
      if (!['http:', 'https:'].includes(parsed.protocol) || !allowedHosts.test(parsed.hostname.replace(/^www\./u, ''))) continue
      parsed.protocol = 'https:'
      const url = normalizeLegacyMediaUrl(parsed)
      if (!url) continue
      const key = canonicalMediaUrl(url.toString())
      if (!key || seen.has(key)) continue
      seen.add(key)
      links.push({ platform: platformForUrl(url), url: url.toString() })
    } catch {
      // Ignore malformed links left by the historic blog export.
    }
  }
  return links
}

function normalizeLegacyMediaUrl(url) {
  const host = url.hostname.replace(/^www\./u, '').toLowerCase()
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const rawId = host === 'youtu.be' ? url.pathname.replace(/^\//u, '') : url.searchParams.get('v') ?? ''
    const videoId = rawId.match(/^[A-Za-z0-9_-]{11}/u)?.[0]
    if (!videoId) return null
    return new URL(`https://www.youtube.com/watch?v=${videoId}`)
  }
  url.hash = ''
  url.pathname = url.pathname.replace(/[\\*`_]+$/gu, '').replace(/\/+$/u, '') || '/'
  return url
}

function legacyEstimatedDuration(markdown) {
  const ranges = [...String(markdown ?? '').matchAll(/(?:^|\n)\s*\**\s*(\d{1,3})\s*[-–—]\s*(\d{1,3})/gu)]
    .map((match) => Number(match[2]))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 480)
  const statedMinutes = Number(String(markdown ?? '').match(/直播时长\s*[：:]\s*(\d{1,3})/u)?.[1])
  if (Number.isFinite(statedMinutes) && statedMinutes > 0 && statedMinutes <= 480) ranges.push(statedMinutes)
  return ranges.length ? Math.max(...ranges) * 60 : null
}

function mergeLegacyTranscriptCandidates(candidates) {
  const parents = candidates.map((_, index) => index)
  const find = (value) => parents[value] === value ? value : (parents[value] = find(parents[value]))
  const union = (left, right) => {
    const a = find(left)
    const b = find(right)
    if (a !== b) parents[b] = a
  }
  const urls = candidates.map((candidate) => new Set(candidate.originalLinks.map((link) => canonicalMediaUrl(link.url)).filter(Boolean)))
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      if (candidates[left].date !== candidates[right].date) continue
      if ([...urls[left]].some((url) => urls[right].has(url))) union(left, right)
    }
  }
  const groups = Map.groupBy(candidates.map((candidate, index) => ({ candidate, root: find(index) })), (item) => item.root)
  return [...groups.values()].map((items) => {
    const sorted = items.map((item) => item.candidate).sort((left, right) => legacyPartOrdinal(left.title) - legacyPartOrdinal(right.title) || left.sourcePaths[0].localeCompare(right.sourcePaths[0]))
    const paragraphs = []
    const seen = new Set()
    for (const candidate of sorted) {
      for (const paragraph of candidate.paragraphs) {
        const key = normalizeSearchDocumentText(paragraph)
        if (key.length >= 60 && seen.has(key)) continue
        if (key.length >= 60) seen.add(key)
        paragraphs.push(paragraph)
      }
    }
    const titles = sorted.map((candidate) => candidate.title).sort((left, right) => normalizeCommunityTitle(right).length - normalizeCommunityTitle(left).length)
    const sourcePaths = [...new Set(sorted.flatMap((candidate) => candidate.sourcePaths))].sort()
    return {
      id: createHash('sha256').update(sourcePaths.join('\n')).digest('hex').slice(0, 20),
      date: sorted[0].date,
      title: titles[0],
      paragraphs,
      charCount: paragraphs.reduce((total, paragraph) => total + paragraph.length, 0),
      originalLinks: mergeOriginalLinks(...sorted.map((candidate) => candidate.originalLinks)),
      estimatedDurationSec: Math.max(0, ...sorted.map((candidate) => Number(candidate.estimatedDurationSec) || 0)) || null,
      sourcePaths,
      sourcePageUrls: [...new Set(sorted.flatMap((candidate) => candidate.sourcePageUrls))],
      sourceRepositoryUrls: [...new Set(sorted.flatMap((candidate) => candidate.sourceRepositoryUrls ?? []))],
    }
  })
}

function legacyPartOrdinal(value) {
  const normalized = String(value ?? '').normalize('NFKC').toLowerCase()
  const catalogSuffix = normalized.match(/^\s*\d{4}[.-]\d{1,2}[.-]\d{1,2}[-_. ]+([123])(?:\D|$)/u)?.[1]
  const explicit = normalized.match(/(?:part|segment)\s*([123])|(?:第)([123一二三])(?:段|部分|次|集)|[【[(（]([123一二三上中下])[】\])）]/iu)
  const valueToken = catalogSuffix ?? explicit?.slice(1).find(Boolean) ?? null
  if (['1', '一', '上'].includes(valueToken)) return 1
  if (['2', '二', '中', '下'].includes(valueToken)) return 2
  if (['3', '三'].includes(valueToken)) return 3
  return 0
}

function matchLegacyTranscriptCandidates(records, candidates) {
  const assignments = new Map()
  const assignedRecordIds = new Set()
  for (const candidate of candidates) {
    const candidateUrls = new Set(candidate.originalLinks.map((link) => canonicalMediaUrl(link.url)).filter(Boolean))
    const exact = records.filter((record) => record.date === candidate.date && (record.originalLinks ?? []).some((link) => candidateUrls.has(canonicalMediaUrl(link.url))))
    if (!exact.length) continue
    assignments.set(candidate.id, { records: exact, method: exact.length === 1 ? 'exact_original_url' : 'composite_original_urls' })
    for (const record of exact) assignedRecordIds.add(record.id)
  }
  for (const candidate of candidates) {
    if (assignments.has(candidate.id)) continue
    const candidateText = candidate.paragraphs.join(' ')
    const scored = records.filter((record) => record.date === candidate.date)
      .map((record) => {
        const titleScore = Math.max(communityTitleSimilarity(record.title, candidate.title), legacyTitleSimilarity(record.title, candidate.title))
        const recordText = record.transcriptStatus === 'available' ? record.segments.map((segment) => segment.text).join(' ') : ''
        const overlap = recordText ? transcriptTextOverlap(candidateText, recordText) : 0
        const charRatio = recordText ? Math.min(candidateText.length, recordText.length) / Math.max(candidateText.length, recordText.length) : 0
        const candidateDuration = Number(candidate.estimatedDurationSec)
        const recordDuration = Number(record.durationSec)
        const durationRatio = candidateDuration > 0 && recordDuration > 0
          ? Math.min(candidateDuration, recordDuration) / Math.max(candidateDuration, recordDuration)
          : 0
        const score = titleScore * 0.55 + overlap * 0.2 + charRatio * 0.1 + durationRatio * 0.15
        return { record, titleScore, overlap, charRatio, durationRatio, score, ordinalConflict: legacyOrdinalConflict(record.title, candidate.title) }
      })
      .filter((item) => !item.ordinalConflict && (
        item.titleScore >= 0.74
        || item.overlap >= 0.12
        || (item.durationRatio >= 0.9 && item.overlap >= 0.04 && item.charRatio >= 0.4)
      ))
      .sort((left, right) => right.score - left.score)
    if (!scored.length || scored[0].score < 0.52) continue
    if (scored.length > 1 && scored[0].score - scored[1].score < 0.07 && scored[0].titleScore < 0.96) continue
    assignments.set(candidate.id, { records: [scored[0].record], method: scored[0].titleScore >= 0.96 ? 'same_date_title' : `same_date_text_${scored[0].overlap.toFixed(2)}` })
    assignedRecordIds.add(scored[0].record.id)
  }
  return assignments
}

function legacyOrdinalConflict(left, right) {
  const a = legacyPartOrdinal(left)
  const b = legacyPartOrdinal(right)
  return a > 0 && b > 0 && a !== b
}

function legacyTranscriptPatch(record, candidate, matchMethod, fetchedAt) {
  const durationSec = Number(record.durationSec) > 0 ? Number(record.durationSec) : candidate.estimatedDurationSec
  const segments = untimedLegacySegments(candidate.paragraphs, durationSec)
  const candidateCharCount = segments.reduce((total, segment) => total + segment.text.length, 0)
  if (!shouldPreferLegacyTranscript(record, candidateCharCount)) return null
  return {
    id: record.id,
    transcriptStatus: 'available',
    completeness: 'legacy_human_transcript',
    transcriptSourceType: 'legacy_human_transcript',
    transcriptBoundaryVerified: false,
    originalLinks: mergeOriginalLinks(record.originalLinks, candidate.originalLinks),
    transcriptSourceLinks: mergeOriginalLinks(record.transcriptSourceLinks ?? [], legacySourceLinks(candidate)),
    segments,
    charCount: candidateCharCount,
    contentSha256: transcriptHash(segments),
    legacyTranscriptAudit: legacyTranscriptAudit(candidate, fetchedAt, true, false, matchMethod),
  }
}

function shouldPreferLegacyTranscript(record, candidateCharCount) {
  const current = Number(record.charCount) || 0
  if (record.transcriptStatus !== 'available' || !record.segments?.length) return candidateCharCount >= 500
  const ratio = record.transcriptSourceType === 'community_human_transcript' ? 1.15 : 1.2
  return candidateCharCount >= current * ratio && candidateCharCount - current >= 500
}

function findLegacyTranscriptDuplicate(candidate, records) {
  const candidateText = candidate.paragraphs.join(' ')
  const sameDateRecords = records.filter((record) => record.date === candidate.date && record.transcriptStatus === 'available')
  const allScored = sameDateRecords
    .map((record) => {
      const currentText = record.segments.map((segment) => segment.text).join(' ')
      const overlap = transcriptTextOverlap(candidateText, currentText)
      const charRatio = Math.min(candidateText.length, currentText.length) / Math.max(candidateText.length, currentText.length)
      const titleScore = Math.max(communityTitleSimilarity(record.title, candidate.title), legacyTitleSimilarity(record.title, candidate.title))
      const excerptSubset = /精华|精華|片段|节选|節選|excerpt|highlight/iu.test(candidate.title)
        && candidateText.length < currentText.length
        && overlap >= 0.075
      return { record, overlap, charRatio, titleScore, excerptSubset, ordinalConflict: legacyOrdinalConflict(record.title, candidate.title) }
    })
  const scored = allScored
    .filter((item) => !item.ordinalConflict && (
      (item.titleScore >= 0.72 && item.charRatio >= 0.35)
      || (item.overlap >= 0.12 && item.charRatio >= 0.3)
      || (item.overlap >= 0.075 && item.charRatio >= 0.65)
      || (item.overlap >= 0.065 && item.charRatio >= 0.85)
      || (item.overlap >= 0.04 && item.charRatio >= 0.5 && item.titleScore >= 0.1)
      || item.excerptSubset
    ))
    .sort((left, right) => (right.overlap + right.titleScore) - (left.overlap + left.titleScore))
  if (scored[0]) return scored[0].record
  if (/2\s*[：:]\s*019年/u.test(candidate.title) && sameDateRecords.length === 1 && allScored[0]?.charRatio >= 0.8) return sameDateRecords[0]
  return null
}

function isLegacyMultiDateDuplicate(candidate, records) {
  const year = candidate.title.match(/(20(?:17|18|19))\s*年/u)?.[1] ?? candidate.date.slice(0, 4)
  const dates = [...candidate.title.matchAll(/(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号|號)/gu)]
    .map((match) => validLegacyDate(year, match[1], match[2]))
    .filter(Boolean)
  const uniqueDates = [...new Set(dates)]
  if (uniqueDates.length < 2) return false
  const coveredCharacters = records
    .filter((record) => uniqueDates.includes(record.date) && record.transcriptStatus === 'available')
    .reduce((total, record) => total + (Number(record.charCount) || 0), 0)
  return coveredCharacters >= candidate.charCount * 0.7
}

function isLegacySameDateCompositeDuplicate(candidate, records) {
  const sameDate = records.filter((record) => record.date === candidate.date && record.transcriptStatus === 'available')
  if (!sameDate.length) return false
  const largest = sameDate.sort((left, right) => (Number(right.charCount) || 0) - (Number(left.charCount) || 0))[0]
  const largestRatio = Math.min(candidate.charCount, Number(largest.charCount) || 0) / Math.max(candidate.charCount, Number(largest.charCount) || 0)
  if (/速记|速記|精要|内容整理|摘要|summary/iu.test(candidate.title) && Number(largest.charCount) >= candidate.charCount * 1.2) return true
  if (/全文字版|g-?tv直播/iu.test(candidate.title) && Number(largest.charCount) >= 5000 && largestRatio >= 0.85) return true
  if (candidate.originalLinks.length) return false
  const coveredCharacters = sameDate.reduce((total, record) => total + (Number(record.charCount) || 0), 0)
  return coveredCharacters >= candidate.charCount * 0.75
}

function legacySourceLinks(candidate) {
  return candidate.sourcePageUrls.map((url) => {
    const host = new URL(url).hostname.toLowerCase()
    return {
      platform: host === 'blogspot.com' || host.endsWith('.blogspot.com') ? 'blogspot_transcript' : 'github_transcript',
      url,
    }
  })
}

function legacyTitleSimilarity(left, right) {
  const a = normalizeCommunityTitle(left)
  const b = normalizeCommunityTitle(right)
  if (!a || !b) return 0
  const leftSet = new Set(a)
  const rightSet = new Set(b)
  let overlap = 0
  for (const character of leftSet) if (rightSet.has(character)) overlap += 1
  return (2 * overlap) / (leftSet.size + rightSet.size)
}

function untimedLegacySegments(paragraphs, durationSec) {
  const end = Number.isFinite(Number(durationSec)) && Number(durationSec) > 0 ? Number(durationSec) : 0
  return paragraphs.map((text) => ({ start: 0, end, text }))
}

function legacyTranscriptAudit(candidate, fetchedAt, matched, synthetic, matchMethod) {
  return {
    repositoryUrl: candidate.sourceRepositoryUrls?.[0] ?? legacyTranscriptRepository,
    repositoryUrls: candidate.sourceRepositoryUrls ?? [legacyTranscriptRepository],
    sourcePageUrls: candidate.sourcePageUrls,
    sourcePaths: candidate.sourcePaths,
    matched,
    synthetic,
    selected: true,
    matchMethod,
    segmentCount: candidate.paragraphs.length,
    charCount: candidate.charCount,
    timecoded: false,
    fetchedAt,
  }
}

async function refreshCommunityTranscriptOverlay(records, matchIndex) {
  const fetchedAt = new Date().toISOString()
  const metadata = (await fetchCommunityTranscriptMetadata())
    .filter((record) => record.date >= '2017-01-26' && record.date <= '2023-03-14')
  const metadataAssignments = matchCommunityMetadata(records, metadata)
  const assignedRecordIds = new Set([...metadataAssignments.values()].map((assignment) => assignment.record.id))
  const assignedMetadataIds = new Set(metadataAssignments.keys())
  const detailsToFetch = metadata.filter((candidate) => {
    const assignment = metadataAssignments.get(candidate.id)
    if (!assignment) return Number(candidate.char_count_zh) >= 80
    return needsCommunityTranscriptDetail(assignment.record, candidate)
  })
  const detailById = new Map()
  await concurrentMap(detailsToFetch, concurrency, async (candidate) => {
    const detail = await fetchCommunityTranscriptDetail(candidate.id)
    if (detail) detailById.set(candidate.id, detail)
  })

  let textMatchedRecords = 0
  for (const candidate of metadata) {
    if (assignedMetadataIds.has(candidate.id)) continue
    const detail = detailById.get(candidate.id)
    if (!detail) continue
    const textMatch = findCommunityTextMatch(candidate, detail, records, assignedRecordIds)
    if (!textMatch) continue
    metadataAssignments.set(candidate.id, textMatch)
    assignedMetadataIds.add(candidate.id)
    assignedRecordIds.add(textMatch.record.id)
    textMatchedRecords += 1
  }

  let selectedTranscripts = 0
  const matchedDetails = []
  for (const [communityId, assignment] of metadataAssignments.entries()) {
    const candidate = metadata.find((item) => item.id === communityId)
    const detail = detailById.get(communityId)
    if (!candidate || !detail) continue
    const updated = applyCommunityTranscriptCandidate(assignment.record, candidate, detail, assignment.method, fetchedAt)
    matchedDetails.push(updated.communityTranscriptAudit)
    if (updated.transcriptSourceType === 'community_human_transcript') {
      Object.assign(assignment.record, updated)
      await writeFile(cachePath(assignment.record.id), `${JSON.stringify(assignment.record)}\n`, 'utf8')
      selectedTranscripts += 1
    } else {
      assignment.record.communityTranscriptAudit = updated.communityTranscriptAudit
      assignment.record.originalLinks = updated.originalLinks
      await writeFile(cachePath(assignment.record.id), `${JSON.stringify(assignment.record)}\n`, 'utf8')
    }
  }

  const mergedAlternateIds = new Set()
  for (const candidate of metadata) {
    if (metadataAssignments.has(candidate.id)) continue
    const detail = detailById.get(candidate.id)
    if (!detail) continue
    const duplicate = findCommunityDuplicate(candidate, detail, records)
    if (!duplicate) continue
    const sourceUrl = publicCommunitySourceUrl(candidate.source_video_url)
    if (sourceUrl) duplicate.originalLinks = mergeOriginalLinks(duplicate.originalLinks, [{ platform: platformForUrl(new URL(sourceUrl)), url: sourceUrl }])
    await writeFile(cachePath(duplicate.id), `${JSON.stringify(duplicate)}\n`, 'utf8')
    mergedAlternateIds.add(candidate.id)
  }

  const knownUrls = new Set(records.flatMap((record) => record.originalLinks ?? []).map((link) => canonicalMediaUrl(link.url)).filter(Boolean))
  const syntheticRecords = []
  for (const candidate of metadata) {
    if (metadataAssignments.has(candidate.id)) continue
    if (mergedAlternateIds.has(candidate.id)) continue
    const detail = detailById.get(candidate.id)
    if (!detail || Number(candidate.char_count_zh) < 80) continue
    const sourceUrl = publicCommunitySourceUrl(candidate.source_video_url)
    const canonicalSource = canonicalMediaUrl(sourceUrl)
    if (canonicalSource && knownUrls.has(canonicalSource)) continue
    const normalizedTranscript = normalizeCommunityTranscript(detail.segments, null)
    const segments = normalizedTranscript.segments
    if (!segments.length) continue
    const normalizedTitle = normalizeCommunityTitle(candidate.title)
    if (!sourceUrl && normalizedTitle.length < 6) continue
    const metrics = transcriptMetrics(segments, null)
    const originalLinks = sourceUrl ? [{ platform: platformForUrl(new URL(sourceUrl)), url: sourceUrl }] : []
    const record = {
      id: `community-${candidate.id}`,
      date: candidate.date,
      title: normalizeWhitespace(candidate.title) || `${candidate.date} public statement`,
      durationSec: metrics.end,
      language: 'zh',
      transcriptStatus: 'available',
      upstreamTranscriptStatus: 'community_available',
      completeness: 'community_human_transcript',
      matchedPublicRecordId: matchPublicRecord({ date: candidate.date, title: candidate.title }, originalLinks, matchIndex),
      originalLinks,
      segments,
      charCount: metrics.charCount,
      contentSha256: transcriptHash(segments),
      importError: null,
      transcriptSourceType: 'community_human_transcript',
      transcriptBoundaryVerified: false,
      communityTranscriptAudit: {
        sourceId: candidate.id,
        sourceApiUrl: `${communityArchiveOrigin}/api/live/${encodeURIComponent(candidate.id)}`,
        sourcePageUrl: candidate.url ?? `${communityArchiveOrigin}/live/${encodeURIComponent(candidate.id)}`,
        originalSourceUrl: sourceUrl,
        matched: false,
        synthetic: true,
        selected: true,
        matchMethod: 'distinct_public_source',
        segmentCount: segments.length,
        charCount: metrics.charCount,
        start: metrics.start,
        end: metrics.end,
        spanRatio: null,
        timecoded: normalizedTranscript.timecoded,
        fetchedAt,
      },
    }
    syntheticRecords.push(record)
    if (canonicalSource) knownUrls.add(canonicalSource)
  }

  return {
    syntheticRecords,
    audit: {
      indexUrl: communityArchiveIndexUrl,
      sourceDescription: 'Public structured mirror of historical GNews transcripts with original recording links.',
      metadataRecords: metadata.length,
      metadataMatchedRecords: metadataAssignments.size,
      textMatchedRecords,
      fetchedDetails: detailById.size,
      reviewedMatchedDetails: matchedDetails.length,
      selectedTranscripts,
      mergedAlternateSources: mergedAlternateIds.size,
      addedDistinctRecords: syntheticRecords.length,
      unresolvedMetadataRecords: metadata.length - metadataAssignments.size - mergedAlternateIds.size - syntheticRecords.length,
      fetchedAt,
    },
  }
}

async function fetchCommunityTranscriptMetadata() {
  const records = []
  for (let offset = 0; ; offset += 500) {
    const url = new URL(communityArchiveIndexUrl)
    url.searchParams.set('limit', '500')
    url.searchParams.set('offset', String(offset))
    const page = await fetchCommunityJson(url)
    if (!Array.isArray(page)) throw new Error('Community transcript index did not return an array.')
    records.push(...page)
    if (page.length < 500) return records
  }
}

async function fetchCommunityTranscriptDetail(id) {
  const target = path.join(communityDetailDir, `${String(id).replace(/[^a-z0-9_-]/giu, '_')}.json`)
  if (!forceCommunityTranscripts) {
    try {
      return JSON.parse(await readFile(target, 'utf8'))
    } catch {
      // Fetch missing or invalid cached details below.
    }
  }
  try {
    const detail = await fetchCommunityJson(new URL(`/api/live/${encodeURIComponent(id)}`, communityArchiveOrigin))
    await writeFile(target, `${JSON.stringify(detail)}\n`, 'utf8')
    return detail
  } catch (error) {
    process.stderr.write(`[community] ${id}: ${String(error?.message ?? error)}\n`)
    return null
  }
}

async function fetchCommunityJson(url) {
  await delay(requestDelayMs)
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Docket-Observatory-Community-Transcript-Auditor/0.1 (+https://github.com/Dysen177/docket-observatory)',
    },
  })
  if (!response.ok) throw new Error(`${url.pathname} returned HTTP ${response.status}`)
  return response.json()
}

function matchCommunityMetadata(records, metadata) {
  const assignments = new Map()
  const assignedRecordIds = new Set()
  const candidatesByDate = Map.groupBy(metadata, (candidate) => candidate.date)
  for (const record of records) {
    const recordUrls = new Set((record.originalLinks ?? []).map((link) => canonicalMediaUrl(link.url)).filter(Boolean))
    const candidates = (candidatesByDate.get(record.date) ?? [])
      .filter((candidate) => !assignments.has(candidate.id))
      .filter((candidate) => recordUrls.has(canonicalMediaUrl(candidate.source_video_url)))
    if (!candidates.length) continue
    const candidate = candidates.length === 1 ? candidates[0] : bestTitleCandidate(record.title, candidates, 0)
    if (!candidate) continue
    assignments.set(candidate.id, { record, method: 'exact_original_url' })
    assignedRecordIds.add(record.id)
  }
  for (const candidate of metadata) {
    if (assignments.has(candidate.id)) continue
    const scored = records.filter((record) => record.date === candidate.date && !assignedRecordIds.has(record.id))
      .map((record) => {
        const titleScore = communityTitleSimilarity(record.title, candidate.title)
        const currentChars = Number(record.charCount) || 0
        const candidateChars = Number(candidate.char_count_zh) || 0
        const volumeScore = currentChars > 0 && candidateChars > 0
          ? Math.min(currentChars, candidateChars) / Math.max(currentChars, candidateChars)
          : 0.35
        return { record, titleScore, score: titleScore * 0.85 + volumeScore * 0.15 }
      })
      .filter((item) => item.titleScore >= 0.74)
      .sort((left, right) => right.score - left.score)
    if (!scored.length) continue
    if (scored.length > 1 && scored[0].score - scored[1].score < 0.08 && scored[0].titleScore < 0.999) continue
    const selected = scored[0]
    assignments.set(candidate.id, {
      record: selected.record,
      method: selected.titleScore >= 0.999 ? 'exact_title' : selected.titleScore >= 0.94 ? 'contained_title' : `fuzzy_title_${selected.titleScore.toFixed(2)}`,
    })
    assignedRecordIds.add(selected.record.id)
  }
  return assignments
}

function bestTitleCandidate(title, candidates, threshold) {
  const scored = candidates.map((candidate) => ({ candidate, score: communityTitleSimilarity(title, candidate.title) }))
    .sort((left, right) => right.score - left.score)
  if (!scored.length || scored[0].score < threshold) return null
  if (scored.length > 1 && scored[0].score - scored[1].score < 0.1 && scored[0].score < 0.999) return null
  return scored[0].candidate
}

function communityTitleSimilarity(left, right) {
  const a = normalizeCommunityTitle(left)
  const b = normalizeCommunityTitle(right)
  if (!a || !b) return 0
  if (a === b) return 1
  const shorter = a.length <= b.length ? a : b
  const longer = shorter === a ? b : a
  if (shorter.length >= 6 && longer.includes(shorter)) return 0.96
  return bigramDice(a, b)
}

function normalizeCommunityTitle(value) {
  return normalizeWhitespace(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\d{4}\s*[.\-/年]\s*\d{1,2}\s*[.\-/月]\s*\d{1,2}(?:\s*日)?(?:[-_. ]?\d+)?/gu, ' ')
    .replace(/\b\d{8}(?:_\d+)?\b/gu, ' ')
    .replace(/郭文贵|郭文貴|文贵|文貴|先生|大直播|直播|盖特|蓋特|gettr|视频|視頻|完整版|完整版本|完整直播|全程|全文字版|全文字|文字版|实录|實錄|x264|\d{3,4}p/gu, ' ')
    .replace(/[\p{P}\p{S}\s_]+/gu, '')
}

function bigramDice(left, right) {
  const a = ngramSet(left, 2, 1)
  const b = ngramSet(right, 2, 1)
  if (!a.size || !b.size) return 0
  let overlap = 0
  for (const value of a) if (b.has(value)) overlap += 1
  return (2 * overlap) / (a.size + b.size)
}

function needsCommunityTranscriptDetail(record, candidate) {
  const currentChars = Number(record.charCount) || 0
  const candidateChars = Number(candidate.char_count_zh) || 0
  if (record.transcriptSourceType === 'community_human_transcript') return true
  if (record.transcriptStatus !== 'available') return candidateChars >= 80
  if (candidateChars >= currentChars * 1.1 && candidateChars - currentChars >= 300) return true
  return record.transcriptQuality === 'possibly_incomplete' && candidateChars >= currentChars * 0.75
}

function findCommunityTextMatch(candidate, detail, records, assignedRecordIds) {
  const candidateSegments = normalizeCommunityTranscript(detail.segments, null).segments
  const candidateText = candidateSegments.map((segment) => segment.text).join(' ')
  if (candidateText.length < 80) return null
  const candidateEnd = candidateSegments.at(-1)?.end ?? null
  const genericTitle = normalizeCommunityTitle(candidate.title).length < 6
  const scored = records.filter((record) => record.date === candidate.date && !assignedRecordIds.has(record.id) && record.transcriptStatus === 'available')
    .map((record) => {
      const currentText = record.segments.map((segment) => segment.text).join(' ')
      const overlap = transcriptTextOverlap(candidateText, currentText)
      const charRatio = Math.min(candidateText.length, currentText.length) / Math.max(candidateText.length, currentText.length)
      const durationRatio = candidateEnd && Number(record.durationSec) > 0
        ? Math.min(candidateEnd, Number(record.durationSec)) / Math.max(candidateEnd, Number(record.durationSec))
        : 0.5
      const titleScore = communityTitleSimilarity(record.title, candidate.title)
      const score = overlap * 0.7 + durationRatio * 0.2 + titleScore * 0.1
      return { record, overlap, charRatio, score }
    })
    .filter((item) => item.overlap >= 0.12 && (!genericTitle || item.charRatio >= 0.3))
    .sort((left, right) => right.score - left.score)
  if (!scored.length || scored[0].score < 0.24) return null
  if (scored.length > 1 && scored[0].score - scored[1].score < 0.06) return null
  return { record: scored[0].record, method: `same_date_text_overlap_${scored[0].overlap.toFixed(2)}` }
}

function findCommunityDuplicate(candidate, detail, records) {
  const candidateSegments = normalizeCommunityTranscript(detail.segments, null).segments
  const candidateText = candidateSegments.map((segment) => segment.text).join(' ')
  if (candidateText.length < 80) return null
  const normalizedTitle = normalizeCommunityTitle(candidate.title)
  const genericTitle = normalizedTitle.length < 6
  const scored = records.filter((record) => record.date === candidate.date && record.transcriptStatus === 'available')
    .map((record) => {
      const currentText = record.segments.map((segment) => segment.text).join(' ')
      const overlap = transcriptTextOverlap(candidateText, currentText)
      const charRatio = Math.min(candidateText.length, currentText.length) / Math.max(candidateText.length, currentText.length)
      const titleScore = communityTitleSimilarity(record.title, candidate.title)
      const score = overlap * 0.72 + charRatio * 0.14 + titleScore * 0.14
      return { record, overlap, charRatio, titleScore, score, ordinalConflict: communityOrdinalConflict(record.title, candidate.title) }
    })
    .filter((item) => !item.ordinalConflict)
    .filter((item) => genericTitle
      ? item.overlap >= 0.08 && item.charRatio >= 0.85
      : (item.titleScore >= 0.94 && item.charRatio >= 0.35) || (item.overlap >= 0.08 && item.charRatio >= 0.85))
    .sort((left, right) => right.score - left.score)
  if (!scored.length) return null
  if (scored.length > 1 && scored[0].score - scored[1].score < 0.05 && scored[0].overlap < 0.35) return null
  return scored[0].record
}

function communityOrdinalConflict(left, right) {
  const a = communityOrdinal(left)
  const b = communityOrdinal(right)
  return a !== null && b !== null && a !== b
}

function communityOrdinal(value) {
  const normalized = String(value ?? '').normalize('NFKC')
  const match = normalized.match(/(?:第|直播第?)([123一二三])(?:段|部分|次直播|次)/u)
    ?? normalized.match(/([123一二三])(?:st|nd|rd)?\s*(?:part|segment)/iu)
  if (!match) return null
  return ({ '1': 1, '一': 1, '2': 2, '二': 2, '3': 3, '三': 3 })[match[1]] ?? null
}

function transcriptTextOverlap(left, right) {
  const a = ngramSet(normalizeSearchDocumentText(left), 8, 4)
  const b = ngramSet(normalizeSearchDocumentText(right), 8, 4)
  if (!a.size || !b.size) return 0
  let overlap = 0
  for (const value of a.size <= b.size ? a : b) if ((a.size <= b.size ? b : a).has(value)) overlap += 1
  return overlap / Math.min(a.size, b.size)
}

function ngramSet(value, width, step) {
  const output = new Set()
  if (!value) return output
  if (value.length <= width) {
    output.add(value)
    return output
  }
  for (let index = 0; index <= value.length - width; index += step) output.add(value.slice(index, index + width))
  return output
}

function normalizeSearchDocumentText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, '')
}

function applyCommunityTranscriptCandidate(record, candidate, detail, matchMethod, fetchedAt) {
  const normalizedTranscript = normalizeCommunityTranscript(detail.segments, record.durationSec)
  const segments = normalizedTranscript.segments
  const correctedDurationSec = communityDurationCorrection(record, normalizedTranscript, matchMethod)
  const effectiveDurationSec = correctedDurationSec ?? record.durationSec
  const metrics = transcriptMetrics(segments, effectiveDurationSec)
  const selected = shouldPreferCommunityTranscript(record, { ...metrics, timecoded: normalizedTranscript.timecoded })
  const sourceUrl = publicCommunitySourceUrl(candidate.source_video_url)
  const originalLinks = sourceUrl
    ? mergeOriginalLinks(record.originalLinks, [{ platform: platformForUrl(new URL(sourceUrl)), url: sourceUrl }])
    : record.originalLinks
  const communityTranscriptAudit = {
    sourceId: candidate.id,
    sourceApiUrl: `${communityArchiveOrigin}/api/live/${encodeURIComponent(candidate.id)}`,
    sourcePageUrl: candidate.url ?? `${communityArchiveOrigin}/live/${encodeURIComponent(candidate.id)}`,
    originalSourceUrl: sourceUrl,
    matched: true,
    synthetic: false,
    selected,
    matchMethod,
    segmentCount: segments.length,
    charCount: metrics.charCount,
    start: metrics.start,
    end: metrics.end,
    spanRatio: metrics.spanRatio,
    timecoded: normalizedTranscript.timecoded,
    durationCorrected: correctedDurationSec !== null,
    priorDurationSec: correctedDurationSec !== null ? record.durationSec : null,
    correctedDurationSec,
    fetchedAt,
  }
  if (!selected) return { ...record, originalLinks, communityTranscriptAudit }
  return {
    ...record,
    transcriptStatus: 'available',
    completeness: 'community_human_transcript',
    transcriptSourceType: 'community_human_transcript',
    transcriptBoundaryVerified: false,
    durationSec: correctedDurationSec ?? record.durationSec,
    originalLinks,
    segments,
    charCount: metrics.charCount,
    contentSha256: transcriptHash(segments),
    communityTranscriptAudit,
  }
}

function shouldPreferCommunityTranscript(record, candidate) {
  if (!candidate.charCount || candidate.start === null || candidate.end === null) return false
  if (record.transcriptSourceType === 'community_human_transcript') return true
  if (record.transcriptStatus !== 'available' || !record.segments?.length) return true
  const current = transcriptMetrics(record.segments, record.durationSec)
  if (record.transcriptSourceType === 'public_subtitle' && candidate.charCount < current.charCount * 1.2) return false
  if (!candidate.timecoded) return candidate.charCount >= current.charCount * 1.3 && candidate.charCount - current.charCount >= 500
  const duration = Number(record.durationSec)
  if (Number.isFinite(duration) && duration > 0 && !transcriptFitsDuration(candidate, duration)) return false
  const candidateCoverageComparable = candidate.spanRatio === null || current.spanRatio === null || candidate.spanRatio >= current.spanRatio - 0.08
  if (candidate.charCount >= current.charCount * 1.15 && candidate.charCount - current.charCount >= 300) return candidateCoverageComparable
  const currentQuality = analyzeTranscriptCoverage(record, record.durationQuality ?? 'plausible')
  return currentQuality.transcriptQuality === 'possibly_incomplete'
    && candidate.charCount >= current.charCount * 0.88
    && (candidate.spanRatio === null || current.spanRatio === null || candidate.spanRatio >= current.spanRatio + 0.04)
}

function communityDurationCorrection(record, transcript, matchMethod) {
  const current = Number(record.durationSec)
  const candidate = Number(transcript.segments.at(-1)?.end)
  if (!transcript.timecoded || !Number.isFinite(candidate) || candidate <= 0) return null
  if (!Number.isFinite(current) || current <= 0) return candidate
  const exactSource = matchMethod === 'exact_original_url'
  const currentObviouslyShort = candidate >= current * 2.5 && transcript.segments.reduce((count, segment) => count + segment.text.length, 0) >= 5000
  return exactSource && currentObviouslyShort ? candidate : null
}

function normalizeCommunityTranscript(candidates, durationSec) {
  const source = Array.isArray(candidates) ? candidates : []
  const prepared = source.map((segment) => {
    const speaker = normalizeWhitespace(segment?.speaker)
    const body = normalizeWhitespace(segment?.zh ?? segment?.text)
    return {
      parsed: parseCommunityTimestamp(segment?.ts_start),
      text: normalizeWhitespace(speaker && body && !body.startsWith(`${speaker}:`) && !body.startsWith(`${speaker}：`) ? `${speaker}：${body}` : body),
    }
  }).filter((segment) => segment.text)
  if (!prepared.length) return { segments: [], timecoded: false }
  const parsedTimes = prepared.map((segment) => segment.parsed)
  const standardEnd = Math.max(0, ...parsedTimes.map((item) => item?.standard ?? 0))
  const duration = Number(durationSec)
  const durationTolerance = Number.isFinite(duration) && duration > 0 ? duration + Math.max(120, duration * 0.08) : null
  const repairMinuteSecond = parsedTimes.some((item) => item && item.seconds === 0 && item.hours >= 3 && item.hours < 60)
    && (durationTolerance === null || standardEnd > durationTolerance)
  const timed = prepared.map((segment) => ({
    start: segment.parsed
      ? repairMinuteSecond && segment.parsed.seconds === 0 && segment.parsed.hours < 60
        ? segment.parsed.minuteSecond
        : segment.parsed.standard
      : null,
    end: null,
    text: segment.text,
  }))
  const reliable = timed.every((segment) => Number.isFinite(segment.start))
    && timed.every((segment, index) => index === 0 || segment.start >= timed[index - 1].start)
    && Math.max(...timed.map((segment) => segment.start)) <= 8 * 3600
  if (!reliable) {
    return {
      segments: prepared.map((segment) => ({
        start: 0,
        end: Number.isFinite(duration) && duration > 0 ? duration : 0,
        text: segment.text,
      })),
      timecoded: false,
    }
  }
  return {
    segments: timed.map((segment, index) => ({
    ...segment,
    end: finiteNumber(timed[index + 1]?.start)
      ?? (Number.isFinite(duration) && duration >= segment.start ? duration : segment.start),
    })),
    timecoded: true,
  }
}

function parseCommunityTimestamp(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,3}):(\d{2}):(\d{2})$/u)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  if (minutes >= 60 || seconds >= 60) return null
  return {
    hours,
    standard: hours * 3600 + minutes * 60 + seconds,
    minuteSecond: hours * 60 + minutes + seconds / 100,
    seconds,
  }
}

function transcriptHash(segments) {
  const joined = segments.map((segment) => `${segment.start}\t${segment.end}\t${segment.text}`).join('\n')
  return segments.length ? createHash('sha256').update(joined).digest('hex') : null
}

function publicCommunitySourceUrl(value) {
  try {
    const url = new URL(String(value ?? ''))
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function canonicalMediaUrl(value) {
  try {
    const url = new URL(String(value ?? ''))
    const host = url.hostname.replace(/^www\./u, '').toLowerCase()
    if (host === 'youtu.be') return `youtube:${url.pathname.replace(/^\//u, '')}`
    if ((host === 'youtube.com' || host.endsWith('.youtube.com')) && url.pathname === '/watch') return `youtube:${url.searchParams.get('v') ?? ''}`
    url.hash = ''
    url.hostname = host
    url.pathname = url.pathname.replace(/\/+$/u, '') || '/'
    for (const key of [...url.searchParams.keys()]) if (!['v'].includes(key)) url.searchParams.delete(key)
    return url.toString().toLowerCase()
  } catch {
    return ''
  }
}

function linkEquivalentTranscripts(records) {
  const availableByPublicRecord = new Map()
  const availableByDate = new Map()
  for (const record of records) {
    if (record.transcriptStatus !== 'available') continue
    if (!availableByDate.has(record.date)) availableByDate.set(record.date, [])
    availableByDate.get(record.date).push(record)
    if (record.matchedPublicRecordId) {
      if (!availableByPublicRecord.has(record.matchedPublicRecordId)) availableByPublicRecord.set(record.matchedPublicRecordId, [])
      availableByPublicRecord.get(record.matchedPublicRecordId).push(record)
    }
  }
  let linked = 0
  for (const record of records) {
    if (!['missing', 'empty'].includes(record.transcriptStatus)) continue
    const publicRecordCandidates = record.matchedPublicRecordId ? availableByPublicRecord.get(record.matchedPublicRecordId) ?? [] : []
    const strictCatalogCandidates = (availableByDate.get(record.date) ?? []).filter((candidate) => titleDistance(record.title, candidate.title) <= 1)
    const candidates = publicRecordCandidates.length ? publicRecordCandidates : strictCatalogCandidates
    const equivalent = candidates
      .filter((candidate) => durationsEquivalent(record.durationSec, candidate.durationSec))
      .sort((left, right) => titleDistance(record.title, left.title) - titleDistance(record.title, right.title))[0]
    if (!equivalent) continue
    record.transcriptStatus = 'available'
    record.completeness = 'equivalent_public_copy'
    record.segments = equivalent.segments
    record.charCount = equivalent.charCount
    record.contentSha256 = equivalent.contentSha256
    record.linkedTranscriptId = equivalent.id
    record.originalLinks = mergeOriginalLinks(record.originalLinks, equivalent.originalLinks)
    linked += 1
  }
  return linked
}

function linkSparseEquivalentTranscripts(records) {
  const availableByDate = Map.groupBy(records.filter((record) => record.transcriptStatus === 'available'), (record) => record.date)
  let linked = 0
  for (const record of records) {
    const density = transcriptCharsPerMinute(record)
    if (record.transcriptStatus !== 'available' || Number(record.durationSec) < 1800 || density === null || density >= 50) continue
    const normalizedTitle = normalizeEventTitle(record.title)
    const equivalent = (availableByDate.get(record.date) ?? [])
      .filter((candidate) => candidate.id !== record.id)
      .filter((candidate) => normalizeEventTitle(candidate.title) === normalizedTitle)
      .filter((candidate) => durationsLooselyEquivalent(record.durationSec, candidate.durationSec))
      .filter((candidate) => {
        const candidateDensity = transcriptCharsPerMinute(candidate)
        return candidateDensity !== null && candidateDensity >= Math.max(100, density * 3)
      })
      .sort((left, right) => right.charCount - left.charCount)[0]
    if (!equivalent) continue
    record.completeness = 'equivalent_public_copy'
    record.segments = equivalent.segments
    record.charCount = equivalent.charCount
    record.contentSha256 = equivalent.contentSha256
    record.linkedTranscriptId = equivalent.id
    record.originalLinks = mergeOriginalLinks(record.originalLinks, equivalent.originalLinks)
    linked += 1
  }
  return linked
}

function transcriptCharsPerMinute(record) {
  const duration = Number(record?.durationSec)
  const chars = Number(record?.charCount)
  return Number.isFinite(duration) && duration > 0 && Number.isFinite(chars) ? chars / (duration / 60) : null
}

function durationsLooselyEquivalent(left, right) {
  const a = Number(left)
  const b = Number(right)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return false
  return Math.abs(a - b) <= Math.max(90, Math.min(a, b) * 0.2)
}

function mergeOriginalLinks(...groups) {
  const seen = new Set()
  return groups.flat().filter((link) => {
    const key = canonicalUrl(link?.url)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function durationsEquivalent(left, right) {
  const a = Number(left)
  const b = Number(right)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return false
  return Math.abs(a - b) <= Math.max(5, Math.min(a, b) * 0.015)
}

function titleDistance(left, right) {
  const a = normalizeTitle(left)
  const b = normalizeTitle(right)
  if (a === b) return 0
  if (a.includes(b) || b.includes(a)) return 1
  return 2
}

function normalizeSegments(transcript) {
  const candidates = Array.isArray(transcript?.utterances) && transcript.utterances.length
    ? transcript.utterances
    : Array.isArray(transcript?.segments) ? transcript.segments : []
  return normalizeSegmentCandidates(candidates)
}

function normalizeSegmentCandidates(candidates) {
  return candidates.map((segment) => ({
    start: roundTime(segment?.start),
    end: roundTime(segment?.end),
    text: normalizeTranscriptText(segment?.text),
  })).filter((segment) => Number.isFinite(segment.start) && segment.text)
    .sort((left, right) => left.start - right.start)
    .map((segment, index, all) => ({
      ...segment,
      end: Number.isFinite(segment.end) && segment.end >= segment.start
        ? segment.end
        : finiteNumber(all[index + 1]?.start) ?? segment.start,
    }))
}

function collectOriginalLinks(record) {
  const candidates = [record?.sourceUrl, ...Object.values(record?.urls ?? {}).flatMap((value) => Array.isArray(value) ? value : [value])]
  const seen = new Set()
  const links = []
  for (const candidate of candidates) {
    try {
      const url = new URL(String(candidate ?? ''))
      if (url.protocol !== 'https:' || url.hostname === 'ghot.ai' || /\.(?:jpe?g|png|webp|gif)$/iu.test(url.pathname)) continue
      const canonical = canonicalUrl(url.toString())
      if (seen.has(canonical)) continue
      seen.add(canonical)
      links.push({ platform: platformForUrl(url), url: url.toString() })
    } catch {
      // Ignore malformed or non-public source metadata.
    }
  }
  return links
}

function buildPublicRecordMatchIndex(records) {
  const byUrl = new Map()
  const byDateTitle = new Map()
  for (const record of records) {
    for (const source of [record.primarySource, ...(record.alternatives ?? [])]) {
      if (source?.url) byUrl.set(canonicalUrl(source.url), record.id)
    }
    const key = `${record.date}\u0000${normalizeTitle(record.originalTitle || record.title?.zh || record.title?.en)}`
    if (!byDateTitle.has(key)) byDateTitle.set(key, [])
    byDateTitle.get(key).push(record.id)
  }
  return { byUrl, byDateTitle }
}

function matchPublicRecord(record, links, index) {
  for (const link of links) {
    const id = index.byUrl.get(canonicalUrl(link.url))
    if (id) return id
  }
  const candidates = index.byDateTitle.get(`${record.date}\u0000${normalizeTitle(record.title)}`) ?? []
  return candidates.length === 1 ? candidates[0] : null
}

function duplicateHashGroups(records) {
  const groups = new Map()
  for (const record of records) {
    if (!record.contentSha256) continue
    if (!groups.has(record.contentSha256)) groups.set(record.contentSha256, [])
    groups.get(record.contentSha256).push(record.id)
  }
  return [...groups.entries()].filter(([, ids]) => ids.length > 1).map(([sha256, ids]) => ({ sha256, ids }))
}

async function fetchCatalog() {
  const text = await fetchText(new URL(archiveDataUrl))
  const json = text.replace(/^\s*window\.GHOT_ARCHIVE_DATA\s*=\s*/u, '').replace(/;\s*$/u, '')
  const parsed = JSON.parse(json)
  if (!Array.isArray(parsed.records)) throw new Error('Archive catalog did not include records.')
  return parsed
}

async function fetchJson(url) {
  await delay(requestDelayMs)
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Docket-Observatory-Transcript-Importer/0.1 (+https://github.com/Dysen177/docket-observatory)' } })
  if (!response.ok) throw new Error(`${url.pathname} returned HTTP ${response.status}`)
  return response.json()
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { Accept: 'text/javascript', 'User-Agent': 'Docket-Observatory-Transcript-Importer/0.1 (+https://github.com/Dysen177/docket-observatory)' } })
  if (!response.ok) throw new Error(`${url.pathname} returned HTTP ${response.status}`)
  return response.text()
}

async function fetchPublicText(url, accept) {
  await delay(requestDelayMs)
  const response = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'Docket-Observatory-Public-Subtitle-Importer/0.1 (+https://github.com/Dysen177/docket-observatory)' } })
  if (!response.ok) throw new Error(`${url.pathname} returned HTTP ${response.status}`)
  return response.text()
}

async function concurrentMap(items, size, worker) {
  let cursor = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      await worker(items[index], index)
    }
  }))
}

async function readCachedRecord(id) {
  try {
    return JSON.parse(await readFile(cachePath(id), 'utf8'))
  } catch {
    return null
  }
}

function cachePath(id) {
  return path.join(workDir, `${String(id).replace(/[^a-z0-9_-]/giu, '_')}.json`)
}

function canonicalUrl(value) {
  try {
    const url = new URL(value)
    url.hash = ''
    url.searchParams.delete('utm_source')
    url.searchParams.delete('utm_medium')
    url.searchParams.delete('utm_campaign')
    url.hostname = url.hostname.replace(/^www\./u, '').toLowerCase()
    url.pathname = url.pathname.replace(/\/+$/u, '') || '/'
    return url.toString().toLowerCase()
  } catch {
    return String(value ?? '').trim().toLowerCase()
  }
}

function platformForUrl(url) {
  const host = url.hostname.replace(/^www\./u, '').toLowerCase()
  if (host.includes('youtube') || host === 'youtu.be') return 'youtube'
  if (host.includes('gettr')) return 'gettr'
  if (host.includes('rumble')) return 'rumble'
  if (host === 'x.com' || host.includes('twitter')) return 'x'
  if (host.includes('odysee')) return 'odysee'
  return host
}

function normalizeTitle(value) {
  return normalizeWhitespace(typeof value === 'object' ? value?.zh || value?.en : value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^\d{4}[.\-/年]\d{1,2}[.\-/月]\d{1,2}(?:日)?(?:[-_ ]?\d+)?/u, '')
    .replace(/[\p{P}\p{S}\s]+/gu, '')
}

function normalizeEventTitle(value) {
  return normalizeTitle(value)
    .replace(/(?:卡顿|卡頓|完整版|完整版本|完整直播|全程|官方版|剪辑后|剪輯後|中英双语字幕|中英雙語字幕|中文字幕|英文字幕|英语版|英語版|中文版|英文版|x264|\d{3,4}p)+/gu, '')
}

function normalizeWhitespace(value) {
  return replaceUnpairedSurrogates(String(value ?? '')).normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

function normalizeTranscriptText(value) {
  let text = normalizeWhitespace(value)
  for (const [pattern, replacement] of highConfidenceTranscriptCorrections) text = text.replace(pattern, replacement)
  return text
}

function replaceUnpairedSurrogates(value) {
  return Array.from(String(value ?? ''), (character) => {
    const code = character.charCodeAt(0)
    return character.length === 1 && code >= 0xD800 && code <= 0xDFFF ? '\uFFFD' : character
  }).join('')
}

function normalizeSearchDocument(record) {
  return `${record.title} ${record.segments.map((segment) => segment.text).join(' ')}`
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[\p{P}\p{S}\s]+/gu, '')
}

async function atomicBufferWrite(target, value) {
  const temporary = `${target}.tmp`
  await writeFile(temporary, value)
  await rename(temporary, target)
}

function roundTime(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 1000) / 1000) : null
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function argumentValue(name) {
  const prefix = `--${name}=`
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length)
}

function boundedInteger(value, fallback, min, max) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback
}

function delay(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

function reportProgress(done, total, id, status) {
  if (done === total || done % 25 === 0) process.stdout.write(`[${done}/${total}] ${id} ${status}\n`)
}
