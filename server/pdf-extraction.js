import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, readdir, realpath, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { PDFParse } from 'pdf-parse'
import { createWorker, OEM, PSM } from 'tesseract.js'
import { runtimeSetting } from './settings-store.js'
import { atomicWriteJson } from './atomic-write.js'

const extractionCacheVersion = 8
const require = createRequire(import.meta.url)
const extractionQueue = []
let activeExtractions = 0
let extractionCacheIndexPromise = null
const maximumConcurrentExtractions = boundedInteger(
  process.env.GUO_INTEL_MAX_CONCURRENT_PDF_EXTRACTIONS,
  1,
  2,
  1,
)

export async function extractPdfSnippetForFile(file, options = {}) {
  return withExtractionSlot(() => performPdfExtraction(file, options))
}

async function performPdfExtraction(file, options = {}) {
  const requestedPath = typeof file?.path === 'string' ? file.path : ''
  if (!requestedPath || !requestedPath.toLowerCase().endsWith('.pdf')) return emptyExtraction('no_pdf_path')
  if (file.status === 'error') return emptyExtraction('download_error')

  const pageLimit = boundedInteger(options.pageLimit, 1, 1000, configuredPageLimit())
  const charLimit = boundedInteger(options.charLimit, 1000, 5000000, configuredCharLimit())
  const ocrEnabled = runtimeSetting('localOcrEnabled') !== false
  const requestedOcrPageLimit = boundedInteger(
    options.ocrPageLimit,
    1,
    1000,
    Number(runtimeSetting('ocrPageLimit')),
  )
  const ocrPageLimit = Math.min(pageLimit, requestedOcrPageLimit)
  const cacheDir = extractionCacheDir()
  await mkdir(cacheDir, { recursive: true, mode: 0o700 })

  const filePath = await verifiedExtractionPath(requestedPath).catch(() => '')
  if (!filePath) {
    return failedExtraction({
      status: 'outside_managed_library',
      warning: 'PDF extraction refused a path outside the managed court-file library.',
      pageLimit,
      charLimit,
      ocrEnabled,
      ocrPageLimit,
      signature: null,
    })
  }

  const signature = await fileSignature(filePath, file.sha256).catch((error) => ({
    path: filePath,
    error: error instanceof Error ? error.message : String(error),
  }))
  const extractionOptions = { pageLimit, charLimit, ocrEnabled, ocrPageLimit }
  const cachePath = path.join(cacheDir, `${stableExtractionId(file, signature, extractionOptions)}.json`)
  const maximumBytes = Number(runtimeSetting('pdfMaxFileMb')) * 1024 * 1024
  if (Number(signature.size) > maximumBytes) {
    const payload = failedExtraction({
      status: 'file_too_large',
      warning: `PDF size ${signature.size} exceeds the configured ${maximumBytes}-byte parsing limit.`,
      pageLimit,
      charLimit,
      ocrEnabled,
      ocrPageLimit,
      signature,
    })
    await atomicWriteJson(cachePath, payload, { directoryMode: 0o700 })
    return payload
  }
  if (signature.manifestSha256 && signature.contentSha256 !== signature.manifestSha256) {
    const payload = failedExtraction({
      status: 'integrity_mismatch',
      warning: 'PDF failed the manifest SHA-256 integrity check.',
      pageLimit,
      charLimit,
      ocrEnabled,
      ocrPageLimit,
      signature,
    })
    await atomicWriteJson(cachePath, payload, { directoryMode: 0o700 })
    return payload
  }
  const cachedEntry = await reusableExtractionCache(cacheDir, cachePath, signature, extractionOptions)
  if (cachedEntry) {
    const cached = cachedEntry.payload
    if (cachedEntry.filePath !== cachePath || cached.signature?.path !== signature.path || cached.signature?.mtimeMs !== signature.mtimeMs) {
      const migrated = { ...cached, signature }
      await atomicWriteJson(cachePath, migrated, { directoryMode: 0o700 })
      rememberExtractionCache(cachePath, migrated)
      return migrated
    }
    return cached
  }

  const startedAt = Date.now()
  let parser = null
  try {
    const data = await readFile(filePath)
    const contentSha256 = createHash('sha256').update(data).digest('hex')
    if (signature.manifestSha256 && contentSha256 !== signature.manifestSha256) {
      throw new Error('PDF failed the manifest SHA-256 integrity check.')
    }
    signature.contentSha256 = contentSha256
    parser = new PDFParse({ data })
    const result = await parser.getText({ first: pageLimit })
    const pageSnippets = buildPageSnippets(result.pages, charLimit)
    const parserText = normalizeExtractedText(result.text)
    let normalizedText = pageSnippets.length
      ? pageSnippets.map((page) => page.text).filter(Boolean).join('\n\n')
      : parserText.slice(0, charLimit)
    let effectivePageSnippets = pageSnippets
    let engine = 'pdf-parse'
    let ocr = null
    const sparseTextLayer = ocrEnabled && shouldUseLocalOcr(normalizedText, effectivePageSnippets)
    if (sparseTextLayer) {
      const ocrResult = await extractWithLocalOcr(parser, ocrPageLimit, charLimit)
      if (ocrResult.text.length > normalizedText.length) {
        ocr = ocrResult
        normalizedText = ocr.text
        effectivePageSnippets = ocr.pageSnippets
        engine = 'pdf-parse + local Tesseract.js OCR'
      }
    }
    const payload = {
      cacheVersion: extractionCacheVersion,
      status: normalizedText ? 'extracted' : 'empty_text',
      engine,
      extractedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      pageLimit,
      charLimit,
      ocrEnabled,
      ocrPageLimit,
      totalPages: result.total ?? null,
      pagesParsed: ocr?.pagesParsed ?? (Array.isArray(result.pages) ? result.pages.length : null),
      charCount: normalizedText.length,
      coverage: extractionCoverage(result.total, ocr?.pagesParsed ?? (Array.isArray(result.pages) ? result.pages.length : 0), normalizedText.length, charLimit),
      snippet: normalizedText,
      pageSnippets: effectivePageSnippets,
      textHash: createHash('sha256').update(normalizedText).digest('hex'),
      signature,
      warning: normalizedText
        ? ocr?.text
          ? sparseTextLayer
            ? 'The PDF text layer was empty or materially sparse; body text was recovered with bundled local OCR.'
            : 'The PDF had no text layer; body text was recovered with bundled local OCR.'
          : sparseTextLayer
            ? 'The PDF text layer appears materially sparse, but local OCR did not recover a stronger body-text result.'
            : null
        : 'PDF parser and local OCR returned no body text; the file may be blank, sealed, corrupt, or extraction-restricted.',
    }
    await atomicWriteJson(cachePath, payload, { directoryMode: 0o700 })
    rememberExtractionCache(cachePath, payload)
    return payload
  } catch (error) {
    const payload = {
      cacheVersion: extractionCacheVersion,
      status: 'error',
      engine: 'pdf-parse',
      extractedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      pageLimit,
      charLimit,
      ocrEnabled,
      ocrPageLimit,
      totalPages: null,
      pagesParsed: null,
      charCount: 0,
      snippet: '',
      pageSnippets: [],
      textHash: null,
      signature,
      warning: error instanceof Error ? error.message : String(error),
    }
    await atomicWriteJson(cachePath, payload, { directoryMode: 0o700 })
    rememberExtractionCache(cachePath, payload)
    return payload
  } finally {
    if (parser) await parser.destroy()
  }
}

async function withExtractionSlot(task) {
  if (activeExtractions >= maximumConcurrentExtractions) {
    await new Promise((resolve) => extractionQueue.push(resolve))
  }
  activeExtractions += 1
  try {
    return await task()
  } finally {
    activeExtractions -= 1
    extractionQueue.shift()?.()
  }
}

export async function extractPdfSnippetsForFiles(files, options = {}) {
  const limit = boundedInteger(options.limit, 0, 100, 18)
  const candidates = files
    .filter((file) => file?.status !== 'error' && file?.path)
    .slice(0, limit)
  const byUrl = new Map()
  for (const file of candidates) {
    byUrl.set(file.url, await extractPdfSnippetForFile(file, options))
  }
  return byUrl
}

export function extractionCapability() {
  return {
    engine: runtimeSetting('localOcrEnabled') === false ? 'pdf-parse' : 'pdf-parse + local Tesseract.js OCR fallback',
    mode: 'local',
    pageLimit: configuredPageLimit(),
    charLimit: configuredCharLimit(),
    externalUpload: false,
  }
}

async function extractWithLocalOcr(parser, pageLimit, charLimit) {
  const screenshots = await parser.getScreenshot({
    first: pageLimit,
    desiredWidth: 1800,
    imageBuffer: true,
    imageDataUrl: false,
  })
  if (!screenshots.pages?.length) return { text: '', pageSnippets: [], pagesParsed: 0 }

  const englishData = require('@tesseract.js-data/eng')
  const chineseData = require('@tesseract.js-data/chi_sim')
  const langPath = await ensureBundledLanguageDirectory([englishData, chineseData])
  const worker = await createWorker(`${englishData.code}+${chineseData.code}`, OEM.LSTM_ONLY, {
    langPath,
    cacheMethod: 'none',
    gzip: true,
  })
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
      user_defined_dpi: '220',
    })
    const pageTexts = []
    for (const page of screenshots.pages) {
      if (pageTexts.reduce((total, item) => total + item.text.length, 0) >= charLimit) break
      const result = await worker.recognize(Buffer.from(page.data))
      pageTexts.push({ pageNumber: page.pageNumber, text: normalizeExtractedText(result.data?.text) })
    }
    const pageSnippets = buildPageSnippets(pageTexts.map((page) => ({ num: page.pageNumber, text: page.text })), charLimit)
    return {
      text: pageSnippets.map((page) => page.text).filter(Boolean).join('\n\n'),
      pageSnippets,
      pagesParsed: pageTexts.length,
    }
  } finally {
    await worker.terminate()
  }
}

async function ensureBundledLanguageDirectory(languages) {
  const directory = path.join(extractionCacheDir(), 'ocr-languages')
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await Promise.all(languages.map(async (language) => {
    const filename = `${language.code}.traineddata.gz`
    const sourcePath = path.join(language.langPath, filename)
    const targetPath = path.join(directory, filename)
    const [sourceInfo, targetInfo] = await Promise.all([
      stat(sourcePath),
      stat(targetPath).catch(() => null),
    ])
    if (targetInfo?.size === sourceInfo.size) return
    const temporaryPath = `${targetPath}.${process.pid}.part`
    await writeFile(temporaryPath, await readFile(sourcePath))
    await rename(temporaryPath, targetPath)
  }))
  return directory
}

function extractionCacheDir() {
  return path.resolve(process.env.GUO_INTEL_CACHE_DIR ?? path.join(process.cwd(), 'server', 'cache'), 'pdf-text')
}

function stableExtractionId(file, signature, options = {}) {
  const contentIdentity = signature?.contentSha256 || signature?.manifestSha256 || file?.sha256 || `${file?.url ?? ''}|${file?.path ?? ''}`
  return createHash('sha256')
    .update(JSON.stringify({
      version: extractionCacheVersion,
      contentIdentity,
      pageLimit: options.pageLimit ?? configuredPageLimit(),
      charLimit: options.charLimit ?? configuredCharLimit(),
      ocrEnabled: options.ocrEnabled ?? true,
      ocrPageLimit: options.ocrPageLimit ?? '',
    }))
    .digest('hex')
}

async function verifiedExtractionPath(filePath) {
  const targetPath = await realpath(path.resolve(filePath))
  const roots = [
    process.env.GUO_INTEL_DOWNLOAD_DIR ?? path.join(process.cwd(), 'downloads', 'court-files-complete'),
    process.env.GUO_INTEL_BUNDLED_DOWNLOAD_DIR,
  ].filter(Boolean)
  const realRoots = await Promise.all(roots.map((root) => realpath(path.resolve(root)).catch(() => null)))
  const insideManagedRoot = realRoots.some((root) => root && (targetPath === root || targetPath.startsWith(`${root}${path.sep}`)))
  if (!insideManagedRoot || path.extname(targetPath).toLowerCase() !== '.pdf') {
    throw new Error('PDF path is outside the managed court-file library.')
  }
  return targetPath
}

async function fileSignature(filePath, expectedSha256 = '') {
  const info = await stat(filePath)
  let contentSha256 = null
  const maximumBytes = Number(runtimeSetting('pdfMaxFileMb')) * 1024 * 1024
  if (info.size <= maximumBytes) {
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(filePath)) hash.update(chunk)
    contentSha256 = hash.digest('hex')
  }
  return {
    path: filePath,
    size: info.size,
    mtimeMs: Math.round(info.mtimeMs),
    manifestSha256: typeof expectedSha256 === 'string' ? expectedSha256 : '',
    contentSha256,
  }
}

async function readExtractionCache(cachePath) {
  try {
    return JSON.parse(await readFile(cachePath, 'utf8'))
  } catch {
    return null
  }
}

async function reusableExtractionCache(cacheDir, cachePath, signature, options) {
  const direct = await readExtractionCache(cachePath)
  if (extractionCacheMatches(direct, signature, options)) return { filePath: cachePath, payload: direct }

  const contentSha256 = signature?.contentSha256 || signature?.manifestSha256
  if (!contentSha256) return null
  const index = await extractionCacheIndex(cacheDir)
  const candidates = index.get(extractionReuseKey(contentSha256, options)) ?? []
  return candidates
    .filter((entry) => extractionCacheMatches(entry.payload, signature, options))
    .sort((left, right) => compareReusableExtractions(left.payload, right.payload))[0] ?? null
}

function extractionCacheMatches(cached, signature, options) {
  if (!cached || cached.cacheVersion !== extractionCacheVersion) return false
  const cachedSha256 = cached.signature?.contentSha256 || cached.signature?.manifestSha256
  const currentSha256 = signature?.contentSha256 || signature?.manifestSha256
  return Boolean(cachedSha256 && currentSha256 && cachedSha256 === currentSha256)
    && Number(cached.pageLimit) === Number(options.pageLimit)
    && Number(cached.charLimit) === Number(options.charLimit)
    && Boolean(cached.ocrEnabled) === Boolean(options.ocrEnabled)
    && Number(cached.ocrPageLimit) === Number(options.ocrPageLimit)
}

async function extractionCacheIndex(cacheDir) {
  if (!extractionCacheIndexPromise) extractionCacheIndexPromise = buildExtractionCacheIndex(cacheDir)
  return extractionCacheIndexPromise
}

async function buildExtractionCacheIndex(cacheDir) {
  let entries = []
  try {
    entries = await readdir(cacheDir, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return new Map()
    throw error
  }
  const filenames = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map((entry) => entry.name)
  const index = new Map()
  let cursor = 0
  const workers = Array.from({ length: Math.min(24, Math.max(1, filenames.length)) }, async () => {
    while (cursor < filenames.length) {
      const filename = filenames[cursor]
      cursor += 1
      const filePath = path.join(cacheDir, filename)
      const payload = await readExtractionCache(filePath)
      const contentSha256 = payload?.signature?.contentSha256 || payload?.signature?.manifestSha256
      if (!contentSha256 || payload?.cacheVersion !== extractionCacheVersion) continue
      const key = extractionReuseKey(contentSha256, payload)
      const values = index.get(key) ?? []
      values.push({ filePath, payload })
      index.set(key, values)
    }
  })
  await Promise.all(workers)
  return index
}

function rememberExtractionCache(filePath, payload) {
  if (!extractionCacheIndexPromise) return
  void extractionCacheIndexPromise.then((index) => {
    const contentSha256 = payload?.signature?.contentSha256 || payload?.signature?.manifestSha256
    if (!contentSha256) return
    const key = extractionReuseKey(contentSha256, payload)
    const values = (index.get(key) ?? []).filter((entry) => entry.filePath !== filePath)
    values.push({ filePath, payload })
    index.set(key, values)
  })
}

function extractionReuseKey(contentSha256, options) {
  return `${contentSha256}|${Number(options.pageLimit)}|${Number(options.charLimit)}|${Boolean(options.ocrEnabled)}|${Number(options.ocrPageLimit)}`
}

function compareReusableExtractions(left, right) {
  const coverageWeight = (value) => value?.coverage === 'complete' ? 2 : value?.coverage === 'partial' ? 1 : 0
  return coverageWeight(right) - coverageWeight(left)
    || Number(right?.pagesParsed ?? 0) - Number(left?.pagesParsed ?? 0)
    || Number(right?.charCount ?? 0) - Number(left?.charCount ?? 0)
    || String(right?.extractedAt ?? '').localeCompare(String(left?.extractedAt ?? ''))
}

function normalizeExtractedText(value) {
  return String(value ?? '')
    .replaceAll('\u0000', '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function shouldUseLocalOcr(value, pageSnippets = []) {
  const text = normalizeExtractedText(value)
  if (!text) return true
  const compact = text.replace(/\s+/g, '')
  if (compact.length < 32) return true

  const withoutEcfHeaders = substantivePageText(text)
  const pageCount = Math.max(1, Array.isArray(pageSnippets) ? pageSnippets.length : 0)
  const sparsePages = pageSnippets.filter((page) => substantivePageText(page?.text).length < 48).length
  if (pageCount >= 2 && sparsePages >= Math.max(2, Math.ceil(pageCount / 3))) return true
  const minimumSubstantiveCharacters = Math.min(400, Math.max(100, pageCount * 80))
  return withoutEcfHeaders.length < minimumSubstantiveCharacters && withoutEcfHeaders.length < compact.length * 0.5
}

function substantivePageText(value) {
  return normalizeExtractedText(value)
    .replace(/Case\s+\d+:[\w-]+\s+Document\s+\S+\s+Filed\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s+Page\s+\d+\s+of\s+\d+/gi, ' ')
    .replace(/Case\s+No\.?\s*\S+\s+Document\s+\S+\s+Filed\s+\S+\s+Page\s+\d+\s+of\s+\d+/gi, ' ')
    .replace(/\s+/g, '')
}

function emptyExtraction(status) {
  return {
    cacheVersion: extractionCacheVersion,
    status,
    engine: 'pdf-parse',
    extractedAt: null,
    durationMs: 0,
    pageLimit: configuredPageLimit(),
    charLimit: configuredCharLimit(),
    ocrEnabled: runtimeSetting('localOcrEnabled') !== false,
    ocrPageLimit: Number(runtimeSetting('ocrPageLimit')),
    totalPages: null,
    pagesParsed: 0,
    charCount: 0,
    coverage: 'none',
    snippet: '',
    pageSnippets: [],
    textHash: null,
    signature: null,
    warning: null,
  }
}

function configuredPageLimit() {
  return boundedInteger(process.env.GUO_INTEL_PDF_TEXT_PAGE_LIMIT, 1, 1000, Number(runtimeSetting('pdfPageLimit')))
}

function configuredCharLimit() {
  return boundedInteger(process.env.GUO_INTEL_PDF_TEXT_CHAR_LIMIT, 1000, 5000000, Number(runtimeSetting('pdfCharLimit')))
}

function failedExtraction(options) {
  return {
    ...emptyExtraction(options.status),
    extractedAt: new Date().toISOString(),
    pageLimit: options.pageLimit,
    charLimit: options.charLimit,
    ocrEnabled: options.ocrEnabled,
    ocrPageLimit: options.ocrPageLimit,
    signature: options.signature,
    warning: options.warning,
  }
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)))
}

function extractionCoverage(totalPages, pagesParsed, charCount, charLimit) {
  const pageComplete = Number.isFinite(Number(totalPages)) && Number(pagesParsed) >= Number(totalPages)
  const characterComplete = Number(charCount) < Number(charLimit)
  return pageComplete && characterComplete ? 'complete' : 'partial'
}

function buildPageSnippets(pages, charLimit) {
  if (!Array.isArray(pages)) return []
  let cursor = 0
  const snippets = []
  for (const [index, page] of pages.entries()) {
      if (cursor >= charLimit) break
      const originalText = normalizeExtractedText(page?.text)
      const separatorLength = cursor === 0 ? 0 : 2
      cursor += separatorLength
      const remaining = Math.max(0, charLimit - cursor)
      const text = originalText.slice(0, remaining)
      const pageNumber = Number(page?.num ?? index + 1)
      const pageHash = createHash('sha256').update(text).digest('hex')
      snippets.push({
        pageNumber: Number.isFinite(pageNumber) ? pageNumber : index + 1,
        text,
        charStart: cursor,
        charEnd: cursor + text.length,
        textHash: pageHash,
      })
      cursor += text.length
  }
  return snippets
}
