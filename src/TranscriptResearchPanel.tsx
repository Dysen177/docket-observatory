import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  FileText,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

type Language = 'zh' | 'en'
type RecordKind = 'full_broadcast' | 'broadcast_excerpt' | 'short_video' | 'public_post' | 'unknown'
type DurationQuality = 'plausible' | 'suspiciously_short' | 'unknown'
type TranscriptQuality = 'plausible' | 'possibly_incomplete' | 'unknown'
type Segment = { start: number; end: number; text: string }
type OriginalLink = { platform: string; url: string }
type TranscriptHit = Segment & {
  contextBefore: Segment[]
  contextAfter: Segment[]
  matchReason: 'exact' | 'alias'
  matchedTerm: string
}
type TranscriptResult = {
  id: string
  date: string
  title: string
  durationSec: number | null
  language: string
  sourceLanguage?: string
  translationStatus?: string
  translationProvider?: string
  translationModel?: string
  transcriptStatus: 'available' | 'empty' | 'missing' | 'error'
  matchedPublicRecordId: string | null
  originalLinks: OriginalLink[]
  transcriptSourceLinks: OriginalLink[]
  segmentCount: number
  charCount: number
  hits: TranscriptHit[]
  titleMatched: boolean
  recordKind: RecordKind
  durationQuality: DurationQuality
  transcriptQuality: TranscriptQuality
  transcriptQualityReasons: string[]
  transcriptStartSec: number | null
  transcriptEndSec: number | null
  transcriptSpanRatio: number | null
  transcriptBoundaryVerified: boolean
  transcriptSourceType: string | null
  transcriptTimecoded: boolean
  classificationNote: string
  coverageNote: string
  contentNote: string
}
type TranscriptCoverage = {
  start: string
  end: string
  catalogRecords: number
  availableTranscripts: number
  missingTranscripts: number
  catalogMissingTranscripts: number
  emptyTranscripts: number
  linkedEquivalentTranscripts: number
  matchedPublicRecords: number
  transcriptsWithExternalLinks: number
  duplicateTranscriptGroups: number
  fullBroadcasts: number
  excerptsAndShortVideos: number
  publicPostRecords: number
  suspiciouslyShort: number
  possiblyIncomplete: number
  unknownKinds: number
  generatedAt: string | null
}
type TranscriptSearchPayload = {
  coverage: TranscriptCoverage
  filters: { q: string; year: string; sort: string }
  search: { terms: string[]; aliasExpanded: boolean; searchedOriginalTranscriptLanguage: boolean }
  total: number
  offset: number
  limit: number
  hasMore: boolean
  records: TranscriptResult[]
}
type TranscriptDetail = Omit<TranscriptResult, 'hits'> & {
  completeness: string
  contentSha256: string
  segments: Segment[]
}

const years = ['all', '2017', '2018', '2019', '2020', '2021', '2022', '2023']

export default function TranscriptResearchPanel({ language }: { language: Language }) {
  const text = transcriptText(language)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [payload, setPayload] = useState<TranscriptSearchPayload | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<TranscriptDetail | null>(null)
  const [readerSeek, setReaderSeek] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const readerRef = useRef<HTMLDivElement>(null)
  const requestKey = `${language}\u0000${query}\u0000${year}\u0000${sort}`
  const listGenerationRef = useRef(0)
  const requestKeyRef = useRef(requestKey)
  requestKeyRef.current = requestKey

  useEffect(() => {
    const controller = new AbortController()
    listGenerationRef.current += 1
    const handle = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      setPayload(null)
      setSelectedId('')
      try {
        const params = new URLSearchParams({ lang: language, q: query, year, sort, limit: '30', offset: '0', context: '1' })
        const response = await localApiFetch(`/api/public-record-transcripts?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`API ${response.status}`)
        const next = normalizeTranscriptSearchPayload(await response.json() as TranscriptSearchPayload)
        setPayload(next)
        setSelectedId((current) => next.records.some((record) => record.id === current) ? current : next.records[0]?.id ?? '')
      } catch (fetchError) {
        if (!controller.signal.aborted) setError(String(fetchError instanceof Error ? fetchError.message : fetchError))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, query ? 260 : 0)
    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [language, query, sort, year])

  const selected = payload?.records.find((record) => record.id === selectedId) ?? payload?.records[0] ?? null

  useEffect(() => {
    if (!selected?.id) {
      setDetail(null)
      setDetailLoading(false)
      return
    }
    if (selected.transcriptStatus !== 'available') {
      setDetail(null)
      setDetailLoading(false)
      setReaderSeek(null)
      return
    }
    const controller = new AbortController()
    setDetail(null)
    setDetailLoading(true)
    setReaderSeek(null)
    localApiFetch(`/api/public-record-transcripts/${encodeURIComponent(selected.id)}?lang=${language}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`API ${response.status}`)
        return response.json() as Promise<{ transcript: TranscriptDetail }>
      })
      .then((body) => setDetail(normalizeTranscriptDetail(body.transcript)))
      .catch((fetchError) => {
        if (!controller.signal.aborted) setError(String(fetchError instanceof Error ? fetchError.message : fetchError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false)
      })
    return () => controller.abort()
  }, [language, selected?.id, selected?.transcriptStatus])

  useEffect(() => {
    if (!detail || readerSeek === null || !readerRef.current) return
    scrollReaderTo(readerRef.current, readerSeek)
  }, [detail, readerSeek])

  async function loadMore() {
    if (!payload?.hasMore || loadingMore) return
    const generation = listGenerationRef.current
    const requestAtStart = requestKeyRef.current
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({ lang: language, q: query, year, sort, limit: String(payload.limit), offset: String(payload.records.length), context: '1' })
      const response = await localApiFetch(`/api/public-record-transcripts?${params}`)
      if (!response.ok) throw new Error(`API ${response.status}`)
      const next = normalizeTranscriptSearchPayload(await response.json() as TranscriptSearchPayload)
      if (generation !== listGenerationRef.current || requestAtStart !== requestKeyRef.current) return
      setPayload((current) => current ? {
        ...next,
        offset: 0,
        records: [...current.records, ...next.records.filter((record) => !current.records.some((item) => item.id === record.id))],
      } : next)
    } catch (fetchError) {
      if (generation === listGenerationRef.current && requestAtStart === requestKeyRef.current) {
        setError(String(fetchError instanceof Error ? fetchError.message : fetchError))
      }
    } finally {
      if (generation === listGenerationRef.current && requestAtStart === requestKeyRef.current) setLoadingMore(false)
    }
  }

  function seekTranscript(start: number) {
    setReaderSeek(start)
    if (readerSeek === start && readerRef.current) scrollReaderTo(readerRef.current, start)
  }

  return (
    <div className="transcript-research">
      <header className="transcript-hero">
        <div>
          <span><FileText size={16} />{text.archiveEyebrow}</span>
          <h3>{text.archiveTitle}</h3>
          <p>{text.archiveCopy}</p>
        </div>
      </header>

      <div className="transcript-search-controls">
        <label className="transcript-search-input">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.searchPlaceholder} />
          {query && <button type="button" onClick={() => setQuery('')} aria-label={text.clear}><RotateCcw size={15} /></button>}
        </label>
        <button type="button" className="transcript-sort-button" onClick={() => setSort((current) => current === 'newest' ? 'oldest' : 'newest')}>
          <CalendarDays size={16} />{sort === 'newest' ? text.newest : text.oldest}<ChevronDown size={14} />
        </button>
      </div>

      <div className="transcript-year-filter" role="group" aria-label={text.yearFilter}>
        {years.map((item) => <button type="button" className={year === item ? 'active' : ''} onClick={() => setYear(item)} key={item}>{item === 'all' ? text.allYears : item}</button>)}
      </div>

      {payload?.search.aliasExpanded && query && visibleAliasTerms(payload.search.terms, language).length > 0 && <div className="transcript-alias-note"><Sparkles size={15} /><span>{text.aliasExpanded}: {visibleAliasTerms(payload.search.terms, language).join(' · ')}</span></div>}
      {query && payload && <div className="transcript-result-rule"><ShieldCheck size={15} />{text.resultRule.replace('{count}', formatNumber(payload.total, language))}</div>}
      {error && <div className="transcript-error">{error}</div>}

      <div className="transcript-browser">
        <div className="transcript-result-pane">
          <div className="transcript-result-heading"><span>{text.results}</span><strong>{formatNumber(payload?.total, language)}</strong></div>
          {loading ? <div className="transcript-loading"><Loader2 className="spin" size={20} />{text.loading}</div> : payload?.records.length ? (
            <div className="transcript-result-list">
              {payload.records.map((record) => (
                <button type="button" className={selected?.id === record.id ? 'active' : ''} onClick={() => setSelectedId(record.id)} key={record.id}>
                  <time>{formatDate(record.date, language)}</time>
                  <strong>{record.title}</strong>
                  <span>{record.transcriptStatus !== 'available' ? text.noTranscript : query ? (record.hits.length ? `${record.hits.length} ${text.hits}` : record.titleMatched ? text.titleHit : `0 ${text.hits}`) : `${record.segmentCount} ${text.segments}`}<i>{record.recordKind === 'public_post' ? text.publicPost : formatDuration(record.durationSec, language)}</i></span>
                  <small className={`transcript-kind-label ${record.transcriptStatus !== 'available' ? 'unavailable' : record.transcriptQuality === 'possibly_incomplete' ? 'warning' : record.recordKind}`}>{record.classificationNote}</small>
                </button>
              ))}
              {payload.hasMore && <button type="button" className="transcript-load-more" onClick={loadMore} disabled={loadingMore}>{loadingMore ? <Loader2 className="spin" size={16} /> : <ChevronDown size={16} />}{text.loadMore}</button>}
            </div>
          ) : <div className="transcript-empty">{text.empty}</div>}
        </div>

        <article className="transcript-hit-pane transcript-inline-pane">
          {selected ? <>
            <header>
              <div>
                <span>{formatDate(selected.date, language)} · {selected.recordKind === 'public_post' ? text.publicPost : formatDuration(selected.durationSec, language)}</span>
                <h4>{selected.title}</h4>
              </div>
              <small className={`transcript-kind-label ${selected.transcriptStatus !== 'available' ? 'unavailable' : selected.transcriptQuality === 'possibly_incomplete' ? 'warning' : selected.recordKind}`}>{selected.classificationNote}</small>
            </header>
            <div className="transcript-inline-notes">
              <p className="transcript-boundary-note"><ShieldCheck size={15} />{selected.contentNote}</p>
              {detail?.coverageNote && <p className="transcript-boundary-note warning"><AlertTriangle size={15} />{detail.coverageNote}</p>}
              {selected.originalLinks.length > 0 && <div className="transcript-original-links">
                <span>{text.originalLinks}</span>
                {selected.originalLinks.map((link) => <a href={safeExternalUrl(link.url)} target="_blank" rel="noreferrer" key={link.url}>{platformLabel(link.platform)}<ArrowUpRight size={12} /></a>)}
              </div>}
              {selected.transcriptSourceLinks.length > 0 && <div className="transcript-original-links transcript-source-links">
                <span>{text.transcriptSources}</span>
                {selected.transcriptSourceLinks.map((link) => <a href={safeExternalUrl(link.url)} target="_blank" rel="noreferrer" key={link.url}>{platformLabel(link.platform)}<ArrowUpRight size={12} /></a>)}
              </div>}
            </div>
            {query && selected.hits.length > 0 && <section className="transcript-inline-hits">
              <div><strong>{text.matchesInSelected}</strong><span>{selected.hits.length}</span></div>
              <div className="transcript-hit-list">
                {selected.hits.map((hit, index) => (
                  <article key={`${selected.id}-${hit.start}-${index}`}>
                    <button type="button" className="transcript-time-button" onClick={() => seekTranscript(hit.start)}><Clock3 size={14} />{formatTimestamp(hit.start)}</button>
                    <div>
                      {hit.contextBefore.map((segment) => <p className="context" key={`before-${segment.start}`}>{segment.text}</p>)}
                      <p className="hit"><HighlightedText text={hit.text} terms={payload?.search.terms ?? [query]} /></p>
                      {hit.contextAfter.map((segment) => <p className="context" key={`after-${segment.start}`}>{segment.text}</p>)}
                    </div>
                    <span className={hit.matchReason}>{hit.matchReason === 'exact' ? text.exact : text.alias}</span>
                  </article>
                ))}
              </div>
            </section>}
            {selected.transcriptStatus === 'available' ? <>
              <div className="transcript-reader-meta">
                <strong>{text.fullText}</strong>
                {detail?.transcriptSourceType === 'public_subtitle' && <span className="transcript-source-badge"><ShieldCheck size={12} />{text.publicSubtitles}{detail.transcriptBoundaryVerified ? ` · ${text.boundaryVerified}` : ''}</span>}
                {language === 'en' && detail && detail.language !== 'en' && <span className="transcript-source-badge warning"><AlertTriangle size={12} />{text.translationPending}</span>}
                {detail && ['community_human_transcript', 'legacy_human_transcript'].includes(detail.transcriptSourceType ?? '') && <span className="transcript-source-badge human"><FileText size={12} />{text.humanTranscript}</span>}
                {detail && ['community_human_transcript', 'legacy_human_transcript'].includes(detail.transcriptSourceType ?? '') && !detail.transcriptTimecoded && <span className="transcript-source-badge warning"><AlertTriangle size={12} />{text.noPreciseTimestamps}</span>}
                {detail?.transcriptSourceType === 'public_post_caption' && <span className="transcript-source-badge post"><FileText size={12} />{text.publicPostText}</span>}
                <span>{formatNumber(detail?.segmentCount ?? selected.segmentCount, language)} {text.segments}</span>
                <span>{formatNumber(detail?.charCount ?? selected.charCount, language)} {text.characters}</span>
              </div>
              {detailLoading ? <div className="transcript-loading"><Loader2 className="spin" size={20} />{text.loadingFullText}</div> : detail ? (
                <div className="transcript-reader-body transcript-inline-reader" ref={readerRef}>
                  {detail.segments.map((segment, index) => <article data-segment-start={segment.start} className={`${detail.transcriptSourceType === 'public_post_caption' ? 'public-post' : ''} ${readerSeek !== null && Math.abs(segment.start - readerSeek) < 0.01 ? 'target' : ''}`.trim()} key={`${detail.id}-${segment.start}-${index}`}>
                    {detail.transcriptSourceType !== 'public_post_caption' && <time>{formatTimestamp(segment.start)}</time>}<p>{segment.text}</p>
                  </article>)}
                </div>
              ) : <div className="transcript-empty">{text.empty}</div>}
            </> : <div className="transcript-empty transcript-unavailable-copy"><AlertTriangle size={20} /><strong>{text.noTranscriptTitle}</strong><span>{text.noTranscriptCopy}</span></div>}
          </> : <div className="transcript-empty">{text.empty}</div>}
        </article>
      </div>
    </div>
  )
}

function HighlightedText({ text, terms }: { text: string; terms: string[] }) {
  const normalizedTerms = [...new Set(terms.filter(Boolean))].sort((left, right) => right.length - left.length)
  if (!normalizedTerms.length) return text
  const expression = new RegExp(`(${normalizedTerms.map(escapeRegExp).join('|')})`, 'giu')
  return <>{text.split(expression).map((part, index) => normalizedTerms.some((term) => part.localeCompare(term, undefined, { sensitivity: 'accent' }) === 0)
    ? <mark key={`${part}-${index}`}>{part}</mark>
    : <span key={`${part}-${index}`}>{part}</span>)}</>
}

function normalizeTranscriptSearchPayload(payload: TranscriptSearchPayload): TranscriptSearchPayload {
  return {
    ...payload,
    records: (Array.isArray(payload?.records) ? payload.records : []).map((record) => ({
      ...record,
      originalLinks: Array.isArray(record.originalLinks) ? record.originalLinks : [],
      transcriptSourceLinks: Array.isArray(record.transcriptSourceLinks) ? record.transcriptSourceLinks : [],
      hits: (Array.isArray(record.hits) ? record.hits : []).map(normalizeTranscriptHit),
      transcriptQualityReasons: Array.isArray(record.transcriptQualityReasons) ? record.transcriptQualityReasons : [],
    })),
  }
}

function normalizeTranscriptDetail(detail: TranscriptDetail): TranscriptDetail {
  return {
    ...detail,
    originalLinks: Array.isArray(detail?.originalLinks) ? detail.originalLinks : [],
    transcriptSourceLinks: Array.isArray(detail?.transcriptSourceLinks) ? detail.transcriptSourceLinks : [],
    segments: Array.isArray(detail?.segments) ? detail.segments : [],
    transcriptQualityReasons: Array.isArray(detail?.transcriptQualityReasons) ? detail.transcriptQualityReasons : [],
  }
}

function normalizeTranscriptHit(hit: TranscriptHit): TranscriptHit {
  return {
    ...hit,
    contextBefore: Array.isArray(hit?.contextBefore) ? hit.contextBefore : [],
    contextAfter: Array.isArray(hit?.contextAfter) ? hit.contextAfter : [],
  }
}

function visibleAliasTerms(terms: string[], language: Language) {
  return terms.filter((term) => language === 'zh' || !/[\u3400-\u9fff]/u.test(term))
}

function transcriptText(language: Language) {
  return language === 'zh' ? {
    archiveEyebrow: '历史直播与公开言论', archiveTitle: '来源、文字与时间点', archiveCopy: '在同一界面检索 2017–2023 年历史直播、剪辑片段、公开视频和账号公开帖文。不同内容类型会明确标注；每条记录展示可核对的外部链接与本地文字。',
    searchPlaceholder: '搜索原话、人名、机构或主题，例如：喜联储', clear: '清空', newest: '时间从新到旧', oldest: '时间从旧到新', yearFilter: '年份范围', allYears: '全部', aliasExpanded: '同时检索相关名称',
    resultRule: '共有 {count} 条不同直播、公开视频或公开帖文命中；不同来源记录分别保留，同一转载副本不会重复显示。', results: '来源与文字记录', loading: '正在检索本地资料库', hits: '处命中', titleHit: '标题命中', noTranscript: '暂无文字', noTranscriptTitle: '该来源暂无可用文字', noTranscriptCopy: '外部来源链接已保留；后续发现可核对文字时会自动纳入全文检索。', segments: '个文字片段', loadMore: '加载更多', empty: '当前条件没有匹配结果。',
    originalLinks: '外部媒体', transcriptSources: '文字来源', exact: '精确命中', alias: '相关名称', matchesInSelected: '本条命中与前后文', fullText: '本地已收录文字', loadingFullText: '正在加载已收录文字', characters: '字', publicSubtitles: '公开字幕', humanTranscript: '人工整理全文', publicPost: '公开帖文', publicPostText: '账号帖文原文', noPreciseTimestamps: '无精确时间点', boundaryVerified: '时间边界已核对',
    translationPending: '英文译文待生成，当前显示原语言文字',
  } : {
    archiveEyebrow: 'Historical broadcasts and public statements', archiveTitle: 'Sources, transcripts, and timestamps', archiveCopy: 'Search historical livestreams, excerpts, public videos, and public account posts from 2017–2023 in one workspace. Content types are labeled separately, with verifiable external links and locally stored text.',
    searchPlaceholder: 'Search a quotation, person, entity, or topic', clear: 'Clear', newest: 'Newest first', oldest: 'Oldest first', yearFilter: 'Year range', allYears: 'All', aliasExpanded: 'Related names also searched',
    resultRule: '{count} distinct broadcasts, public videos, or public posts match. Different source records remain separate, while identical repost copies are deduplicated.', results: 'Source and transcript records', loading: 'Searching the local archive', hits: 'hits', titleHit: 'Title match', noTranscript: 'Transcript unavailable', noTranscriptTitle: 'No usable transcript is currently available', noTranscriptCopy: 'The external source link remains available. If verifiable text is found later, it will automatically join full-text search.', segments: 'segments', loadMore: 'Load more', empty: 'No result matches the current filters.',
    originalLinks: 'External media', transcriptSources: 'Text source', exact: 'Exact match', alias: 'Related name', matchesInSelected: 'Matches and context in this record', fullText: 'All locally stored text', loadingFullText: 'Loading stored text', characters: 'characters', publicSubtitles: 'Public subtitles', humanTranscript: 'Human-edited transcript', publicPost: 'Public post', publicPostText: 'Original account-post text', noPreciseTimestamps: 'No precise timestamps', boundaryVerified: 'boundaries verified',
    translationPending: 'English translation pending; original-language text is shown',
  }
}

function scrollReaderTo(container: HTMLDivElement, seek: number) {
  const nearest = [...container.querySelectorAll<HTMLElement>('[data-segment-start]')]
    .reduce<HTMLElement | null>((best, item) => {
      const currentDistance = Math.abs(Number(item.dataset.segmentStart) - seek)
      const bestDistance = best ? Math.abs(Number(best.dataset.segmentStart) - seek) : Number.POSITIVE_INFINITY
      return currentDistance < bestDistance ? item : best
    }, null)
  nearest?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function localApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
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

function formatNumber(value: number | null | undefined, language: Language) {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-US').format(value)
}

function formatDate(value: string, language: Language) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function formatDuration(value: number | null, language: Language) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0))
  if (!seconds) return language === 'zh' ? '时长未记录' : 'Duration unavailable'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  if (language === 'zh') return hours ? `${hours} 小时 ${minutes} 分` : minutes ? `${minutes} 分 ${remainder} 秒` : `${remainder} 秒`
  return hours ? `${hours}h ${minutes}m` : minutes ? `${minutes}m ${remainder}s` : `${remainder}s`
}

function formatTimestamp(value: number) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function platformLabel(value: string) {
  return ({ youtube: 'YouTube', gettr: 'GETTR', rumble: 'Rumble', odysee: 'Odysee', x: 'X', 'gwins.org': 'GWins', github_transcript: 'GitHub', blogspot_transcript: 'Blogspot' } as Record<string, string>)[value] ?? value
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}
