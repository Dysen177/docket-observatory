import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createSeedState } from '../server/seed.js'
import { allCaseRecords } from '../server/discovered-case-records.js'
import { humanCaseResearch } from '../server/human-legal-research.js'

const projectRoot = process.cwd()
const sourceCorpusRoot = path.join(projectRoot, 'downloads', 'court-files-complete')
const sourceCacheRoot = path.join(projectRoot, 'server', 'cache')
const releaseDataRoot = path.join(projectRoot, 'release-data')
const seedCacheRoot = path.join(releaseDataRoot, 'seed-cache')
const metadataRoot = path.join(projectRoot, 'release-metadata')
const corpusManifestPath = path.join(metadataRoot, 'corpus-manifest.json')
const seedManifestPath = path.join(metadataRoot, 'seed-cache-manifest.json')
const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))

const cacheFiles = [
  'document-search-index.json',
  'state.json',
  'completeness-audit.json',
  'completeness-observations.json',
  'relationship-audit.json',
]

await rm(releaseDataRoot, { recursive: true, force: true })
await mkdir(seedCacheRoot, { recursive: true, mode: 0o700 })
await mkdir(metadataRoot, { recursive: true })

const sourceManifest = JSON.parse(await readFile(path.join(sourceCorpusRoot, 'manifest.json'), 'utf8'))
const sanitizedCorpusManifest = sanitizeCorpusManifest(sourceManifest)
await writeJson(corpusManifestPath, sanitizedCorpusManifest)

const searchIndex = JSON.parse(await readFile(path.join(sourceCacheRoot, 'document-search-index.json'), 'utf8'))
const activeCacheFiles = activeSearchCacheFiles(searchIndex)
for (const relativePath of activeCacheFiles) {
  await copyCacheFile(path.join(sourceCacheRoot, relativePath), path.join(seedCacheRoot, relativePath))
}
for (const relativePath of await latestCaseCacheFiles()) {
  await copyCacheFile(path.join(sourceCacheRoot, relativePath), path.join(seedCacheRoot, relativePath))
}
for (const filename of cacheFiles) {
  await copyCacheFile(path.join(sourceCacheRoot, filename), path.join(seedCacheRoot, filename))
}

const seedFiles = await inventory(seedCacheRoot)
assertCompleteResearchBaseline(searchIndex, seedFiles, sanitizedCorpusManifest, allCaseRecords(createSeedState(), sanitizedCorpusManifest))
const aggregateSha256 = createHash('sha256')
for (const file of seedFiles) aggregateSha256.update(`${file.path}\0${file.bytes}\0${file.sha256}\n`)

const seedSummary = {
  schemaVersion: 1,
  releaseId: `${packageJson.version}-${sourceManifest.integrityHistory?.chainHead?.slice(0, 16) ?? 'no-chain'}-${aggregateSha256.digest('hex').slice(0, 16)}`,
  appVersion: packageJson.version,
  generatedAt: new Date().toISOString(),
  corpusGeneratedAt: sourceManifest.generatedAt ?? null,
  corpusFiles: sourceManifest.files?.length ?? 0,
  corpusValidPdfs: (sourceManifest.files ?? []).filter((file) => file.status !== 'error').length,
  corpusIntegrityChainHead: sourceManifest.integrityHistory?.chainHead ?? null,
  seedFiles: seedFiles.length,
  seedBytes: seedFiles.reduce((total, file) => total + file.bytes, 0),
  seedAggregateSha256: createAggregateHash(seedFiles),
}
await writeJson(path.join(seedCacheRoot, 'release-seed.json'), seedSummary)
await writeJson(seedManifestPath, { ...seedSummary, files: seedFiles })

console.log(JSON.stringify(seedSummary, null, 2))

function sanitizeCorpusManifest(manifest) {
  return {
    ...manifest,
    root: 'bundled://court-files',
    files: (manifest.files ?? []).map((file) => ({
      ...file,
      storage: 'bundled',
      path: '',
    })),
  }
}

function activeSearchCacheFiles(index) {
  const files = new Set()
  for (const document of index.documents ?? []) {
    for (const entry of [document.original, ...(document.translations ?? []), ...(document.analyses ?? [])]) {
      if (typeof entry?.cacheFile === 'string') files.add(entry.cacheFile)
      if (typeof entry?.searchTextFile === 'string') files.add(entry.searchTextFile)
    }
  }
  return [...files].sort()
}

function assertCompleteResearchBaseline(index, seedFiles, corpusManifest, caseRecords) {
  const packagedPaths = new Set(seedFiles.map((file) => file.path))
  const validCorpusHashes = new Set((corpusManifest.files ?? [])
    .filter((file) => file.status !== 'error' && file.sha256)
    .map((file) => file.sha256))
  const indexedHashes = new Set()
  const missingReferences = []
  const incompleteReads = []

  for (const document of index.documents ?? []) {
    if (document.contentSha256) indexedHashes.add(document.contentSha256)
    const references = [document.original, ...(document.translations ?? []), ...(document.analyses ?? [])]
      .flatMap((entry) => [entry?.cacheFile, entry?.searchTextFile])
      .filter(Boolean)
    for (const reference of references) {
      if (!packagedPaths.has(reference)) missingReferences.push(reference)
    }
    const analysisLanguages = new Set((document.analyses ?? []).map((entry) => entry.language).filter(Boolean))
    if (!document.original || !analysisLanguages.has('zh') || !analysisLanguages.has('en')) {
      incompleteReads.push(document.contentSha256 ?? document.canonicalSourceUrl ?? 'unknown-document')
    }
  }

  const unindexedHashes = [...validCorpusHashes].filter((sha256) => !indexedHashes.has(sha256))
  if (unindexedHashes.length) {
    throw new Error(`Release baseline omits ${unindexedHashes.length} unique valid PDF content hash(es) from the active search index.`)
  }
  if (missingReferences.length) {
    throw new Error(`Release baseline omits ${missingReferences.length} active cache reference(s), including ${missingReferences[0]}.`)
  }
  if (incompleteReads.length) {
    throw new Error(`Release baseline lacks bilingual document reads for ${incompleteReads.length} indexed PDF(s).`)
  }

  const caseDossierPaths = new Set(seedFiles
    .filter((file) => file.path.startsWith('case-ai/') && file.path.endsWith('.json'))
    .map((file) => file.path))
  for (const caseRecord of caseRecords ?? []) {
    for (const language of ['zh', 'en']) {
      const prefix = `case-ai/${caseRecord.id}-${language}-`
      const hasCaseAiCache = [...caseDossierPaths].some((filePath) => filePath.startsWith(prefix))
      const hasHumanBaseline = Boolean(humanCaseResearch(caseRecord.id, corpusManifest, language))
      if (!hasCaseAiCache && !hasHumanBaseline) {
        throw new Error(`Release baseline lacks the ${language} case dossier for ${caseRecord.id}.`)
      }
    }
  }
}

async function latestCaseCacheFiles() {
  const directory = path.join(sourceCacheRoot, 'case-ai')
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOENT') return []
    throw error
  })
  const latest = new Map()
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const sourcePath = path.join(directory, entry.name)
    const payload = JSON.parse(await readFile(sourcePath, 'utf8'))
    const languageMatch = entry.name.match(/^(.*-(?:en|zh))-[a-f0-9]{40}\.json$/)
    const key = `${languageMatch?.[1] ?? entry.name}:${payload.provider ?? 'unknown'}`
    const timestamp = Date.parse(payload.generatedAt ?? '') || (await stat(sourcePath)).mtimeMs
    const previous = latest.get(key)
    if (!previous || timestamp > previous.timestamp) latest.set(key, { timestamp, path: `case-ai/${entry.name}` })
  }
  return [...latest.values()].map((entry) => entry.path).sort()
}

async function copyCacheFile(source, target) {
  const extension = path.extname(source).toLowerCase()
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
  if (extension !== '.json' && extension !== '.jsonl') {
    await cp(source, target, { force: true })
    return
  }
  const text = await readFile(source, 'utf8')
  if (extension === '.jsonl') {
    const lines = text.split('\n').filter(Boolean).map((line) => JSON.stringify(sanitizeValue(JSON.parse(line))))
    await writeFile(target, `${lines.join('\n')}\n`, { mode: 0o600 })
    return
  }
  await writeJson(target, sanitizeValue(JSON.parse(text)))
}

function sanitizeValue(value, key = '') {
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeValue(childValue, childKey)]))
  }
  if (typeof value !== 'string') return value
  if (['path', 'localPath', 'cacheDirectory', 'dataDirectory'].includes(key)) return ''
  return value
    .replaceAll(projectRoot, '$APP_BUNDLE')
    .replace(/\/Users\/[^/]+\/Desktop\/[^\s"']+/g, '$LOCAL_PATH')
}

async function inventory(root) {
  const files = []
  await walk(root, async (filePath) => {
    const data = await readFile(filePath)
    files.push({
      path: path.relative(root, filePath).split(path.sep).join('/'),
      bytes: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
    })
  })
  return files.sort((left, right) => left.path.localeCompare(right.path))
}

async function walk(directory, visit) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) await walk(target, visit)
    else if (entry.isFile()) await visit(target)
  }
}

function createAggregateHash(files) {
  const hash = createHash('sha256')
  for (const file of files) hash.update(`${file.path}\0${file.bytes}\0${file.sha256}\n`)
  return hash.digest('hex')
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
}
