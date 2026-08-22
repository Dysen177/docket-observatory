import { createHash } from 'node:crypto'
import { gzip, gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const transcriptRoot = path.resolve(process.env.GUO_INTEL_TRANSCRIPT_DIR ?? path.join(root, 'server', 'public-record-transcripts'))
const auditPath = path.resolve(process.env.FULL_TRANSCRIPT_MERGE_AUDIT_PATH ?? path.join(root, 'output', 'full-public-transcript-merge-audit.json'))
const internetArchiveDir = path.resolve(process.env.INTERNET_ARCHIVE_TRANSCRIPT_DIR ?? path.join(root, 'output'))
const internetArchiveItemUrl = 'https://archive.org/details/2004-Mar152023_VideoTranscripts_MilesGuo'
const ourHimalayasDir = path.resolve(process.env.OURHIMALAYAS_TRANSCRIPT_DIR ?? path.join(root, 'output', 'ourhimalayas-txt'))
const bearRecordsPath = path.resolve(process.env.BEARBLOG_RECORDS_PATH ?? path.join(root, 'output', 'bearblog-transcript-records.json.gz'))
const notebookRecordsPath = path.resolve(process.env.NOTEBOOK_TRANSCRIPT_RECORDS_PATH ?? path.join(root, 'output', 'notebook-transcript-records.json.gz'))
const englishTranscriptManifestPath = path.resolve(process.env.ENGLISH_TRANSCRIPT_MANIFEST_PATH ?? path.join(transcriptRoot, 'en', 'manifest.json'))
const preservedTranscriptRecordsPath = path.join(root, 'scripts', 'data', 'public-record-transcript-preservation.json.gz')
const coverageStart = '2017-01-26'
const coverageEnd = '2023-03-14'
const writeOutput = !process.argv.includes('--dry-run')
const transcriptCorrectionRuleVersion = '2026-08-17-high-confidence-v1'
const globalTranscriptTextCorrections = [
  ['尊敬的战友,们好', '尊敬的战友们好'],
  ['尊敬的战友，们好', '尊敬的战友们好'],
  ['你们坚持了吗', '你们健身了吗'],
  ['理化成政治事件', '理发成政治事件'],
  ['Miles你不能理吧', 'Miles你不能理发'],
  ['刘长发', '留长发'],
  ['斩着火', '站着活'],
  ['咋随着铁锁', '砸碎这铁锁'],
  ['未来人类的最安全货币和银行是那家', '未来人类的最安全货币和银行是哪家'],
  ['尊敬的战友们好、很多战友都在问?未来人类的最安全货币和银行是哪家?', '尊敬的战友们好，很多战友都在问：未来人类最安全的货币和银行是哪家？'],
  ['洗联储', '喜联储'],
  ['洗聯儲', '喜聯儲'],
  ['洗币', '喜币'],
  ['洗幣', '喜幣'],
  ['洗美元', '喜美元'],
  ['盗过贼', '盗国贼'],
  ['盜過賊', '盜國賊'],
  ['买美贼', '卖美贼'],
  ['買美賊', '賣美賊'],
  ['财富的努力', '财富的奴隶'],
  ['法治经', '法治基金'],
  ['稳定比', '稳定币'],
]
const highConfidenceProblemSignals = [
  '尊敬的战友,们好',
  '尊敬的战友，们好',
  '你们坚持了吗',
  '理化成政治事件',
  'Miles你不能理吧',
  '刘长发',
  '斩着火',
  '咋随着铁锁',
  '奔为的',
  '华弱',
  '跌缩',
  '未来人类的最安全货币和银行是那家',
  '尊敬的战友们好、很多战友都在问?未来人类的最安全货币和银行是哪家?',
  '洗联储',
  '洗聯儲',
  '洗币',
  '洗幣',
  '洗美元',
  '盗过贼',
  '盜過賊',
  '买美贼',
  '買美賊',
  '财富的努力',
  '法治经',
  '稳定比',
]
const recordSpecificTranscriptCorrections = {
  '2023-03-14-1': {
    expectedMinimumSegments: 70,
    segments: {
      0: '尊敬的战友们好，你们健身了吗？',
      1: '现在我这个理发成政治事件了。',
      2: '咱们的很多投资人说，哎呀，Miles，你不能理发！',
      3: '有人说把胡子理了，留长发。',
      4: '醒来吧，抛掉所有懦弱。',
      5: '醒来吧，紧握住亲人手，',
      6: '要埋葬那邪恶的中共！',
      7: '牙齿全拔落，铁锁已斑驳，',
      8: '这就是我的一生。',
      9: '战友快醒来，从此要站着活，我们砸碎这铁锁……',
    },
  },
}

await mkdir(path.dirname(auditPath), { recursive: true })

const { manifest, records } = await loadCurrentCorpus()
const preservedRecords = await loadPreservedTranscriptRecords()
const stableTranscriptIds = await loadStableTranscriptIds()
const baseRecords = mergePreservedTranscriptRecords(records, preservedRecords).map(sanitizeRecordForOutput)
const candidateGroups = [
  await loadInternetArchiveCandidates(),
  await loadOurHimalayasCandidates(),
  await loadBearBlogCandidates(),
  await loadNotebookCandidates(),
]
const rawCandidates = candidateGroups.flatMap((group) => group.candidates)
const candidates = dedupeCandidates(rawCandidates).filter((candidate) => candidate.charCount >= 40)
const merge = mergeCandidates(baseRecords, candidates, stableTranscriptIds)
const finalRecords = clearDanglingTranscriptLinks(dedupeOutputRecords(merge.records.map(recomputeRecord)))
finalRecords.sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))

const output = await buildOutputCorpus(finalRecords)
const fullTextRecords = output.manifest.records.filter((record) => record.transcriptSourceType === 'archival_human_transcript')
const generatedAt = new Date().toISOString()
output.manifest.generatedAt = generatedAt
output.manifest.coverage = {
  ...(manifest.coverage ?? {}),
  start: coverageStart,
  end: coverageEnd,
  catalogRecords: manifest.coverage?.catalogRecords ?? manifest.records?.length ?? 0,
  importedRecords: output.manifest.records.length,
  availableTranscripts: output.manifest.records.filter((record) => record.transcriptStatus === 'available').length,
  missingTranscripts: output.manifest.records.filter((record) => record.transcriptStatus !== 'available').length,
  matchedPublicRecords: output.manifest.records.filter((record) => record.matchedPublicRecordId).length,
  transcriptsWithExternalLinks: output.manifest.records.filter((record) => (record.originalLinks?.length ?? 0) > 0 || (record.transcriptSourceLinks?.length ?? 0) > 0).length,
  duplicateTranscriptGroups: duplicateHashGroups(output.manifest.records).length,
  fullTextUpgrades: merge.upgrades.length,
  fullTextAddedRecords: merge.added.length,
  archivalHumanTranscripts: fullTextRecords.length,
  archivalHumanTranscriptCharacters: fullTextRecords.reduce((total, record) => total + (Number(record.charCount) || 0), 0),
  transcriptCharacters: output.manifest.records.reduce((total, record) => total + (record.transcriptStatus === 'available' ? Number(record.charCount) || 0 : 0), 0),
}
output.manifest.audit = {
  ...(stripPrivateAudit(manifest.audit) ?? {}),
  importedAt: generatedAt,
  transcriptTextCorrections: transcriptCorrectionSummary(output.yearRecords),
  fullPublicTranscriptMerge: {
    generatedAt,
    sources: candidateGroups.map((group) => group.audit),
    rawCandidates: rawCandidates.length,
    deduplicatedCandidates: candidates.length,
    upgrades: merge.upgrades.length,
    addedDistinctRecords: merge.added.length,
    matchedButNotSelected: merge.matchedButNotSelected.length,
    rejectedDuplicateCandidates: merge.rejectedDuplicates.length,
    unresolvedCandidates: merge.unresolved.length,
    qualityWarnings: countBy(candidates.flatMap((candidate) => candidate.qualityWarnings), (warning) => warning),
    selectedSourceTypes: countBy([...merge.upgrades, ...merge.added], (item) => item.candidate?.sourceType ?? item.sourceType),
    typoAndTextHealth: textHealthSummary(candidates),
    samples: {
      largestUpgrades: merge.upgrades
        .toSorted((left, right) => right.candidate.charCount - left.candidate.charCount)
        .slice(0, 40)
        .map((item) => candidateAuditSummary(item.candidate, item.record, item.method)),
      addedRecords: merge.added.slice(0, 80).map((item) => candidateAuditSummary(item.candidate, null, 'synthetic')),
      unresolved: merge.unresolved.slice(0, 80).map((candidate) => candidateAuditSummary(candidate, null, 'unresolved')),
      suspiciousText: candidates
        .filter((candidate) => candidate.qualityWarnings.length)
        .toSorted((left, right) => warningSeverity(right) - warningSeverity(left) || right.charCount - left.charCount)
        .slice(0, 120)
        .map((candidate) => candidateAuditSummary(candidate, null, 'quality_warning')),
    },
  },
}

assertNoDisallowedSource(output.manifest, output.yearRecords)

const audit = {
  generatedAt,
  writeOutput,
  inputRecords: records.length,
  outputRecords: output.manifest.records.length,
  inputAvailable: records.filter((record) => record.transcriptStatus === 'available').length,
  outputAvailable: output.manifest.coverage.availableTranscripts,
  inputCharacters: records.reduce((total, record) => total + (record.transcriptStatus === 'available' ? Number(record.charCount) || 0 : 0), 0),
  outputCharacters: output.manifest.coverage.transcriptCharacters,
  fullTextUpgrades: merge.upgrades.length,
  fullTextAddedRecords: merge.added.length,
  archivalHumanTranscripts: fullTextRecords.length,
  sourceAudits: candidateGroups.map((group) => group.audit),
  textCorrections: output.manifest.audit.transcriptTextCorrections,
  qualityWarnings: output.manifest.audit.fullPublicTranscriptMerge.qualityWarnings,
  typoAndTextHealth: output.manifest.audit.fullPublicTranscriptMerge.typoAndTextHealth,
  samples: output.manifest.audit.fullPublicTranscriptMerge.samples,
}
await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')

if (writeOutput) {
  for (const shard of output.shardsToWrite) {
    await atomicBufferWrite(path.join(transcriptRoot, shard.filename), shard.buffer)
  }
  await atomicBufferWrite(path.join(transcriptRoot, 'manifest.json'), Buffer.from(`${JSON.stringify(output.manifest, null, 2)}\n`, 'utf8'))
}

process.stdout.write(`${JSON.stringify({
  writeOutput,
  inputRecords: audit.inputRecords,
  outputRecords: audit.outputRecords,
  inputCharacters: audit.inputCharacters,
  outputCharacters: audit.outputCharacters,
  fullTextUpgrades: audit.fullTextUpgrades,
  fullTextAddedRecords: audit.fullTextAddedRecords,
  archivalHumanTranscripts: audit.archivalHumanTranscripts,
  qualityWarnings: audit.qualityWarnings,
}, null, 2)}\n`)

async function loadCurrentCorpus() {
  const manifestPath = path.join(transcriptRoot, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const records = []
  for (const shard of [...new Set((manifest.records ?? []).map((record) => record.dataShard).filter(Boolean))]) {
    const data = JSON.parse((await gunzipAsync(await readFile(path.join(transcriptRoot, shard)))).toString('utf8'))
    records.push(...data)
  }
  const availableById = new Map(records.map((record) => [record.id, record]))
  for (const metadata of manifest.records ?? []) {
    if (metadata.transcriptStatus === 'available') continue
    if (!availableById.has(metadata.id)) records.push({ ...metadata, segments: [] })
  }
  return { manifest, records }
}

async function loadStableTranscriptIds() {
  try {
    const manifest = JSON.parse(await readFile(englishTranscriptManifestPath, 'utf8'))
    const entries = (manifest.records ?? [])
      .filter((record) => String(record.id ?? '').startsWith('archival-') && record.sourceContentSha256)
      .map((record) => [record.sourceContentSha256, record.id])
    return new Map(entries)
  } catch (error) {
    if (error?.code === 'ENOENT') return new Map()
    throw error
  }
}

async function loadPreservedTranscriptRecords() {
  const payload = JSON.parse((await gunzipAsync(await readFile(preservedTranscriptRecordsPath))).toString('utf8'))
  return Array.isArray(payload.records) ? payload.records : []
}

function mergePreservedTranscriptRecords(records, preservedRecords) {
  const output = [...records]
  const byId = new Map(output.map((record) => [record.id, record]))
  const byHash = new Map(output.filter((record) => record.contentSha256).map((record) => [record.contentSha256, record]))
  for (const preserved of preservedRecords) {
    const existing = byId.get(preserved.id)
    if (existing) {
      const preferPreserved = preserved.transcriptStatus === 'available'
        && Number(preserved.charCount ?? 0) > Number(existing.charCount ?? 0)
      if (preferPreserved) Object.assign(existing, preserved)
      continue
    }
    const identical = preserved.contentSha256 ? byHash.get(preserved.contentSha256) : null
    if (identical) continue
    output.push(preserved)
    byId.set(preserved.id, preserved)
    if (preserved.contentSha256) byHash.set(preserved.contentSha256, preserved)
  }
  return output
}

async function loadInternetArchiveCandidates() {
  const candidates = []
  const files = []
  for (const year of ['2017', '2018', '2019', '2020', '2021', '2022', '2023']) {
    const filename = path.join(internetArchiveDir, `ia-${year}-merged.txt`)
    try {
      const source = await readFile(filename, 'utf8')
      files.push(filename)
      for (const [index, block] of source.split(/\n={5}f={5}\n/u).entries()) {
        const candidate = parseInternetArchiveBlock(block, year, index + 1)
        if (candidate) candidates.push(candidate)
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  return {
    candidates,
    audit: sourceAudit('internet_archive_yearly_text', internetArchiveItemUrl, {
      files: files.map((file) => path.relative(root, file).split(path.sep).join('/')),
      parsedCandidates: candidates.length,
      characters: candidates.reduce((total, candidate) => total + candidate.charCount, 0),
    }),
  }
}

function parseInternetArchiveBlock(block, year, ordinal) {
  const source = replaceUnpairedSurrogates(String(block ?? '')).replace(/^\uFEFF/u, '').trim()
  if (!source) return null
  const sourcePageUrl = source.match(/https?:\/\/gwins\.org\/cn\/milesguo\/\d+\.html/iu)?.[0] ?? internetArchiveItemUrl
  const lines = source.split(/\n/u).map((line) => line.trimEnd())
  const meaningful = lines.map((line) => cleanTextLine(line)).filter(Boolean)
  const title = firstInformativeTitle(meaningful)
  const publishedDate = source.match(/发布时间\s*[：:]\s*(20(?:17|18|19|20|21|22|23))(\d{2})(\d{2})/u)
  const titleDate = dateFromValue(title)
  const date = titleDate ?? (publishedDate ? validDate(publishedDate[1], publishedDate[2], publishedDate[3]) : null)
  if (!date) return null
  const body = bodyAfterContentMarker(source)
  const paragraphs = cleanParagraphs(body || source, title)
  const originalLinks = extractPublicLinks(source)
  return buildCandidate({
    sourceType: 'internet_archive_yearly_text',
    sourceId: `ia-${year}-${ordinal}`,
    date,
    title: title || `${date} public statement transcript`,
    paragraphs,
    originalLinks,
    sourcePageUrls: [sourcePageUrl, internetArchiveItemUrl].filter(Boolean),
    sourcePaths: [`Internet Archive:${year}_merged.txt#${ordinal}`],
    textKind: classifyCandidateTextKind(title, paragraphs),
    qualityWarnings: [
      ...dateQualityWarnings({ date, title, sourcePath: `${year}_merged.txt` }),
      ...(sourcePageUrl === internetArchiveItemUrl ? ['missing_entry_text_source_url'] : []),
    ],
  })
}

function bodyAfterContentMarker(source) {
  const match = String(source).match(/内容梗概\s*[：:]\s*([\s\S]*)$/u)
  if (!match) return ''
  return match[1]
}

function firstInformativeTitle(lines) {
  for (const line of lines) {
    if (/^https?:\/\//iu.test(line)) continue
    if (/^(?:主播人物|涉及人物|公司组织|国家地区|名词解释|文字整理|发布时间|视频链接|相关图书|内容梗概)\s*[：:]/u.test(line)) continue
    if (line.length <= 2) continue
    return line
  }
  return ''
}

async function loadOurHimalayasCandidates() {
  const contentRoot = path.join(ourHimalayasDir, 'content', 'transcript')
  const files = await collectMarkdownFiles(contentRoot).catch(() => [])
  let commit = null
  try {
    const head = await readFile(path.join(ourHimalayasDir, '.git', 'HEAD'), 'utf8')
    if (head.startsWith('ref:')) {
      const refPath = path.join(ourHimalayasDir, '.git', head.replace(/^ref:\s*/u, '').trim())
      commit = (await readFile(refPath, 'utf8')).trim()
    } else {
      commit = head.trim()
    }
  } catch {
    commit = null
  }
  const candidates = []
  for (const filename of files) {
    const relative = path.relative(ourHimalayasDir, filename).split(path.sep).join('/')
    const markdown = await readFile(filename, 'utf8')
    const candidate = parseMarkdownTranscript(markdown, relative, {
      sourceType: 'ourhimalayas_github_text',
      repositoryUrl: 'https://github.com/ourhimalayas/txt',
      blobRef: commit || 'master',
      sourceKey: `ourhimalayas/txt:${relative}`,
    })
    if (candidate) candidates.push(candidate)
  }
  return {
    candidates,
    audit: sourceAudit('ourhimalayas_github_text', 'https://github.com/ourhimalayas/txt', {
      commit,
      markdownFiles: files.length,
      parsedCandidates: candidates.length,
      characters: candidates.reduce((total, candidate) => total + candidate.charCount, 0),
    }),
  }
}

async function collectMarkdownFiles(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await collectMarkdownFiles(target))
    else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('README')) output.push(target)
  }
  return output.sort()
}

function parseMarkdownTranscript(markdown, sourcePath, source) {
  const heading = articleHeading(markdown)
  const title = heading.title
  const date = dateFromValue(title) ?? dateFromPath(sourcePath)
  if (!date) return null
  const paragraphs = cleanParagraphs(String(markdown).slice(heading.bodyStart), title)
  const sourcePageUrl = `${source.repositoryUrl}/blob/${source.blobRef}/${sourcePath.split('/').map(encodeURIComponent).join('/')}`
  return buildCandidate({
    sourceType: source.sourceType,
    sourceId: source.sourceKey,
    date,
    title: title || `${date} public statement transcript`,
    paragraphs,
    originalLinks: extractPublicLinks(markdown),
    sourcePageUrls: [sourcePageUrl],
    sourcePaths: [source.sourceKey],
    textKind: classifyCandidateTextKind(title, paragraphs),
    qualityWarnings: dateQualityWarnings({ date, title, sourcePath }),
  })
}

async function loadBearBlogCandidates() {
  try {
    const parsed = JSON.parse((await gunzipAsync(await readFile(bearRecordsPath))).toString('utf8'))
    const candidates = (parsed.records ?? []).map((record) => buildCandidate({
      sourceType: 'bearblog_public_text',
      sourceId: `bearblog:${record.url}`,
      date: record.date,
      title: record.title,
      paragraphs: cleanParagraphs(record.text, record.title),
      originalLinks: normalizeLinks(record.originalLinks),
      sourcePageUrls: [record.url].filter(Boolean),
      sourcePaths: [`Bear Blog:${record.url}`],
      textKind: record.recordKind === 'public_post_video' ? 'public_post_caption' : classifyCandidateTextKind(record.title, [record.text]),
      qualityWarnings: dateQualityWarnings({ date: record.date, title: record.title, sourcePath: record.url }),
    })).filter(Boolean)
    return {
      candidates,
      audit: sourceAudit('bearblog_public_text', 'https://milesguovideotextlibrary.bearblog.dev', {
        parsedCandidates: candidates.length,
        characters: candidates.reduce((total, candidate) => total + candidate.charCount, 0),
      }),
    }
  } catch (error) {
    return { candidates: [], audit: sourceAudit('bearblog_public_text', 'https://milesguovideotextlibrary.bearblog.dev', { error: String(error?.message ?? error) }) }
  }
}

async function loadNotebookCandidates() {
  try {
    const parsed = JSON.parse((await gunzipAsync(await readFile(notebookRecordsPath))).toString('utf8'))
    const candidates = (parsed.records ?? []).map((record) => buildCandidate({
      sourceType: 'notebook_public_text_bundle',
      sourceId: `notebook:${record.id}`,
      date: record.date,
      title: record.title,
      paragraphs: cleanParagraphs(record.text, record.title),
      originalLinks: normalizeLinks(record.originalLinks),
      sourcePageUrls: normalizeSourceUrls([record.sourcePageUrl]),
      sourcePaths: [`Notebook:${record.sourceFile ?? record.id}`],
      textKind: record.textKind ?? classifyCandidateTextKind(record.title, [record.text]),
      qualityWarnings: [
        ...(Array.isArray(record.qualityWarnings) ? record.qualityWarnings : []),
        ...dateQualityWarnings({ date: record.date, title: record.title, sourcePath: record.sourceFile ?? record.id }),
      ],
    })).filter(Boolean)
    return {
      candidates,
      audit: sourceAudit('notebook_public_text_bundle', 'local audited transcript bundle', {
        parsedCandidates: candidates.length,
        characters: candidates.reduce((total, candidate) => total + candidate.charCount, 0),
      }),
    }
  } catch (error) {
    return { candidates: [], audit: sourceAudit('notebook_public_text_bundle', 'local audited transcript bundle', { error: String(error?.message ?? error) }) }
  }
}

function buildCandidate(input) {
  const date = typeof input.date === 'string' && input.date >= coverageStart && input.date <= coverageEnd ? input.date : null
  if (!date) return null
  const title = normalizeTranscriptTitle(input.title)
  const paragraphs = Array.isArray(input.paragraphs) ? input.paragraphs.map((paragraph, index) => cleanTextLine(paragraph, { title, index })).filter(Boolean) : []
  const dedupedParagraphs = dedupeParagraphs(paragraphs, title).map(normalizeWhitespace).filter(Boolean)
  const text = dedupedParagraphs.join('\n')
  const charCount = dedupedParagraphs.reduce((total, paragraph) => total + Array.from(paragraph).length, 0)
  if (charCount < 40) return null
  const qualityWarnings = [
    ...(input.qualityWarnings ?? []),
    ...textQualityWarnings(text, title, input.textKind),
  ]
  return {
    id: createHash('sha256').update(`${input.sourceType}\n${input.sourceId}\n${date}\n${title}`).digest('hex').slice(0, 24),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    date,
    title: title || `${date} public statement transcript`,
    paragraphs: dedupedParagraphs,
    text,
    charCount,
    contentHash: createHash('sha256').update(normalizeSearchDocumentText(text)).digest('hex'),
    originalLinks: normalizeLinks(input.originalLinks),
    sourcePageUrls: normalizeSourceUrls(input.sourcePageUrls),
    sourcePaths: [...new Set(input.sourcePaths ?? [])],
    textKind: input.textKind ?? classifyCandidateTextKind(title, dedupedParagraphs),
    qualityWarnings: [...new Set(qualityWarnings)].filter(Boolean),
  }
}

function cleanParagraphs(value, title) {
  const text = replaceUnpairedSurrogates(String(Array.isArray(value) ? value.join('\n') : value ?? ''))
    .replace(/^\uFEFF/u, '')
    .replace(/\[轉載自GNews\]\([^)]*\)/giu, ' ')
    .replace(/\[转载自GNews\]\([^)]*\)/giu, ' ')
    .replace(/https?:\/\/\S+/giu, ' ')
  return text.split(/\n\s*\n|\n{1,}/u)
    .map((paragraph, index) => cleanTextLine(paragraph, { title, index }))
    .filter((paragraph) => paragraph.length >= 2)
    .filter((paragraph) => !metadataLine(paragraph))
    .filter((paragraph) => normalizeSearchDocumentText(paragraph) !== normalizeSearchDocumentText(title))
}

function cleanTextLine(value, context = {}) {
  return applyTranscriptCorrections(replaceUnpairedSurrogates(String(value ?? '')), context)
    .normalize('NFKC')
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&(?:nbsp|amp|quot|#39|ldquo|rdquo|hellip);/giu, ' ')
    .replace(/[\\*_~`#>|]+/gu, ' ')
    .replace(/\u00A0/gu, ' ')
    .replace(/[ \t\f\v]+/gu, ' ')
    .trim()
}

function metadataLine(value) {
  return /^(?:主播人物|涉及人物|公司组织|国家地区|名词解释|文字整理|发布时间|视频链接|相关图书|内容梗概|转載自GNews|转载自GNews)\s*[：:]?/u.test(value)
    || /^https?:\/\//iu.test(value)
    || /^[-=]{3,}$/u.test(value)
}

function dedupeParagraphs(paragraphs, title) {
  const output = []
  const seen = new Set()
  for (const paragraph of paragraphs) {
    const key = normalizeSearchDocumentText(paragraph)
    if (!key || key === normalizeSearchDocumentText(title)) continue
    if (key.length >= 80 && seen.has(key)) continue
    if (key.length >= 80) seen.add(key)
    output.push(paragraph)
  }
  return output
}

function articleHeading(markdown) {
  const headings = [...String(markdown ?? '').matchAll(/^#{1,2}\s+(.+)$/gmu)]
    .map((match) => ({ title: cleanTextLine(match[1]), bodyStart: Number(match.index) + match[0].length }))
    .filter((heading) => heading.title && !/^郭文[贵貴]先生[视频視頻]的文字版/u.test(heading.title))
  return headings[0] ?? { title: '', bodyStart: 0 }
}

function mergeCandidates(records, candidates, stableTranscriptIds = new Map()) {
  const recordsById = new Map(records.map((record) => [record.id, record]))
  const byDate = Map.groupBy(records, (record) => record.date)
  const byHash = new Map(records.filter((record) => record.transcriptStatus === 'available').map((record) => [hashRecordText(record), record]))
  const byMedia = buildMediaIndex(records)
  const upgrades = []
  const added = []
  const matchedButNotSelected = []
  const rejectedDuplicates = []
  const unresolved = []

  for (const candidate of candidates.toSorted(compareCandidateQuality)) {
    const exactDuplicate = byHash.get(candidate.contentHash)
    if (exactDuplicate) {
      mergeCandidateSources(exactDuplicate, candidate, false)
      rejectedDuplicates.push({ candidate, record: exactDuplicate, method: 'exact_text' })
      continue
    }

    const candidateTranscriptHash = transcriptHash(untimedSegments(candidate.paragraphs, null))
    const stableId = stableTranscriptIds.get(candidateTranscriptHash)
    if (stableId && !recordsById.has(stableId)) {
      const record = syntheticRecordFromCandidate(candidate, recordsById, stableId)
      records.push(record)
      recordsById.set(record.id, record)
      if (!byDate.has(record.date)) byDate.set(record.date, [])
      byDate.get(record.date).push(record)
      indexRecordMedia(record, byMedia)
      byHash.set(hashRecordText(record), record)
      added.push({ candidate, record, sourceType: candidate.sourceType, method: 'stable_archival_identity' })
      continue
    }

    const match = matchCandidate(candidate, byDate, byMedia)
    if (match?.record) {
      mergeCandidateSources(match.record, candidate, false)
      if (shouldSelectCandidate(match.record, candidate)) {
        applyCandidateToRecord(match.record, candidate, match.method)
        byHash.set(hashRecordText(match.record), match.record)
        upgrades.push({ candidate, record: match.record, method: match.method })
      } else {
        matchedButNotSelected.push({ candidate, record: match.record, method: match.method })
      }
      continue
    }

    if (isLikelyDuplicateCandidate(candidate, byDate.get(candidate.date) ?? [])) {
      rejectedDuplicates.push({ candidate, record: null, method: 'same_date_probable_duplicate' })
      continue
    }
    if (candidate.charCount < 40 || candidate.textKind === 'summary') {
      unresolved.push(candidate)
      continue
    }
    const record = syntheticRecordFromCandidate(candidate, recordsById)
    records.push(record)
    recordsById.set(record.id, record)
    if (!byDate.has(record.date)) byDate.set(record.date, [])
    byDate.get(record.date).push(record)
    indexRecordMedia(record, byMedia)
    byHash.set(hashRecordText(record), record)
    added.push({ candidate, record, sourceType: candidate.sourceType })
  }
  return { records, upgrades, added, matchedButNotSelected, rejectedDuplicates, unresolved }
}

function buildMediaIndex(records) {
  const index = new Map()
  for (const record of records) indexRecordMedia(record, index)
  return index
}

function indexRecordMedia(record, index) {
  for (const link of record.originalLinks ?? []) {
    const key = canonicalMediaUrl(link.url)
    if (!key) continue
    const bucketKey = `${record.date}\u0000${key}`
    if (!index.has(bucketKey)) index.set(bucketKey, [])
    index.get(bucketKey).push(record)
  }
}

function matchCandidate(candidate, byDate, byMedia) {
  for (const link of candidate.originalLinks) {
    const matches = byMedia.get(`${candidate.date}\u0000${canonicalMediaUrl(link.url)}`) ?? []
    if (matches.length === 1) return { record: matches[0], method: 'same_date_media_url' }
  }
  const sameDate = byDate.get(candidate.date) ?? []
  const titleMatches = sameDate
    .map((record) => ({ record, score: titleSimilarity(record.title, candidate.title), ordinalConflict: ordinalConflict(record.title, candidate.title) }))
    .filter((item) => !item.ordinalConflict && item.score >= 0.78)
    .toSorted((left, right) => right.score - left.score)
  if (titleMatches.length && (titleMatches.length === 1 || titleMatches[0].score - titleMatches[1].score >= 0.06 || titleMatches[0].score >= 0.96)) {
    return { record: titleMatches[0].record, method: titleMatches[0].score >= 0.96 ? 'same_date_title_exactish' : `same_date_title_${titleMatches[0].score.toFixed(2)}` }
  }
  const textMatches = sameDate
    .filter((record) => record.transcriptStatus === 'available' && Array.isArray(record.segments) && record.segments.length)
    .map((record) => {
      const currentText = record.segments.map((segment) => segment.text).join(' ')
      const overlap = transcriptTextOverlap(candidate.text, currentText)
      const ratio = Math.min(candidate.charCount, Number(record.charCount) || 0) / Math.max(candidate.charCount, Number(record.charCount) || 1)
      const score = overlap * 0.72 + ratio * 0.12 + titleSimilarity(record.title, candidate.title) * 0.16
      return { record, overlap, ratio, score, ordinalConflict: ordinalConflict(record.title, candidate.title) }
    })
    .filter((item) => !item.ordinalConflict && ((item.overlap >= 0.08 && item.ratio >= 0.45) || item.overlap >= 0.18))
    .toSorted((left, right) => right.score - left.score)
  if (textMatches.length && (textMatches.length === 1 || textMatches[0].score - textMatches[1].score >= 0.05)) {
    return { record: textMatches[0].record, method: `same_date_text_${textMatches[0].overlap.toFixed(2)}` }
  }
  return null
}

function shouldSelectCandidate(record, candidate) {
  if (candidate.textKind === 'summary') return false
  if (candidate.qualityWarnings.includes('mostly_non_cjk') && candidate.charCount < 1000) return false
  const current = Number(record.charCount) || 0
  if (record.transcriptStatus !== 'available' || !record.segments?.length) return candidate.charCount >= 500
  if (record.transcriptSourceType === 'archival_human_transcript' && candidate.charCount <= current * 1.03) return false
  if (candidate.charCount >= current * 1.08 && candidate.charCount - current >= 600) return true
  const currentPossiblyIncomplete = record.transcriptQuality === 'possibly_incomplete' || (record.transcriptQualityReasons ?? []).includes('sparse_text')
  if (currentPossiblyIncomplete && candidate.charCount > current && candidate.charCount >= current * 0.8) return true
  return false
}

function applyCandidateToRecord(record, candidate, matchMethod) {
  const durationSec = Number(record.durationSec) > 0 ? Number(record.durationSec) : null
  const segments = untimedSegments(candidate.paragraphs, durationSec)
  Object.assign(record, {
    transcriptStatus: 'available',
    upstreamTranscriptStatus: 'public_archival_available',
    completeness: 'archival_human_transcript',
    transcriptSourceType: 'archival_human_transcript',
    transcriptBoundaryVerified: false,
    language: /[\p{Script=Han}]/u.test(candidate.text) ? 'zh' : record.language ?? 'unknown',
    originalLinks: mergeOriginalLinks(record.originalLinks ?? [], candidate.originalLinks),
    transcriptSourceLinks: mergeOriginalLinks(record.transcriptSourceLinks ?? [], sourceLinks(candidate)),
    segments,
    charCount: segments.reduce((total, segment) => total + segment.text.length, 0),
    contentSha256: transcriptHash(segments),
    fullTextAudit: fullTextAudit(candidate, false, matchMethod),
  })
}

function mergeCandidateSources(record, candidate, selected) {
  record.originalLinks = mergeOriginalLinks(record.originalLinks ?? [], candidate.originalLinks)
  record.transcriptSourceLinks = mergeOriginalLinks(record.transcriptSourceLinks ?? [], sourceLinks(candidate))
  if (!selected) {
    record.fullTextAlternates = dedupeFullTextAlternates([...(record.fullTextAlternates ?? []), {
      sourceType: candidate.sourceType,
      sourcePageUrls: candidate.sourcePageUrls,
      sourcePaths: candidate.sourcePaths,
      charCount: candidate.charCount,
      textKind: candidate.textKind,
      selected: false,
    }]).slice(-12)
  }
}

function syntheticRecordFromCandidate(candidate, recordsById, preferredId = null) {
  let id = preferredId || `archival-${candidate.contentHash.slice(0, 16)}`
  let suffix = 1
  while (recordsById.has(id)) {
    suffix += 1
    id = `archival-${candidate.contentHash.slice(0, 14)}-${suffix}`
  }
  const segments = untimedSegments(candidate.paragraphs, null)
  const classification = classifyRecord({ title: candidate.title, durationSec: null, segments, charCount: candidate.charCount, transcriptSourceType: 'archival_human_transcript' })
  return {
    id,
    date: candidate.date,
    title: candidate.title,
    durationSec: null,
    language: /[\p{Script=Han}]/u.test(candidate.text) ? 'zh' : 'unknown',
    transcriptStatus: 'available',
    upstreamTranscriptStatus: 'public_archival_available',
    completeness: 'archival_human_transcript',
    matchedPublicRecordId: null,
    originalLinks: candidate.originalLinks,
    transcriptSourceLinks: sourceLinks(candidate),
    segments,
    charCount: segments.reduce((total, segment) => total + segment.text.length, 0),
    contentSha256: transcriptHash(segments),
    importError: null,
    transcriptSourceType: 'archival_human_transcript',
    transcriptBoundaryVerified: false,
    fullTextAudit: fullTextAudit(candidate, true, 'distinct_public_source'),
    ...classification,
  }
}

function fullTextAudit(candidate, synthetic, matchMethod) {
  return {
    sourceType: candidate.sourceType,
    sourcePageUrls: candidate.sourcePageUrls,
    sourcePaths: candidate.sourcePaths,
    originalLinks: candidate.originalLinks,
    textKind: candidate.textKind,
    matched: !synthetic,
    synthetic,
    selected: true,
    matchMethod,
    timecoded: false,
    paragraphCount: candidate.paragraphs.length,
    charCount: candidate.charCount,
    contentHash: candidate.contentHash,
    qualityWarnings: candidate.qualityWarnings,
    reviewedAt: new Date().toISOString(),
  }
}

function isLikelyDuplicateCandidate(candidate, sameDateRecords) {
  const titleMatches = sameDateRecords
    .filter((record) => !ordinalConflict(record.title, candidate.title))
    .map((record) => ({
      record,
      titleScore: titleSimilarity(record.title, candidate.title),
      ratio: Math.min(candidate.charCount, Number(record.charCount) || 0) / Math.max(candidate.charCount, Number(record.charCount) || 1),
    }))
    .toSorted((left, right) => right.titleScore - left.titleScore)
  const bestTitle = titleMatches[0]
  if (bestTitle && bestTitle.titleScore >= 0.88 && bestTitle.ratio >= 0.55) return true
  for (const record of sameDateRecords.filter((item) => item.transcriptStatus === 'available')) {
    const currentText = record.segments?.map((segment) => segment.text).join(' ') ?? ''
    if (!currentText) continue
    const overlap = transcriptTextOverlap(candidate.text, currentText)
    const ratio = Math.min(candidate.charCount, Number(record.charCount) || 0) / Math.max(candidate.charCount, Number(record.charCount) || 1)
    if (overlap >= 0.1 && ratio >= 0.82) return true
  }
  return false
}

function dedupeCandidates(candidates) {
  const groups = Map.groupBy(candidates.filter(Boolean), (candidate) => candidate.contentHash)
  return [...groups.values()].map((group) => group.toSorted(compareCandidateQuality)[0])
}

function compareCandidateQuality(left, right) {
  return warningSeverity(left) - warningSeverity(right)
    || sourceRank(left.sourceType) - sourceRank(right.sourceType)
    || right.charCount - left.charCount
    || left.date.localeCompare(right.date)
}

function sourceRank(sourceType) {
  return ({
    internet_archive_yearly_text: 1,
    ourhimalayas_github_text: 2,
    bearblog_public_text: 3,
    notebook_public_text_bundle: 4,
  })[sourceType] ?? 9
}

function warningSeverity(candidate) {
  const weights = {
    metadata_only: 100,
    date_mismatch: 80,
    mostly_non_cjk: 40,
    possible_summary: 30,
    replacement_character: 15,
    question_mark_runs: 8,
    very_short_text: 20,
  }
  return (candidate.qualityWarnings ?? []).reduce((total, warning) => total + (weights[warning] ?? 1), 0)
}

function dedupeOutputRecords(records) {
  const output = []
  const byHash = new Map()
  for (const record of records) {
    if (record.transcriptStatus !== 'available') {
      output.push(record)
      continue
    }
    const hash = hashRecordText(record)
    const duplicate = byHash.get(hash)
    if (!duplicate) {
      byHash.set(hash, record)
      output.push(record)
      continue
    }
    duplicate.originalLinks = mergeOriginalLinks(duplicate.originalLinks ?? [], record.originalLinks ?? [])
    duplicate.transcriptSourceLinks = mergeOriginalLinks(duplicate.transcriptSourceLinks ?? [], record.transcriptSourceLinks ?? [])
  }
  return output
}

function clearDanglingTranscriptLinks(records) {
  const ids = new Set(records.map((record) => record.id))
  for (const record of records) {
    if (record.linkedTranscriptId && !ids.has(record.linkedTranscriptId)) record.linkedTranscriptId = null
  }
  return records
}

async function buildOutputCorpus(records) {
  const available = records.filter((record) => record.transcriptStatus === 'available')
  const byYear = Map.groupBy(available, (record) => record.date.slice(0, 4))
  const shardsToWrite = []
  const shardSummaries = []
  const storage = new Map()
  const yearRecordsOutput = {}
  for (const [year, yearRecords] of [...byYear.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const sorted = yearRecords.toSorted((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
    const dataFilename = `${year}.json.gz`
    const searchFilename = `${year}.search.bin`
    const searchChunks = []
    let searchOffset = 0
    for (const record of sorted) {
      const searchChunk = Buffer.from(normalizeSearchDocument(record), 'utf8')
      storage.set(record.id, {
        dataShard: dataFilename,
        searchShard: searchFilename,
        searchOffset,
        searchLength: searchChunk.length,
      })
      searchChunks.push(searchChunk)
      searchOffset += searchChunk.length
    }
    const dataBuffer = await gzipAsync(Buffer.from(JSON.stringify(sorted)), { level: 9 })
    const searchBuffer = Buffer.concat(searchChunks, searchOffset)
    shardsToWrite.push({ filename: dataFilename, buffer: dataBuffer }, { filename: searchFilename, buffer: searchBuffer })
    shardSummaries.push({ id: year, dataFilename, searchFilename, recordCount: sorted.length, dataBytes: dataBuffer.length, searchBytes: searchBuffer.length })
    yearRecordsOutput[year] = sorted
  }
  const manifestRecords = records.map((record) => manifestRecord(record, storage.get(record.id)))
  return {
    shardsToWrite,
    yearRecords: yearRecordsOutput,
    manifest: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      coverage: {},
      shards: shardSummaries,
      records: manifestRecords,
      audit: {},
    },
  }
}

function manifestRecord(record, storage) {
  return sanitizeRecordForOutput({
    id: record.id,
    date: record.date,
    title: record.title,
    durationSec: finiteNumber(record.durationSec),
    language: record.language ?? 'unknown',
    transcriptStatus: record.transcriptStatus,
    upstreamTranscriptStatus: record.upstreamTranscriptStatus ?? null,
    completeness: record.completeness ?? null,
    recordKind: record.recordKind,
    durationQuality: record.durationQuality,
    transcriptQuality: record.transcriptQuality,
    transcriptQualityReasons: record.transcriptQualityReasons ?? [],
    transcriptStartSec: finiteNumber(record.transcriptStartSec),
    transcriptEndSec: finiteNumber(record.transcriptEndSec),
    transcriptSpanRatio: finiteNumber(record.transcriptSpanRatio),
    transcriptBoundaryVerified: Boolean(record.transcriptBoundaryVerified),
    transcriptSourceType: record.transcriptSourceType ?? null,
    publicSubtitleAudit: record.publicSubtitleAudit ?? null,
    communityTranscriptAudit: record.communityTranscriptAudit ?? null,
    legacyTranscriptAudit: record.legacyTranscriptAudit ?? null,
    publicPostAudit: record.publicPostAudit ?? null,
    fullTextAudit: record.fullTextAudit ?? null,
    fullTextAlternates: record.fullTextAlternates ?? [],
    ...(storage ?? {
      dataShard: null,
      searchShard: null,
      searchOffset: null,
      searchLength: null,
    }),
    segmentCount: Array.isArray(record.segments) ? record.segments.length : 0,
    charCount: Number(record.charCount) || 0,
    contentSha256: record.contentSha256 ?? null,
    matchedPublicRecordId: record.matchedPublicRecordId ?? null,
    originalLinks: record.originalLinks ?? [],
    transcriptSourceLinks: record.transcriptSourceLinks ?? [],
    importError: record.importError ?? null,
    linkedTranscriptId: record.linkedTranscriptId ?? null,
  })
}

function recomputeRecord(record) {
  const sanitized = sanitizeRecordForOutput(record)
  const title = normalizeTranscriptTitle(sanitized.title)
  const segmentCount = Array.isArray(sanitized.segments) ? sanitized.segments.length : 0
  const segments = Array.isArray(sanitized.segments)
    ? sanitized.segments.map((segment, index) => normalizeSegment(segment, { ...sanitized, title, segmentCount }, index)).filter(Boolean)
    : []
  const withSegments = { ...sanitized, title, segments }
  if (withSegments.transcriptStatus === 'available') {
    withSegments.charCount = segments.reduce((total, segment) => total + segment.text.length, 0)
    withSegments.contentSha256 = transcriptHash(segments)
  } else {
    withSegments.charCount = 0
    withSegments.contentSha256 = null
  }
  const textCorrectionAudit = buildRecordSpecificCorrectionAudit(sanitized.id, sanitized.segments, segments)
  if (textCorrectionAudit) withSegments.textCorrectionAudit = textCorrectionAudit
  else delete withSegments.textCorrectionAudit
  Object.assign(withSegments, classifyRecord(withSegments))
  return withSegments
}

function sanitizeRecordForOutput(record) {
  const output = { ...record }
  delete output.sourceAudit
  delete output.gettrSearchTranscriptAudit
  if (typeof output.title === 'string') output.title = normalizeTranscriptTitle(output.title)
  output.originalLinks = normalizeLinks(output.originalLinks ?? [])
  output.transcriptSourceLinks = normalizeLinks(output.transcriptSourceLinks ?? [])
  for (const key of ['publicSubtitleAudit', 'communityTranscriptAudit', 'legacyTranscriptAudit', 'publicPostAudit', 'fullTextAudit']) {
    if (output[key]) output[key] = sanitizeObject(output[key])
  }
  if (Array.isArray(output.fullTextAlternates)) output.fullTextAlternates = dedupeFullTextAlternates(output.fullTextAlternates.map(sanitizeObject).filter(Boolean))
  return output
}

function sanitizeObject(value) {
  if (Array.isArray(value)) return value.map(sanitizeObject).filter((item) => item !== null)
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && /gettrsearch/iu.test(value)) return null
    return value
  }
  const output = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' && /gettrsearch/iu.test(item)) continue
    const sanitized = sanitizeObject(item)
    if (sanitized !== null) output[key] = sanitized
  }
  return output
}

function stripPrivateAudit(audit) {
  if (!audit || typeof audit !== 'object') return {}
  const output = sanitizeObject(audit)
  delete output.upstreamCatalogUrl
  delete output.gettrSearchTranscripts
  return output
}

function assertNoDisallowedSource(manifest, yearRecords) {
  const serialized = `${JSON.stringify(manifest)}\n${JSON.stringify(yearRecords)}`
  if (/gettrsearch/iu.test(serialized)) throw new Error('A disallowed verification-source URL leaked into the public transcript corpus.')
}

function sourceLinks(candidate) {
  return normalizeLinks(candidate.sourcePageUrls.map((url) => ({
    platform: platformForUrlString(url),
    url,
  })))
}

function normalizeLinks(values) {
  const candidates = Array.isArray(values) ? values : []
  const seen = new Set()
  const output = []
  for (const item of candidates) {
    const url = typeof item === 'string' ? item : item?.url
    const normalized = safePublicUrl(url)
    if (!normalized) continue
    const key = canonicalUrl(normalized)
    if (seen.has(key)) continue
    seen.add(key)
    output.push({ platform: typeof item === 'object' && item?.platform ? String(item.platform) : platformForUrlString(normalized), url: normalized })
  }
  return output
}

function normalizeSourceUrls(values) {
  return normalizeLinks(values.map((url) => ({ url }))).map((link) => link.url)
}

function safePublicUrl(value) {
  try {
    const url = new URL(String(value ?? '').replace(/&amp;/giu, '&').replace(/[.,;]+$/gu, ''))
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const host = url.hostname.replace(/^www\./u, '').toLowerCase()
    if (host === 'gettrsearch.com' || host === 'gettrsearchassets.s3.amazonaws.com') return null
    if (/\.(?:jpe?g|png|webp|gif|svg)(?:$|\?)/iu.test(url.pathname)) return null
    url.protocol = 'https:'
    url.hostname = host
    return url.toString()
  } catch {
    return null
  }
}

function extractPublicLinks(value) {
  const candidates = [
    ...[...String(value ?? '').matchAll(/\]\((https?:\/\/[^)\s]+)\)/giu)].map((match) => match[1]),
    ...[...String(value ?? '').matchAll(/https?:\/\/[^\s)\]]+/giu)].map((match) => match[0]),
  ]
  const allowed = /(?:^|\.)(?:youtube\.com|youtu\.be|twitter\.com|x\.com|livestream\.com|vimeo\.com|gettr\.com|rumble\.com|odysee\.com|gtv\.org|gtv\.com)$/iu
  return normalizeLinks(candidates.filter((raw) => {
    try {
      const url = new URL(raw.replace(/&amp;/giu, '&'))
      return allowed.test(url.hostname.replace(/^www\./u, '').toLowerCase())
    } catch {
      return false
    }
  }))
}

function classifyCandidateTextKind(title, paragraphs) {
  const normalizedTitle = String(title ?? '').normalize('NFKC').toLowerCase()
  const text = paragraphs.slice(0, 8).join(' ')
  if (/内容梗概|摘要|重点整理|精要|summary/iu.test(normalizedTitle)) return 'summary'
  if (/字幕|subtitle|srt/iu.test(normalizedTitle)) return 'subtitle_text'
  if (/全文字版|全文听写|全文聽寫|文字版|文字稿|实录|實錄|直播/iu.test(normalizedTitle)) return 'editorial_text'
  if (/(?:^|\s)(?:郭文[贵貴]|文[贵貴]|郭先生)\s*[：:]/u.test(text)) return 'editorial_text'
  return 'editorial_text'
}

function textQualityWarnings(text, title, textKind) {
  const warnings = []
  const normalized = normalizeSearchDocumentText(text)
  if (normalized.length < 80) warnings.push('very_short_text')
  if (/\uFFFD/u.test(text)) warnings.push('replacement_character')
  if (/[?？]{4,}/u.test(text)) warnings.push('question_mark_runs')
  if (textKind === 'summary' || /内容梗概|摘要|重点整理|summary/iu.test(title)) warnings.push('possible_summary')
  const han = (text.match(/\p{Script=Han}/gu) ?? []).length
  if (text.length >= 500 && han / Math.max(1, Array.from(text).length) < 0.18) warnings.push('mostly_non_cjk')
  if (/^(?:主播人物|涉及人物|公司组织|国家地区|名词解释|文字整理|发布时间|视频链接|相关图书|内容梗概)\s*[：:]/u.test(text.trim())) warnings.push('metadata_only')
  return warnings
}

function dateQualityWarnings({ date, title, sourcePath }) {
  const titleDate = dateFromValue(title)
  const pathDate = dateFromPath(sourcePath)
  const warnings = []
  if (titleDate && pathDate && titleDate !== pathDate && date !== titleDate) warnings.push('date_mismatch')
  return warnings
}

function dateFromValue(value) {
  const normalized = String(value ?? '').normalize('NFKC')
  const chinese = normalized.match(/(20(?:17|18|19|20|21|22|23))\s*年?\s*(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号|號)?/u)
  if (chinese) return validDate(chinese[1], chinese[2], chinese[3])
  const separated = normalized.match(/\b(20(?:17|18|19|20|21|22|23))[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})\b/u)
  if (separated) return validDate(separated[1], separated[2], separated[3])
  const compact = normalized.match(/\b(20(?:17|18|19|20|21|22|23))(\d{2})(\d{2})\b/u)
  if (compact) return validDate(compact[1], compact[2], compact[3])
  return null
}

function dateFromPath(value) {
  const compact = String(value ?? '').match(/(20(?:17|18|19|20|21|22|23))\/?(\d{2})\/?(\d{2})/u)
  return compact ? validDate(compact[1], compact[2], compact[3]) : null
}

function validDate(year, month, day) {
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return iso >= coverageStart && iso <= coverageEnd ? iso : null
}

function untimedSegments(paragraphs, durationSec) {
  const end = Number.isFinite(Number(durationSec)) && Number(durationSec) > 0 ? Number(durationSec) : 0
  return paragraphs.map((text) => ({ start: 0, end, text }))
}

function normalizeSegment(segment, context = {}, index = 0) {
  const text = cleanTextLine(segment?.text, { ...context, index })
  if (!text) return null
  const start = finiteNumber(segment?.start) ?? 0
  const end = Math.max(start, finiteNumber(segment?.end) ?? start)
  return { start, end, text }
}

function classifyRecord(record) {
  if (record.transcriptSourceType === 'public_post_caption') {
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
  const title = String(record.title ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN')
  const duration = Number(record.durationSec)
  const hasDuration = Number.isFinite(duration) && duration > 0
  const excerptTitle = /直播重点|重点(?:\s*片段|剪辑)?|片段|剪辑|节选|精彩片段|excerpt|clip|highlights?/iu.test(title)
  const shortVideoTitle = /小视频|短视频|short\s*video|盖特|gettr/iu.test(title)
  const livestreamTitle = /直播|livestream|live\s*(?:broadcast|stream)/iu.test(title)
  const claimsComplete = /完整版|完整直播|全程|全文字版|full\s*(?:version|broadcast|livestream)/iu.test(title)
  let recordKind = record.recordKind ?? 'unknown'
  if (record.transcriptSourceType === 'archival_human_transcript' && (livestreamTitle || claimsComplete)) recordKind = 'full_broadcast'
  else if (shortVideoTitle) recordKind = 'short_video'
  else if (excerptTitle) recordKind = 'broadcast_excerpt'
  else if (hasDuration && duration >= 3600) recordKind = 'full_broadcast'
  let durationQuality = hasDuration ? 'plausible' : 'unknown'
  if (!excerptTitle && !shortVideoTitle && livestreamTitle && hasDuration && duration < 600) durationQuality = 'suspiciously_short'
  if (claimsComplete && hasDuration && duration < 1800) durationQuality = 'suspiciously_short'
  const coverage = analyzeCoverage(record, durationQuality)
  return { recordKind, durationQuality, ...coverage }
}

function analyzeCoverage(record, durationQuality) {
  const segments = Array.isArray(record.segments) ? record.segments : []
  const firstStart = finiteNumber(segments[0]?.start)
  const lastEnd = finiteNumber(segments.at(-1)?.end ?? segments.at(-1)?.start)
  const duration = Number(record.durationSec)
  const hasDuration = Number.isFinite(duration) && duration > 0
  const reasons = []
  if (durationQuality === 'suspiciously_short') reasons.push('suspicious_duration')
  const untimed = record.transcriptSourceType === 'archival_human_transcript' || record.transcriptSourceType === 'legacy_human_transcript'
  if (!untimed && hasDuration && lastEnd !== null && lastEnd > duration + 5) reasons.push('timeline_overrun')
  if (!untimed && hasDuration && firstStart !== null && duration >= 1800 && firstStart > 600 && firstStart / duration > 0.08) reasons.push('late_start')
  if (!untimed && hasDuration && lastEnd !== null && duration >= 1800 && lastEnd < duration - 600 && (duration - lastEnd) / duration > 0.08) reasons.push('early_end')
  const transcriptSpanRatio = hasDuration && firstStart !== null && lastEnd !== null
    ? Math.max(0, Math.min(lastEnd, duration) - Math.max(0, firstStart)) / duration
    : null
  if (!untimed && hasDuration && duration >= 600 && transcriptSpanRatio !== null && transcriptSpanRatio < 0.65) reasons.push('short_span')
  const charsPerMinute = hasDuration && Number.isFinite(Number(record.charCount)) ? Number(record.charCount) / (duration / 60) : null
  if (!untimed && duration >= 1800 && charsPerMinute !== null && charsPerMinute < 50) reasons.push('sparse_text')
  return {
    transcriptQuality: reasons.filter((reason) => reason !== 'timeline_overrun').length ? 'possibly_incomplete' : (segments.length ? 'plausible' : 'unknown'),
    transcriptQualityReasons: [...new Set(reasons)],
    transcriptStartSec: firstStart,
    transcriptEndSec: lastEnd,
    transcriptSpanRatio,
  }
}

function sourceAudit(sourceType, sourceUrl, extra = {}) {
  return {
    sourceType,
    sourceUrl,
    ...extra,
  }
}

function candidateAuditSummary(candidate, record, method) {
  return {
    date: candidate.date,
    title: candidate.title,
    charCount: candidate.charCount,
    sourceType: candidate.sourceType,
    textKind: candidate.textKind,
    qualityWarnings: candidate.qualityWarnings,
    sourcePageUrls: candidate.sourcePageUrls.slice(0, 4),
    sourcePaths: candidate.sourcePaths.slice(0, 4),
    matchedRecordId: record?.id ?? null,
    matchedRecordTitle: record?.title ?? null,
    matchedRecordCharCount: record?.charCount ?? null,
    method,
  }
}

function textHealthSummary(candidates) {
  return {
    candidates: candidates.length,
    replacementCharacter: candidates.filter((candidate) => candidate.qualityWarnings.includes('replacement_character')).length,
    questionMarkRuns: candidates.filter((candidate) => candidate.qualityWarnings.includes('question_mark_runs')).length,
    possibleSummary: candidates.filter((candidate) => candidate.qualityWarnings.includes('possible_summary')).length,
    dateMismatch: candidates.filter((candidate) => candidate.qualityWarnings.includes('date_mismatch')).length,
    mostlyNonCjk: candidates.filter((candidate) => candidate.qualityWarnings.includes('mostly_non_cjk')).length,
  }
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

function transcriptHash(segments) {
  const joined = segments.map((segment) => `${segment.start}\t${segment.end}\t${segment.text}`).join('\n')
  return segments.length ? createHash('sha256').update(joined).digest('hex') : null
}

function hashRecordText(record) {
  return createHash('sha256').update(normalizeSearchDocumentText((record.segments ?? []).map((segment) => segment.text).join('\n'))).digest('hex')
}

function normalizeSearchDocument(record) {
  return `${record.title} ${(record.segments ?? []).map((segment) => segment.text).join(' ')}`
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[\p{P}\p{S}\s]+/gu, '')
}

function normalizeSearchDocumentText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, '')
}

function transcriptTextOverlap(left, right) {
  const a = ngramSet(normalizeSearchDocumentText(left), 8, 4)
  const b = ngramSet(normalizeSearchDocumentText(right), 8, 4)
  if (!a.size || !b.size) return 0
  let overlap = 0
  const smaller = a.size <= b.size ? a : b
  const larger = smaller === a ? b : a
  for (const value of smaller) if (larger.has(value)) overlap += 1
  return overlap / Math.min(a.size, b.size)
}

function ngramSet(value, width, step) {
  const output = new Set()
  if (!value) return output
  if (value.length <= width) {
    output.add(value)
    return output
  }
  const limit = Math.min(value.length - width, 80_000)
  for (let index = 0; index <= limit; index += step) output.add(value.slice(index, index + width))
  return output
}

function titleSimilarity(left, right) {
  const a = normalizeEventTitle(left)
  const b = normalizeEventTitle(right)
  if (!a || !b) return 0
  if (a === b) return 1
  const shorter = a.length <= b.length ? a : b
  const longer = shorter === a ? b : a
  if (shorter.length >= 6 && longer.includes(shorter)) return 0.96
  return bigramDice(a, b)
}

function bigramDice(left, right) {
  const a = ngramSet(left, 2, 1)
  const b = ngramSet(right, 2, 1)
  if (!a.size || !b.size) return 0
  let overlap = 0
  for (const value of a) if (b.has(value)) overlap += 1
  return (2 * overlap) / (a.size + b.size)
}

function ordinalConflict(left, right) {
  const a = ordinal(left)
  const b = ordinal(right)
  return a !== null && b !== null && a !== b
}

function ordinal(value) {
  const normalized = String(value ?? '').normalize('NFKC').toLowerCase()
  const match = normalized.match(/(?:第|直播第?)([123一二三])(?:段|部分|次直播|次)/u)
    ?? normalized.match(/(?:^|[_\s-])([123])(?:st|nd|rd)?\s*(?:part|segment)?(?:\D|$)/iu)
    ?? normalized.match(/\b20\d{6}[_-]([123])\b/u)
  if (!match) return null
  return ({ '1': 1, '一': 1, '2': 2, '二': 2, '3': 3, '三': 3 })[match[1]] ?? null
}

function normalizeEventTitle(value) {
  return normalizeTranscriptTitle(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\d{4}\s*[.\-/年]\s*\d{1,2}\s*[.\-/月]\s*\d{1,2}(?:\s*日)?(?:[-_. ]?\d+)?/gu, ' ')
    .replace(/\b\d{8}(?:_\d+)?\b/gu, ' ')
    .replace(/郭文贵|郭文貴|文贵|文貴|先生|大直播|直播|盖特|蓋特|gettr|视频|視頻|完整版|完整版本|完整直播|全程|全文字版|全文字|文字版|实录|實錄|x264|\d{3,4}p/gu, ' ')
    .replace(/[\p{P}\p{S}\s_]+/gu, '')
}

function mergeOriginalLinks(...groups) {
  const seen = new Set()
  const output = []
  for (const link of groups.flat()) {
    const normalized = safePublicUrl(link?.url)
    if (!normalized) continue
    const key = canonicalUrl(normalized)
    if (seen.has(key)) continue
    seen.add(key)
    output.push({ platform: link?.platform ? String(link.platform) : platformForUrlString(normalized), url: normalized })
  }
  return output
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

function canonicalUrl(value) {
  try {
    const url = new URL(value)
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key)
    url.hostname = url.hostname.replace(/^www\./u, '').toLowerCase()
    url.pathname = url.pathname.replace(/\/+$/u, '') || '/'
    return url.toString().toLowerCase()
  } catch {
    return String(value ?? '').trim().toLowerCase()
  }
}

function platformForUrlString(value) {
  try {
    const host = new URL(value).hostname.replace(/^www\./u, '').toLowerCase()
    if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) return 'youtube'
    if (host === 'gettr.com' || host.endsWith('.gettr.com')) return 'gettr'
    if (host === 'rumble.com' || host.endsWith('.rumble.com')) return 'rumble'
    if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.twitter.com')) return 'x'
    if (host === 'odysee.com' || host.endsWith('.odysee.com')) return 'odysee'
    if (host === 'github.com' || host.endsWith('.github.com')) return 'github_transcript'
    if (host === 'archive.org' || host.endsWith('.archive.org')) return 'internet_archive'
    if (host === 'bearblog.dev' || host.endsWith('.bearblog.dev')) return 'bearblog_transcript'
    if (host === 'gwins.org' || host.endsWith('.gwins.org')) return 'gwins.org'
    return host
  } catch {
    return 'public_source'
  }
}

function countBy(items, iteratee) {
  const output = {}
  for (const item of items) {
    const key = iteratee(item)
    output[key] = (output[key] ?? 0) + 1
  }
  return output
}

function normalizeWhitespace(value) {
  return replaceUnpairedSurrogates(String(value ?? '')).normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

function normalizeTranscriptTitle(value) {
  return applyTranscriptCorrections(normalizeWhitespace(value), { kind: 'title' })
}

function applyTranscriptCorrections(value, context = {}) {
  let text = String(value ?? '')
  for (const [searchValue, replacement] of globalTranscriptTextCorrections) {
    text = text.split(searchValue).join(replacement)
  }
  const recordId = context?.recordId ?? context?.id ?? null
  const correction = recordId ? recordSpecificTranscriptCorrections[recordId] : null
  if (correction) {
    const expectedMinimumSegments = Number(correction.expectedMinimumSegments) || 0
    const segmentCount = Number(context?.segmentCount) || 0
    if (!expectedMinimumSegments || segmentCount >= expectedMinimumSegments) {
      const override = correction.segments?.[Number(context?.index)]
      if (override) text = override
    }
  }
  return text
}

function buildRecordSpecificCorrectionAudit(recordId, originalSegments, correctedSegments) {
  const correction = recordSpecificTranscriptCorrections[recordId]
  if (!correction) return null
  const entries = []
  for (const indexString of Object.keys(correction.segments ?? {})) {
    const index = Number(indexString)
    const before = originalSegments?.[index]?.text ?? null
    const after = correctedSegments?.[index]?.text ?? null
    if (before !== after) {
      entries.push({ index, before, after })
    }
  }
  return entries.length ? { recordId, ruleVersion: transcriptCorrectionRuleVersion, entries } : null
}

function dedupeFullTextAlternates(alternates) {
  const output = []
  const seen = new Set()
  for (const alternate of Array.isArray(alternates) ? alternates : []) {
    const key = JSON.stringify({
      sourceType: alternate?.sourceType ?? null,
      sourcePageUrls: Array.isArray(alternate?.sourcePageUrls) ? alternate.sourcePageUrls : [],
      sourcePaths: Array.isArray(alternate?.sourcePaths) ? alternate.sourcePaths : [],
      charCount: Number(alternate?.charCount) || 0,
      textKind: alternate?.textKind ?? null,
      selected: Boolean(alternate?.selected),
    })
    if (seen.has(key)) continue
    seen.add(key)
    output.push(alternate)
  }
  return output
}

function transcriptCorrectionSummary(yearRecords) {
  const joined = Object.values(yearRecords ?? {}).flatMap((records) => records ?? []).map((record) => [
    record.title ?? '',
    ...(Array.isArray(record.segments) ? record.segments.map((segment) => segment.text ?? '') : []),
  ].join('\n')).join('\n')
  const remainingSignals = {}
  for (const signal of highConfidenceProblemSignals) {
    const occurrences = countOccurrences(joined, signal)
    if (occurrences) remainingSignals[signal] = occurrences
  }
  return {
    ruleVersion: transcriptCorrectionRuleVersion,
    globalCorrections: globalTranscriptTextCorrections.length,
    recordSpecificCorrections: Object.keys(recordSpecificTranscriptCorrections).length,
    remainingSignals,
  }
}

function countOccurrences(value, needle) {
  if (!needle) return 0
  let total = 0
  let index = 0
  while ((index = value.indexOf(needle, index)) >= 0) {
    total += 1
    index += needle.length
  }
  return total
}

function replaceUnpairedSurrogates(value) {
  return Array.from(String(value ?? ''), (character) => {
    const code = character.charCodeAt(0)
    return character.length === 1 && code >= 0xD800 && code <= 0xDFFF ? '\uFFFD' : character
  }).join('')
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

async function atomicBufferWrite(target, value) {
  const temporary = `${target}.tmp`
  await writeFile(temporary, value)
  await rename(temporary, target)
}
