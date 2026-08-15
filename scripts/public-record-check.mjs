import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import networkPolicy from '../server/network-policy.cjs'
import { queryPublicRecords } from '../server/public-records.js'

const corpus = JSON.parse(await readFile(new URL('../server/public-record-corpus.json', import.meta.url), 'utf8'))
const allowedHosts = new Set([
  'gettr.com',
  'www.gettr.com',
  'odysee.com',
  'rumble.com',
  'www.rumble.com',
  'x.com',
  'www.x.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
])

assert.equal(corpus.coverage.start, '2017-01-26')
assert.equal(corpus.coverage.end, '2023-03-14')
assert.equal(corpus.coverage.casePhaseStart, '2023-03-15')
assert.ok(Array.isArray(corpus.records) && corpus.records.length > 0)

const ids = new Set()
const primaryUrls = new Set()
for (const record of corpus.records) {
  assert.match(record.id, /^public-record-[a-f0-9-]+$/)
  assert.match(record.date, /^20(1[7-9]|2[0-3])-\d{2}-\d{2}$/)
  assert.ok(record.date >= corpus.coverage.start && record.date <= corpus.coverage.end)
  assert.ok(record.title?.zh && record.title?.en)
  assert.ok(record.summary?.zh && record.summary?.en)
  assert.equal(ids.has(record.id), false, `Duplicate public-record id: ${record.id}`)
  ids.add(record.id)

  const sources = [record.primarySource, ...(record.alternatives ?? [])]
  assert.ok(sources.length >= 1)
  for (const source of sources) {
    const url = new URL(source.url)
    assert.equal(url.protocol, 'https:')
    assert.equal(allowedHosts.has(url.hostname.toLowerCase()), true, `Unexpected public-record host: ${url.hostname}`)
    assert.equal(networkPolicy.isAllowedExternalUrl(url.toString()), true, `External browser policy rejected ${url.hostname}`)
    assert.equal(networkPolicy.isAllowedOutboundUrl(url.toString(), { includeAi: false }), false, `Public-record host must not gain backend fetch permission: ${url.hostname}`)
    assert.ok(source.platform)
  }
  assert.equal(primaryUrls.has(record.primarySource.url), false, `Duplicate primary public-record URL: ${record.primarySource.url}`)
  primaryUrls.add(record.primarySource.url)
}

const newest = await queryPublicRecords({ limit: 5, sort: 'newest' }, 'zh')
const oldest = await queryPublicRecords({ limit: 5, sort: 'oldest' }, 'en')
assert.equal(newest.summary.totalRecords, corpus.records.length)
assert.ok(newest.records[0].date >= newest.records.at(-1).date)
assert.ok(oldest.records[0].date <= oldest.records.at(-1).date)

const firstYear = corpus.records[0].date.slice(0, 4)
const yearResult = await queryPublicRecords({ year: firstYear, limit: 120 }, 'zh')
assert.ok(yearResult.records.every((record) => record.date.startsWith(firstYear)))

for (const [platform, count] of Object.entries(newest.summary.platformCounts)) {
  if (!count) continue
  const platformResult = await queryPublicRecords({ platform, limit: 1 }, 'en')
  assert.equal(platformResult.total, count, `Platform summary and filter disagree for ${platform}.`)
}

console.log(`Public-record corpus check passed: ${corpus.records.length} records, ${primaryUrls.size} unique primary links.`)
