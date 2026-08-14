import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { open, readFile, stat } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import path from 'node:path'
import { createSeedState } from '../server/seed.js'
import { allCaseRecords } from '../server/discovered-case-records.js'

const root = process.cwd()
const sourceCorpusRoot = path.join(root, 'downloads', 'court-files-complete')
const seedCacheRoot = path.join(root, 'release-data', 'seed-cache')
const corpusManifest = JSON.parse(await readFile(path.join(root, 'release-metadata', 'corpus-manifest.json'), 'utf8'))
const seedManifest = JSON.parse(await readFile(path.join(root, 'release-metadata', 'seed-cache-manifest.json'), 'utf8'))
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const searchIndex = JSON.parse(await readFile(path.join(seedCacheRoot, 'document-search-index.json'), 'utf8'))

if (corpusManifest.root !== 'bundled://court-files') throw new Error('Release corpus manifest exposes or uses an unexpected root.')
if ((corpusManifest.files ?? []).some((file) => file.path || file.storage !== 'bundled')) throw new Error('Release corpus paths are not sanitized for bundled use.')

const validFiles = (corpusManifest.files ?? []).filter((file) => file.status !== 'error')
let verifiedBytes = 0
for (const [index, file] of validFiles.entries()) {
  const filePath = path.join(sourceCorpusRoot, file.subdir, file.filename)
  const info = await stat(filePath)
  if (info.size !== Number(file.bytes)) throw new Error(`Corpus size mismatch: ${file.subdir}/${file.filename}`)
  await verifyPdf(filePath)
  const sha256 = await sha256File(filePath)
  if (sha256 !== file.sha256) throw new Error(`Corpus SHA-256 mismatch: ${file.subdir}/${file.filename}`)
  verifiedBytes += info.size
  if ((index + 1) % 200 === 0 || index + 1 === validFiles.length) console.log(`Verified corpus ${index + 1}/${validFiles.length}`)
}

for (const file of seedManifest.files ?? []) {
  const filePath = path.join(seedCacheRoot, file.path)
  const data = await readFile(filePath)
  if (data.length !== file.bytes || createHash('sha256').update(data).digest('hex') !== file.sha256) {
    throw new Error(`Seed-cache integrity mismatch: ${file.path}`)
  }
  const searchable = file.path.endsWith('.json')
    ? data.toString('utf8')
    : file.path.endsWith('.txt.gz')
      ? gunzipSync(data).toString('utf8')
      : ''
  if (/\/Users\/[^/]+\/Desktop\//.test(searchable) || searchable.includes(root)) {
    throw new Error(`Seed cache exposes a developer-local path: ${file.path}`)
  }
}

const seedPaths = new Set((seedManifest.files ?? []).map((file) => file.path))
const validCorpusHashes = new Set(validFiles.map((file) => file.sha256).filter(Boolean))
const indexedHashes = new Set()
for (const document of searchIndex.documents ?? []) {
  if (document.contentSha256) indexedHashes.add(document.contentSha256)
  const references = [document.original, ...(document.translations ?? []), ...(document.analyses ?? [])]
    .flatMap((entry) => [entry?.cacheFile, entry?.searchTextFile])
    .filter(Boolean)
  for (const reference of references) {
    if (!seedPaths.has(reference)) throw new Error(`Active search cache reference is absent from the release seed: ${reference}`)
  }
  const analysisLanguages = new Set((document.analyses ?? []).map((entry) => entry.language).filter(Boolean))
  if (!document.original || !analysisLanguages.has('zh') || !analysisLanguages.has('en')) {
    throw new Error(`Indexed PDF lacks its source extraction or bilingual document reads: ${document.contentSha256 ?? document.canonicalSourceUrl}`)
  }
}
for (const sha256 of validCorpusHashes) {
  if (!indexedHashes.has(sha256)) throw new Error(`Valid PDF content is absent from the bundled search baseline: ${sha256}`)
}

const expectedCaseLanguages = new Set(allCaseRecords(createSeedState(), corpusManifest)
  .flatMap((caseRecord) => [`${caseRecord.id}:zh`, `${caseRecord.id}:en`]))
const bundledCaseLanguages = new Set()
for (const file of seedManifest.files ?? []) {
  if (!file.path.startsWith('case-ai/') || !file.path.endsWith('.json')) continue
  const payload = JSON.parse(await readFile(path.join(seedCacheRoot, file.path), 'utf8'))
  const match = path.basename(file.path).match(/^(.*)-(en|zh)-[a-f0-9]{40}\.json$/)
  if (match) bundledCaseLanguages.add(`${match[1]}:${match[2]}`)
  if (!payload.analysis || !payload.text) throw new Error(`Bundled case dossier is incomplete: ${file.path}`)
}
for (const expected of expectedCaseLanguages) {
  if (!bundledCaseLanguages.has(expected)) throw new Error(`Bundled release lacks a current case dossier: ${expected}`)
}

for (const forbidden of ['app-settings.json', 'integration-diagnostics.json', 'automation-run.json', 'dev-api.log']) {
  if ((seedManifest.files ?? []).some((file) => file.path === forbidden)) throw new Error(`Private runtime file entered release seed: ${forbidden}`)
}

const targets = new Set((packageJson.build?.extraResources ?? []).map((entry) => entry.to))
for (const required of ['court-files', 'court-files/manifest.json', 'seed-cache', 'seed-cache-manifest.json']) {
  if (!targets.has(required)) throw new Error(`Packaged release resource is missing: ${required}`)
}

console.log(JSON.stringify({
  appVersion: packageJson.version,
  corpusRecords: corpusManifest.files.length,
  validPdfs: validFiles.length,
  corpusBytes: verifiedBytes,
  seedFiles: seedManifest.files.length,
  seedBytes: seedManifest.seedBytes,
  seedAggregateSha256: seedManifest.seedAggregateSha256,
  indexedUniquePdfs: indexedHashes.size,
  bilingualDocumentReads: (searchIndex.documents ?? []).length,
  bilingualCaseDossiers: expectedCaseLanguages.size,
}, null, 2))

async function verifyPdf(filePath) {
  const handle = await open(filePath, 'r')
  try {
    const info = await handle.stat()
    const header = Buffer.alloc(5)
    await handle.read(header, 0, 5, 0)
    if (header.toString('ascii') !== '%PDF-') throw new Error(`Invalid PDF header: ${filePath}`)
    const tail = Buffer.alloc(Math.min(2048, info.size))
    await handle.read(tail, 0, tail.length, Math.max(0, info.size - tail.length))
    if (!tail.toString('latin1').includes('%%EOF')) throw new Error(`Incomplete PDF trailer: ${filePath}`)
  } finally {
    await handle.close()
  }
}

async function sha256File(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}
