import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { x as extractTar } from 'tar'

const projectRoot = process.cwd()
const target = process.argv[2]
const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
const packageLock = JSON.parse(await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8'))
const canvasVersion = packageJson.dependencies?.['@napi-rs/canvas']

if (!canvasVersion || !/^\d+\.\d+\.\d+$/.test(canvasVersion)) {
  throw new Error('A fixed @napi-rs/canvas dependency version is required for cross-platform packaging.')
}

const bindings = {
  mac: [
    ['canvas-darwin-arm64', 'skia.darwin-arm64.node'],
    ['canvas-darwin-x64', 'skia.darwin-x64.node'],
  ],
  win: [
    ['canvas-win32-x64-msvc', 'skia.win32-x64-msvc.node'],
  ],
}

if (!bindings[target]) throw new Error('Usage: node scripts/prepare-native-packaging-deps.mjs <mac|win>')

for (const [packageName, binaryName] of bindings[target]) {
  await ensureBinding(packageName, binaryName)
}

console.log(`Prepared ${bindings[target].length} native canvas binding package(s) for ${target} packaging.`)

async function ensureBinding(packageName, binaryName) {
  const destination = path.join(projectRoot, 'node_modules', '@napi-rs', packageName)
  const binaryPath = path.join(destination, binaryName)
  try {
    await readFile(binaryPath)
    return
  } catch {
    // A clean install only contains the current host's optional native package.
  }

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-native-'))
  try {
    const lockEntry = packageLock.packages?.[`node_modules/@napi-rs/${packageName}`]
    if (lockEntry?.version !== canvasVersion || !validRegistryUrl(lockEntry.resolved) || !lockEntry.integrity?.startsWith('sha512-')) {
      throw new Error(`package-lock.json does not contain a fixed registry artifact for @napi-rs/${packageName}@${canvasVersion}.`)
    }
    const response = await fetch(lockEntry.resolved, { redirect: 'error', signal: AbortSignal.timeout(300000) })
    if (!response.ok) throw new Error(`Unable to fetch @napi-rs/${packageName}@${canvasVersion}: HTTP ${response.status}`)
    const archive = Buffer.from(await response.arrayBuffer())
    const expectedIntegrity = lockEntry.integrity.slice('sha512-'.length)
    const actualIntegrity = createHash('sha512').update(archive).digest('base64')
    if (actualIntegrity !== expectedIntegrity) throw new Error(`Registry integrity mismatch for @napi-rs/${packageName}@${canvasVersion}.`)
    const archivePath = path.join(temporaryRoot, `${packageName}-${canvasVersion}.tgz`)
    await writeFile(archivePath, archive, { mode: 0o600 })

    const extractionRoot = path.join(temporaryRoot, 'extract')
    await mkdir(extractionRoot, { recursive: true })
    await extractTar({ file: archivePath, cwd: extractionRoot, strict: true })
    await rm(destination, { recursive: true, force: true })
    await mkdir(path.dirname(destination), { recursive: true })
    await cp(path.join(extractionRoot, 'package'), destination, { recursive: true })
    await readFile(binaryPath)
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

function validRegistryUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.hostname === 'registry.npmjs.org'
      && url.pathname.startsWith('/@napi-rs/')
  } catch {
    return false
  }
}
