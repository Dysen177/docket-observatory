import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildOfflineDocumentAnalysis } from '../server/document-analysis.js'
import { refreshDocumentSearchIndex } from '../server/document-search.js'
import { humanDocumentResearch } from '../server/human-legal-research.js'
import { createSeedState } from '../server/seed.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(projectRoot, 'downloads', 'court-files-complete', 'manifest.json')
const statePath = path.join(projectRoot, 'server', 'cache', 'state.json')
const reportPath = path.join(projectRoot, 'output', 'offline-document-read-rebuild.json')
const concurrency = boundedInteger(argumentValue('--concurrency'), 1, 8, 4)
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const seedState = createSeedState()
const cachedState = await readJson(statePath)
const state = cachedState ? { ...seedState, ...cachedState } : seedState
const files = (manifest.files ?? []).filter((file) => file.status !== 'error' && file.path)
const startedAt = Date.now()
const networkAttempts = []
const originalFetch = globalThis.fetch

globalThis.fetch = async (input) => {
  networkAttempts.push(String(input))
  throw new Error('Offline document-read rebuild forbids network access.')
}

let completed = 0
const results = []
try {
  await mapWithConcurrency(files, concurrency, async (file) => {
    try {
      const zh = await buildOfflineDocumentAnalysis(file, state, 'zh')
      const en = await buildOfflineDocumentAnalysis(file, state, 'en')
      results.push(summarize(file, zh, en))
    } catch (error) {
      results.push({
        sourceUrl: file.url,
        caseId: file.caseId ?? null,
        docNumber: file.docNumber ?? null,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
    }
    completed += 1
    if (completed % 50 === 0 || completed === files.length) {
      console.log(`[offline-read] ${completed}/${files.length}`)
    }
  })
} finally {
  globalThis.fetch = originalFetch
}

if (networkAttempts.length) throw new Error(`Offline rebuild attempted ${networkAttempts.length} network request(s).`)

const logicalGroups = Object.values(Object.groupBy(results.filter((item) => item.status === 'ok'), logicalKey))
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  durationMs: Date.now() - startedAt,
  mode: 'deterministic_offline_no_api_no_ollama',
  networkAttempts: networkAttempts.length,
  manifestEntries: manifest.files?.length ?? 0,
  processedPhysicalFiles: files.length,
  processedLogicalFiles: logicalGroups.length,
  physical: resultCounts(results),
  logical: logicalCounts(logicalGroups),
  types: countBy(results.filter((item) => item.status === 'ok'), (item) => item.typeKey),
  failures: results.filter((item) => item.status === 'failed'),
}

await mkdir(path.dirname(reportPath), { recursive: true })
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
const search = await refreshDocumentSearchIndex(manifest)
console.log(JSON.stringify({ ...report, search }, null, 2))

function summarize(file, zh, en) {
  const extraction = zh.textExtraction ?? {}
  const human = Boolean(humanDocumentResearch(file, 'zh'))
  const typeKey = zh.offlineRead?.typeKey ?? 'docket_filing'
  return {
    sourceUrl: file.url,
    caseId: file.caseId ?? null,
    docNumber: file.docNumber ?? null,
    status: 'ok',
    humanResearch: human,
    provider: zh.aiStatus?.provider ?? null,
    typeKey,
    specificity: Number(zh.offlineRead?.specificity ?? 0),
    extraction: extraction.status === 'extracted'
      ? extraction.coverage === 'complete' ? 'complete' : 'partial'
      : 'metadata_only',
    bilingualRead: Boolean(String(zh.plainEnglish ?? '').trim() && String(en.plainEnglish ?? '').trim()),
    bilingualProfessionalRead: Boolean(zh.legalReading?.length && en.legalReading?.length),
  }
}

function resultCounts(values) {
  const successful = values.filter((item) => item.status === 'ok')
  return {
    successful: successful.length,
    failed: values.length - successful.length,
    humanResearch: successful.filter((item) => item.humanResearch).length,
    localRules: successful.filter((item) => item.provider === 'local_rules').length,
    completeBody: successful.filter((item) => item.extraction === 'complete').length,
    partialBody: successful.filter((item) => item.extraction === 'partial').length,
    metadataOnly: successful.filter((item) => item.extraction === 'metadata_only').length,
    specificRead: successful.filter((item) => item.specificity >= 2).length,
    genericRead: successful.filter((item) => item.specificity < 2).length,
    bilingualRead: successful.filter((item) => item.bilingualRead).length,
    bilingualProfessionalRead: successful.filter((item) => item.bilingualProfessionalRead).length,
  }
}

function logicalCounts(groups) {
  const best = groups.map((group) => group.toSorted((left, right) => readRank(right) - readRank(left))[0])
  return {
    total: best.length,
    humanResearch: groups.filter((group) => group.some((item) => item.humanResearch)).length,
    completeBody: groups.filter((group) => group.some((item) => item.extraction === 'complete')).length,
    partialBody: groups.filter((group) => !group.some((item) => item.extraction === 'complete') && group.some((item) => item.extraction === 'partial')).length,
    metadataOnly: groups.filter((group) => group.every((item) => item.extraction === 'metadata_only')).length,
    specificRead: best.filter((item) => item.specificity >= 2).length,
    genericRead: best.filter((item) => item.specificity < 2).length,
  }
}

function readRank(value) {
  return (value.humanResearch ? 1000 : 0) + Number(value.specificity ?? 0)
}

function logicalKey(value) {
  return `${value.caseId ?? 'unassigned'}|${value.docNumber ?? value.sourceUrl}`
}

function countBy(values, keyFor) {
  return values.reduce((counts, value) => {
    const key = keyFor(value) ?? 'unknown'
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

async function mapWithConcurrency(values, limit, mapper) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      await mapper(values[index], index)
    }
  })
  await Promise.all(workers)
}

function argumentValue(name) {
  const argument = process.argv.slice(2).find((value) => value.startsWith(`${name}=`))
  return argument ? argument.slice(name.length + 1) : null
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}
