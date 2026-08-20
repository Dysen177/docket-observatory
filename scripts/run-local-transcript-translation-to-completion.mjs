import { spawn } from 'node:child_process'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))
const model = String(args.model ?? 'translategemma:12b')
const outputRoot = path.resolve(args.outputRoot ?? 'server/public-record-transcripts/en')
const cacheRoot = path.resolve(args.cacheRoot ?? 'server/cache/public-record-translations/en')
const progressPath = path.resolve(args.progressPath ?? 'output/public-record-translation-progress.json')
const removeModelOnSuccess = Boolean(args.removeModelOnSuccess)
let batchChars = boundedInteger(args.batchChars, 6000, 2000, 12000)
const maxBatchParts = boundedInteger(args.maxBatchParts, 240, 20, 300)
const contextTokens = boundedInteger(args.ollamaContextTokens ?? args.contextTokens, 16384, 8192, 65536)
const maxPasses = boundedInteger(args.maxPasses, 12, 1, 100)
let lastTranslatedRecords = -1
let stagnantPasses = 0

for (let pass = 1; pass <= maxPasses; pass += 1) {
  console.log(JSON.stringify({ phase: 'translation-pass', pass, model, batchChars, maxBatchParts, contextTokens }))
  await run(process.execPath, [
    'scripts/translate-public-record-transcripts-en.mjs',
    '--provider=ollama',
    `--model=${model}`,
    `--batchChars=${batchChars}`,
    `--maxBatchParts=${maxBatchParts}`,
    `--ollamaContextTokens=${contextTokens}`,
    `--progressPath=${progressPath}`,
    '--maxOutputTokens=20000',
    '--translationTimeoutMs=900000',
    '--retries=2',
    '--concurrency=1',
  ])

  const manifest = await readJson(path.join(outputRoot, 'manifest.json'))
  const coverage = manifest?.coverage ?? {}
  console.log(JSON.stringify({ phase: 'coverage', pass, coverage }))

  if (coverage.complete && coverage.missingRecords === 0) {
    await run('npm', ['run', 'test:public-record-transcripts'])
    await run('npm', ['run', 'lint'])
    await run('npm', ['run', 'build'])
    await rm(path.join(cacheRoot, 'batches'), { recursive: true, force: true })
    await rm(path.join(cacheRoot, 'failures'), { recursive: true, force: true })
    if (removeModelOnSuccess) await run('ollama', ['rm', model])
    const progress = await readJson(progressPath)
    await writeJsonAtomic(progressPath, {
      ...progress,
      status: 'complete',
      updatedAt: new Date().toISOString(),
      completedRecords: Number(coverage.translatedRecords ?? progress?.completedRecords ?? 0),
      remainingRecords: 0,
      progressPercent: 100,
      currentRecordId: null,
      currentBatch: null,
      currentBatchCount: null,
      estimatedRemainingSeconds: 0,
    })
    console.log(JSON.stringify({ phase: 'complete', model, removedModel: removeModelOnSuccess, coverage }))
    process.exit(0)
  }

  const translatedRecords = Number(coverage.translatedRecords ?? 0)
  if (translatedRecords <= lastTranslatedRecords) stagnantPasses += 1
  else stagnantPasses = 0
  lastTranslatedRecords = translatedRecords

  if (stagnantPasses >= 2 && batchChars > 2000) {
    batchChars = Math.max(2000, Math.floor(batchChars / 2))
    stagnantPasses = 0
    console.log(JSON.stringify({ phase: 'adaptive-retry', nextBatchChars: batchChars }))
  } else if (stagnantPasses >= 4) {
    throw new Error(`Translation made no progress for ${stagnantPasses} passes; inspect ${path.join(cacheRoot, 'failures')} before retrying.`)
  }
}

throw new Error(`Translation did not complete after ${maxPasses} passes.`)

async function run(command, commandArgs) {
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`${command} terminated by ${signal}`))
      else resolve(code ?? 1)
    })
  })
  if (exitCode !== 0) throw new Error(`${command} exited with code ${exitCode}`)
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, file)
}

function parseArgs(values) {
  const parsed = {}
  for (const arg of values) {
    if (!arg.startsWith('--')) continue
    const [key, ...rest] = arg.slice(2).split('=')
    parsed[toCamel(key)] = rest.length ? rest.join('=') : true
  }
  return parsed
}

function toCamel(value) {
  return value.replace(/-([a-z])/gu, (_, char) => char.toUpperCase())
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback
}
