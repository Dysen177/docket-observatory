import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const auditPath = path.join(root, 'output', 'release-review', 'corpus-risk-audit.json')
const decisionsPath = path.join(root, 'release-metadata', 'corpus-review-decisions.json')
const audit = JSON.parse(await readFile(auditPath, 'utf8'))
const decisions = JSON.parse(await readFile(decisionsPath, 'utf8').catch(() => {
  throw new Error('Missing release-metadata/corpus-review-decisions.json. Complete the generated review template before packaging.')
}))
const decisionsByHash = new Map((decisions.decisions ?? []).map((decision) => [decision.contentSha256, decision]))
const allowed = new Set(['approved_public', 'exclude', 'redacted_public'])
const incomplete = []

for (const finding of audit.findings ?? []) {
  const decision = decisionsByHash.get(finding.contentSha256)
  if (!decision
    || !allowed.has(decision.decision)
    || !String(decision.reviewer ?? '').trim()
    || !/^\d{4}-\d{2}-\d{2}/.test(String(decision.reviewedAt ?? ''))
    || !String(decision.legalBasis ?? '').trim()
    || !String(decision.rationale ?? '').trim()) {
    incomplete.push(finding.contentSha256)
  }
}

if (incomplete.length > 0) {
  throw new Error(`Corpus release review is incomplete for ${incomplete.length} flagged document(s). First unresolved SHA-256: ${incomplete[0]}`)
}
console.log(`Corpus release review gate passed for ${audit.findings.length} flagged document(s).`)
