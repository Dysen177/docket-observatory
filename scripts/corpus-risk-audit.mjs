import { gunzipSync } from 'node:zlib'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const manifest = JSON.parse(await readFile(path.join(root, 'downloads', 'court-files-complete', 'manifest.json'), 'utf8'))
const searchIndex = JSON.parse(await readFile(path.join(root, 'server', 'cache', 'document-search-index.json'), 'utf8'))
const outputDirectory = path.join(root, 'output', 'release-review')

const rules = [
  { id: 'explicit-seal-banner', severity: 'high', label: 'Explicit sealed or restricted-document language', pattern: /\b(?:filed under seal|sealed document|restricted document|not for public (?:filing|disclosure)|attorneys[’'] eyes only)\b/gi },
  { id: 'protective-order-material', severity: 'medium', label: 'Protective-order or confidential-designation language', pattern: /\b(?:subject to (?:a |the )?protective order|confidential pursuant to|designated confidential)\b/gi },
  { id: 'social-security-number', severity: 'high', label: 'Possible full U.S. Social Security number', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { id: 'account-or-routing-number', severity: 'high', label: 'Possible full account or routing number', pattern: /\b(?:account|acct\.?|routing|iban|swift)\s*(?:number|no\.?|#)?\s*[:-]?\s*(?:[x*]{0,4})?\d(?:[\s-]?\d){7,16}\b/gi },
  { id: 'passport-or-license-number', severity: 'high', label: 'Possible passport or driver-license identifier', pattern: /\b(?:passport|driver[’']?s license|driving licence)\s*(?:number|no\.?|#)?\s*[:-]?\s*[a-z0-9]{6,18}\b/gi },
  { id: 'date-of-birth', severity: 'medium', label: 'Possible full date of birth', pattern: /\b(?:date of birth|d\.o\.b\.?|dob)\s*[:-]?\s*(?:\d{1,2}[/-]){2}\d{2,4}\b/gi },
  { id: 'minor-or-medical-record', severity: 'medium', label: 'Possible minor, medical, or protected personal record', pattern: /\b(?:minor child|juvenile record|medical record|health information|psychiatric record)\b/gi },
]

const filesByHash = new Map()
for (const file of manifest.files ?? []) {
  if (!file.sha256) continue
  const current = filesByHash.get(file.sha256) ?? []
  current.push(file)
  filesByHash.set(file.sha256, current)
}

function countMatches(text, pattern) {
  pattern.lastIndex = 0
  let count = 0
  while (pattern.exec(text) && count < 1000) count += 1
  pattern.lastIndex = 0
  return count
}

function relativeDocumentPath(file) {
  if (!file?.path) return null
  const relative = path.relative(path.join(root, 'downloads', 'court-files-complete'), file.path)
  return relative.startsWith('..') ? null : relative.split(path.sep).join('/')
}

const findings = []
for (const document of searchIndex.documents ?? []) {
  if (!document.original?.searchTextFile) continue
  const compressed = await readFile(path.join(root, 'server', 'cache', document.original.searchTextFile))
  const text = gunzipSync(compressed).toString('utf8')
  const risks = rules
    .map((rule) => ({ id: rule.id, severity: rule.severity, label: rule.label, matches: countMatches(text, rule.pattern) }))
    .filter((risk) => risk.matches > 0)

  const hidMatches = text.match(/\bHID[-\s:]?[A-Z0-9]{4,}\b/gi)?.length ?? 0
  if (hidMatches >= 20) risks.push({ id: 'bulk-hid-identifiers', severity: 'medium', label: 'Bulk public HID-style identifiers', matches: hidMatches })
  if (risks.length === 0) continue

  const candidates = filesByHash.get(document.contentSha256) ?? []
  const primary = candidates.find((file) => file.sourceId === 'courtlistener-recap') ?? candidates[0] ?? null
  findings.push({
    contentSha256: document.contentSha256,
    caseId: primary?.caseId ?? null,
    docketNumber: primary?.docketNumber ?? null,
    docNumber: primary?.docNumber ?? null,
    title: primary?.title ?? null,
    sourceId: primary?.sourceId ?? document.sources?.[0]?.sourceId ?? null,
    sourceUrl: primary?.url ?? document.canonicalSourceUrl ?? null,
    relativePath: relativeDocumentPath(primary),
    reviewStatus: 'human_review_required',
    highestSeverity: risks.some((risk) => risk.severity === 'high') ? 'high' : 'medium',
    risks,
  })
}

findings.sort((a, b) => (a.highestSeverity === b.highestSeverity ? 0 : a.highestSeverity === 'high' ? -1 : 1)
  || String(a.caseId).localeCompare(String(b.caseId))
  || String(a.docNumber).localeCompare(String(b.docNumber), undefined, { numeric: true }))

await mkdir(outputDirectory, { recursive: true })
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: {
    uniqueDocuments: searchIndex.documents?.length ?? 0,
    manifestFiles: manifest.files?.length ?? 0,
    flaggedDocuments: findings.length,
    highRiskDocuments: findings.filter((finding) => finding.highestSeverity === 'high').length,
    mediumRiskDocuments: findings.filter((finding) => finding.highestSeverity === 'medium').length,
  },
  methodology: 'Heuristic release-screening only. Matches are not proof that a public filing is sealed, unlawful to redistribute, or unredacted. A qualified human reviewer must inspect the original PDF and source posture.',
  findings,
}
await writeFile(path.join(outputDirectory, 'corpus-risk-audit.json'), `${JSON.stringify(report, null, 2)}\n`)

const markdown = [
  '# Corpus Privacy And Restriction Review Queue',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `- Unique documents scanned: ${report.scope.uniqueDocuments}`,
  `- Flagged for human review: ${report.scope.flaggedDocuments}`,
  `- High-risk heuristic flags: ${report.scope.highRiskDocuments}`,
  `- Medium-risk heuristic flags: ${report.scope.mediumRiskDocuments}`,
  '',
  '> This is a screening queue, not a legal conclusion. Inspect the original PDF and its official/public source before approving redistribution.',
  '',
  '| Severity | Case | Doc | Title | Risk categories | SHA-256 |',
  '| --- | --- | ---: | --- | --- | --- |',
  ...findings.map((finding) => `| ${finding.highestSeverity} | ${finding.caseId ?? ''} | ${finding.docNumber ?? ''} | ${String(finding.title ?? '').replaceAll('|', '\\|')} | ${finding.risks.map((risk) => risk.id).join(', ')} | ${finding.contentSha256} |`),
  '',
]
await writeFile(path.join(outputDirectory, 'corpus-risk-audit.md'), markdown.join('\n'))

const decisionTemplate = {
  schemaVersion: 1,
  generatedFrom: report.generatedAt,
  instructions: 'For every entry, replace pending with approved_public, exclude, or redacted_public and provide reviewer, reviewedAt, legalBasis, and rationale.',
  decisions: findings.map((finding) => ({
    contentSha256: finding.contentSha256,
    decision: 'pending',
    reviewer: '',
    reviewedAt: '',
    legalBasis: '',
    rationale: '',
  })),
}
await writeFile(path.join(outputDirectory, 'corpus-review-decisions.template.json'), `${JSON.stringify(decisionTemplate, null, 2)}\n`)

console.log(`Corpus release-risk audit scanned ${report.scope.uniqueDocuments} unique documents and queued ${findings.length} for human review.`)
