import assert from 'node:assert/strict'
import { gzip } from 'node:zlib'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const gzipAsync = promisify(gzip)
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-transcript-check-'))
const { expandKnowledgeSearchValues } = await import('../server/knowledge-dossiers.js')
assert.ok(expandKnowledgeSearchValues('摩根', { publicOnly: true }).includes('Morgan'))
const records = [
  {
    id: '2020-06-01-1',
    date: '2020-06-01',
    title: '喜联储与喜币说明',
    durationSec: 180,
    language: 'zh',
    transcriptStatus: 'available',
    completeness: 'readable',
    transcriptSourceType: 'public_subtitle',
    transcriptBoundaryVerified: true,
    matchedPublicRecordId: 'fixture-record-1',
    originalLinks: [{ platform: 'youtube', url: 'https://youtube.com/watch?v=fixture' }],
    charCount: 34,
    contentSha256: 'a'.repeat(64),
    sourceAudit: { catalogPage: 'https://upstream.example/archive/1' },
    segments: [
      { start: 0, end: 10, text: '今天先说明背景。' },
      { start: 10, end: 20, text: '接下来谈喜联储和喜币。' },
      { start: 20, end: 25, text: '自动字幕也可能识别成洗联储和洗币。' },
      { start: 25, end: 30, text: '以上只是直播中的公开陈述。' },
    ],
  },
  {
    id: '2021-01-02-1',
    date: '2021-01-02',
    title: '其他主题',
    durationSec: 60,
    language: 'zh',
    transcriptStatus: 'available',
    completeness: 'readable',
    transcriptSourceType: 'legacy_human_transcript',
    transcriptBoundaryVerified: false,
    legacyTranscriptAudit: { selected: true, timecoded: false },
    matchedPublicRecordId: null,
    originalLinks: [],
    transcriptSourceLinks: [{ platform: 'github_transcript', url: 'https://github.com/example/transcript' }],
    charCount: 20,
    contentSha256: 'b'.repeat(64),
    sourceAudit: { catalogPage: 'https://upstream.example/archive/2' },
    segments: [
      { start: 0, end: 8, text: '没有目标关键词。' },
      { start: 8, end: 18, text: '贺龄乐先生也被称为贺老。' },
    ],
  },
  {
    id: '2022-02-03-1',
    date: '2022-02-03',
    title: '关于其他事项的直播',
    durationSec: 4200,
    language: 'zh',
    transcriptStatus: 'available',
    completeness: 'readable',
    matchedPublicRecordId: 'fixture-record-2',
    originalLinks: [{ platform: 'gettr', url: 'https://gettr.com/post/fixture' }],
    charCount: 19,
    contentSha256: 'c'.repeat(64),
    sourceAudit: { catalogPage: 'https://upstream.example/archive/3' },
    segments: [
      { start: 0, end: 10, text: '这是另一场独立直播。' },
      { start: 10, end: 20, text: '同一场直播也谈到喜联储和喜币。' },
    ],
  },
  {
    id: '2023-03-01-1',
    date: '2023-03-01',
    title: '只保留外部来源的历史视频',
    durationSec: 120,
    language: 'zh',
    transcriptStatus: 'empty',
    completeness: 'empty',
    matchedPublicRecordId: null,
    originalLinks: [{ platform: 'gettr', url: 'https://gettr.com/post/source-only' }],
    charCount: 0,
    contentSha256: null,
    sourceAudit: { catalogPage: 'https://upstream.example/archive/4' },
    segments: [],
  },
  {
    id: 'public-post-fixture-1',
    date: '2021-03-04',
    title: '3月4日公开帖文：账号公告',
    durationSec: null,
    language: 'zh',
    transcriptStatus: 'available',
    completeness: 'public_post_caption',
    transcriptSourceType: 'public_post_caption',
    transcriptBoundaryVerified: false,
    publicPostAudit: { selected: true, timecoded: false },
    matchedPublicRecordId: null,
    originalLinks: [],
    transcriptSourceLinks: [{ platform: 'github_transcript', url: 'https://github.com/example/public-post' }],
    charCount: 16,
    contentSha256: 'd'.repeat(64),
    segments: [{ start: 0, end: 0, text: '这是账号帖文原文，不是视频逐字稿。' }],
  },
]

try {
  const storage = new Map()
  for (const [year, yearRecords] of [['2020', [records[0]]], ['2021', [records[1], records[4]]], ['2022', [records[2]]]]) {
    const data = await gzipAsync(Buffer.from(JSON.stringify(yearRecords)))
    const searchChunks = []
    let searchOffset = 0
    for (const yearRecord of yearRecords) {
      const search = Buffer.from(`${yearRecord.title} ${yearRecord.segments.map((segment) => segment.text).join(' ')}`.normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, ''))
      storage.set(yearRecord.id, {
        dataShard: `${year}.json.gz`,
        searchShard: `${year}.search.bin`,
        searchOffset,
        searchLength: search.length,
      })
      searchChunks.push(search)
      searchOffset += search.length
    }
    await Promise.all([
      writeFile(path.join(fixtureRoot, `${year}.json.gz`), data),
      writeFile(path.join(fixtureRoot, `${year}.search.bin`), Buffer.concat(searchChunks)),
    ])
  }
  await writeFile(path.join(fixtureRoot, 'manifest.json'), JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-08-17T00:00:00.000Z',
    coverage: {
      start: '2017-01-26',
      end: '2023-03-14',
      catalogRecords: 5,
      availableTranscripts: 4,
      missingTranscripts: 1,
      matchedPublicRecords: 1,
      transcriptsWithExternalLinks: 1,
      duplicateTranscriptGroups: 0,
    },
    shards: [
      { id: '2020', dataFilename: '2020.json.gz', searchFilename: '2020.search.bin', recordCount: 1 },
      { id: '2021', dataFilename: '2021.json.gz', searchFilename: '2021.search.bin', recordCount: 2 },
      { id: '2022', dataFilename: '2022.json.gz', searchFilename: '2022.search.bin', recordCount: 1 },
    ],
    records: records.map((record) => ({
      id: record.id,
      date: record.date,
      title: record.title,
      durationSec: record.durationSec,
      language: record.language,
      transcriptStatus: record.transcriptStatus,
      completeness: record.completeness,
      recordKind: record.transcriptSourceType === 'public_post_caption' ? 'public_post' : record.id === '2022-02-03-1' ? 'full_broadcast' : record.transcriptStatus === 'available' ? 'short_video' : 'unknown',
      durationQuality: record.transcriptSourceType === 'public_post_caption' ? 'unknown' : 'plausible',
      transcriptQuality: record.id === '2022-02-03-1' ? 'possibly_incomplete' : record.transcriptStatus === 'available' ? 'plausible' : 'unknown',
      transcriptQualityReasons: record.id === '2022-02-03-1' ? ['early_end', 'short_span', 'sparse_text'] : [],
      transcriptStartSec: record.segments[0]?.start ?? null,
      transcriptEndSec: record.segments.at(-1)?.end ?? null,
      transcriptSpanRatio: record.durationSec ? ((record.segments.at(-1)?.end ?? 0) - (record.segments[0]?.start ?? 0)) / record.durationSec : null,
      transcriptSourceType: record.transcriptSourceType ?? 'source_transcript',
      transcriptBoundaryVerified: Boolean(record.transcriptBoundaryVerified),
      legacyTranscriptAudit: record.legacyTranscriptAudit ?? null,
      publicPostAudit: record.publicPostAudit ?? null,
      ...storage.get(record.id),
      segmentCount: record.segments.length,
      charCount: record.charCount,
      contentSha256: record.contentSha256,
      matchedPublicRecordId: record.matchedPublicRecordId,
      originalLinks: record.originalLinks,
      transcriptSourceLinks: record.transcriptSourceLinks ?? [],
      importError: null,
    })),
    audit: { upstreamCatalogUrl: 'https://upstream.example/catalog' },
  }))
  await mkdir(path.join(fixtureRoot, 'en'), { recursive: true })
  const translatedRecords = [{
    schemaVersion: 1,
    id: '2020-06-01-1',
    date: '2020-06-01',
    sourceLanguage: 'zh',
    language: 'en',
    status: 'translated',
    title: 'Himalaya Reserve and H-Coin explanation',
    provider: 'fixture',
    model: 'fixture-model',
    translatedAt: '2026-08-17T00:00:00.000Z',
    sourceContentSha256: 'a'.repeat(64),
    contentSha256: 'e'.repeat(64),
    segmentCount: 4,
    charCount: 151,
    segments: [
      { start: 0, end: 10, text: 'Today I will first explain the background.' },
      { start: 10, end: 20, text: 'Next, I will discuss Himalaya Reserve and H-Coin.' },
      { start: 20, end: 25, text: 'Automatic subtitles may also misrecognize those terms.' },
      { start: 25, end: 30, text: 'These are public statements from the broadcast.' },
    ],
  }]
  const translatedSearch = Buffer.from(`${translatedRecords[0].title} ${translatedRecords[0].segments.map((segment) => segment.text).join(' ')}`.normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, ''))
  await Promise.all([
    writeFile(path.join(fixtureRoot, 'en', '2020.json.gz'), await gzipAsync(Buffer.from(JSON.stringify(translatedRecords)))),
    writeFile(path.join(fixtureRoot, 'en', '2020.search.bin'), translatedSearch),
    writeFile(path.join(fixtureRoot, 'en', 'manifest.json'), JSON.stringify({
      schemaVersion: 1,
      language: 'en',
      generatedAt: '2026-08-17T00:00:00.000Z',
      sourceManifestGeneratedAt: '2026-08-17T00:00:00.000Z',
      translationVersion: 1,
      coverage: {
        sourceRecords: 5,
        translatedRecords: 1,
        missingRecords: 4,
        complete: false,
      },
      shards: [{ id: '2020', dataFilename: '2020.json.gz', searchFilename: '2020.search.bin', recordCount: 1 }],
      records: [{
        id: '2020-06-01-1',
        date: '2020-06-01',
        language: 'en',
        status: 'translated',
        title: 'Himalaya Reserve and H-Coin explanation',
        dataShard: '2020.json.gz',
        searchShard: '2020.search.bin',
        searchOffset: 0,
        searchLength: translatedSearch.length,
        segmentCount: 4,
        charCount: 151,
        contentSha256: 'e'.repeat(64),
        sourceContentSha256: 'a'.repeat(64),
        sourceSegmentCount: 4,
        provider: 'fixture',
        model: 'fixture-model',
        translatedAt: '2026-08-17T00:00:00.000Z',
      }],
    })),
  ])

  process.env.GUO_INTEL_TRANSCRIPT_DIR = fixtureRoot
  const { getPublicRecordTranscript, queryPublicRecordTranscripts } = await import(`../server/public-record-transcripts.js?fixture=${Date.now()}`)

  const exact = await queryPublicRecordTranscripts({ q: '喜联储', limit: 20 }, 'zh')
  assert.equal(exact.total, 2)
  assert.deepEqual(new Set(exact.records.map((record) => record.id)), new Set(['2020-06-01-1', '2022-02-03-1']))
  const firstFixture = exact.records.find((record) => record.id === '2020-06-01-1')
  assert.equal(firstFixture?.hits[0].matchReason, 'exact')
  assert.equal(firstFixture?.hits[0].segmentIndex, 1)
  assert.equal(firstFixture?.hits[0].contextBefore[0].text, '今天先说明背景。')
  assert.equal(firstFixture?.hits[0].contextAfter[0].text, '自动字幕也可能识别成洗联储和洗币。')
  assert.equal(firstFixture?.hits.some((hit) => hit.text.includes('洗联储') && hit.matchReason === 'alias'), true)
  assert.equal(firstFixture?.transcriptSourceType, 'public_subtitle')
  assert.equal(firstFixture?.transcriptBoundaryVerified, true)
  assert.match(firstFixture?.contentNote ?? '', /公开字幕/u)

  const alias = await queryPublicRecordTranscripts({ q: 'Himalaya Exchange', limit: 20 }, 'en')
  assert.equal(alias.total, 2)
  assert.equal(alias.search.aliasExpanded, true)
  assert.equal(alias.records[0].hits[0].matchReason, 'alias')
  assert.equal(alias.records.find((record) => record.id === '2020-06-01-1')?.language, 'en')

  const englishTranslatedSearch = await queryPublicRecordTranscripts({ q: 'Himalaya Reserve', limit: 20 }, 'en')
  assert.equal(englishTranslatedSearch.records[0].id, '2020-06-01-1')
  assert.equal(englishTranslatedSearch.records[0].translationStatus, 'translated')
  assert.match(englishTranslatedSearch.records[0].hits[0].text, /Himalaya Reserve/u)

  const englishCrossLanguageSearch = await queryPublicRecordTranscripts({ q: '喜联储', limit: 20 }, 'en')
  const englishCrossLanguageRecord = englishCrossLanguageSearch.records.find((record) => record.id === '2020-06-01-1')
  assert.equal(englishCrossLanguageRecord?.language, 'en')
  assert.match(englishCrossLanguageRecord?.hits[0].text ?? '', /Himalaya Reserve/u)
  assert.doesNotMatch(englishCrossLanguageRecord?.hits[0].text ?? '', /\p{Script=Han}/u)

  const knowledgeAlias = await queryPublicRecordTranscripts({ q: '贺林乐', limit: 20 }, 'zh')
  assert.equal(knowledgeAlias.total, 1)
  assert.equal(knowledgeAlias.search.aliasExpanded, true)
  assert.equal(knowledgeAlias.records[0].id, '2021-01-02-1')
  assert.equal(knowledgeAlias.records[0].hits[0].matchedTerm, '贺龄乐')

  const naturalQuestion = await queryPublicRecordTranscripts({ q: '郭文贵在哪些直播里谈到喜联储？', limit: 20 }, 'zh')
  assert.equal(naturalQuestion.total, 2)

  const titleOnly = await queryPublicRecordTranscripts({ q: '其他主题', limit: 20 }, 'zh')
  assert.equal(titleOnly.total, 1)
  assert.equal(titleOnly.records[0].hits.length, 0)
  assert.equal(titleOnly.records[0].titleMatched, true)
  assert.equal(titleOnly.records[0].transcriptSourceType, 'legacy_human_transcript')
  assert.equal(titleOnly.records[0].transcriptTimecoded, false)
  assert.equal(titleOnly.records[0].transcriptSourceLinks[0].url, 'https://github.com/example/transcript')
  assert.match(titleOnly.records[0].contentNote, /历史人工听写/u)

  const publicPost = await queryPublicRecordTranscripts({ q: '账号帖文原文', limit: 20 }, 'zh')
  assert.equal(publicPost.total, 1)
  assert.equal(publicPost.records[0].recordKind, 'public_post')
  assert.equal(publicPost.records[0].transcriptTimecoded, false)
  assert.match(publicPost.records[0].contentNote, /不属于视频逐字稿/u)

  const lightweight = await queryPublicRecordTranscripts({ q: '', limit: 20 }, 'zh')
  assert.equal(lightweight.total, 5)
  assert.equal(lightweight.records.find((record) => record.id === '2020-06-01-1')?.segmentCount > 0, true)
  assert.equal(lightweight.records.find((record) => record.id === '2022-02-03-1')?.recordKind, 'full_broadcast')
  assert.equal(lightweight.records.find((record) => record.id === '2022-02-03-1')?.transcriptQuality, 'possibly_incomplete')
  assert.equal(lightweight.coverage.fullBroadcasts, 1)
  assert.equal(lightweight.coverage.publicPostRecords, 1)
  assert.equal(lightweight.coverage.possiblyIncomplete, 1)
  assert.equal('segments' in lightweight.records[0], false)
  assert.equal(JSON.stringify(lightweight).includes('upstream.example'), false)

  const sourceOnly = await queryPublicRecordTranscripts({ q: '外部来源', limit: 20 }, 'zh')
  assert.equal(sourceOnly.total, 1)
  assert.equal(sourceOnly.records[0].transcriptStatus, 'empty')
  assert.equal(sourceOnly.records[0].titleMatched, true)
  assert.match(sourceOnly.records[0].classificationNote, /暂无文字/u)

  const oldestFirst = await queryPublicRecordTranscripts({ q: '', sort: 'oldest', limit: 20 }, 'zh')
  assert.equal(oldestFirst.records[0].date, '2020-06-01')
  const newestFirst = await queryPublicRecordTranscripts({ q: '', sort: 'newest', limit: 20 }, 'zh')
  assert.equal(newestFirst.records[0].date, '2023-03-01')

  const detail = await getPublicRecordTranscript('2020-06-01-1', 'zh')
  assert.equal(detail.segments.length, 4)
  assert.equal(detail.transcriptSourceType, 'public_subtitle')
  assert.equal(detail.transcriptBoundaryVerified, true)
  assert.match(detail.contentNote, /公开字幕/u)
  assert.equal(JSON.stringify(detail).includes('sourceAudit'), false)
  const englishDetail = await getPublicRecordTranscript('2020-06-01-1', 'en')
  assert.equal(englishDetail.title, 'Himalaya Reserve and H-Coin explanation')
  assert.equal(englishDetail.language, 'en')
  assert.equal(englishDetail.sourceLanguage, 'zh')
  assert.equal(englishDetail.translationStatus, 'translated')
  assert.match(englishDetail.segments[1].text, /Himalaya Reserve and H-Coin/u)
  const incompleteDetail = await getPublicRecordTranscript('2022-02-03-1', 'zh')
  assert.equal(incompleteDetail.transcriptQuality, 'possibly_incomplete')
  assert.match(incompleteDetail.coverageNote, /可能缺少后续内容/u)
  process.stdout.write('Public-record transcript search, alias expansion, context, lightweight listing, reader, and provenance boundary checks passed.\n')
} finally {
  await rm(fixtureRoot, { recursive: true, force: true })
}
