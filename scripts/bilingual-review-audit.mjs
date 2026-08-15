import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { humanDocumentResearch } from '../server/human-legal-research.js'

const root = process.cwd()
const manifest = JSON.parse(await readFile(path.join(root, 'downloads', 'court-files-complete', 'manifest.json'), 'utf8'))
const searchIndex = JSON.parse(await readFile(path.join(root, 'server', 'cache', 'document-search-index.json'), 'utf8'))
const outputDir = path.join(root, 'output', 'research-audit')
const filesByHash = groupBy(
  (manifest.files ?? []).filter((file) => file.status !== 'error' && file.sha256),
  (file) => file.sha256,
)
const indexByHash = new Map((searchIndex.documents ?? []).map((document) => [document.contentSha256, document]))

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
  methodology: {
    unit: 'Unique PDF body by SHA-256; duplicate source records inherit the same body review.',
    professionalReview: 'Completed only when a version-locked bilingual editorial legal-review record matches the current SHA-256.',
    translation: 'Source-language retention is complete only for the same target language. Assistive glossary output remains incomplete.',
    legalAnalysis: 'Local deterministic rules remain available offline but do not count as individual professional review.',
  },
}

const payload = { schemaVersion: 1, summary, documents }
await mkdir(outputDir, { recursive: true })
await Promise.all([
  writeFile(path.join(outputDir, 'bilingual-review-audit.json'), `${JSON.stringify(payload, null, 2)}\n`),
  writeFile(path.join(outputDir, 'bilingual-review-audit.md'), renderMarkdown(summary)),
])
console.log(JSON.stringify(summary, null, 2))

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
  return `# Bilingual legal-review audit\n\nGenerated: ${value.generatedAt}\n\n- Unique PDF contents: ${value.uniquePdfContents}\n- Professional reviews completed: ${value.professionalReview.completed ?? 0}\n- Professional reviews pending: ${value.professionalReview.pending ?? 0}\n- Release-ready bilingual records: ${value.releaseReady}\n\n## English target\n\n${renderCounts(value.englishTarget)}\n\n## Chinese target\n\n${renderCounts(value.chineseTarget)}\n\n## English legal analysis\n\n${renderCounts(value.englishLegalAnalysis)}\n\n## Chinese legal analysis\n\n${renderCounts(value.chineseLegalAnalysis)}\n`
}

function renderCounts(values) {
  return Object.entries(values).map(([key, count]) => `- ${key}: ${count}`).join('\n')
}
