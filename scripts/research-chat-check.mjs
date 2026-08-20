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
  const { answerResearchChat, detectResearchChatAnswerLanguage, researchChatStatus, researchTokens, retrieveResearchChatEvidence, selectResearchChatContext } = await import('../server/research-chat.js')
  const { createSeedState } = await import('../server/seed.js')
  const status = await researchChatStatus('zh', { probeLocal: false })
  assert.equal(status.ready, false)
  assert.equal(status.provider, 'local')
  assert.equal(status.model, null)
  assert.equal(status.reason, 'provider_not_selected')
  assert.deepEqual(researchTokens('刑事主案目前的程序进展是什么？'), ['刑事主案', '刑事'])
  assert.deepEqual(researchTokens('What is the current procedural status of the criminal main case?'), ['criminal', 'main'])
  assert.equal(detectResearchChatAnswerLanguage([{ role: 'user', content: 'PACER、API 和 GTV 在程序里怎么使用？' }], 'en'), 'zh')
  assert.equal(detectResearchChatAnswerLanguage([{ role: 'user', content: 'PACER API GTV 怎么用？' }], 'en'), 'zh')
  assert.equal(detectResearchChatAnswerLanguage([{ role: 'user', content: 'What does 喜联储 mean in the court records?' }], 'zh'), 'en')
  assert.equal(detectResearchChatAnswerLanguage([
    { role: 'user', content: '先用中文回答。' },
    { role: 'assistant', content: '可以。' },
    { role: 'user', content: 'Now explain the appellate posture in English.' },
  ], 'zh'), 'en')
  const longContext = selectResearchChatContext(Array.from({ length: 20 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user',
    content: `${index}:${'x'.repeat(2400)}`,
  })), 20000)
  assert.ok(longContext.metadata.omittedMessageCount > 0)
  assert.equal(longContext.messages.at(-1).role, 'assistant')
  assert.equal(longContext.messages[0].role, 'user')
  assert.equal(longContext.metadata.storedMessageCount, 20)

  await assert.rejects(
    () => answerResearchChat({
      input: { scope: 'all', messages: [{ role: 'user', content: '刑事主案进展如何？' }] },
      language: 'zh',
      manifest: { files: [] },
      state: { cases: [], events: [], entities: [], policyWatch: [] },
      dashboard: { cases: [], events: [], entities: [], policyWatch: [] },
    }),
    (error) => error?.statusCode === 409 && error?.code === 'model_required',
  )

  const state = createSeedState()
  const manifest = JSON.parse(await readFile(new URL('../downloads/court-files-complete/manifest.json', import.meta.url), 'utf8'))
  const dashboard = {
    cases: state.cases,
    events: state.events,
    entities: state.entities,
    policyWatch: state.policyWatch,
  }
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

  const transcriptScope = await retrieveResearchChatEvidence({
    messages: [{ role: 'user', content: 'What date range does the historical public-statement corpus cover?' }],
    language: 'en',
    manifest,
    state,
    dashboard,
  })
  assert.equal(transcriptScope.citations.some((citation) => citation.kind === 'document'), false)
  assert.ok(transcriptScope.citations.some((citation) => citation.kind === 'program_scope'))

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
    const answerInChinese = String(modelInput.instructions ?? '').includes('用中文回答')
    const nonProsecutionCitation = (modelInput.evidence ?? []).find((citation) => /法院|court|第三方|third-party/iu.test(String(citation.evidenceClass ?? '')))?.id ?? citationIds[0]
    const answer = {
      answer: returnUnsupportedCourtFixture
        ? `法院记录：刑期已经确定 ${nonProsecutionCitation ? `[${nonProsecutionCitation}]` : ''}\n\n检方主张：当前资料库未检索到检方直接文件。`
        : returnMisclassifiedFixture
        ? `检方主张法院判决中的刑期 ${nonProsecutionCitation ? `[${nonProsecutionCitation}]` : ''}`
        : returnUncitedFixture
        ? 'This fixture declares a source but does not place its citation marker in the answer.'
        : answerInChinese
        ? `模拟服务已完成带引证回答 ${citationIds.map((id) => `[${id}]`).join(' ')}`
        : `Mock provider completed a citation-grounded answer ${citationIds.map((id) => `[${id}]`).join(' ')}`,
      confidenceNote: answerInChinese ? '仅用于模拟传输测试。' : 'Mock transport test only; inspect retrieved citations before relying on an answer.',
      usedCitationIds: returnMisclassifiedFixture || returnUnsupportedCourtFixture ? [nonProsecutionCitation].filter(Boolean) : citationIds,
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
