import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  CircleStop,
  Clock3,
  Copy,
  Database,
  FileText,
  HardDrive,
  Landmark,
  Loader2,
  Network,
  Pencil,
  Plus,
  Radio,
  Scale,
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
  provider: string
  providerLabel: string
  model: string | null
  reason: string
  message: string
}
type ResearchCitation = {
  id: string
  kind: 'document' | 'transcript' | 'case_event' | 'case' | 'entity' | 'policy' | 'program_scope'
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  useEffect(() => {
    if (!loading) return undefined
    setElapsedSeconds(0)
    const startedAt = Date.now()
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [loading])

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
    if (!status?.ready) {
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

  function fillSuggestion(suggestion: string) {
    if (status?.ready) {
      void submit(suggestion)
      return
    }
    setInput(suggestion)
    requestAnimationFrame(() => inputRef.current?.focus())
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

  const suggestions = language === 'zh'
    ? ['刑事主案目前的程序进展是什么？', '哪些法院文件与喜联储相关？', '公开陈述与法院文件之间有哪些需要核对的差异？']
    : ['What is the current procedural posture of the criminal case?', 'Which court documents relate to Himalaya Exchange?', 'What differences between public statements and court records require verification?']
  const normalizedSearch = historySearch.trim().toLocaleLowerCase(language === 'zh' ? 'zh-CN' : 'en-US')
  const filteredConversations = normalizedSearch
    ? conversations.filter((conversation) => `${conversation.title} ${conversation.lastMessagePreview}`.toLocaleLowerCase(language === 'zh' ? 'zh-CN' : 'en-US').includes(normalizedSearch))
    : conversations
  const conversationGroups = groupConversations(filteredConversations, language)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)

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
            <span><BookOpenCheck size={16} /></span>
            <div><strong>{activeConversation?.title || text.newResearch}</strong><small>{text.sessionScope}</small></div>
          </div>
          <div className="research-chat-runtime">
            <span className="research-source-mode" title={text.sourceModeDetail}><Database size={14} /><b>{text.localEvidence}</b><i>{text.officialUpdates}</i></span>
            {statusLoading ? <span className="research-model-chip checking"><Loader2 className="spin" size={13} />{text.checkingModel}</span>
              : status?.ready ? <span className="research-model-chip ready" title={text.modelReadyCopy}><ShieldCheck size={13} />{status.providerLabel}<i>{status.model ?? text.modelReady}</i></span>
                : <a className="research-model-chip blocked" href="#settings-ai" title={status?.message ?? text.statusUnavailable}><Settings2 size={13} />{text.modelRequired}</a>}
          </div>
        </header>
        {error && <div className="research-chat-error" role="status"><span>{error}</span><button type="button" onClick={() => setError('')} title={text.dismiss} aria-label={text.dismiss}><X size={13} /></button></div>}
        <div className="research-chat-thread">
          {conversationLoading ? <div className="research-chat-empty research-conversation-loading"><Loader2 className="spin" size={19} /><p>{text.loadingConversation}</p></div>
            : messages.length === 0 ? <div className="research-chat-empty">
              <span className="research-empty-kicker"><BookOpenCheck size={14} />{text.readyToResearch}</span>
              <h4>{text.emptyTitle}</h4><p>{text.emptyCopy}</p>
              <div className="research-scope-strip" aria-label={text.researchScope}>
                <span data-scope="court"><Landmark size={14} />{text.scopeCourt}</span>
                <span data-scope="broadcast"><Radio size={14} />{text.scopeBroadcast}</span>
                <span data-scope="entity"><Network size={14} />{text.scopeEntity}</span>
                <span data-scope="analysis"><Scale size={14} />{text.scopeAnalysis}</span>
              </div>
              <div className="research-prompt-list"><small>{text.tryQuery}</small>{suggestions.map((suggestion) => <button type="button" onClick={() => fillSuggestion(suggestion)} key={suggestion}><span>{suggestion}</span><ArrowUpRight size={14} /></button>)}</div>
            </div> : messages.map((message) => message.role === 'user'
              ? <div className="research-chat-message user" key={message.id}><span>{text.you}</span><p>{message.content}</p></div>
              : <AssistantMessage message={message} language={language} key={message.id} />)}
          {loading && <div className="research-chat-message assistant loading"><span><Loader2 className="spin" size={15} />{text.retrieving}</span><p>{text.retrievingCopy}<time>{text.elapsed(formatElapsed(elapsedSeconds))}</time></p></div>}
          <div ref={endRef} />
        </div>
        <div className="research-composer-zone">
          {!statusLoading && !status?.ready && <div className="research-config-notice"><ShieldCheck size={14} /><span><strong>{text.modelRequired}</strong><small>{status?.message ?? text.statusUnavailable}</small></span><a href="#settings-ai"><Settings2 size={13} />{text.openSettings}</a></div>}
          <form className="research-chat-composer" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <textarea ref={inputRef} value={input} maxLength={20000} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void submit()
              }
            }} placeholder={status?.ready ? text.placeholder : text.disabledPlaceholder} rows={2} disabled={conversationLoading} />
            {loading ? <button className="stop" type="button" onClick={stopGeneration} aria-label={text.stopGeneration} title={text.stopGeneration}><CircleStop size={18} /></button>
              : <button type="submit" disabled={!input.trim() || conversationLoading || !status?.ready} aria-label={text.send} title={text.send}><Send size={17} /></button>}
            <div className="research-composer-meta"><span><HardDrive size={11} />{text.composerStorage}</span><small>{text.composerNote}</small></div>
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

  return <div className={`research-chat-message assistant ${message.error ? 'error' : ''}`}>
    <div className="research-answer-head"><span><Scale size={15} />{text.answer}</span><div>{response && <i>{response.providerLabel} · {response.model}</i>}<button type="button" onClick={() => void copyText(message.content, 'answer')} title={text.copyAnswer} aria-label={text.copyAnswer}>{copied === 'answer' ? <Check size={13} /> : <Copy size={13} />}</button></div></div>
    <div className="research-answer-copy"><AnswerText text={message.content} citations={response?.citations ?? []} /></div>
    {response?.citations?.length ? <div className={`research-citations ${sourcesOpen ? 'open' : ''}`}>
      <button className="research-citations-toggle" type="button" onClick={() => setSourcesOpen((current) => !current)} aria-expanded={sourcesOpen}><span><BookOpenCheck size={14} />{text.sources}<b>{response.citations.length}</b></span><small>{text.sourceEvidenceNote}</small><ChevronDown size={15} /></button>
      {sourcesOpen && <div className="research-citation-list">{response.citations.map((citation) => <article data-kind={citation.kind} key={`${message.id}-${citation.id}`}>
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
    {response?.confidenceNote && <p className="research-confidence">{response.confidenceNote}</p>}
    {response?.context && response.context.omittedMessageCount > 0 && <p className="research-context-note">{text.contextLimited(response.context.sentMessageCount, response.context.storedMessageCount)}</p>}
    {response?.reviewNote && <p className="research-review-note">{response.reviewNote}</p>}
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
    document: '法院文件', transcript: '公开言论', case_event: '案卷记录', case: '案件档案', entity: '实体档案', policy: '政策资料', program_scope: '资料范围',
  } : {
    document: 'Court filing', transcript: 'Public statement', case_event: 'Docket event', case: 'Case profile', entity: 'Entity profile', policy: 'Policy record', program_scope: 'Library scope',
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
    title: 'AI Chat', subtitle: '默认检索全部本地资料；可直接使用中文或英文提问', history: '研究记录', newChat: '新建对话', searchHistory: '搜索记录', clearSearch: '清除搜索', loadingHistory: '正在读取本地记录', loadingConversation: '正在打开对话', noHistory: '暂无研究记录', noHistoryMatch: '没有匹配的记录', renameConversation: '重命名对话', deleteConversation: '删除对话', confirmDelete: '确认删除？', saveRename: '保存名称', cancel: '取消', localHistory: '对话记录保存在这台电脑', checkingModel: '检查模型', checkingModelCopy: '检查本地 Ollama 或已配置的云端模型。', modelReady: '模型已就绪', modelReadyCopy: '模型已连接；回答前先检索本地证据。', modelRequired: '模型未配置', statusUnavailable: '暂无可用模型。', openSettings: '前往设置', eyebrow: '全库检索 + 模型综合', newResearch: '新研究对话', sessionScope: '全资料库检索 · 证据分级回答', localEvidence: '本地证据库', officialUpdates: '受控来源更新', sourceModeDetail: 'AI Chat 不直接采信开放网页；后台只从允许列表中的来源更新，经来源标注与完整性检查后进入本地证据库，法院与政府官方资料优先。', readyToResearch: '研究工作区', emptyTitle: '从可核验资料开始提问', emptyCopy: '检索案卷、直播全文、案件时间线、人物公司和政策资料；法院认定、当事人主张与公开言论会分开呈现。', researchScope: '研究资料范围', scopeCourt: '法院案卷', scopeBroadcast: '直播全文', scopeEntity: '实体关系', scopeAnalysis: '法律解读', tryQuery: '可从这些问题开始', you: '你', retrieving: '正在检索并分析', retrievingCopy: '匹配本地证据、核对证据类型并生成带引用的回答。', elapsed: (value: string) => `已用时 ${value}`, placeholder: '输入中文或英文问题，可以继续追问', disabledPlaceholder: '可先输入问题；发送前请配置 API Key、中转站或 Ollama', send: '发送', stopGeneration: '停止生成', generationStopped: '已停止生成，问题已恢复到输入框。', composerStorage: '本地保存', composerNote: 'Enter 发送 · Shift + Enter 换行 · 研究辅助，不构成法律意见', chatError: '回答失败', answer: '研究回答', copyAnswer: '复制回答', dismiss: '关闭提示', sources: '引用证据', sourceEvidenceNote: '展开核对原文、证据类型与外部来源', copyExcerpt: '复制摘录', undated: '无日期', openSource: '打开原始来源', contextLimited: (sent: number, stored: number) => `本轮模型使用最近 ${sent} / ${stored} 条消息；完整历史仍保存在本机。`,
  } : {
    title: 'AI Chat', subtitle: 'All local materials are searched by default; ask in Chinese or English', history: 'Research history', newChat: 'New conversation', searchHistory: 'Search history', clearSearch: 'Clear search', loadingHistory: 'Loading local history', loadingConversation: 'Opening conversation', noHistory: 'No research history yet', noHistoryMatch: 'No matching records', renameConversation: 'Rename conversation', deleteConversation: 'Delete conversation', confirmDelete: 'Delete this chat?', saveRename: 'Save title', cancel: 'Cancel', localHistory: 'Conversation history stays on this computer', checkingModel: 'Checking model', checkingModelCopy: 'Checking local Ollama or the configured cloud model.', modelReady: 'Model ready', modelReadyCopy: 'Model connected; local evidence is retrieved before each answer.', modelRequired: 'Model not configured', statusUnavailable: 'No usable model is configured.', openSettings: 'Open Settings', eyebrow: 'Whole-library retrieval + model synthesis', newResearch: 'New research conversation', sessionScope: 'Whole-library retrieval · evidence-aware answers', localEvidence: 'Local evidence', officialUpdates: 'Controlled source updates', sourceModeDetail: 'AI Chat does not trust arbitrary web pages directly. Background updates use an allowlist and enter the local evidence library with source labels and integrity checks; court and government records receive priority.', readyToResearch: 'Research workspace', emptyTitle: 'Start with verifiable material', emptyCopy: 'Search dockets, full broadcast transcripts, case timelines, people, companies, and policy records while keeping judicial findings, party claims, and public statements separate.', researchScope: 'Research material scope', scopeCourt: 'Court records', scopeBroadcast: 'Full transcripts', scopeEntity: 'Entity links', scopeAnalysis: 'Legal analysis', tryQuery: 'Suggested starting points', you: 'You', retrieving: 'Retrieving and analyzing', retrievingCopy: 'Matching local evidence, checking evidence classes, and preparing a cited answer.', elapsed: (value: string) => `Elapsed ${value}`, placeholder: 'Ask in Chinese or English, or continue the current thread', disabledPlaceholder: 'You can draft a question; configure an API key, compatible endpoint, or Ollama before sending', send: 'Send', stopGeneration: 'Stop generation', generationStopped: 'Generation stopped. The question was restored to the composer.', composerStorage: 'Stored locally', composerNote: 'Enter to send · Shift + Enter for a new line · Research aid, not legal advice', chatError: 'Answer failed', answer: 'Research answer', copyAnswer: 'Copy answer', dismiss: 'Dismiss', sources: 'Cited evidence', sourceEvidenceNote: 'Expand to inspect excerpts, evidence classes, and source links', copyExcerpt: 'Copy excerpt', undated: 'Undated', openSource: 'Open original source', contextLimited: (sent: number, stored: number) => `The model used the latest ${sent} of ${stored} messages for this answer; the complete chat remains on this computer.`,
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

function formatElapsed(value: number) {
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
