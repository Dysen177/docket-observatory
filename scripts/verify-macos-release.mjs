import { spawnSync } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

if (process.platform !== 'darwin') throw new Error('macOS release verification must run on macOS.')
const releaseDirectory = path.resolve(process.argv[2] ?? 'release')
const names = await readdir(releaseDirectory)
const dmgs = names.filter((name) => name.endsWith('.dmg')).sort()
if (!dmgs.some((name) => name.includes('macOS-arm64')) || !dmgs.some((name) => name.includes('macOS-x64'))) {
  throw new Error('Both arm64 and x64 macOS DMGs are required.')
}

function verify(command, args, label) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 120000 })
  if (result.status !== 0) throw new Error(`${label} failed: ${(result.stderr || result.stdout || 'unknown error').trim()}`)
}

for (const name of dmgs) {
  const filePath = path.join(releaseDirectory, name)
  verify('/usr/bin/xcrun', ['stapler', 'validate', filePath], `${name} notarization staple`)
  verify('/usr/sbin/spctl', ['--assess', '--type', 'open', '--context', 'context:primary-signature', '--verbose=4', filePath], `${name} Gatekeeper assessment`)
}

for (const directoryName of names.filter((name) => name.startsWith('mac'))) {
  const directory = path.join(releaseDirectory, directoryName)
  const appNames = (await readdir(directory).catch(() => [])).filter((name) => name.endsWith('.app'))
  for (const appName of appNames) {
    verify('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=4', path.join(directory, appName)], `${appName} code signature`)
  }
}

console.log(`Verified Developer ID/Gatekeeper/notarization structure for ${dmgs.length} macOS DMGs.`)
