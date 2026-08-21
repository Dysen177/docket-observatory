import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { humanDocumentResearch } from '../server/human-legal-research.js'
import { auditDocumentAnalysisLanguage, auditDocumentAnalysisSemantics } from '../server/document-language-quality.js'
import { buildOfflineDocumentAnalysis } from '../server/document-analysis.js'
import { createSeedState } from '../server/seed.js'

const root = process.cwd()
const manifest = JSON.parse(await readFile(path.join(root, 'downloads', 'court-files-complete', 'manifest.json'), 'utf8'))
const searchIndex = JSON.parse(await readFile(path.join(root, 'server', 'cache', 'document-search-index.json'), 'utf8'))
const outputDir = path.join(root, 'output', 'research-audit')
const filesByHash = groupBy(
  (manifest.files ?? []).filter((file) => file.status !== 'error' && file.sha256),
  (file) => file.sha256,
)
const indexByHash = new Map((searchIndex.documents ?? []).map((document) => [document.contentSha256, document]))
const currentFilesByUrl = new Map((manifest.files ?? []).filter((file) => file?.url).map((file) => [file.url, file]))
const state = createSeedState()
const offlineFallbacks = new Map()

const documents = [...filesByHash.entries()].map(([sha256, files]) => {
  const indexed = indexByHash.get(sha256)
  const sourceLanguage = detectedSourceLanguage(indexed)
  const professionalReview = files.some((file) => humanDocumentResearch(file, 'en') && humanDocumentResearch(file, 'zh'))
  return {
    contentSha256: sha256,
    caseIds: unique(files.map((file) => file.caseId)),
    docketNumbers: unique(files.map((file) => file.docNumber).filter((value) => value != null).map(String)),
    titles: unique(files.map((file) => file.title).filter(Boolean)),
    filedAt: files.map((file) => file.filedAt).filter(Boolean).sort()[0] ?? null,
    sourceIds: unique(files.map((file) => file.sourceId).filter(Boolean)),
    sourceUrls: unique(files.map((file) => file.url).filter(Boolean)),
    physicalRecords: files.length,
    original: originalAssessment(indexed?.original),
    sourceLanguage,
    translation: {
      en: translationAssessment(indexed?.translations ?? [], 'en'),
      zh: translationAssessment(indexed?.translations ?? [], 'zh'),
    },
    legalAnalysis: {
      en: analysisAssessment(indexed?.analyses ?? [], 'en', professionalReview),
      zh: analysisAssessment(indexed?.analyses ?? [], 'zh', professionalReview),
    },
    professionalReview: {
      status: professionalReview ? 'completed' : 'pending',
      basis: professionalReview ? 'version_locked_editorial_legal_review' : 'local_rule_or_unreviewed_baseline',
    },
    releaseReady: professionalReview && translationReady(indexed?.translations ?? [], sourceLanguage),
  }
}).sort(compareDocuments)

const languageConsistency = await auditAnalysisCaches(path.join(root, 'server', 'cache', 'document-ai'), currentFilesByUrl)
const bilingualSemanticConsistency = await auditBilingualSemanticPairs(
  (manifest.files ?? []).filter((file) => file.status !== 'error' && file.sha256),
)

const summary = {
  generatedAt: new Date().toISOString(),
  manifestRecords: manifest.files?.length ?? 0,
  validPdfRecords: [...filesByHash.values()].reduce((total, files) => total + files.length, 0),
  uniquePdfContents: documents.length,
  originalText: countBy(documents, (document) => document.original.status),
  detectedSourceLanguage: countBy(documents, (document) => document.sourceLanguage),
  englishTarget: countBy(documents, (document) => document.translation.en.status),
  chineseTarget: countBy(documents, (document) => document.translation.zh.status),
  englishLegalAnalysis: countBy(documents, (document) => document.legalAnalysis.en.status),
  chineseLegalAnalysis: countBy(documents, (document) => document.legalAnalysis.zh.status),
  professionalReview: countBy(documents, (document) => document.professionalReview.status),
  releaseReady: documents.filter((document) => document.releaseReady).length,
  languageConsistency: {
    cachesScanned: languageConsistency.cachesScanned,
    recordsWithMismatches: languageConsistency.recordsWithMismatches,
    fieldMismatches: languageConsistency.issues.length,
    byLanguage: languageConsistency.byLanguage,
    byProvider: languageConsistency.byProvider,
    byField: languageConsistency.byField,
    ignoredStaleCaches: languageConsistency.ignoredStaleCaches,
  },
  semanticConsistency: {
    recordsWithConflicts: languageConsistency.recordsWithSemanticConflicts,
    fieldConflicts: languageConsistency.semanticIssues.length,
    byReason: languageConsistency.semanticByReason,
    byProvider: languageConsistency.semanticByProvider,
  },
  bilingualSemanticConsistency: {
    pairsCompared: bilingualSemanticConsistency.pairsCompared,
    pairsWithConflicts: bilingualSemanticConsistency.pairsWithConflicts,
    fieldConflicts: bilingualSemanticConsistency.issues.length,
    byReason: bilingualSemanticConsistency.byReason,
  },
  methodology: {
    unit: 'Unique PDF body by SHA-256; duplicate source records inherit the same body review.',
    professionalReview: 'Completed only when a version-locked bilingual editorial legal-review record matches the current SHA-256.',
    translation: 'Source-language retention is complete only for the same target language. Assistive glossary output remains incomplete.',
    legalAnalysis: 'Local deterministic rules remain available offline but do not count as individual professional review.',
  },
}

const payload = {
  schemaVersion: 3,
  summary,
  documents,
  languageConsistencyIssues: languageConsistency.issues,
  semanticConsistencyIssues: languageConsistency.semanticIssues,
  bilingualSemanticConsistencyIssues: bilingualSemanticConsistency.issues,
}
await mkdir(outputDir, { recursive: true })
await Promise.all([
  writeFile(path.join(outputDir, 'bilingual-review-audit.json'), `${JSON.stringify(payload, null, 2)}\n`),
  writeFile(path.join(outputDir, 'bilingual-review-audit.md'), renderMarkdown(summary)),
])
console.log(JSON.stringify(summary, null, 2))
if (languageConsistency.issues.length || languageConsistency.semanticIssues.length || bilingualSemanticConsistency.issues.length) process.exitCode = 1

async function auditAnalysisCaches(directory, currentByUrl) {
  const filenames = (await readdir(directory).catch(() => [])).filter((filename) => filename.endsWith('.json'))
  const result = {
    cachesScanned: 0,
    recordsWithMismatches: 0,
    issues: [],
    byLanguage: {},
    byProvider: {},
    byField: {},
    ignoredStaleCaches: 0,
    recordsWithSemanticConflicts: 0,
    semanticIssues: [],
    semanticByReason: {},
    semanticByProvider: {},
  }
  for (let offset = 0; offset < filenames.length; offset += 8) {
    const batch = await Promise.all(filenames.slice(offset, offset + 8).map(async (filename) => {
      try {
        return [filename, JSON.parse(await readFile(path.join(directory, filename), 'utf8'))]
      } catch {
        return [filename, null]
      }
    }))
    for (const [filename, value] of batch) {
      if (!value) continue
      result.cachesScanned += 1
      const currentFile = currentByUrl.get(value.sourceUrl)
      if (!currentFile || currentFile.sha256 !== value.sourceSha256) {
        result.ignoredStaleCaches += 1
        continue
      }
      const language = analysisLanguage(value)
      const issues = auditDocumentAnalysisLanguage(value, language)
      const fallback = await offlineFallback(currentFile, language)
      const semanticIssues = auditDocumentAnalysisSemantics(value, fallback)
      if (semanticIssues.length) {
        result.recordsWithSemanticConflicts += 1
        increment(result.semanticByProvider, value?.aiStatus?.provider ?? 'unknown')
        for (const issue of semanticIssues) {
          increment(result.semanticByReason, issue.reason)
          result.semanticIssues.push({
            cacheFile: filename,
            sourceUrl: value.sourceUrl ?? null,
            sourceSha256: value.sourceSha256 ?? null,
            provider: value?.aiStatus?.provider ?? null,
            language,
            ...issue,
          })
        }
      }
      if (!issues.length) continue
      result.recordsWithMismatches += 1
      increment(result.byLanguage, language)
      increment(result.byProvider, value?.aiStatus?.provider ?? 'unknown')
      for (const issue of issues) {
        const field = issue.fieldPath.replace(/\[\d+\]/gu, '[]')
        increment(result.byField, field)
        result.issues.push({
          cacheFile: filename,
          sourceUrl: value.sourceUrl ?? null,
          sourceSha256: value.sourceSha256 ?? null,
          provider: value?.aiStatus?.provider ?? null,
          ...issue,
        })
      }
    }
  }
  return result
}

async function offlineFallback(file, language) {
  const key = `${file.url}|${file.sha256}|${language}`
  let pending = offlineFallbacks.get(key)
  if (!pending) {
    pending = buildOfflineDocumentAnalysis(file, state, language)
    offlineFallbacks.set(key, pending)
  }
  return pending
}

async function auditBilingualSemanticPairs(files) {
  const result = { pairsCompared: 0, pairsWithConflicts: 0, issues: [], byReason: {} }
  for (let offset = 0; offset < files.length; offset += 16) {
    const batch = await Promise.all(files.slice(offset, offset + 16).map(async (file) => {
      const [zh, en] = await Promise.all([offlineFallback(file, 'zh'), offlineFallback(file, 'en')])
      return { file, zh, en, issues: compareBilingualSemanticPair(zh, en) }
    }))
    for (const { file, issues } of batch) {
      result.pairsCompared += 1
      if (!issues.length) continue
      result.pairsWithConflicts += 1
      for (const issue of issues) {
        increment(result.byReason, issue.reason)
        result.issues.push({
          sourceUrl: file.url,
          sourceSha256: file.sha256,
          caseId: file.caseId ?? null,
          docNumber: file.docNumber ?? null,
          ...issue,
        })
      }
    }
  }
  return result
}

function compareBilingualSemanticPair(zh, en) {
  const issues = []
  for (const key of ['typeKey', 'reliefKey', 'outcomeKey']) {
    const zhValue = zh?.offlineRead?.[key] ?? null
    const enValue = en?.offlineRead?.[key] ?? null
    if (zhValue !== enValue) issues.push({ reason: `offline_${key}_mismatch`, fieldPath: `offlineRead.${key}`, zh: zhValue, en: enValue })
  }
  const zhFacts = criticalFactFingerprint(zh)
  const enFacts = criticalFactFingerprint(en)
  for (const key of ['dates', 'amounts', 'statutes']) {
    if (sameValues(zhFacts[key], enFacts[key])) continue
    issues.push({ reason: `${key}_mismatch`, fieldPath: key, zh: zhFacts[key], en: enFacts[key] })
  }
  return issues
}

function criticalFactFingerprint(record) {
  return record?.criticalFacts ?? { dates: [], amounts: [], statutes: [] }
}

function sameValues(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort())
}

function analysisLanguage(value) {
  if (value?.analysisLanguage === 'en' || value?.analysisLanguage === 'zh') return value.analysisLanguage
  return /[\u3400-\u9fff]/u.test([value?.summary, value?.plainEnglish, ...(value?.legalReading ?? [])].join(' ')) ? 'zh' : 'en'
}

function increment(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1
}

function detectedSourceLanguage(document) {
  const retained = (document?.translations ?? []).filter((entry) => entry.status === 'no_translation_needed')
  const complete = retained.find((entry) => entry.coverage === 'complete') ?? retained[0]
  return complete?.language ?? 'unknown'
}

function originalAssessment(original) {
  if (!original) return { status: 'missing', coverage: 'missing', pagesParsed: 0, totalPages: null, ocrUsed: false }
  return {
    status: original.coverage === 'complete' ? 'complete' : 'partial',
    coverage: original.coverage ?? 'partial',
    pagesParsed: Number(original.pagesParsed ?? 0),
    totalPages: original.totalPages ?? null,
    ocrUsed: Boolean(original.ocrUsed),
  }
}

function translationAssessment(entries, language) {
  const candidates = entries.filter((entry) => entry.language === language).sort((left, right) => translationWeight(right) - translationWeight(left))
  const best = candidates[0]
  if (!best) return { status: 'missing', coverage: 'missing', contentIntegrity: 'missing', mode: null }
  if (best.status === 'no_translation_needed') {
    return {
      status: best.coverage === 'complete' ? 'source_retained_complete' : 'source_retained_partial',
      coverage: best.coverage ?? 'partial',
      contentIntegrity: best.contentIntegrity ?? 'source_unchanged',
      mode: best.mode ?? null,
    }
  }
  if (best.status === 'translated' && best.coverage === 'complete' && best.contentIntegrity === 'version_locked_complete') {
    return { status: 'reviewed_complete', coverage: 'complete', contentIntegrity: best.contentIntegrity, mode: best.mode ?? null }
  }
  if (best.status === 'translated' && best.coverage === 'complete' && best.contentIntegrity !== 'assistive_glossary') {
    return { status: 'complete_unreviewed', coverage: 'complete', contentIntegrity: best.contentIntegrity ?? 'unknown', mode: best.mode ?? null }
  }
  if (best.status === 'assistive_only' || best.contentIntegrity === 'assistive_glossary') {
    return { status: 'assistive_incomplete', coverage: best.coverage ?? 'partial', contentIntegrity: best.contentIntegrity ?? 'assistive_glossary', mode: best.mode ?? null }
  }
  return { status: 'incomplete', coverage: best.coverage ?? 'partial', contentIntegrity: best.contentIntegrity ?? 'unknown', mode: best.mode ?? null }
}

function translationWeight(entry) {
  if (entry.status === 'no_translation_needed' && entry.coverage === 'complete') return 5
  if (entry.status === 'translated' && entry.coverage === 'complete' && entry.contentIntegrity !== 'assistive_glossary') return 4
  if (entry.status === 'no_translation_needed') return 3
  if (entry.status === 'assistive_only') return 2
  return 1
}

function analysisAssessment(entries, language, professionalReview) {
  const candidates = entries.filter((entry) => entry.language === language)
  if (professionalReview && candidates.some((entry) => entry.provider === 'human_research')) {
    return { status: 'professionally_reviewed', provider: 'human_research' }
  }
  const generated = candidates.find((entry) => ['openai', 'anthropic', 'gemini', 'openai_compatible', 'ollama'].includes(entry.provider))
  if (generated) return { status: 'generated_unreviewed', provider: generated.provider }
  const local = candidates.find((entry) => entry.provider === 'local_rules')
  if (local) return { status: 'local_rule_first_read', provider: 'local_rules' }
  return { status: 'missing', provider: null }
}

function translationReady(entries, sourceLanguage) {
  return ['en', 'zh'].every((language) => {
    const assessment = translationAssessment(entries, language)
    if (language === sourceLanguage) return assessment.status === 'source_retained_complete'
    return ['reviewed_complete', 'complete_unreviewed', 'source_retained_complete'].includes(assessment.status)
  })
}

function compareDocuments(left, right) {
  return String(left.caseIds[0] ?? '').localeCompare(String(right.caseIds[0] ?? ''))
    || compareDocketNumbers(left.docketNumbers[0], right.docketNumbers[0])
    || left.contentSha256.localeCompare(right.contentSha256)
}

function compareDocketNumbers(left, right) {
  const leftParts = String(left ?? '').split('-').map(Number)
  const rightParts = String(right ?? '').split('-').map(Number)
  return (leftParts[0] || 0) - (rightParts[0] || 0) || (leftParts[1] || 0) - (rightParts[1] || 0)
}

function groupBy(values, keyFor) {
  const groups = new Map()
  for (const value of values) {
    const key = keyFor(value)
    const group = groups.get(key) ?? []
    group.push(value)
    groups.set(key, group)
  }
  return groups
}

function countBy(values, keyFor) {
  return values.reduce((counts, value) => {
    const key = keyFor(value)
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

function unique(values) {
  return [...new Set(values)]
}

function renderMarkdown(value) {
  return `# Bilingual legal-review audit\n\nGenerated: ${value.generatedAt}\n\n- Unique PDF contents: ${value.uniquePdfContents}\n- Professional reviews completed: ${value.professionalReview.completed ?? 0}\n- Professional reviews pending: ${value.professionalReview.pending ?? 0}\n- Release-ready bilingual records: ${value.releaseReady}\n- Analysis caches scanned for language consistency: ${value.languageConsistency.cachesScanned}\n- Records with wrong-language prose: ${value.languageConsistency.recordsWithMismatches}\n- Wrong-language fields: ${value.languageConsistency.fieldMismatches}\n- Records with high-risk semantic conflicts: ${value.semanticConsistency.recordsWithConflicts}\n- High-risk semantic field conflicts: ${value.semanticConsistency.fieldConflicts}\n- Chinese/English document pairs compared: ${value.bilingualSemanticConsistency.pairsCompared}\n- Chinese/English pairs with fact conflicts: ${value.bilingualSemanticConsistency.pairsWithConflicts}\n\n## Language consistency by field\n\n${renderCounts(value.languageConsistency.byField) || '- none'}\n\n## Semantic conflicts by reason\n\n${renderCounts(value.semanticConsistency.byReason) || '- none'}\n\n## Bilingual fact conflicts by reason\n\n${renderCounts(value.bilingualSemanticConsistency.byReason) || '- none'}\n\n## English target\n\n${renderCounts(value.englishTarget)}\n\n## Chinese target\n\n${renderCounts(value.chineseTarget)}\n\n## English legal analysis\n\n${renderCounts(value.englishLegalAnalysis)}\n\n## Chinese legal analysis\n\n${renderCounts(value.chineseLegalAnalysis)}\n`
}

function renderCounts(values) {
  return Object.entries(values).map(([key, count]) => `- ${key}: ${count}`).join('\n')
}
