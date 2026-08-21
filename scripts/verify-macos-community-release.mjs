import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

if (process.platform !== 'darwin') throw new Error('macOS community release verification must run on macOS.')

const releaseDirectory = path.resolve(process.argv[2] ?? 'release')
const names = await readdir(releaseDirectory)
const packageMetadata = JSON.parse(await readFile(path.resolve('package.json'), 'utf8'))
const dmgs = names
  .filter((name) => name.includes(`-${packageMetadata.version}-`) && name.endsWith('-unsigned.dmg'))
  .sort()

if (!dmgs.some((name) => name.includes('macOS-arm64')) || !dmgs.some((name) => name.includes('macOS-x64'))) {
  throw new Error('Both arm64 and x64 unsigned community DMGs are required.')
}

function run(command, args, label, timeout = 120000) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (result.status !== 0) throw new Error(`${label} failed: ${(output || 'unknown error').trim()}`)
  return output
}

const codesignScanTimeout = 15 * 60 * 1000
const installCopyTimeout = 20 * 60 * 1000
const startupTimeout = 5 * 60 * 1000
const windowsReservedName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu

async function verifyPathCompatibility(root) {
  const findings = []
  let entryCount = 0
  let longestComponent = { bytes: 0, relativePath: '' }
  let longestPath = { bytes: 0, relativePath: '' }

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const normalizedNames = new Map()
    for (const entry of entries) {
      entryCount += 1
      const fullPath = path.join(directory, entry.name)
      const relativePath = path.relative(root, fullPath)
      const componentBytes = Buffer.byteLength(entry.name, 'utf8')
      const pathBytes = Buffer.byteLength(relativePath, 'utf8')
      if (componentBytes > longestComponent.bytes) longestComponent = { bytes: componentBytes, relativePath }
      if (pathBytes > longestPath.bytes) longestPath = { bytes: pathBytes, relativePath }

      const reasons = []
      if (componentBytes > 255) reasons.push('UTF-8 filename component exceeds 255 bytes')
      if ([...entry.name].some((character) => character.codePointAt(0) <= 31 || character.codePointAt(0) === 127)) {
        reasons.push('filename contains a control character')
      }
      if (/[<>:"\\|?*]/u.test(entry.name)) reasons.push('filename is not Windows-compatible')
      if (/[. ]$/u.test(entry.name)) reasons.push('filename ends with a dot or space')
      if (windowsReservedName.test(entry.name)) reasons.push('filename is reserved on Windows')
      if (pathBytes > 240) reasons.push('relative installed path exceeds the 240-byte release safety cap')
      if (reasons.length) findings.push({ relativePath, reasons })

      const normalizedName = entry.name.normalize('NFC').toLocaleLowerCase('en-US')
      const collision = normalizedNames.get(normalizedName)
      if (collision && collision !== entry.name) {
        findings.push({ relativePath, reasons: [`normalization/case collision with ${collision}`] })
      } else {
        normalizedNames.set(normalizedName, entry.name)
      }

      if (entry.isDirectory() && !entry.isSymbolicLink()) await walk(fullPath)
    }
  }

  await walk(root)
  if (findings.length) {
    throw new Error(`Installer path compatibility failed:\n${JSON.stringify(findings.slice(0, 20), null, 2)}`)
  }
  return { entryCount, longestComponent, longestPath }
}

async function verifyIcon(appPath, temporaryRoot, name) {
  const resourcesRoot = path.join(appPath, 'Contents', 'Resources')
  const iconName = run('/usr/bin/plutil', ['-extract', 'CFBundleIconFile', 'raw', path.join(appPath, 'Contents', 'Info.plist')], `${name} icon declaration`).trim()
  if (iconName !== 'icon.icns') throw new Error(`${name} declares unexpected application icon ${iconName || '(empty)'}.`)
  const iconPath = path.join(resourcesRoot, iconName)
  const iconInfo = await stat(iconPath)
  if (!iconInfo.isFile() || iconInfo.size < 1024) throw new Error(`${name} application icon is missing or empty.`)

  const iconsetPath = path.join(temporaryRoot, 'verified-icon.iconset')
  run('/usr/bin/iconutil', ['-c', 'iconset', '-o', iconsetPath, iconPath], `${name} iconset extraction`)
  const iconEntries = await readdir(iconsetPath)
  if (!iconEntries.includes('icon_16x16.png') || !iconEntries.includes('icon_512x512@2x.png')) {
    throw new Error(`${name} application icon does not contain the required 16px through 1024px representations.`)
  }
  const largestIcon = path.join(iconsetPath, 'icon_512x512@2x.png')
  const dimensions = run('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', largestIcon], `${name} largest icon dimensions`)
  if (!dimensions.includes('pixelWidth: 1024') || !dimensions.includes('pixelHeight: 1024')) {
    throw new Error(`${name} application icon has an invalid largest representation: ${dimensions.trim()}`)
  }
}

async function verifyStartup(appPath, expectedArch, name, temporaryRoot) {
  const profilePath = await mkdtemp(path.join(temporaryRoot, 'startup-profile-'))
  const executablePath = path.join(appPath, 'Contents', 'MacOS', '案卷观察台')
  const markerPath = path.join(profilePath, 'startup-ready.json')
  let launchCommand = executablePath
  let launchArgs = [`--user-data-dir=${profilePath}`]
  if (expectedArch !== process.arch) {
    if (process.arch !== 'arm64' || expectedArch !== 'x64') {
      return { started: false, reason: `${expectedArch} applications cannot run on a ${process.arch} verifier host` }
    }
    try {
      run('/usr/bin/arch', ['-x86_64', '/usr/bin/true'], 'Rosetta availability', 10000)
    } catch (error) {
      return { started: false, reason: error.message }
    }
    launchCommand = '/usr/bin/arch'
    launchArgs = ['-x86_64', executablePath, ...launchArgs]
  }
  const child = spawn(launchCommand, launchArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const output = []
  let spawnError = null
  child.stdout.on('data', (chunk) => output.push(chunk.toString()))
  child.stderr.on('data', (chunk) => output.push(chunk.toString()))
  child.on('error', (error) => { spawnError = error })
  let marker = null
  const deadline = Date.now() + startupTimeout
  try {
    while (Date.now() < deadline) {
      marker = await readFile(markerPath, 'utf8').then(JSON.parse).catch(() => null)
      if (marker) break
      if (spawnError) throw new Error(`${name} could not start: ${spawnError.message}`)
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`${name} exited before startup completed with code ${child.exitCode ?? child.signalCode}: ${output.join('').trim()}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    if (!marker) throw new Error(`${name} did not complete installed startup within ${startupTimeout / 1000} seconds: ${output.join('').trim()}`)
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM')
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 5000)
        timer.unref()
        child.once('exit', () => {
          clearTimeout(timer)
          resolve()
        })
      })
      if (child.exitCode === null && child.signalCode === null) {
        await new Promise((resolve) => {
          child.once('exit', resolve)
          child.kill('SIGKILL')
        })
      }
    }
  }
  if (marker.version !== packageMetadata.version || marker.platform !== 'darwin' || marker.arch !== expectedArch) {
    throw new Error(`${name} wrote an invalid startup marker: ${JSON.stringify(marker)}`)
  }
  if (marker.transcriptCorpus?.searchableTranscripts !== 5098
    || marker.transcriptCorpus?.englishRecords !== 5098
    || marker.transcriptCorpus?.englishMissingRecords !== 0
    || marker.transcriptCorpus?.englishComplete !== true) {
    throw new Error(`${name} started with an incomplete transcript corpus: ${JSON.stringify(marker.transcriptCorpus)}`)
  }
  return { started: true, reason: '' }
}

let startupPassed = 0
let startupSkipped = 0
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
    const pathReport = await verifyPathCompatibility(appPath)
    const signature = run('/usr/bin/codesign', ['-dvvv', appPath], `${name} signature metadata`, codesignScanTimeout)
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

    const expectedArch = name.includes('macOS-arm64') ? 'arm64' : 'x64'
    const canvasBinding = path.join(
      resourceRoot,
      'app.asar.unpacked',
      'node_modules',
      '@napi-rs',
      `canvas-darwin-${expectedArch}`,
      `skia.darwin-${expectedArch}.node`,
    )
    const bindingInfo = run('/usr/bin/file', [canvasBinding], `${name} PDF canvas binding`)
    const expectedMachine = expectedArch === 'arm64' ? 'arm64' : 'x86_64'
    if (!bindingInfo.includes(expectedMachine)) {
      throw new Error(`${name} contains a PDF canvas binding for the wrong architecture: ${bindingInfo.trim()}`)
    }

    const installedRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-installed-'))
    const installedAppPath = path.join(installedRoot, appNames[0])
    try {
      run('/usr/bin/ditto', [appPath, installedAppPath], `${name} APFS installation copy`, installCopyTimeout)
      run('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=4', installedAppPath], `${name} installed application signature`, codesignScanTimeout)
      await verifyIcon(installedAppPath, installedRoot, name)
      const startup = await verifyStartup(installedAppPath, expectedArch, name, installedRoot)
      if (startup.started) startupPassed += 1
      else startupSkipped += 1
      const startupResult = startup.started ? 'passed' : `skipped: ${startup.reason}`
      console.log(`${name}: copied ${pathReport.entryCount} entries to APFS; longest filename ${pathReport.longestComponent.bytes} bytes; longest relative path ${pathReport.longestPath.bytes} bytes; startup ${startupResult}.`)
    } finally {
      await rm(installedRoot, { recursive: true, force: true })
    }
  } finally {
    if (attached) spawnSync('/usr/bin/hdiutil', ['detach', mountDirectory, '-force'], { encoding: 'utf8', timeout: 120000 })
    await rm(mountDirectory, { recursive: true, force: true })
  }
}

console.log(`Verified disk-image integrity, APFS installation copies, icons, paths, and signatures for ${dmgs.length} community DMGs; startup passed for ${startupPassed} and skipped for ${startupSkipped}.`)
