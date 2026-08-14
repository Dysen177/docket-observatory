import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const requiredDecision = 'include_all_verified_public_sources'
const decisionDirective = process.env.DOCKET_OBSERVATORY_PUBLICATION_DECISION?.trim()
const reviewer = process.env.DOCKET_OBSERVATORY_REVIEWER?.trim()

if (decisionDirective !== requiredDecision) {
  throw new Error(`Set DOCKET_OBSERVATORY_PUBLICATION_DECISION=${requiredDecision} to record an explicit publisher inclusion decision.`)
}
if (!reviewer) throw new Error('Set DOCKET_OBSERVATORY_REVIEWER to the accountable publisher or reviewer name.')

const auditPath = path.join(root, 'output', 'release-review', 'corpus-risk-audit.json')
const manifestPath = path.join(root, 'downloads', 'court-files-complete', 'manifest.json')
const decisionsPath = path.join(root, 'release-metadata', 'corpus-review-decisions.json')
const reportPath = path.join(root, 'release-metadata', 'corpus-publication-review.md')
const audit = JSON.parse(await readFile(auditPath, 'utf8'))
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const reviewedAt = new Date().toISOString()

const sourcePolicies = {
  'courtlistener-recap': {
    allowedHosts: new Set(['storage.courtlistener.com', 'www.courtlistener.com']),
    posture: 'Public CourtListener/RECAP court-record copy; PACER remains the docket of record.',
  },
  'himalaya-restoration-archive': {
    allowedHosts: new Set(['web.archive.org', 'himalayarestoration.com', 'himalayarestoration.org']),
    posture: 'Public historical project-site or Internet Archive copy; not treated as the docket of record.',
  },
  'nfsc-criminal-mirror': {
    allowedHosts: new Set(['nfsc.press']),
    posture: 'Public backup mirror; not treated as the docket of record and retained with mirror labeling.',
  },
}

const manifestByHash = new Map()
for (const file of manifest.files ?? []) {
  if (!file.sha256 || file.status === 'error') continue
  const current = manifestByHash.get(file.sha256) ?? []
  current.push(file)
  manifestByHash.set(file.sha256, current)
}

const decisions = []
for (const finding of audit.findings ?? []) {
  const candidates = manifestByHash.get(finding.contentSha256) ?? []
  const file = candidates.find((candidate) => candidate.sourceId === finding.sourceId)
    ?? candidates.find((candidate) => candidate.url === finding.sourceUrl)
    ?? candidates[0]
  if (!file) throw new Error(`No valid manifest file matches flagged hash ${finding.contentSha256}`)

  const sourcePolicy = sourcePolicies[file.sourceId]
  if (!sourcePolicy) throw new Error(`No publication source policy exists for ${file.sourceId}`)
  const sourceUrl = new URL(file.finalUrl || file.url)
  if (sourceUrl.protocol !== 'https:' || !sourcePolicy.allowedHosts.has(sourceUrl.hostname)) {
    throw new Error(`Flagged file has an unapproved public-source URL: ${sourceUrl.href}`)
  }

  const filePath = path.resolve(file.path)
  const corpusRoot = path.resolve(root, 'downloads', 'court-files-complete')
  if (!filePath.startsWith(`${corpusRoot}${path.sep}`)) throw new Error(`Flagged file escapes the managed corpus: ${filePath}`)
  const info = await stat(filePath)
  if (info.size !== Number(file.bytes)) throw new Error(`Flagged file size changed: ${file.subdir}/${file.filename}`)
  await verifyPdf(filePath)
  if (await sha256File(filePath) !== finding.contentSha256) {
    throw new Error(`Flagged file hash changed: ${file.subdir}/${file.filename}`)
  }

  const riskSummary = (finding.risks ?? []).map((risk) => `${risk.id} (${risk.matches})`).join(', ')
  decisions.push({
    contentSha256: finding.contentSha256,
    decision: 'approved_public',
    reviewer,
    reviewedAt,
    legalBasis: 'Publisher-directed redistribution of a locally verified file obtained from a recorded public HTTPS source. This records provenance and inclusion policy, not a finding that quoted sealing, confidentiality, privacy, or redaction language has no legal effect.',
    rationale: `PDF structure, byte size, SHA-256, managed-corpus path, source host, and source posture verified. Screening flags retained: ${riskSummary}. ${sourcePolicy.posture} Publisher directed inclusion without redaction, deletion, or replacement.`,
    reviewMode: 'publisher_decision_with_automated_provenance_and_integrity_verification',
    sourceId: file.sourceId,
    sourceUrl: sourceUrl.href,
    sourcePosture: sourcePolicy.posture,
    caseId: finding.caseId,
    docketNumber: finding.docketNumber,
    docNumber: finding.docNumber,
    relativePath: finding.relativePath,
    highestSeverity: finding.highestSeverity,
    risks: finding.risks,
  })
}

const bySource = countBy(decisions, (decision) => decision.sourceId)
const byRisk = countBy(decisions.flatMap((decision) => decision.risks), (risk) => risk.id)
const payload = {
  schemaVersion: 1,
  generatedFrom: audit.generatedAt,
  generatedAt: reviewedAt,
  publisherDecision: requiredDecision,
  reviewScope: 'All heuristic findings were retained in the complete corpus. The review verifies local integrity and recorded public-source provenance; it does not claim that every page was manually read or that all quoted restrictions are legally inapplicable.',
  disclosure: 'No flagged file was hidden, redacted, excluded, or replaced by this publication review.',
  summary: {
    reviewedDocuments: decisions.length,
    highRiskDocuments: decisions.filter((decision) => decision.highestSeverity === 'high').length,
    mediumRiskDocuments: decisions.filter((decision) => decision.highestSeverity === 'medium').length,
    bySource,
    byRisk,
  },
  decisions,
}

await mkdir(path.dirname(decisionsPath), { recursive: true })
await writeFile(decisionsPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 })

const markdown = [
  '# Corpus Publication Review',
  '',
  `Generated: ${reviewedAt}`,
  `Reviewer / publisher: ${reviewer}`,
  '',
  '## Decision',
  '',
  'All locally verified files obtained from the recorded public HTTPS sources are included in the complete release without redaction, exclusion, replacement, or hidden variants.',
  '',
  'This review verifies PDF structure, file size, SHA-256, managed storage path, source host, and source posture for every heuristic finding. It retains every screening category. It does not claim that every page was manually read or that quoted sealing, confidentiality, privacy, or redaction language has no legal effect.',
  '',
  '## Summary',
  '',
  `- Reviewed documents: ${decisions.length}`,
  `- High-severity heuristic findings: ${payload.summary.highRiskDocuments}`,
  `- Medium-severity heuristic findings: ${payload.summary.mediumRiskDocuments}`,
  `- Source distribution: ${Object.entries(bySource).map(([key, value]) => `${key} ${value}`).join(', ')}`,
  `- Risk categories: ${Object.entries(byRisk).map(([key, value]) => `${key} ${value}`).join(', ')}`,
  '',
  '## Per-Document Record',
  '',
  '| SHA-256 | Source | Case | Doc | Severity | Screening categories | Decision |',
  '| --- | --- | --- | ---: | --- | --- | --- |',
  ...decisions.map((decision) => `| ${decision.contentSha256} | ${decision.sourceId} | ${decision.caseId ?? ''} | ${decision.docNumber ?? ''} | ${decision.highestSeverity} | ${decision.risks.map((risk) => `${risk.id} (${risk.matches})`).join(', ')} | approved_public |`),
  '',
]
await writeFile(reportPath, markdown.join('\n'), { mode: 0o600 })

console.log(JSON.stringify(payload.summary, null, 2))

function countBy(items, select) {
  return Object.fromEntries([...items.reduce((counts, item) => {
    const key = String(select(item) ?? 'unknown')
    counts.set(key, (counts.get(key) ?? 0) + 1)
    return counts
  }, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)))
}

async function verifyPdf(filePath) {
  const handle = await open(filePath, 'r')
  try {
    const info = await handle.stat()
    const header = Buffer.alloc(5)
    await handle.read(header, 0, header.length, 0)
    if (header.toString('ascii') !== '%PDF-') throw new Error(`Invalid PDF header: ${filePath}`)
    const tail = Buffer.alloc(Math.min(2048, info.size))
    await handle.read(tail, 0, tail.length, Math.max(0, info.size - tail.length))
    if (!tail.toString('latin1').includes('%%EOF')) throw new Error(`Incomplete PDF trailer: ${filePath}`)
  } finally {
    await handle.close()
  }
}

async function sha256File(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}
