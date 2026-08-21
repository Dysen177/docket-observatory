import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  CircleStop,
  Clock3,
  Copy,
  FileText,
  HardDrive,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'

type Language = 'zh' | 'en'
type ResearchStatus = {
  ready: boolean
  offlineArchiveReady?: boolean
  offlineSearchReady?: boolean
  provider: string
  providerLabel: string
  model: string | null
  reason: string
  message: string
}
type ResearchCitation = {
  id: string
  kind: 'document' | 'transcript' | 'case_event' | 'case' | 'entity' | 'policy' | 'program_scope' | 'official_status' | 'archive_reference'
  title: string
  subtitle: string
  date: string | null
  timestamp: number | null
  pageNumber: number | null
  sourceUrl: string | null
  sourceLabel: string
  excerpt: string
  excerpts?: { text: string; pageNumber: number | null }[]
  contextBefore?: { text: string }[]
  contextAfter?: { text: string }[]
  evidenceClass: string
}
type ResearchResponse = {
  mode?: 'conversation' | 'research'
  answer?: string
  confidenceNote: string
  reviewNote: string
  provider: string
  providerLabel: string
  model: string | null
  answerLanguage?: Language
  citations: ResearchCitation[]
  retrievedCitationCount: number
  context?: {
    storedMessageCount: number
    sentMessageCount: number
    omittedMessageCount: number
    sentCharacters: number
    configuredCharacterBudget: number
  }
}
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
  response?: ResearchResponse
  error?: boolean
}
type ConversationSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessagePreview: string
}
type ConversationDetail = ConversationSummary & { messages: Message[] }
type ConversationGroup = { id: string; label: string; conversations: ConversationSummary[] }

export default function ResearchChatWorkspace({ language }: { language: Language }) {
  const text = chatText(language)
  const [status, setStatus] = useState<ResearchStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [historyLoading, setHistoryLoading] = useState(true)
  const [conversationLoading, setConversationLoading] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const nextScrollBehaviorRef = useRef<ScrollBehavior>('auto')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const requestControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setStatusLoading(true)
    apiFetch(`/api/research-chat/status?lang=${language}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`API ${response.status}`)
        return response.json() as Promise<ResearchStatus>
      })
      .then(setStatus)
      .catch((fetchError) => {
        if (!controller.signal.aborted) setError(String(fetchError instanceof Error ? fetchError.message : fetchError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setStatusLoading(false)
      })
    return () => controller.abort()
  }, [language])

  useEffect(() => {
    const controller = new AbortController()
    setHistoryLoading(true)
    apiFetch('/api/research-conversations', { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as { conversations?: ConversationSummary[]; error?: string }
        if (!response.ok) throw new Error(body.error || `API ${response.status}`)
        setConversations(body.conversations ?? [])
      })
      .catch((fetchError) => {
        if (!controller.signal.aborted) setError(String(fetchError instanceof Error ? fetchError.message : fetchError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false)
      })
    return () => controller.abort()
  }, [])

  useLayoutEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: nextScrollBehaviorRef.current })
    nextScrollBehaviorRef.current = 'smooth'
  }, [messages, loading])

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  function newConversation() {
    if (loading || conversationLoading) return
    setActiveConversationId(null)
    setMessages([])
    setInput('')
    setError('')
    setRenamingId(null)
    setDeleteConfirmId(null)
  }

  async function selectConversation(conversationId: string) {
    if (loading || conversationLoading || conversationId === activeConversationId) return
    setConversationLoading(true)
    setError('')
    try {
      const response = await apiFetch(`/api/research-conversations/${encodeURIComponent(conversationId)}`)
      const body = await response.json().catch(() => ({})) as { conversation?: ConversationDetail; error?: string }
      if (!response.ok || !body.conversation) throw new Error(body.error || `API ${response.status}`)
      nextScrollBehaviorRef.current = 'auto'
      setActiveConversationId(body.conversation.id)
      setMessages(body.conversation.messages)
      setRenamingId(null)
      setDeleteConfirmId(null)
    } catch (requestError) {
      setError(String(requestError instanceof Error ? requestError.message : requestError))
    } finally {
      setConversationLoading(false)
    }
  }

  async function submit(question = input) {
    const content = question.trim()
    if (!content || loading || conversationLoading) return
    if (!(status?.ready || status?.offlineArchiveReady)) {
      setInput(content)
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }
    const conversationId = activeConversationId ?? crypto.randomUUID()
    const turnId = crypto.randomUUID()
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date().toISOString() }
    const controller = new AbortController()
    requestControllerRef.current = controller
    setMessages((current) => [...current, userMessage])
    setInput('')
    setError('')
    setLoading(true)
    try {
      const response = await apiFetch(`/api/research-chat?lang=${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, turnId, message: userMessage }),
        signal: controller.signal,
      })
      const body = await response.json().catch(() => ({})) as ResearchResponse & { error?: string; conversation?: ConversationSummary }
      if (!response.ok) throw new Error(body.error || `API ${response.status}`)
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: body.answer ?? '',
        createdAt: new Date().toISOString(),
        response: body,
      }
      setMessages((current) => [...current, assistantMessage])
      setActiveConversationId(conversationId)
      if (body.conversation) upsertConversation(body.conversation)
    } catch (requestError) {
      setMessages((current) => current.filter((message) => message.id !== userMessage.id))
      setInput(content)
      if (controller.signal.aborted) setError(text.generationStopped)
      else {
        const message = String(requestError instanceof Error ? requestError.message : requestError)
        setError(`${text.chatError}: ${message}`)
      }
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null
      setLoading(false)
    }
  }

  function stopGeneration() {
    requestControllerRef.current?.abort()
  }

  function upsertConversation(conversation: ConversationSummary) {
    setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)))
  }

  function startRename(conversation: ConversationSummary) {
    setRenamingId(conversation.id)
    setRenameValue(conversation.title)
    setDeleteConfirmId(null)
  }

  async function renameConversation(conversationId: string) {
    const title = renameValue.trim()
    if (!title) return
    try {
      const response = await apiFetch(`/api/research-conversations/${encodeURIComponent(conversationId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      const body = await response.json().catch(() => ({})) as { conversation?: ConversationSummary; error?: string }
      if (!response.ok || !body.conversation) throw new Error(body.error || `API ${response.status}`)
      upsertConversation(body.conversation)
      setRenamingId(null)
    } catch (requestError) {
      setError(String(requestError instanceof Error ? requestError.message : requestError))
    }
  }

  async function deleteConversation(conversationId: string) {
    try {
      const response = await apiFetch(`/api/research-conversations/${encodeURIComponent(conversationId)}`, { method: 'DELETE' })
      const body = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(body.error || `API ${response.status}`)
      setConversations((current) => current.filter((item) => item.id !== conversationId))
      setDeleteConfirmId(null)
      if (activeConversationId === conversationId) newConversation()
    } catch (requestError) {
      setError(String(requestError instanceof Error ? requestError.message : requestError))
    }
  }

  const normalizedSearch = historySearch.trim().toLocaleLowerCase(language === 'zh' ? 'zh-CN' : 'en-US')
  const filteredConversations = normalizedSearch
    ? conversations.filter((conversation) => `${conversation.title} ${conversation.lastMessagePreview}`.toLocaleLowerCase(language === 'zh' ? 'zh-CN' : 'en-US').includes(normalizedSearch))
    : conversations
  const conversationGroups = groupConversations(filteredConversations, language)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)
  const canSubmit = Boolean(status?.ready || status?.offlineArchiveReady)

  return (
    <section className="research-chat-shell">
      <aside className="research-chat-history" aria-label={text.history}>
        <header>
          <div><Clock3 size={15} /><strong>{text.history}</strong></div>
          <button type="button" onClick={newConversation} disabled={loading || conversationLoading} title={text.newChat} aria-label={text.newChat}><Plus size={16} /></button>
        </header>
        <label className="research-history-search">
          <Search size={14} />
          <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder={text.searchHistory} aria-label={text.searchHistory} />
          {historySearch && <button type="button" onClick={() => setHistorySearch('')} title={text.clearSearch} aria-label={text.clearSearch}><X size={13} /></button>}
        </label>
        <div className="research-history-list">
          {historyLoading && <div className="research-history-state"><Loader2 className="spin" size={15} />{text.loadingHistory}</div>}
          {!historyLoading && conversationGroups.length === 0 && <div className="research-history-state">{normalizedSearch ? text.noHistoryMatch : text.noHistory}</div>}
          {!historyLoading && conversationGroups.map((group) => <section key={group.id}>
            <h4>{group.label}</h4>
            {group.conversations.map((conversation) => <div className={`research-history-row ${activeConversationId === conversation.id ? 'active' : ''}`} key={conversation.id}>
              {renamingId === conversation.id ? <form className="research-history-rename" onSubmit={(event) => { event.preventDefault(); void renameConversation(conversation.id) }}>
                <input autoFocus value={renameValue} maxLength={100} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => {
                  if (event.key === 'Escape') setRenamingId(null)
                }} aria-label={text.renameConversation} />
                <button type="submit" disabled={!renameValue.trim()} title={text.saveRename} aria-label={text.saveRename}><Check size={13} /></button>
                <button type="button" onClick={() => setRenamingId(null)} title={text.cancel} aria-label={text.cancel}><X size={13} /></button>
              </form> : deleteConfirmId === conversation.id ? <div className="research-history-confirm">
                <span>{text.confirmDelete}</span>
                <button type="button" onClick={() => void deleteConversation(conversation.id)} title={text.deleteConversation} aria-label={text.deleteConversation}><Check size={13} /></button>
                <button type="button" onClick={() => setDeleteConfirmId(null)} title={text.cancel} aria-label={text.cancel}><X size={13} /></button>
              </div> : <>
                <button type="button" className="research-history-select" onClick={() => void selectConversation(conversation.id)} disabled={loading || conversationLoading}>
                  <strong>{conversation.title}</strong>
                  <small>{formatConversationTime(conversation.updatedAt, language)}</small>
                </button>
                <div className="research-history-actions">
                  <button type="button" onClick={() => startRename(conversation)} title={text.renameConversation} aria-label={text.renameConversation}><Pencil size={12} /></button>
                  <button type="button" onClick={() => { setDeleteConfirmId(conversation.id); setRenamingId(null) }} title={text.deleteConversation} aria-label={text.deleteConversation}><Trash2 size={12} /></button>
                </div>
              </>}
            </div>)}
          </section>)}
        </div>
        <footer><HardDrive size={13} /><span>{text.localHistory}</span></footer>
      </aside>

      <div className="research-chat-main">
        <header className="research-chat-commandbar">
          <div className="research-chat-session">
            <strong>{activeConversation?.title || text.newChat}</strong>
          </div>
          {!statusLoading && !status?.ready && <a className="research-model-chip blocked" href="#settings-ai" title={status?.offlineArchiveReady ? text.offlineArchiveCopy : (status?.message ?? text.statusUnavailable)}><Settings2 size={13} />{status?.offlineArchiveReady ? text.offlineArchiveMode : text.modelRequired}</a>}
        </header>
        {error && <div className="research-chat-error" role="status"><span>{error}</span><button type="button" onClick={() => setError('')} title={text.dismiss} aria-label={text.dismiss}><X size={13} /></button></div>}
        <div className="research-chat-thread" ref={threadRef}>
          {conversationLoading ? <div className="research-chat-empty research-conversation-loading"><Loader2 className="spin" size={19} /><p>{text.loadingConversation}</p></div>
            : messages.length === 0 ? <div className="research-chat-empty">
              <h4>{text.emptyTitle}</h4><p>{text.emptyCopy}</p>
            </div> : messages.map((message) => message.role === 'user'
              ? <div className="research-chat-message user" key={message.id}><p>{message.content}</p></div>
              : <AssistantMessage message={message} language={language} key={message.id} />)}
          {loading && <div className="research-chat-message assistant loading" role="status" aria-label={text.thinking}><div className="research-assistant-bubble research-typing-bubble"><span className="research-thinking-dots" aria-hidden="true"><i /><i /><i /></span></div></div>}
        </div>
        <div className="research-composer-zone">
          {!statusLoading && !status?.ready && <div className="research-config-notice"><ShieldCheck size={14} /><span><strong>{status?.offlineArchiveReady ? text.offlineArchiveMode : text.modelRequired}</strong><small>{status?.offlineArchiveReady ? text.offlineArchiveCopy : (status?.message ?? text.statusUnavailable)}</small></span><a href="#settings-ai"><Settings2 size={13} />{text.openSettings}</a></div>}
          <form className="research-chat-composer" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <textarea ref={inputRef} value={input} maxLength={20000} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void submit()
              }
            }} placeholder={status?.ready ? text.placeholder : status?.offlineArchiveReady ? text.offlineArchivePlaceholder : text.disabledPlaceholder} rows={2} disabled={conversationLoading} />
            {loading ? <button className="stop" type="button" onClick={stopGeneration} aria-label={text.stopGeneration} title={text.stopGeneration}><CircleStop size={18} /></button>
              : <button type="submit" disabled={!input.trim() || conversationLoading || !canSubmit} aria-label={text.send} title={text.send}><Send size={17} /></button>}
            <small className="research-composer-hint">{text.composerNote}</small>
          </form>
        </div>
      </div>
    </section>
  )
}

function AssistantMessage({ message, language }: { message: Message; language: Language }) {
  const text = chatText(language)
  const response = message.response
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [copied, setCopied] = useState('')

  async function copyText(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(id)
      window.setTimeout(() => setCopied((current) => current === id ? '' : current), 1400)
    } catch {
      setCopied('')
    }
  }

  return <div className={`research-chat-message assistant ${message.error ? 'error' : ''}`} data-mode={response?.mode ?? 'research'}>
    <div className="research-assistant-bubble">
      <div className="research-answer-copy"><AnswerText text={message.content} citations={response?.citations ?? []} /></div>
      <div className="research-answer-actions"><button type="button" onClick={() => void copyText(message.content, 'answer')} title={text.copyAnswer} aria-label={text.copyAnswer}>{copied === 'answer' ? <Check size={13} /> : <Copy size={13} />}</button></div>
      {response?.citations?.length ? <div className={`research-citations ${sourcesOpen ? 'open' : ''}`}>
        <button className="research-citations-toggle" type="button" onClick={() => setSourcesOpen((current) => !current)} aria-expanded={sourcesOpen}><BookOpenCheck size={14} /><span>{text.sources}</span><b>{response.citations.length}</b><ChevronDown size={14} /></button>
        {sourcesOpen && <div className="research-citation-list">{response.confidenceNote && <p className="research-confidence">{response.confidenceNote}</p>}{response.citations.map((citation) => <article data-kind={citation.kind} key={`${message.id}-${citation.id}`}>
          <button type="button" onClick={() => setExpanded((current) => current === citation.id ? null : citation.id)}>
            <b>[{citation.id}]</b><span><time>{citationKindLabel(citation.kind, language)} · {citation.date ?? text.undated}{citation.pageNumber ? ` · p. ${citation.pageNumber}` : ''}{citation.timestamp !== null ? ` · ${formatTimestamp(citation.timestamp)}` : ''}</time><strong>{citation.title}</strong><small>{citation.evidenceClass}</small></span><ChevronDown size={15} />
          </button>
          {expanded === citation.id && <div className="research-citation-body">
            {citation.subtitle && <p className="research-citation-subtitle">{citation.subtitle}</p>}
            {citation.contextBefore?.map((item, index) => <p className="context" key={`before-${index}`}>{item.text}</p>)}
            <p className="quote">{citation.excerpt}</p>
            {citation.excerpts?.slice(1).map((item, index) => <p className="context" key={`extra-${index}`}>{item.text}</p>)}
            {citation.contextAfter?.map((item, index) => <p className="context" key={`after-${index}`}>{item.text}</p>)}
            <div className="research-citation-actions">
              <button type="button" onClick={() => void copyText(citation.excerpt, citation.id)}>{copied === citation.id ? <Check size={12} /> : <Copy size={12} />}{text.copyExcerpt}</button>
              {citation.sourceUrl && <a href={safeExternalUrl(citation.sourceUrl)} target="_blank" rel="noreferrer"><FileText size={13} />{text.openSource}<ArrowUpRight size={11} /></a>}
            </div>
          </div>}
        </article>)}</div>}
      </div> : null}
      {response?.context && response.context.omittedMessageCount > 0 && <p className="research-context-note">{text.contextLimited(response.context.sentMessageCount, response.context.storedMessageCount)}</p>}
    </div>
  </div>
}

function AnswerText({ text, citations }: { text: string; citations: ResearchCitation[] }) {
  const valid = new Set(citations.map((citation) => citation.id))
  const lines = text.replace(/\r/gu, '').split('\n')
  const blocks: ReactNode[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) {
      index += 1
      continue
    }
    const heading = line.match(/^#{1,4}\s+(.+)$/u)
    if (heading) {
      blocks.push(<h4 key={`heading-${index}`}>{renderInline(heading[1], valid)}</h4>)
      index += 1
      continue
    }
    if (/^[-*]\s+/u.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^[-*]\s+/u.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/u, ''))
        index += 1
      }
      blocks.push(<ul key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, valid)}</li>)}</ul>)
      continue
    }
    if (/^\d+[.)]\s+/u.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+[.)]\s+/u.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/u, ''))
        index += 1
      }
      blocks.push(<ol key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, valid)}</li>)}</ol>)
      continue
    }
    const paragraph = [line]
    index += 1
    while (index < lines.length && lines[index].trim() && !/^(?:#{1,4}\s+|[-*]\s+|\d+[.)]\s+)/u.test(lines[index].trim())) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderInline(paragraph.join(' '), valid)}</p>)
  }
  return <div className="research-answer-body">{blocks}</div>
}

function renderInline(value: string, validCitations: Set<string>) {
  return value.split(/(\[(?:D|T|S)\d{1,2}\]|\*\*[^*\n]+\*\*)/gu).map((part, index) => {
    if (validCitations.has(part.slice(1, -1))) return <b className="research-inline-cite" key={`${part}-${index}`}>{part}</b>
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function citationKindLabel(kind: ResearchCitation['kind'], language: Language) {
  const labels = language === 'zh' ? {
    document: '法院文件', transcript: '公开言论', case_event: '案卷记录', case: '案件档案', entity: '实体档案', policy: '政策资料', program_scope: '资料范围', official_status: '官方状态', archive_reference: '外部档案',
  } : {
    document: 'Court filing', transcript: 'Public statement', case_event: 'Docket event', case: 'Case profile', entity: 'Entity profile', policy: 'Policy record', program_scope: 'Library scope', official_status: 'Official status', archive_reference: 'External archive',
  }
  return labels[kind]
}

function groupConversations(conversations: ConversationSummary[], language: Language): ConversationGroup[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86400000
  const groups = new Map<string, ConversationGroup>([
    ['today', { id: 'today', label: language === 'zh' ? '今天' : 'Today', conversations: [] }],
    ['yesterday', { id: 'yesterday', label: language === 'zh' ? '昨天' : 'Yesterday', conversations: [] }],
    ['earlier', { id: 'earlier', label: language === 'zh' ? '更早' : 'Earlier', conversations: [] }],
  ])
  for (const conversation of conversations) {
    const timestamp = new Date(conversation.updatedAt).getTime()
    const groupId = timestamp >= startOfToday ? 'today' : timestamp >= startOfYesterday ? 'yesterday' : 'earlier'
    groups.get(groupId)?.conversations.push(conversation)
  }
  return [...groups.values()].filter((group) => group.conversations.length)
}

function formatConversationTime(value: string, language: Language) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const today = new Date()
  const sameDay = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function chatText(language: Language) {
  return language === 'zh' ? {
    title: '全库研究', subtitle: '无模型时检索全部本地资料，接入模型后增加整合、推理和对话', history: '研究记录', newChat: '新建研究', searchHistory: '搜索记录', clearSearch: '清除搜索', loadingHistory: '正在读取本地记录', loadingConversation: '正在打开研究', noHistory: '暂无记录', noHistoryMatch: '没有匹配的记录', renameConversation: '重命名记录', deleteConversation: '删除记录', confirmDelete: '确认删除？', saveRename: '保存名称', cancel: '取消', localHistory: '研究记录保存在这台电脑', checkingModel: '检查模型', checkingModelCopy: '检查本地 Ollama 或已配置的云端模型。', modelReady: 'AI 综合模式', modelReadyCopy: '模型已连接，可对检索证据进行整合与推理。', modelRequired: '模型未配置', offlineArchiveMode: '本地检索模式', offlineArchiveCopy: '可搜索法院文件、案卷信息、直播文字、名词档案和关联资料；整合、推理和普通对话需接入模型。', statusUnavailable: '暂无可用模型。', openSettings: '前往设置', eyebrow: '全库检索与研究', newResearch: '新研究', sessionScope: '资料研究', localEvidence: '本地资料', officialUpdates: '自动更新', sourceModeDetail: '研究问题会使用本地资料库。', readyToResearch: '全库研究', emptyTitle: '想查什么？', emptyCopy: '可搜索案卷、文件号、直播原文、人物、公司、名词和政策资料。', researchScope: '资料范围', scopeCourt: '法院案卷', scopeBroadcast: '直播全文', scopeEntity: '实体关系', scopeAnalysis: '法律解读', tryQuery: '试着查找', you: '你', retrieving: '正在研究', retrievingCopy: '正在检索或生成回答。', thinking: '正在处理', elapsed: (value: string) => `${value}`, placeholder: '输入问题或检索内容', offlineArchivePlaceholder: '搜索案件、文件、直播文字或名词', disabledPlaceholder: '输入检索内容', send: '发送', stopGeneration: '停止处理', generationStopped: '已停止处理，内容已恢复到输入框。', composerStorage: '本地保存', composerNote: 'Enter 发送 · Shift + Enter 换行', chatError: '处理失败', answer: '结果', copyAnswer: '复制结果', dismiss: '关闭提示', sources: '来源', sourceEvidenceNote: '展开查看来源', copyExcerpt: '复制摘录', undated: '无日期', openSource: '打开原始来源', contextLimited: (sent: number, stored: number) => `本轮使用最近 ${sent} / ${stored} 条记录；完整历史仍保存在本机。`,
  } : {
    title: 'Library Research', subtitle: 'Search the complete local library without a model; add synthesis, reasoning, and conversation when a model is connected', history: 'Research history', newChat: 'New research', searchHistory: 'Search history', clearSearch: 'Clear search', loadingHistory: 'Loading local history', loadingConversation: 'Opening research', noHistory: 'No research yet', noHistoryMatch: 'No matching research', renameConversation: 'Rename research', deleteConversation: 'Delete research', confirmDelete: 'Delete this research?', saveRename: 'Save title', cancel: 'Cancel', localHistory: 'Research history stays on this computer', checkingModel: 'Checking model', checkingModelCopy: 'Checking local Ollama or the configured cloud model.', modelReady: 'AI synthesis mode', modelReadyCopy: 'The connected model can synthesize and reason over retrieved evidence.', modelRequired: 'Model not configured', offlineArchiveMode: 'Local search mode', offlineArchiveCopy: 'Search court files, docket metadata, full transcripts, dossiers, and linked records locally. Synthesis, reasoning, and natural conversation require a model.', statusUnavailable: 'No usable model is configured.', openSettings: 'Open Settings', eyebrow: 'Library search and research', newResearch: 'New research', sessionScope: 'Library research', localEvidence: 'Local materials', officialUpdates: 'Automatic updates', sourceModeDetail: 'Research questions use the local library.', readyToResearch: 'Library Research', emptyTitle: 'What would you like to find?', emptyCopy: 'Search dockets, document numbers, transcript text, people, companies, terms, and policy records.', researchScope: 'Material scope', scopeCourt: 'Court records', scopeBroadcast: 'Full transcripts', scopeEntity: 'Entity links', scopeAnalysis: 'Legal analysis', tryQuery: 'Try searching', you: 'You', retrieving: 'Researching', retrievingCopy: 'Searching or generating a response.', thinking: 'Processing', elapsed: (value: string) => value, placeholder: 'Enter a question or search query', offlineArchivePlaceholder: 'Search cases, filings, transcripts, or terms', disabledPlaceholder: 'Enter a search query', send: 'Send', stopGeneration: 'Stop processing', generationStopped: 'Processing stopped. The query was restored to the composer.', composerStorage: 'Stored locally', composerNote: 'Enter to send · Shift + Enter for a new line', chatError: 'Request failed', answer: 'Result', copyAnswer: 'Copy result', dismiss: 'Dismiss', sources: 'Sources', sourceEvidenceNote: 'Expand to inspect sources', copyExcerpt: 'Copy excerpt', undated: 'Undated', openSource: 'Open original source', contextLimited: (sent: number, stored: number) => `This turn used the latest ${sent} of ${stored} records; the complete history remains on this computer.`,
  }
}

function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('X-Docket-Observatory-Request', '1')
  return fetch(input, { ...init, headers, cache: 'no-store' })
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : '#'
  } catch {
    return '#'
  }
}

function formatTimestamp(value: number) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}
