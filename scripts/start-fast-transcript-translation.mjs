import { spawn } from 'node:child_process'
import { mkdir, open, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = path.join(projectRoot, 'output')
const pidPath = path.join(outputRoot, 'public-record-translation.pid.json')
const logPath = path.join(outputRoot, 'public-record-fast-translation.log')
const progressPath = path.join(outputRoot, 'public-record-translation-progress.json')

const existing = await readJson(pidPath)
if (existing?.pid && processIsAlive(existing.pid)) {
  console.log(JSON.stringify({ status: 'already_running', ...existing, progressPath, logPath }, null, 2))
  process.exit(0)
}

await mkdir(outputRoot, { recursive: true, mode: 0o700 })
const log = await open(logPath, 'a', 0o600)
const child = spawn('caffeinate', [
  '-i',
  'nice',
  '-n',
  '5',
  process.execPath,
  'scripts/translate-public-record-transcripts-fast.mjs',
  `--progressPath=${progressPath}`,
], {
  cwd: projectRoot,
  detached: true,
  env: process.env,
  stdio: ['ignore', log.fd, log.fd],
})

const state = {
  pid: child.pid,
  provider: 'offline_ct2_hybrid',
  model: 'argos-translate-zh-en-1.9-int8+nllb-200-distilled-600m-int8',
  startedAt: new Date().toISOString(),
  progressPath,
  logPath,
}
await writeFile(pidPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
await log.close()
child.unref()
console.log(JSON.stringify({ status: 'started', ...state }, null, 2))

function processIsAlive(pid) {
  try {
    process.kill(Number(pid), 0)
    return true
  } catch {
    return false
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}
