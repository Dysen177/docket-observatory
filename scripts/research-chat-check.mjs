import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'

const cacheDir = await mkdtemp(path.join(os.tmpdir(), 'docket-research-chat-check-'))
process.env.GUO_INTEL_CACHE_DIR = cacheDir

try {
  const { initializeSettingsStore, updateSettings } = await import('../server/settings-store.js')
  await initializeSettingsStore()
  const { answerResearchChat, classifyResearchChatMode, detectResearchChatAnswerLanguage, modelCitationsForProvider, normalizeResearchCitationMarkers, researchChatStatus, researchTokens, retrieveResearchChatEvidence, selectResearchChatContext } = await import('../server/research-chat.js')
  const { createSeedState } = await import('../server/seed.js')
  const status = await researchChatStatus('zh', { probeLocal: false })
  assert.equal(status.ready, false)
  assert.equal(status.provider, 'local')
  assert.equal(status.model, null)
  assert.equal(status.reason, 'provider_not_selected')
  assert.equal(status.offlineArchiveReady, true)
  assert.deepEqual(researchTokens('刑事主案目前的程序进展是什么？'), ['刑事主案', '刑事'])
  assert.deepEqual(researchTokens('What is the current procedural status of the criminal main case?'), ['criminal', 'main'])
  assert.equal(detectResearchChatAnswerLanguage([{ role: 'user', content: 'PACER、API 和 GTV 在程序里怎么使用？' }], 'en'), 'zh')
  assert.equal(detectResearchChatAnswerLanguage([{ role: 'user', content: 'PACER API GTV 怎么用？' }], 'en'), 'zh')
  assert.equal(detectResearchChatAnswerLanguage([{ role: 'user', content: 'What does 喜联储 mean in the court records?' }], 'zh'), 'en')
  assert.equal(normalizeResearchCitationMarkers('依据 [T1, T2，T3; T4]'), '依据 [T1] [T2] [T3] [T4]')
  assert.equal(detectResearchChatAnswerLanguage([
    { role: 'user', content: '先用中文回答。' },
    { role: 'assistant', content: '可以。' },
    { role: 'user', content: 'Now explain the appellate posture in English.' },
  ], 'zh'), 'en')
  for (const greeting of ['你好', 'hello', '谢谢', 'Thanks!']) {
    assert.equal(classifyResearchChatMode([{ role: 'user', content: greeting }]), 'conversation')
  }
  assert.equal(classifyResearchChatMode([{ role: 'user', content: '帮我把这句话写得更简洁。' }]), 'conversation')
  assert.equal(classifyResearchChatMode([{ role: 'user', content: '我只是举摩根和王岐山作为问题例子，模型能力是不是关键？' }]), 'conversation')
  assert.equal(classifyResearchChatMode([{ role: 'user', content: 'AI Chat 回答完全和问题无关，质量跟 GHOT 比差很多。' }]), 'conversation')
  assert.equal(classifyResearchChatMode([{ role: 'user', content: '刑事主案目前的程序进展是什么？' }]), 'research')
  assert.equal(classifyResearchChatMode([{ role: 'user', content: 'Which records mention Himalaya Exchange?' }]), 'research')
  assert.equal(classifyResearchChatMode([
    { role: 'user', content: '哪些法院文件与喜联储有关？' },
    { role: 'assistant', content: '已有回答 [D1]', mode: 'research' },
    { role: 'user', content: '那这个后来怎么样了？' },
  ]), 'research')
  assert.equal(classifyResearchChatMode([
    { role: 'user', content: 'What happened in the criminal case?' },
    { role: 'assistant', content: 'Grounded answer [D1]', mode: 'research' },
    { role: 'user', content: 'What is its status now?' },
  ]), 'research')
  assert.equal(classifyResearchChatMode([
    { role: 'user', content: '你好' },
    { role: 'assistant', content: '你好，有什么可以帮你？', mode: 'conversation' },
    { role: 'user', content: '继续说' },
  ]), 'conversation')
  const longContext = selectResearchChatContext(Array.from({ length: 20 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user',
    content: `${index}:${'x'.repeat(2400)}`,
  })), 20000)
  assert.ok(longContext.metadata.omittedMessageCount > 0)
  assert.equal(longContext.messages.at(-1).role, 'assistant')
  assert.equal(longContext.messages[0].role, 'user')
  assert.equal(longContext.metadata.storedMessageCount, 20)

  const emptyOfflineSearch = await answerResearchChat({
    input: { scope: 'all', messages: [{ role: 'user', content: '刑事主案进展如何？' }] },
    language: 'zh',
    manifest: { files: [] },
    state: { cases: [], events: [], entities: [], policyWatch: [] },
    dashboard: { cases: [], events: [], entities: [], policyWatch: [] },
  })
  assert.equal(emptyOfflineSearch.provider, 'local_search')
  assert.equal(emptyOfflineSearch.model, null)
  assert.match(emptyOfflineSearch.answer, /未使用生成式模型|检索/u)

  const state = createSeedState()
  const manifestPath = process.env.RESEARCH_CHAT_TEST_MANIFEST
    || new URL('./fixtures/research-chat-manifest.json', import.meta.url)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const dashboard = {
    cases: state.cases,
    events: state.events,
    entities: state.entities,
    policyWatch: state.policyWatch,
  }
  const offlineGreeting = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '你好' }] },
    interfaceLanguage: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.equal(offlineGreeting.provider, 'local_search')
  assert.match(offlineGreeting.answer, /本地资料检索模式/u)

  const offlineWholeLibrarySearch = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '郭文贵怎么说摩根家族的？' }] },
    interfaceLanguage: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.equal(offlineWholeLibrarySearch.provider, 'local_search')
  assert.equal(offlineWholeLibrarySearch.model, null)
  assert.ok(offlineWholeLibrarySearch.citations.some((citation) => citation.kind === 'transcript'))
  assert.match(offlineWholeLibrarySearch.answer, /不是 AI 综合结论/u)
  const offlineNfscDeclaration = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '新中国联邦的宣言是什么？' }] },
    interfaceLanguage: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.equal(offlineNfscDeclaration.provider, 'local_archive')
  assert.equal(offlineNfscDeclaration.model, null)
  assert.ok(offlineNfscDeclaration.answer.length >= 2500)
  assert.match(offlineNfscDeclaration.answer, /简要回答/u)
  assert.match(offlineNfscDeclaration.answer, /一人一票/u)
  assert.match(offlineNfscDeclaration.answer, /三权分立/u)
  assert.match(offlineNfscDeclaration.answer, /7 项基本内容/u)
  assert.match(offlineNfscDeclaration.answer, /喜马拉雅监督机构/u)
  assert.match(offlineNfscDeclaration.answer, /18 条政策/u)
  assert.match(offlineNfscDeclaration.answer, /证据边界/u)
  assert.match(offlineNfscDeclaration.answer, /不等于[^\n]{0,120}独立核实/u)
  assert.doesNotMatch(offlineNfscDeclaration.answer, /^(?:---|>)/mu)
  assert.equal(offlineNfscDeclaration.citations.length, 1)
  assert.equal(offlineNfscDeclaration.citations[0].kind, 'archive_reference')
  assert.ok(offlineNfscDeclaration.answer.includes(`[${offlineNfscDeclaration.citations[0].id}]`))
  assert.equal(classifyResearchChatMode([{ role: 'user', content: 'Geyer 是谁？' }], { manifest, dashboard }), 'research')
  assert.equal(classifyResearchChatMode([{ role: 'user', content: 'Einstein 是谁？' }], { manifest, dashboard }), 'conversation')
  const retrieved = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '郭文贵在哪些直播里谈到喜联储？法院文件对喜币和喜美元又是怎么记录的？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.equal(retrieved.scope, 'all')
  assert.equal(retrieved.scopeSummary.publicStatementStart, '2017-01-26')
  assert.equal(retrieved.scopeSummary.publicStatementEnd, '2023-03-14')
  assert.ok(retrieved.scopeSummary.searchableTranscripts >= 5000)
  assert.equal(retrieved.scopeSummary.translationMissingRecords, 0)
  assert.ok(retrieved.expandedValues.includes('喜联储'))
  assert.ok(retrieved.expandedValues.some((value) => /Himalaya (?:Exchange|Reserve)/iu.test(value)))
  assert.ok(retrieved.citations.some((citation) => citation.id.startsWith('T') && citation.kind === 'transcript'))
  assert.ok(retrieved.citations.some((citation) => citation.id.startsWith('S') && citation.kind === 'program_scope'))
  assert.ok(retrieved.citations.some((citation) => citation.id.startsWith('S') && /内部术语档案/u.test(citation.sourceLabel)))
  assert.equal(new Set(retrieved.citations.map((citation) => citation.id)).size, retrieved.citations.length)
  assert.match(retrieved.skillPrompt, /法院正式案卷/u)
  assert.match(retrieved.skillPrompt, /公开帖文不是视频逐字稿/u)

  const courtOnly = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '哪些法院文件与喜联储相关？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  const courtDocuments = courtOnly.citations.filter((citation) => citation.kind === 'document')
  assert.ok(courtDocuments.length > 0)
  assert.equal(courtOnly.citations.some((citation) => citation.kind === 'transcript'), false)
  assert.ok(courtDocuments.every((citation) => !/项目网站|web page/iu.test(`${citation.sourceLabel} ${citation.evidenceClass}`)))

  const transcriptOnly = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '郭文贵在哪些直播里谈过喜联储？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.ok(transcriptOnly.citations.some((citation) => citation.kind === 'transcript'))
  assert.equal(transcriptOnly.citations.some((citation) => citation.kind === 'document'), false)

  const morganStatements = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '郭文贵怎么说摩根家族的？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  const morganTranscriptCitations = morganStatements.citations.filter((citation) => citation.kind === 'transcript')
  assert.ok(morganTranscriptCitations.length >= 3)
  assert.ok(morganTranscriptCitations.every((citation) => /摩根|Morgan/iu.test(`${citation.excerpt} ${citation.contextBefore.map((item) => item.text).join(' ')} ${citation.contextAfter.map((item) => item.text).join(' ')}`)))
  assert.equal(morganStatements.citations.some((citation) => citation.kind === 'document'), false)

  const relationshipStatements = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '王岐山是共济会的？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  const relationshipTranscriptCitations = relationshipStatements.citations.filter((citation) => citation.kind === 'transcript')
  assert.ok(relationshipTranscriptCitations.length >= 3)
  assert.ok(relationshipTranscriptCitations.slice(0, 3).every((citation) => {
    const passage = `${citation.excerpt} ${citation.contextBefore.map((item) => item.text).join(' ')} ${citation.contextAfter.map((item) => item.text).join(' ')}`
    return /王岐山/u.test(passage) && /共济会/u.test(passage)
  }))
  assert.equal(relationshipStatements.citations.some((citation) => citation.kind === 'document'), false)

  const doubleDragon = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '双龙计划是什么？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.ok(doubleDragon.citations.some((citation) => citation.kind === 'transcript' && /香港|台湾/u.test(`${citation.excerpt} ${citation.contextBefore.map((item) => item.text).join(' ')} ${citation.contextAfter.map((item) => item.text).join(' ')}`)))
  const doubleDragonDossier = doubleDragon.citations.find((citation) => /内部术语档案/u.test(citation.sourceLabel) && /双龙/u.test(citation.title))
  assert.ok(doubleDragonDossier)
  assert.match(doubleDragonDossier.excerpt, /郭文贵公开言论/u)
  assert.match(doubleDragonDossier.excerpt, /不是已公开的官方作战计划或法院认定/u)

  const nfscDefinition = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '新中国联邦是什么？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.ok(nfscDefinition.citations.some((citation) => /内部术语档案/u.test(citation.sourceLabel) && /新中国联邦/u.test(citation.title)))
  assert.ok(nfscDefinition.citations.some((citation) => citation.kind === 'archive_reference' && citation.title === '新中国联邦宣言'))

  const bgyDefinition = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '蓝金黄是什么意思？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.ok(bgyDefinition.citations.some((citation) => citation.kind === 'archive_reference' && citation.title === '蓝金黄/BGY'))
  assert.ok(bgyDefinition.citations.some((citation) => /内部术语档案/u.test(citation.sourceLabel) && /蓝金黄/u.test(citation.title)))

  const doc867Evidence = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '刑事主案文件 867 是什么？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.ok(doc867Evidence.citations.some((citation) => citation.kind === 'document' && /867/u.test(`${citation.title} ${citation.subtitle}`)))
  const doc867Archive = doc867Evidence.citations.find((citation) => citation.kind === 'archive_reference' && /867/u.test(`${citation.title} ${citation.subtitle} ${citation.excerpt}`))
  assert.ok(doc867Archive)
  assert.match(doc867Archive.evidenceClass, /二级档案摘要/u)
  assert.match(doc867Archive.evidenceClass, /PDF 原件和官方案卷核验/u)
  const localDoc867Context = modelCitationsForProvider(doc867Evidence.citations, 'ollama', '刑事主案文件 867 是什么？')
  assert.ok(localDoc867Context.some((citation) => citation.kind === 'document' && /867/u.test(`${citation.title} ${citation.subtitle}`)))
  assert.ok(localDoc867Context.some((citation) => citation.kind === 'archive_reference' && /867/u.test(`${citation.title} ${citation.subtitle} ${citation.excerpt}`)))

  const latestCourtDocument = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '刑事主案文件 869 是什么？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.ok(latestCourtDocument.citations.some((citation) => citation.kind === 'document' && /869|Pillsbury/iu.test(`${citation.title} ${citation.subtitle} ${citation.excerpt}`)))

  const docketEvent870 = {
    id: 'fixture-recap-870',
    date: '2026-08-18',
    title: 'RECAP docket entry 870: United States v. GUO docket entry 870',
    summary: 'United States v. GUO docket entry 870',
    impact: 'Read the linked entry and available PDF before relying on it.',
    caseId: 'sdny-23-cr-118',
    docketNumber: '1:23-cr-00118',
    courtListenerDocketId: 67012324,
    filingNumber: '870',
    category: 'Docket Filing',
    severity: 'low',
    sourceId: 'courtlistener-recap',
    sourceLabel: 'RECAP',
    sourceType: 'CourtListener / RECAP',
    sourceUrl: 'https://www.courtlistener.com/docket/67012324/870/united-states-v-guo/',
    confidence: 'high',
    assertionType: 'Public RECAP feed metadata',
  }
  const stateWith870 = { ...state, events: [docketEvent870, ...state.events] }
  const dashboardWith870 = { ...dashboard, events: stateWith870.events }
  const doc870Evidence = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '870文件是什么？' }],
    language: 'zh',
    manifest,
    state: stateWith870,
    dashboard: dashboardWith870,
  })
  const doc870Citation = doc870Evidence.citations.find((citation) => citation.kind === 'document' && /870/u.test(`${citation.title} ${citation.subtitle}`))
  assert.ok(doc870Citation)
  assert.equal(doc870Citation.resourceKind, 'docket_entry')
  assert.match(doc870Citation.evidenceClass, /仅元数据/u)

  const offlineDoc870 = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '870文件是什么？' }] },
    interfaceLanguage: 'zh',
    manifest,
    state: stateWith870,
    dashboard: dashboardWith870,
  })
  assert.equal(offlineDoc870.provider, 'local_catalog')
  assert.equal(offlineDoc870.model, null)
  assert.equal(offlineDoc870.citations.length, 1)
  assert.equal(offlineDoc870.citations[0].resourceKind, 'docket_entry')
  assert.match(offlineDoc870.answer, /只有案卷元数据/u)
  assert.match(offlineDoc870.answer, /没有[^。]{0,40}(?:PDF|可读正文)/u)
  assert.match(offlineDoc870.answer, /不能[^。]{0,120}法律效果/u)

  const manifestWithDownloaded870 = {
    ...manifest,
    files: [{
      url: 'https://storage.courtlistener.com/recap/guo.870.0.pdf',
      sha256: 'c'.repeat(64),
      status: 'downloaded',
      path: '/managed/doc-870.pdf',
      filename: 'doc-870.pdf',
      title: 'Case 1:23-cr-00118 Document 870',
      docNumber: '870',
      caseId: 'sdny-23-cr-118',
      docketNumber: '1:23-cr-00118-AT',
      sourceId: 'courtlistener-recap',
      sourceLabel: 'CourtListener / RECAP',
      filedAt: '2026-08-18',
      bytes: 1000,
    }, ...manifest.files],
  }
  const offlineDownloaded870 = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '870文件是什么？' }] },
    interfaceLanguage: 'zh',
    manifest: manifestWithDownloaded870,
    state: stateWith870,
    dashboard: dashboardWith870,
  })
  assert.equal(offlineDownloaded870.provider, 'local_catalog')
  assert.equal(offlineDownloaded870.citations[0].resourceKind, 'pdf')
  assert.doesNotMatch(offlineDownloaded870.answer, /当前可用的公开记录只有案卷元数据/u)

  const latestFiledDocuments = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '最新的三个法院文件是什么？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  const latestFiledCitations = latestFiledDocuments.citations.filter((citation) => citation.kind === 'document')
  assert.equal(latestFiledCitations.length, 3)
  assert.equal(latestFiledDocuments.citations.length, 3)
  assert.equal(latestFiledDocuments.citations.some((citation) => ['case', 'case_event', 'entity', 'policy'].includes(citation.kind)), false)
  assert.ok(latestFiledCitations.some((citation) => /Doc\. 869/u.test(citation.subtitle)))
  assert.ok(latestFiledCitations.some((citation) => /Respondent Waiver|Proof of Service|Petition for a Writ/iu.test(citation.title)))

  const recentlyProcessedDocuments = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '为什么刚才最新的三个文件没有自动更新？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  const recentlyProcessedCitations = recentlyProcessedDocuments.citations.filter((citation) => citation.kind === 'document')
  assert.equal(recentlyProcessedCitations.length, 3)
  assert.equal(recentlyProcessedDocuments.citations.length, 3)
  assert.equal(recentlyProcessedDocuments.citations.some((citation) => ['case', 'case_event', 'entity', 'policy'].includes(citation.kind)), false)
  assert.ok(recentlyProcessedCitations.every((citation) => /本地最新文件目录记录/u.test(citation.evidenceClass)))

  const transcriptScope = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: 'What date range does the historical public-statement corpus cover?' }],
    language: 'en',
    manifest,
    state,
    dashboard,
  })
  assert.equal(transcriptScope.citations.some((citation) => citation.kind === 'document'), false)
  assert.ok(transcriptScope.citations.some((citation) => citation.kind === 'program_scope'))

  const custodyStatus = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: '郭文贵目前在哪个联邦监狱，什么时候转监的？' }],
    language: 'zh',
    manifest,
    state,
    dashboard,
  })
  const bopCitation = custodyStatus.citations.find((citation) => citation.kind === 'official_status')
  assert.ok(bopCitation)
  assert.match(bopCitation.excerpt, /FCI Danbury/u)
  assert.match(bopCitation.excerpt, /不提供转监历史或具体转监日期/u)
  assert.match(bopCitation.sourceUrl, /^https:\/\/www\.bop\.gov\//u)

  const englishRetrieved = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: 'How do the historical statements distinguish Himalaya Reserve, H-Coin, and H-Dollar?' }],
    language: 'en',
    manifest,
    state,
    dashboard,
  })
  assert.ok(englishRetrieved.citations.some((citation) => citation.kind === 'transcript'))
  assert.match(englishRetrieved.skillPrompt, /A public post is not a video transcript/u)
  assert.match(englishRetrieved.skillPrompt, /not a PACER substitute/u)

  const observedModelInputs = []
  let returnUncitedFixture = false
  let returnMisclassifiedFixture = false
  let returnUnsupportedCourtFixture = false
  let returnUnboundedPlanFixture = false
  let returnInvalidCitationOnFirstAttempt = false
  let returnDoc867ArchiveOnlyFixture = false
  const mockServer = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404)
      response.end()
      return
    }
    let raw = ''
    for await (const chunk of request) raw += chunk
    const requestBody = JSON.parse(raw)
    const userMessage = requestBody.messages?.find((message) => message.role === 'user')?.content ?? '{}'
    const modelInput = JSON.parse(userMessage)
    observedModelInputs.push(modelInput)
    const citationIds = (modelInput.evidence ?? []).map((citation) => citation.id).filter(Boolean).slice(0, 3)
    const transcriptCitation = (modelInput.evidence ?? []).find((citation) => citation.kind === 'transcript')?.id ?? citationIds[0]
    const archiveCitation = (modelInput.evidence ?? []).find((citation) => citation.kind === 'archive_reference')?.id ?? citationIds[0]
    const answerInChinese = /用中文(?:回答|自然回复)/u.test(String(modelInput.instructions ?? ''))
    const nonProsecutionCitation = (modelInput.evidence ?? []).find((citation) => /法院|court|第三方|third-party/iu.test(String(citation.evidenceClass ?? '')))?.id ?? citationIds[0]
    const answer = {
      answer: returnInvalidCitationOnFirstAttempt && !modelInput.correction
        ? '第一次回答错误引用了不存在的证据。[T99]'
        : returnDoc867ArchiveOnlyFixture
        ? `Doc 867 是一份强制令请愿，列出了请愿人请求的救济。${archiveCitation ? `[${archiveCitation}]` : ''}`
        : returnUnsupportedCourtFixture
        ? `法院记录：刑期已经确定 ${nonProsecutionCitation ? `[${nonProsecutionCitation}]` : ''}\n\n检方主张：当前资料库未检索到检方直接文件。`
        : returnUnboundedPlanFixture
        ? `双龙计划是郭文贵在直播中提到的军事与政治行动称谓。${transcriptCitation ? `[${transcriptCitation}]` : ''}`
        : returnMisclassifiedFixture
        ? `检方主张法院判决中的刑期 ${nonProsecutionCitation ? `[${nonProsecutionCitation}]` : ''}`
        : returnUncitedFixture
        ? 'This fixture declares a source but does not place its citation marker in the answer.'
        : answerInChinese
        ? `模拟服务已完成带引证回答 ${citationIds.map((id) => `[${id}]`).join(' ')}`
        : `Mock provider completed a citation-grounded answer ${citationIds.map((id) => `[${id}]`).join(' ')}`,
      confidenceNote: returnDoc867ArchiveOnlyFixture
        ? '当前资料库未检索到直接提及文件867的具体内容。'
        : answerInChinese ? '仅用于模拟传输测试。' : 'Mock transport test only; inspect retrieved citations before relying on an answer.',
      usedCitationIds: returnInvalidCitationOnFirstAttempt && !modelInput.correction
        ? ['T99']
        : returnDoc867ArchiveOnlyFixture
        ? [archiveCitation].filter(Boolean)
        : returnUnboundedPlanFixture
        ? [transcriptCitation].filter(Boolean)
        : returnMisclassifiedFixture || returnUnsupportedCourtFixture ? [nonProsecutionCitation].filter(Boolean) : citationIds,
    }
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }))
  })
  await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve))
  const mockAddress = mockServer.address()
  assert.ok(mockAddress && typeof mockAddress !== 'string')
  process.env.OPENAI_COMPATIBLE_API_KEY = 'mock-research-chat-key'
  await updateSettings({
    settings: {
      aiProvider: 'openai_compatible',
      aiModel: 'mock-model',
      compatibleAiBaseUrl: `http://127.0.0.1:${mockAddress.port}/v1`,
      sendSnippetsToAi: true,
    },
  })
  const liveStatus = await researchChatStatus('en', { probeLocal: false })
  assert.equal(liveStatus.ready, true)
  assert.equal(liveStatus.provider, 'openai_compatible')
  const configuredDoc870 = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '870文件是什么？' }] },
    interfaceLanguage: 'zh',
    manifest,
    state: stateWith870,
    dashboard: dashboardWith870,
  })
  assert.equal(configuredDoc870.provider, 'openai_compatible')
  assert.match(configuredDoc870.answer, /证据边界/u)
  assert.match(configuredDoc870.answer, /没有可下载 PDF 或可读正文/u)
  assert.match(configuredDoc870.answer, /不能[^。]{0,120}法律效果/u)
  assert.equal(configuredDoc870.citations[0].resourceKind, 'docket_entry')
  assert.equal(observedModelInputs.at(-1).evidence[0].resourceKind, 'docket_entry')
  const greeting = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '你好' }] },
    interfaceLanguage: 'en',
    manifest,
    state,
    dashboard,
  })
  assert.equal(greeting.mode, 'conversation')
  assert.equal(greeting.answerLanguage, 'zh')
  assert.deepEqual(greeting.citations, [])
  assert.equal(greeting.retrievedCitationCount, 0)
  assert.equal('evidence' in observedModelInputs.at(-1), false)
  assert.match(greeting.answer, /模拟服务/u)
  const inputsBeforeArchiveDefinition = observedModelInputs.length
  const configuredNfscDeclaration = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '新中国联邦的宣言是什么？' }] },
    interfaceLanguage: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.equal(observedModelInputs.length, inputsBeforeArchiveDefinition)
  assert.equal(configuredNfscDeclaration.provider, 'local_archive')
  assert.match(configuredNfscDeclaration.answer, /一人一票/u)
  assert.match(configuredNfscDeclaration.answer, /三权分立/u)
  assert.match(configuredNfscDeclaration.answer, /证据边界/u)
  const cancelled = new AbortController()
  cancelled.abort()
  await assert.rejects(
    () => answerResearchChat({
      input: { messages: [{ role: 'user', content: 'This request must stop before retrieval.' }] },
      interfaceLanguage: 'en',
      manifest,
      state,
      dashboard,
      signal: cancelled.signal,
    }),
    (error) => error?.name === 'AbortError',
  )
  const generated = await answerResearchChat({
    input: { messages: [{ role: 'user', content: 'Which records mention Himalaya Exchange?' }] },
    interfaceLanguage: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.equal(generated.provider, 'openai_compatible')
  assert.equal(generated.mode, 'research')
  assert.equal(generated.answerLanguage, 'en')
  assert.ok(generated.citations.length > 0)
  assert.ok(generated.citations.every((citation) => citation.id && citation.title))
  assert.match(generated.answer, /\[(?:D|T|S)\d+\]/u)
  assert.match(observedModelInputs.at(-1).instructions, /in English/u)
  const generatedChinese = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '请用通俗语言说明刑事主案目前处于什么程序阶段？' }] },
    interfaceLanguage: 'en',
    manifest,
    state,
    dashboard,
  })
  assert.equal(generatedChinese.answerLanguage, 'zh')
  assert.match(generatedChinese.answer, /模拟服务/u)
  assert.match(observedModelInputs.at(-1).instructions, /用中文回答/u)

  returnUnboundedPlanFixture = true
  const boundedPlanAnswer = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '双龙计划是什么？' }] },
    interfaceLanguage: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.match(boundedPlanAnswer.answer, /证据边界/u)
  assert.match(boundedPlanAnswer.answer, /(?:不能|不足以)证明存在已公开的官方计划/u)
  assert.match(boundedPlanAnswer.answer, /(?:不是法院认定|不表示[^。！？\n]{0,40}获得法院认定)/u)
  assert.ok(boundedPlanAnswer.citations.some((citation) => citation.kind === 'transcript'))
  assert.ok(boundedPlanAnswer.citations.some((citation) => /内部术语档案/u.test(citation.sourceLabel) && /双龙/u.test(citation.title)))
  returnUnboundedPlanFixture = false

  returnInvalidCitationOnFirstAttempt = true
  const requestsBeforeCitationCorrection = observedModelInputs.length
  const correctedCitationAnswer = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '刑事主案文件 867 是什么？' }] },
    interfaceLanguage: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.equal(observedModelInputs.length, requestsBeforeCitationCorrection + 2)
  assert.doesNotMatch(correctedCitationAnswer.answer, /\[T99\]/u)
  assert.ok(correctedCitationAnswer.citations.length > 0)
  assert.ok(observedModelInputs.at(-1).correction)
  assert.match(observedModelInputs.at(-1).outputRequirements, /只能使用以下现有证据编号/u)
  returnInvalidCitationOnFirstAttempt = false

  returnDoc867ArchiveOnlyFixture = true
  const doc867AuthorityAnswer = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '刑事主案文件867是什么？请区分当事方主张和法院裁定。' }] },
    interfaceLanguage: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.match(doc867AuthorityAnswer.answer, /证据层级与程序含义/u)
  assert.match(doc867AuthorityAnswer.answer, /不是法院裁定，也不表示法院已经批准/u)
  assert.ok(doc867AuthorityAnswer.citations.some((citation) => citation.kind === 'document' && /867/u.test(`${citation.title} ${citation.subtitle}`)))
  assert.ok(doc867AuthorityAnswer.citations.some((citation) => citation.kind === 'archive_reference' && /867/u.test(`${citation.title} ${citation.subtitle}`)))
  assert.match(doc867AuthorityAnswer.confidenceNote, /已同时检索到 Doc 867 的本地文件记录和外部二级摘要/u)
  returnDoc867ArchiveOnlyFixture = false

  const inputsBeforeRecentDocuments = observedModelInputs.length
  const latestDocumentAnswer = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '最新的三个法院文件是什么？' }] },
    interfaceLanguage: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.equal(latestDocumentAnswer.mode, 'research')
  assert.equal(latestDocumentAnswer.answerLanguage, 'zh')
  assert.match(latestDocumentAnswer.answer, /Doc 869/u)
  assert.match(latestDocumentAnswer.answer, /Respondent Waiver of Right to Respond/u)
  assert.match(latestDocumentAnswer.answer, /Proof of Service/u)
  assert.equal(latestDocumentAnswer.citations.length, 3)
  assert.ok(latestDocumentAnswer.citations.every((citation) => citation.kind === 'document'))
  assert.equal(observedModelInputs.length, inputsBeforeRecentDocuments)

  const updateExplanation = await answerResearchChat({
    input: { messages: [{ role: 'user', content: '为什么刚才最新的三个文件没有自动更新？' }] },
    interfaceLanguage: 'zh',
    manifest,
    state,
    dashboard,
  })
  assert.equal(updateExplanation.mode, 'research')
  assert.equal(updateExplanation.answerLanguage, 'zh')
  assert.match(updateExplanation.answer, /不是在证明后台刚执行过自动更新或自动更新失败/u)
  assert.match(updateExplanation.answer, /要判断更新任务是否运行，需要看下载\/同步日志或来源诊断/u)
  assert.doesNotMatch(updateExplanation.answer, /\[S\d+\]/u)
  assert.equal(updateExplanation.citations.length, 3)
  assert.ok(updateExplanation.citations.every((citation) => citation.kind === 'document'))
  assert.equal(observedModelInputs.length, inputsBeforeRecentDocuments)

  returnUncitedFixture = true
  const repairedCitations = await answerResearchChat({
    input: { messages: [{ role: 'user', content: 'Which records mention Himalaya Exchange?' }] },
    interfaceLanguage: 'en',
    manifest,
    state,
    dashboard,
  })
  assert.match(repairedCitations.answer, /Citations: (?:\[(?:D|T|S)\d+\]\s*)+/u)
  assert.ok(repairedCitations.citations.length > 0)
  returnUncitedFixture = false
  returnMisclassifiedFixture = true
  await assert.rejects(
    () => answerResearchChat({
      input: { messages: [{ role: 'user', content: '请区分法院认定与检方主张。' }] },
      interfaceLanguage: 'zh',
      manifest,
      state,
      dashboard,
    }),
    (error) => error?.code === 'unsupported_party_attribution' && error?.expose === true,
  )
  returnMisclassifiedFixture = false
  returnUnsupportedCourtFixture = true
  await assert.rejects(
    () => answerResearchChat({
      input: { messages: [{ role: 'user', content: '请区分法院记录与检方主张。' }] },
      interfaceLanguage: 'zh',
      manifest,
      state,
      dashboard,
    }),
    (error) => error?.code === 'unsupported_court_attribution' && error?.expose === true,
  )
  await new Promise((resolve) => mockServer.close(resolve))
  delete process.env.OPENAI_COMPATIBLE_API_KEY

  process.stdout.write('Whole-library chat model gate, skill protocol, corpus scope, alias expansion, evidence retrieval, and citation uniqueness checks passed.\n')
} finally {
  await rm(cacheDir, { recursive: true, force: true })
}
