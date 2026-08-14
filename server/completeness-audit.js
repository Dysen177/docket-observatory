import * as cheerio from 'cheerio'
import { createHash } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { atomicWriteJson, atomicWriteText } from './atomic-write.js'
import { normalizeDocketNumber } from './docket-number.js'
import { recapTargets, scanPublicRecapFeeds, scanPublicRecapPortfolio, scanPublicRecapSearch, scanRecapArchive } from './recap-client.js'
import { readTextWithLimit, safeFetch } from './safe-fetch.js'
import { resolvedSecret } from './settings-store.js'

const schemaVersion = 4
const compatibleSchemaVersions = new Set([3, schemaVersion])
const observationSnapshotVersion = 1
const candidateQueries = [
  '"Ho Wan Kwok"',
  '"Miles Guo"',
  '"GTV Media"',
  '"HK International Funds Investments"',
  '"Lady May"',
  '"Kwok Trustee"',
  '"Rule of Law Foundation"',
  '"Saraca Media"',
  '"Voice of Guo"',
  '"Himalaya Exchange"',
  '"22-50073"',
  '"Luc A. Despins"',
]

const confirmedRelations = new Map([
  [73162417, { relation: 'direct', reason: 'The captioned Second Circuit proceeding expressly arises from S.D.N.Y. 1:23-cr-00118.' }],
  [68240777, { relation: 'direct', reason: 'The bankruptcy adversary record expressly identifies jointly administered case 22-50073.' }],
  [68254946, { relation: 'direct', reason: 'The Chapter 11 trustee adversary record expressly identifies the Ho Wan Kwok estate.' }],
  [68254326, { relation: 'direct', reason: 'The bankruptcy adversary record expressly identifies case 22-50073.' }],
  [68239714, { relation: 'direct', reason: 'The trustee adversary proceeding is filed under the Ho Wan Kwok bankruptcy estate.' }],
  [68241991, { relation: 'direct', reason: 'The bankruptcy adversary record expressly identifies case 22-50073.' }],
  [68240777, { relation: 'direct', reason: 'The bankruptcy adversary record expressly identifies case 22-50073.' }],
  [63226971, { relation: 'direct', reason: 'The caption directly names HK International Funds Investments and the Chapter 11 trustee.' }],
  [71117828, { relation: 'direct', reason: 'The trustee adversary complaint is part of the Ho Wan Kwok estate recovery line.' }],
  [71118337, { relation: 'direct', reason: 'The trustee adversary complaint is part of the Ho Wan Kwok estate recovery line.' }],
  [60004239, { relation: 'direct', reason: 'The caption directly names Voice of Guo Media Incorporated.' }],
  [68256882, { relation: 'direct', reason: 'The caption and public party record identify a trustee adversary proceeding involving Lamp Capital and the Ho Wan Kwok estate recovery line.' }],
])

export async function readCompletenessAudit(cacheDir, manifest, state) {
  const cachePath = path.join(cacheDir, 'completeness-audit.json')
  try {
    const cached = JSON.parse(await readFile(cachePath, 'utf8'))
    if (compatibleSchemaVersions.has(cached?.schemaVersion)) return normalizeCachedAudit(cached)
  } catch {
    // Build a local-only baseline when no prior online audit exists.
  }
  return buildCompletenessAudit({ manifest, state, mode: 'local' })
}

export async function refreshCompletenessAudit({ cacheDir, outputDir, manifest, state, portfolioPageLimit = 5 }) {
  const attemptedAt = new Date().toISOString()
  const auditPath = path.join(cacheDir, 'completeness-audit.json')
  const observationPath = path.join(cacheDir, 'completeness-observations.json')
  const previousAudit = await readCachedAuditFile(auditPath)
  const previousObservations = await readObservationSnapshot(observationPath)
  const publicResults = await Promise.allSettled([
    scanPublicRecapFeeds(),
    scanPublicRecapSearch({ pageLimit: 1 }),
    scanPublicRecapPortfolio({ query: '"22-50073"', courtId: 'ctb', pageLimit: portfolioPageLimit }),
  ])
  const sourceNames = ['public_feed', 'public_search', 'public_portfolio']
  const sourceStatus = Object.fromEntries(publicResults.map((result, index) => [sourceNames[index], archiveSourceStatus(result, attemptedAt)]))
  const publicArchive = settledValue(publicResults[0])
  const publicSearchArchive = settledValue(publicResults[1])
  const publicPortfolioArchive = settledValue(publicResults[2])
  const effectivePublicArchive = mergeObservationArchive(publicArchive, previousObservations?.publicArchive)
  const effectivePublicSearchArchive = mergeObservationArchive(publicSearchArchive, previousObservations?.publicSearchArchive)
  let reusedObservationSnapshot = effectivePublicArchive.reusedPrevious || effectivePublicSearchArchive.reusedPrevious
  const errors = publicResults.flatMap((result, index) => result.status === 'rejected'
    ? [`${sourceNames[index]}: ${errorMessage(result.reason)}`]
    : [])
  for (const sourceName of sourceNames) {
    const status = sourceStatus[sourceName]
    if (status?.error && !errors.some((message) => message === `${sourceName}: ${status.error}`)) {
      errors.push(`${sourceName}: ${status.error}`)
    }
  }
  let recapArchive = null
  let recapError = ''
  if (resolvedSecret('courtlistenerToken')) {
    try {
      recapArchive = await scanRecapArchive({ pageLimit: 100 })
      sourceStatus.recap_api = { status: 'ok', checkedAt: attemptedAt, error: '' }
    } catch (error) {
      recapError = error instanceof Error ? error.message : String(error)
      sourceStatus.recap_api = { status: 'error', checkedAt: attemptedAt, error: recapError }
      errors.push(`recap_api: ${recapError}`)
    }
  } else {
    sourceStatus.recap_api = { status: 'not_configured', checkedAt: attemptedAt, error: '' }
  }
  const currentDiscovery = await discoverRelatedDockets(publicPortfolioArchive)
  const effectiveDiscovery = mergeDiscoveryObservation(currentDiscovery, previousObservations?.discovery ?? previousAudit?.discovery)
  const discovery = effectiveDiscovery.discovery
  reusedObservationSnapshot = reusedObservationSnapshot || effectiveDiscovery.reusedPrevious
  sourceStatus.discovery = {
    status: discovery.status === 'ok' ? 'ok' : 'partial',
    checkedAt: attemptedAt,
    error: (discovery.failures ?? []).join(' | '),
  }
  errors.push(...(discovery.failures ?? []).map((failure) => `discovery: ${failure}`))
  const primarySourceNames = ['public_feed', 'public_search', 'public_portfolio', 'recap_api']
  const successfulPrimarySources = primarySourceNames
    .filter((sourceName) => ['ok', 'partial'].includes(sourceStatus[sourceName]?.status))
    .length
  if (successfulPrimarySources === 0 && previousAudit) {
    const staleAudit = {
      ...previousAudit,
      schemaVersion,
      refresh: {
        status: 'stale',
        attemptedAt,
        dataGeneratedAt: previousAudit.generatedAt,
        lastSuccessfulOnlineAt: previousAudit.refresh?.lastSuccessfulOnlineAt ?? previousAudit.generatedAt,
        usedPreviousSuccessfulAudit: true,
        sources: sourceStatus,
      },
      errors,
    }
    await writeAuditOutputs(cacheDir, outputDir, staleAudit)
    return staleAudit
  }
  const configuredSources = Object.values(sourceStatus).filter((source) => source.status !== 'not_configured')
  const refreshStatus = successfulPrimarySources === 0
    ? 'local_only'
    : configuredSources.every((source) => source.status === 'ok') ? 'complete' : 'partial'
  const audit = buildCompletenessAudit({
    manifest,
    state,
    mode: recapArchive ? 'recap_api' : 'public_feed',
    publicArchive: effectivePublicArchive.archive,
    publicSearchArchive: effectivePublicSearchArchive.archive,
    recapArchive,
    recapError,
    discovery,
  })
  const refreshedAudit = {
    ...audit,
    refresh: {
      status: refreshStatus,
      attemptedAt,
      dataGeneratedAt: audit.generatedAt,
      lastSuccessfulOnlineAt: successfulPrimarySources > 0
        ? attemptedAt
        : previousAudit?.refresh?.lastSuccessfulOnlineAt ?? null,
      usedPreviousSuccessfulAudit: reusedObservationSnapshot,
      sources: sourceStatus,
    },
    errors,
  }
  await writeObservationSnapshot(observationPath, {
    schemaVersion: observationSnapshotVersion,
    updatedAt: attemptedAt,
    publicArchive: effectivePublicArchive.archive,
    publicSearchArchive: effectivePublicSearchArchive.archive,
    discovery,
  })
  await writeAuditOutputs(cacheDir, outputDir, refreshedAudit)
  return refreshedAudit
}

async function writeAuditOutputs(cacheDir, outputDir, audit) {
  await mkdir(cacheDir, { recursive: true, mode: 0o700 })
  await atomicWriteJson(path.join(cacheDir, 'completeness-audit.json'), audit)
  if (!outputDir) return
  await mkdir(outputDir, { recursive: true })
  await atomicWriteJson(path.join(outputDir, 'completeness-audit.json'), audit)
  await atomicWriteJson(path.join(outputDir, 'completeness-audit-machine-readable.json'), audit)
  await atomicWriteText(path.join(outputDir, 'completeness-audit.md'), auditMarkdown(audit), { mode: 0o644 })
}

async function readCachedAuditFile(cachePath) {
  try {
    const cached = JSON.parse(await readFile(cachePath, 'utf8'))
    return compatibleSchemaVersions.has(cached?.schemaVersion) ? normalizeCachedAudit(cached) : null
  } catch {
    return null
  }
}

function normalizeCachedAudit(cached) {
  if (cached.schemaVersion === schemaVersion && cached.refresh) return cached
  return {
    ...cached,
    schemaVersion,
    refresh: cached.refresh ?? {
      status: 'stale',
      attemptedAt: cached.generatedAt ?? null,
      dataGeneratedAt: cached.generatedAt ?? null,
      lastSuccessfulOnlineAt: cached.mode === 'local' ? null : cached.generatedAt ?? null,
      usedPreviousSuccessfulAudit: true,
      sources: {},
    },
  }
}

function settledValue(result) {
  return result?.status === 'fulfilled' ? result.value : null
}

function archiveSourceStatus(result, checkedAt) {
  if (result.status === 'rejected') return { status: 'error', checkedAt, error: errorMessage(result.reason) }
  const targets = Array.isArray(result.value?.targets) ? result.value.targets : []
  const failedTargets = targets.filter((target) => target?.error)
  const successfulTargets = targets.length - failedTargets.length
  const observedEntries = Array.isArray(result.value?.events) ? result.value.events.length : 0
  const availableDocuments = Array.isArray(result.value?.documents) ? result.value.documents.length : 0
  const details = { successfulTargets, failedTargets: failedTargets.length, observedEntries, availableDocuments }
  if (targets.length > 0 && successfulTargets === 0) {
    return {
      status: 'error',
      checkedAt,
      error: summarizeTargetErrors(failedTargets),
      ...details,
    }
  }
  if (failedTargets.length > 0) {
    return {
      status: 'partial',
      checkedAt,
      error: summarizeTargetErrors(failedTargets),
      ...details,
    }
  }
  return { status: 'ok', checkedAt, error: '', ...details }
}

function summarizeTargetErrors(targets) {
  const errors = [...new Set(targets.map((target) => cleanText(target?.error)).filter(Boolean))]
  return errors.length ? errors.slice(0, 3).map(shortSourceError).join(' | ') : 'All requested docket scans failed.'
}

function shortSourceError(value) {
  const text = cleanText(value)
  const status = text.match(/HTTP\s+(\d{3})/i)?.[1]
  const retrySeconds = text.match(/available in\s+(\d+)\s+seconds?/i)?.[1]
  if (status === '429') return retrySeconds
    ? `CourtListener rate limit reached (HTTP 429); retry after about ${retrySeconds} seconds.`
    : 'CourtListener rate limit reached (HTTP 429).'
  if (/fetch failed/i.test(text)) return 'Network request failed or timed out.'
  return text.slice(0, 260)
}

function mergeObservationArchive(currentArchive, previousArchive) {
  if (!currentArchive) return { archive: previousArchive ?? null, reusedPrevious: Boolean(previousArchive) }
  if (!previousArchive) return { archive: currentArchive, reusedPrevious: false }
  const failedDocketIds = new Set(
    (currentArchive.targets ?? [])
      .filter((target) => target?.error && target?.courtListenerDocketId)
      .map((target) => Number(target.courtListenerDocketId)),
  )
  if (!failedDocketIds.size) return { archive: currentArchive, reusedPrevious: false }
  const previousTargets = new Map((previousArchive.targets ?? []).map((target) => [Number(target.courtListenerDocketId), target]))
  const targets = (currentArchive.targets ?? []).map((target) => {
    const docketId = Number(target.courtListenerDocketId)
    const previous = failedDocketIds.has(docketId) ? previousTargets.get(docketId) : null
    return previous ? { ...previous, lastAttemptError: target.error } : target
  })
  const retainedCurrentEvents = (currentArchive.events ?? []).filter((event) => !failedDocketIds.has(Number(event.courtListenerDocketId)))
  const retainedPreviousEvents = (previousArchive.events ?? []).filter((event) => failedDocketIds.has(Number(event.courtListenerDocketId)))
  const retainedCurrentDocuments = (currentArchive.documents ?? []).filter((document) => !failedDocketIds.has(Number(document.courtListenerDocketId)))
  const retainedPreviousDocuments = (previousArchive.documents ?? []).filter((document) => failedDocketIds.has(Number(document.courtListenerDocketId)))
  return {
    archive: {
      ...currentArchive,
      targets,
      events: dedupeBy([...retainedCurrentEvents, ...retainedPreviousEvents], (event) => event.id ?? `${event.courtListenerDocketId}:${event.sourceUrl}`),
      documents: dedupeBy([...retainedCurrentDocuments, ...retainedPreviousDocuments], (document) => document.url),
    },
    reusedPrevious: retainedPreviousEvents.length > 0 || retainedPreviousDocuments.length > 0,
  }
}

async function readObservationSnapshot(filePath) {
  try {
    const snapshot = JSON.parse(await readFile(filePath, 'utf8'))
    return snapshot?.schemaVersion === observationSnapshotVersion ? snapshot : null
  } catch {
    return null
  }
}

async function writeObservationSnapshot(filePath, snapshot) {
  if (!snapshot.publicArchive && !snapshot.publicSearchArchive && !snapshot.discovery) return
  await atomicWriteJson(filePath, snapshot, { directoryMode: 0o700 })
}

export function mergeDiscoveryObservation(current, previous) {
  if (!current) return { discovery: previous ?? null, reusedPrevious: Boolean(previous) }
  if (!previous || current.status === 'ok') return { discovery: current, reusedPrevious: false }

  const currentCandidateIds = new Set([
    ...(current.trackedMatches ?? []),
    ...(current.candidates ?? []),
    ...(current.excludedLikelyFalseMatches ?? []),
  ].map((item) => Number(item.courtListenerDocketId)))
  const retainPrevious = (items) => (items ?? [])
    .filter((item) => !currentCandidateIds.has(Number(item.courtListenerDocketId)))
    .map((item) => ({ ...item, retainedFromPreviousObservation: true }))
  const previousTracked = retainPrevious(previous.trackedMatches)
  const previousCandidates = retainPrevious(previous.candidates)
  const previousExcluded = retainPrevious(previous.excludedLikelyFalseMatches)
  const currentDocumentUrls = new Set((current.documents ?? []).map((document) => document.url))
  const previousDocuments = (previous.documents ?? [])
    .filter((document) => !currentDocumentUrls.has(document.url))
    .map((document) => ({ ...document, retainedFromPreviousObservation: true }))
  const reusedPrevious = previousTracked.length > 0
    || previousCandidates.length > 0
    || previousExcluded.length > 0
    || previousDocuments.length > 0
  if (!reusedPrevious) return { discovery: current, reusedPrevious: false }

  const documents = dedupeBy([...(current.documents ?? []), ...previousDocuments], (document) => document.url)
  return {
    discovery: {
      ...current,
      trackedMatches: [...(current.trackedMatches ?? []), ...previousTracked],
      candidates: [...(current.candidates ?? []), ...previousCandidates],
      excludedLikelyFalseMatches: [...(current.excludedLikelyFalseMatches ?? []), ...previousExcluded].slice(0, 50),
      documents,
      availableDocuments: documents.length,
      usedPreviousObservation: true,
      previousObservationAt: previous.generatedAt ?? null,
    },
    reusedPrevious: true,
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

export function buildCompletenessAudit({ manifest, state, mode, publicArchive = null, publicSearchArchive = null, recapArchive = null, recapError = '', discovery = null }) {
  const generatedAt = new Date().toISOString()
  const files = Array.isArray(manifest?.files) ? manifest.files : []
  const publicTargets = new Map((publicArchive?.targets ?? []).map((target) => [Number(target.courtListenerDocketId), target]))
  const recapTargetsById = new Map((recapArchive?.targets ?? []).map((target) => [Number(target.courtListenerDocketId), target]))
  const publicEventsByDocket = groupBy(publicArchive?.events ?? [], eventDocketIdentity)
  const publicSearchEventsByDocket = groupBy(publicSearchArchive?.events ?? [], eventDocketIdentity)
  const recapEventsByDocket = groupBy(recapArchive?.events ?? [], eventDocketIdentity)
  const recapDocumentsByDocket = groupBy(
    [...(publicSearchArchive?.documents ?? []), ...(recapArchive?.documents ?? [])],
    eventDocketIdentity,
  )
  const filesByDocket = groupBy(files.filter((file) => file.courtListenerDocketId), eventDocketIdentity)
  const legacyFilesByCase = groupBy(files.filter((file) => !file.courtListenerDocketId), (file) => file.caseId)
  const caseById = new Map((state?.cases ?? []).map((caseRecord) => [caseRecord.id, caseRecord]))

  const dockets = recapTargets.map((target) => {
    const docketIdentity = String(target.courtListenerDocketId)
    const localFiles = [
      ...(filesByDocket.get(docketIdentity) ?? []),
      ...(legacyFilesByCase.get(target.caseId) ?? []),
    ]
    const observedEvents = dedupeBy(
      [
        ...(recapEventsByDocket.get(docketIdentity) ?? []),
        ...(publicSearchEventsByDocket.get(docketIdentity) ?? []),
        ...(publicEventsByDocket.get(docketIdentity) ?? []),
      ]
        .filter((event) => normalizeDocketNumber(event.docketNumber) === normalizeDocketNumber(target.docketNumber)),
      (event) => `${normalizeDocketNumber(event.filingNumber)}:${event.sourceUrl}`,
    )
    const availableRecapDocuments = recapDocumentsByDocket.get(docketIdentity) ?? []
    const localNumbers = new Set(localFiles.map((file) => normalizeDocketNumber(file.docNumber)).filter(Boolean))
    const availableRecapNumbers = new Set(availableRecapDocuments.map((document) => normalizeDocketNumber(document.docNumber)).filter(Boolean))
    const observedNumbers = new Set(observedEvents.map((event) => normalizeDocketNumber(event.filingNumber)).filter(Boolean))
    const matchedObserved = [...observedNumbers].filter((number) => localNumbers.has(number))
    const metadataOnly = observedEvents.filter((event) => {
      const number = normalizeDocketNumber(event.filingNumber)
      return !localNumbers.has(number) && !availableRecapNumbers.has(number)
    })
    const publiclyAvailableMissing = availableRecapDocuments.filter((document) => (
      !files.some((file) => file.url === document.url && file.status !== 'error')
    ))
    const officialLocal = localFiles.filter((file) => ['pacer', 'courtlistener-recap'].includes(file.sourceId) && file.status !== 'error')
    const mirrorLocal = localFiles.filter((file) => file.sourceId === 'nfsc-criminal-mirror' && file.status !== 'error')
    const errors = localFiles.filter((file) => file.status === 'error')
    const publicTarget = publicTargets.get(Number(target.courtListenerDocketId))
    const recapTarget = recapTargetsById.get(Number(target.courtListenerDocketId))
    const caseRecord = caseById.get(target.caseId)
    const latestObserved = observedEvents.map((event) => event.date).filter(Boolean).sort().at(-1) ?? publicTarget?.latestDate ?? null
    const publicSearchTarget = (publicSearchArchive?.targets ?? []).find((item) => Number(item.courtListenerDocketId) === Number(target.courtListenerDocketId))
    const status = docketAuditStatus({ mode, publicTarget, publicSearchTarget, recapTarget, localFiles, officialLocal, observedEvents, publiclyAvailableMissing })
    return {
      id: `${target.courtId}-${target.courtListenerDocketId}`,
      caseId: target.caseId,
      caseTitle: caseRecord?.title ?? target.label,
      label: target.label,
      court: target.court,
      courtId: target.courtId,
      docketNumber: target.docketNumber || 'Needs docket-number verification',
      courtListenerDocketId: target.courtListenerDocketId,
      courtListenerUrl: firstCourtListenerDocketUrl(observedEvents, target.courtListenerDocketId),
      status,
      latestObserved,
      sourceMode: recapTarget ? 'recap_api' : publicSearchTarget ? 'public_search' : publicTarget ? 'public_feed' : mode,
      counts: {
        observedEntries: observedEvents.length,
        observedUniqueNumbers: observedNumbers.size,
        matchedObservedEntries: matchedObserved.length,
        metadataOnlyEntries: metadataOnly.length,
        recapAvailableDocuments: availableRecapDocuments.length,
        publiclyAvailableMissing: publiclyAvailableMissing.length,
        localFiles: localFiles.filter((file) => file.status !== 'error').length,
        officialOrRecapLocalFiles: officialLocal.length,
        mirrorLocalFiles: mirrorLocal.length,
        localErrors: errors.length,
      },
      gaps: [
        ...publiclyAvailableMissing.slice(0, 25).map((document) => ({
          type: 'public_pdf_missing_local',
          docketNumber: document.docNumber,
          label: document.title,
          sourceUrl: document.url,
          reason: 'RECAP reports a publicly available PDF that is not present in the local manifest.',
        })),
        ...metadataOnly.slice(0, 25).map((event) => ({
          type: 'metadata_only',
          docketNumber: event.filingNumber,
          label: event.title,
          sourceUrl: event.sourceUrl,
          reason: 'A public docket-entry feed was observed, but the feed does not expose a direct downloadable PDF.',
        })),
        ...errors.map((file) => ({
          type: 'download_error',
          docketNumber: file.docNumber,
          label: file.title,
          sourceUrl: file.url,
          reason: file.error || 'Download failed.',
        })),
      ],
      limitations: docketLimitations({ mode, publicTarget, recapTarget, target, officialLocal }),
    }
  })

  const integrity = buildIntegrityAudit(files)
  const trackedCaseIds = new Set(recapTargets.map((target) => target.caseId))
  const untrackedLocalFiles = files.filter((file) => !trackedCaseIds.has(file.caseId) && file.status !== 'error')
  const totals = dockets.reduce((result, docket) => {
    result.observedEntries += docket.counts.observedEntries
    result.metadataOnlyEntries += docket.counts.metadataOnlyEntries
    result.publiclyAvailableMissing += docket.counts.publiclyAvailableMissing
    return result
  }, {
    trackedDockets: dockets.length,
    observedDockets: dockets.filter((docket) => docket.counts.observedEntries > 0).length,
    observedEntries: 0,
    metadataOnlyEntries: 0,
    publiclyAvailableMissing: 0,
    localFiles: files.filter((file) => file.status !== 'error').length,
    officialOrRecapLocalFiles: files.filter((file) => ['pacer', 'courtlistener-recap'].includes(file.sourceId) && file.status !== 'error').length,
    mirrorLocalFiles: files.filter((file) => file.sourceId === 'nfsc-criminal-mirror' && file.status !== 'error').length,
    localErrors: files.filter((file) => file.status === 'error').length,
    untrackedLocalFiles: untrackedLocalFiles.length,
    pendingRelationReviewFiles: untrackedLocalFiles.filter((file) => file.relationStatus === 'pending_review' || String(file.caseId).startsWith('discovered-')).length,
    untrackedCaseIds: [...new Set(untrackedLocalFiles.map((file) => file.caseId).filter(Boolean))],
  })
  const trackedPublicUrls = new Set(
    [...(publicSearchArchive?.documents ?? []), ...(recapArchive?.documents ?? [])].map((document) => document.url),
  )
  const localUrls = new Set(files.filter((file) => file.status !== 'error').map((file) => file.url))
  const discoveryPublicDocuments = (discovery?.documents ?? []).filter((document) => !trackedPublicUrls.has(document.url))
  totals.discoveryAvailableDocuments = discoveryPublicDocuments.length
  totals.discoveryPubliclyAvailableMissing = discoveryPublicDocuments.filter((document) => !localUrls.has(document.url)).length
  totals.publiclyAvailableMissing += totals.discoveryPubliclyAvailableMissing

  return {
    schemaVersion,
    generatedAt,
    mode,
    refresh: {
      status: mode === 'local' ? 'local_only' : 'complete',
      attemptedAt: generatedAt,
      dataGeneratedAt: generatedAt,
      lastSuccessfulOnlineAt: mode === 'local' ? null : generatedAt,
      usedPreviousSuccessfulAudit: false,
      sources: {},
    },
    verdict: totals.officialOrRecapLocalFiles > 0 && totals.publiclyAvailableMissing === 0 && mode === 'recap_api'
      ? 'partial_verified'
      : 'not_proven_complete',
    verdictReason: completenessVerdictReason(totals, mode),
    methodology: [
      'Every court docket is audited independently by court, docket number, and CourtListener docket ID.',
      'Only entries actually observed in PACER/RECAP/official or claims-agent sources are compared; numeric gaps are not inferred from 1 through the highest filing number.',
      'Text-only entries, sealed or restricted records, attachments, unavailable PACER material, and public PDFs missing locally are reported separately.',
      'A large mirror-file count never proves docket completeness or official-record coverage.',
      'Search results are discovery leads. A candidate is not promoted into the tracked registry until its docket number, caption, court, parties, and relationship evidence are reviewed.',
    ],
    accessBoundaries: {
      pacer: 'PACER is the docket of record. This build does not log in, incur fees, or bypass authentication.',
      recap: mode === 'recap_api'
        ? 'Token-enhanced RECAP pagination and available-PDF discovery were used; RECAP can still be incomplete when PACER users have not uploaded a filing.'
        : 'No-token public Atom feeds and structured search provide recent metadata and the currently surfaced public PDFs. Search result windows are limited and cannot prove full historical coverage.',
      sealed: 'Sealed, restricted, non-electronic, removed, or unknown records cannot be proven absent from public sources.',
      epiq: 'Epiq project HTT is confirmed for bankruptcy 22-50073; row-level JSON extraction remains unverified until its public request contract is stable.',
    },
    totals,
    integrity,
    dockets,
    discovery: discovery ?? {
      generatedAt: null,
      queries: candidateQueries,
      candidates: [],
      excludedLikelyFalseMatches: [],
      status: 'not_refreshed',
    },
    errors: [recapError].filter(Boolean),
  }
}

async function discoverRelatedDockets(publicPortfolioArchive = null) {
  const knownIds = new Set(recapTargets.map((target) => Number(target.courtListenerDocketId)))
  const records = new Map()
  const failures = []
  const settled = await Promise.allSettled(candidateQueries.map(async (query) => {
    const url = new URL('https://www.courtlistener.com/feed/search/')
    url.searchParams.set('q', query)
    url.searchParams.set('type', 'r')
    const response = await safeFetch(url, {
      headers: {
        Accept: 'application/atom+xml,application/xml;q=0.9',
        'User-Agent': 'guo-intel-local/0.1 (+local research app)',
      },
    }, { timeoutMs: 20000, includeOpenAI: false })
    const body = await readTextWithLimit(response, 5 * 1024 * 1024)
    if (!response.ok) throw new Error(`${query}: HTTP ${response.status}`)
    return parseDiscoveryFeed(body, query)
  }))
  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      failures.push(result.reason instanceof Error ? result.reason.message : `${candidateQueries[index]} failed`)
      return
    }
    for (const item of result.value) {
      const current = records.get(item.courtListenerDocketId) ?? { ...item, queries: [], observedEntries: 0, latestObserved: '' }
      current.queries = [...new Set([...current.queries, ...item.queries])]
      current.observedEntries += item.observedEntries
      if (item.latestObserved > current.latestObserved) {
        current.latestObserved = item.latestObserved
        current.summary = item.summary
        current.sourceUrl = item.sourceUrl
      }
      records.set(item.courtListenerDocketId, current)
    }
  })
  try {
    for (const item of discoverBankruptcyPortfolioDockets(publicPortfolioArchive)) {
      const current = records.get(item.courtListenerDocketId) ?? item
      records.set(item.courtListenerDocketId, {
        ...current,
        ...item,
        queries: [...new Set([...(current.queries ?? []), ...item.queries])],
        observedEntries: Math.max(current.observedEntries ?? 0, item.observedEntries),
        latestObserved: current.latestObserved > item.latestObserved ? current.latestObserved : item.latestObserved,
      })
    }
  } catch (error) {
    failures.push(`Structured bankruptcy discovery: ${error instanceof Error ? error.message : String(error)}`)
  }
  const assessed = [...records.values()].map((item) => assessCandidate(item, knownIds))
  const acceptedDocketIds = new Set(assessed
    .filter((item) => ['tracked', 'direct_candidate', 'related_candidate'].includes(item.classification))
    .map((item) => Number(item.courtListenerDocketId)))
  return {
    generatedAt: new Date().toISOString(),
    queries: candidateQueries,
    status: failures.length ? 'partial' : 'ok',
    failures,
    trackedMatches: assessed.filter((item) => item.classification === 'tracked'),
    candidates: assessed.filter((item) => ['direct_candidate', 'related_candidate'].includes(item.classification)),
    excludedLikelyFalseMatches: assessed.filter((item) => item.classification === 'likely_false_match').slice(0, 50),
    documents: (publicPortfolioArchive?.documents ?? []).filter((document) => acceptedDocketIds.has(Number(document.courtListenerDocketId))),
    availableDocuments: (publicPortfolioArchive?.documents ?? []).filter((document) => acceptedDocketIds.has(Number(document.courtListenerDocketId))).length,
    pagesScanned: publicPortfolioArchive?.pagesScanned ?? 0,
  }
}

function discoverBankruptcyPortfolioDockets(publicPortfolioArchive) {
  return (publicPortfolioArchive?.targets ?? []).map((item) => {
    const parties = Array.isArray(item.parties) ? item.parties.map(cleanText).filter(Boolean).slice(0, 80) : []
    const caption = cleanText(item.title || item.label || `CourtListener docket ${item.courtListenerDocketId}`)
    const relationshipText = `${caption} ${parties.join(' ')}`
    const relationshipSignals = bankruptcyRelationshipSignals(relationshipText)
    return {
      courtListenerDocketId: Number(item.courtListenerDocketId),
      docketNumber: cleanText(item.docketNumber),
      title: caption,
      court: cleanText(item.court || 'Bankr. D. Conn.'),
      dateFiled: cleanText(item.dateFiled).slice(0, 10),
      dateTerminated: cleanText(item.dateTerminated).slice(0, 10),
      latestObserved: cleanText(item.latestDate || item.dateTerminated || item.dateFiled).slice(0, 10),
      observedEntries: Number(item.docketEntries ?? 0),
      availableDocuments: Number(item.availableDocuments ?? 0),
      queries: ['"22-50073" structured bankruptcy search'],
      summary: parties.length ? `Public party record: ${parties.slice(0, 12).join('; ')}` : 'Public search result; parties require filing-level verification.',
      parties,
      relationshipSignals,
      structuredPortfolioHit: relationshipSignals.length > 0,
      sourceUrl: `https://www.courtlistener.com/docket/${item.courtListenerDocketId}/`,
    }
  })
}

function bankruptcyRelationshipSignals(value) {
  const signals = [
    ['Ho Wan Kwok / Miles Guo', /ho wan kwok|miles guo|wengui guo/i],
    ['Chapter 11 trustee Luc Despins', /luc a?\.? despins|despins,? luc/i],
    ['G-series entity', /\bgtv\b|saraca|voice of guo|g club|himalaya/i],
    ['Known estate or asset vehicle', /hk international|genever|lamp capital|aca capital|hudson diamond|lexington property/i],
  ]
  return signals.filter(([, pattern]) => pattern.test(value)).map(([label]) => label)
}

function parseDiscoveryFeed(xml, query) {
  const $ = cheerio.load(String(xml ?? ''), { xmlMode: true })
  const records = new Map()
  $('entry').each((_, element) => {
    const href = $(element).find('link[rel="alternate"]').attr('href') || ''
    const parsed = parseCourtListenerLink(href)
    if (!parsed) return
    const current = records.get(parsed.docketId) ?? {
      courtListenerDocketId: parsed.docketId,
      title: cleanText($(element).find('title').text()),
      court: cleanText($(element).find('author name').text()),
      latestObserved: '',
      observedEntries: 0,
      queries: [query],
      summary: '',
      sourceUrl: parsed.url,
    }
    current.observedEntries += 1
    const date = cleanText($(element).find('published').text()).slice(0, 10)
    if (date > current.latestObserved) {
      current.latestObserved = date
      current.summary = atomText($(element).find('summary').text()).slice(0, 800)
      current.sourceUrl = parsed.url
    }
    records.set(parsed.docketId, current)
  })
  return [...records.values()]
}

function assessCandidate(item, knownIds) {
  const confirmed = confirmedRelations.get(item.courtListenerDocketId)
  const text = `${item.title} ${item.summary}`.toLowerCase()
  let score = 0
  if (/ho wan kwok|miles guo|voice of guo|hk international funds investments/.test(item.title.toLowerCase())) score += 6
  if (/1:23-cr-00118|23-cr-00118|22-50073/.test(text)) score += 5
  if (/despins/.test(item.title.toLowerCase()) && /ho wan kwok|22-50073/.test(text)) score += 4
  if (item.queries.length >= 2) score += 2
  if (item.structuredPortfolioHit) score += 7
  const classification = knownIds.has(item.courtListenerDocketId)
    ? 'tracked'
    : confirmed?.relation === 'direct' || score >= 6
      ? 'direct_candidate'
      : score >= 4
        ? 'related_candidate'
        : 'likely_false_match'
  return {
    ...item,
    score,
    classification,
    reason: confirmed?.reason ?? candidateReason(classification),
  }
}

function docketAuditStatus({ mode, publicTarget, publicSearchTarget, recapTarget, localFiles, officialLocal, observedEvents, publiclyAvailableMissing }) {
  const publicRequestFailed = Boolean(publicTarget?.error && publicSearchTarget?.error)
  if (publicRequestFailed && !recapTarget && !localFiles.length) return 'blocked'
  if (!observedEvents.length && !localFiles.length && !publiclyAvailableMissing.length) return 'not_observed'
  if (mode === 'recap_api' && recapTarget && officialLocal.length > 0 && publiclyAvailableMissing.length === 0) return 'partial_verified'
  if (officialLocal.length > 0 && publiclyAvailableMissing.length === 0) return 'partial_verified'
  if (observedEvents.length && !localFiles.some((file) => file.status !== 'error')) return 'metadata_only'
  if (localFiles.some((file) => file.status !== 'error')) return 'partial'
  return publicRequestFailed ? 'blocked' : 'not_observed'
}

function docketLimitations({ mode, publicTarget, recapTarget, target, officialLocal }) {
  const limitations = []
  if (!target.docketNumber) limitations.push('The docket number still requires verification from the docket header or PACER.')
  if (publicTarget?.error) limitations.push(`Public feed error: ${publicTarget.error}`)
  if (mode !== 'recap_api') limitations.push('Recent public-feed metadata is not a complete historical docket export.')
  if (!recapTarget) limitations.push('No token-enhanced RECAP pagination result is available for this docket.')
  if (!officialLocal.length) limitations.push('No local PACER or RECAP PDF is currently attributed to this docket.')
  limitations.push('PACER, sealed, restricted, removed, and non-electronic records remain outside public completeness proof.')
  return limitations
}

function buildIntegrityAudit(files) {
  const available = files.filter((file) => file.status !== 'error' && file.sha256)
  const byHash = groupBy(available, (file) => file.sha256)
  const duplicatePayloadGroups = [...byHash.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([sha256, records]) => ({
      sha256,
      files: records.length,
      sourceUrls: [...new Set(records.map((record) => record.url))].slice(0, 20),
    }))
  const conflicts = []
  const byIdentity = groupBy(available.filter((file) => file.docNumber), (file) => `${file.caseId}:${normalizeDocketNumber(file.docNumber)}:${file.variantKey ?? 'source'}`)
  for (const [identity, records] of byIdentity.entries()) {
    const hashes = [...new Set(records.map((record) => record.sha256))]
    const sources = [...new Set(records.map((record) => record.sourceId))]
    if (hashes.length > 1 && sources.length > 1) {
      conflicts.push({ identity, hashes, sources, sourceUrls: records.map((record) => record.url).slice(0, 20) })
    }
  }
  return {
    hashedFiles: available.length,
    unhashedAvailableFiles: files.filter((file) => file.status !== 'error' && !file.sha256).length,
    duplicatePayloadGroups: duplicatePayloadGroups.length,
    duplicatePayloadSamples: duplicatePayloadGroups.slice(0, 25),
    crossSourceHashConflicts: conflicts.length,
    crossSourceConflictSamples: conflicts.slice(0, 25),
    downloadErrors: files.filter((file) => file.status === 'error').map((file) => ({
      caseId: file.caseId,
      docketNumber: file.docNumber,
      title: file.title,
      sourceUrl: file.url,
      error: file.error || 'Download failed.',
    })),
    manifestDigest: createHash('sha256').update(JSON.stringify(files.map((file) => ({
      url: file.url,
      sha256: file.sha256 ?? null,
      bytes: file.bytes ?? null,
      status: file.status,
    })))).digest('hex'),
  }
}

function completenessVerdictReason(totals, mode) {
  if (totals.publiclyAvailableMissing > 0) return `${totals.publiclyAvailableMissing} RECAP-available PDF(s) are not present in the local manifest.`
  if (totals.officialOrRecapLocalFiles === 0) return 'The local library contains no PACER or RECAP court-record PDFs.'
  if (mode !== 'recap_api') return 'Public-feed metadata and no-token structured RECAP search have been reconciled locally, but full historical pagination and PACER record-of-docket verification remain unavailable.'
  return 'Publicly observed RECAP material is partially reconciled, but PACER, sealed, restricted, removed, and unknown records prevent an absolute completeness claim.'
}

function auditMarkdown(audit) {
  const docketRows = audit.dockets.map((docket) => [
    docket.court,
    docket.docketNumber,
    docket.status,
    docket.counts.observedEntries,
    docket.counts.localFiles,
    docket.counts.officialOrRecapLocalFiles,
    docket.counts.metadataOnlyEntries,
    docket.counts.publiclyAvailableMissing,
  ].map(markdownCell).join(' | '))
  const candidateRows = audit.discovery.candidates.map((candidate) => [
    candidate.classification,
    candidate.title,
    candidate.court,
    candidate.courtListenerDocketId,
    candidate.latestObserved,
    candidate.sourceUrl,
  ].map(markdownCell).join(' | '))
  return `# Docket completeness audit\n\nGenerated: ${audit.generatedAt}\n\n## Verdict\n\n**${audit.verdict}**: ${audit.verdictReason}\n\nThis report does not claim absolute completeness. PACER, sealed, restricted, removed, non-electronic, and unknown-name records can remain unavailable to public-source verification.\n\n## Totals\n\n- Independent tracked dockets: ${audit.totals.trackedDockets}\n- Dockets observed in the current public snapshot: ${audit.totals.observedDockets}\n- Publicly observed docket entries: ${audit.totals.observedEntries}\n- Local files: ${audit.totals.localFiles}\n- Local PACER/RECAP court-record PDFs: ${audit.totals.officialOrRecapLocalFiles}\n- Metadata-only observed entries: ${audit.totals.metadataOnlyEntries}\n- RECAP-available PDFs missing locally: ${audit.totals.publiclyAvailableMissing}\n- Files pending relationship review: ${audit.totals.pendingRelationReviewFiles}\n- Local download errors: ${audit.totals.localErrors}\n\n## Methodology\n\n${audit.methodology.map((item) => `- ${item}`).join('\n')}\n\n## Docket reconciliation\n\nCourt | Docket | Status | Observed entries | Local files | PACER/RECAP local | Metadata only | Public PDF missing\n--- | --- | --- | ---: | ---: | ---: | ---: | ---:\n${docketRows.join('\n')}\n\n## Discovery candidates\n\nClassification | Caption | Court | CourtListener ID | Latest observed | Source\n--- | --- | --- | ---: | --- | ---\n${candidateRows.join('\n') || 'none | none | none | 0 | none | none'}\n\n## Integrity\n\n- Manifest digest: \`${audit.integrity.manifestDigest}\`\n- Hashed files: ${audit.integrity.hashedFiles}\n- Unhashed available files: ${audit.integrity.unhashedAvailableFiles}\n- Duplicate payload groups: ${audit.integrity.duplicatePayloadGroups}\n- Cross-source hash conflicts: ${audit.integrity.crossSourceHashConflicts}\n`
}

function markdownCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
}

function candidateReason(classification) {
  if (classification === 'tracked') return 'This docket is already in the independent tracked-docket registry.'
  if (classification === 'direct_candidate') return 'The caption, public party record, or filing text directly identifies a tracked person, entity, trustee, or mother case; docket-header and filing-level confirmation remain required.'
  if (classification === 'related_candidate') return 'The search hit has multiple relation signals but still needs docket-header and party verification.'
  return 'The search term appears incidental or the caption does not identify a tracked person, entity, or proceeding.'
}

function firstCourtListenerDocketUrl(events, docketId) {
  const source = events.find((event) => event.sourceUrl)?.sourceUrl
  if (source) {
    try {
      const url = new URL(source)
      return `${url.origin}/docket/${docketId}/`
    } catch {
      // Fall through to the canonical docket URL.
    }
  }
  return `https://www.courtlistener.com/docket/${docketId}/`
}

function parseCourtListenerLink(value) {
  try {
    const url = new URL(String(value))
    if (url.protocol !== 'https:' || url.hostname !== 'www.courtlistener.com') return null
    const match = url.pathname.match(/^\/docket\/(\d+)\/(\d+)(?:\/(\d+))?\/[^/]+\/?$/)
    if (!match) return null
    return { docketId: Number(match[1]), url: `${url.origin}${url.pathname}` }
  } catch {
    return null
  }
}

function atomText(value) {
  const $ = cheerio.load(String(value ?? ''))
  $('a').remove()
  return cleanText($.text())
}

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function groupBy(values, keyFor) {
  const grouped = new Map()
  for (const value of values) {
    const key = keyFor(value)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(value)
  }
  return grouped
}

function eventDocketIdentity(value) {
  return value?.courtListenerDocketId ? String(value.courtListenerDocketId) : `case:${value?.caseId ?? ''}`
}

function dedupeBy(values, keyFor) {
  return [...new Map(values.map((value) => [keyFor(value), value])).values()]
}
