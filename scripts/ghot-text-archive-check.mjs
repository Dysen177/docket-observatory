import assert from 'node:assert/strict'
import { loadGhotTextArchive, retrieveGhotArchiveEvidence } from '../server/ghot-text-archive.js'
import { expandKnowledgeSearchValues, retrieveKnowledgeDossierEvidence } from '../server/knowledge-dossiers.js'
import { retrieveTranscriptEvidence } from '../server/public-record-transcripts.js'

const archive = await loadGhotTextArchive()
assert.equal(archive.schemaVersion, 1)
assert.ok(archive.records.length >= 374, 'Bundled GHOT archive should include the complete public document list.')
assert.ok((archive.counts.byKind?.court_filing ?? 0) >= 365, 'Bundled GHOT archive should include the court-filing summaries.')
assert.ok((archive.counts.byKind?.concept ?? 0) >= 7, 'Bundled GHOT archive should include all known concept explainers.')
assert.ok(archive.records.every((record) => record.details?.zh && record.details?.en), 'Every archived record should have Chinese and English detail data.')

const nfsc = await retrieveGhotArchiveEvidence('新中国联邦是什么', ['新中国联邦'], 'zh', 4)
assert.equal(nfsc[0]?.title, '新中国联邦宣言')
assert.equal(nfsc[0]?.kind, 'archive_reference')
assert.equal(nfsc[0]?.archiveKind, 'declaration')
assert.equal(nfsc[0]?.archiveSlug, 'nfsc-declaration')
assert.ok(nfsc[0]?.archiveMatchScore >= 60)
assert.ok(nfsc[0]?.excerpt.length >= 2500, '新中国联邦宣言应保留详细档案摘要，不得只保留发布日期。')
assert.match(nfsc[0]?.excerpt, /一人一票/u)
assert.match(nfsc[0]?.excerpt, /三权分立/u)
assert.match(nfsc[0]?.excerpt, /7 项基本内容/u)
assert.match(nfsc[0]?.excerpt, /喜马拉雅监督机构/u)
assert.match(nfsc[0]?.excerpt, /18 条政策/u)

const bgy = await retrieveGhotArchiveEvidence('蓝金黄是什么意思', ['蓝金黄'], 'zh', 4)
assert.equal(bgy[0]?.title, '蓝金黄/BGY')

const doubleDragonArchive = await retrieveGhotArchiveEvidence('双龙计划是什么', ['双龙计划'], 'zh', 4)
assert.equal(doubleDragonArchive[0]?.title, '双龙计划')

const courtOnly = await retrieveGhotArchiveEvidence('郭文贵定罪罪名', ['郭文贵', '定罪', '罪名'], 'zh', 8, {
  includeCourt: true,
  courtOnly: true,
})
assert.ok(courtOnly.length > 0)
assert.ok(courtOnly.every((citation) => citation.archiveKind === 'court_filing'))

const doubleDragonDossier = retrieveKnowledgeDossierEvidence('双龙计划是什么', [], 'zh', 4)
assert.equal(doubleDragonDossier[0]?.title, '双龙计划 / 双龙行动')
assert.ok(expandKnowledgeSearchValues('双龙计划是什么', { publicOnly: true }).includes('双龙行动'))

const doubleDragonTranscripts = await retrieveTranscriptEvidence('双龙计划', {
  language: 'zh',
  sort: 'relevance',
  limit: 20,
  citationLimit: 10,
})
assert.ok(doubleDragonTranscripts.citations.some((citation) => /香港|台湾/u.test(`${citation.text} ${citation.contextBefore?.map((item) => item.text).join(' ')} ${citation.contextAfter?.map((item) => item.text).join(' ')}`)))

const doc867 = archive.records.find((record) => record.docKind === 'court_filing' && String(record.docNum) === '867')
assert.ok(doc867?.details?.zh?.longSummaryMd.includes('不是法院裁定'), 'GHOT Doc 867 summary should retain its party-filing limitation.')

const nfscRecord = archive.records.find((record) => record.slug === 'nfsc-declaration')
assert.ok(nfscRecord?.details?.zh?.abstract.includes('18 条政策'), 'NFSC archive detail should retain the policy appendix.')
assert.ok(nfscRecord?.details?.zh?.longSummaryMd.includes('宪法所列七项保护'), 'NFSC archive detail should retain the constitutional protections.')

console.log(JSON.stringify({
  archiveRecords: archive.records.length,
  courtFilings: archive.counts.byKind.court_filing,
  concepts: archive.counts.byKind.concept,
  doubleDragonTranscriptCitations: doubleDragonTranscripts.citations.length,
}, null, 2))
