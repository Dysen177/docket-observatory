import { spawnSync } from 'node:child_process'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

if (process.platform !== 'darwin') throw new Error('macOS community release verification must run on macOS.')

const releaseDirectory = path.resolve(process.argv[2] ?? 'release')
const names = await readdir(releaseDirectory)
const dmgs = names.filter((name) => name.endsWith('-unsigned.dmg')).sort()

if (!dmgs.some((name) => name.includes('macOS-arm64')) || !dmgs.some((name) => name.includes('macOS-x64'))) {
  throw new Error('Both arm64 and x64 unsigned community DMGs are required.')
}

function run(command, args, label, timeout = 120000) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (result.status !== 0) throw new Error(`${label} failed: ${(output || 'unknown error').trim()}`)
  return output
}

for (const name of dmgs) {
  const filePath = path.join(releaseDirectory, name)
  run('/usr/bin/hdiutil', ['verify', filePath], `${name} disk-image integrity`, 300000)

  const mountDirectory = await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-community-'))
  let attached = false
  try {
    run('/usr/bin/hdiutil', ['attach', filePath, '-nobrowse', '-readonly', '-mountpoint', mountDirectory], `${name} mount`, 300000)
    attached = true

    const appNames = (await readdir(mountDirectory)).filter((entry) => entry.endsWith('.app'))
    if (appNames.length !== 1) throw new Error(`${name} must contain exactly one application bundle.`)

    const appPath = path.join(mountDirectory, appNames[0])
    run('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=4', appPath], `${name} application signature`)
    const signature = run('/usr/bin/codesign', ['-dvvv', appPath], `${name} signature metadata`)
    const codeResourcesPath = path.join(appPath, 'Contents', '_CodeSignature', 'CodeResources')
    const codeResources = await readdir(path.dirname(codeResourcesPath)).catch(() => [])
    if (!codeResources.includes('CodeResources')) throw new Error(`${name} is missing its sealed application resource manifest.`)
    if (!signature.includes('Identifier=org.docketobservatory.app')) throw new Error(`${name} has an unexpected application identifier.`)
    if (!signature.includes('Signature=adhoc')) throw new Error(`${name} must carry an ad-hoc bundle-integrity signature.`)
    if (!signature.includes('TeamIdentifier=not set')) throw new Error(`${name} unexpectedly claims a platform signing team.`)
    const requiredResources = [
      'startup/startup.html',
      'startup/startup-error.html',
      'startup/startup-error.js',
      'build/icon.png',
    ]
    const resourceRoot = path.join(appPath, 'Contents', 'Resources')
    for (const relativeResource of requiredResources) {
      const segments = relativeResource.split('/')
      const parentEntries = await readdir(path.join(resourceRoot, ...segments.slice(0, -1))).catch(() => [])
      if (!parentEntries.includes(segments.at(-1))) throw new Error(`${name} is missing packaged resource ${relativeResource}.`)
    }
  } finally {
    if (attached) spawnSync('/usr/bin/hdiutil', ['detach', mountDirectory, '-force'], { encoding: 'utf8', timeout: 120000 })
    await rm(mountDirectory, { recursive: true, force: true })
  }
}

console.log(`Verified disk-image integrity and ad-hoc application bundle signatures for ${dmgs.length} community DMGs.`)
