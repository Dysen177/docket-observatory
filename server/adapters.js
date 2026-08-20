import * as cheerio from 'cheerio'
import { scanPublicRecapFeeds, scanPublicRecapRelatedPortfolio, scanPublicRecapSearch, scanRecapArchive } from './recap-client.js'
import { readTextWithLimit, safeFetch } from './safe-fetch.js'
import { resolvedSecret } from './settings-store.js'
import networkPolicy from './network-policy.cjs'
import { normalizeDocketNumber } from './docket-number.js'
import { scanCurrentHimalayaRestoration, scanHistoricalHimalayaRestoration } from './himalaya-restoration.js'

const { isAllowedOutboundUrl } = networkPolicy

const monthMap = new Map(
  Object.entries({
    january: '01',
    jan: '01',
    february: '02',
    feb: '02',
    march: '03',
    mar: '03',
    april: '04',
    apr: '04',
    may: '05',
    june: '06',
    jun: '06',
    july: '07',
    jul: '07',
    august: '08',
    aug: '08',
    september: '09',
    sept: '09',
    sep: '09',
    october: '10',
    oct: '10',
    november: '11',
    nov: '11',
    december: '12',
    dec: '12',
  }),
)

function cleanText(value) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[（(]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sourceStatus(source, startTime, status, message, extras = {}) {
  return {
    sourceId: source.id,
    status,
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    itemCount: extras.itemCount ?? 0,
    message,
    retryable: extras.retryable === true,
    retryAt: typeof extras.retryAt === 'string' ? extras.retryAt : null,
    retryAfterMs: Number.isFinite(Number(extras.retryAfterMs)) ? Math.max(0, Number(extras.retryAfterMs)) : null,
    facts: extras.facts ?? [],
  }
}

async function fetchText(url, timeoutMs = 15000) {
  const response = await safeFetch(url, {
    headers: {
      'User-Agent': 'guo-intel-local/0.1 (+local research app)',
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    },
  }, { timeoutMs, includeOpenAI: false })
  const text = await readTextWithLimit(response)
  return { response, text }
}

export function parseDocketFilingDate(text) {
  // Mirror titles also contain dates from exhibits (for example, "Complaint
  // dated August 8, 2019"). Only accept a date in the filing-date slot
  // immediately after the complete Doc number.
  const normalized = cleanText(text)
  const filingSlot = normalized.match(
    /^Doc\s+\d+(?:-\d+)*\s*,\s*(January|February|March|April|May|June|July|August|September|Sept|Sep|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Oct|Nov|Dec)\.?\s+(\d{1,2}),\s*(20\d{2})(?=\s*(?:[,—-]|$))/i,
  )
  const explicitDate = normalized.match(
    /\b(?:filed|entered|docketed)(?:\s+on)?\s*:?\s*(?:(January|February|March|April|May|June|July|August|September|Sept|Sep|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Oct|Nov|Dec)\.?\s+(\d{1,2}),\s*(20\d{2})|(\d{1,2})\/(\d{1,2})\/(20\d{2}))\b/i,
  )
  const match = filingSlot ?? explicitDate
  if (!match) return null
  const month = match[1]
    ? monthMap.get(match[1].toLowerCase().replace(/\.$/, ''))
    : String(match[4]).padStart(2, '0')
  if (!month) return null
  const day = match[1] ? match[2] : match[5]
  const year = match[1] ? match[3] : match[6]
  return `${year}-${month}-${String(day).padStart(2, '0')}`
}

function eventCategory(text) {
  const lower = text.toLowerCase()
  if (lower.includes('mandamus')) return 'Mandamus'
  if (lower.includes('notice of appeal') || lower.includes('second circuit')) return 'Appeal'
  if (lower.includes('sentenc')) return 'Sentencing'
  if (/\b(?:judgment entered|entered judgment|judgment in a criminal case|final judgment)\b/i.test(text)) return 'Judgment'
  if (lower.includes('forfeiture') || lower.includes('853') || lower.includes('remission')) return 'Forfeiture'
  if (lower.includes('judgment')) return 'Judgment'
  if (lower.includes('transcript')) return 'Transcript'
  if (lower.includes('brady') || lower.includes('subpoena')) return 'Discovery'
  if (lower.includes('trial') || lower.includes('verdict')) return 'Trial'
  if (lower.includes('order')) return 'Order'
  return 'Docket Filing'
}

function eventSeverity(category, text) {
  const lower = text.toLowerCase()
  if (['Judgment', 'Sentencing', 'Appeal'].includes(category)) return 'critical'
  if (lower.includes('$889') || lower.includes('$1.3') || lower.includes('bankruptcy assets')) return 'critical'
  if (['Mandamus', 'Forfeiture'].includes(category)) return 'high'
  if (lower.includes('denies') || lower.includes('grants') || lower.includes('hearing')) return 'medium'
  return 'low'
}

function relatedCaseIdsForText(text) {
  const lower = text.toLowerCase()
  const related = new Set(['sdny-23-cr-118'])
  if (hasSecReference(text) || lower.includes('gtv')) {
    related.add('sdny-23-cv-2200')
    related.add('sec-admin-3-20537')
  }
  if (lower.includes('bankruptcy') || lower.includes('trustee')) related.add('dconn-22-50073')
  if (lower.includes('yvette') || lower.includes('wang')) related.add('related-people-companies')
  return [...related]
}

export function entityIdsForText(text) {
  const lower = text.toLowerCase()
  const entities = new Set()
  if (lower.includes('guo') || lower.includes('kwok') || lower.includes('miles')) entities.add('ho-wan-kwok')
  if (/\b(?:kin\s+ming\s+je|william\s+je|je)\b/i.test(text)) entities.add('kin-ming-je')
  if (lower.includes('wang') || lower.includes('yvette')) entities.add('yanping-wang')
  if (lower.includes('gtv')) entities.add('gtv-media')
  if (lower.includes('hk international')) entities.add('hk-international')
  return [...entities]
}

function tagsForText(text) {
  const lower = text.toLowerCase()
  const tags = new Set()
  const tagRules = [
    ['mandamus', 'mandamus'],
    ['forfeiture', 'forfeiture'],
    ['853', '853(n)'],
    ['appeal', 'appeal'],
    ['second circuit', 'Second Circuit'],
    ['sentenc', 'sentencing'],
    ['victim', 'victim list'],
    ['bankruptcy', 'bankruptcy'],
    ['gtv', 'GTV'],
    ['barclays', 'Barclays'],
    ['banco popular', 'Banco Popular'],
    ['brady', 'Brady'],
    ['subpoena', 'subpoena'],
  ]
  for (const [needle, tag] of tagRules) {
    if (lower.includes(needle)) tags.add(tag)
  }
  if (hasSecReference(text)) tags.add('SEC')
  return [...tags]
}

export function hasSecReference(text) {
  return /\bSEC\b|Securities\s+and\s+Exchange\s+Commission|\bdisgorg(?:e|ed|ement|ing)?\b|\bFair\s+Fund\b/i.test(String(text ?? ''))
}

function summarizeDocketText(text) {
  const normalized = cleanText(text)
  const split = normalized.split(/\s+[—-]\s+/)
  if (split.length > 1) return cleanText(split.slice(1).join(' - '))
  return cleanText(
    normalized.replace(
      /^Doc\s+\d+(?:-\d+)*\s*,?\s*(?:(?:January|February|March|April|May|June|July|August|September|Sept|Sep|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Oct|Nov|Dec)\.?\s+\d{1,2},\s*20\d{2},?\s*)?/i,
      '',
    ),
  )
}

function titleForDoc(docNumber, summary, category) {
  const compact = summary.replace(/\.$/, '')
  const maxLength = 112
  const shortened = compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact
  return `Doc ${docNumber}: ${category === 'Docket Filing' ? shortened : shortened}`
}

export async function nfscCriminalMirror(source) {
  const start = Date.now()
  const { response, text } = await fetchText(source.url)
  if (!response.ok) {
    return {
      events: [],
      status: sourceStatus(source, start, 'error', `HTTP ${response.status} while fetching mirror page.`),
    }
  }

  const events = parseNfscTimelineEvents(text, source)
  if (!events.length) {
    return {
      events: [],
      status: sourceStatus(source, start, 'limited', 'The mirror page is reachable, but no dated docket entries were parsed. The previous usable observation is retained pending parser review.', {
        retryable: true,
        facts: [{ label: 'Dated docket entries', value: '0', detail: 'The page structure may have changed or the response may be incomplete.' }],
      }),
    }
  }

  return {
    events,
    status: sourceStatus(source, start, 'ok', `Parsed ${events.length} timeline events from ${events.length} dated docket numbers on the public mirror; the file library retains all attachments and language copies.`, {
      itemCount: events.length,
      facts: events.slice(0, 3).map((event) => ({
        label: `Latest Doc ${event.filingNumber}`,
        value: event.date,
        detail: event.summary,
      })),
    }),
  }
}

export function parseNfscTimelineEvents(text, source) {
  const $ = cheerio.load(text)
  const byDoc = new Map()

  $('a').each((_, element) => {
    const linkText = cleanText($(element).text())
    const href = $(element).attr('href') ?? ''
    const match = linkText.match(/Doc\s+(\d+(?:-\d+)*)/i) || href.match(/Doc(?:%20|\s|-)?(\d+(?:-\d+)*)/i)
    if (!match) return

    const filingNumber = normalizeDocketNumber(match[1])
    const summary = summarizeDocketText(linkText)
    const date = parseDocketFilingDate(linkText) ?? '1900-01-01'
    const category = eventCategory(linkText)
    const sourceUrl = allowedSourceUrl(href, source.url)
    if (!sourceUrl) return

    const event = {
      id: `sdny-23-cr-118-doc-${filingNumber}`,
      date,
      title: titleForDoc(filingNumber, summary, category),
      summary,
      impact: impactForCategory(category, summary),
      caseId: 'sdny-23-cr-118',
      relatedCaseIds: relatedCaseIdsForText(linkText),
      court: category === 'Appeal' || linkText.toLowerCase().includes('second circuit') ? 'S.D.N.Y. / Second Circuit' : 'S.D.N.Y.',
      docketNumber: '1:23-cr-00118-AT',
      filingNumber,
      category,
      severity: eventSeverity(category, linkText),
      sourceId: source.id,
      sourceLabel: source.shortName,
      sourceType: source.type,
      sourceUrl,
      confidence: source.confidence,
      assertionType: classifyDocketAssertionType(category, linkText),
      entities: entityIdsForText(linkText),
      tags: tagsForText(linkText),
    }
    const score = representativeDocketLinkScore({ linkText, sourceUrl, date, filingNumber })
    const existing = byDoc.get(filingNumber)
    if (!existing || score > existing.score) byDoc.set(filingNumber, { event, score })
  })

  return [...byDoc.values()]
    .map((item) => item.event)
    .filter((event) => event.date !== '1900-01-01')
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.filingNumber) - Number(a.filingNumber))
}

function impactForCategory(category, summary) {
  const lower = summary.toLowerCase()
  if (category === 'Appeal') return 'Creates or updates the controlling appellate track; confirm Second Circuit docket and deadlines.'
  if (category === 'Mandamus') return 'Signals unresolved third-party or procedural disputes, but legal effect depends on the appellate disposition.'
  if (category === 'Forfeiture') return 'May alter asset recovery, third-party claim deadlines, remission strategy, or overlap with SEC and bankruptcy proceedings.'
  if (category === 'Sentencing') return 'Affects appeal issues, custody exposure, loss findings, and the forfeiture/restitution framework.'
  if (category === 'Judgment') return 'Defines the appealable final judgment and post-judgment enforcement posture.'
  if (lower.includes('brady') || lower.includes('subpoena')) return 'Potential appellate or post-trial issue; verify against the order and transcript.'
  return 'New docket activity; classify after reading the PDF or court docket entry.'
}

export function classifyDocketAssertionType(category, text) {
  const lower = text.toLowerCase()
  const subject = summarizeDocketText(text).toLowerCase()
  const courtActor = /^(?:the )?(?:court|judge|magistrate|jury|second circuit|appeals? court|district court)\b/
  const courtDisposition = /\b(?:orders?|ordered|grants?|granted|denies?|denied|denying|dismisses?|dismissed|rejects?|rejected|enters?|entered|rules?|ruled|holds?|held|vacates?|vacated|affirms?|affirmed|allows?|allowed|sustains?|sustained|sentences?|sentenced|issues?|issued)\b/
  const courtDocument = /^(?:order|judgment|mandate|opinion|decision|memo endorsement|endorsed letter|minute entry)\b/
  if (category === 'Transcript' || lower.includes('transcript')) return 'Transcript or court notice'
  if (category === 'Judgment' || courtDocument.test(subject) || (courtActor.test(subject) && courtDisposition.test(subject))) return 'Court order or judgment'
  if (/\b(?:pro se|third[- ]party|petitioner|claimant)\b/.test(subject) || /\bpetitions?\b/.test(subject)) return 'Third-party or pro se filing'
  if (/^(?:the )?(?:defense|defendant|defense counsel|miles guo|ho wan kwok|guo('|’)s counsel)\b/.test(subject)
    || /^letter motion\b.*\bdefense\b/.test(subject)) return 'Party filing'
  if (/^(?:the )?(?:government|united states|usa|prosecution|prosecutors?|u\.s\. attorney|department of justice|doj)\b/.test(subject)) return 'Government filing'
  if (/\b(?:motion|moves?|letter|opposition|reply|memorandum|asks?|requests?|seeks?|notice of appeal)\b/.test(subject)) return 'Party filing'
  return 'Docket entry'
}

function allowedSourceUrl(href, baseUrl) {
  try {
    const value = href ? new URL(href, baseUrl).toString() : String(baseUrl)
    return isAllowedOutboundUrl(value, { includeOpenAI: false }) ? value : ''
  } catch {
    return ''
  }
}

function representativeDocketLinkScore({ linkText, sourceUrl, date, filingNumber }) {
  const decodedUrl = decodeURIComponent(sourceUrl)
  const combined = `${linkText} ${decodedUrl}`
  const escapedNumber = String(filingNumber).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let score = date !== '1900-01-01' ? 1000 : 0
  if (new RegExp(`Doc[-_ ]*0*${escapedNumber}(?:\\.0)?\\.pdf(?:$|[?#])`, 'i').test(decodedUrl)) score += 240
  if (new RegExp(`^Doc\\s+0*${escapedNumber}(?![-.]\\d)`, 'i').test(linkText)) score += 80
  if (new RegExp(`Doc[-_ ]*0*${escapedNumber}[-.]\\d`, 'i').test(combined)) score -= 160
  if (/(?:_CN\b|\bCN[-_.]|\u4e2d\u6587|translation|translated)/i.test(combined)) score -= 320
  score += Math.min(cleanText(linkText).length, 120) / 10
  return score
}

export async function dojVictimPage(source) {
  const start = Date.now()
  const { response, text } = await fetchText(source.url)
  if (!response.ok) {
    return { events: [], status: sourceStatus(source, start, 'error', `HTTP ${response.status} from DOJ victim page.`) }
  }

  const $ = cheerio.load(text)
  const body = cleanText($('body').text())
  const facts = []
  for (const [label, pattern] of [
    ['Miles Guo / Ho Wan Kwok named', /Ho Wan Kwok|Miles Guo/i],
    ['Kin Ming Je / William Je named', /Kin Ming Je|William Je/i],
    ['Yanping Wang / Yvette named', /Yanping Wang|Yvette/i],
    ['Victim information page reachable', /Victims|Victim|Large Cases/i],
  ]) {
    facts.push({ label, value: pattern.test(body) ? 'found' : 'not found', detail: pattern.test(body) ? 'Text marker found on DOJ page.' : 'Text marker not found in fetched body.' })
  }

  return {
    events: [],
    status: sourceStatus(source, start, 'ok', 'Official DOJ victim page is reachable.', {
      itemCount: facts.filter((fact) => fact.value === 'found').length,
      facts,
    }),
  }
}

export async function dojSentencingRelease(source) {
  const start = Date.now()
  const { response, text } = await fetchText(source.url)
  if (!response.ok) {
    return { events: [], status: sourceStatus(source, start, 'error', `HTTP ${response.status} from DOJ press release.`) }
  }

  const challenged = text.includes('/_sec/verify') || text.includes('triggerInterstitialChallenge')
  if (challenged) {
    return {
      events: [],
      status: sourceStatus(source, start, 'limited', 'DOJ press release responded with a security interstitial; use browser/manual verification or DOJ victim page.', {
        itemCount: 0,
        facts: [{ label: 'Anti-bot interstitial', value: 'detected', detail: 'Automated fetch did not receive article text.' }],
      }),
    }
  }

  const $ = cheerio.load(text)
  const body = cleanText($('body').text())
  const facts = [
    { label: '30-year sentence marker', value: /30 years|360 months/i.test(body) ? 'found' : 'not found', detail: 'Checks press-release body text.' },
    { label: 'Fraud scheme marker', value: /fraud/i.test(body) ? 'found' : 'not found', detail: 'Checks press-release body text.' },
  ]
  return {
    events: [],
    status: sourceStatus(source, start, 'ok', 'DOJ sentencing press release is reachable.', {
      itemCount: facts.filter((fact) => fact.value === 'found').length,
      facts,
    }),
  }
}

export async function secPressRelease(source) {
  const start = Date.now()
  const { response, text } = await fetchText(source.url)
  if (!response.ok) {
    return { events: [], status: sourceStatus(source, start, 'error', `HTTP ${response.status} from SEC press release.`) }
  }

  const $ = cheerio.load(text)
  const body = cleanText($('body').text())
  const facts = [
    { label: '$850M fraud allegation marker', value: /\$850|850 million/i.test(body) ? 'found' : 'not found', detail: 'Agency allegation marker.' },
    { label: 'William Je marker', value: /William Je|Kin Ming Je/i.test(body) ? 'found' : 'not found', detail: 'Related defendant marker.' },
    { label: 'GTV marker', value: /GTV/i.test(body) ? 'found' : 'not found', detail: 'Entity marker.' },
  ]

  return {
    events: [],
    status: sourceStatus(source, start, 'ok', 'SEC press release is reachable.', {
      itemCount: facts.filter((fact) => fact.value === 'found').length,
      facts,
    }),
  }
}

export async function gtvFairFund(source) {
  const start = Date.now()
  const { response, text } = await fetchText(source.url)
  if (!response.ok) {
    return { events: [], status: sourceStatus(source, start, 'error', `HTTP ${response.status} from GTV Fair Fund.`) }
  }

  const $ = cheerio.load(text)
  const body = cleanText($('body').text())
  const amount = body.match(/\$[0-9,]+\.[0-9]{2}/)?.[0] ?? 'not found'
  const secondTranche = /September 29, 2023/i.test(body) ? '2023-09-29' : 'not found'
  const facts = [
    { label: 'Paid-to-fund amount marker', value: amount, detail: 'First dollar amount detected on the Fair Fund page.' },
    { label: 'Second tranche commenced', value: secondTranche, detail: 'Distribution date marker on Fair Fund page.' },
  ]

  return {
    events: [],
    status: sourceStatus(source, start, 'ok', 'GTV Fair Fund page is reachable.', {
      itemCount: facts.filter((fact) => fact.value !== 'not found').length,
      facts,
    }),
  }
}

export async function himalayaRestoration(source) {
  const start = Date.now()
  const archive = await scanCurrentHimalayaRestoration()
  const facts = archive.records
    .filter((record) => record.kind !== 'media')
    .slice(0, 5)
    .map((record) => ({
      label: record.title,
      value: record.modifiedAt ?? record.publishedAt ?? 'public',
      detail: record.sourceUrl,
    }))
  return {
    events: [],
    status: sourceStatus(source, start, 'ok', `Himalaya Restoration current site exposed ${archive.records.length} public page/post/media record(s) and ${archive.documents.length} linked public PDF(s).`, {
      itemCount: archive.records.length + archive.documents.length,
      facts,
    }),
  }
}

export async function himalayaRestorationArchive(source) {
  const start = Date.now()
  const archive = await scanHistoricalHimalayaRestoration()
  const facts = archive.pages.slice(0, 5).map((page) => ({
    label: page.title,
    value: `${page.documentCount} PDF link(s)`,
    detail: page.replayUrl,
  }))
  return {
    events: [],
    status: sourceStatus(source, start, archive.documents.length ? 'ok' : 'limited', `Himalaya Restoration historical archive exposed ${archive.pages.length} captured legal-update page(s) and ${archive.documents.length} previously public PDF link(s).`, {
      itemCount: archive.pages.length + archive.documents.length,
      facts,
      retryable: archive.documents.length === 0,
    }),
  }
}

export async function epiqKwokDocket(source) {
  const start = Date.now()
  const { response, text } = await fetchText(source.url)
  if (!response.ok) {
    return { events: [], status: sourceStatus(source, start, 'error', `HTTP ${response.status} from Epiq docket page.`) }
  }

  const hasAppShell = text.includes('<app-controller>') || text.includes('/dist/main-')
  const facts = [
    {
      label: 'Epiq app shell',
      value: hasAppShell ? 'reachable' : 'not detected',
      detail: hasAppShell ? 'Static page loaded; full docket extraction needs JSON endpoint mapping.' : 'Unexpected response shape.',
    },
  ]

  return {
    events: [],
    status: sourceStatus(source, start, hasAppShell ? 'limited' : 'ok', 'Epiq docket shell is reachable; docket-row extraction is not enabled in this first adapter.', {
      itemCount: hasAppShell ? 1 : 0,
      facts,
    }),
  }
}

export async function courtlistenerRecap(source) {
  const start = Date.now()
  const token = resolvedSecret('courtlistenerToken')
  if (!token) {
    const [archive, searchArchive, relatedArchive] = await Promise.all([
      scanPublicRecapFeeds(),
      scanPublicRecapSearch({ pageLimit: 1 }),
      scanPublicRecapRelatedPortfolio({ pageLimit: 1 }),
    ])
    const failedTargetIds = new Set([
      ...archive.targets.filter((target) => target.error).map((target) => Number(target.courtListenerDocketId)),
      ...searchArchive.targets.filter((target) => target.error).map((target) => Number(target.courtListenerDocketId)),
    ])
    const docketEntries = archive.targets.reduce((total, target) => total + target.docketEntries, 0)
    const structuredEntries = searchArchive.targets.reduce((total, target) => total + target.docketEntries, 0)
    const reachableTargets = archive.targets.length - failedTargetIds.size
    const retry = courtListenerRetryMetadata([
      ...archive.targets.map((target) => target.error),
      ...searchArchive.targets.map((target) => target.error),
      ...relatedArchive.failures,
    ])
    return {
      events: mergeCourtListenerEvents(archive.events, searchArchive.events, relatedArchive.events),
      status: sourceStatus(source, start, docketEntries || structuredEntries || relatedArchive.events.length ? 'limited' : 'error', `CourtListener public RECAP sources scanned ${reachableTargets}/${archive.targets.length} tracked docket(s) plus ${relatedArchive.acceptedDocketCount} accepted related docket(s), returned ${docketEntries} recent feed entries, ${structuredEntries} structured tracked entries, ${relatedArchive.events.length} related-search entries, and exposed ${searchArchive.documents.length + relatedArchive.documents.length} public PDF(s). A token is optional and adds full docket-entry pagination.`, {
        itemCount: Math.max(docketEntries, structuredEntries, relatedArchive.events.length),
        retryable: failedTargetIds.size > 0 || relatedArchive.failures.length > 0,
        ...retry,
        facts: archive.targets.map((target) => ({
          label: target.label,
          value: target.error ? 'feed error' : `${target.docketEntries} recent entries`,
          detail: target.error || `${target.latestDate ? `Latest observed ${target.latestDate}. ` : ''}Public feed and structured search are limited snapshots; use PACER as the docket of record.`,
        })).concat([{
          label: 'Related-name discovery',
          value: `${relatedArchive.acceptedDocketCount} accepted dockets`,
          detail: `${relatedArchive.documents.length} available public PDF(s); ${relatedArchive.failures.length} search failure(s). Each new relationship remains marked for review.`,
        }]),
      }),
    }
  }

  const archive = await scanRecapArchive({ pageLimit: 2 })
  const matchingDockets = archive.targets.reduce((total, target) => total + target.matchingDockets, 0)
  const docketEntries = archive.targets.reduce((total, target) => total + target.docketEntries, 0)
  return {
    events: archive.events,
    status: sourceStatus(source, start, 'ok', `CourtListener / RECAP scanned ${archive.targets.length} tracked case(s), ${matchingDockets} matching docket(s), ${docketEntries} docket entries, and ${archive.documents.length} available PDF(s).`, {
      itemCount: docketEntries,
      facts: archive.targets.map((target) => ({
        label: target.label,
        value: `${target.docketEntries} entries`,
        detail: `${target.matchingDockets} matching docket(s); ${target.availableDocuments} available PDF(s).${target.docketUrls[0] ? ` ${target.docketUrls[0]}` : ''}`,
      })),
    }),
  }
}

function mergeCourtListenerEvents(...collections) {
  return [...new Map(collections.flat().map((event) => [
    `${event.courtListenerDocketId}:${normalizeDocketNumber(event.filingNumber)}:${event.date}`,
    event,
  ])).values()]
}

export async function pacerPlaceholder(source) {
  const start = Date.now()
  const hasCredentials = Boolean(resolvedSecret('pacerUsername') && resolvedSecret('pacerPassword'))
  return {
    events: [],
    status: sourceStatus(
      source,
      start,
      hasCredentials ? 'needs_implementation' : 'needs_credentials',
      hasCredentials
        ? 'PACER credentials detected; fee-aware docket adapter still needs explicit implementation.'
        : 'Configure PACER credentials in Settings; the official adapter still requires fee controls and explicit implementation.',
      {
        facts: [
          {
            label: 'Official docket of record',
            value: hasCredentials ? 'credentials detected' : 'credentials missing',
            detail: 'PACER integration should require explicit fee and rate controls.',
          },
        ],
      },
    ),
  }
}

export async function federalRegisterPolicy(source) {
  const start = Date.now()
  const term = encodeURIComponent('criminal forfeiture remission SEC Fair Fund bankruptcy asset recovery')
  const url = `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=${term}&per_page=5&order=newest`
  const { response, text } = await fetchText(url)
  if (!response.ok) {
    return { events: [], status: sourceStatus(source, start, 'error', `Federal Register API returned HTTP ${response.status}.`) }
  }

  const payload = JSON.parse(text)
  const facts = (payload.results ?? []).slice(0, 3).map((item) => ({
    label: item.publication_date ?? 'Federal Register',
    value: item.title ?? 'Untitled',
    detail: item.html_url ?? item.pdf_url ?? source.url,
  }))

  return {
    events: [],
    status: sourceStatus(source, start, 'ok', `Federal Register policy search returned ${payload.count ?? 0} result(s).`, {
      itemCount: payload.count ?? 0,
      facts,
    }),
  }
}

const adapterMap = {
  nfscCriminalMirror,
  dojVictimPage,
  dojSentencingRelease,
  secPressRelease,
  gtvFairFund,
  himalayaRestoration,
  himalayaRestorationArchive,
  epiqKwokDocket,
  courtlistenerRecap,
  pacerPlaceholder,
  federalRegisterPolicy,
}

export async function runSourceAdapters(sources) {
  const enabledSources = sources.filter((source) => source.enabled)
  const results = await Promise.all(
    enabledSources.map(async (source) => {
      const adapter = adapterMap[source.adapter]
      if (!adapter) {
        return {
          events: [],
          status: sourceStatus(source, Date.now(), 'error', `No adapter registered for ${source.adapter}.`),
        }
      }

      try {
        return await adapter(source)
      } catch (error) {
        return {
          events: [],
          status: sourceStatus(source, Date.now(), 'error', error instanceof Error ? error.message : String(error), {
            retryable: true,
            retryAt: error?.retryAt,
            retryAfterMs: error?.retryAfterMs,
          }),
        }
      }
    }),
  )

  return {
    events: results.flatMap((result) => result.events),
    statuses: results.map((result) => result.status),
  }
}

function courtListenerRetryMetadata(values) {
  const retryTimes = values
    .filter(Boolean)
    .map((value) => String(value).match(/paused until\s+([^\s]+)\s+after HTTP 429/i)?.[1])
    .map((value) => Date.parse(value ?? ''))
    .filter((value) => Number.isFinite(value) && value > Date.now())
  if (!retryTimes.length) return {}
  const retryAtMs = Math.max(...retryTimes)
  return {
    retryAt: new Date(retryAtMs).toISOString(),
    retryAfterMs: retryAtMs - Date.now(),
  }
}
