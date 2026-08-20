import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceManifestPath = path.join(repoRoot, 'downloads', 'court-files-complete', 'manifest.json')
const sourceManifest = JSON.parse(await readFile(sourceManifestPath, 'utf8'))
const sample = [...(sourceManifest.files ?? [])]
  .filter((file) => file?.url && file?.sourceId === 'courtlistener-recap' && file?.filedAt)
  .sort((left, right) => String(right.filedAt).localeCompare(String(left.filedAt)) || String(right.docNumber ?? '').localeCompare(String(left.docNumber ?? '')))[0]

if (!sample) throw new Error('No dated CourtListener/RECAP sample is available in the baseline manifest.')

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-automation-'))
const downloadRoot = path.join(temporaryRoot, 'downloads')
const cacheRoot = path.join(temporaryRoot, 'cache')
const startupOnly = process.argv.includes('--startup-only')
const sourceRecord = {
  ...sample,
  root: undefined,
  storage: 'writable',
  status: 'downloaded',
  path: path.join(downloadRoot, sample.subdir, sample.filename),
}

process.env.GUO_INTEL_DOWNLOAD_DIR = downloadRoot
process.env.GUO_INTEL_CACHE_DIR = cacheRoot
process.env.GUO_INTEL_AUTO_AI_DOCUMENTS = '0'
await mkdir(downloadRoot, { recursive: true })
await mkdir(cacheRoot, { recursive: true })
await writeFile(path.join(cacheRoot, 'app-settings.json'), JSON.stringify({
  aiProvider: 'local',
  translationProvider: 'local',
  localAiProvider: 'none',
  autoRefresh: true,
  autoProcessDocuments: true,
  automaticProcessingScope: 'priority',
  automaticProcessingLimit: 1,
  automationLanguage: 'both',
  includeTranslation: true,
  includeAi: true,
}, null, 2))

const { runDocumentDownload } = await import('../server/download-documents.js')
const { startAutomationRun, getAutomationRun } = await import('../server/automation-runner.js')
const { refreshDocumentSearchIndex } = await import('../server/document-search.js')
const { createSeedState } = await import('../server/seed.js')

function cleanRecord(file) {
  const { root: _root, ...record } = file
  return record
}

async function writeManifest(files, deferredDiscoveries = []) {
  await mkdir(downloadRoot, { recursive: true })
  await writeFile(path.join(downloadRoot, 'manifest.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    root: downloadRoot,
    sourcePages: [],
    credentialRequired: [],
    sourceRecords: [],
    counts: { collected: files.length, processed: files.length, errors: 0 },
    deferredDiscoveries,
    files: files.map(cleanRecord),
  }, null, 2))
}

async function hashFile(filePath) {
  const digest = createHash('sha256')
  digest.update(await readFile(filePath))
  return digest.digest('hex')
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

async function inspectRestored(manifest, expectedUrl) {
  const restored = (manifest.files ?? []).find((file) => file.url === expectedUrl)
  if (!restored?.path) throw new Error('The updater did not restore the sample manifest entry.')
  const info = await stat(restored.path)
  const bytes = await readFile(restored.path)
  const sha256 = await hashFile(restored.path)
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('The restored payload is not a PDF.')
  if (sha256 !== sample.sha256) throw new Error(`Restored SHA-256 differs from the baseline: ${sha256}`)
  if (info.size !== Number(sample.bytes)) throw new Error(`Restored byte count differs from the baseline: ${info.size}`)
  if (!['downloaded', 'skipped_existing'].includes(restored.status)) throw new Error(`Unexpected restored status: ${restored.status}`)
  return { restored, bytes: info.size, sha256 }
}

async function inspectDiscovered(manifest) {
  const restored = (manifest.files ?? []).find((file) => file.status !== 'error' && file.path && file.sha256)
  if (!restored) throw new Error('The updater did not discover and download a public PDF from an empty manifest.')
  const info = await stat(restored.path)
  const bytes = await readFile(restored.path)
  const sha256 = await hashFile(restored.path)
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('The discovered payload is not a PDF.')
  if (sha256 !== restored.sha256) throw new Error('The discovered PDF does not match its newly written manifest SHA-256.')
  if (info.size !== Number(restored.bytes)) throw new Error('The discovered PDF does not match its newly written manifest byte count.')
  return { restored, bytes: info.size, sha256 }
}

console.log(JSON.stringify({ sample: {
  filedAt: sample.filedAt,
  caseId: sample.caseId,
  docketNumber: sample.docketNumber,
  docNumber: sample.docNumber,
  url: sample.url,
  sha256: sample.sha256,
  bytes: sample.bytes,
} }, null, 2))

try {
  if (!startupOnly) {
    // Scenario 1: the PDF disappears but its manifest row survives.
    await writeManifest([sourceRecord])
    const recoveredMissingFile = await runDocumentDownload({
      newDownloadLimit: 0,
      portfolioPageLimit: 1,
      log: (message) => console.log(`[missing-file] ${message}`),
    })
    const missingFileResult = await inspectRestored(recoveredMissingFile, sample.url)
    console.log(JSON.stringify({ scenario: 'missing-file', ok: true, ...missingFileResult }, null, 2))

    // Scenario 2: both the PDF and its manifest row disappear. The live public
    // CourtListener search must discover a public PDF again.
    await rm(downloadRoot, { recursive: true, force: true })
    await writeManifest([])
    const rediscovered = await runDocumentDownload({
      newDownloadLimit: 1,
      portfolioPageLimit: 1,
      log: (message) => console.log(`[new-discovery] ${message}`),
    })
    const rediscoveredResult = await inspectDiscovered(rediscovered)
    console.log(JSON.stringify({ scenario: 'new-discovery', ok: true, ...rediscoveredResult }, null, 2))

    // Scenario 3: run the actual document pipeline with no credential and no
    // local model configured. This must produce explicit local fallback states.
    const state = createSeedState()
    const callbacks = {
      refreshSources: async () => ({ lastRefresh: { sourceCount: 1, fetchedEvents: 0 } }),
      getState: () => state,
      loadRawDocumentManifest: async () => JSON.parse(await readFile(path.join(downloadRoot, 'manifest.json'), 'utf8')),
      refreshCompletenessAudit: async () => ({ ok: true }),
      refreshDocumentSearchIndex,
    }
    const started = await startAutomationRun(callbacks, {
      mode: 'deep',
      limit: 1,
      outputLanguages: 'both',
      includeTranslation: true,
      includeAi: true,
      lang: 'en',
    })
    let completed = started
    while (completed.status === 'running') {
      await new Promise((resolve) => setTimeout(resolve, 500))
      completed = await getAutomationRun('en')
    }
    if (completed.status !== 'complete') throw new Error(`Automation pipeline ended with ${completed.status}.`)
    if (!completed.outputs.extracted) throw new Error('Automation did not extract the restored PDF.')
    if (!completed.outputs.translated && !completed.outputs.assistiveTranslated && !completed.outputs.sourceAlreadyTargetLanguage) {
      throw new Error('Automation did not write an explicit translation result.')
    }
    if (!completed.outputs.localRuleAnalyzed && !completed.outputs.aiAnalyzed) throw new Error('Automation did not write an analysis result.')
    if (!completed.outputs.searchIndexed) throw new Error('Automation did not refresh the full-text index.')
    const cacheDirectories = await readdir(cacheRoot, { withFileTypes: true })
    console.log(JSON.stringify({
      scenario: 'no-key-pipeline',
      ok: true,
      status: completed.status,
      outputs: completed.outputs,
      steps: completed.steps.map((step) => ({ id: step.id, status: step.status, done: step.done, total: step.total })),
      cacheDirectories: cacheDirectories.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
    }, null, 2))

    const repeatedStart = await startAutomationRun(callbacks, {
      mode: 'deep',
      limit: 1,
      outputLanguages: 'both',
      includeTranslation: true,
      includeAi: true,
      lang: 'en',
    })
    let repeated = repeatedStart
    while (repeated.status === 'running') {
      await new Promise((resolve) => setTimeout(resolve, 250))
      repeated = await getAutomationRun('en')
    }
    const newlyDownloaded = repeated.outputs.downloaded
    const bodyProcessed = Math.max(
      repeated.outputs.extracted,
      repeated.outputs.translated
        + repeated.outputs.assistiveTranslated
        + repeated.outputs.sourceAlreadyTargetLanguage
        + repeated.outputs.partiallyTranslated
        + repeated.outputs.redactedTranslated,
      repeated.outputs.aiAnalyzed + repeated.outputs.localRuleAnalyzed,
    )
    if (bodyProcessed > newlyDownloaded) {
      throw new Error(`Priority automation processed ${bodyProcessed} bodies after downloading only ${newlyDownloaded} new file(s).`)
    }
    console.log(JSON.stringify({
      scenario: 'incremental-only-no-historical-reprocessing',
      ok: true,
      status: repeated.status,
      outputs: repeated.outputs,
    }, null, 2))
  } else {
    await writeManifest([sourceRecord])
  }

  // Scenario 4: import the real API server with automatic refresh enabled and
  // verify the 2.5-second startup scheduler launches the same pipeline without
  // a UI click.
  await rm(path.join(cacheRoot, 'automation-run.json'), { force: true })
  const olderHighNumberRecord = {
    ...sourceRecord,
    title: 'Ordering regression fixture: older filing with a higher document number',
    docNumber: '9999',
    filedAt: '2024-01-01',
    url: `${sourceRecord.url}?ordering-regression=1`,
  }
  await writeManifest([sourceRecord, olderHighNumberRecord])
  process.env.GUO_INTEL_API_PORT = '0'
  const { apiServerReady } = await import('../server/index.js')
  const server = await apiServerReady
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('The isolated API server did not expose a TCP port.')
    const documentsResponse = await fetch(`http://127.0.0.1:${address.port}/api/documents?lang=en`, {
      headers: { 'X-Docket-Observatory-Request': '1' },
    })
    if (!documentsResponse.ok) throw new Error(`The isolated document API returned HTTP ${documentsResponse.status}.`)
    const documentsPayload = await documentsResponse.json()
    const [firstDocument, secondDocument] = documentsPayload.sampleFiles ?? []
    if (firstDocument?.filedAt !== sample.filedAt || secondDocument?.filedAt !== olderHighNumberRecord.filedAt) {
      throw new Error('Recent files are not ordered by the court filing date.')
    }
    console.log(JSON.stringify({
      scenario: 'court-date-ordering',
      ok: true,
      sampleFiles: [firstDocument, secondDocument].map((file) => ({ filedAt: file?.filedAt, docNumber: file?.docNumber })),
    }, null, 2))
    await writeManifest([sourceRecord])

    const deadline = Date.now() + 8 * 60 * 1000
    let automaticRun = await getAutomationRun('en')
    while ((automaticRun.id === 'idle' || automaticRun.status === 'running') && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 750))
      automaticRun = await getAutomationRun('en')
    }
    if (automaticRun.id === 'idle') throw new Error('The startup scheduler did not launch automatic work.')
    if (automaticRun.status !== 'complete') throw new Error(`The startup scheduler ended with ${automaticRun.status}.`)
    if (automaticRun.outputs.blocked.some((message) => message.includes('Prior run detail was recorded'))) {
      throw new Error('The English automation result still contains an untranslated fallback message.')
    }
    const cooldown = await readJson(path.join(cacheRoot, 'courtlistener-public-search-cooldown.json'))
    const stateSnapshot = await readJson(path.join(cacheRoot, 'state.json'))
    const courtListenerStatus = stateSnapshot?.sourceStatuses?.find((status) => status.sourceId === 'courtlistener-recap') ?? null
    if (cooldown?.retryAt && courtListenerStatus?.retryable && courtListenerStatus.retryAt !== cooldown.retryAt) {
      throw new Error('The CourtListener retry deadline was not propagated to the automatic scheduler state.')
    }
    console.log(JSON.stringify({
      scenario: 'startup-scheduler',
      ok: true,
      status: automaticRun.status,
      startedAt: automaticRun.startedAt,
      completedAt: automaticRun.completedAt,
      outputs: automaticRun.outputs,
      courtListenerCooldown: cooldown,
      courtListenerStatus,
    }, null, 2))
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}
