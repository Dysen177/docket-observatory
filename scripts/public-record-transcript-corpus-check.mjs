import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import {
  publicRecordTranslationGlossaryVersion,
  publicRecordTranslationValidationRules,
} from '../server/public-record-translation-glossary.js'

const gunzipAsync = promisify(gunzip)
const corpusRoot = path.resolve('server/public-record-transcripts')
const manifest = JSON.parse(await readFile(path.join(corpusRoot, 'manifest.json'), 'utf8'))
const metadataRecords = Array.isArray(manifest.records) ? manifest.records : []
const metadataById = new Map(metadataRecords.map((record) => [record.id, record]))

assert.equal(metadataById.size, metadataRecords.length, 'Transcript manifest contains duplicate record IDs')
assert.equal(manifest.coverage.importedRecords, metadataRecords.length, 'Imported transcript count does not match manifest records')
assert.ok(manifest.coverage.catalogRecords <= metadataRecords.length, 'Source catalog cannot exceed the merged transcript corpus')

const available = metadataRecords.filter((record) => record.transcriptStatus === 'available')
const unavailable = metadataRecords.filter((record) => record.transcriptStatus !== 'available')
assert.equal(manifest.coverage.availableTranscripts, available.length, 'Available transcript count does not match manifest')
assert.equal(manifest.coverage.missingTranscripts, unavailable.length, 'Unavailable transcript count does not match manifest')

const longRecordsWithoutText = metadataRecords.filter((record) => Number(record.durationSec) >= 3600 && record.transcriptStatus !== 'available')
assert.deepEqual(longRecordsWithoutText.map((record) => record.id), [], 'One-hour-plus records must have searchable transcript text')

for (const record of metadataRecords) {
  if (!record.linkedTranscriptId) continue
  assert.ok(metadataById.has(record.linkedTranscriptId), `${record.id} links to a missing transcript record`)
}

const selectedPublicSubtitles = available.filter((record) => record.transcriptSourceType === 'public_subtitle')
for (const record of selectedPublicSubtitles) {
  assert.ok(record.publicSubtitleAudit?.selected, `${record.id} lacks a selected public-subtitle audit`)
  const timelineOverrun = Number(record.transcriptEndSec) - Number(record.durationSec)
  assert.ok(timelineOverrun <= Math.max(120, Number(record.durationSec) * 0.03), `${record.id} subtitle extends implausibly far beyond the indexed video duration`)
  if (timelineOverrun > 5) {
    assert.equal(record.transcriptBoundaryVerified, false, `${record.id} cannot verify a transcript boundary beyond the indexed media duration`)
    assert.ok(record.transcriptQualityReasons?.includes('timeline_overrun'), `${record.id} does not flag its transcript timeline overrun`)
  }
  assert.equal(Boolean(record.transcriptBoundaryVerified), Boolean(record.publicSubtitleAudit.boundaryVerified), `${record.id} boundary status differs from its subtitle audit`)
}

const selectedCommunityTranscripts = available.filter((record) => record.transcriptSourceType === 'community_human_transcript')
for (const record of selectedCommunityTranscripts) {
  assert.ok(record.communityTranscriptAudit?.selected, `${record.id} lacks a selected community-transcript audit`)
  if (record.communityTranscriptAudit?.timecoded === false) {
    assert.equal(record.transcriptBoundaryVerified, false, `${record.id} cannot claim verified boundaries without reliable timestamps`)
  }
}

const selectedLegacyTranscripts = available.filter((record) => record.transcriptSourceType === 'legacy_human_transcript')
for (const record of selectedLegacyTranscripts) {
  assert.ok(record.legacyTranscriptAudit?.selected, `${record.id} lacks a selected legacy-transcript audit`)
  assert.equal(record.legacyTranscriptAudit?.timecoded, false, `${record.id} must not invent timestamps for the archival transcript`)
  assert.equal(record.transcriptBoundaryVerified, false, `${record.id} cannot claim verified boundaries without reliable timestamps`)
  assert.ok(record.originalLinks.length > 0 || record.transcriptSourceLinks?.length > 0, `${record.id} has neither a public recording nor transcript-source link`)
  for (const link of record.transcriptSourceLinks ?? []) {
    const url = new URL(link.url)
    assert.equal(url.protocol, 'https:', `${record.id} has a non-HTTPS transcript-source link`)
    assert.ok(['archive.org', 'github.com', 'chinatwtparty.blogspot.com', 'milesguovideotextlibrary.bearblog.dev', 'gwins.org'].includes(url.hostname), `${record.id} exposes an unapproved transcript-source host`)
  }
}

const selectedArchivalTranscripts = available.filter((record) => record.transcriptSourceType === 'archival_human_transcript')
for (const record of selectedArchivalTranscripts) {
  assert.ok(record.fullTextAudit?.selected, `${record.id} lacks a selected full-text archival audit`)
  assert.equal(record.fullTextAudit?.timecoded, false, `${record.id} must not invent timestamps for the public archival transcript`)
  assert.equal(record.transcriptBoundaryVerified, false, `${record.id} cannot claim verified boundaries without reliable timestamps`)
  assert.ok(record.originalLinks.length > 0 || record.transcriptSourceLinks?.length > 0 || record.fullTextAudit?.sourcePaths?.length > 0, `${record.id} has neither a public recording, transcript-source link, nor audited source path`)
  for (const link of record.transcriptSourceLinks ?? []) {
    const url = new URL(link.url)
    assert.equal(url.protocol, 'https:', `${record.id} has a non-HTTPS transcript-source link`)
    assert.ok(['archive.org', 'github.com', 'milesguovideotextlibrary.bearblog.dev', 'gwins.org'].includes(url.hostname), `${record.id} exposes an unapproved transcript-source host`)
  }
}

const selectedPublicPosts = available.filter((record) => record.transcriptSourceType === 'public_post_caption')
for (const record of selectedPublicPosts) {
  assert.equal(record.recordKind, 'public_post', `${record.id} is not classified as a public account post`)
  assert.ok(record.publicPostAudit?.selected, `${record.id} lacks a selected public-post audit`)
  assert.equal(record.transcriptBoundaryVerified, false, `${record.id} cannot claim a verified media boundary for account-post text`)
  assert.ok(record.transcriptSourceLinks?.length > 0, `${record.id} lacks a public text-source link`)
  assert.ok(record.charCount > 0, `${record.id} has no searchable post text`)
}

for (const record of available) {
  const timecoded = record.transcriptSourceType === 'community_human_transcript'
    ? record.communityTranscriptAudit?.timecoded !== false
    : record.transcriptSourceType === 'legacy_human_transcript'
      ? record.legacyTranscriptAudit?.timecoded !== false
      : record.transcriptSourceType === 'archival_human_transcript'
        ? false
        : true
  if (timecoded && Number.isFinite(Number(record.transcriptEndSec))) {
    if (Number.isFinite(Number(record.durationSec)) && Number(record.durationSec) > 0) {
      assert.ok(Number(record.transcriptEndSec) <= Number(record.durationSec) + Math.max(120, Number(record.durationSec) * 0.03), `${record.id} transcript timeline is incompatible with its indexed media duration`)
    } else {
      assert.ok(Number(record.transcriptEndSec) <= 24 * 3600, `${record.id} has an implausible transcript timestamp without media-duration metadata`)
    }
  }
}

const loadedIds = new Set()
const sourceRecordsById = new Map()
for (const shard of manifest.shards ?? []) {
  const [compressedData, searchBuffer] = await Promise.all([
    readFile(path.join(corpusRoot, shard.dataFilename)),
    readFile(path.join(corpusRoot, shard.searchFilename)),
  ])
  const records = JSON.parse((await gunzipAsync(compressedData)).toString('utf8'))
  assert.equal(records.length, shard.recordCount, `${shard.id} data-shard record count is incorrect`)

  for (const record of records) {
    assert.ok(!loadedIds.has(record.id), `${record.id} appears in more than one data shard`)
    loadedIds.add(record.id)
    const metadata = metadataById.get(record.id)
    assert.ok(metadata, `${record.id} is missing from the manifest`)
    sourceRecordsById.set(record.id, record)
    assert.equal(metadata.transcriptStatus, 'available', `${record.id} is sharded without an available status`)
    assert.equal(record.segments.length, metadata.segmentCount, `${record.id} segment count does not match metadata`)
    assert.equal(record.charCount, metadata.charCount, `${record.id} character count does not match metadata`)
    assert.ok(Number.isInteger(metadata.searchOffset) && metadata.searchOffset >= 0, `${record.id} has an invalid search offset`)
    assert.ok(Number.isInteger(metadata.searchLength) && metadata.searchLength > 0, `${record.id} has an invalid search length`)
    assert.ok(metadata.searchOffset + metadata.searchLength <= searchBuffer.length, `${record.id} search range exceeds its shard`)

    let previousStart = -1
    for (const segment of record.segments) {
      assert.ok(Number.isFinite(segment.start) && Number.isFinite(segment.end), `${record.id} has a non-numeric timestamp`)
      assert.ok(segment.start >= previousStart, `${record.id} transcript timestamps are out of order`)
      assert.ok(segment.end >= segment.start, `${record.id} has a segment ending before it starts`)
      assert.ok(String(segment.text ?? '').trim(), `${record.id} has an empty transcript segment`)
      previousStart = segment.start
    }
  }
}

assert.equal(loadedIds.size, available.length, 'Not every available transcript is present in a data shard')
for (const record of available) assert.ok(loadedIds.has(record.id), `${record.id} is marked available but has no data-shard record`)

const englishTranslationSummary = await validateEnglishTranslationCorpusIfPresent()

process.stdout.write(`${JSON.stringify({
  catalogRecords: metadataRecords.length,
  searchableTranscripts: available.length,
  unavailableTranscripts: unavailable.length,
  oneHourPlusRecords: metadataRecords.filter((record) => Number(record.durationSec) >= 3600).length,
  selectedPublicSubtitles: selectedPublicSubtitles.length,
  selectedCommunityTranscripts: selectedCommunityTranscripts.length,
  selectedLegacyTranscripts: selectedLegacyTranscripts.length,
  selectedArchivalTranscripts: selectedArchivalTranscripts.length,
  selectedPublicPosts: selectedPublicPosts.length,
  boundaryVerified: metadataRecords.filter((record) => record.transcriptBoundaryVerified).length,
  englishTranslationCorpus: englishTranslationSummary,
})}\n`)

async function validateEnglishTranslationCorpusIfPresent() {
  const translationRoot = path.join(corpusRoot, 'en')
  const translationManifest = await readJsonIfExists(path.join(translationRoot, 'manifest.json'))
  if (!translationManifest) return { status: 'not_generated' }
  assert.equal(translationManifest.language, 'en', 'English transcript translation manifest must use language=en')
  assert.ok(Array.isArray(translationManifest.records), 'English transcript translation manifest records must be an array')
  assert.ok(Array.isArray(translationManifest.shards), 'English transcript translation manifest shards must be an array')

  const translationRecords = translationManifest.records
  const translationById = new Map(translationRecords.map((record) => [record.id, record]))
  assert.equal(translationById.size, translationRecords.length, 'English translation manifest contains duplicate record IDs')
  assert.equal(translationManifest.coverage?.translatedRecords, translationRecords.length, 'English translation coverage does not match manifest records')
  assert.equal(translationManifest.coverage?.sourceRecords, available.length, 'English translation source record count must match available source transcripts')
  assert.equal(translationManifest.coverage?.missingRecords, Math.max(0, available.length - translationRecords.length), 'English translation missing count is inconsistent')

  const loadedTranslationIds = new Set()
  let recordsWithCjkResidue = 0
  let translatedRecords = 0
  let noTranslationNeededRecords = 0
  const termMismatches = []
  for (const shard of translationManifest.shards) {
    const [compressedData, searchBuffer] = await Promise.all([
      readFile(path.join(translationRoot, shard.dataFilename)),
      readFile(path.join(translationRoot, shard.searchFilename)),
    ])
    const records = JSON.parse((await gunzipAsync(compressedData)).toString('utf8'))
    assert.equal(records.length, shard.recordCount, `${shard.id} English translation shard count is incorrect`)

    for (const record of records) {
      assert.ok(!loadedTranslationIds.has(record.id), `${record.id} appears in more than one English translation data shard`)
      loadedTranslationIds.add(record.id)
      const metadata = translationById.get(record.id)
      const source = sourceRecordsById.get(record.id)
      assert.ok(metadata, `${record.id} is missing from the English translation manifest`)
      assert.ok(source, `${record.id} English translation has no source transcript`)
      assert.equal(source.transcriptStatus, 'available', `${record.id} English translation source is not available`)
      assert.equal(record.sourceContentSha256, source.contentSha256, `${record.id} English translation source hash is stale`)
      assert.equal(metadata.sourceContentSha256, source.contentSha256, `${record.id} English translation metadata source hash is stale`)
      assert.ok(['translated', 'no_translation_needed'].includes(record.status), `${record.id} English translation has an invalid status`)
      assert.equal(record.segments.length, source.segments.length, `${record.id} English translation segment count differs from source`)
      assert.equal(record.segments.length, metadata.segmentCount, `${record.id} English translation segment count differs from metadata`)
      assert.equal(record.charCount, metadata.charCount, `${record.id} English translation char count differs from metadata`)
      assert.ok(Number.isInteger(metadata.searchOffset) && metadata.searchOffset >= 0, `${record.id} English translation has an invalid search offset`)
      assert.ok(Number.isInteger(metadata.searchLength) && metadata.searchLength > 0, `${record.id} English translation has an invalid search length`)
      assert.ok(metadata.searchOffset + metadata.searchLength <= searchBuffer.length, `${record.id} English translation search range exceeds its shard`)

      const sourceText = `${source.title} ${source.segments.map((segment) => segment.text).join(' ')}`
      const translatedText = `${record.title} ${record.segments.map((segment) => segment.text).join(' ')} ${(record.glossarySearchAliases ?? []).join(' ')}`
      const sourceHasCjk = /[\u3400-\u9fff]/u.test(sourceText)
      if (sourceHasCjk) {
        assert.equal(record.status, 'translated', `${record.id} contains Chinese source text but is marked no_translation_needed`)
        assert.equal(record.glossaryVersion, publicRecordTranslationGlossaryVersion, `${record.id} English translation uses a stale glossary version`)
        if (cjkCharacterCount(translatedText) > 0) recordsWithCjkResidue += 1
        if (translatedText.length < sourceText.length * 0.28) {
          throw new Error(`${record.id} English translation is too short and may be a summary instead of full translation`)
        }
        const summaryMarker = /^\s*(?:summary|overall|in short|here is|this transcript|this segment)\b/iu
        if (summaryMarker.test(translatedText)) {
          throw new Error(`${record.id} English translation looks like a summary/commentary response`)
        }
        termMismatches.push(...findTermMismatches(record.id, sourceText, translatedText))
      } else {
        assert.equal(record.status, 'no_translation_needed', `${record.id} source appears English but is marked translated`)
      }
      if (record.status === 'translated') translatedRecords += 1
      if (record.status === 'no_translation_needed') noTranslationNeededRecords += 1

      let previousStart = -1
      for (const segment of record.segments) {
        assert.ok(Number.isFinite(segment.start) && Number.isFinite(segment.end), `${record.id} English translation has a non-numeric timestamp`)
        assert.ok(segment.start >= previousStart, `${record.id} English translation timestamps are out of order`)
        assert.ok(segment.end >= segment.start, `${record.id} English translation has a segment ending before it starts`)
        assert.ok(String(segment.text ?? '').trim(), `${record.id} English translation has an empty segment`)
        previousStart = segment.start
      }
    }
  }
  assert.equal(loadedTranslationIds.size, translationRecords.length, 'Not every English translation record is present in a data shard')
  assert.equal(recordsWithCjkResidue, 0, 'Some English transcript translations retain Chinese text')
  assert.deepEqual(termMismatches.slice(0, 20), [], `English transcript translations missed controlled glossary terms: ${JSON.stringify(termMismatches.slice(0, 20))}`)

  return {
    status: translationManifest.coverage?.complete ? 'complete' : 'partial',
    records: translationRecords.length,
    translatedRecords,
    noTranslationNeededRecords,
    missingRecords: translationManifest.coverage?.missingRecords ?? null,
    translatedCharacters: translationManifest.coverage?.translatedCharacters ?? null,
  }
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

function cjkCharacterCount(value) {
  return [...String(value ?? '').matchAll(/[\u3400-\u9fff]/gu)].length
}

function findTermMismatches(recordId, sourceText, translatedText) {
  const mismatches = []
  const normalizedTarget = normalizeEnglish(translatedText)
  for (const rule of publicRecordTranslationValidationRules()) {
    if (!rule.sourcePatterns.some((pattern) => sourceText.includes(pattern))) continue
    if (rule.acceptedEnglish.some((term) => normalizedTarget.includes(normalizeEnglish(term)))) continue
    mismatches.push({
      id: recordId,
      source: rule.source,
      expectedAnyOf: rule.acceptedEnglish.slice(0, 4),
    })
  }
  return mismatches
}

function normalizeEnglish(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/[\s_-]+/gu, ' ')
    .trim()
}
