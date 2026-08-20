import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  publicRecordTranslationGlossary,
  publicRecordTranslationGlossaryVersion,
} from '../server/public-record-translation-glossary.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = parseArgs(process.argv.slice(2))
const temporaryRoot = path.resolve(args.tempRoot ?? process.env.GUO_INTEL_FAST_TRANSLATION_ROOT ?? path.join(homedir(), 'Library/Caches/guo-intel-fast-translation'))
const sourceRoot = path.resolve(args.sourceRoot ?? path.join(projectRoot, 'server/public-record-transcripts'))
const outputRoot = path.resolve(args.outputRoot ?? path.join(sourceRoot, 'en'))
const cacheRoot = path.resolve(args.cacheRoot ?? path.join(projectRoot, 'server/cache/public-record-translations/en'))
const progressPath = path.resolve(args.progressPath ?? path.join(projectRoot, 'output/public-record-translation-progress.json'))
const pythonPath = path.resolve(args.python ?? path.join(temporaryRoot, 'venv/bin/python'))
const workerPath = path.join(projectRoot, 'scripts/fast-transcript-translation-worker.py')
const primaryModelRoot = path.resolve(args.primaryModelRoot ?? path.join(temporaryRoot, 'models/argos-zh-en/translate-zh_en-1_9'))
const fallbackModelRoot = path.resolve(args.fallbackModelRoot ?? path.join(temporaryRoot, 'models/nllb-200-distilled-600m-ct2-int8'))
const glossaryPath = path.join(temporaryRoot, 'translation-glossary.json')
const provider = 'offline_ct2_hybrid'
const modelName = 'argos-translate-zh-en-1.9-int8+nllb-200-distilled-600m-int8'

await mkdir(temporaryRoot, { recursive: true, mode: 0o700 })
await writeJsonAtomic(glossaryPath, controlledGlossary())
await mkdir(path.dirname(progressPath), { recursive: true, mode: 0o700 })

const pythonArgs = [
  workerPath,
  `--source-root=${sourceRoot}`,
  `--cache-root=${cacheRoot}`,
  `--progress-path=${progressPath}`,
  `--glossary-json=${glossaryPath}`,
  `--primary-model-root=${primaryModelRoot}`,
  `--fallback-model-root=${fallbackModelRoot}`,
  `--provider=${provider}`,
  `--model-name=${modelName}`,
  `--glossary-version=${publicRecordTranslationGlossaryVersion}`,
  `--batch-size=${boundedInteger(args.batchSize, 256, 32, 512)}`,
  `--block-size=${boundedInteger(args.blockSize, 2048, 128, 8192)}`,
  `--max-chunk-chars=${boundedInteger(args.maxChunkChars, 140, 80, 220)}`,
  `--inter-threads=${boundedInteger(args.interThreads, 2, 1, 4)}`,
  `--intra-threads=${boundedInteger(args.intraThreads, 5, 1, 10)}`,
]
for (const key of ['limit', 'year', 'recordId']) {
  if (args[key] !== undefined && args[key] !== true) pythonArgs.push(`--${key.replace(/[A-Z]/gu, (char) => `-${char.toLowerCase()}`)}=${args[key]}`)
}
if (args.force) pythonArgs.push('--force')

const workerExitCode = await run(pythonPath, pythonArgs, {
  cwd: projectRoot,
  env: {
    ...process.env,
    PYTHONWARNINGS: 'ignore',
    TOKENIZERS_PARALLELISM: 'false',
  },
})

const compileExitCode = await run(process.execPath, [
  'scripts/translate-public-record-transcripts-en.mjs',
  '--compile-only',
  `--sourceRoot=${sourceRoot}`,
  `--outputRoot=${outputRoot}`,
  `--cacheRoot=${cacheRoot}`,
], { cwd: projectRoot, env: process.env })

const compiledManifest = await readJson(path.join(outputRoot, 'manifest.json'))
const complete = Boolean(compiledManifest?.coverage?.complete && compiledManifest.coverage.missingRecords === 0)
const progress = await readJson(progressPath)
await writeJsonAtomic(progressPath, {
  ...(progress ?? {}),
  status: workerExitCode === 0 && compileExitCode === 0 && complete ? 'complete' : progress?.status ?? 'pass_complete_with_failures',
  updatedAt: new Date().toISOString(),
  compiledCoverage: compiledManifest?.coverage ?? null,
})

if (workerExitCode !== 0 || compileExitCode !== 0 || !complete) {
  process.exitCode = 2
}

function controlledGlossary() {
  return publicRecordTranslationGlossary
    .filter((entry) => Array.isArray(entry.validationSources) && entry.validationSources.length)
    .map((entry) => ({
      source: entry.source,
      preferredEnglish: entry.preferredEnglish,
      sourcePatterns: entry.validationSources,
    }))
}

function run(command, commandArgs, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      ...options,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)))
  })
}

function parseArgs(values) {
  const parsed = {}
  for (const value of values) {
    if (!value.startsWith('--')) continue
    const [key, ...rest] = value.slice(2).split('=')
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
