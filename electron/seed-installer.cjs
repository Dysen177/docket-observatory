const { createHash } = require('node:crypto')
const { createReadStream } = require('node:fs')
const { chmod, cp, mkdir, readFile, stat, writeFile } = require('node:fs/promises')
const path = require('node:path')

async function installBundledSeedCache({ resourcesRoot, targetRoot }) {
  const sourceRoot = path.join(resourcesRoot, 'seed-cache')
  const sourceManifestPath = path.join(sourceRoot, 'release-seed.json')
  const integrityManifestPath = path.join(resourcesRoot, 'seed-cache-manifest.json')
  const installedManifestPath = path.join(targetRoot, '.release-seed-installed.json')
  const sourceManifest = JSON.parse(await readFile(sourceManifestPath, 'utf8'))
  const integrityManifest = JSON.parse(await readFile(integrityManifestPath, 'utf8'))
  const installedManifest = await readFile(installedManifestPath, 'utf8')
    .then((value) => JSON.parse(value))
    .catch(() => null)
  if (installedManifest?.releaseId === sourceManifest.releaseId) return { status: 'current', releaseId: sourceManifest.releaseId }

  if (integrityManifest.releaseId !== sourceManifest.releaseId) {
    throw new Error('Bundled research summary and integrity manifest do not identify the same release.')
  }
  await verifySeedCache(sourceRoot, integrityManifest)
  const previousState = installedManifest
    ? await readJson(path.join(targetRoot, 'state.json'))
    : null

  await mkdir(targetRoot, { recursive: true, mode: 0o700 })
  await cp(sourceRoot, targetRoot, {
    recursive: true,
    force: true,
    errorOnExist: false,
    filter: (source) => path.basename(source) !== 'release-seed.json',
  })
  await verifySeedCache(targetRoot, integrityManifest)
  if (previousState) {
    const bundledStatePath = path.join(targetRoot, 'state.json')
    const bundledState = await readJson(bundledStatePath)
    if (bundledState) await writeFile(bundledStatePath, `${JSON.stringify(mergeState(bundledState, previousState), null, 2)}\n`, { mode: 0o600 })
  }
  await writeFile(installedManifestPath, JSON.stringify(sourceManifest, null, 2), { mode: 0o600 })
  await chmod(installedManifestPath, 0o600).catch(() => undefined)
  return { status: installedManifest ? 'upgraded' : 'installed', releaseId: sourceManifest.releaseId }
}

async function readJson(filePath) {
  return readFile(filePath, 'utf8')
    .then((value) => JSON.parse(value))
    .catch(() => null)
}

function mergeState(bundledState, previousState) {
  const events = new Map((previousState.events ?? []).map((event) => [event.id, event]))
  for (const event of bundledState.events ?? []) events.set(event.id, event)
  const sourceStatuses = new Map((previousState.sourceStatuses ?? []).map((status) => [status.sourceId ?? status.id, status]))
  for (const status of bundledState.sourceStatuses ?? []) sourceStatuses.set(status.sourceId ?? status.id, status)
  const previousRefresh = Date.parse(previousState.lastRefresh ?? '') || 0
  const bundledRefresh = Date.parse(bundledState.lastRefresh ?? '') || 0
  return {
    ...previousState,
    ...bundledState,
    events: [...events.values()],
    sourceStatuses: [...sourceStatuses.values()],
    lastRefresh: previousRefresh > bundledRefresh ? previousState.lastRefresh : bundledState.lastRefresh,
  }
}

async function verifySeedCache(rootDirectory, manifest) {
  const root = path.resolve(rootDirectory)
  for (const file of manifest.files ?? []) {
    const relativePath = String(file.path ?? '')
    const filePath = path.resolve(root, ...relativePath.split('/'))
    if (!relativePath || (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root)) {
      throw new Error(`Bundled research manifest contains an unsafe path: ${relativePath || '(empty)'}`)
    }
    const info = await stat(filePath)
    if (!info.isFile() || info.size !== Number(file.bytes)) {
      throw new Error(`Bundled research file has an unexpected size: ${relativePath}`)
    }
    if (await sha256File(filePath) !== file.sha256) {
      throw new Error(`Bundled research file failed SHA-256 verification: ${relativePath}`)
    }
  }
}

async function sha256File(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}

module.exports = { installBundledSeedCache, mergeState, verifySeedCache }
