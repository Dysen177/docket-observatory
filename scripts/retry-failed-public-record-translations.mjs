import { spawn } from 'node:child_process'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = parseArgs(process.argv.slice(2))
const outputRoot = path.join(projectRoot, 'output')
const failureRoot = path.join(projectRoot, 'server/cache/public-record-translations/en/failures')
const overallProgressPath = path.join(outputRoot, 'public-record-translation-progress.json')
const retryProgressPath = path.join(outputRoot, 'public-record-translation-retry-progress.json')
const retryStatePath = path.join(outputRoot, 'public-record-translation-retry.pid.json')
const englishManifestPath = path.join(projectRoot, 'server/public-record-transcripts/en/manifest.json')
const waitPid = positiveInteger(args.waitPid)
const maxPasses = boundedInteger(args.maxPasses, 2, 1, 3)

await mkdir(outputRoot, { recursive: true, mode: 0o700 })
await writeState('waiting', { waitPid })

if (waitPid) {
  while (processIsAlive(waitPid)) await delay(30_000)
  await delay(2_000)
}

const initialProgress = await readJson(overallProgressPath)
if (initialProgress?.status === 'paused') {
  await writeState('paused', { reason: 'The main translation pass was paused.' })
  process.exit(0)
}
if (waitPid && initialProgress?.status !== 'pass_complete_with_failures' && initialProgress?.status !== 'complete') {
  await writeState('not_started', { reason: `Unexpected main-pass status: ${initialProgress?.status ?? 'missing'}` })
  process.exitCode = 2
  process.exit()
}

let previousFailureCount = Number.POSITIVE_INFINITY
for (let pass = 1; pass <= maxPasses; pass += 1) {
  const failureIds = await readFailureIds()
  if (!failureIds.length) break
  if (failureIds.length >= previousFailureCount) break
  previousFailureCount = failureIds.length
  const maxChunkChars = pass === 1 ? 140 : 80
  await writeState('retrying', { pass, maxPasses, failureCount: failureIds.length, maxChunkChars })
  await run(process.execPath, [
    'scripts/translate-public-record-transcripts-fast.mjs',
    `--record-id=${failureIds.join(',')}`,
    `--progressPath=${retryProgressPath}`,
    `--maxChunkChars=${maxChunkChars}`,
  ])
  await syncOverallProgress()
}

const remainingFailureIds = await readFailureIds()
await syncOverallProgress()
await writeState(remainingFailureIds.length ? 'review_required' : 'complete', {
  remainingFailures: remainingFailureIds.length,
})
process.exitCode = remainingFailureIds.length ? 2 : 0

async function readFailureIds() {
  let names = []
  try {
    names = await readdir(failureRoot)
  } catch {
    return []
  }
  const ids = []
  for (const name of names.sort()) {
    if (!name.endsWith('.json')) continue
    const failure = await readJson(path.join(failureRoot, name))
    if (typeof failure?.id === 'string' && failure.id.trim()) ids.push(failure.id.trim())
  }
  return [...new Set(ids)]
}

async function syncOverallProgress() {
  const [progress, manifest] = await Promise.all([
    readJson(overallProgressPath),
    readJson(englishManifestPath),
  ])
  const coverage = manifest?.coverage
  if (!progress || !coverage) return
  const totalCharacters = Number(coverage.sourceCharacters ?? progress.totalSourceCharacters ?? 0)
  const completedCharacters = Number(coverage.coveredSourceCharacters ?? progress.completedSourceCharacters ?? 0)
  const complete = Boolean(coverage.complete && Number(coverage.missingRecords ?? 0) === 0)
  await writeJsonAtomic(overallProgressPath, {
    ...progress,
    status: complete ? 'complete' : 'pass_complete_with_failures',
    updatedAt: new Date().toISOString(),
    completedRecords: Number(coverage.translatedRecords ?? progress.completedRecords ?? 0),
    remainingRecords: Number(coverage.missingRecords ?? progress.remainingRecords ?? 0),
    completedSourceCharacters: completedCharacters,
    remainingSourceCharacters: Math.max(0, totalCharacters - completedCharacters),
    progressPercent: totalCharacters ? Number((completedCharacters / totalCharacters * 100).toFixed(4)) : 100,
    failedRecordsThisPass: complete ? 0 : progress.failedRecordsThisPass,
    lastError: complete ? null : progress.lastError,
    estimatedRemainingSeconds: complete ? 0 : progress.estimatedRemainingSeconds,
    compiledCoverage: coverage,
  })
}

async function writeState(status, details = {}) {
  await writeJsonAtomic(retryStatePath, {
    pid: process.pid,
    status,
    updatedAt: new Date().toISOString(),
    ...details,
  })
}

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd: projectRoot, env: process.env, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)))
  })
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function parseArgs(values) {
  return Object.fromEntries(values.filter((value) => value.startsWith('--')).map((value) => {
    const [key, ...rest] = value.slice(2).split('=')
    return [key.replace(/-([a-z])/gu, (_, char) => char.toUpperCase()), rest.length ? rest.join('=') : true]
  }))
}

function positiveInteger(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, file)
}
