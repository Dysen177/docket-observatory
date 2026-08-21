import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { humanCaseResearch, humanDocumentResearch } from '../server/human-legal-research.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(projectRoot, 'downloads', 'court-files-complete', 'manifest.json')
const cacheRoot = path.join(projectRoot, 'server', 'cache')
const outputRoot = path.join(projectRoot, 'output', 'research-audit')

const sourcePriority = new Map([
  ['pacer', 5],
  ['courtlistener-recap', 4],
  ['sec-press-2023-50', 3],
  ['gtv-fair-fund', 3],
  ['doj-victim-page', 3],
  ['epiq-kwok-trustee', 2],
  ['nfsc-criminal-mirror', 1],
])

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const [extractions, translations, analyses, caseAnalyses] = await Promise.all([
  readJsonDirectory(path.join(cacheRoot, 'pdf-text'), compactExtraction),
  readJsonDirectory(path.join(cacheRoot, 'translations'), compactTranslation),
  readJsonDirectory(path.join(cacheRoot, 'document-ai'), compactAnalysis),
  readJsonDirectory(path.join(cacheRoot, 'case-ai'), compactCaseAnalysis),
])

const extractionByHash = indexBy(extractions, (item) => item.signature?.manifestSha256 || item.signature?.contentSha256)
const translationByHash = indexBy(translations, (item) => item.sourceSha256)
const translationByUrl = indexBy(translations, (item) => item.sourceUrl)
const analysisByHash = indexBy(analyses, (item) => item.sourceSha256)
const analysisByUrl = indexBy(analyses, (item) => item.sourceUrl)

const physicalRecords = (manifest.files ?? []).map(auditPhysicalRecord)
const logicalDocuments = groupLogicalDocuments(physicalRecords)
const summary = buildSummary(physicalRecords, logicalDocuments)
const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  methodology: {
    logicalDocumentKey: 'caseId + docket document number; variants and duplicate sources are retained under one logical document',
    sourcePriority: ['PACER', 'CourtListener/RECAP', 'official agency', 'case administrator', 'NFSC backup mirror'],
    researchQuality: {
      body_verified: 'Local body text exists and all reported PDF pages were parsed without a character-limit truncation signal.',
      body_partial: 'Local body text exists, but only part of the PDF was parsed, text was truncated, or coverage is otherwise incomplete.',
      metadata_only: 'Only title, docket metadata, mirror summary, or a non-substantive extraction is available.',
      unavailable: 'The file failed to download, failed integrity/extraction checks, or is otherwise unavailable.',
    },
    caution: 'Body verification describes extraction coverage, not source authenticity. A readable NFSC copy remains a backup source.',
  },
  summary,
  logicalDocuments,
  caseAnalysisInventory: summarizeCaseAnalyses(caseAnalyses, manifest),
}

await mkdir(outputRoot, { recursive: true })
await Promise.all([
  writeFile(path.join(outputRoot, 'research-audit.json'), `${JSON.stringify(payload, null, 2)}\n`),
  writeFile(path.join(outputRoot, 'research-audit.md'), renderMarkdown(payload)),
])

console.log(JSON.stringify(summary, null, 2))

function auditPhysicalRecord(file) {
  const extraction = bestForFile(extractionByHash, null, file)
  const translation = bestForFile(translationByHash, translationByUrl, file)
  const analysis = bestAnalysisForFile(analysisByHash, analysisByUrl, file)
  const humanResearch = humanDocumentResearch(file, 'zh')
  const effectiveAnalysis = analysis ?? syntheticHumanAnalysis(humanResearch)
  const variant = documentVariant(file)
  const researchQuality = classifyResearchQuality(file, extraction)
  const translationQuality = classifyTranslation(translation, file)
  const analysisQuality = humanResearch ? 'human_research' : classifyAnalysis(analysis)
  const issues = [
    ...detectIssues({ file, extraction, translation, analysis: effectiveAnalysis, variant, researchQuality, translationQuality, analysisQuality }),
    ...(humanResearch?.posture === 'source_metadata_conflict' ? ['source_metadata_conflict'] : []),
  ]
  const originalTitle = file.title ?? ''
  const title = humanResearch?.posture === 'source_metadata_conflict'
    ? 'Document 765: source metadata conflicts with PDF body; official docket verification required'
    : originalTitle
  return {
    id: stableId(`${file.caseId}|${file.docNumber ?? ''}|${file.url ?? file.path ?? file.title}`),
    logicalKey: logicalKey(file),
    caseId: file.caseId ?? 'unassigned',
    docNumber: file.docNumber == null ? null : String(file.docNumber),
    title,
    originalTitle,
    filedAt: file.filedAt ?? null,
    sourceId: file.sourceId ?? '',
    sourceLabel: file.sourceLabel ?? '',
    sourceUrl: file.url ?? '',
    sourcePage: file.sourcePage ?? '',
    sourceTier: classifySource(file),
    sourcePriority: sourcePriority.get(file.sourceId) ?? 0,
    variant,
    localPath: file.path ?? '',
    status: file.status ?? '',
    sha256: file.sha256 ?? null,
    researchQuality,
    extraction: summarizeExtraction(extraction),
    translationQuality,
    translation: summarizeTranslation(translation),
    analysisQuality,
    analysis: summarizeAnalysis(effectiveAnalysis),
    issues,
  }
}

function syntheticHumanAnalysis(research) {
  if (!research) return null
  const findings = Array.isArray(research.content?.findings) ? research.content.findings : []
  return {
    provider: 'human_research',
    aiStatus: { provider: 'human_research', generated: true },
    aiFindings: findings,
    citations: findings.flatMap((item) => (item.pages ?? []).map((pageNumber) => ({
      pageNumber,
      originalText: item.text,
    }))),
  }
}

function classifyResearchQuality(file, extraction) {
  if (file.status === 'error') return 'unavailable'
  if (!file.path) return 'unavailable'
  if (!extraction) return 'metadata_only'
  if (['error', 'integrity_mismatch', 'download_error', 'outside_managed_library', 'file_too_large'].includes(extraction.status)) return 'unavailable'
  const chars = Number(extraction.charCount ?? extraction.snippet?.length ?? 0)
  if (extraction.status !== 'extracted' || chars < 80) return 'metadata_only'
  const totalPages = Number(extraction.totalPages ?? 0)
  const pagesParsed = Number(extraction.pagesParsed ?? 0)
  const pageComplete = totalPages > 0 && pagesParsed >= totalPages
  const charComplete = extraction.coverage === 'complete'
  return pageComplete && charComplete ? 'body_verified' : 'body_partial'
}

function classifyTranslation(value, file) {
  if (documentVariant(file) === 'chinese_reference_translation') return 'third_party_reference'
  if (!value) return 'missing'
  if (value.status === 'no_translation_needed' || value.mode === 'source-already-target-language') return 'not_needed'
  if (value.mode === '本地法律词表辅助译文；非完整法律翻译' || value.mode === 'local-legal-glossary') return 'glossary_assist'
  if (['requires-openai', 'body-transmission-disabled', 'source-language-retained'].includes(value.mode)) return 'pending'
  if (value.status === 'translated' && hasTranslatedText(value)) return 'complete_generated'
  return 'unknown'
}

function classifyAnalysis(value) {
  if (!value) return 'missing'
  const provider = value.aiStatus?.provider ?? value.provider ?? ''
  if (provider === 'local_rules') return 'local_rules'
  if (['openai', 'anthropic', 'gemini', 'openai_compatible'].includes(provider)) return provider
  if (provider === 'ollama') return 'ollama'
  if (provider === 'human_research') return 'human_research'
  return value.aiStatus?.generated ? 'unknown_generated' : 'unknown'
}

function detectIssues(context) {
  const { file, extraction, translation, analysis, variant, researchQuality, translationQuality, analysisQuality } = context
  const issues = []
  if (variant === 'chinese_reference_translation') issues.push('language_reference_copy')
  if (classifySource(file) === 'backup_mirror') issues.push('backup_source')
  if (!extraction || researchQuality === 'metadata_only') issues.push('no_body_extraction')
  if (researchQuality === 'body_partial') issues.push('partial_body_extraction')
  if (researchQuality === 'unavailable') issues.push('document_unavailable')
  if (translationQuality === 'missing' || translationQuality === 'pending') issues.push('complete_translation_missing')
  if (translationQuality === 'glossary_assist') issues.push('glossary_translation_not_complete')
  if (analysisQuality === 'missing') issues.push('document_analysis_missing')
  if (analysisQuality === 'local_rules') issues.push('local_rules_not_generative_ai')
  if (analysis && analysisQuality === 'local_rules' && researchQuality === 'metadata_only') issues.push('template_or_metadata_inference')
  const citations = Array.isArray(analysis?.citations) ? analysis.citations : []
  const validCitations = citations.filter((citation) => Number(citation?.pageNumber) > 0 && String(citation?.originalText ?? '').trim())
  if (analysis && validCitations.length === 0) issues.push('page_citations_missing')
  if (analysis && !hasStructuredFindings(analysis)) issues.push('structured_findings_missing')
  if (translation && translationQuality === 'complete_generated' && !hasTranslatedText(translation)) issues.push('translated_body_empty')
  return [...new Set(issues)]
}

function groupLogicalDocuments(records) {
  const groups = new Map()
  for (const record of records) {
    if (!groups.has(record.logicalKey)) groups.set(record.logicalKey, [])
    groups.get(record.logicalKey).push(record)
  }
  return [...groups.entries()].map(([key, variants]) => {
    variants.sort(compareVariants)
    const preferred = variants[0]
    return {
      key,
      caseId: preferred.caseId,
      docNumber: preferred.docNumber,
      title: preferred.title,
      preferredRecordId: preferred.id,
      bestSourceTier: preferred.sourceTier,
      researchQuality: bestQuality(variants.map((item) => item.researchQuality), ['body_verified', 'body_partial', 'metadata_only', 'unavailable']),
      translationQuality: bestQuality(variants.map((item) => item.translationQuality), ['complete_generated', 'not_needed', 'third_party_reference', 'glossary_assist', 'pending', 'missing', 'unknown']),
      analysisQuality: bestQuality(variants.map((item) => item.analysisQuality), ['human_research', 'openai', 'anthropic', 'gemini', 'openai_compatible', 'ollama', 'local_rules', 'unknown_generated', 'unknown', 'missing']),
      issues: [...new Set(variants.flatMap((item) => item.issues))],
      variants,
    }
  }).sort((a, b) => a.caseId.localeCompare(b.caseId) || compareDocNumbers(a.docNumber, b.docNumber))
}

function buildSummary(physical, logical) {
  const humanPhysical = physical.filter((item) => item.analysisQuality === 'human_research')
  const humanLogical = logical.filter((item) => item.analysisQuality === 'human_research')
  return {
    manifestEntries: physical.length,
    logicalDocuments: logical.length,
    localPdfEntries: physical.filter((item) => item.localPath && item.status !== 'error').length,
    sourceTiers: countBy(physical, (item) => item.sourceTier),
    physicalResearchQuality: countBy(physical, (item) => item.researchQuality),
    logicalResearchQuality: countBy(logical, (item) => item.researchQuality),
    logicalTranslationQuality: countBy(logical, (item) => item.translationQuality),
    logicalAnalysisQuality: countBy(logical, (item) => item.analysisQuality),
    humanResearch: {
      physicalDocuments: humanPhysical.length,
      logicalDocuments: humanLogical.length,
      cases: new Set(humanLogical.map((item) => item.caseId)).size,
      documents: humanLogical.map((item) => ({ caseId: item.caseId, docNumber: item.docNumber, title: item.title })),
    },
    issueCounts: countValues(logical.flatMap((item) => item.issues)),
    cacheInventory: {
      extractionFiles: extractions.length,
      translationFiles: translations.length,
      documentAnalysisFiles: analyses.length,
      caseAnalysisFiles: caseAnalyses.length,
      documentAnalysisByProvider: countBy(analyses, (item) => item.aiStatus?.provider ?? item.provider ?? 'unknown'),
      caseAnalysisByProvider: countBy(caseAnalyses, (item) => item.aiStatus?.provider ?? item.provider ?? 'unknown'),
    },
    humanCaseResearch: dataCaseResearch(manifest),
  }
}

function dataCaseResearch(manifest) {
  const caseIds = [...new Set((manifest.files ?? []).map((file) => file.caseId).filter(Boolean))]
  return {
    cases: caseIds.filter((caseId) => humanCaseResearch(caseId, manifest, 'zh')).length,
    caseIds: caseIds.filter((caseId) => humanCaseResearch(caseId, manifest, 'zh')),
  }
}

function summarizeExtraction(value) {
  if (!value) return null
  return {
    status: value.status ?? null,
    engine: value.engine ?? null,
    coverage: value.coverage ?? null,
    totalPages: value.totalPages ?? null,
    pagesParsed: value.pagesParsed ?? null,
    charCount: value.charCount ?? value.snippet?.length ?? 0,
    textHash: value.textHash ?? null,
    warning: value.warning ?? null,
  }
}

function summarizeTranslation(value) {
  if (!value) return null
  return {
    status: value.status ?? null,
    mode: value.mode ?? null,
    targetLanguage: value.targetLanguage ?? null,
    charCount: value.charCount ?? value.translatedText?.length ?? 0,
    coverage: value.coverage ?? null,
    sourceSha256: value.sourceSha256 ?? null,
  }
}

function summarizeAnalysis(value) {
  if (!value) return null
  const citations = Array.isArray(value.citations) ? value.citations : []
  return {
    provider: value.aiStatus?.provider ?? value.provider ?? null,
    mode: value.aiStatus?.mode ?? value.mode ?? null,
    generated: Boolean(value.aiStatus?.generated),
    citationCount: citations.length,
    citedPages: [...new Set(citations.map((item) => Number(item.pageNumber)).filter((page) => page > 0))],
    findingCount: value.findingCount ?? (Array.isArray(value.aiFindings) ? value.aiFindings.length : 0),
  }
}

function summarizeCaseAnalyses(values, manifest) {
  const humanCases = [...new Set((manifest?.files ?? []).map((file) => file.caseId).filter(Boolean))]
    .filter((caseId) => humanCaseResearch(caseId, manifest, 'zh'))
  return {
    totalCacheFiles: values.length,
    totalHumanResearchCases: humanCases.length,
    byProvider: {
      ...countBy(values, (item) => item.aiStatus?.provider ?? item.provider ?? 'unknown'),
      human_research: humanCases.length,
    },
    localRuleTemplates: values.filter((item) => (item.aiStatus?.provider ?? item.provider) === 'local_rules').length,
  }
}

function renderMarkdown(data) {
  const { summary: value } = data
  const lines = [
    '# 案卷研究覆盖审计',
    '',
    `生成时间：${data.generatedAt}`,
    '',
    '> 本报告衡量本地正文、翻译和解读的可核验覆盖。正文可读不等于来源已由 PACER 认证；NFSC 文件始终按备用镜像处理。',
    '',
    '## 总览',
    '',
    `- Manifest 条目：${value.manifestEntries}`,
    `- 合并语言副本及重复来源后的逻辑文件：${value.logicalDocuments}`,
    `- 有效本地 PDF 条目：${value.localPdfEntries}`,
    `- PDF 提取缓存：${value.cacheInventory.extractionFiles}`,
    `- 翻译缓存：${value.cacheInventory.translationFiles}`,
    `- 文件级解读缓存：${value.cacheInventory.documentAnalysisFiles}`,
    `- 案件级解读缓存：${value.cacheInventory.caseAnalysisFiles}`,
    '',
    '## 逻辑文件质量',
    '',
    ...renderCounts(value.logicalResearchQuality),
    '',
    '## 翻译质量',
    '',
    ...renderCounts(value.logicalTranslationQuality),
    '',
    '## 解读质量',
    '',
    ...renderCounts(value.logicalAnalysisQuality),
    '',
    '## 版本锁定法律复核',
    '',
    `- 物理文件条目：${value.humanResearch.physicalDocuments}`,
    `- 逻辑文件：${value.humanResearch.logicalDocuments}`,
    `- 涉及案件：${value.humanResearch.cases}`,
    ...value.humanResearch.documents.map((item) => `- ${item.caseId} Doc ${item.docNumber ?? 'n/a'}：${item.title}`),
    '',
    '## 主要问题',
    '',
    ...renderCounts(value.issueCounts),
    '',
    '## 方法限制',
    '',
    '- `body_verified` 仅表示本地提取覆盖全部报告页数，不表示 PDF 来源已由 PACER 认证。',
    '- 中文参考译本属于第三方语言副本，不作为独立案卷文件计数，也不自动视为完整、准确的法律翻译。',
    '- 本地规则结果属于检索与分类辅助；没有正文级事实提取和页码支持时，不计为律师式深度解读。',
    '- 起诉书、动议、答辩和第三方申请中的陈述属于相应当事方主张，除非操作性裁判明确采纳，不得表述为法院认定。',
    '',
  ]
  return `${lines.join('\n')}\n`
}

function renderCounts(value) {
  return Object.entries(value).sort((a, b) => b[1] - a[1]).map(([key, count]) => `- ${key}: ${count}`)
}

function classifySource(file) {
  if (file.sourceId === 'pacer') return 'official_pacer'
  if (file.sourceId === 'courtlistener-recap') return 'public_recap'
  if (['sec-press-2023-50', 'gtv-fair-fund', 'doj-victim-page'].includes(file.sourceId)) return 'official_agency'
  if (file.sourceId === 'epiq-kwok-trustee') return 'case_administrator'
  if (file.sourceId === 'nfsc-criminal-mirror') return 'backup_mirror'
  return 'other_public_source'
}

function documentVariant(file) {
  const text = [file.title, file.url, file.filename, file.path, file.finalUrl].filter(Boolean).map(decodeSafely).join(' ').toLowerCase()
  return text.includes('中文翻译仅供参考')
    || text.includes('中文版本仅供参考')
    || text.includes('翻译排版')
    || text.includes('(中文)')
    || /(?:^|[\s/_-])(?:cn|zh)(?:[._/-]|\s|$)/u.test(text)
    ? 'chinese_reference_translation'
    : 'source_original'
}

function logicalKey(file) {
  const caseId = file.caseId ?? 'unassigned'
  const docNumber = file.docNumber == null ? '' : String(file.docNumber).trim()
  if (docNumber) return `${caseId}|doc:${docNumber.toLowerCase()}`
  return `${caseId}|item:${stableId(file.url ?? file.path ?? file.title ?? '')}`
}

function compareVariants(a, b) {
  if (a.variant !== b.variant) return a.variant === 'source_original' ? -1 : 1
  if (a.sourcePriority !== b.sourcePriority) return b.sourcePriority - a.sourcePriority
  const quality = ['body_verified', 'body_partial', 'metadata_only', 'unavailable']
  return quality.indexOf(a.researchQuality) - quality.indexOf(b.researchQuality)
}

function compareDocNumbers(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true })
}

function bestQuality(values, order) {
  return [...values].sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? order.at(-1)
}

function bestForFile(byHash, byUrl, file) {
  const hashMatches = file.sha256 ? byHash.get(file.sha256) ?? [] : []
  const urlMatches = byUrl && file.url ? byUrl.get(file.url) ?? [] : []
  return [...hashMatches, ...urlMatches].sort((a, b) => timestamp(b) - timestamp(a))[0] ?? null
}

function bestAnalysisForFile(byHash, byUrl, file) {
  const providerRank = {
    human_research: 5,
    openai: 4,
    anthropic: 4,
    gemini: 4,
    openai_compatible: 4,
    ollama: 4,
    local_rules: 2,
  }
  const hashMatches = file.sha256 ? byHash.get(file.sha256) ?? [] : []
  const urlMatches = file.url ? byUrl.get(file.url) ?? [] : []
  return [...hashMatches, ...urlMatches].sort((a, b) => {
    const leftProvider = a?.aiStatus?.provider ?? a?.provider ?? ''
    const rightProvider = b?.aiStatus?.provider ?? b?.provider ?? ''
    return (providerRank[rightProvider] ?? 0) - (providerRank[leftProvider] ?? 0) || timestamp(b) - timestamp(a)
  })[0] ?? null
}

function timestamp(value) {
  return Date.parse(value?.reviewedAt ?? value?.generatedAt ?? value?.translatedAt ?? value?.extractedAt ?? 0) || 0
}

function indexBy(values, keyFor) {
  const result = new Map()
  for (const value of values) {
    const key = keyFor(value)
    if (!key) continue
    if (!result.has(key)) result.set(key, [])
    result.get(key).push(value)
  }
  return result
}

async function readJsonDirectory(directory, compact = (value) => value) {
  let entries = []
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  const values = []
  for (const entry of files) {
    try {
      const value = compact(JSON.parse(await readFile(path.join(directory, entry.name), 'utf8')))
      if (value) values.push(value)
    } catch {
      // Invalid cache entries are omitted from inventory and surfaced as missing coverage.
    }
  }
  return values
}

function compactExtraction(value) {
  return {
    signature: {
      manifestSha256: value.signature?.manifestSha256 ?? null,
      contentSha256: value.signature?.contentSha256 ?? null,
    },
    status: value.status ?? null,
    engine: value.engine ?? null,
    coverage: value.coverage ?? null,
    totalPages: value.totalPages ?? null,
    pagesParsed: value.pagesParsed ?? null,
    charCount: Number(value.charCount ?? value.snippet?.length ?? 0),
    textHash: value.textHash ?? null,
    warning: value.warning ?? null,
    extractedAt: value.extractedAt ?? null,
  }
}

function compactTranslation(value) {
  return {
    sourceSha256: value.sourceSha256 ?? null,
    sourceUrl: value.sourceUrl ?? null,
    status: value.status ?? null,
    mode: value.mode ?? null,
    targetLanguage: value.targetLanguage ?? null,
    charCount: Number(value.charCount ?? value.translatedText?.length ?? 0),
    hasTranslatedText: Boolean(String(value.translatedText ?? '').trim()),
    coverage: value.coverage ?? null,
    reviewedAt: value.reviewedAt ?? null,
    generatedAt: value.generatedAt ?? null,
    translatedAt: value.translatedAt ?? null,
  }
}

function compactAnalysis(value) {
  const citations = Array.isArray(value.citations) ? value.citations : []
  return {
    sourceSha256: value.sourceSha256 ?? null,
    sourceUrl: value.sourceUrl ?? null,
    provider: value.provider ?? null,
    mode: value.mode ?? null,
    aiStatus: {
      provider: value.aiStatus?.provider ?? null,
      mode: value.aiStatus?.mode ?? null,
      generated: Boolean(value.aiStatus?.generated),
    },
    citations: citations.map((citation) => ({
      pageNumber: citation?.pageNumber ?? null,
      originalText: Boolean(String(citation?.originalText ?? '').trim()),
    })),
    structuredFindings: Array.isArray(value.aiFindings),
    findingCount: Array.isArray(value.aiFindings) ? value.aiFindings.length : 0,
    reviewedAt: value.reviewedAt ?? null,
    generatedAt: value.generatedAt ?? null,
  }
}

function compactCaseAnalysis(value) {
  return {
    provider: value.provider ?? null,
    aiStatus: {
      provider: value.aiStatus?.provider ?? null,
    },
  }
}

function hasTranslatedText(value) {
  return value?.hasTranslatedText ?? Boolean(String(value?.translatedText ?? '').trim())
}

function hasStructuredFindings(value) {
  return value?.structuredFindings ?? Array.isArray(value?.aiFindings)
}

function countBy(values, keyFor) {
  const result = {}
  for (const value of values) {
    const key = keyFor(value) || 'unknown'
    result[key] = (result[key] ?? 0) + 1
  }
  return result
}

function countValues(values) {
  return countBy(values, (value) => value)
}

function stableId(value) {
  return createHash('sha1').update(String(value)).digest('hex').slice(0, 16)
}

function decodeSafely(value) {
  try {
    return decodeURIComponent(String(value))
  } catch {
    return String(value)
  }
}
