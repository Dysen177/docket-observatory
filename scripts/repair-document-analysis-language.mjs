import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { atomicWriteJson } from '../server/atomic-write.js'
import {
  auditDocumentAnalysisLanguage,
  auditDocumentAnalysisSemantics,
  documentLanguageQualityVersion,
  repairDocumentAnalysisLanguage,
} from '../server/document-language-quality.js'
import { buildOfflineDocumentAnalysis } from '../server/document-analysis.js'
import { createSeedState } from '../server/seed.js'

const root = process.cwd()
const cacheDirectory = path.resolve(process.env.GUO_INTEL_CACHE_DIR ?? path.join(root, 'server', 'cache'), 'document-ai')
const manifest = JSON.parse(await readFile(path.join(root, 'downloads', 'court-files-complete', 'manifest.json'), 'utf8'))
const state = createSeedState()
const filesByUrl = new Map((manifest.files ?? []).filter((file) => file?.url).map((file) => [file.url, file]))
const fallbackByFileAndLanguage = new Map()
const filenames = (await readdir(cacheDirectory)).filter((filename) => filename.endsWith('.json'))
const report = {
  scanned: 0,
  repaired: 0,
  correctedFields: 0,
  languageIssues: 0,
  semanticIssues: 0,
  semanticFallbacks: 0,
  unresolved: [],
  skippedStale: 0,
  parseErrors: 0,
}

for (let offset = 0; offset < filenames.length; offset += 12) {
  await Promise.all(filenames.slice(offset, offset + 12).map(async (filename) => {
    const cachePath = path.join(cacheDirectory, filename)
    let value
    try {
      value = JSON.parse(await readFile(cachePath, 'utf8'))
    } catch {
      report.parseErrors += 1
      return
    }
    report.scanned += 1
    const language = analysisLanguage(value)
    const file = filesByUrl.get(value.sourceUrl)
    if (!file || file.sha256 !== value.sourceSha256) {
      report.skippedStale += 1
      return
    }
    const fallback = await offlineFallback(file, language)
    const languageIssues = auditDocumentAnalysisLanguage(value, language)
    const semanticIssues = auditDocumentAnalysisSemantics(value, fallback)
    report.languageIssues += languageIssues.length
    report.semanticIssues += semanticIssues.length
    const needsVersionUpgrade = value?.languageQuality?.version !== documentLanguageQualityVersion
    const repaired = repairDocumentAnalysisLanguage(value, fallback, language)
    if (!languageIssues.length && !semanticIssues.length && !needsVersionUpgrade && !repaired.correctedFields.length) return
    if (repaired.unresolvedIssues.length || repaired.unresolvedSemanticIssues.length) {
      report.unresolved.push({
        filename,
        sourceUrl: value.sourceUrl,
        languageIssues: repaired.unresolvedIssues,
        semanticIssues: repaired.unresolvedSemanticIssues,
      })
      return
    }
    await atomicWriteJson(cachePath, repaired.record, { directoryMode: 0o700 })
    report.repaired += 1
    report.correctedFields += repaired.correctedFields.length
    if (repaired.record?.languageQuality?.semanticFallback) report.semanticFallbacks += 1
  }))
}

const outputDirectory = path.join(root, 'output', 'research-audit')
await mkdir(outputDirectory, { recursive: true })
await writeFile(path.join(outputDirectory, 'document-language-repair.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({
  scanned: report.scanned,
  repaired: report.repaired,
  correctedFields: report.correctedFields,
  languageIssues: report.languageIssues,
  semanticIssues: report.semanticIssues,
  semanticFallbacks: report.semanticFallbacks,
  unresolved: report.unresolved.length,
  skippedStale: report.skippedStale,
  parseErrors: report.parseErrors,
}, null, 2))
if (report.unresolved.length || report.parseErrors) process.exitCode = 1

async function offlineFallback(file, language) {
  const key = `${file.url}|${file.sha256}|${language}`
  let pending = fallbackByFileAndLanguage.get(key)
  if (!pending) {
    pending = buildOfflineDocumentAnalysis(file, state, language)
    fallbackByFileAndLanguage.set(key, pending)
  }
  return pending
}

function analysisLanguage(value) {
  if (value?.analysisLanguage === 'en' || value?.analysisLanguage === 'zh') return value.analysisLanguage
  return /[\u3400-\u9fff]/u.test([value?.summary, value?.plainEnglish, ...(value?.legalReading ?? [])].join(' ')) ? 'zh' : 'en'
}
