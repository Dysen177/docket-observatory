import { createHash } from 'node:crypto'
import { gzip, gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  publicRecordTranslationGlossaryVersion,
  publicRecordTranslationValidationRules,
} from '../server/public-record-translation-glossary.js'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = parseArgs(process.argv.slice(2))
const sourceRoot = path.resolve(args.sourceRoot ?? path.join(projectRoot, 'server/public-record-transcripts'))
const cacheRoot = path.resolve(args.cacheRoot ?? path.join(projectRoot, 'server/cache/public-record-translations/en'))
const outputRoot = path.resolve(args.outputRoot ?? path.join(sourceRoot, 'en'))
const temporaryRoot = path.resolve(args.tempRoot ?? path.join(projectRoot, 'output/public-record-glossary-repair'))
const progressPath = path.join(temporaryRoot, 'progress.json')
const rules = publicRecordTranslationValidationRules()

const sourceManifest = JSON.parse(await readFile(path.join(sourceRoot, 'manifest.json'), 'utf8'))
const sourceRecords = await readSourceRecords(sourceManifest)
const repairPlans = []

for (const source of sourceRecords) {
  if (source.transcriptStatus !== 'available' || !Array.isArray(source.segments) || !source.segments.length) continue
  const cached = await readJson(cachePath(cacheRoot, source.id))
  if (!cached || cached.status !== 'translated' || !Array.isArray(cached.segments) || cached.segments.length !== source.segments.length) continue

  const segmentIndexes = new Set()
  for (const [index, segment] of source.segments.entries()) {
    const translatedText = cached.segments[index]?.text ?? ''
    if (rules.some((rule) => sourceHasRule(segment.text, rule) && !translatedHasRule(translatedText, rule))) segmentIndexes.add(index)
  }
  const repairTitle = rules.some((rule) => sourceHasRule(source.title, rule) && !translatedHasRule(cached.title, rule))
  if (!segmentIndexes.size && !repairTitle) continue

  repairPlans.push({ source, cached, segmentIndexes: [...segmentIndexes], repairTitle })
}

if (!repairPlans.length) {
  console.log(JSON.stringify({ status: 'complete', repairedRecords: 0, repairedSegments: 0, glossaryVersion: publicRecordTranslationGlossaryVersion }, null, 2))
  process.exit(0)
}

if (args.deterministic) {
  const result = await repairDeterministically()
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

await rm(temporaryRoot, { recursive: true, force: true })
await mkdir(temporaryRoot, { recursive: true, mode: 0o700 })
const repairUnits = []
for (const { source, segmentIndexes, repairTitle } of repairPlans) {
  if (repairTitle) repairUnits.push({ kind: 'title', id: source.id, text: source.title })
  for (const index of segmentIndexes) repairUnits.push({ kind: 'segment', id: source.id, index, text: source.segments[index].text })
}
const temporaryRecord = {
  id: 'glossary-repair-batch',
  date: '2026-01-01',
  language: 'zh',
  transcriptStatus: 'available',
  title: '',
  segments: repairUnits.map((unit, index) => ({ start: index, end: index + 1, text: unit.text })),
  charCount: repairUnits.reduce((sum, unit) => sum + String(unit.text ?? '').length, 0),
}
const temporaryMetadata = [{
  ...temporaryRecord,
  dataShard: 'repair.json.gz',
  searchShard: null,
  searchOffset: 0,
  searchLength: 1,
  segmentCount: temporaryRecord.segments.length,
}]
const temporaryRecords = [temporaryRecord]
const temporaryManifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  coverage: {
    importedRecords: temporaryMetadata.length,
    availableTranscripts: temporaryMetadata.length,
    missingTranscripts: 0,
    catalogRecords: temporaryMetadata.length,
  },
  records: temporaryMetadata,
  shards: [{ id: 'repair', dataFilename: 'repair.json.gz', searchFilename: 'repair.search.bin', recordCount: temporaryRecords.length }],
}
await writeJsonAtomic(path.join(temporaryRoot, 'manifest.json'), temporaryManifest)
await writeFile(path.join(temporaryRoot, 'repair.json.gz'), await gzipAsync(JSON.stringify(temporaryRecords)))
await writeFile(path.join(temporaryRoot, 'repair.search.bin'), Buffer.from('repair', 'utf8'))

console.log(JSON.stringify({ status: 'running', records: repairPlans.length, segments: repairUnits.filter((unit) => unit.kind === 'segment').length, titles: repairUnits.filter((unit) => unit.kind === 'title').length, glossaryVersion: publicRecordTranslationGlossaryVersion }, null, 2))
const workerResult = await run(process.execPath, [
  path.join(projectRoot, 'scripts/translate-public-record-transcripts-fast.mjs'),
  `--sourceRoot=${temporaryRoot}`,
  `--outputRoot=${path.join(temporaryRoot, 'en')}`,
  `--cacheRoot=${path.join(temporaryRoot, 'cache')}`,
  `--progressPath=${progressPath}`,
  '--recordId=glossary-repair-batch',
  '--force',
], { cwd: projectRoot, env: process.env })
if (workerResult !== 0) throw new Error(`Glossary repair worker exited with code ${workerResult}.`)

const repaired = await readJson(cachePath(path.join(temporaryRoot, 'cache'), temporaryRecord.id))
if (!repaired || repaired.status !== 'translated' || repaired.segments.length !== repairUnits.length) {
  throw new Error('Glossary repair produced an invalid batched result.')
}
let repairUnitIndex = 0
let repairedSegments = 0
let repairedTitles = 0
for (const { source, cached, segmentIndexes, repairTitle } of repairPlans) {
  const mergedTitle = repairTitle
    ? (() => {
        const repairedText = repaired.segments[repairUnitIndex++]?.text
        if (!String(repairedText ?? '').trim()) throw new Error(`Glossary repair returned an empty title for ${source.id}.`)
        repairedTitles += 1
        return repairedText
      })()
    : cached.title
  const mergedSegments = cached.segments.map((segment, index) => {
    if (!segmentIndexes.includes(index)) return segment
    const repairedText = repaired.segments[repairUnitIndex++]?.text
    if (!String(repairedText ?? '').trim()) throw new Error(`Glossary repair returned an empty segment for ${source.id}.`)
    repairedSegments += 1
    return { ...segment, text: repairedText }
  })
  const body = mergedSegments.map((segment) => segment.text ?? '').join('\n')
  await writeJsonAtomic(cachePath(cacheRoot, source.id), {
    ...cached,
    title: mergedTitle,
    segments: mergedSegments,
    charCount: body.length,
    contentSha256: sha256(`${mergedTitle}\n${body}`),
    sourceContentSha256: source.contentSha256,
    glossaryVersion: publicRecordTranslationGlossaryVersion,
    translatedAt: new Date().toISOString(),
  })
}

const compileResult = await run(process.execPath, [
  path.join(projectRoot, 'scripts/translate-public-record-transcripts-en.mjs'),
  '--compile-only',
  `--sourceRoot=${sourceRoot}`,
  `--outputRoot=${outputRoot}`,
  `--cacheRoot=${cacheRoot}`,
], { cwd: projectRoot, env: process.env })
if (compileResult !== 0) throw new Error(`English transcript compiler exited with code ${compileResult}.`)
await rm(temporaryRoot, { recursive: true, force: true })
if (repairUnitIndex !== repairUnits.length) throw new Error('Glossary repair unit mapping did not consume the complete batch.')
console.log(JSON.stringify({ status: 'complete', repairedRecords: repairPlans.length, repairedSegments, repairedTitles, glossaryVersion: publicRecordTranslationGlossaryVersion }, null, 2))

async function repairDeterministically() {
  await rm(temporaryRoot, { recursive: true, force: true })
  let repairedSegments = 0
  let repairedTitles = 0
  for (const { source, cached } of repairPlans) {
    const repairedTitle = repairText(cached.title, source.title)
    if (repairedTitle !== cached.title) repairedTitles += 1
    const segments = cached.segments.map((segment, index) => {
      const repaired = repairText(segment.text, source.segments[index].text)
      if (repaired !== segment.text) repairedSegments += 1
      return { ...segment, text: repaired }
    })
    const body = segments.map((segment) => segment.text ?? '').join('\n')
    await writeJsonAtomic(cachePath(cacheRoot, source.id), {
      ...cached,
      title: repairedTitle,
      segments,
      charCount: body.length,
      contentSha256: sha256(`${repairedTitle}\n${body}`),
      sourceContentSha256: source.contentSha256,
      glossaryVersion: publicRecordTranslationGlossaryVersion,
      translationPostEdit: 'controlled-glossary-term-preservation',
      translatedAt: new Date().toISOString(),
    })
  }
  const compileResult = await run(process.execPath, [
    path.join(projectRoot, 'scripts/translate-public-record-transcripts-en.mjs'),
    '--compile-only',
    `--sourceRoot=${sourceRoot}`,
    `--outputRoot=${outputRoot}`,
    `--cacheRoot=${cacheRoot}`,
  ], { cwd: projectRoot, env: process.env })
  if (compileResult !== 0) throw new Error(`English transcript compiler exited with code ${compileResult}.`)
  return { status: 'complete', method: 'controlled-glossary-term-preservation', repairedRecords: repairPlans.length, repairedSegments, repairedTitles, glossaryVersion: publicRecordTranslationGlossaryVersion }
}

async function readSourceRecords(manifest) {
  const records = []
  for (const shard of manifest.shards ?? []) {
    const compressed = await readFile(path.join(sourceRoot, shard.dataFilename))
    records.push(...JSON.parse((await gunzipAsync(compressed)).toString('utf8')))
  }
  return records
}

function sourceHasRule(text, rule) {
  return rule.sourcePatterns.some((pattern) => String(text ?? '').includes(pattern))
}

function translatedHasRule(text, rule) {
  const normalized = normalizeEnglish(text)
  return rule.acceptedEnglish.some((term) => normalized.includes(normalizeEnglish(term)))
}

function repairText(text, sourceText) {
  const original = String(text ?? '')
  let repaired = original
  let changed = false
  for (const rule of rules) {
    if (sourceHasRule(sourceText, rule) && !translatedHasRule(repaired, rule)) {
      repaired = `${repaired} [${rule.acceptedEnglish[0]}]`.trim()
      changed = true
    }
  }
  return changed ? repaired : original
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

function cachePath(root, id) {
  const safeId = String(id).replace(/[^a-z0-9._-]/giu, '_').slice(0, 180)
  const year = /^\d{4}/u.test(String(id)) ? String(id).slice(0, 4) : 'misc'
  return path.join(root, year, `${safeId}.json`)
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const temporary = `${file}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, file)
}

function run(command, commandArgs, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { ...options, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)))
  })
}

function parseArgs(values) {
  const parsed = {}
  for (const value of values) {
    if (!value.startsWith('--')) continue
    const [key, ...rest] = value.slice(2).split('=')
    parsed[key.replace(/-([a-z])/gu, (_, char) => char.toUpperCase())] = rest.length ? rest.join('=') : true
  }
  return parsed
}
