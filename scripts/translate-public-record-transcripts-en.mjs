import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzip, gzip } from 'node:zlib'
import { promisify } from 'node:util'
import {
  formatPublicRecordTranslationGlossaryForPrompt,
  publicRecordTranslationGlossary,
  publicRecordTranslationGlossaryVersion,
  publicRecordTranslationValidationRules,
} from '../server/public-record-translation-glossary.js'

const gunzipAsync = promisify(gunzip)
const gzipAsync = promisify(gzip)

const args = parseArgs(process.argv.slice(2))
const sourceRoot = path.resolve(args.sourceRoot ?? 'server/public-record-transcripts')
const outputRoot = path.resolve(args.outputRoot ?? path.join(sourceRoot, 'en'))
const cacheRoot = path.resolve(args.cacheRoot ?? 'server/cache/public-record-translations/en')
const progressPath = path.resolve(args.progressPath ?? 'output/public-record-translation-progress.json')
const provider = String(args.provider ?? process.env.TRANSCRIPT_TRANSLATION_PROVIDER ?? '').trim()
const model = String(args.model ?? process.env.TRANSCRIPT_TRANSLATION_MODEL ?? process.env.TRANSLATION_MODEL ?? process.env.OPENAI_MODEL ?? '').trim()
const batchChars = boundedInteger(args.batchChars, 12000, 2000, 24000)
const maxBatchParts = boundedInteger(args.maxBatchParts, 240, 20, 300)
const concurrency = boundedInteger(args.concurrency, 1, 1, 6)
const maxOutputTokens = boundedInteger(args.maxOutputTokens, 20000, 4000, 64000)
const ollamaContextTokens = boundedInteger(args.ollamaContextTokens ?? args.contextTokens, 16384, 8192, 65536)
const translationTimeoutMs = boundedInteger(args.translationTimeoutMs ?? args.timeoutMs, 420000, 30000, 1200000)
const translationRetries = boundedInteger(args.retries, 2, 0, 6)
const limit = args.limit === undefined ? Number.POSITIVE_INFINITY : boundedInteger(args.limit, 1, 1, Number.MAX_SAFE_INTEGER)
const yearFilter = args.year ? new Set(String(args.year).split(',').map((item) => item.trim()).filter(Boolean)) : null
const recordFilter = args.recordId ? new Set(String(args.recordId).split(',').map((item) => item.trim()).filter(Boolean)) : null
const dryRun = Boolean(args.dryRun)
const compileOnly = Boolean(args.compileOnly)
const force = Boolean(args.force)
const allowCloud = Boolean(args.allowCloud)

const cloudProviders = new Set(['openai', 'anthropic', 'gemini', 'openai_compatible'])
const translationVersion = 5
let reportBatchProgress = async () => undefined

const manifest = JSON.parse(await readFile(path.join(sourceRoot, 'manifest.json'), 'utf8'))
const sourceRecords = []
for (const shard of manifest.shards ?? []) {
  if (yearFilter && !yearFilter.has(String(shard.id))) continue
  const records = JSON.parse((await gunzipAsync(await readFile(path.join(sourceRoot, shard.dataFilename)))).toString('utf8'))
  for (const record of records) {
    if (recordFilter && !recordFilter.has(record.id)) continue
    sourceRecords.push(record)
  }
}

const selected = sourceRecords
  .filter((record) => record.transcriptStatus !== 'empty' && Array.isArray(record.segments) && record.segments.length)
  .slice(0, limit)

const sourceStats = selected.reduce((stats, record) => {
  stats.records += 1
  stats.segments += record.segments.length
  stats.characters += record.segments.reduce((sum, segment) => sum + String(segment.text ?? '').length, 0)
  if (/[\u3400-\u9fff]/u.test(`${record.title} ${record.segments.map((segment) => segment.text).join(' ')}`)) stats.needsTranslation += 1
  else stats.alreadyEnglish += 1
  return stats
}, { records: 0, segments: 0, characters: 0, needsTranslation: 0, alreadyEnglish: 0 })
const translationBatchStats = selected.reduce((stats, record) => {
  const batches = batchSegments(record.segments, batchChars, maxBatchParts)
  stats.batches += batches.length
  for (const batch of batches) {
    stats.maxBatchCharacters = Math.max(stats.maxBatchCharacters, batch.reduce((sum, item) => sum + item.text.length, 0))
    stats.maxBatchParts = Math.max(stats.maxBatchParts, batch.length)
  }
  return stats
}, { batches: 0, maxBatchCharacters: 0, maxBatchParts: 0 })

if (dryRun) {
  console.log(JSON.stringify({
    mode: 'dry-run',
    provider: provider || null,
    model: model || null,
    glossaryVersion: publicRecordTranslationGlossaryVersion,
    batchChars,
    maxBatchParts,
    maxOutputTokens,
    ollamaContextTokens,
    translationTimeoutMs,
    retries: translationRetries,
    selected: sourceStats,
    translationBatches: translationBatchStats,
    outputRoot,
    cacheRoot,
    estimatedInputCharacters: sourceStats.characters,
    note: 'Dry run only. No translation request was sent and no shard was written.',
  }, null, 2))
  process.exit(0)
}

await mkdir(cacheRoot, { recursive: true, mode: 0o700 })

if (!compileOnly) {
  if (!provider) {
    throw new Error('Choose a translation provider with --provider=openai|anthropic|gemini|openai_compatible|ollama, or run --dry-run / --compile-only.')
  }
  if (cloudProviders.has(provider) && !allowCloud) {
    throw new Error('Cloud transcript translation requires --allow-cloud so source transcript text is not sent by accident.')
  }
  if (cloudProviders.has(provider) && !model) {
    throw new Error('Cloud transcript translation requires --model or TRANSCRIPT_TRANSLATION_MODEL.')
  }

  const translator = await createTranslator({ provider, model })
  const runStartedAt = Date.now()
  const sourceById = new Map(selected.map((record) => [record.id, record]))
  const completedIds = new Set()
  let completedSourceCharacters = 0
  for (const cached of await readCachedTranslations()) {
    const source = sourceById.get(cached?.id)
    if (!source || !cacheMatchesRecord(cached, source)) continue
    completedIds.add(source.id)
    completedSourceCharacters += sourceCharacterCount(source)
  }
  let newlyCompletedRecords = 0
  let newlyCompletedSourceCharacters = 0
  let translated = 0
  let copied = 0
  let skipped = 0
  let failed = 0
  let currentRecordId = null
  let currentBatch = null
  let currentBatchCount = null
  let currentBatchState = null
  let currentAttempt = null
  let currentGeneratedCharacters = 0
  let currentBatchSourceCharacters = 0
  let currentRecordCompletedSourceCharacters = 0
  let completedBatchesThisPass = 0
  let lastBatchError = null
  let lastError = null

  await writeProgress('running')
  reportBatchProgress = async (event) => {
    currentRecordId = event.recordId
    currentBatch = event.batchNumber
    currentBatchCount = event.batchCount
    currentBatchState = event.phase
    currentAttempt = event.attempt ?? currentAttempt
    currentGeneratedCharacters = event.generatedCharacters ?? currentGeneratedCharacters
    currentBatchSourceCharacters = event.sourceCharacters ?? currentBatchSourceCharacters
    if (event.error) lastBatchError = event.error
    if (event.phase === 'completed') {
      currentRecordCompletedSourceCharacters += Number(event.sourceCharacters ?? 0)
      completedBatchesThisPass += 1
      currentGeneratedCharacters = 0
      currentAttempt = null
      lastBatchError = null
    }
    await writeProgress('running')
  }
  await mapLimit(selected, concurrency, async (record) => {
    currentRecordId = record.id
    currentBatch = null
    currentBatchCount = null
    currentBatchState = 'preparing'
    currentAttempt = null
    currentGeneratedCharacters = 0
    currentBatchSourceCharacters = 0
    currentRecordCompletedSourceCharacters = 0
    lastBatchError = null
    await writeProgress('running')
    const targetPath = recordCachePath(record.id)
    if (!force) {
      const cached = await readJsonIfExists(targetPath)
      if (cacheMatchesRecord(cached, record)) {
        skipped += 1
        await writeProgress('running')
        return
      }
    }
    try {
      const sourceText = `${record.title}\n${record.segments.map((segment) => segment.text).join('\n')}`
      const payload = /[\u3400-\u9fff]/u.test(sourceText)
        ? await translateRecord(record, translator)
        : copyEnglishRecord(record, provider, model)
      await mkdir(path.dirname(targetPath), { recursive: true, mode: 0o700 })
      await writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 })
      await rm(failureCachePath(record), { force: true })
      if (payload.status === 'no_translation_needed') copied += 1
      else translated += 1
      if (!completedIds.has(record.id)) {
        completedIds.add(record.id)
        const sourceCharacters = sourceCharacterCount(record)
        completedSourceCharacters += sourceCharacters
        newlyCompletedRecords += 1
        newlyCompletedSourceCharacters += sourceCharacters
      }
      currentRecordCompletedSourceCharacters = 0
      if ((translated + copied + skipped) % 25 === 0) {
        console.log(JSON.stringify({ translated, copied, skipped, failed, latest: record.id }))
      }
      await writeProgress('running')
    } catch (error) {
      failed += 1
      lastError = error instanceof Error ? error.message : String(error)
      const failurePath = failureCachePath(record)
      await mkdir(path.dirname(failurePath), { recursive: true, mode: 0o700 })
      await writeFile(failurePath, `${JSON.stringify({
        id: record.id,
        date: record.date,
        title: record.title,
        sourceContentSha256: record.contentSha256 ?? null,
        failedAt: new Date().toISOString(),
        message: lastError,
      }, null, 2)}\n`, { mode: 0o600 })
      await writeProgress('running')
    }
  })
  console.log(JSON.stringify({ translated, copied, skipped, failed }))

  currentRecordId = null
  currentBatch = null
  currentBatchCount = null
  currentBatchState = null
  currentAttempt = null
  currentGeneratedCharacters = 0
  currentBatchSourceCharacters = 0
  currentRecordCompletedSourceCharacters = 0
  await writeProgress(failed ? 'pass_complete_with_failures' : 'pass_complete')

  async function writeProgress(status) {
    const elapsedMs = Math.max(1, Date.now() - runStartedAt)
    const charactersPerHour = newlyCompletedSourceCharacters > 0
      ? Math.round(newlyCompletedSourceCharacters / elapsedMs * 3_600_000)
      : null
    const effectiveCompletedSourceCharacters = Math.min(
      sourceStats.characters,
      completedSourceCharacters + currentRecordCompletedSourceCharacters,
    )
    const effectiveNewSourceCharacters = newlyCompletedSourceCharacters + currentRecordCompletedSourceCharacters
    const effectiveCharactersPerHour = effectiveNewSourceCharacters > 0
      ? Math.round(effectiveNewSourceCharacters / elapsedMs * 3_600_000)
      : charactersPerHour
    const remainingSourceCharacters = Math.max(0, sourceStats.characters - effectiveCompletedSourceCharacters)
    const estimatedRemainingSeconds = effectiveCharactersPerHour
      ? Math.round(remainingSourceCharacters / effectiveCharactersPerHour * 3600)
      : null
    await writeJsonAtomic(progressPath, {
      schemaVersion: 2,
      status,
      provider,
      model,
      startedAt: new Date(runStartedAt).toISOString(),
      updatedAt: new Date().toISOString(),
      totalRecords: selected.length,
      completedRecords: completedIds.size,
      remainingRecords: Math.max(0, selected.length - completedIds.size),
      failedRecordsThisPass: failed,
      translatedThisPass: translated,
      copiedThisPass: copied,
      skippedThisPass: skipped,
      newlyCompletedRecords,
      totalSourceCharacters: sourceStats.characters,
      completedSourceCharacters: effectiveCompletedSourceCharacters,
      completedRecordSourceCharacters: completedSourceCharacters,
      inFlightValidatedSourceCharacters: currentRecordCompletedSourceCharacters,
      remainingSourceCharacters,
      progressPercent: sourceStats.characters > 0
        ? Number((effectiveCompletedSourceCharacters / sourceStats.characters * 100).toFixed(4))
        : 100,
      sourceCharactersPerHour: effectiveCharactersPerHour,
      estimatedRemainingSeconds,
      currentRecordId,
      currentBatch,
      currentBatchCount,
      currentBatchState,
      currentAttempt,
      currentGeneratedCharacters,
      currentBatchSourceCharacters,
      completedBatchesThisPass,
      totalBatches: translationBatchStats.batches,
      lastBatchError,
      lastError,
    })
  }

}

await compileTranslationShards()

async function translateRecord(record, translator) {
  const batches = batchSegments(record.segments, batchChars, maxBatchParts)
  const translatedParts = new Map()
  let translatedTitle = null
  for (const [batchIndex, batch] of batches.entries()) {
    const context = {
      record,
      batch,
      batchIndex,
      batchCount: batches.length,
      includeTitle: batchIndex === 0,
    }
    const sourceCharacters = batchSourceCharacterCount(batch)
    await reportBatchProgress({
      phase: 'checking',
      recordId: record.id,
      batchNumber: batchIndex + 1,
      batchCount: batches.length,
      sourceCharacters,
      generatedCharacters: 0,
    })
    const result = await readValidBatchCache(context) ?? await translateBatchWithPassthrough(translator, context)
    validateTranslatedBatch(result, context)
    await writeBatchCache(result, context)
    if ((batchIndex + 1) % 10 === 0 || batchIndex === batches.length - 1) {
      console.log(JSON.stringify({ record: record.id, batch: batchIndex + 1, batches: batches.length }))
    }
    await reportBatchProgress({
      phase: 'completed',
      recordId: record.id,
      batchNumber: batchIndex + 1,
      batchCount: batches.length,
      sourceCharacters,
      generatedCharacters: 0,
    })
    if (batchIndex === 0) translatedTitle = result.title
    for (const [itemIndex, item] of batch.entries()) {
      const translatedText = result.segments[itemIndex]
      assert.equal(typeof translatedText, 'string', `${record.id} batch ${batchIndex + 1} missed translation item ${itemIndex}`)
      const allocated = splitTranslatedItem(translatedText, item.members)
      for (const [memberIndex, member] of item.members.entries()) {
        if (!translatedParts.has(member.i)) translatedParts.set(member.i, [])
        translatedParts.get(member.i).push({ p: member.p, text: allocated[memberIndex] })
      }
    }
  }
  const translatedSegments = record.segments.map((segment, i) => {
    const parts = (translatedParts.get(i) ?? []).sort((left, right) => left.p - right.p)
    assert.ok(parts.length, `${record.id} missed translated segment ${i}`)
    return {
      start: segment.start,
      end: segment.end,
      text: parts.map((part) => part.text).join('\n').trim(),
    }
  })
  return translationPayload(record, {
    status: 'translated',
    title: normalizeTranslatedText(translatedTitle || record.title),
    segments: translatedSegments,
    provider,
    model,
  })
}

function copyEnglishRecord(record, providerName, modelName) {
  return translationPayload(record, {
    status: 'no_translation_needed',
    title: String(record.title ?? ''),
    segments: record.segments.map((segment) => ({ start: segment.start, end: segment.end, text: String(segment.text ?? '') })),
    provider: providerName || 'source',
    model: modelName || 'source-language-retained',
  })
}

function cacheMatchesRecord(cached, record) {
  const cacheMatchesRun = cached?.status === 'no_translation_needed'
    || (cached?.provider === provider && cached?.model === model)
  return cached?.schemaVersion === translationVersion
    && cached?.sourceContentSha256 === record.contentSha256
    && cached?.glossaryVersion === publicRecordTranslationGlossaryVersion
    && cacheMatchesRun
}

function sourceCharacterCount(record) {
  return record.segments.reduce((sum, segment) => sum + String(segment.text ?? '').length, 0)
}

function translationPayload(record, translated) {
  const text = translated.segments.map((segment) => segment.text).join('\n')
  return {
    schemaVersion: translationVersion,
    id: record.id,
    date: record.date,
    sourceLanguage: record.language ?? null,
    language: 'en',
    status: translated.status,
    title: translated.title,
    provider: translated.provider,
    model: translated.model,
    glossaryVersion: publicRecordTranslationGlossaryVersion,
    translatedAt: new Date().toISOString(),
    sourceContentSha256: record.contentSha256 ?? createHash('sha256').update(record.segments.map((segment) => segment.text).join('\n')).digest('hex'),
    contentSha256: createHash('sha256').update(`${translated.title}\n${text}`).digest('hex'),
    segmentCount: translated.segments.length,
    charCount: text.length,
    segments: translated.segments,
  }
}

async function compileTranslationShards() {
  const cachedRecords = await readCachedTranslations()
  const sourceById = new Map(sourceRecords.map((record) => [record.id, record]))
  const valid = cachedRecords
    .filter((record) => {
      const source = sourceById.get(record.id)
      return record.schemaVersion === translationVersion
        && record.language === 'en'
        && ['translated', 'no_translation_needed'].includes(record.status)
        && source
        && record.sourceContentSha256 === source.contentSha256
        && record.glossaryVersion === publicRecordTranslationGlossaryVersion
    })
    .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
  await rm(outputRoot, { recursive: true, force: true })
  await mkdir(outputRoot, { recursive: true, mode: 0o755 })

  const groups = Map.groupBy(valid, (record) => String(record.date ?? '').slice(0, 4) || 'unknown')
  const shards = []
  const manifestRecords = []
  for (const [year, records] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (!/^(?:2017|2018|2019|2020|2021|2022|2023)$/u.test(year)) continue
    const dataFilename = `${year}.json.gz`
    const searchFilename = `${year}.search.bin`
    const searchChunks = []
    const compiledRecords = []
    let searchOffset = 0
    for (const record of records) {
      const source = sourceById.get(record.id)
      const glossarySearchAliases = glossaryAliasesForSourceRecord(source)
      const compiledRecord = glossarySearchAliases.length ? { ...record, glossarySearchAliases } : record
      const searchText = Buffer.from(normalizeSearchText(`${record.title} ${record.segments.map((segment) => segment.text).join(' ')} ${glossarySearchAliases.join(' ')}`))
      compiledRecords.push(compiledRecord)
      manifestRecords.push({
        id: record.id,
        date: record.date,
        language: 'en',
        status: record.status,
        title: record.title,
        dataShard: dataFilename,
        searchShard: searchFilename,
        searchOffset,
        searchLength: searchText.length,
        segmentCount: record.segmentCount,
        charCount: record.charCount,
        contentSha256: record.contentSha256,
        sourceContentSha256: record.sourceContentSha256,
        sourceSegmentCount: source?.segments?.length ?? null,
        provider: record.provider,
        model: record.model,
        glossaryVersion: record.glossaryVersion ?? null,
        translatedAt: record.translatedAt,
        glossarySearchAliases,
      })
      searchChunks.push(searchText)
      searchOffset += searchText.length
    }
    await Promise.all([
      writeFile(path.join(outputRoot, dataFilename), await gzipAsync(Buffer.from(JSON.stringify(compiledRecords))), { mode: 0o644 }),
      writeFile(path.join(outputRoot, searchFilename), Buffer.concat(searchChunks), { mode: 0o644 }),
    ])
    shards.push({ id: year, dataFilename, searchFilename, recordCount: records.length })
  }

  const coveredSourceCharacters = valid.reduce((sum, record) => {
    const source = sourceById.get(record.id)
    return sum + (source?.segments?.reduce((inner, segment) => inner + String(segment.text ?? '').length, 0) ?? 0)
  }, 0)
  const translatedCharacters = valid.reduce((sum, record) => sum + Number(record.charCount || 0), 0)
  const outputManifest = {
    schemaVersion: translationVersion,
    language: 'en',
    generatedAt: new Date().toISOString(),
    sourceManifestGeneratedAt: manifest.generatedAt ?? null,
    translationVersion,
    coverage: {
      sourceRecords: selected.length,
      translatedRecords: valid.length,
      missingRecords: Math.max(0, selected.length - valid.length),
      sourceCharacters: sourceStats.characters,
      coveredSourceCharacters,
      translatedCharacters,
      complete: valid.length === selected.length,
    },
    shards,
    records: manifestRecords,
  }
  await writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(outputManifest, null, 2)}\n`, { mode: 0o644 })
  console.log(JSON.stringify(outputManifest.coverage, null, 2))
}

function glossaryAliasesForSourceRecord(source) {
  if (!source) return []
  const sourceText = `${source.title ?? ''}\n${source.segments?.map((segment) => segment.text).join('\n') ?? ''}`
  return [...new Set(publicRecordTranslationValidationRules()
    .filter((rule) => rule.sourcePatterns.some((pattern) => sourceText.includes(pattern)))
    .flatMap((rule) => rule.acceptedEnglish))]
}

async function createTranslator({ provider, model }) {
  if (provider === 'ollama') {
    if (!model) throw new Error('Local transcript translation requires --model, for example --model=translategemma:12b.')
    const { ollamaGenerateJson } = await import('../server/local-legal-ai.js')
    return async ({ record, batch, batchIndex, batchCount, includeTitle, retryFeedback, onGenerationProgress }) => normalizeModelTranslation(await ollamaGenerateJson({
      schemaName: 'public_record_transcript_translation',
      timeoutMs: translationTimeoutMs,
      model,
      format: translationSchema(includeTitle, batch.length),
      options: {
        temperature: 0,
        num_ctx: ollamaContextTokens,
        num_predict: maxOutputTokens,
      },
      system: translationSystemPrompt(model, record, batch, includeTitle),
      user: translationUserPayload(record, batch, batchIndex, batchCount, includeTitle, retryFeedback),
      onProgress: onGenerationProgress,
    }), includeTitle)
  }

  const { cloudGenerateText } = await import('../server/cloud-ai.js')
  const { initializeSettingsStore } = await import('../server/settings-store.js')
  await initializeSettingsStore()
  return async ({ record, batch, batchIndex, batchCount, includeTitle, retryFeedback }) => {
    const raw = await cloudGenerateText({
      provider,
      purpose: 'translation',
      model,
      reasoning: false,
      maxOutputTokens,
      timeoutMs: translationTimeoutMs,
      schemaName: 'public_record_transcript_translation',
      schema: translationSchema(includeTitle, batch.length),
      system: translationSystemPrompt(model, record, batch, includeTitle),
      user: translationUserPayload(record, batch, batchIndex, batchCount, includeTitle, retryFeedback),
    })
    return normalizeModelTranslation(JSON.parse(stripJson(raw)), includeTitle)
  }
}

async function translateBatchWithRetries(translator, context) {
  let lastError = null
  for (let attempt = 0; attempt <= translationRetries; attempt += 1) {
    try {
      await reportBatchProgress({
        phase: attempt ? 'retrying' : 'generating',
        recordId: context.record.id,
        batchNumber: context.batchIndex + 1,
        batchCount: context.batchCount,
        sourceCharacters: batchSourceCharacterCount(context.batch),
        generatedCharacters: 0,
        attempt: attempt + 1,
      })
      const result = await translator({
        ...context,
        retryFeedback: lastError instanceof Error ? lastError.message : lastError ? String(lastError) : null,
        onGenerationProgress: ({ generatedCharacters }) => reportBatchProgress({
          phase: attempt ? 'retrying' : 'generating',
          recordId: context.record.id,
          batchNumber: context.batchIndex + 1,
          batchCount: context.batchCount,
          sourceCharacters: batchSourceCharacterCount(context.batch),
          generatedCharacters,
          attempt: attempt + 1,
        }),
      })
      validateTranslatedBatch(result, context)
      return result
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      console.warn(JSON.stringify({
        phase: 'batch-retry-required',
        record: context.record.id,
        batch: context.batchIndex + 1,
        batches: context.batchCount,
        attempt: attempt + 1,
        error: message,
      }))
      await reportBatchProgress({
        phase: 'validation_failed',
        recordId: context.record.id,
        batchNumber: context.batchIndex + 1,
        batchCount: context.batchCount,
        sourceCharacters: batchSourceCharacterCount(context.batch),
        generatedCharacters: 0,
        attempt: attempt + 1,
        error: message,
      })
      if (attempt >= translationRetries) break
      await delay(Math.min(30000, 1500 * 2 ** attempt))
    }
  }
  throw lastError
}

function batchSourceCharacterCount(batch) {
  return batch.reduce((sum, item) => (
    sum + (item.members?.reduce((inner, member) => inner + String(member.text ?? '').length, 0) ?? String(item.text ?? '').length)
  ), 0)
}

async function translateBatchWithPassthrough(translator, context) {
  const titleNeedsTranslation = context.includeTitle && containsCjk(context.record.title)
  const modelBatch = context.batch.filter((item) => containsCjk(item.text))

  if (!titleNeedsTranslation && modelBatch.length === 0) {
    return {
      title: context.includeTitle ? String(context.record.title ?? '') : null,
      segments: context.batch.map((item) => item.text),
    }
  }

  const modelResult = await translateBatchWithRetries(translator, {
    ...context,
    batch: modelBatch,
    includeTitle: titleNeedsTranslation,
  })
  let translatedIndex = 0
  return {
    title: context.includeTitle
      ? titleNeedsTranslation ? modelResult.title : String(context.record.title ?? '')
      : null,
    segments: context.batch.map((item) => {
      if (!containsCjk(item.text)) return item.text
      const translated = modelResult.segments[translatedIndex]
      translatedIndex += 1
      return translated
    }),
  }
}

function translationSystemPrompt(modelName = '', record = null, batch = [], includeTitle = false) {
  const translateGemmaInstruction = /^translategemma(?::|$)/iu.test(String(modelName))
    ? 'You are a professional Chinese (zh-Hans) to English (en) translator. Accurately convey the meaning and nuances of the original Chinese while following American English grammar, vocabulary, and cultural usage.'
    : 'You are a neutral senior legal and political-history translator producing American English for a local research archive.'
  return [
    translateGemmaInstruction,
    'Translate the supplied Guo Wengui / Miles Guo historical public-statement transcript segments faithfully; do not summarize and do not add facts, commentary, or legal conclusions.',
    'Use clear professional American English while preserving the speaker’s register, first-person voice, rhetorical intensity, names, dates, numbers, slogans, and organization names.',
    'Return exactly one translated string for each supplied text chunk, in the same array order. Line breaks inside a chunk are adjacent subtitle fragments: reconnect them into fluent speech with natural American English punctuation. Do not merge separate array items. A short summary, paraphrase-only answer, or omitted rhetoric is a failure.',
    'Correct only obvious transcription punctuation, spacing, and high-confidence OCR/ASR slips. Do not invent missing words. If a phrase is unintelligible, translate it conservatively rather than guessing.',
    'Use the controlled glossary below. If a source term appears, use the preferred English or an accepted alias exactly. Keep loaded allegation terms as allegations or public-statement rhetoric, not as established legal facts.',
    formatPublicRecordTranslationGlossaryForPrompt(relevantGlossaryEntries(record, batch, includeTitle)),
    'Return only valid JSON that matches the requested schema.',
  ].join('\n')
}

function relevantGlossaryEntries(record, batch, includeTitle) {
  const sourceText = `${includeTitle ? record?.title ?? '' : ''}\n${batch.map((item) => item.text).join('\n')}`
  return publicRecordTranslationGlossary.filter((entry) => {
    const sourceForms = entry.validationSources?.length
      ? entry.validationSources
      : String(entry.source).split(/\s*\/\s*/u).map((value) => value.trim()).filter(Boolean)
    return sourceForms.some((source) => sourceText.includes(source))
  })
}

function translationUserPayload(record, batch, batchIndex, batchCount, includeTitle, retryFeedback = null) {
  return JSON.stringify({
    record: {
      id: record.id,
      date: record.date,
      title: record.title,
    },
    batch: `${batchIndex + 1}/${batchCount}`,
    includeTitle,
    retryRequirement: retryFeedback ? `The prior attempt failed validation: ${retryFeedback}. Correct that exact problem in this response.` : undefined,
    title: includeTitle ? record.title : undefined,
    segments: batch.map((item) => item.text),
  })
}

function translationSchema(includeTitle, segmentCount) {
  return {
    type: 'object',
    additionalProperties: false,
    required: includeTitle ? ['title', 'segments'] : ['segments'],
    properties: {
      ...(includeTitle ? { title: { type: 'string' } } : {}),
      segments: {
        type: 'array',
        minItems: segmentCount,
        maxItems: segmentCount,
        items: { type: 'string' },
      },
    },
  }
}

function normalizeModelTranslation(value, includeTitle) {
  const payload = value && typeof value === 'object' ? value : {}
  if (includeTitle) assert.equal(typeof payload.title, 'string', 'Translation response missed title')
  assert.ok(Array.isArray(payload.segments), 'Translation response missed segments')
  return {
    title: includeTitle ? payload.title : null,
    segments: payload.segments.map((segment) => String(
      typeof segment === 'string' ? segment : segment?.text ?? '',
    )),
  }
}

function validateTranslatedBatch(result, context) {
  const { record, batch, batchIndex, includeTitle } = context
  assert.equal(result.segments.length, batch.length, `${record.id} batch ${batchIndex + 1} returned the wrong segment count`)
  assert.ok(result.segments.every((item) => item.trim()), `${record.id} batch ${batchIndex + 1} returned an empty segment`)
  if (includeTitle) assert.ok(String(result.title ?? '').trim(), `${record.id} batch ${batchIndex + 1} returned an empty title`)

  const sourceText = `${includeTitle ? record.title : ''}\n${batch.map((item) => item.text).join('\n')}`
  const translatedText = `${includeTitle ? result.title : ''}\n${result.segments.join('\n')}`
  assert.ok(translatedText.length >= sourceText.length * 0.2, `${record.id} batch ${batchIndex + 1} translation is implausibly short`)
  assert.equal(cjkCharacterCount(translatedText), 0, `${record.id} batch ${batchIndex + 1} retained Chinese text`)

  for (const [itemIndex, item] of batch.entries()) {
    if (!containsCjk(item.text) || item.text.length < 80) continue
    assert.ok(
      result.segments[itemIndex].length >= item.text.length * 0.25,
      `${record.id} batch ${batchIndex + 1} translation item ${itemIndex} is implausibly short`,
    )
  }

  const normalizedTarget = normalizeEnglish(translatedText)
  for (const rule of publicRecordTranslationValidationRules()) {
    if (!rule.sourcePatterns.some((pattern) => sourceText.includes(pattern))) continue
    assert.ok(
      rule.acceptedEnglish.some((term) => normalizedTarget.includes(normalizeEnglish(term))),
      `${record.id} batch ${batchIndex + 1} missed controlled term ${rule.source}`,
    )
  }
}

async function readValidBatchCache(context) {
  if (force) return null
  const target = batchCachePath(context)
  const cached = await readJsonIfExists(target)
  if (!cached || cached.schemaVersion !== translationVersion) return null
  if (cached.sourceBatchSha256 !== sourceBatchSha256(context)) return null
  if (cached.model !== model || cached.glossaryVersion !== publicRecordTranslationGlossaryVersion) return null
  try {
    const normalized = normalizeModelTranslation(cached.result, context.includeTitle)
    validateTranslatedBatch(normalized, context)
    return normalized
  } catch {
    return null
  }
}

async function writeBatchCache(result, context) {
  const target = batchCachePath(context)
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
  await writeFile(target, `${JSON.stringify({
    schemaVersion: translationVersion,
    recordId: context.record.id,
    batchIndex: context.batchIndex,
    sourceBatchSha256: sourceBatchSha256(context),
    model,
    glossaryVersion: publicRecordTranslationGlossaryVersion,
    result,
  })}\n`, { mode: 0o600 })
}

function batchCachePath(context) {
  const year = String(context.record.date ?? context.record.id).slice(0, 4).match(/^\d{4}$/u) ? String(context.record.date ?? context.record.id).slice(0, 4) : 'misc'
  return path.join(cacheRoot, 'batches', year, safeRecordId(context.record.id), `${String(context.batchIndex).padStart(4, '0')}.json`)
}

function sourceBatchSha256(context) {
  return createHash('sha256').update(JSON.stringify({
    recordId: context.record.id,
    title: context.includeTitle ? context.record.title : null,
    items: context.batch.map((item) => ({
      text: item.text,
      members: item.members.map((member) => ({ i: member.i, p: member.p, text: member.text })),
    })),
  })).digest('hex')
}

function cjkCharacterCount(value) {
  return [...String(value ?? '').matchAll(/[\u3400-\u9fff]/gu)].length
}

function containsCjk(value) {
  return /[\u3400-\u9fff]/u.test(String(value ?? ''))
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

function stripJson(value) {
  const text = String(value ?? '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  if (text.startsWith('{')) return text
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text
}

function batchSegments(segments, maxChars, maximumItems = 240) {
  const itemTargetChars = Math.min(1000, Math.max(600, Math.floor(maxChars / 5)))
  const items = buildTranslationItems(segments, itemTargetChars, 48)
  const batches = []
  let current = []
  let chars = 0
  for (const item of items) {
    const textLength = item.text.length
    if (current.length && (chars + textLength > maxChars || current.length >= maximumItems)) {
      batches.push(current)
      current = []
      chars = 0
    }
    current.push(item)
    chars += textLength
  }
  if (current.length) batches.push(current)
  return batches
}

function buildTranslationItems(segments, targetChars, maximumMembers) {
  const parts = []
  for (const [i, segment] of segments.entries()) {
    const split = splitOversizedTranslationText(segment.text, targetChars)
    for (const [p, text] of split.entries()) parts.push({ i, p, text })
  }

  const items = []
  let members = []
  let chars = 0
  for (const part of parts) {
    const separator = members.length ? 1 : 0
    if (members.length && (chars + separator + part.text.length > targetChars || members.length >= maximumMembers)) {
      items.push(translationItem(members))
      members = []
      chars = 0
    }
    members.push(part)
    chars += (members.length > 1 ? 1 : 0) + part.text.length
  }
  if (members.length) items.push(translationItem(members))
  return items
}

function translationItem(members) {
  return {
    members,
    text: members.map((member) => member.text).join('\n'),
  }
}

function splitTranslatedItem(value, members) {
  const text = normalizeTranslatedText(value)
  if (members.length === 1) return [text]
  assert.ok(text.length >= members.length, 'Translated item is too short to map back to source timestamps')

  const weights = members.map((member) => Math.max(1, member.text.length))
  const parts = []
  let remaining = text
  let remainingWeight = weights.reduce((sum, weight) => sum + weight, 0)
  for (let index = 0; index < members.length - 1; index += 1) {
    const remainingParts = members.length - index - 1
    const target = Math.max(1, Math.min(
      remaining.length - remainingParts,
      Math.round(remaining.length * weights[index] / remainingWeight),
    ))
    const boundary = nearestEnglishBoundary(remaining, target, remainingParts)
    const part = remaining.slice(0, boundary).trim()
    assert.ok(part, 'Translated item produced an empty timestamp segment')
    parts.push(part)
    remaining = remaining.slice(boundary).trim()
    remainingWeight -= weights[index]
  }
  assert.ok(remaining, 'Translated item produced an empty final timestamp segment')
  parts.push(remaining)
  return parts
}

function nearestEnglishBoundary(value, target, minimumRemaining) {
  const lower = Math.max(1, target - 80)
  const upper = Math.min(value.length - minimumRemaining, target + 80)
  const candidates = []
  for (let index = lower; index <= upper; index += 1) {
    if (/\s/u.test(value[index] ?? '') || /[.!?,;:]/u.test(value[index - 1] ?? '')) candidates.push(index)
  }
  if (!candidates.length) return target
  return candidates.reduce((best, candidate) => (
    Math.abs(candidate - target) < Math.abs(best - target) ? candidate : best
  ), candidates[0])
}

function splitOversizedTranslationText(value, maxChars) {
  let remaining = String(value ?? '').trim()
  if (!remaining) return ['']
  const parts = []
  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars + 1)
    const minimum = Math.floor(maxChars * 0.55)
    const candidates = [
      window.lastIndexOf('\n\n'),
      window.lastIndexOf('\n'),
      window.lastIndexOf('。'),
      window.lastIndexOf('！'),
      window.lastIndexOf('？'),
      window.lastIndexOf('. '),
      window.lastIndexOf('! '),
      window.lastIndexOf('? '),
      window.lastIndexOf('，'),
      window.lastIndexOf(', '),
      window.lastIndexOf(' '),
    ].filter((index) => index >= minimum)
    const boundary = candidates.length ? Math.max(...candidates) : maxChars
    const delimiterWidth = ['。', '！', '？'].includes(window[boundary]) ? 1 : window.slice(boundary, boundary + 2).match(/^[.!?]\s/u) ? 1 : 0
    const cut = Math.min(maxChars, Math.max(1, boundary + delimiterWidth))
    parts.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }
  if (remaining) parts.push(remaining)
  return parts
}

async function readCachedTranslations() {
  const files = await listJsonFiles(cacheRoot)
  const records = []
  for (const file of files) {
    const value = await readJsonIfExists(file)
    if (value) records.push(value)
  }
  return records
}

async function listJsonFiles(root) {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
  const files = []
  for (const entry of entries) {
    const target = path.join(root, entry.name)
    if (entry.isDirectory() && !['failures', 'batches'].includes(entry.name)) files.push(...await listJsonFiles(target))
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(target)
  }
  return files
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    return null
  }
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const temporary = `${file}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, file)
}

function recordCachePath(id) {
  const safe = safeRecordId(id)
  const year = String(id).slice(0, 4).match(/^\d{4}$/u) ? String(id).slice(0, 4) : 'misc'
  return path.join(cacheRoot, year, `${safe}.json`)
}

function failureCachePath(record) {
  return path.join(cacheRoot, 'failures', `${safeRecordId(record.id)}.json`)
}

function safeRecordId(id) {
  return String(id).replace(/[^a-z0-9._-]/giu, '_').slice(0, 180)
}

function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\p{P}\p{S}\s]+/gu, '')
}

function normalizeTranslatedText(value) {
  return String(value ?? '').replace(/\r\n?/gu, '\n').replace(/[ \t]+\n/gu, '\n').trim()
}

async function mapLimit(items, limit, worker) {
  const queue = [...items]
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      if (!item) return
      await worker(item)
    }
  })
  await Promise.all(workers)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseArgs(values) {
  const parsed = {}
  for (const arg of values) {
    if (arg.startsWith('--no-')) {
      parsed[toCamel(arg.slice(5))] = false
      continue
    }
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=')
      parsed[toCamel(key)] = rest.length ? rest.join('=') : true
    }
  }
  return parsed
}

function toCamel(value) {
  return value.replace(/-([a-z])/gu, (_, char) => char.toUpperCase())
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback
}
