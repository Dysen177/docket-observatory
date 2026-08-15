import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { extractPdfSnippetForFile } from '../server/pdf-extraction.js'

const root = process.cwd()
const manifest = JSON.parse(await readFile(path.join(root, 'downloads', 'court-files-complete', 'manifest.json'), 'utf8'))
const filesByHash = new Map((manifest.files ?? []).filter((file) => file.sha256 && file.path).map((file) => [file.sha256, file]))
const translationDir = path.join(root, 'server', 'human-translations')
const researchDir = path.join(root, 'server', 'human-legal-research')
const translationFiles = await jsonFiles(translationDir)
const researchFiles = await jsonFiles(researchDir)
const researchHashes = new Set(researchFiles.map(sourceHash))
const translationHashes = new Set(translationFiles.map(sourceHash))
const errors = []
const warnings = []
let completeTranslations = 0
let legalReviews = 0

for (const filename of translationFiles) {
  const sha256 = sourceHash(filename)
  const record = await readJson(path.join(translationDir, filename), errors)
  if (!record) continue
  if (record.status !== 'complete') continue
  completeTranslations += 1
  const file = filesByHash.get(sha256)
  if (!file) {
    errors.push(`${filename}: source SHA-256 is absent from the manifest`)
    continue
  }
  if (record.sourceSha256 !== sha256) errors.push(`${filename}: sourceSha256 does not match its filename`)
  const extraction = await extractPdfSnippetForFile(file, { pageLimit: 1000, charLimit: 5000000, ocrPageLimit: 1000 })
  if (extraction.coverage !== 'complete') errors.push(`${filename}: extraction coverage is ${extraction.coverage ?? 'missing'}`)
  if (record.sourceTextHash !== extraction.textHash) errors.push(`${filename}: sourceTextHash does not match extraction`)
  if (Number(record.charCount) !== Number(extraction.charCount)) errors.push(`${filename}: charCount does not match extraction`)
  const pages = Array.isArray(record.zh) ? record.zh : []
  if (pages.length !== extraction.pageSnippets.length) errors.push(`${filename}: translated ${pages.length}/${extraction.pageSnippets.length} page(s)`)
  for (let index = 0; index < extraction.pageSnippets.length; index += 1) {
    const sourcePage = extraction.pageSnippets[index]
    const translatedPage = pages[index]
    const expectedHash = createHash('sha256').update(sourcePage.text).digest('hex')
    if (Number(translatedPage?.pageNumber) !== Number(sourcePage.pageNumber)) errors.push(`${filename}: page ${sourcePage.pageNumber} is missing or out of order`)
    if (translatedPage?.sourceTextHash !== expectedHash) errors.push(`${filename}: page ${sourcePage.pageNumber} source hash mismatch`)
    if (!substantive(translatedPage?.translatedText)) errors.push(`${filename}: page ${sourcePage.pageNumber} has no substantive Chinese translation`)
  }
  if (!researchHashes.has(sha256)) warnings.push(`${filename}: complete translation does not yet have a matching professional bilingual review`)
}

for (const filename of researchFiles) {
  const sha256 = sourceHash(filename)
  const record = await readJson(path.join(researchDir, filename), errors)
  if (!record) continue
  legalReviews += 1
  const file = filesByHash.get(sha256)
  if (!file) {
    errors.push(`${filename}: source SHA-256 is absent from the manifest`)
    continue
  }
  if (record.sha256 !== sha256) errors.push(`${filename}: sha256 does not match its filename`)
  const extraction = await extractPdfSnippetForFile(file, { pageLimit: 1000, charLimit: 5000000, ocrPageLimit: 1000 })
  const validPages = new Set((extraction.pageSnippets ?? []).map((page) => Number(page.pageNumber)))
  for (const language of ['en', 'zh']) validateResearchLanguage(record[language], language, filename, validPages, errors)
  if (!translationHashes.has(sha256)) warnings.push(`${filename}: professional bilingual review does not yet have a matching complete translation`)
}

const result = {
  translationJsonFiles: translationFiles.length,
  completeTranslations,
  legalReviews,
  integrityErrors: errors.length,
  professionalPairingWarnings: warnings.length,
}
console.log(JSON.stringify(result, null, 2))
if (warnings.length) {
  console.warn(warnings.map((warning) => `- warning: ${warning}`).join('\n'))
}
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'))
  process.exitCode = 1
}

function validateResearchLanguage(value, language, filename, validPages, output) {
  if (!substantive(value?.summary)) output.push(`${filename}: ${language}.summary is missing`)
  if (!substantive(value?.plainEnglish)) output.push(`${filename}: ${language}.plainEnglish is missing`)
  for (const field of ['legalReading', 'caseConnections', 'whyItMatters', 'verificationTasks', 'riskFlags']) {
    if (!Array.isArray(value?.[field]) || !value[field].some(substantive)) output.push(`${filename}: ${language}.${field} is missing`)
  }
  if (!Array.isArray(value?.findings) || value.findings.length === 0) {
    output.push(`${filename}: ${language}.findings is missing`)
    return
  }
  for (const [index, finding] of value.findings.entries()) {
    if (!substantive(finding?.section) || !substantive(finding?.text)) output.push(`${filename}: ${language}.findings[${index}] is incomplete`)
    if (!Array.isArray(finding?.pages) || finding.pages.length === 0 || finding.pages.some((page) => !validPages.has(Number(page)))) {
      output.push(`${filename}: ${language}.findings[${index}] cites a missing page`)
    }
  }
}

async function jsonFiles(directory) {
  return (await readdir(directory).catch((error) => error?.code === 'ENOENT' ? [] : Promise.reject(error)))
    .filter((filename) => /^[a-f0-9]{64}\.json$/.test(filename))
    .sort()
}

async function readJson(filename, output) {
  try {
    return JSON.parse(await readFile(filename, 'utf8'))
  } catch (error) {
    output.push(`${path.basename(filename)}: invalid JSON (${error.message})`)
    return null
  }
}

function sourceHash(filename) {
  return filename.slice(0, -5)
}

function substantive(value) {
  return typeof value === 'string' && value.trim().length >= 2
}
