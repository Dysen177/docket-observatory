import * as cheerio from 'cheerio'
import { appendFile, chmod, copyFile, mkdir, open, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'
import { atomicWriteJson } from './atomic-write.js'
import { scanPublicRecapFeeds, scanPublicRecapPortfolio, scanPublicRecapRelatedPortfolio, scanPublicRecapSearch, scanRecapArchive } from './recap-client.js'
import { safeFetch } from './safe-fetch.js'
import { readTextWithLimit } from './safe-fetch.js'
import { sourceRegistry } from './seed.js'
import { initializeSettingsStore, resolvedSecret, runtimeSetting } from './settings-store.js'
import networkPolicy from './network-policy.cjs'
import { compareDocketNumbers, normalizeDocketNumber } from './docket-number.js'
import { scanHimalayaRestorationArchive } from './himalaya-restoration.js'

const { isAllowedOutboundUrl } = networkPolicy

const root = path.resolve(process.env.GUO_INTEL_DOWNLOAD_DIR ?? path.join(process.cwd(), 'downloads', 'court-files-complete'))
const manifestPath = path.join(root, 'manifest.json')
const integrityHistoryPath = path.join(root, 'integrity-history.jsonl')
const bundledRoot = process.env.GUO_INTEL_BUNDLED_DOWNLOAD_DIR
  ? path.resolve(process.env.GUO_INTEL_BUNDLED_DOWNLOAD_DIR)
  : null
const bundledManifestPath = bundledRoot ? path.join(bundledRoot, 'manifest.json') : null
const pages = [
  {
    sourceId: 'nfsc-criminal-mirror',
    caseId: 'sdny-23-cr-118',
    label: 'S.D.N.Y. criminal docket public PDF mirror',
    url: 'https://nfsc.press/2024/08/25/criminal-court-case-documents-123-cr-00118-at/',
    subdir: 'sdny-23-cr-118-nfsc-mirror',
  },
  {
    sourceId: 'doj-victim-page',
    caseId: 'sdny-23-cr-118',
    label: 'DOJ victim information page linked files',
    url: 'https://www.justice.gov/usao-sdny/united-states-v-ho-wan-kwok-aka-miles-guo-and-kin-ming-je-aka-william-je',
    subdir: 'sdny-23-cr-118-doj',
  },
  {
    sourceId: 'sec-press-2023-50',
    caseId: 'sdny-23-cv-2200',
    label: 'SEC civil enforcement linked files',
    url: 'https://www.sec.gov/newsroom/press-releases/2023-50',
    subdir: 'sdny-23-cv-2200-sec',
  },
  {
    sourceId: 'gtv-fair-fund',
    caseId: 'sec-admin-3-20537',
    label: 'GTV Fair Fund linked files',
    url: 'https://www.gtvmediagroupfairfund.com/',
    subdir: 'sec-admin-3-20537-gtv-fair-fund',
  },
]

const verifiedPublicDocuments = [
  {
    sourceId: 'courtlistener-recap',
    caseId: 'sdny-23-cr-118',
    courtId: 'nysd',
    court: 'S.D.N.Y.',
    docketNumber: '1:23-cr-00118',
    courtListenerDocketId: 67012234,
    sourcePage: 'https://www.courtlistener.com/docket/67012234/81/21/united-states-v-guo/',
    sourceLabel: 'S.D.N.Y. criminal case public RECAP document',
    title: 'Doc 81-21 Exhibit C - Verified Amended Complaint dated August 26, 2019',
    docNumber: '81-21',
    filedAt: '2023-06-05',
    url: 'https://storage.courtlistener.com/recap/gov.uscourts.nysd.595324/gov.uscourts.nysd.595324.81.21.pdf',
    subdir: 'sdny-23-cr-118-recap',
    recapDocumentId: 382559006,
    pacerDocumentId: '127033474979',
    pageCount: 120,
    discoveryMethod: 'courtlistener_public_structured_search',
  },
]

const credentialRequired = [
  {
    sourceId: 'pacer',
    reason: 'Official complete district, bankruptcy, and appellate court records require PACER credentials and fee-aware retrieval.',
  },
  {
    sourceId: 'epiq-kwok-trustee',
    reason: 'Epiq docket shell is public, but full document extraction requires mapping its JSON document endpoint.',
  },
]

function cleanText(value) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function mergeSourceRecords(existingRecords, incomingRecords) {
  const records = new Map(existingRecords
    .filter((record) => record?.sourceUrl)
    .map((record) => [sourceRecordIdentity(record), record]))
  for (const record of incomingRecords) {
    if (!record?.sourceUrl) continue
    const identity = sourceRecordIdentity(record)
    const previous = records.get(identity)
    records.set(identity, previous
      ? {
          ...previous,
          ...record,
          title: record.title || previous.title,
          text: record.text || previous.text,
          externalLinks: [...new Set([...(previous.externalLinks ?? []), ...(record.externalLinks ?? [])])],
        }
      : record)
  }
  return [...records.values()]
}

function sourceRecordIdentity(record) {
  const value = record.originalUrl || record.sourceUrl
  try {
    const url = new URL(value)
    if (['himalayarestoration.com', 'www.himalayarestoration.com'].includes(url.hostname.toLowerCase())) {
      url.protocol = 'https:'
      url.hostname = 'himalayarestoration.com'
      url.search = ''
      url.hash = ''
    }
    return `${record.sourceId ?? 'unknown'}:${url.toString()}`
  } catch {
    return `${record.sourceId ?? 'unknown'}:${value}`
  }
}

function slug(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

function fileNameFor(link) {
  const url = new URL(link.url)
  const extension = path.extname(url.pathname).toLowerCase() || '.pdf'
  const hash = createHash('sha1').update(downloadIdentity(link)).digest('hex').slice(0, 10)
  const docPrefix = link.docNumber ? `doc-${String(link.docNumber).padStart(4, '0')}` : slug(link.title || path.basename(url.pathname))
  const titlePart = slug(link.title || path.basename(url.pathname, extension))
  return `${docPrefix}-${hash}${titlePart && titlePart !== docPrefix ? `-${titlePart}` : ''}${extension}`
}

function downloadIdentity(link) {
  return link?.sourceId === 'himalaya-restoration-archive' && link?.originalUrl
    ? `archive:${link.originalUrl}`
    : `url:${link?.url ?? ''}`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url, options = {}, timeoutMs = runtimeSetting('downloadTimeoutMs')) {
  return safeFetch(url, options, { timeoutMs, includeOpenAI: false })
}

async function withRetry(task, attempts = runtimeSetting('downloadRetries') + 1) {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task(attempt)
    } catch (error) {
      lastError = error
      if (attempt === attempts || error?.retryable === false) break
      await sleep(450 * 2 ** (attempt - 1))
    }
  }
  throw lastError
}

async function fetchText(url) {
  return withRetry(async () => {
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'guo-intel-local-downloader/0.1',
        Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
      },
    })
    const text = await readTextWithLimit(response)
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
    return text
  })
}

async function collectPdfLinks(page) {
  const html = await fetchText(page.url)
  const $ = cheerio.load(html)
  const links = new Map()

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') ?? ''
    const text = cleanText($(element).text())
    let absoluteUrl = ''
    try {
      absoluteUrl = new URL(href, page.url).toString()
    } catch {
      return
    }
    if (!isAllowedOutboundUrl(absoluteUrl, { includeOpenAI: false })) return
    const lowerUrl = absoluteUrl.toLowerCase()
    if (!lowerUrl.includes('.pdf') && !lowerUrl.includes('/document/')) return

    const docNumber = normalizeDocketNumber(
      text.match(/(?:Doc|Document)\s+(\d+(?:-\d+)*)/i)?.[1]
        ?? href.match(/(?:doc|Document)[^\d]*(\d+(?:-\d+)*)/i)?.[1]
        ?? docketNumberFromMirrorFilename(page.sourceId, absoluteUrl)
        ?? '',
    ) || null
    links.set(absoluteUrl, {
      sourceId: page.sourceId,
      caseId: page.caseId,
      sourcePage: page.url,
      sourceLabel: page.label,
      title: text || path.basename(new URL(absoluteUrl).pathname),
      docNumber,
      url: absoluteUrl,
      subdir: page.subdir,
    })
  })

  return [...links.values()]
}

function docketNumberFromMirrorFilename(sourceId, absoluteUrl) {
  if (sourceId !== 'nfsc-criminal-mirror') return ''
  let filename = ''
  try {
    filename = decodeURIComponent(path.basename(new URL(absoluteUrl).pathname, '.pdf'))
  } catch {
    return ''
  }
  return filename.match(/^(\d+(?:-\d+)*)(?=$|[-_.]|[\u3400-\u9fff])/u)?.[1] ?? ''
}

async function existingSize(filePath) {
  try {
    return (await stat(filePath)).size
  } catch {
    return 0
  }
}

async function inspectPdf(filePath, priorRecord = null) {
  try {
    const fileInfo = await stat(filePath)
    const handle = await open(filePath, 'r')
    try {
      const header = Buffer.alloc(5)
      const { bytesRead } = await handle.read(header, 0, header.length, 0)
      if (bytesRead !== 5 || header.toString('ascii') !== '%PDF-') return { valid: false, sha256: '' }
      // Some valid court PDFs are block-padded with more than 2 KB of NUL
      // bytes after %%EOF. Inspect a wider tail and only accept benign padding.
      const tailSize = Math.min(65536, fileInfo.size)
      const tail = Buffer.alloc(tailSize)
      await handle.read(tail, 0, tailSize, Math.max(0, fileInfo.size - tailSize))
      const eofOffset = tail.lastIndexOf(Buffer.from('%%EOF'))
      if (eofOffset < 0) return { valid: false, sha256: '' }
      const trailingBytes = tail.subarray(eofOffset + 5)
      if (trailingBytes.some((byte) => ![0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20].includes(byte))) {
        return { valid: false, sha256: '' }
      }
    } finally {
      await handle.close()
    }
    const mtimeMs = Math.round(fileInfo.mtimeMs)
    if (
      priorRecord?.sha256
      && Number(priorRecord.bytes) === fileInfo.size
      && Number(priorRecord.mtimeMs) === mtimeMs
      && runtimeSetting('fileIntegrityMode') !== 'full'
    ) {
      return { valid: true, sha256: priorRecord.sha256, mtimeMs, hashReused: true }
    }
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(filePath)) hash.update(chunk)
    return { valid: true, sha256: hash.digest('hex'), mtimeMs, hashReused: false }
  } catch {
    return { valid: false, sha256: '', mtimeMs: null, hashReused: false }
  }
}

function maximumDownloadBytes() {
  return Number(runtimeSetting('downloadMaxFileMb')) * 1024 * 1024
}

async function streamPdfResponse(response, temporaryPath) {
  const maximumBytes = maximumDownloadBytes()
  const declaredBytes = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredBytes) && declaredBytes > maximumBytes) {
    await response.body?.cancel().catch(() => undefined)
    throw new Error(`Remote file declares ${declaredBytes} bytes; the configured limit is ${maximumBytes} bytes.`)
  }
  let receivedBytes = 0
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      receivedBytes += chunk.length
      if (receivedBytes > maximumBytes) {
        callback(new Error(`Remote file exceeded the configured ${maximumBytes}-byte limit.`))
        return
      }
      callback(null, chunk)
    },
  })
  await pipeline(response.body, limiter, createWriteStream(temporaryPath, { mode: 0o600 }))
  return receivedBytes
}

function responseMetadata(response) {
  return {
    finalUrl: response.url,
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
    remoteContentLength: nullableNumber(response.headers.get('content-length')),
  }
}

async function downloadOne(link, index, total, priorFilesByUrl) {
  const directory = path.join(root, link.subdir)
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await chmod(directory, 0o700).catch(() => undefined)
  const priorRecord = priorFilesByUrl.get(downloadIdentity(link)) ?? {}
  const filename = fileNameFor(link)
  const outputPath = path.join(directory, filename)

  // A parser/schema correction can change the deterministic filename while
  // the remote PDF remains identical. Migrate the managed file first so a
  // refresh does not create duplicate PDFs or leave untracked payloads.
  if (priorRecord.storage !== 'bundled' && priorRecord.filename && priorRecord.subdir) {
    const priorPath = path.join(root, priorRecord.subdir, priorRecord.filename)
    if (priorPath !== outputPath && (await existingSize(outputPath)) === 0 && (await existingSize(priorPath)) > 0) {
      const inspection = await inspectPdf(priorPath, priorRecord)
      if (inspection.valid) {
        await rename(priorPath, outputPath)
        return {
          ...link,
          storage: 'writable',
          status: 'skipped_existing',
          filename,
          path: outputPath,
          bytes: (await stat(outputPath)).size,
          sha256: inspection.sha256,
          mtimeMs: inspection.mtimeMs,
          hashReused: inspection.hashReused,
          verifiedAt: new Date().toISOString(),
          migratedFrom: priorRecord.filename,
          finalUrl: priorRecord.finalUrl ?? link.url,
          etag: priorRecord.etag ?? null,
          lastModified: priorRecord.lastModified ?? null,
          remoteContentLength: priorRecord.remoteContentLength ?? null,
          versions: priorRecord.versions ?? [],
        }
      }
    }
  }

  const priorSize = await existingSize(outputPath)
  if (priorSize > 0) {
    const priorRecord = priorFilesByUrl.get(downloadIdentity(link)) ?? {}
    const inspection = await inspectPdf(outputPath, priorRecord)
    if (inspection.valid) {
      if (runtimeSetting('fileIntegrityMode') === 'remote') {
        const remote = await verifyRemoteVersion(link, outputPath, filename, inspection, priorRecord)
        if (remote.changed) {
          return {
            ...link,
            storage: 'writable',
            status: 'downloaded_new_version',
            filename,
            path: outputPath,
            bytes: remote.bytes,
            sha256: remote.sha256,
            mtimeMs: remote.mtimeMs,
            hashReused: false,
            verifiedAt: remote.verifiedAt,
            remoteVerifiedAt: remote.verifiedAt,
            remoteChanged: true,
            versions: remote.versions,
            finalUrl: remote.finalUrl,
            etag: remote.etag,
            lastModified: remote.lastModified,
            remoteContentLength: remote.remoteContentLength,
          }
        }
        return {
          ...link,
          storage: 'writable',
          status: 'skipped_existing',
          filename,
          path: outputPath,
          bytes: priorSize,
          sha256: inspection.sha256,
          mtimeMs: inspection.mtimeMs,
          hashReused: inspection.hashReused,
          verifiedAt: new Date().toISOString(),
          remoteVerifiedAt: remote.verifiedAt,
          remoteVerificationError: remote.error ?? null,
          versions: priorRecord.versions ?? [],
          finalUrl: remote.finalUrl ?? priorRecord.finalUrl ?? link.url,
          etag: remote.etag ?? priorRecord.etag ?? null,
          lastModified: remote.lastModified ?? priorRecord.lastModified ?? null,
          remoteContentLength: remote.remoteContentLength ?? priorRecord.remoteContentLength ?? null,
        }
      }
      return {
        ...link,
        storage: 'writable',
        status: 'skipped_existing',
        filename,
        path: outputPath,
        bytes: priorSize,
        sha256: inspection.sha256,
        mtimeMs: inspection.mtimeMs,
        hashReused: inspection.hashReused,
        verifiedAt: new Date().toISOString(),
        finalUrl: priorRecord.finalUrl ?? link.url,
        etag: priorRecord.etag ?? null,
        lastModified: priorRecord.lastModified ?? null,
        remoteContentLength: priorRecord.remoteContentLength ?? null,
        versions: priorRecord.versions ?? [],
      }
    }
    await rm(outputPath, { force: true })
  }

  const bundledPath = bundledRoot && priorRecord?.storage === 'bundled' && priorRecord.subdir && priorRecord.filename
    ? path.join(bundledRoot, priorRecord.subdir, priorRecord.filename)
    : ''
  if (bundledPath) {
    const bundledSize = await existingSize(bundledPath)
    if (bundledSize > 0) {
      const inspection = await inspectPdf(bundledPath, priorRecord)
      if (inspection.valid) {
        return {
          ...link,
          storage: 'bundled',
          status: 'skipped_existing',
          filename: priorRecord.filename,
          path: bundledPath,
          bytes: bundledSize,
          sha256: inspection.sha256,
          mtimeMs: inspection.mtimeMs,
          hashReused: inspection.hashReused,
          verifiedAt: new Date().toISOString(),
        }
      }
    }
  }

  if (link.sourceId === 'himalaya-restoration-archive' && link.archiveAvailability === 'linked_no_pdf_capture') {
    return {
      ...link,
      storage: 'writable',
      status: 'error',
      filename,
      path: outputPath,
      errorCode: 'archive_pdf_snapshot_unavailable',
      error: 'The archived project page linked this PDF, but Internet Archive currently has no application/pdf snapshot for the linked URL.',
      attempts: 0,
    }
  }

  const tmpPath = `${outputPath}.part`
  let usedAttempts = 0
  const result = await withRetry(async (attempt) => {
    usedAttempts = attempt
    await rm(tmpPath, { force: true })
    const response = await fetchWithTimeout(link.url, {
      headers: {
        'User-Agent': 'guo-intel-local-downloader/0.1',
        Accept: 'application/pdf,*/*;q=0.8',
      },
    })
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`)
    }
    const archiveWarning = response.headers.get('warning') ?? ''
    if (link.sourceId === 'himalaya-restoration-archive' && /truncated/i.test(archiveWarning)) {
      const error = new Error('Internet Archive returned a truncated PDF capture; the incomplete payload was rejected.')
      error.code = 'archive_pdf_capture_truncated'
      error.retryable = false
      throw error
    }
    const bytes = await streamPdfResponse(response, tmpPath)
    if (bytes === 0) throw new Error('Downloaded file is empty')
    const inspection = await inspectPdf(tmpPath)
    if (!inspection.valid) throw new Error('Downloaded response is not a valid PDF')
    await rename(tmpPath, outputPath)
    return { bytes, sha256: inspection.sha256, mtimeMs: inspection.mtimeMs, ...responseMetadata(response) }
  }).catch(async (error) => {
    await rm(tmpPath, { force: true })
    return {
      error: error instanceof Error ? error.message : String(error),
      errorCode: typeof error?.code === 'string' ? error.code : null,
    }
  })

  if ('error' in result) {
    return {
      ...link,
      storage: 'writable',
      status: 'error',
      filename,
      path: outputPath,
      errorCode: result.errorCode ?? undefined,
      error: result.error,
      attempts: usedAttempts || runtimeSetting('downloadRetries') + 1,
    }
  }

  const bytes = result.bytes
  if ((index + 1) % 25 === 0 || index + 1 === total) {
    console.log(`downloaded/checkpoint ${index + 1}/${total}`)
  }
  return { ...link, storage: 'writable', status: 'downloaded', filename, path: outputPath, bytes, sha256: result.sha256, mtimeMs: result.mtimeMs, hashReused: false, verifiedAt: new Date().toISOString(), attempts: usedAttempts, finalUrl: result.finalUrl, etag: result.etag, lastModified: result.lastModified, remoteContentLength: result.remoteContentLength }
}

async function verifyRemoteVersion(link, outputPath, filename, localInspection, priorRecord) {
  const temporaryPath = `${outputPath}.remote-check.part`
  const verifiedAt = new Date().toISOString()
  try {
    const remote = await withRetry(async () => {
      await rm(temporaryPath, { force: true })
      const response = await fetchWithTimeout(link.url, {
        headers: {
          'User-Agent': 'guo-intel-local-downloader/0.1',
          Accept: 'application/pdf,*/*;q=0.8',
        },
      })
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
      const bytes = await streamPdfResponse(response, temporaryPath)
      const inspection = await inspectPdf(temporaryPath)
      if (!inspection.valid) throw new Error('Remote response is not a complete PDF')
      return { bytes, inspection, ...responseMetadata(response) }
    })
    if (remote.inspection.sha256 === localInspection.sha256) {
      await rm(temporaryPath, { force: true })
      return { changed: false, verifiedAt, ...remote }
    }

    const versionDirectory = path.join(path.dirname(outputPath), '.versions')
    await mkdir(versionDirectory, { recursive: true, mode: 0o700 })
    await chmod(versionDirectory, 0o700).catch(() => undefined)
    const extension = path.extname(filename)
    const baseName = path.basename(filename, extension)
    const archivedFilename = `${baseName}.sha256-${localInspection.sha256.slice(0, 12)}${extension}`
    const archivedPath = path.join(versionDirectory, archivedFilename)
    await copyFile(outputPath, archivedPath).catch((error) => {
      if (error?.code !== 'EEXIST') throw error
    })
    await rename(temporaryPath, outputPath)
    const currentInfo = await stat(outputPath)
    const versions = [
      ...(Array.isArray(priorRecord.versions) ? priorRecord.versions : []),
      {
        filename: archivedFilename,
        path: archivedPath,
        bytes: priorRecord.bytes ?? currentInfo.size,
        mtimeMs: localInspection.mtimeMs,
        sha256: localInspection.sha256,
        preservedAt: verifiedAt,
      },
    ]
    return {
      changed: true,
      verifiedAt,
      bytes: remote.bytes,
      sha256: remote.inspection.sha256,
      mtimeMs: Math.round(currentInfo.mtimeMs),
      versions,
      finalUrl: remote.finalUrl,
      etag: remote.etag,
      lastModified: remote.lastModified,
      remoteContentLength: remote.remoteContentLength,
    }
  } catch (error) {
    await rm(temporaryPath, { force: true })
    return { changed: false, verifiedAt, error: error instanceof Error ? error.message : String(error) }
  }
}

async function mapConcurrent(items, limit, worker) {
  const results = []
  let cursor = 0
  const runners = Array.from({ length: Math.max(1, limit) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      try {
        results[index] = await worker(items[index], index, items.length)
      } catch (error) {
        results[index] = { ...items[index], status: 'error', error: error instanceof Error ? error.message : String(error) }
      }
    }
  })
  await Promise.all(runners)
  return results
}

export async function runDocumentDownload(options = {}) {
  const log = typeof options.log === 'function' ? options.log : console.log
  const newDownloadLimit = normalizeNewDownloadLimit(options.newDownloadLimit)
  const portfolioPageLimit = boundedInteger(options.portfolioPageLimit, 1, 5, 5)
  await initializeSettingsStore()
  await mkdir(root, { recursive: true, mode: 0o700 })
  await secureWritableLibraryPermissions(root)
  const priorManifest = await readJsonFile(manifestPath)
  const bundledManifest = bundledManifestPath ? await readJsonFile(bundledManifestPath) : null
  const bundledFiles = (bundledManifest?.files ?? []).map((file) => ({ ...file, storage: 'bundled' }))
  const priorFilesByUrl = new Map(bundledFiles.filter((file) => file?.url).map((file) => [downloadIdentity(file), file]))
  for (const file of priorManifest?.files ?? []) {
    if (file?.url) priorFilesByUrl.set(downloadIdentity(file), file)
  }

  const collected = []
  collected.push(...verifiedPublicDocuments)
  let sourceRecords = [...(priorManifest?.sourceRecords ?? [])]
  const pageResults = []
  for (const page of pages) {
    try {
      const links = await collectPdfLinks(page)
      collected.push(...links)
      pageResults.push({ ...page, status: 'ok', count: links.length })
      log(`${page.sourceId}: collected ${links.length} downloadable link(s)`)
    } catch (error) {
      pageResults.push({ ...page, status: 'error', error: error instanceof Error ? error.message : String(error) })
      log(`${page.sourceId}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  try {
    const archive = await scanHimalayaRestorationArchive()
    collected.push(...archive.documents, ...archive.recapDocuments)
    sourceRecords = mergeSourceRecords(sourceRecords, archive.records)
    const priorFiles = priorManifest?.files ?? []
    const priorHistoricalPage = (priorManifest?.sourcePages ?? []).find((page) => page.sourceId === 'himalaya-restoration-archive')
    const retainedHistoricalDocumentCount = new Set([
      ...priorFiles.filter((file) => file.sourceId === 'himalaya-restoration-archive').map((file) => file.originalUrl ?? file.url),
      ...archive.historical.documents.map((file) => file.originalUrl ?? file.url),
    ]).size
    const retainedHistoricalRecapCount = new Set([
      ...priorFiles.filter((file) => file.sourceId === 'courtlistener-recap' && file.historicalProjectOriginalUrl).map((file) => file.url),
      ...archive.recapDocuments.map((file) => file.url),
    ]).size
    const retainedHistoricalRecordCount = sourceRecords.filter((record) => record.sourceId === 'himalaya-restoration-archive').length
    const retainedCurrentRecordCount = sourceRecords.filter((record) => record.sourceId === 'himalaya-restoration').length
    pageResults.push({
      sourceId: 'himalaya-restoration',
      caseId: 'sdny-23-cr-118',
      label: 'Himalaya Restoration current public project site',
      url: 'https://himalayarestoration.org/',
      subdir: 'sdny-23-cr-118-himalaya-restoration',
      status: 'ok',
      count: archive.current.documents.length,
      recordCount: retainedCurrentRecordCount,
      observedRecordCount: archive.current.records.length,
    })
    pageResults.push({
      sourceId: 'himalaya-restoration-archive',
      caseId: 'sdny-23-cr-118',
      label: 'Himalaya Restoration historical public archive',
      url: 'https://web.archive.org/web/*/https://himalayarestoration.com/',
      subdir: 'sdny-23-cr-118-himalaya-restoration-archive',
      status: archive.historical.failedPageCount ? 'limited' : archive.historical.documents.length ? 'ok' : 'limited',
      count: retainedHistoricalDocumentCount,
      observedDocumentCount: archive.historical.documents.length,
      pageCount: archive.historical.pages.length,
      pageCaptureCount: Math.max(archive.historical.pageCaptureCount, Number(priorHistoricalPage?.pageCaptureCount ?? 0)),
      successfulPageCount: archive.historical.successfulPageCount,
      failedPageCount: archive.historical.failedPageCount,
      recordCount: retainedHistoricalRecordCount,
      observedRecordCount: archive.historical.records.length,
      linkedDocumentCount: Math.max(archive.historical.linkedDocumentCount, retainedHistoricalDocumentCount),
      capturedPdfCount: Math.max(archive.historical.capturedPdfCount, Number(priorHistoricalPage?.capturedPdfCount ?? 0)),
      unavailableLinkedPdfCount: Math.max(archive.historical.unavailableLinkedPdfCount, Number(priorHistoricalPage?.unavailableLinkedPdfCount ?? 0)),
      recapCounterpartCount: retainedHistoricalRecapCount,
    })
    pageResults.push({
      sourceId: 'courtlistener-recap',
      caseId: 'sdny-23-cr-118',
      label: 'CourtListener/RECAP counterparts for Himalaya Restoration historical docket links',
      url: 'https://www.courtlistener.com/docket/67012324/united-states-v-guo/',
      subdir: 'sdny-23-cr-118-recap',
      status: retainedHistoricalRecapCount ? 'ok' : 'limited',
      count: retainedHistoricalRecapCount,
      observedCount: archive.recapDocuments.length,
      reconciledHistoricalLinkCount: retainedHistoricalRecapCount,
      verifiedAt: '2026-08-14',
      limitation: 'Docket coordinates establish the public RECAP counterpart. Chinese project translations remain distinct variants unless hashes independently match.',
    })
    log(`himalaya-restoration: collected ${archive.documents.length} public project PDF link(s) and ${archive.recapDocuments.length} verified RECAP counterpart(s)`)
  } catch (error) {
    pageResults.push({
      sourceId: 'himalaya-restoration-archive',
      caseId: 'sdny-23-cr-118',
      label: 'Himalaya Restoration public archive',
      url: 'https://web.archive.org/web/*/https://himalayarestoration.com/',
      subdir: 'sdny-23-cr-118-himalaya-restoration-archive',
      status: 'error',
      count: 0,
      error: error instanceof Error ? error.message : String(error),
    })
    log(`himalaya-restoration: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (resolvedSecret('courtlistenerToken')) {
    try {
      const archive = await scanRecapArchive({ pageLimit: 4 })
      collected.push(...archive.documents)
      pageResults.push({
        sourceId: 'courtlistener-recap',
        caseId: 'tracked-case-portfolio',
        label: 'CourtListener / RECAP tracked dockets',
        url: 'https://www.courtlistener.com/recap/',
        subdir: 'recap',
        status: 'ok',
        count: archive.documents.length,
        docketCount: archive.targets.reduce((total, target) => total + target.matchingDockets, 0),
      })
      log(`courtlistener-recap: collected ${archive.documents.length} available PDF link(s) across ${archive.targets.length} tracked case(s)`)
    } catch (error) {
      pageResults.push({
        sourceId: 'courtlistener-recap',
        caseId: 'tracked-case-portfolio',
        label: 'CourtListener / RECAP tracked dockets',
        url: 'https://www.courtlistener.com/recap/',
        subdir: 'recap',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
      log(`courtlistener-recap: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    try {
      const [archive, searchArchive, portfolioArchive, relatedArchive] = await Promise.all([
        scanPublicRecapFeeds(),
        scanPublicRecapSearch({ pageLimit: 1 }),
        scanPublicRecapPortfolio({ query: '"22-50073"', courtId: 'ctb', pageLimit: portfolioPageLimit }),
        scanPublicRecapRelatedPortfolio({ pageLimit: 1 }),
      ])
      const discoveredDocuments = portfolioArchive.documents.map((document) => ({
        ...document,
        relationStatus: String(document.caseId).startsWith('discovered-') ? 'pending_review' : 'tracked',
      }))
      const relatedDocuments = relatedArchive.documents.map((document) => ({
        ...document,
        relationStatus: document.relationStatus ?? (String(document.caseId).startsWith('discovered-') ? 'pending_review' : 'tracked'),
      }))
      collected.push(...searchArchive.documents, ...discoveredDocuments, ...relatedDocuments)
      pageResults.push({
        sourceId: 'courtlistener-recap',
        caseId: 'tracked-case-portfolio',
        label: 'CourtListener public RECAP feeds for tracked dockets',
        url: 'https://www.courtlistener.com/feed/search/',
        subdir: 'recap',
        status: searchArchive.targets.some((target) => !target.error) ? 'limited' : 'error',
        count: [...new Set([...searchArchive.documents, ...portfolioArchive.documents].map((document) => document.url))].length,
        eventCount: archive.events.length,
        structuredEventCount: searchArchive.events.length,
        discoveredDocketCount: portfolioArchive.targets.length,
        portfolioPagesScanned: portfolioArchive.pagesScanned,
        docketCount: searchArchive.targets.filter((target) => !target.error).length + relatedArchive.acceptedDocketCount,
        relatedDocketCount: relatedArchive.acceptedDocketCount,
        relatedObservedDocketCount: relatedArchive.observedDocketCount,
        relatedSearchFailures: relatedArchive.failures,
        limitation: 'No-token public search exposes a limited result window and available RECAP PDFs. A token adds full docket-entry pagination.',
      })
      log(`courtlistener-recap: public feeds observed ${archive.events.length} recent record(s); fixed, portfolio, and related-name searches collected ${searchArchive.documents.length + portfolioArchive.documents.length + relatedArchive.documents.length} public PDF link(s) before de-duplication across ${relatedArchive.acceptedDocketCount} accepted related docket(s)`)
    } catch (error) {
      pageResults.push({
        sourceId: 'courtlistener-recap',
        caseId: 'tracked-case-portfolio',
        label: 'CourtListener public RECAP feeds for tracked dockets',
        url: 'https://www.courtlistener.com/feed/search/',
        subdir: 'recap',
        status: 'error',
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      })
      log(`courtlistener-recap public feeds: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Preserve prior records when a source is unavailable or removes an older link. Court-file archives
  // must not silently become untracked because a current index page changed.
  const archivedLinks = [
    ...bundledFiles,
    ...(priorManifest?.files ?? []),
    ...(priorManifest?.deferredDiscoveries ?? []),
  ].filter((file) => file?.url)
  const uniqueLinks = [...new Map([...archivedLinks, ...collected].map((link) => [downloadIdentity(link), link])).values()]
  uniqueLinks.sort(compareDownloadPriority)
  log(`total unique downloadable link(s): ${uniqueLinks.length}`)

  const knownLinks = uniqueLinks.filter((link) => priorFilesByUrl.has(downloadIdentity(link)))
  const newLinks = uniqueLinks.filter((link) => !priorFilesByUrl.has(downloadIdentity(link)))
  const selectedNewLinks = newDownloadLimit === Number.POSITIVE_INFINITY
    ? newLinks
    : newLinks.slice(0, newDownloadLimit)
  const deferredNewLinks = Math.max(0, newLinks.length - selectedNewLinks.length)
  const deferredDiscoveries = deferredNewLinks ? newLinks.slice(selectedNewLinks.length) : []
  const downloadQueue = [...knownLinks, ...selectedNewLinks]
  if (deferredNewLinks) {
    log(`bounded incremental mode: deferred ${deferredNewLinks} newly discovered link(s) to a later run`)
  }

  const downloadedFiles = await mapConcurrent(downloadQueue, runtimeSetting('downloadConcurrency'), (link, index, total) => downloadOne(link, index, total, priorFilesByUrl))
  const files = applySameDocketAlternativeMetadata(
    applyHistoricalCounterpartMetadata(applyCrossSourceDuplicateMetadata(downloadedFiles)),
  )
  const manifest = {
    generatedAt: new Date().toISOString(),
    root,
    sourcePages: pageResults,
    credentialRequired: credentialRequired.map((item) => ({
      ...item,
      source: sourceRegistry.find((source) => source.id === item.sourceId)?.url ?? null,
    })),
    counts: {
      collected: uniqueLinks.length,
      processed: downloadQueue.length,
      newlyDiscovered: newLinks.length,
      deferredNew: deferredNewLinks,
      downloaded: files.filter((file) => file.status === 'downloaded').length,
      newVersions: files.filter((file) => file.status === 'downloaded_new_version').length,
      skippedExisting: files.filter((file) => file.status === 'skipped_existing').length,
      hashesReused: files.filter((file) => file.hashReused).length,
      hashesComputed: files.filter((file) => file.sha256 && !file.hashReused).length,
      errors: files.filter((file) => file.status === 'error').length,
    },
    integrityMode: runtimeSetting('fileIntegrityMode'),
    sourceRecords,
    deferredDiscoveries,
    files,
  }

  const history = await appendIntegrityHistory(files, priorFilesByUrl, priorManifest?.integrityHistory)
  manifest.integrityHistory = history
  await atomicWriteJson(manifestPath, manifest)
  log(`manifest: ${manifestPath}`)
  log(JSON.stringify(manifest.counts, null, 2))
  return manifest
}

function normalizeNewDownloadLimit(value) {
  if (value === 'all' || value === Number.POSITIVE_INFINITY || value == null) return Number.POSITIVE_INFINITY
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : Number.POSITIVE_INFINITY
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(minimum, Math.min(maximum, Math.floor(parsed)))
}

function compareDownloadPriority(left, right) {
  const authorityDelta = downloadAuthority(left.sourceId) - downloadAuthority(right.sourceId)
  if (authorityDelta) return authorityDelta
  const dateDelta = String(right.filedAt ?? '').localeCompare(String(left.filedAt ?? ''))
  if (dateDelta) return dateDelta
  return compareDocketNumbers(right.docNumber, left.docNumber) || left.url.localeCompare(right.url)
}

function downloadAuthority(sourceId) {
  if (sourceId === 'pacer') return 0
  if (sourceId === 'courtlistener-recap') return 1
  if (['doj-victim-page', 'sec-press-2023-50'].includes(sourceId)) return 2
  if (['gtv-fair-fund', 'epiq-kwok-trustee'].includes(sourceId)) return 3
  if (sourceId === 'himalaya-restoration') return 4
  if (sourceId === 'himalaya-restoration-archive') return 5
  if (sourceId === 'nfsc-criminal-mirror') return 9
  return 5
}

function applyCrossSourceDuplicateMetadata(files) {
  const byHash = new Map()
  for (const file of files) {
    if (!file.sha256 || file.status === 'error') continue
    const group = byHash.get(file.sha256) ?? []
    group.push(file)
    byHash.set(file.sha256, group)
  }
  return files.map((file) => {
    if (!file.sha256 || file.status === 'error') return file
    const group = byHash.get(file.sha256) ?? []
    if (group.length < 2) return file
    const preferred = [...group].sort((left, right) => downloadAuthority(left.sourceId) - downloadAuthority(right.sourceId))[0]
    const alternateSources = group
      .filter((candidate) => candidate.url !== file.url)
      .map((candidate) => ({
        sourceId: candidate.sourceId,
        sourceLabel: candidate.sourceLabel,
        sourcePage: candidate.sourcePage,
        url: candidate.url,
      }))
    return {
      ...file,
      duplicateOfUrl: preferred.url === file.url ? null : preferred.url,
      preferredSourceUrl: preferred.url,
      alternateSources,
    }
  })
}

function applySameDocketAlternativeMetadata(files) {
  const availableByDocket = new Map()
  for (const file of files) {
    const docNumber = normalizeDocketNumber(file.docNumber)
    if (!docNumber || file.status === 'error' || !file.sha256) continue
    const key = `${file.caseId ?? ''}:${docNumber}`
    const group = availableByDocket.get(key) ?? []
    group.push(file)
    availableByDocket.set(key, group)
  }
  return files.map((file) => {
    if (file.status !== 'error') return file
    const docNumber = normalizeDocketNumber(file.docNumber)
    if (!docNumber) return file
    const alternatives = (availableByDocket.get(`${file.caseId ?? ''}:${docNumber}`) ?? [])
      .filter((candidate) => candidate.sourceId !== file.sourceId || candidate.url !== file.url)
      .sort((left, right) => downloadAuthority(left.sourceId) - downloadAuthority(right.sourceId))
      .map((candidate) => ({
        sourceId: candidate.sourceId,
        sourceLabel: candidate.sourceLabel,
        sourcePage: candidate.sourcePage,
        url: candidate.url,
        sha256: candidate.sha256,
        note: 'Same-docket alternative; byte-for-byte identity with the unavailable source has not been established.',
      }))
    return alternatives.length ? { ...file, sameDocketAlternatives: alternatives } : file
  })
}

function applyHistoricalCounterpartMetadata(files) {
  const historicalByOriginalUrl = new Map(files
    .filter((file) => file.sourceId === 'himalaya-restoration-archive' && file.originalUrl)
    .map((file) => [file.originalUrl, file]))
  const recapByHistoricalUrl = new Map(files
    .filter((file) => file.sourceId === 'courtlistener-recap' && file.historicalProjectOriginalUrl)
    .map((file) => [file.historicalProjectOriginalUrl, file]))

  return files.map((file) => {
    const historical = file.sourceId === 'courtlistener-recap'
      ? historicalByOriginalUrl.get(file.historicalProjectOriginalUrl)
      : file
    const recap = file.sourceId === 'himalaya-restoration-archive'
      ? recapByHistoricalUrl.get(file.originalUrl)
      : file
    if (!historical || !recap || recap.sourceId !== 'courtlistener-recap') return file

    let equivalenceStatus = recap.equivalenceStatus
    if (recap.counterpartKind === 'official_english_counterpart') {
      equivalenceStatus = 'official_english_counterpart_distinct_translation_variant'
    } else if (historical.sha256 && recap.sha256) {
      equivalenceStatus = historical.sha256 === recap.sha256
        ? 'byte_identical'
        : 'docket_coordinates_match_bytes_differ'
    } else if (historical.status === 'error' && recap.sha256) {
      equivalenceStatus = 'historical_capture_unavailable_recap_available'
    }

    if (file.sourceId === 'courtlistener-recap') {
      return {
        ...file,
        equivalenceStatus,
        historicalProjectCounterpart: {
          sourceId: historical.sourceId,
          sourcePage: historical.sourcePage,
          originalUrl: historical.originalUrl,
          archiveAvailability: historical.archiveAvailability,
          status: historical.status,
          sha256: historical.sha256 ?? null,
        },
      }
    }

    if (file.sourceId === 'himalaya-restoration-archive') {
      return {
        ...file,
        recapCounterpart: {
          sourceId: recap.sourceId,
          sourcePage: recap.sourcePage,
          url: recap.url,
          status: recap.status,
          sha256: recap.sha256 ?? null,
          counterpartKind: recap.counterpartKind,
          equivalenceStatus,
        },
      }
    }
    return file
  })
}

async function secureWritableLibraryPermissions(directory) {
  await chmod(directory, 0o700).catch(() => undefined)
  const entries = await readdir(directory, { withFileTypes: true })
  await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) return
    if (entry.isDirectory()) {
      await secureWritableLibraryPermissions(target)
      return
    }
    if (entry.isFile()) await chmod(target, 0o600).catch(() => undefined)
  }))
}

async function appendIntegrityHistory(files, priorFilesByUrl, priorHistory = null) {
  const currentHistory = await verifyIntegrityHistory(priorHistory)
  let previousEntryHash = currentHistory.chainHead
  const existingEntries = currentHistory.entries

  const additions = []
  for (const file of files) {
    if (!file.sha256) continue
    const prior = priorFilesByUrl.get(downloadIdentity(file))
    if (prior?.sha256 === file.sha256) continue
    const entry = {
      observedAt: file.verifiedAt ?? new Date().toISOString(),
      sourceUrl: file.url,
      sourceId: file.sourceId,
      caseId: file.caseId,
      filename: file.filename,
      bytes: file.bytes,
      mtimeMs: file.mtimeMs,
      sha256: file.sha256,
      previousSha256: prior?.sha256 ?? null,
      previousEntryHash,
    }
    entry.entryHash = createHash('sha256').update(JSON.stringify(entry)).digest('hex')
    previousEntryHash = entry.entryHash
    additions.push(JSON.stringify(entry))
  }
  if (additions.length) {
    await appendFile(integrityHistoryPath, `${additions.join('\n')}\n`, { mode: 0o600 })
    await chmod(integrityHistoryPath, 0o600).catch(() => undefined)
  }
  return {
    path: path.basename(integrityHistoryPath),
    entries: existingEntries + additions.length,
    added: additions.length,
    chainHead: previousEntryHash,
  }
}

async function verifyIntegrityHistory(priorHistory) {
  let content = ''
  try {
    content = await readFile(integrityHistoryPath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT' && !priorHistory?.entries) return { entries: 0, chainHead: null }
    throw error
  }

  const lines = content.split('\n').filter(Boolean)
  let previousEntryHash = null
  for (const [index, line] of lines.entries()) {
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      throw new Error(`Integrity history contains invalid JSON at entry ${index + 1}.`)
    }
    const expected = { ...entry }
    delete expected.entryHash
    const digest = createHash('sha256').update(JSON.stringify(expected)).digest('hex')
    if (entry.entryHash !== digest || entry.previousEntryHash !== previousEntryHash) {
      throw new Error(`Integrity history chain validation failed at entry ${index + 1}; refusing to append.`)
    }
    previousEntryHash = entry.entryHash
  }
  if (priorHistory?.entries != null && Number(priorHistory.entries) !== lines.length) {
    throw new Error('Integrity history entry count does not match the prior manifest; refusing to append.')
  }
  if (priorHistory?.chainHead != null && priorHistory.chainHead !== previousEntryHash) {
    throw new Error('Integrity history chain head does not match the prior manifest; refusing to append.')
  }
  return { entries: lines.length, chainHead: previousEntryHash }
}

function nullableNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await runDocumentDownload()
}
