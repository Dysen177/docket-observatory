import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const cacheDir = await mkdtemp(path.join(os.tmpdir(), 'docket-research-history-check-'))
process.env.GUO_INTEL_CACHE_DIR = cacheDir

try {
  const history = await import(`../server/research-chat-history.js?history-check=${Date.now()}`)
  const conversationId = randomUUID()
  const turnId = randomUUID()
  const fixtureSecret = ['sk', 'fixture', 'secret', '123456789012'].join('-')
  const userMessage = {
    id: randomUUID(),
    role: 'user',
    content: `请检查 PACER 文件。api key: ${fixtureSecret} 路径 /Users/example/private/file.pdf`,
  }
  const assistantMessage = {
    id: randomUUID(),
    role: 'assistant',
    content: '回答正文 [D1]',
    response: {
      answer: '回答正文 [D1]',
      confidenceNote: '需要核对原始文件。',
      reviewNote: '研究辅助。',
      provider: 'openai_compatible',
      providerLabel: 'Compatible provider',
      model: 'fixture-model',
      answerLanguage: 'zh',
      citations: [{
        id: 'D1', kind: 'document', title: 'Fixture filing', subtitle: 'Doc. 1', date: '2026-08-20', timestamp: null, pageNumber: 3,
        sourceUrl: 'https://example.com/filing.pdf', sourceLabel: 'Official court', excerpt: 'Fixture excerpt', excerpts: [], contextBefore: [], contextAfter: [], evidenceClass: 'Court filing',
      }],
      retrievedCitationCount: 4,
      context: { storedMessageCount: 18, sentMessageCount: 6, omittedMessageCount: 12, sentCharacters: 18000, configuredCharacterBudget: 20000 },
    },
  }

  const [first, duplicate] = await Promise.all([
    history.recordResearchConversationTurn({ conversationId, turnId, userMessage, assistantMessage }),
    history.recordResearchConversationTurn({ conversationId, turnId, userMessage, assistantMessage }),
  ])
  assert.equal(first.conversation.messageCount, 2)
  assert.equal(first.response.answer, '回答正文 [D1]')
  assert.equal(duplicate.conversation.messageCount, 2, 'Concurrent retries of the same turn must not duplicate messages.')

  let conversations = await history.listResearchConversations()
  assert.equal(conversations.length, 1)
  assert.match(conversations[0].title, /PACER/u)
  let conversation = await history.getResearchConversation(conversationId)
  assert.equal(conversation.messages.length, 2)
  assert.equal(conversation.messages[0].content.includes(fixtureSecret), false)
  assert.doesNotMatch(conversation.messages[0].content, /\/Users\/example/u)

  const renamed = await history.renameResearchConversation(conversationId, '刑事主案研究')
  assert.equal(renamed.title, '刑事主案研究')
  await assert.rejects(() => history.getResearchConversation('../invalid'), (error) => error?.statusCode === 400)

  const reloaded = await import(`../server/research-chat-history.js?history-reload=${Date.now()}`)
  conversation = await reloaded.getResearchConversation(conversationId)
  assert.equal(conversation.title, '刑事主案研究')
  assert.equal(conversation.messages.length, 2)
  const historyFile = path.join(cacheDir, 'research-chat-history.json')
  const rawHistory = await readFile(historyFile, 'utf8')
  assert.equal(rawHistory.includes(fixtureSecret), false)
  assert.doesNotMatch(rawHistory, /\/Users\/example/u)
  if (process.platform !== 'win32') {
    const fileMode = (await stat(historyFile)).mode & 0o777
    const directoryMode = (await stat(cacheDir)).mode & 0o777
    assert.equal(fileMode, 0o600)
    assert.equal(directoryMode, 0o700)
  }

  await reloaded.deleteResearchConversation(conversationId)
  conversations = await reloaded.listResearchConversations()
  assert.equal(conversations.length, 0)
  process.stdout.write('Local research-chat history persistence, restart recovery, retry deduplication, rename/delete, permissions, and secret redaction checks passed.\n')
} finally {
  await rm(cacheDir, { recursive: true, force: true })
}
