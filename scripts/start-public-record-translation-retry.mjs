import { spawn } from 'node:child_process'
import { closeSync, openSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve('.')
const mainState = await readJson(path.join(projectRoot, 'output/public-record-translation.pid.json'))
const retryState = await readJson(path.join(projectRoot, 'output/public-record-translation-retry.pid.json'))

if (retryState?.pid && processIsAlive(retryState.pid)) {
  console.log(`Failure retry watcher is already running with PID ${retryState.pid}.`)
  process.exit(0)
}
if (!mainState?.pid || !processIsAlive(mainState.pid)) {
  throw new Error('The main translation process is not running; start a retry directly after confirming its final status.')
}

const logPath = path.join(projectRoot, 'output/public-record-translation-retry.log')
const log = openSync(logPath, 'a', 0o600)
const child = spawn(process.execPath, [
  'scripts/retry-failed-public-record-translations.mjs',
  `--wait-pid=${mainState.pid}`,
], {
  cwd: projectRoot,
  detached: true,
  stdio: ['ignore', log, log],
})
child.unref()
closeSync(log)
console.log(`Failure retry watcher started with PID ${child.pid}; waiting for main PID ${mainState.pid}.`)

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
