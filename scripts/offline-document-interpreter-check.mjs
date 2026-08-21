import assert from 'node:assert/strict'
import { createSeedState } from '../server/seed.js'
import { buildOfflineDocumentAnalysis, localDocumentAnalysis } from '../server/document-analysis.js'
import { compareDocumentCatalogRecords } from '../server/document-search.js'
import { humanDocumentResearch } from '../server/human-legal-research.js'
import { interpretOfflineLegalDocument } from '../server/offline-document-interpreter.js'

function read(title, options = {}) {
  return interpretOfflineLegalDocument({
    file: { title, filename: 'fixture.pdf', docNumber: options.docNumber ?? '1' },
    category: options.category ?? 'Docket Filing',
    extraction: options.extraction ?? null,
    lang: options.lang ?? 'zh',
  })
}

const motion = read('Motion to Remand')
assert.equal(motion.typeKey, 'motion')
assert.match(motion.plainRead, /不是法院已经同意/u)

const jointJuryInstructions = read('Doc 264 Request to Charge by USA as to Kwok and Wang')
assert.equal(jointJuryInstructions.typeKey, 'jury_instructions')
assert.equal(jointJuryInstructions.reliefKey, null)
assert.match(jointJuryInstructions.plainRead, /拟议陪审团指示/u)
assert.match(jointJuryInstructions.plainRead, /不是最终生效/u)
assert.doesNotMatch(jointJuryInstructions.plainRead, /驳回/u)

const schedulingRequest = read('Doc 36 Government\'s Request for Scheduling and Exclusion of Time Under the Speedy Trial Act', {
  extraction: {
    status: 'extracted',
    coverage: 'complete',
    pageSnippets: [{ pageNumber: 1, text: 'A previously filed motion to dismiss remains pending. The government requests a scheduling conference.' }],
  },
})
assert.equal(schedulingRequest.typeKey, 'motion')
assert.equal(schedulingRequest.reliefKey, null)
assert.doesNotMatch(schedulingRequest.plainRead, /驳回/u)

const grantingOrder = read('Order Granting Motion to Remand')
assert.equal(grantingOrder.typeKey, 'court_order')
assert.match(grantingOrder.plainRead, /准许/u)

const mixedOrder = read('Doc 823, Mar 23, 2026, The court denies the motion to quash and grants a Rule 17(c) subpoena request with limits.')
assert.equal(mixedOrder.typeKey, 'court_order')
assert.match(mixedOrder.plainRead, /分别准许和驳回/u)

const descriptiveMotion = read('Doc 824, Mar 24, 2026, The government asks the court to extend its sentencing submission deadline to April 7, 2026.')
assert.equal(descriptiveMotion.typeKey, 'motion')
assert.match(descriptiveMotion.plainRead, /政府方/u)
assert.match(descriptiveMotion.plainRead, /2026年4月7日/u)

const descriptiveOrder = read('Doc 825, Mar 26, 2026, The court grants the government\'s request to extend its sentencing submission deadline to April 7, 2026.')
assert.equal(descriptiveOrder.typeKey, 'court_order')
assert.match(descriptiveOrder.plainRead, /准许/u)

const sentencing = read('Doc 833, Apr 7, 2026, The Government\'s sentencing memorandum argues for a sentence of at least 30 years.')
assert.equal(sentencing.typeKey, 'sentencing_submission')
assert.match(sentencing.plainRead, /不等于法官最终判处/u)

const complaint = read('First Amended Complaint')
assert.equal(complaint.typeKey, 'complaint')
assert.match(complaint.plainRead, /不是法院认定/u)

const answer = read('Answer to Amended Complaint')
assert.equal(answer.typeKey, 'answer')
assert.match(answer.plainRead, /不代表法院已经判断/u)

const service = read('Proof of Service. Answer due September 4, 2026')
assert.equal(service.typeKey, 'service_record')
assert.match(service.plainRead, /可能触发答复期限/u)
assert.match(service.plainRead, /2026年9月4日/u)

const chineseDeadlineInEnglish = read('文件 900', {
  lang: 'en',
  extraction: {
    status: 'extracted',
    coverage: 'complete',
    pageSnippets: [{ pageNumber: 1, text: '法院命令被告应于 2026 年 4 月 27 日上午 10:00 出庭。' }],
  },
})
assert.match(chineseDeadlineInEnglish.plainRead, /April 27, 2026 at 10:00 a\.m\./u)
assert.doesNotMatch(chineseDeadlineInEnglish.plainRead, /[一-龥]/u)

const englishDeadlineInChinese = read('Motion. Response due by September 4, 2026')
assert.match(englishDeadlineInChinese.plainRead, /2026年9月4日/u)
assert.doesNotMatch(englishDeadlineInChinese.plainRead, /September/u)

const appeal = read('Notice of Appeal from Judgment')
assert.equal(appeal.typeKey, 'appeal_notice')
assert.match(appeal.plainRead, /不会自动推翻原判/u)

const certiorari = read('Petition for a Writ of Certiorari')
assert.equal(certiorari.typeKey, 'certiorari_petition')
assert.match(certiorari.plainRead, /不等于最高法院已经受理/u)

const indictment = read('(S3) Superseding Indictment Filed')
assert.equal(indictment.typeKey, 'indictment')
assert.match(indictment.plainRead, /不能证明被告已经有罪/u)

const declaration = read('Declaration of Jane Doe in Support of Motion')
assert.equal(declaration.typeKey, 'declaration')
assert.match(declaration.plainRead, /是否亲历/u)

const exhibit = read('Attachment A', { docNumber: '331-1' })
assert.equal(exhibit.typeKey, 'exhibit')
assert.match(exhibit.plainRead, /结合“谁提交/u)
assert.match(exhibit.verificationTasks.join(' '), /打开主文件/u)

assert.equal(read('Certificate of Word Count').typeKey, 'word_count_certificate')
assert.equal(read('Clerk\'s Entry of Default').typeKey, 'default_entry')
assert.equal(read('Objection to Motion to Compel').typeKey, 'objection')
assert.equal(read('Stipulation of Dismissal under Rule 41').typeKey, 'stipulation')
assert.equal(read('Local Rule 56(a)(1) Statement of Undisputed Material Facts').typeKey, 'fact_statement')
assert.equal(read('Bill of Particulars Regarding Forfeiture').typeKey, 'bill_of_particulars')
assert.equal(read('Withdrawal of Motion to Modify Order').typeKey, 'withdrawal')
assert.equal(read('Chapter 11 Trustee\'s Exhibit List').typeKey, 'exhibit_list')
assert.equal(read('Request for Transcript').typeKey, 'transcript_request')

const bodyDetected = read('Document 900', {
  extraction: {
    status: 'extracted',
    coverage: 'complete',
    pageSnippets: [
      { pageNumber: 1, text: 'UNITED STATES DISTRICT COURT' },
      { pageNumber: 2, text: 'MOTION TO COMPEL production of specified records.' },
    ],
  },
})
assert.equal(bodyDetected.typeKey, 'motion')
assert.equal(bodyDetected.citations.some((citation) => citation.kind === 'extracted_page' && citation.pageNumber === 2), true)

const ordered = [
  { categoryKey: 'Docket Filing', docNumber: '331-2', title: 'Attachment 2' },
  { categoryKey: 'Docket Filing', docNumber: '331', title: 'Parent' },
  { categoryKey: 'Docket Filing', docNumber: '331-1', title: 'Attachment 1' },
].toSorted(compareDocumentCatalogRecords)
assert.deepEqual(ordered.map((record) => record.docNumber), ['331-2', '331-1', '331'])

const appealState = createSeedState()
const verifiedAppealFiles = [
  {
    docNumber: '14',
    sha256: '6d576f248cc3e90e9d195b9a82ccf564b673031f760c288dc74f8e15f5a8a138',
    title: 'ACKNOWLEDGMENT AND NOTICE OF APPEARANCE',
    expectedCategory: 'Docket Filing',
    expectedTitleZh: '文件 14：上诉律师出庭确认及案卷信息确认表',
    expectedBoundaryZh: /不是法院裁定/u,
  },
  {
    docNumber: '16-1',
    sha256: 'd4f3d54b69c72ef8e1c9bcaad40a8ebe50a6bfe46d8589eebf50d772ce21b2a1',
    title: 'MOTION INFORMATION STATEMENT',
    expectedCategory: 'Motion',
    expectedTitleZh: '文件 16-1：解除并替换上诉律师动议信息表',
    expectedBoundaryZh: /不是批准换律师的命令/u,
  },
  {
    docNumber: '17',
    sha256: 'a976cceb019746a89c98d22f22152b690920ea4269eca9fe757438bade6850fb',
    title: 'NOTICE OF CASE MANAGER CHANGE',
    expectedCategory: 'Docket Filing',
    expectedTitleZh: '文件 17：案件管理员变更通知',
    expectedBoundaryZh: /不裁定律师身份/u,
  },
]
for (const fixture of verifiedAppealFiles) {
  const file = {
    ...fixture,
    caseId: 'ca2-26-1853',
    docketNumber: '26-1853',
    sourceId: 'courtlistener-recap',
    url: `https://example.test/26-1853/${fixture.docNumber}.pdf`,
    status: 'downloaded',
  }
  const local = localDocumentAnalysis(file, appealState, 'zh')
  const research = humanDocumentResearch(file, 'zh')
  assert.equal(local.categoryKey, fixture.expectedCategory)
  assert.equal(local.title, fixture.expectedTitleZh)
  assert.ok(research)
  assert.match(research.content.summary, fixture.expectedBoundaryZh)
  assert.equal(research.content.findings.every((finding) => finding.pages.every((page) => page === 1)), true)
}

const originalFetch = globalThis.fetch
let networkCalls = 0
globalThis.fetch = async () => {
  networkCalls += 1
  throw new Error('Offline interpreter test forbids network access.')
}
try {
  const file = {
    title: 'Motion to Extend Time',
    filename: 'fixture.pdf',
    docNumber: '10',
    url: 'https://example.test/fixture.pdf',
    status: 'downloaded',
  }
  const state = createSeedState()
  const [zh, en] = await Promise.all([
    buildOfflineDocumentAnalysis(file, state, 'zh'),
    buildOfflineDocumentAnalysis(file, state, 'en'),
  ])
  assert.ok(zh.plainEnglish)
  assert.ok(zh.legalReading.length)
  assert.ok(en.plainEnglish)
  assert.ok(en.legalReading.length)
  assert.equal(zh.aiStatus.provider, 'local_rules')
  assert.equal(en.aiStatus.provider, 'local_rules')
  assert.equal(networkCalls, 0)
} finally {
  globalThis.fetch = originalFetch
}

console.log(JSON.stringify({
  status: 'ok',
  scenarios: 34,
  networkCalls,
  mode: 'deterministic-offline',
}, null, 2))
