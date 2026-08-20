import { spawn } from 'node:child_process'
import { readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const model = String(process.argv.find((arg) => arg.startsWith('--model='))?.split('=').slice(1).join('=') || 'translategemma:12b')
const batchChars = '6000'
const maxBatchParts = '240'
const contextTokens = '16384'

console.log(JSON.stringify({ phase: 'waiting-for-model', model }))
while (!(await commandSucceeds('ollama', ['show', model]))) {
  await delay(30000)
}

console.log(JSON.stringify({ phase: 'smoke-tests-start', model }))
await run('npm', [
  'run',
  'translate:public-record-transcripts:en',
  '--',
  '--provider=ollama',
  `--model=${model}`,
  '--recordId=2021-04-01-1,2021-04-27-1,2019-06-11-2',
  `--batchChars=${batchChars}`,
  `--maxBatchParts=${maxBatchParts}`,
  `--ollamaContextTokens=${contextTokens}`,
  '--maxOutputTokens=20000',
  '--translationTimeoutMs=900000',
  '--retries=2',
  '--concurrency=1',
  '--force',
])

await run(process.execPath, ['scripts/translate-public-record-transcripts-en.mjs', '--compile-only'])
await run('npm', ['run', 'test:public-record-transcripts'])
console.log(JSON.stringify({ phase: 'smoke-tests-passed', model }))

await run('npm', [
  'run',
  'translate:public-record-transcripts:en:local',
  '--',
  `--model=${model}`,
  `--batchChars=${batchChars}`,
  `--maxBatchParts=${maxBatchParts}`,
  `--ollamaContextTokens=${contextTokens}`,
  '--removeModelOnSuccess',
])

await cleanupTemporaryModelState(model)
console.log(JSON.stringify({ phase: 'translation-finished-and-cleaned', model }))

async function run(command, args) {
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
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

async function commandSucceeds(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: process.cwd(), env: process.env, stdio: 'ignore' })
    child.once('error', () => resolve(false))
    child.once('exit', (code) => resolve(code === 0))
  })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function cleanupTemporaryModelState(modelName) {
  for (const variable of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']) {
    await commandSucceeds('launchctl', ['unsetenv', variable])
  }
  await commandSucceeds('brew', ['services', 'restart', 'ollama'])

  const digest = modelName === 'translategemma:12b'
    ? 'sha256-1b2b95e2f0eb9a98a839249ed41dfca71b300f9c389e14581210649fada910ed'
    : null
  if (!digest) return
  const blobRoot = path.join(os.homedir(), '.ollama', 'models', 'blobs')
  let entries = []
  try {
    entries = await readdir(blobRoot)
  } catch {
    return
  }
  await Promise.all(entries
    .filter((entry) => entry.startsWith(`${digest}-partial-`))
    .map((entry) => rm(path.join(blobRoot, entry), { force: true })))
}
