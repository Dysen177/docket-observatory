import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import networkPolicy from '../server/network-policy.cjs'
import { queryPublicRecords } from '../server/public-records.js'
import { cases } from '../server/seed.js'
import { linkedPublicRecordIds, publicRecordCaseLinks, publicRecordCaseReferenceIds } from '../server/public-record-case-links.js'

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
const platformHosts = new Map([
  ['gettr', new Set(['gettr.com', 'www.gettr.com'])],
  ['odysee', new Set(['odysee.com'])],
  ['rumble', new Set(['rumble.com', 'www.rumble.com'])],
  ['x', new Set(['x.com', 'www.x.com'])],
  ['youtube', new Set(['youtube.com', 'www.youtube.com', 'youtu.be'])],
])

function canonicalSourceIdentity(source) {
  const url = new URL(source.url)
  if (source.platform === 'youtube') {
    const videoId = url.hostname.toLowerCase() === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|live|shorts)\/([^/?#]+)/)?.[1]
    if (videoId) return `youtube:${videoId}`
  }
  url.hash = ''
  return `${source.platform}:${url.toString()}`
}

function sourceDates(value) {
  const dates = new Set()
  const text = String(value ?? '')
  const addDate = (year, month, day) => {
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const parsed = new Date(`${date}T00:00:00Z`)
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) dates.add(date)
  }
  for (const match of text.matchAll(/(?<!\d)(20(?:1[7-9]|2[0-3]))[./_-]([01]?\d)[./_-]([0-3]?\d)(?!\d)/g)) addDate(match[1], match[2], match[3])
  for (const match of text.matchAll(/(?<!\d)(20(?:1[7-9]|2[0-3]))([01]\d)([0-3]\d)(?!\d)/g)) addDate(match[1], match[2], match[3])
  return [...dates]
}

assert.equal(corpus.coverage.start, '2017-01-26')
assert.equal(corpus.coverage.end, '2023-03-14')
assert.equal(corpus.coverage.arrestDate, '2023-03-15')
assert.ok(Array.isArray(corpus.records) && corpus.records.length > 0)

const ids = new Set()
const primaryUrls = new Set()
const allSourceUrls = new Set()
const allSourceIdentities = new Set()
for (const record of corpus.records) {
  assert.match(record.id, /^public-record-[a-f0-9-]+$/)
  assert.match(record.date, /^20(1[7-9]|2[0-3])-\d{2}-\d{2}$/)
  assert.ok(record.date >= corpus.coverage.start && record.date <= corpus.coverage.end)
  assert.ok(record.title?.zh && record.title?.en)
  assert.ok(record.summary?.zh && record.summary?.en)
  assert.equal(record.title.en.includes('Guo Wengui public video'), false, `Overstated speaker attribution in title: ${record.id}`)
  assert.equal(record.title.en.includes('Guo Wengui historical livestream'), false, `Overstated speaker attribution in title: ${record.id}`)
  assert.equal(record.verificationStatus, 'source_link_recorded')
  assert.equal(ids.has(record.id), false, `Duplicate public-record id: ${record.id}`)
  ids.add(record.id)

  const sources = [record.primarySource, ...(record.alternatives ?? [])]
  assert.ok(sources.length >= 1)
  for (const source of sources) {
    const url = new URL(source.url)
    assert.equal(url.protocol, 'https:')
    assert.equal(allowedHosts.has(url.hostname.toLowerCase()), true, `Unexpected public-record host: ${url.hostname}`)
    assert.equal(platformHosts.get(source.platform)?.has(url.hostname.toLowerCase()), true, `Platform/host mismatch for ${source.url}`)
    assert.equal(networkPolicy.isAllowedExternalUrl(url.toString()), true, `External browser policy rejected ${url.hostname}`)
    assert.equal(networkPolicy.isAllowedOutboundUrl(url.toString(), { includeAi: false }), false, `Public-record host must not gain backend fetch permission: ${url.hostname}`)
    assert.ok(source.platform)
    assert.equal(allSourceUrls.has(source.url), false, `Public-record source URL assigned more than once: ${source.url}`)
    allSourceUrls.add(source.url)
    const sourceIdentity = canonicalSourceIdentity(source)
    assert.equal(allSourceIdentities.has(sourceIdentity), false, `Public-record media assigned more than once: ${sourceIdentity}`)
    allSourceIdentities.add(sourceIdentity)
    if (source.checkedAt) assert.equal(Number.isNaN(Date.parse(source.checkedAt)), false, `Invalid source checkedAt: ${source.checkedAt}`)
  }
  for (const alternative of record.alternatives ?? []) {
    const explicitDates = new Set([
      ...sourceDates(alternative.sourceTitle),
      ...(alternative.platform === 'rumble' || alternative.platform === 'odysee' ? sourceDates(new URL(alternative.url).pathname) : []),
    ])
    assert.equal([...explicitDates].some((date) => date !== record.date), false, `Alternative source date mismatch for ${record.id}`)
  }
  assert.equal(primaryUrls.has(record.primarySource.url), false, `Duplicate primary public-record URL: ${record.primarySource.url}`)
  primaryUrls.add(record.primarySource.url)
}

const newest = await queryPublicRecords({ limit: 5, sort: 'newest' }, 'zh')
const oldest = await queryPublicRecords({ limit: 5, sort: 'oldest' }, 'en')
assert.equal(newest.summary.totalRecords, corpus.records.length)
assert.equal(newest.summary.sourceLinkCount, allSourceUrls.size)
assert.equal(newest.summary.discoveryLeadCount, newest.summary.totalRecords + newest.summary.unresolvedSourceLeads + newest.summary.duplicateLeads)
assert.ok(newest.summary.dateConflictCount > 0)
assert.ok(newest.summary.dateAdjacentCount > 0)
assert.ok(newest.records[0].date >= newest.records.at(-1).date)

const caseIds = new Set(cases.map((caseRecord) => caseRecord.id))
for (const caseId of publicRecordCaseReferenceIds()) {
  assert.equal(caseIds.has(caseId), true, `Public-record case link references an unknown case: ${caseId}`)
}

const linkedIds = linkedPublicRecordIds()
for (const recordId of linkedIds) {
  assert.equal(ids.has(recordId), true, `Public-record case-link whitelist references an unknown record: ${recordId}`)
}

const linkedRecords = corpus.records.filter((record) => linkedIds.has(record.id))
assert.equal(linkedRecords.length, linkedIds.size, 'Every whitelisted record must exist exactly once in the corpus.')
for (const record of linkedRecords) {
  const zhLinks = publicRecordCaseLinks(record, 'zh')
  const enLinks = publicRecordCaseLinks(record, 'en')
  assert.ok(zhLinks.length > 0, `Whitelisted record has no case links: ${record.id}`)
  assert.equal(enLinks.length, zhLinks.length, `Bilingual case-link count differs for ${record.id}`)
  for (const link of zhLinks) {
    assert.ok(link.caseId && link.caseTitle && link.docket)
    assert.ok(link.basis?.field === 'originalTitle' && link.basis.excerpt)
    assert.ok(link.explanation && link.legalBasis && link.boundary)
    assert.ok(link.officialLabel && link.officialUrl.startsWith('https://'))
    assert.equal(caseIds.has(link.caseId), true)
    assert.equal(networkPolicy.isAllowedExternalUrl(link.officialUrl), true, `Formal case source is blocked by the external-browser policy: ${link.officialUrl}`)
  }
  for (const link of enLinks) {
    assert.ok(link.caseTitle && link.explanation && link.legalBasis && link.boundary && link.officialLabel)
  }
}

const gtvPrivatePlacement = await queryPublicRecords({ q: 'GTV私募投资喜讯', limit: 120 }, 'zh')
const gtvPrivatePlacementRecord = gtvPrivatePlacement.records.find((record) => record.id === 'public-record-64d0c0178a564993')
assert.deepEqual(new Set(gtvPrivatePlacementRecord?.caseLinks.map((link) => link.caseId)), new Set(['sdny-23-cr-118', 'sdny-23-cv-2200', 'sec-admin-3-20537']))

const gtvPlatformOnly = await queryPublicRecords({ q: '黑客我们的GTV', limit: 120 }, 'zh')
const gtvPlatformOnlyRecord = gtvPlatformOnly.records.find((record) => record.id === 'public-record-f30b3236d53962fd')
assert.deepEqual(gtvPlatformOnlyRecord?.caseLinks, [], 'A title that merely uses GTV as a platform must not gain a case link.')

const gclubsRecordResult = await queryPublicRecords({ q: 'G CLUB2022年年会', limit: 120 }, 'zh')
const gclubsRecord = gclubsRecordResult.records.find((record) => record.id === 'public-record-211bd8a8565d04fa')
assert.deepEqual(new Set(gclubsRecord?.caseLinks.map((link) => link.caseId)), new Set(['sdny-23-cr-118', 'sdny-23-cv-2200']))

const excludedGcoinResult = await queryPublicRecords({ q: 'Gcoin Gdollar SEC下周开始退款', limit: 120 }, 'zh')
const excludedGcoinRecord = excludedGcoinResult.records.find((record) => record.id === 'public-record-c18de3f6a9222131')
assert.deepEqual(excludedGcoinRecord?.caseLinks, [], 'Gcoin/Gdollar and a pre-settlement SEC refund title must not be equated with H-Coin/H-Dollar or the GTV Fair Fund.')

const himalayaExchangeResult = await queryPublicRecords({ q: '喜联储', limit: 120 }, 'zh')
const himalayaExchangeRecord = himalayaExchangeResult.records.find((record) => record.id === 'public-record-5110a729601f1b0b')
assert.deepEqual(new Set(himalayaExchangeRecord?.caseLinks.map((link) => link.caseId)), new Set(['sdny-23-cr-118', 'sdny-23-cv-2200']))
assert.ok(himalayaExchangeRecord?.caseLinks.every((link) => link.explanation.includes('喜联储')))

const courtNamesOnlyRecord = {
  id: 'court-names-only-fixture',
  originalTitle: 'H-Coin, H-Dollar, HCN, HDO and Himalaya Exchange',
  alternatives: [],
}
assert.deepEqual(publicRecordCaseLinks(courtNamesOnlyRecord, 'en'), [], 'Court-used English names alone must not trigger a historical-record case link.')

const englishLinked = await queryPublicRecords({ q: 'G CLUB2022', limit: 120 }, 'en')
const englishLinkedRecord = englishLinked.records.find((record) => record.id === 'public-record-211bd8a8565d04fa')
assert.ok(englishLinkedRecord?.caseLinks.every((link) => link.explanation && link.legalBasis && link.boundary && link.officialLabel))
assert.ok(oldest.records[0].date <= oldest.records.at(-1).date)

const firstYear = corpus.records[0].date.slice(0, 4)
const yearResult = await queryPublicRecords({ year: firstYear, limit: 120 }, 'zh')
assert.ok(yearResult.records.every((record) => record.date.startsWith(firstYear)))

for (const [platform, count] of Object.entries(newest.summary.platformCounts)) {
  if (!count) continue
  const platformResult = await queryPublicRecords({ platform, limit: 1 }, 'en')
  assert.equal(platformResult.total, count, `Platform summary and filter disagree for ${platform}.`)
}

const expectedAlternativeUploaderMatches = corpus.records.filter((record) => [record.primarySource, ...(record.alternatives ?? [])]
  .some((source) => source.uploader.toLocaleLowerCase('en-US').includes('secret love miles guo'))).length
const alternativeUploaderSearch = await queryPublicRecords({ q: 'Secret Love Miles Guo', limit: 1 }, 'en')
assert.equal(alternativeUploaderSearch.total, expectedAlternativeUploaderMatches, 'Search must include alternate-source uploaders.')

const aliasSearch = await queryPublicRecords({ q: 'Miles Guo', limit: 1 }, 'en')
assert.equal(aliasSearch.total, corpus.records.length, 'Speaker aliases must search the complete public-record corpus.')
assert.equal(aliasSearch.records[0].speaker, 'Guo-related archive item')
assert.equal(aliasSearch.records[0].attributionStatus, 'source_metadata_only')

const englishUploader = await queryPublicRecords({ q: 'NFSC代理中', limit: 1 }, 'en')
assert.equal(englishUploader.total > 0, true, 'Search must continue to match the source-language uploader metadata.')
assert.equal(englishUploader.records[0].primarySource.uploader.includes('代理中'), false, 'English source metadata must not leak a Chinese account qualifier.')
assert.match(englishUploader.records[0].primarySource.uploader, /NFSC proxy account/)

const isoDateSearch = await queryPublicRecords({ q: corpus.coverage.end, limit: 1 }, 'en')
const slashDateSearch = await queryPublicRecords({ q: corpus.coverage.end.replaceAll('-', '/'), limit: 1 }, 'en')
const compactDateSearch = await queryPublicRecords({ q: corpus.coverage.end.replaceAll('-', ''), limit: 1 }, 'en')
assert.equal(slashDateSearch.total, isoDateSearch.total, 'Slash-form dates must match ISO-form dates.')
assert.equal(compactDateSearch.total, isoDateSearch.total, 'Compact dates must match ISO-form dates.')

const dateAndTextSearch = await queryPublicRecords({ q: '2022.11.01 尊敬的战友们好', limit: 120 }, 'zh')
assert.ok(dateAndTextSearch.records.length > 0)
assert.equal(dateAndTextSearch.records.every((record) => record.date === '2022-11-01'), true, 'A complete date in a mixed query must be an exact date constraint.')

const knownDateConflict = await queryPublicRecords({ q: '11月6号 尊敬的战友们好', limit: 120 }, 'zh')
const knownDateConflictRecord = knownDateConflict.records.find((record) => record.id === 'public-record-df8bd067d5056544')
assert.equal(knownDateConflictRecord?.dateStatus, 'conflict')
assert.equal(knownDateConflictRecord?.sourceDateCandidates.includes('2022-11-06'), true)

const conflictingSourceDateSearch = await queryPublicRecords({ q: '2022.08.30 Nicole', limit: 120 }, 'zh')
const conflictingSourceDateRecord = conflictingSourceDateSearch.records.find((record) => record.id === 'public-record-51a4798af06e1c81')
assert.equal(conflictingSourceDateRecord?.date, '2022-08-31')
assert.equal(conflictingSourceDateRecord?.dateStatus, 'adjacent')

const sourceUrlSearch = await queryPublicRecords({ q: 'YEsuZ6dZUhg', limit: 120 }, 'en')
assert.equal(sourceUrlSearch.total, 1, 'A source video id must locate its single canonical record.')
assert.equal(sourceUrlSearch.records[0]?.id, 'public-record-133eaa88d55d5edb')

const firstPage = await queryPublicRecords({ limit: 60, offset: 0, sort: 'newest' }, 'en')
const secondPage = await queryPublicRecords({ limit: 60, offset: 60, sort: 'newest' }, 'en')
const firstPageIds = new Set(firstPage.records.map((record) => record.id))
assert.equal(secondPage.records.some((record) => firstPageIds.has(record.id)), false, 'Adjacent public-record pages must not overlap.')
assert.equal(firstPage.hasMore, true)
assert.equal(secondPage.offset, 60)

const duplicateDisplayTitleResult = await queryPublicRecords({ q: '2023-02-28', limit: 120 }, 'en')
const duplicateDisplayTitleRecords = duplicateDisplayTitleResult.records
  .filter((record) => record.title === 'Guo-related public video on February 28, 2023')
assert.equal(duplicateDisplayTitleRecords.length, 2)
assert.deepEqual(duplicateDisplayTitleRecords.map((record) => record.displayTitleIndex), [1, 2])
assert.equal(duplicateDisplayTitleRecords.every((record) => record.displayTitleCount === 2), true)
assert.equal(new Set(duplicateDisplayTitleRecords.map((record) => record.primarySource.sourceTitle)).size, 2)

const may2017Record = corpus.records.find((record) => record.id === 'public-record-3fb1e72ca5958aa0')
const may2018Record = corpus.records.find((record) => record.id === 'public-record-133eaa88d55d5edb')
assert.equal(may2017Record?.originalTitle, '20170502')
assert.equal(may2017Record?.primarySource.platform, 'rumble')
assert.equal(may2017Record?.primarySource.url, 'https://rumble.com/v5768b8-20170502.html')
assert.equal(may2018Record?.primarySource.platform, 'youtube')
assert.equal(may2018Record?.primarySource.url, 'https://www.youtube.com/watch?v=YEsuZ6dZUhg')
assert.equal(may2018Record?.originalTitle.startsWith('20185月11号'), true)

console.log(`Public-record corpus check passed: ${corpus.records.length} records, ${allSourceUrls.size} unique source links.`)
