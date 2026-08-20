import assert from 'node:assert/strict'
import { selectAutomationRecords } from '../server/automation-runner.js'

const records = [
  { file: { url: 'https://example.test/new.pdf', status: 'downloaded' }, processingGap: null },
  { file: { url: 'https://example.test/changed.pdf', status: 'downloaded_new_version' }, processingGap: null },
  { file: { url: 'https://example.test/historical-gap.pdf', status: 'skipped_existing' }, processingGap: { needsAnalysis: true } },
  { file: { url: 'https://example.test/complete.pdf', status: 'skipped_existing' }, processingGap: null },
]

assert.deepEqual(
  selectAutomationRecords(records, { limit: 120, processingScope: 'priority' }).map((item) => item.file.url),
  ['https://example.test/new.pdf', 'https://example.test/changed.pdf'],
  'Priority automation must process only files downloaded or changed in the current run.',
)
assert.deepEqual(
  selectAutomationRecords(records.slice(2), { limit: 120, processingScope: 'priority' }),
  [],
  'A refresh with no new files must not rotate through historical documents.',
)
assert.deepEqual(
  selectAutomationRecords(records, { limit: 3, processingScope: 'all' }).map((item) => item.file.url),
  records.slice(0, 3).map((item) => item.file.url),
  'Explicit full processing must retain historical rebuild behavior.',
)

console.log('Automation selection passed: scheduled priority runs are incremental-only; explicit full rebuild remains available.')
