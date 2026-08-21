import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { atomicWriteJson } from './atomic-write.js'

const cacheRoot = path.resolve(process.env.GUO_INTEL_CACHE_DIR ?? path.join(process.cwd(), 'server', 'cache'))
const historyPath = path.join(cacheRoot, 'research-chat-history.json')
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const maximumConversations = 120
const maximumMessagesPerConversation = 400
const maximumHistoryBytes = 64 * 1024 * 1024

let historyStore = null
let historyLoadPromise = null
let historyMutationQueue = Promise.resolve()

export async function listResearchConversations() {
  const store = await loadHistoryStore()
  return store.conversations
    .map(conversationSummary)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function getResearchConversation(id) {
  const conversationId = requiredUuid(id, 'conversation')
  const store = await loadHistoryStore()
  const conversation = store.conversations.find((item) => item.id === conversationId)
  return conversation ? structuredClone(conversation) : null
}

export async function findResearchConversationTurn(conversationId, turnId) {
  const id = requiredUuid(conversationId, 'conversation')
  const requestedTurnId = requiredUuid(turnId, 'turn')
  const store = await loadHistoryStore()
  const conversation = store.conversations.find((item) => item.id === id)
  if (!conversation) return null
  const assistantMessage = conversation.messages.find((message) => message.role === 'assistant' && message.turnId === requestedTurnId)
  if (!assistantMessage) return null
  return {
    response: restoredResearchResponse(assistantMessage),
    conversation: conversationSummary(conversation),
  }
}

export async function recordResearchConversationTurn({ conversationId, turnId, userMessage, assistantMessage }) {
  return queueHistoryMutation(async () => {
    const id = requiredUuid(conversationId, 'conversation')
    const requestedTurnId = requiredUuid(turnId, 'turn')
    const store = await loadHistoryStore()
    const existing = store.conversations.find((item) => item.id === id)
    const duplicate = existing?.messages.find((message) => message.role === 'assistant' && message.turnId === requestedTurnId)
    if (duplicate) {
      return {
        response: restoredResearchResponse(duplicate),
        conversation: conversationSummary(existing),
      }
    }

    const now = new Date().toISOString()
    const user = sanitizeMessage({ ...userMessage, role: 'user', turnId: requestedTurnId, createdAt: userMessage?.createdAt ?? now })
    const assistant = sanitizeMessage({ ...assistantMessage, role: 'assistant', turnId: requestedTurnId, createdAt: assistantMessage?.createdAt ?? now })
    if (!user?.content || !assistant?.content) throw publicError('A completed user and assistant turn is required.', 400)

    const conversation = existing ?? {
      id,
      title: conversationTitle(user.content),
      createdAt: now,
      updatedAt: now,
      messages: [],
    }
    conversation.messages = [...conversation.messages, user, assistant].slice(-maximumMessagesPerConversation)
    conversation.updatedAt = now
    if (!existing) store.conversations.push(conversation)
    store.conversations.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    store.conversations = store.conversations.slice(0, maximumConversations)
    trimStoreToByteLimit(store, id)
    await persistHistoryStore(store)
    return {
      response: restoredResearchResponse(assistant),
      conversation: conversationSummary(conversation),
    }
  })
}

export async function renameResearchConversation(id, title) {
  return queueHistoryMutation(async () => {
    const conversationId = requiredUuid(id, 'conversation')
    const normalizedTitle = cleanText(title, 100)
    if (!normalizedTitle) throw publicError('Conversation title is required.', 400)
    const store = await loadHistoryStore()
    const conversation = store.conversations.find((item) => item.id === conversationId)
    if (!conversation) throw publicError('Conversation was not found.', 404)
    conversation.title = normalizedTitle
    conversation.updatedAt = new Date().toISOString()
    store.conversations.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    await persistHistoryStore(store)
    return conversationSummary(conversation)
  })
}

export async function deleteResearchConversation(id) {
  return queueHistoryMutation(async () => {
    const conversationId = requiredUuid(id, 'conversation')
    const store = await loadHistoryStore()
    const index = store.conversations.findIndex((item) => item.id === conversationId)
    if (index < 0) throw publicError('Conversation was not found.', 404)
    store.conversations.splice(index, 1)
    await persistHistoryStore(store)
    return { deleted: true, id: conversationId }
  })
}

async function loadHistoryStore() {
  if (historyStore) return historyStore
  if (!historyLoadPromise) historyLoadPromise = readHistoryStore()
  historyStore = await historyLoadPromise
  return historyStore
}

async function readHistoryStore() {
  try {
    const value = JSON.parse(await readFile(historyPath, 'utf8'))
    return sanitizeStore(value)
  } catch (error) {
    if (error?.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error
    return { version: 1, conversations: [] }
  }
}

function sanitizeStore(value) {
  const conversations = Array.isArray(value?.conversations)
    ? value.conversations.map(sanitizeConversation).filter(Boolean)
    : []
  conversations.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  return { version: 1, conversations: conversations.slice(0, maximumConversations) }
}

function sanitizeConversation(value) {
  if (!uuidPattern.test(String(value?.id ?? ''))) return null
  const createdAt = safeIsoDate(value?.createdAt)
  const updatedAt = safeIsoDate(value?.updatedAt, createdAt)
  const messages = Array.isArray(value?.messages)
    ? value.messages.map(sanitizeMessage).filter(Boolean).slice(-maximumMessagesPerConversation)
    : []
  if (!messages.length) return null
  return {
    id: String(value.id),
    title: cleanText(value.title, 100) || conversationTitle(messages.find((message) => message.role === 'user')?.content),
    createdAt,
    updatedAt,
    messages,
  }
}

function sanitizeMessage(value) {
  const role = value?.role === 'assistant' ? 'assistant' : value?.role === 'user' ? 'user' : null
  if (!role) return null
  const content = redactSecrets(cleanText(value?.content, role === 'assistant' ? 60000 : 20000))
  if (!content) return null
  return {
    id: uuidPattern.test(String(value?.id ?? '')) ? String(value.id) : randomUUID(),
    role,
    content,
    createdAt: safeIsoDate(value?.createdAt),
    turnId: uuidPattern.test(String(value?.turnId ?? '')) ? String(value.turnId) : null,
    ...(role === 'assistant' && value?.response ? { response: sanitizeResearchResponse(value.response) } : {}),
  }
}

function sanitizeResearchResponse(value) {
  return {
    mode: value?.mode === 'conversation' ? 'conversation' : 'research',
    confidenceNote: redactSecrets(cleanText(value?.confidenceNote, 4000)),
    reviewNote: cleanText(value?.reviewNote, 2000),
    provider: cleanIdentifier(value?.provider, 60),
    providerLabel: cleanText(value?.providerLabel, 100),
    model: cleanText(value?.model, 160) || null,
    answerLanguage: value?.answerLanguage === 'en' ? 'en' : 'zh',
    citations: Array.isArray(value?.citations) ? value.citations.slice(0, 24).map(sanitizeCitation).filter(Boolean) : [],
    retrievedCitationCount: boundedNumber(value?.retrievedCitationCount, 0, 1000),
    context: sanitizeContextMetadata(value?.context),
  }
}

function sanitizeCitation(value) {
  const id = String(value?.id ?? '')
  if (!/^(?:D|T|S)\d{1,2}$/u.test(id)) return null
  return {
    id,
    kind: cleanIdentifier(value?.kind, 40),
    title: cleanText(value?.title, 600),
    subtitle: cleanText(value?.subtitle, 1000),
    date: /^\d{4}-\d{2}-\d{2}$/u.test(String(value?.date ?? '')) ? String(value.date) : null,
    timestamp: value?.timestamp === null ? null : boundedNumber(value?.timestamp, 0, 86400),
    pageNumber: value?.pageNumber === null ? null : boundedNumber(value?.pageNumber, 1, 100000),
    sourceUrl: safePublicUrl(value?.sourceUrl),
    sourceLabel: cleanText(value?.sourceLabel, 300),
    excerpt: redactSecrets(cleanText(value?.excerpt, 5000)),
    excerpts: sanitizeTextItems(value?.excerpts, 3, true),
    contextBefore: sanitizeTextItems(value?.contextBefore, 2),
    contextAfter: sanitizeTextItems(value?.contextAfter, 2),
    evidenceClass: cleanText(value?.evidenceClass, 400),
  }
}

function sanitizeTextItems(value, limit, includePage = false) {
  if (!Array.isArray(value)) return []
  return value.slice(0, limit).map((item) => ({
    text: redactSecrets(cleanText(item?.text, 1600)),
    ...(includePage ? { pageNumber: item?.pageNumber === null ? null : boundedNumber(item?.pageNumber, 1, 100000) } : {}),
  })).filter((item) => item.text)
}

function sanitizeContextMetadata(value) {
  return {
    storedMessageCount: boundedNumber(value?.storedMessageCount, 0, maximumMessagesPerConversation),
    sentMessageCount: boundedNumber(value?.sentMessageCount, 0, maximumMessagesPerConversation),
    omittedMessageCount: boundedNumber(value?.omittedMessageCount, 0, maximumMessagesPerConversation),
    sentCharacters: boundedNumber(value?.sentCharacters, 0, 2000000),
    configuredCharacterBudget: boundedNumber(value?.configuredCharacterBudget, 20000, 1500000),
  }
}

function restoredResearchResponse(message) {
  return {
    answer: message.content,
    ...(message.response ?? sanitizeResearchResponse({})),
  }
}

function conversationSummary(conversation) {
  const lastMessage = conversation.messages.at(-1)
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages.length,
    lastMessagePreview: cleanText(lastMessage?.content, 160),
  }
}

function conversationTitle(value) {
  const text = cleanText(value, 100)
  if (!text) return 'New conversation'
  return text.length > 52 ? `${text.slice(0, 51).trimEnd()}…` : text
}

function trimStoreToByteLimit(store, preservedConversationId) {
  while (Buffer.byteLength(JSON.stringify(store), 'utf8') > maximumHistoryBytes && store.conversations.length > 1) {
    const removableIndex = store.conversations.findLastIndex((item) => item.id !== preservedConversationId)
    if (removableIndex < 0) break
    store.conversations.splice(removableIndex, 1)
  }
  const preserved = store.conversations.find((item) => item.id === preservedConversationId)
  while (preserved?.messages.length > 2 && Buffer.byteLength(JSON.stringify(store), 'utf8') > maximumHistoryBytes) {
    preserved.messages.splice(0, 2)
  }
}

async function persistHistoryStore(store) {
  await atomicWriteJson(historyPath, store, { mode: 0o600, directoryMode: 0o700 })
}

function queueHistoryMutation(operation) {
  const result = historyMutationQueue.catch(() => undefined).then(operation)
  historyMutationQueue = result.catch(() => undefined)
  return result
}

function requiredUuid(value, label) {
  const id = String(value ?? '')
  if (!uuidPattern.test(id)) throw publicError(`Invalid ${label} ID.`, 400)
  return id
}

function cleanText(value, limit) {
  return String(value ?? '').replace(/[\0\r]/gu, '').replace(/[\t ]+/gu, ' ').replace(/\n{4,}/gu, '\n\n\n').trim().slice(0, limit)
}

function cleanIdentifier(value, limit) {
  return String(value ?? '').replace(/[^a-z0-9_.:-]/giu, '').slice(0, limit)
}

function redactSecrets(value) {
  return String(value ?? '')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/giu, 'Bearer [redacted]')
    .replace(/\b(?:sk|rk|pk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{10,}\b/giu, '[redacted credential]')
    .replace(/\b((?:api[-_\s]?key|password|access[-_\s]?token|client[-_\s]?secret)\s*[:=]\s*)[^\s,;]+/giu, '$1[redacted]')
    .replace(/(?:\/Users\/|\/home\/)[^\s"'<>]+/gu, '[local path]')
    .replace(/[A-Za-z]:\\(?:Users|Documents and Settings)\\[^\s"'<>]+/giu, '[local path]')
}

function safeIsoDate(value, fallback = new Date(0).toISOString()) {
  const date = new Date(String(value ?? ''))
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback
}

function boundedNumber(value, minimum, maximum) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : minimum
}

function safePublicUrl(value) {
  try {
    const url = new URL(String(value ?? ''))
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function publicError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}
