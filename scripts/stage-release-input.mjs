import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const mode = process.argv[2]
const privateDirectories = ['downloads', 'release-data', 'output', 'release']

async function exists(target) {
  return stat(target).then(() => true, () => false)
}

if (mode === 'cleanup') {
  for (const relativePath of privateDirectories) await rm(path.join(root, relativePath), { recursive: true, force: true })
  console.log('Removed staged release data and generated installers from the runner workspace.')
  process.exit(0)
}

if (mode !== 'stage') throw new Error('Expected stage-release-input mode "stage" or "cleanup".')

const configuredSource = process.env.DOCKET_OBSERVATORY_RELEASE_SOURCE_ROOT?.trim()
const sourceRoot = configuredSource ? path.resolve(configuredSource) : root
const required = [
  'downloads/court-files-complete',
  'release-data/seed-cache',
  'output/release-review/corpus-risk-audit.json',
  'release-metadata/corpus-review-decisions.json',
  'release-metadata/corpus-manifest.json',
  'release-metadata/seed-cache-manifest.json',
  'release-metadata/release-input-manifest.json',
]

for (const relativePath of required) {
  if (!await exists(path.join(sourceRoot, relativePath))) throw new Error(`Reviewed release input is missing: ${relativePath}`)
}

if (sourceRoot !== root) {
  for (const relativePath of ['downloads/court-files-complete', 'release-data/seed-cache']) {
    const target = path.join(root, relativePath)
    await rm(target, { recursive: true, force: true })
    await mkdir(path.dirname(target), { recursive: true })
    await cp(path.join(sourceRoot, relativePath), target, { recursive: true, force: true })
  }
  for (const relativePath of required.slice(2)) {
    const target = path.join(root, relativePath)
    await mkdir(path.dirname(target), { recursive: true })
    await cp(path.join(sourceRoot, relativePath), target, { force: true })
  }
}

const releaseInput = JSON.parse(await readFile(path.join(root, 'release-metadata', 'release-input-manifest.json'), 'utf8'))
console.log(`Staged reviewed complete release input for version ${releaseInput.appVersion ?? 'unknown'}.`)
