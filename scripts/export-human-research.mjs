import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { humanCaseResearch, humanDocumentResearch } from '../server/human-legal-research.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await readFile(path.join(projectRoot, 'downloads', 'court-files-complete', 'manifest.json'), 'utf8'))
const outputRoot = path.join(projectRoot, 'output', 'research')
const documentRoot = path.join(outputRoot, 'documents')
const caseRoot = path.join(outputRoot, 'cases')
await mkdir(documentRoot, { recursive: true })
await mkdir(caseRoot, { recursive: true })

const sourceFiles = manifest.files.filter((file) => humanDocumentResearch(file, 'zh'))
const caseIds = [...new Set(sourceFiles.map((file) => file.caseId))]
for (const file of sourceFiles) {
  const researchZh = humanDocumentResearch(file, 'zh')
  const researchEn = humanDocumentResearch(file, 'en')
  const base = `${file.caseId}-doc-${file.docNumber ?? 'source'}`
  await writeFile(path.join(documentRoot, `${base}-zh.md`), renderDocument(file, researchZh, 'zh'))
  await writeFile(path.join(documentRoot, `${base}-en.md`), renderDocument(file, researchEn, 'en'))
}
for (const caseId of caseIds) {
  const researchZh = humanCaseResearch(caseId, manifest, 'zh')
  const researchEn = humanCaseResearch(caseId, manifest, 'en')
  if (!researchZh || !researchEn) continue
  await writeFile(path.join(caseRoot, `${caseId}-zh.md`), renderCase(caseId, researchZh, 'zh'))
  await writeFile(path.join(caseRoot, `${caseId}-en.md`), renderCase(caseId, researchEn, 'en'))
}
console.log(JSON.stringify({ documents: sourceFiles.length, cases: caseIds.length, outputRoot }, null, 2))

function renderDocument(file, research, lang) {
  const content = research.content
  const zh = lang === 'zh'
  const sourceIntegrity = isDoc765(file)
    ? zh
      ? '来源完整性：镜像元数据与 PDF 正文冲突；正文是 Ranyue Bai 的第二巡回 mandamus 申请及附件，不得把本文件作为 6,512 项申请的证据。正式 SDNY/第二巡回案卷待核验。'
      : 'Source-integrity warning: the mirror metadata conflicts with the PDF body. The body is a Ranyue Bai Second Circuit mandamus petition with attachments; do not use this file as evidence of 6,512 claims. Official SDNY/Second Circuit dockets remain to be verified.'
    : ''
  const lines = [
    `# ${content.summary}`,
    '',
    `- ${zh ? '案件' : 'Case'}: ${file.caseId}`,
    `- ${zh ? '文件号' : 'Document'}: ${file.docNumber ?? 'n/a'}`,
    `- ${zh ? '来源' : 'Source'}: ${file.sourceId} - ${file.url}`,
    `- SHA-256: ${file.sha256}`,
    `- ${zh ? '研究时间' : 'Reviewed'}: ${research.reviewedAt}`,
    `- ${zh ? '程序立场' : 'Posture'}: ${research.posture}`,
    ...(sourceIntegrity ? ['', `> ${sourceIntegrity}`] : []),
    '',
    `## ${zh ? '通俗解读' : 'Plain-language reading'}`,
    '',
    content.plainEnglish,
    '',
    `## ${zh ? '法律阅读' : 'Legal reading'}`,
    '',
    ...content.legalReading.map((item) => `- ${item}`),
    '',
    `## ${zh ? '案件关联' : 'Case connections'}`,
    '',
    ...content.caseConnections.map((item) => `- ${item}`),
    '',
    `## ${zh ? '重要性' : 'Why it matters'}`,
    '',
    ...content.whyItMatters.map((item) => `- ${item}`),
    '',
    `## ${zh ? '核验任务' : 'Verification tasks'}`,
    '',
    ...content.verificationTasks.map((item) => `- ${item}`),
    '',
    `## ${zh ? '风险标记' : 'Risk flags'}`,
    '',
    ...content.riskFlags.map((item) => `- ${item}`),
    '',
    `## ${zh ? '页码证据' : 'Page evidence'}`,
    '',
    ...content.findings.map((item) => `- [${item.section}] ${item.text} (${zh ? '页' : 'page'} ${item.pages.join(', ')})`),
    '',
    `> ${zh ? '中立研究提示：本报告不构成法律意见；当事方指控、答辩和镜像摘要不等于法院认定。NFSC 仍是备用来源。' : 'Neutral research note: this is not legal advice. Party allegations, answers, and mirror summaries are not judicial findings. NFSC remains a backup source.'}`,
    '',
  ]
  return `${lines.join('\n')}\n`
}

function isDoc765(file) {
  return file?.caseId === 'sdny-23-cr-118' && String(file?.docNumber) === '765'
}

function renderCase(caseId, research, lang) {
  const zh = lang === 'zh'
  const title = zh ? `案件整体人工法律研究：${caseId}` : `Human legal research dossier: ${caseId}`
  return [
    `# ${title}`,
    '',
    `- ${zh ? '提供者' : 'Provider'}: ${research.provider}`,
    `- ${zh ? '研究时间' : 'Reviewed'}: ${research.generatedAt}`,
    `- ${zh ? '证据条目' : 'Evidence items'}: ${research.evidenceCount}`,
    '',
    research.text,
    '',
    `> ${zh ? '本案件总览是中立研究辅助，不构成法律意见；结论只覆盖已收集和已引用的材料。' : 'This case dossier is neutral research assistance, not legal advice; it is limited to collected and cited material.'}`,
    '',
  ].join('\n')
}
