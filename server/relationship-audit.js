import { mkdir, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { atomicWriteJson, atomicWriteText } from './atomic-write.js'
import { normalizeLegalMetadataText } from './legal-metadata.js'

const schemaVersion = 3

export const relationshipTypes = [
  'direct_person',
  'criminal_related',
  'family_or_related_person',
  'g_series_entity',
  'estate_asset_vehicle',
  'trustee_recovery',
  'professional_or_service_provider',
  'third_party_claimant',
  'weak_or_unverified',
  'excluded_false_match',
]

const typeDefinitions = {
  direct_person: {
    labelEn: 'Direct person relation',
    labelZh: '直接人物关系',
    descriptionEn: 'The public caption or party record names Ho Wan Kwok, Miles Guo, or a direct name variant.',
    descriptionZh: '公开案名或当事人记录直接出现郭文贵、Ho Wan Kwok、Miles Guo 或明确姓名变体。',
  },
  criminal_related: {
    labelEn: 'Criminal proceeding relation',
    labelZh: '刑事案件关系',
    descriptionEn: 'The public record identifies the 1:23-cr-00118 criminal proceeding or a United States v. Guo caption.',
    descriptionZh: '公开记录指向 1:23-cr-00118 刑事案或 United States v. Guo 案名。',
  },
  family_or_related_person: {
    labelEn: 'Family or related person',
    labelZh: '家族或相关人物',
    descriptionEn: 'The public record names a monitored family member or related individual. This does not establish control or liability.',
    descriptionZh: '公开记录出现受监控的家族成员或相关个人；这不等于证明控制关系或法律责任。',
  },
  g_series_entity: {
    labelEn: 'G-series or movement entity',
    labelZh: 'G 系列或相关组织实体',
    descriptionEn: 'The public record names a G-series, Himalaya, Rule of Law, GTV, G Club, or Voice of Guo entity.',
    descriptionZh: '公开记录出现 G 系列、Himalaya、Rule of Law、GTV、G Club 或 Voice of Guo 实体。',
  },
  estate_asset_vehicle: {
    labelEn: 'Estate or asset vehicle',
    labelZh: '破产财产或资产载体',
    descriptionEn: 'The public record names an identified estate, holding, fund, property, or asset vehicle.',
    descriptionZh: '公开记录出现已识别的破产财产、控股、基金、物业或资产载体。',
  },
  trustee_recovery: {
    labelEn: 'Trustee recovery proceeding',
    labelZh: '受托人资产追回程序',
    descriptionEn: 'The public record identifies Luc Despins or a Chapter 11 trustee recovery caption.',
    descriptionZh: '公开记录出现 Luc Despins 或第 11 章受托人资产追回案名。',
  },
  professional_or_service_provider: {
    labelEn: 'Professional or service provider',
    labelZh: '专业服务或供应商',
    descriptionEn: 'The public record names a law firm, investigator, broker, technology, logistics, or other service provider.',
    descriptionZh: '公开记录出现律师事务所、调查机构、经纪、技术、物流或其他服务提供方。',
  },
  third_party_claimant: {
    labelEn: 'Third-party claimant or counterparty',
    labelZh: '第三方申请人或交易相对方',
    descriptionEn: 'The public record identifies a third-party claimant or counterparty without establishing ownership or control.',
    descriptionZh: '公开记录识别出第三方申请人或交易相对方，但没有因此证明所有权或控制关系。',
  },
  weak_or_unverified: {
    labelEn: 'Weak or unverified lead',
    labelZh: '弱关联或待核验线索',
    descriptionEn: 'The record is a search lead or an incomplete public hit; the relationship is not established from the supplied record.',
    descriptionZh: '该记录只是搜索线索或不完整公开命中；现有证据尚未建立关联关系。',
  },
  excluded_false_match: {
    labelEn: 'Excluded or likely false match',
    labelZh: '排除或可能误匹配',
    descriptionEn: 'The public search hit does not identify a reliable relation after the available caption and party checks.',
    descriptionZh: '在现有案名和当事人核对下，公开搜索命中没有识别出可靠关联。',
  },
}

const relationMatchers = [
  {
    type: 'direct_person',
    labelEn: 'Ho Wan Kwok / Miles Guo name',
    labelZh: 'Ho Wan Kwok / Miles Guo 姓名',
    pattern: /ho wan kwok|kwok ho wan|miles guo|miles kwok|wengui guo|guo wengui/i,
  },
  {
    type: 'criminal_related',
    labelEn: '1:23-cr-00118 or United States v. Guo',
    labelZh: '1:23-cr-00118 或 United States v. Guo',
    pattern: /1:23-cr-00118|23-cr-00118|united states\s+(?:of america\s+)?v\.?\s*guo/i,
  },
  {
    type: 'family_or_related_person',
    labelEn: 'Named family or related person',
    labelZh: '家族或相关人物姓名',
    pattern: /\bmei guo\b|\byvette wang\b|\byanping\b|\bhaoyun guo\b|\bqiang guo\b|\bnan wu\b|\bhing chi ngok\b|\bchunguang han\b|\bwilliam je\b/i,
  },
	  {
	    type: 'g_series_entity',
	    labelEn: 'G-series / Himalaya / Rule of Law entity',
	    labelZh: 'G 系列 / Himalaya / Rule of Law 实体',
	    pattern: /\bgtv\b|gnews|gettr|g\s*club|g\s*fashion|saraca|voice of guo|himalaya|rule of law|hchk/i,
	  },
  {
    type: 'estate_asset_vehicle',
    labelEn: 'Estate, holding, fund, property, or asset vehicle',
    labelZh: '破产财产、控股、基金、物业或资产载体',
    pattern: /genever|lamp capital|hudson diamond|aca capital|hamilton (?:opportunity|digital|pe fund)|taurus (?:fund|management)|hk international|lexington property|greenwich land|holy city hong kong|himalaya international|vp bank/i,
  },
  {
    type: 'trustee_recovery',
    labelEn: 'Luc Despins / Chapter 11 trustee',
    labelZh: 'Luc Despins / 第 11 章受托人',
    pattern: /luc\s+a?\.?\s*despins|despins,?\s+luc|chapter\s+11\s+trustee/i,
  },
]

const serviceProviderPattern = /boies schiller|pillsbury|mishcon de reya|nardello|lawall|savio law|jetlaw|crane advisory|moran yacht|bering yachts|federal express|apple inc|meta platforms|fox news|amazon(?:\.com| web services)|aig property|restoration hardware|b&h foto|mercedes-benz|miller motorcars/i

export function relationshipTypeDefinition(type) {
  return typeDefinitions[type] ?? typeDefinitions.weak_or_unverified
}

export function classifyRelationship(input = {}) {
  const title = clean(input.title)
  const summary = clean(input.summary)
  const parties = Array.isArray(input.parties) ? input.parties.map(clean).filter(Boolean) : []
  const caseId = clean(input.caseId)
  const docketNumber = clean(input.docketNumber)
  const text = [title, summary, docketNumber, ...parties].filter(Boolean).join(' ')
  const evidence = []
  const types = []
  const seenMatchers = new Set()

  for (const matcher of relationMatchers) {
    if (!matcher.pattern.test(text)) continue
    types.push(matcher.type)
    seenMatchers.add(matcher.type)
    evidence.push(makeEvidence(matcher, text, input))
  }

  if (serviceProviderPattern.test(text)) {
    types.push('professional_or_service_provider')
    evidence.push(makeEvidence({
      type: 'professional_or_service_provider',
      labelEn: 'Named professional or service counterparty',
      labelZh: '被点名的专业服务或服务相对方',
      pattern: serviceProviderPattern,
    }, text, input))
  }

  // A curated case registry is stronger than a filename or search hit. Use
  // the tracked case identity as bounded procedural evidence, without
  // converting it into proof of ownership, control, or liability.
  if (isTrackedCriminalCase(caseId, docketNumber) && !types.includes('criminal_related')) {
    types.push('criminal_related')
    evidence.push({
      kind: 'tracked_case_registry',
      type: 'criminal_related',
      labelEn: 'Tracked criminal docket identity',
      labelZh: '正式跟踪刑事案号身份',
      excerpt: [caseId, docketNumber].filter(Boolean).join(' · '),
      sourceUrl: sourceUrlFor(input),
      descriptionEn: 'The file is assigned to a curated criminal docket track; this establishes procedural tracking, not the truth of any allegation or an ownership/control conclusion.',
      descriptionZh: '该文件被分配到正式跟踪的刑事案卷线；这只建立程序性跟踪关系，不证明任何指控事实，也不证明所有权或控制关系。',
      confidence: 'high',
    })
  }

  if (isTrackedEstateCase(caseId, docketNumber) && !types.some((type) => ['trustee_recovery', 'estate_asset_vehicle'].includes(type))) {
    types.push('trustee_recovery')
    evidence.push({
      kind: 'tracked_case_registry',
      type: 'trustee_recovery',
      labelEn: 'Tracked bankruptcy-estate docket identity',
      labelZh: '正式跟踪破产财产案号身份',
      excerpt: [caseId, docketNumber].filter(Boolean).join(' · '),
      sourceUrl: sourceUrlFor(input),
      descriptionEn: 'The file is assigned to a curated bankruptcy-estate track; this establishes procedural tracking, not a finding about ownership, control, or liability.',
      descriptionZh: '该文件被分配到正式跟踪的破产财产案卷线；这只建立程序性跟踪关系，不构成关于所有权、控制关系或责任的认定。',
      confidence: 'high',
    })
  }

  const hasCaptionV = /\bv\.?\b|versus/i.test(title)
  if (hasCaptionV && !types.some((type) => ['direct_person', 'criminal_related', 'family_or_related_person', 'g_series_entity', 'estate_asset_vehicle'].includes(type))) {
    types.push('third_party_claimant')
    evidence.push({
      kind: 'caption_structure',
      labelEn: 'Adversarial caption identifies a third-party counterparty',
      labelZh: '对抗式案名识别出第三方相对方',
      excerpt: title.slice(0, 360),
      sourceUrl: sourceUrlFor(input),
      descriptionEn: 'The caption shows an adversarial proceeding, but the caption alone does not establish ownership, control, alter ego, or liability.',
      descriptionZh: '案名显示存在对抗程序，但案名本身不能证明所有权、控制关系、人格混同或责任。',
      confidence: 'medium',
    })
  }

  const explicitlyExcluded = input.classification === 'likely_false_match' || input.relationStatus === 'excluded'
  if (explicitlyExcluded) {
    return finalizeRelationship({ ...input, types: ['excluded_false_match'], evidence: evidence.length ? evidence : [fallbackEvidence(input, 'excluded_false_match')] }, 'excluded_false_match')
  }

  const primaryType = choosePrimaryType(types, input)
  if (!primaryType) {
    return finalizeRelationship({ ...input, types: ['weak_or_unverified'], evidence: [fallbackEvidence(input, 'weak_or_unverified')] }, 'weak_or_unverified')
  }

  return finalizeRelationship({ ...input, types: [...new Set(types)], evidence }, primaryType, { seenMatchers })
}

function isTrackedCriminalCase(caseId, docketNumber) {
  return /^(?:sdny-23-cr-118|ca2-26-1853)$/i.test(caseId)
    || /(?:1:23-cr-00118|23-cr-00118|26-1853)/i.test(docketNumber)
}

function isTrackedEstateCase(caseId, docketNumber) {
  return /^(?:dconn-22-50073|bkd-|ca2-24-2504|bkd-hk-int-despins|bkd-24-)/i.test(caseId)
    || /(?:22-50073|22-05003|24-05\d{3})/i.test(docketNumber)
}

export function relationshipForFile(file = {}) {
  return classifyRelationship({
    ...file,
    title: file.title,
    sourceUrl: file.url,
    parties: file.parties ?? [],
    relationStatus: file.relationStatus,
  })
}

export async function readRelationshipAudit({ cacheDir, manifest, completenessAudit }) {
  const expected = relationshipAuditSignature(manifest, completenessAudit)
  try {
    const cached = JSON.parse(await readFile(path.join(cacheDir, 'relationship-audit.json'), 'utf8'))
    if (cached?.schemaVersion === schemaVersion && cached.signature === expected) return cached
  } catch {
    // Build from the current local snapshot when no relationship cache exists.
  }
  return buildRelationshipAudit({ manifest, completenessAudit, processingIndex: await readProcessingIndex(cacheDir, manifest) })
}

export async function refreshRelationshipAudit({ cacheDir, outputDir, manifest, completenessAudit }) {
  const audit = buildRelationshipAudit({ manifest, completenessAudit, processingIndex: await readProcessingIndex(cacheDir, manifest) })
  await mkdir(cacheDir, { recursive: true, mode: 0o700 })
  await atomicWriteJson(path.join(cacheDir, 'relationship-audit.json'), audit, { directoryMode: 0o700 })
  if (outputDir) {
    await mkdir(outputDir, { recursive: true })
    await atomicWriteJson(path.join(outputDir, 'relationship-audit.json'), audit)
    await atomicWriteText(path.join(outputDir, 'relationship-audit.md'), relationshipAuditMarkdown(audit), { mode: 0o644 })
  }
  return audit
}

export function buildRelationshipAudit({ manifest, completenessAudit, processingIndex = emptyProcessingIndex() }) {
  const files = Array.isArray(manifest?.files) ? manifest.files : []
  const discovery = completenessAudit?.discovery ?? {}
  const candidateMap = new Map([
    ...(discovery.trackedMatches ?? []),
    ...(discovery.candidates ?? []),
    ...(discovery.excludedLikelyFalseMatches ?? []),
  ].map((item) => [Number(item.courtListenerDocketId), item]))
	  const fileGroups = groupFilesByDocket(files)
	  const docketIds = new Set([
	    ...[...fileGroups.keys()].map(Number),
	    ...[...candidateMap.keys()].map(Number),
	    ...(completenessAudit?.dockets ?? []).map((item) => Number(item.courtListenerDocketId)),
	  ].filter((id) => Number.isFinite(id)))
	  const dockets = [...docketIds]
	    .map((id) => buildDocketRelation(id, candidateMap.get(id), fileGroups.get(String(id)) ?? [], completenessAudit, processingIndex))
    .filter(Boolean)
    .sort(compareRelations)

  const counts = countRelations(dockets)
  const pendingReviewDockets = dockets.filter((item) => item.relationship.status === 'pending_manual_review')
  return {
    schemaVersion,
    generatedAt: new Date().toISOString(),
    signature: relationshipAuditSignature(manifest, completenessAudit),
    methodology: methodology(),
    sourceLimitations: sourceLimitations(),
    counts: {
      dockets: dockets.length,
      discoveredDockets: dockets.filter((item) => item.discoveryState === 'discovered').length,
      formalTrackedDockets: dockets.filter((item) => item.discoveryState === 'tracked').length,
      usableFiles: files.filter((file) => file.status !== 'error').length,
      filesPendingReview: pendingReviewDockets.reduce((total, item) => total + item.files.usable, 0),
      byStatus: counts.byStatus,
      byType: counts.byType,
    },
    relationTypes: Object.fromEntries(relationshipTypes.map((type) => [type, relationshipTypeDefinition(type)])),
    dockets,
    pendingReview: pendingReviewDockets,
    excluded: dockets.filter((item) => item.relationship.status === 'excluded'),
  }
}

function buildDocketRelation(docketId, candidate, files, completenessAudit, processingIndex) {
  const auditDocket = (completenessAudit?.dockets ?? []).find((item) => Number(item.courtListenerDocketId) === docketId)
  const discovered = files.some((file) => String(file.caseId).startsWith('discovered-'))
  const item = candidate ?? {
    courtListenerDocketId: docketId,
    title: auditDocket?.label ?? auditDocket?.caseTitle ?? files[0]?.title ?? `CourtListener docket ${docketId}`,
    court: auditDocket?.court ?? files[0]?.court ?? '',
    docketNumber: auditDocket?.docketNumber ?? files[0]?.docketNumber ?? '',
    summary: '',
    sourceUrl: auditDocket?.courtListenerUrl ?? files[0]?.sourcePage ?? files[0]?.url ?? `https://www.courtlistener.com/docket/${docketId}/`,
    classification: discovered ? 'related_candidate' : 'tracked',
  }
  const parties = unique([
    ...(Array.isArray(item.parties) ? item.parties : []),
    ...files.flatMap((file) => Array.isArray(file.parties) ? file.parties : []),
  ])
  const relationship = classifyRelationship({
    ...item,
    parties,
    relationStatus: item.classification === 'likely_false_match' ? 'excluded' : undefined,
    sourceUrl: item.sourceUrl,
  })
  const fileSummary = summarizeFiles(files, processingIndex)
  const docketUrl = item.sourceUrl || `https://www.courtlistener.com/docket/${docketId}/`
  const sourceUrls = unique([
    docketUrl,
    ...files.map((file) => file.sourcePage),
    ...files.map((file) => file.url),
  ]).filter(Boolean).slice(0, 12)

  return {
    id: `relationship-${docketId}`,
    caseId: files[0]?.caseId ?? null,
    courtListenerDocketId: docketId,
    docketNumber: item.docketNumber || auditDocket?.docketNumber || files[0]?.docketNumber || null,
    caption: clean(item.title || auditDocket?.label || ''),
    court: clean(item.court || auditDocket?.court || files[0]?.court || ''),
	    discoveryState: item.classification === 'tracked' || auditDocket ? 'tracked' : discovered ? 'discovered' : 'discovery_lead',
    discoveryClassification: item.classification ?? 'unclassified',
    latestObserved: item.latestObserved || auditDocket?.latestObserved || null,
    sourceUrls,
    relationship: {
      ...relationship,
      docketUrl,
    },
    evidence: relationship.evidence,
    files: fileSummary,
    verificationTasks: verificationTasksForRelation(relationship, files),
  }
}

function finalizeRelationship(input, primaryType, { seenMatchers = new Set() } = {}) {
  const types = [...new Set(input.types ?? [])]
  const primaryIsDirect = primaryType === 'direct_person' || primaryType === 'criminal_related'
  const primaryIsSubstantiveEntity = ['family_or_related_person', 'g_series_entity', 'estate_asset_vehicle'].includes(primaryType)
  const primaryIsProcedural = ['trustee_recovery', 'third_party_claimant', 'professional_or_service_provider'].includes(primaryType)
  const status = primaryType === 'excluded_false_match'
    ? 'excluded'
    : primaryIsDirect
      ? 'verified_public_relation'
      : primaryIsSubstantiveEntity
        ? 'probable_relation'
        : primaryIsProcedural && (input.parties?.length || input.evidence?.length)
          ? 'verified_public_relation'
          : 'pending_manual_review'
  const confidence = primaryIsDirect ? 'high' : primaryIsSubstantiveEntity || primaryIsProcedural ? 'medium' : 'low'
  const evidence = (input.evidence ?? []).map((entry) => ({
    ...entry,
    confidence: entry.confidence ?? confidence,
  }))
  const controlWarning = primaryIsDirect || primaryIsSubstantiveEntity
	    ? 'A name, caption, party listing, or asset/entity signal is not by itself proof of beneficial ownership, control, alter ego, or liability.'
	    : 'A trustee caption or public search hit establishes at most the procedural relationship shown; it does not establish that the counterparty was controlled by Ho Wan Kwok.'
  return {
    primaryType,
    types,
    status,
    confidence,
    confidenceScore: confidence === 'high' ? 0.92 : confidence === 'medium' ? 0.68 : 0.32,
    signals: evidence.map((entry) => entry.labelEn),
    signalTypes: [...seenMatchers],
    evidence,
    controlWarningEn: controlWarning,
    controlWarningZh: '姓名、案名、当事人列表或资产/实体信号本身，不足以证明受益所有权、控制关系、人格混同或法律责任。',
	    promotionEligible: status === 'verified_public_relation' && !['professional_or_service_provider', 'third_party_claimant', 'trustee_recovery'].includes(primaryType),
	    requiresManualReview: status === 'pending_manual_review' || types.some((type) => ['estate_asset_vehicle', 'g_series_entity', 'family_or_related_person'].includes(type)),
	  }
}

function choosePrimaryType(types, input) {
  const uniqueTypes = [...new Set(types)]
  const caption = captionTextFor(input)
  const titleHasServiceProvider = serviceProviderPattern.test(caption)
  const titleHasSubstantiveEntity = typeMatchesCaption('g_series_entity', caption) || typeMatchesCaption('estate_asset_vehicle', caption)
  const genericBankruptcyAdversaryCaption = /^ho wan kwok\s*-\s*adversary proceeding$/i.test(clean(input.title))
  if (uniqueTypes.includes('criminal_related')) return 'criminal_related'
  if (titleHasServiceProvider && uniqueTypes.includes('professional_or_service_provider')) return 'professional_or_service_provider'
  if (genericBankruptcyAdversaryCaption && titleHasSubstantiveEntity && uniqueTypes.includes('g_series_entity')) return 'g_series_entity'
  if (genericBankruptcyAdversaryCaption && titleHasSubstantiveEntity && uniqueTypes.includes('estate_asset_vehicle')) return 'estate_asset_vehicle'
  if (uniqueTypes.includes('direct_person')) return 'direct_person'
  if (uniqueTypes.includes('g_series_entity')) return 'g_series_entity'
  if (uniqueTypes.includes('estate_asset_vehicle')) return 'estate_asset_vehicle'
  if (uniqueTypes.includes('family_or_related_person')) return 'family_or_related_person'
  if (uniqueTypes.includes('professional_or_service_provider')) return 'professional_or_service_provider'
  if (uniqueTypes.includes('third_party_claimant')) return 'third_party_claimant'
  if (uniqueTypes.includes('trustee_recovery')) return 'trustee_recovery'
  return input.classification === 'likely_false_match' ? 'excluded_false_match' : null
}

function captionTextFor(input) {
  return [clean(input.title), clean(input.summary)].filter(Boolean).join(' ')
}

function typeMatchesCaption(type, caption) {
  return relationMatchers.some((matcher) => matcher.type === type && matcher.pattern.test(caption))
}

function makeEvidence(matcher, text, input) {
  const match = String(text).match(matcher.pattern)
  const excerpt = compactExcerpt(text, match?.index ?? 0, 320)
  const definition = relationshipTypeDefinition(matcher.type)
  return {
    kind: 'caption_or_party_record',
    type: matcher.type,
    labelEn: matcher.labelEn,
    labelZh: matcher.labelZh,
    excerpt,
    sourceUrl: sourceUrlFor(input),
    descriptionEn: definition.descriptionEn,
    descriptionZh: definition.descriptionZh,
    confidence: matcher.type === 'direct_person' || matcher.type === 'criminal_related' ? 'high' : 'medium',
  }
}

function fallbackEvidence(input, type) {
  const definition = relationshipTypeDefinition(type)
  return {
    kind: 'discovery_metadata',
    type,
    labelEn: definition.labelEn,
    labelZh: definition.labelZh,
    excerpt: clean(input.title || input.summary || ''),
    sourceUrl: sourceUrlFor(input),
    descriptionEn: definition.descriptionEn,
    descriptionZh: definition.descriptionZh,
    confidence: 'low',
  }
}

function verificationTasksForRelation(relationship, files) {
  const tasks = []
  if (relationship.status === 'pending_manual_review') tasks.push('Verify the docket header, court, complete party list, and operative pleading or order before upgrading this lead.')
  if (relationship.types.includes('estate_asset_vehicle') || relationship.types.includes('g_series_entity')) tasks.push('Locate the court finding, sworn declaration, title record, or transaction evidence that supports the specific ownership or control proposition.')
  if (relationship.types.includes('family_or_related_person')) tasks.push('Confirm whether the named individual is a party, officer, claimant, witness, or merely mentioned in the filing.')
  if (relationship.types.includes('trustee_recovery')) tasks.push('Read the trustee complaint and later dispositive orders separately; a trustee allegation is not a court finding.')
  if (files.some((file) => file.sourceId === 'nfsc-criminal-mirror')) tasks.push('Compare the mirror PDF with CourtListener/RECAP or PACER and record any hash or text discrepancy.')
  return unique(tasks)
}

function summarizeFiles(files, processingIndex) {
  return {
    total: files.length,
    usable: files.filter((file) => file.status !== 'error').length,
    officialOrRecap: files.filter((file) => ['pacer', 'courtlistener-recap'].includes(file.sourceId) && file.status !== 'error').length,
    backupMirror: files.filter((file) => file.sourceId === 'nfsc-criminal-mirror' && file.status !== 'error').length,
    errors: files.filter((file) => file.status === 'error').length,
    extracted: files.filter((file) => processingIndex.extractedUrls.has(file.url)).length,
    translated: files.filter((file) => processingIndex.translatedUrls.has(file.url)).length,
    aiAnalyzed: files.filter((file) => processingIndex.aiUrls.has(file.url)).length,
  }
}

async function readProcessingIndex(cacheDir, manifest) {
  const [extractions, translations, aiAnalyses] = await Promise.all([
    readJsonDirectory(path.join(cacheDir, 'pdf-text')),
    readJsonDirectory(path.join(cacheDir, 'translations')),
    readJsonDirectory(path.join(cacheDir, 'document-ai')),
  ])
  const filesByHash = new Map((manifest?.files ?? []).filter((file) => file.sha256).map((file) => [file.sha256, file.url]))
  const urlsByTextHash = new Map()
  const extractedUrls = new Set()
  for (const extraction of extractions.filter((value) => value?.status === 'extracted')) {
    const sourceUrl = filesByHash.get(extraction.signature?.manifestSha256 || extraction.signature?.contentSha256)
    if (!sourceUrl) continue
    extractedUrls.add(sourceUrl)
    if (extraction.textHash) urlsByTextHash.set(extraction.textHash, sourceUrl)
  }
  return {
    extractedUrls,
    translatedUrls: new Set(translations
      .filter((value) => ['translated', 'no_translation_needed'].includes(value?.status))
      .map((value) => value.sourceUrl || urlsByTextHash.get(value.textHash))
      .filter(Boolean)),
    aiUrls: new Set(aiAnalyses
      .filter((value) => value?.aiStatus?.generated && ['openai', 'anthropic', 'gemini', 'openai_compatible', 'ollama'].includes(value?.aiStatus?.provider))
      .map((value) => value.sourceUrl || value.analysis?.sourceUrl)
      .filter(Boolean)),
  }
}

async function readJsonDirectory(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
  return Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map(async (entry) => {
      try {
        return JSON.parse(await readFile(path.join(directory, entry.name), 'utf8'))
      } catch {
        return null
      }
    }))
}

function emptyProcessingIndex() {
  return { extractedUrls: new Set(), translatedUrls: new Set(), aiUrls: new Set() }
}

function groupFilesByDocket(files) {
  const groups = new Map()
  for (const file of files) {
    if (!file.courtListenerDocketId) continue
    const key = String(file.courtListenerDocketId)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(file)
  }
  return groups
}

function countRelations(dockets) {
  const byStatus = {}
  const byType = {}
  for (const item of dockets) {
    byStatus[item.relationship.status] = (byStatus[item.relationship.status] ?? 0) + 1
    for (const type of item.relationship.types) byType[type] = (byType[type] ?? 0) + 1
  }
  return { byStatus, byType }
}

function relationshipAuditSignature(manifest, completenessAudit) {
  return createHash('sha256').update(JSON.stringify({
    schemaVersion,
    manifestGeneratedAt: manifest?.generatedAt ?? null,
    completenessGeneratedAt: completenessAudit?.generatedAt ?? null,
    files: (manifest?.files ?? []).map((file) => ({
      url: file.url,
      caseId: file.caseId,
      docketId: file.courtListenerDocketId,
      status: file.status,
      sha256: file.sha256 ?? null,
    })),
    dockets: (completenessAudit?.discovery?.candidates ?? []).map((item) => ({ id: item.courtListenerDocketId, title: item.title, parties: item.parties })),
  })).digest('hex')
}

function methodology() {
  return [
    'The audit classifies public captions, party records, docket metadata, and local manifest source links; it does not infer ownership from a name alone.',
    'PACER is the record of docket. CourtListener/RECAP is treated as the primary no-fee public substitute when a filing is mirrored; NFSC is a backup mirror only.',
    'Trustee recovery is a procedural relation. It is deliberately separated from proof that a defendant company was owned or controlled by Ho Wan Kwok.',
    'A relation is eligible for formal tracking only when the public record supports the stated relation; asset, entity, family, and weak leads retain manual-review status.',
  ]
}

function sourceLimitations() {
  return {
    pacer: 'PACER access, fees, credentials, sealed materials, and non-public records are outside this local audit.',
    recap: 'RECAP is a public mirror and may not contain filings that no PACER user has contributed.',
    nfsc: 'NFSC is a backup mirror. A matching file must be compared with an official or RECAP source before it is treated as corroborated.',
    relationship: 'Public captions and party lists show procedural identity, not beneficial ownership, control, alter ego, or liability.',
  }
}

function relationshipAuditMarkdown(audit) {
  const rows = audit.dockets.map((item) => [
    item.docketNumber ?? '',
    item.caption,
    item.relationship.primaryType,
    item.relationship.status,
    item.relationship.confidence,
    item.files.usable,
    item.relationship.docketUrl,
  ].map(markdownCell).join(' | '))
  return `# Relationship attribution audit\n\nGenerated: ${audit.generatedAt}\n\nThis report separates public procedural relationships from proof of ownership or control. It does not claim that every public or sealed record has been found.\n\n## Summary\n\n- Dockets: ${audit.counts.dockets}\n- Discovered dockets: ${audit.counts.discoveredDockets}\n- Formal tracked dockets: ${audit.counts.formalTrackedDockets}\n- Usable local files: ${audit.counts.usableFiles}\n- Files pending review: ${audit.counts.filesPendingReview}\n- Status counts: ${JSON.stringify(audit.counts.byStatus)}\n- Type counts: ${JSON.stringify(audit.counts.byType)}\n\n## Dockets\n\nDocket | Caption | Primary relation | Status | Confidence | Usable files | Source\n--- | --- | --- | --- | --- | ---: | ---\n${rows.join('\\n')}\n\n## Source limitations\n\n${Object.entries(audit.sourceLimitations).map(([key, value]) => `- **${key}**: ${value}`).join('\\n')}\n`
}

function compareRelations(left, right) {
  const statusWeight = { pending_manual_review: 0, probable_relation: 1, verified_public_relation: 2, excluded: 3 }
  return (statusWeight[left.relationship.status] ?? 9) - (statusWeight[right.relationship.status] ?? 9)
    || String(left.docketNumber ?? '').localeCompare(String(right.docketNumber ?? ''), undefined, { numeric: true })
}

function sourceUrlFor(input) {
  return clean(input.sourceUrl) || (input.courtListenerDocketId ? `https://www.courtlistener.com/docket/${input.courtListenerDocketId}/` : '')
}

function compactExcerpt(value, index, radius) {
  const text = clean(value)
  const start = Math.max(0, index - Math.floor(radius / 3))
  return text.slice(start, start + radius)
}

function clean(value) {
  return normalizeLegalMetadataText(value).replace(/\s+/g, ' ').trim().slice(0, 12000)
}

function unique(values) {
  return [...new Set(values.map((value) => clean(value)).filter(Boolean))]
}

function markdownCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
}
