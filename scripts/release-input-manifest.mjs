import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const mode = process.argv[2]
const manifestPath = path.join(root, 'release-metadata', 'release-input-manifest.json')
const evidencePaths = [
  'package-lock.json',
  'output/release-review/corpus-risk-audit.json',
  'release-metadata/corpus-review-decisions.json',
  'release-metadata/corpus-manifest.json',
  'release-metadata/seed-cache-manifest.json',
]

async function digest(relativePath) {
  const filePath = path.join(root, relativePath)
  const info = await stat(filePath)
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return { bytes: info.size, sha256: hash.digest('hex') }
}

if (mode === 'create') {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const evidence = {}
  for (const relativePath of evidencePaths) evidence[relativePath] = await digest(relativePath)
  await mkdir(path.dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify({
    schemaVersion: 1,
    appVersion: packageJson.version,
    generatedAt: new Date().toISOString(),
    evidence,
  }, null, 2)}\n`, { mode: 0o600 })
  console.log(`Created reviewed release-input manifest with ${evidencePaths.length} bound evidence files.`)
} else if (mode === 'verify') {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => {
    throw new Error('Missing release-metadata/release-input-manifest.json. Stage the reviewed complete-data payload before building.')
  }))
  if (manifest.schemaVersion !== 1) throw new Error(`Unsupported release-input manifest schema: ${manifest.schemaVersion}`)
  for (const relativePath of evidencePaths) {
    const expected = manifest.evidence?.[relativePath]
    if (!expected) throw new Error(`Release-input manifest lacks evidence: ${relativePath}`)
    const actual = await digest(relativePath)
    if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
      throw new Error(`Release-input evidence mismatch: ${relativePath}`)
    }
  }
  console.log(`Verified reviewed release-input manifest for ${manifest.appVersion ?? 'unknown version'}.`)
} else {
  throw new Error('Expected release-input manifest mode "create" or "verify".')
}
