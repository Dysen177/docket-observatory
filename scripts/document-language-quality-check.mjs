import assert from 'node:assert/strict'
import {
  auditDocumentAnalysisLanguage,
  auditDocumentAnalysisSemantics,
  localizeDateSignals,
  localizedTextMismatch,
  repairDocumentAnalysisLanguage,
} from '../server/document-language-quality.js'

const citations = [{ kind: 'source_metadata', pageNumber: null }]
const fallbackZh = fixture('zh', {
  title: '文件 264：共同拟议的陪审团指示',
  summary: '这是一份由控辩双方共同提交的拟议陪审团指示。',
  plainEnglish: '通俗地说，双方在审判前向法官建议应如何向陪审团解释法律规则。',
  legalReading: ['程序姿态：当事方共同提交的审判文件，不是法院已经采纳的最终指示。'],
})
const fallbackEn = fixture('en', {
  title: 'Document 264: Joint proposed jury instructions',
  summary: 'The parties jointly submitted proposed jury instructions.',
  plainEnglish: 'In plain terms, both sides suggested how the judge should explain the law to the jury.',
  legalReading: ['Procedural posture: a joint trial filing, not the final instructions adopted by the court.'],
})

const staleDate = fixture('zh', { publishedAt: null })
const currentDate = fixture('zh', { publishedAt: '2024-04-09' })
const repairedDate = repairDocumentAnalysisLanguage(staleDate, currentDate, 'zh')
assert.equal(repairedDate.record.publishedAt, '2024-04-09')
assert.ok(repairedDate.correctedFields.includes('publishedAt'))

const badZh = fixture('zh', {
  ...fallbackZh,
  plainEnglish: 'This document is an application or motion in a criminal case, requesting dismissal of the charges.',
})
badZh.aiFindings = findingsFor(badZh)
const repairedZh = repairDocumentAnalysisLanguage(badZh, fallbackZh, 'zh')
assert.equal(repairedZh.record.plainEnglish, fallbackZh.plainEnglish)
assert.equal(repairedZh.record.summary, badZh.summary)
assert.equal(repairedZh.unresolvedIssues.length, 0)
assert.equal(repairedZh.record.aiFindings.some((finding) => finding.text === fallbackZh.plainEnglish), true)
assert.equal(repairedZh.record.aiFindings.some((finding) => /This document is/u.test(finding.text)), false)

const badEn = fixture('en', {
  ...fallbackEn,
  legalReading: ['程序姿态：这是法院命令。', fallbackEn.legalReading[0]],
})
const repairedEn = repairDocumentAnalysisLanguage(badEn, fallbackEn, 'en')
assert.deepEqual(repairedEn.record.legalReading, fallbackEn.legalReading)
assert.equal(repairedEn.unresolvedIssues.length, 0)

const semanticFallbackZh = fixture('zh', {
  ...fallbackZh,
  offlineRead: {
    typeKey: 'jury_instructions',
    reliefKey: null,
    specificity: 2,
    citations,
  },
})
const semanticConflictZh = fixture('zh', {
  ...semanticFallbackZh,
  summary: '该文件请求驳回对被告的指控。',
  plainEnglish: '这是一方请求法院驳回起诉的动议。',
  offlineRead: {
    typeKey: 'motion',
    reliefKey: 'dismissal',
    specificity: 3,
    citations,
  },
  aiStatus: { generated: true, provider: 'ollama', confidence: 'medium', mode: '本机模型' },
})
assert.ok(auditDocumentAnalysisSemantics(semanticConflictZh, semanticFallbackZh).length >= 1)
const repairedSemanticZh = repairDocumentAnalysisLanguage(semanticConflictZh, semanticFallbackZh, 'zh')
assert.equal(repairedSemanticZh.record.summary, semanticFallbackZh.summary)
assert.equal(repairedSemanticZh.record.offlineRead.typeKey, 'jury_instructions')
assert.equal(repairedSemanticZh.record.aiStatus.provider, 'local_rules')
assert.equal(repairedSemanticZh.record.aiStatus.originalProvider, 'ollama')
assert.equal(repairedSemanticZh.unresolvedSemanticIssues.length, 0)

assert.equal(localizedTextMismatch('PACER / RECAP / S.D.N.Y. / § 853(n) / Himalaya Exchange / Ho Wan Kwok', 'zh'), false)
assert.equal(localizedTextMismatch('PACER、RECAP 与 § 853(n)', 'en'), false)
assert.equal(localizedTextMismatch('公开记录出现 G 系列、Himalaya、Rule of Law、GTV、G Club 或 Voice of Guo 实体。', 'zh'), false)
assert.equal(localizedTextMismatch('This is English explanatory prose that should not appear in the Chinese interface.', 'zh'), true)
assert.equal(localizedTextMismatch('这是一整句不应出现在英文界面的中文说明。', 'en'), true)
assert.equal(localizeDateSignals('Recorded date: 2026 年 4 月 27 日上午 10:00.', 'en'), 'Recorded date: April 27, 2026 at 10:00 a.m..')
assert.equal(localizeDateSignals('期限为 September 4, 2026。', 'zh'), '期限为 2026年9月4日。')

assert.equal(auditDocumentAnalysisLanguage(fallbackZh, 'zh').length, 0)
assert.equal(auditDocumentAnalysisLanguage(fallbackEn, 'en').length, 0)
assert.notEqual(fallbackZh.plainEnglish, fallbackEn.plainEnglish)

console.log(JSON.stringify({
  status: 'ok',
  scenarios: 12,
  correctedChineseFields: repairedZh.correctedFields,
  correctedEnglishFields: repairedEn.correctedFields,
}, null, 2))

function fixture(language, overrides = {}) {
  return {
    analysisLanguage: language,
    title: language === 'en' ? 'Document 1' : '文件 1',
    variantLabel: language === 'en' ? 'Source-language original' : '来源原件',
    sourceLabel: language === 'en' ? 'PACER docket of record' : 'PACER 正式案卷',
    category: language === 'en' ? 'Docket Filing' : '案卷文件',
    sourcePosture: language === 'en' ? 'PACER docket of record' : 'PACER 正式案卷记录',
    summary: language === 'en' ? 'A court filing.' : '这是一份法院文件。',
    plainEnglish: language === 'en' ? 'A plain-language explanation.' : '这是一份通俗解读。',
    legalReading: language === 'en' ? ['Professional reading.'] : ['专业解读。'],
    caseConnections: ['sdny-23-cr-118'],
    whyItMatters: language === 'en' ? ['It affects the procedure.'] : ['它会影响案件程序。'],
    verificationTasks: language === 'en' ? ['Verify the source PDF.'] : ['核验来源 PDF。'],
    riskFlags: language === 'en' ? ['Do not overstate the record.'] : ['不得夸大文件证明力。'],
    relatedTopics: language === 'en' ? ['Criminal procedure'] : ['刑事程序'],
    aiStatus: {
      generated: true,
      confidence: 'medium',
      mode: language === 'en' ? 'Local deterministic read' : '本地确定性解读',
    },
    aiFindings: [],
    ...overrides,
  }
}

function findingsFor(value) {
  return [
    ['summary', value.summary],
    ['plainEnglish', value.plainEnglish],
    ['sourcePosture', value.sourcePosture],
    ...value.legalReading.map((text) => ['legalReading', text]),
  ].map(([section, text]) => ({ section, text, confidence: 'medium', citations }))
}
