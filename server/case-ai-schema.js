export const caseAiCacheVersion = 'case-ai-v11'

const citationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['evidenceId', 'pageNumber'],
  properties: {
    evidenceId: { type: 'string' },
    pageNumber: { type: ['integer', 'null'] },
  },
}

const findingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text', 'confidence', 'citations'],
  properties: {
    text: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    citations: { type: 'array', items: citationSchema },
  },
}

const sectionNames = [
  'bottomLine',
  'proceduralPosture',
  'courtConfirmedMaterial',
  'contestedPositions',
  'crossCaseConnections',
  'evidenceGaps',
  'watchNext',
]

export const caseDossierSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mode', 'confidence', ...sectionNames, 'limitations'],
  properties: {
    mode: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    ...Object.fromEntries(sectionNames.map((name) => [name, { type: 'array', items: findingSchema }])),
    limitations: { type: 'string' },
  },
}

export function caseDossierEvidenceIndex(evidence) {
  const records = []
  if (evidence?.caseMetadata?.id) {
    records.push({
      id: evidence.caseMetadata.id,
      label: evidence.caseMetadata.label || evidence.caseMetadata.id,
      kind: 'case',
      pages: [],
    })
  }
  for (const event of evidence?.events ?? []) {
    if (!event?.id) continue
    records.push({ id: event.id, label: event.label || event.title || event.id, kind: 'event', pages: [] })
  }
  for (const document of evidence?.documents ?? []) {
    if (!document?.id) continue
    records.push({
      id: document.id,
      label: document.docNumber ? `Doc ${document.docNumber}` : document.title || document.id,
      kind: 'document',
      pages: [...new Set((document.extraction?.pages ?? [])
        .map((page) => Number(page?.pageNumber))
        .filter((pageNumber) => Number.isInteger(pageNumber) && pageNumber > 0))],
    })
  }
  return [...new Map(records.map((record) => [record.id, record])).values()]
}

export function validateCaseDossierAnalysis(value, evidenceIndex) {
  if (!isPlainObject(value) || !['low', 'medium', 'high'].includes(value.confidence)) {
    throw new Error('Cloud AI case dossier failed application schema validation.')
  }
  if (typeof value.mode !== 'string' || !value.mode.trim() || value.mode.length > 500) {
    throw new Error('Cloud AI case dossier has an invalid mode field.')
  }
  if (typeof value.limitations !== 'string' || value.limitations.length > 12000) {
    throw new Error('Cloud AI case dossier has an invalid limitations field.')
  }

  const allowedEvidence = new Map((evidenceIndex ?? []).map((record) => [record.id, {
    ...record,
    pages: new Set(record.pages ?? []),
  }]))
  for (const section of sectionNames) {
    const findings = value[section]
    if (!Array.isArray(findings) || findings.length > 20) {
      throw new Error(`Cloud AI case dossier has an invalid ${section} section.`)
    }
    if (section === 'bottomLine' && (findings.length < 1 || findings.length > 5)) {
      throw new Error('Cloud AI case dossier bottomLine must contain one to five findings.')
    }
    for (const finding of findings) validateFinding(finding, section, allowedEvidence)
  }
  return value
}

export function renderCaseDossierAnalysis(value, evidenceIndex, lang = 'zh') {
  const labels = new Map((evidenceIndex ?? []).map((record) => [record.id, record.label || record.id]))
  const headings = lang === 'en'
    ? {
        bottomLine: 'Bottom line',
        proceduralPosture: 'Procedural posture',
        courtConfirmedMaterial: 'Court-confirmed material',
        contestedPositions: 'Contested positions',
        crossCaseConnections: 'Cross-case connections',
        evidenceGaps: 'Evidence gaps',
        watchNext: 'Watch next',
        limitations: 'Limitations',
      }
    : {
        bottomLine: '核心结论',
        proceduralPosture: '程序姿态',
        courtConfirmedMaterial: '法院已确认材料',
        contestedPositions: '争议立场',
        crossCaseConnections: '跨案件关联',
        evidenceGaps: '证据缺口',
        watchNext: '后续观察',
        limitations: '分析限制',
      }
  const blocks = []
  for (const section of sectionNames) {
    const findings = value[section] ?? []
    const body = findings.length
      ? findings.map((finding) => `- ${finding.text} ${formatCitations(finding.citations, labels, lang)}`.trim()).join('\n')
      : lang === 'en' ? '- No supported finding generated.' : '- 暂无可由现有证据支持的结论。'
    blocks.push(`${headings[section]}\n${body}`)
  }
  blocks.push(`${headings.limitations}\n${value.limitations}`)
  return blocks.join('\n\n')
}

export function splitTextContinuously(value, chunkSize) {
  const text = String(value ?? '')
  const size = Math.max(1, Math.floor(Number(chunkSize) || 1))
  if (text.length <= size) return [text]
  const chunks = []
  for (let cursor = 0; cursor < text.length; cursor += size) chunks.push(text.slice(cursor, cursor + size))
  return chunks
}

function validateFinding(finding, section, allowedEvidence) {
  if (!isPlainObject(finding)
    || typeof finding.text !== 'string'
    || !finding.text.trim()
    || finding.text.length > 12000
    || !['low', 'medium', 'high'].includes(finding.confidence)
    || !Array.isArray(finding.citations)
    || finding.citations.length < 1
    || finding.citations.length > 12) {
    throw new Error(`Cloud AI case dossier contains an invalid finding in ${section}.`)
  }
  for (const citation of finding.citations) {
    if (!isPlainObject(citation) || typeof citation.evidenceId !== 'string') {
      throw new Error(`Cloud AI case dossier contains an invalid citation in ${section}.`)
    }
    const evidence = allowedEvidence.get(citation.evidenceId)
    if (!evidence) throw new Error(`Cloud AI case dossier cited an unapproved evidence id: ${citation.evidenceId}`)
    if (citation.pageNumber == null) continue
    if (!Number.isInteger(citation.pageNumber) || citation.pageNumber < 1 || !evidence.pages.has(citation.pageNumber)) {
      throw new Error(`Cloud AI case dossier cited an unavailable page for evidence id: ${citation.evidenceId}`)
    }
  }
}

function formatCitations(citations, labels, lang) {
  return `[${citations.map((citation) => {
    const label = labels.get(citation.evidenceId) || citation.evidenceId
    if (citation.pageNumber == null) return label
    return lang === 'en' ? `${label}, p. ${citation.pageNumber}` : `${label}，第 ${citation.pageNumber} 页`
  }).join('; ')}]`
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
