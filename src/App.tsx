import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChartNetwork,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  CloudDownload,
  Cpu,
  DatabaseZap,
  FileSearch,
  FileText,
  FolderOpen,
  Eye,
  EyeOff,
  GitBranch,
  KeyRound,
  Landmark,
  Languages,
  Loader2,
  LockKeyhole,
  Minus,
  Network,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Scale,
  ScanText,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Moon,
  Sun,
  Trash2,
  UsersRound,
  UserRoundCheck,
  Workflow,
  X,
} from 'lucide-react'
import brandLogo from './assets/brand-logo.png'
import './App.css'
import './redesign.css'

let pdfJsPromise: Promise<typeof import('pdfjs-dist')> | null = null

function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfJs, worker]) => {
      pdfJs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfJs
    })
  }
  return pdfJsPromise
}

type Language = 'zh' | 'en'
type Theme = 'dark' | 'light'
type Severity = 'critical' | 'high' | 'medium' | 'low'
type DocumentSearchScope = 'all' | 'original' | 'translation' | 'analysis' | 'web'
type WorkspaceView = '#timeline' | '#documents' | '#cases' | '#positions' | '#entities' | '#policy' | '#calendar'
type DocumentWorkspaceTab = 'files' | 'review' | 'audit' | 'analytics' | 'automation'

const workspaceViews = new Set<WorkspaceView>(['#timeline', '#documents', '#cases', '#positions', '#entities', '#policy', '#calendar'])

function normalizeWorkspaceView(hash: string): WorkspaceView {
  return workspaceViews.has(hash as WorkspaceView) ? hash as WorkspaceView : '#timeline'
}

type SourceStatus = {
  sourceId: string
  status: string
  checkedAt: string | null
  latencyMs: number | null
  itemCount: number
  message: string
  facts: Array<{ label: string; value: string; detail: string }>
  lastAttempt?: {
    status: string
    checkedAt: string | null
    latencyMs: number | null
    itemCount: number
    message: string
    facts: Array<{ label: string; value: string; detail: string }>
  } | null
}

type SourceRecord = {
  id: string
  name: string
  shortName: string
  type: string
  confidence: string
  url: string
  coverage: string
  limitations: string
}

type EventRecord = {
  id: string
  date: string
  dateBasis?: 'court_filed' | 'court_entered' | 'agency_published' | 'source_reported' | null
  dateConfidence?: 'low' | 'medium' | 'high' | null
  title: string
  summary: string
  impact: string
  caseId: string
  relatedCaseIds: string[]
  court: string
  docketNumber: string
  filingNumber: string
  category: string
  severity: Severity
  sourceId: string
  sourceLabel: string
  sourceType: string
  sourceUrl: string
  confidence: string
  assertionType: string
  entities: string[]
  tags: string[]
}

type CaseRecord = {
  id: string
  title: string
  shortTitle: string
  court: string
  docket: string
  kind: string
  status: string
  priority: string
  lastKnownFiling: string
  stage: string
  focus: string
  sourceIds: string[]
  watchQuestions: string[]
  eventCount: number
  latestEvent: EventRecord | null
  latestRelatedEvent?: EventRecord | null
}

type EntityRecord = {
  id: string
  name: string
  type: string
  role: string
  caseIds: string[]
  riskAreas: string[]
  notes: string
}

type PolicyWatch = {
  id: string
  title: string
  area: string
  relevance: string
  sourceIds: string[]
  monitorTerms: string[]
  posture: string
}

type Analysis = {
  mode: string
  confidence: string
  whatChanged: string[]
  whyItMatters: string[]
  proceduralStatus: string[]
  riskFlags: string[]
  followUps: string[]
  evidence: Array<{ label: string; url: string; sourceType: string }>
}

type Dashboard = {
  generatedAt: string
  lastRefresh: {
    startedAt: string
    completedAt: string
    fetchedEvents: number
    sourceCount: number
  } | null
  aiMode: string
  metrics: {
    totalEvents: number
    criticalEvents: number
    monitoredCases: number
    monitoredEntities: number
    officialCount: number
    officialCourtCount?: number
    officialAgencyCount?: number
    recapCount?: number
    claimsAgentCount?: number
    mirrorCount: number
    actionSources: number
  }
  cases: CaseRecord[]
  entities: EntityRecord[]
  events: EventRecord[]
  sources: SourceRecord[]
  sourceStatuses: SourceStatus[]
  policyWatch: PolicyWatch[]
  portfolioAnalysis: {
    latestSignal: string
    thesis: string
    priorityRisks: string[]
    sourceGaps: string[]
    openLoops: Array<{ caseId: string; caseTitle: string; question: string }>
  }
  latestAnalysis: Analysis | null
  notes: string[]
}

type LitigationRoleKey = 'government' | 'defense' | 'court' | 'regulator' | 'trustee' | 'third_party' | 'joint' | 'docket'

type LitigationActionRecord = {
  id: string
  eventId: string
  date: string
  caseId: string
  caseTitle: string
  caseKind: string
  docketNumber: string
  court: string
  filingNumber: string
  title: string
  summary: string
  significance: string
  roleKey: LitigationRoleKey
  roleLabel: string
  roleBasis: 'explicit' | 'procedural' | 'unresolved'
  roleBasisLabel: string
  actionKey: string
  actionLabel: string
  statusKey: string
  statusLabel: string
  courtDispositionKey: string | null
  courtDispositionLabel: string
  category: string
  assertionType: string
  confidence: string
  sourceId: string
  sourceLabel: string
  sourceType: string
  sourceUrl: string
  sourceNote: string
  primarySource: boolean
  requiresVerification: boolean
}

type LitigationPositionsLibrary = {
  generatedAt: string
  methodology: string
  sourceBoundary: string
  labels: {
    roles: Record<LitigationRoleKey, string>
    actions: Record<string, string>
    statuses: Record<string, string>
    bases: Record<string, string>
  }
  counts: {
    total: number
    explicit: number
    needsVerification: number
    courtResolved: number
    roleCounts: Record<LitigationRoleKey, number>
    statusCounts: Record<string, number>
  }
  actions: LitigationActionRecord[]
}

type DocumentFile = {
  title: string
  docNumber: string | null
  caseId: string
  sourceId: string
  sourceLabel?: string
  variantKey: 'source' | 'chinese_reference_translation' | string
  variantLabel: string
  sourceUrl: string
  localPath: string
  bytes: number
  status: string
  error?: string
}

type ManagedDocumentTarget = {
  sourceUrl: string
  title: string
  docNumber: string | null
  sourceLabel: string
  variantLabel: string
  initialPage?: number
}

type RelationshipEvidence = {
  kind: string
  type?: string
  label?: string
  labelEn?: string
  labelZh?: string
  description?: string
  descriptionEn?: string
  descriptionZh?: string
  excerpt: string
  sourceUrl: string
  confidence: string
}

type RelationshipRecord = {
  primaryType: string
  types: string[]
  status: string
  statusLabel?: string
  confidence: string
  confidenceScore?: number
  signals: string[]
  signalTypes?: string[]
  evidence: RelationshipEvidence[]
  controlWarning?: string
  controlWarningEn?: string
  controlWarningZh?: string
  promotionEligible?: boolean
  requiresManualReview?: boolean
  docketUrl?: string
  label?: string
}

type RelationshipAuditDocket = {
  id: string
  caseId: string | null
  courtListenerDocketId: number
  docketNumber: string | null
  caption: string
  court: string
  discoveryState: 'tracked' | 'discovered' | 'discovery_lead' | string
  discoveryClassification: string
  latestObserved: string | null
  sourceUrls: string[]
  relationship: RelationshipRecord
  evidence: RelationshipEvidence[]
  files: {
    total: number
    usable: number
    officialOrRecap: number
    backupMirror: number
    errors: number
    extracted: number
    translated: number
    aiAnalyzed: number
  }
  verificationTasks: string[]
}

type RelationshipAudit = {
  schemaVersion: number
  generatedAt: string
  signature: string
  methodology: string[]
  sourceLimitations: Record<string, string>
  counts: {
    dockets: number
    discoveredDockets: number
    formalTrackedDockets: number
    usableFiles: number
    filesPendingReview: number
    byStatus: Record<string, number>
    byType: Record<string, number>
  }
  relationTypes: Record<string, {
    label?: string
    labelEn?: string
    labelZh?: string
    description?: string
    descriptionEn?: string
    descriptionZh?: string
  }>
  dockets: RelationshipAuditDocket[]
  pendingReview: RelationshipAuditDocket[]
  excluded: RelationshipAuditDocket[]
}

type DocumentLibrary = {
  available: boolean
  generatedAt: string | null
  root: string
  counts: {
    collected: number
    downloaded: number
    skippedExisting: number
    localAvailable: number
    errors: number
  }
  credentialRequired: Array<{ sourceId: string; reason: string; source: string | null }>
  sampleFiles: DocumentFile[]
  errorFiles: DocumentFile[]
}

type MonitoringTopic = {
  id: string
  title: string
  priority: string
  scope: string
  keywords: string[]
  sourceIds: string[]
}

type EvidenceTier = {
  id: string
  label: string
  weight: string
  description: string
}

type MonitoringProfile = {
  id: string
  posture: string
  description: string
  operatingRules: Array<{ id: string; title: string; description: string }>
  automation: {
    refreshPlan: string[]
    newCaseDiscovery: string[]
    aiPolicy: string[]
  }
  watchTopics: MonitoringTopic[]
  evidenceTiers: EvidenceTier[]
}

type DocumentAnalysisRecord = {
  id: string
  resourceKind?: 'pdf' | 'web_page'
  publishedAt?: string | null
  capturedAt?: string | null
  docNumber: string | null
  title: string
  originalTitle: string
  variantKey: 'source' | 'chinese_reference_translation' | string
  variantLabel: string
  caseId: string
  sourceId: string
  sourceLabel: string
  sourceUrl: string
  localPath: string
  bytes: number
  status: string
  category: string
  categoryKey: string
  priority: Severity
  confidence: string
  sourcePosture: string
  summary: string
  plainEnglish: string
  legalReading: string[]
  caseConnections: string[]
  whyItMatters: string[]
  verificationTasks: string[]
  riskFlags: string[]
  citations: Array<{
    id: string
    pageNumber: number
    originalText: string
    translatedText: string
    charStart: number
    charEnd: number
    textHash: string | null
    sourceUrl: string
    sourcePosture: string
    note: string
  }>
  aiFindings: Array<{
    section: string
    text: string
    confidence: 'low' | 'medium' | 'high' | string
    citations: Array<{ kind: 'source_metadata' | 'extracted_page' | string; pageNumber: number | null }>
  }>
  translation: {
    status: string
    targetLanguage: string
    mode: string
    translatedAt: string | null
    textHash: string | null
    charCount: number
    translatedText: string
    coverage?: 'complete' | 'partial' | 'unknown' | string
    contentIntegrity?: 'source_complete' | 'source_unchanged' | 'redacted' | 'not_generated' | 'unknown' | string
    reason?: string
  } | null
  relatedTopics: string[]
  relatedTopicIds: string[]
  translationStatus: { metadata: string; body: string; note: string }
  aiStatus: {
    available: boolean
    mode: string
    batchDefault: string
    confidence?: string
    lastError?: string
    provider?: 'local_rules' | 'openai' | 'ollama' | 'human_research' | string | null
    availableProvider?: string
    generated?: boolean
  }
  sourceVerification: { tier: string; primary: boolean; label: string; note: string }
  sourceAlternatives?: Array<{
    sourceId: string
    sourceLabel: string
    sourceUrl: string
    sourcePage: string
    kind: string
    equivalenceStatus: string
    localAvailable: boolean
    sha256: string | null
    label: string
    note: string
  }>
  relationship?: RelationshipRecord | null
  relationshipStatus?: string
  relationshipType?: string
  relationshipTypes?: string[]
  relationshipConfidence?: string
  relationshipLabel?: string
  relationshipEvidence?: RelationshipEvidence[]
  relationshipControlWarning?: string
  relationshipVerificationTasks?: string[]
  analysisBasis?: string
  researchQuality: {
    key: 'body_verified' | 'body_partial' | 'metadata_only' | 'unavailable' | string
    label: string
    detail: string
  }
  textExtraction: {
    status: string
    label: string
    engine: string
    pageLimit: number
    totalPages: number | null
    pagesParsed: number
    charCount: number
    coverage?: 'complete' | 'partial' | 'none' | string
    snippet: string
    pageSnippets?: Array<{ pageNumber: number; text: string; charStart: number; charEnd: number; textHash: string | null }>
    textHash?: string | null
    warning?: string | null
  }
  searchScore?: number
  searchMatches?: DocumentSearchMatch[]
}

type DocumentSearchMatch = {
  kind: 'docket_number' | 'title' | 'body_original' | 'body_translation' | 'legal_analysis' | 'web_page' | string
  pageNumber: number | null
  matchedPageNumbers?: number[]
  snippet: string
  terms: string[]
  language: Language | string
  coverage: string
  contentIntegrity: string
  engine?: string | null
  sourceUrl: string
  alternatives: Array<{ sourceUrl: string; sourcePage: string; sourceLabel: string; sourceId: string }>
}

type DocumentSearchCoverage = {
  manifestPdfFiles: number
  uniquePdfContents: number
  indexedOriginals: number
  completeOriginals: number
  partialOriginals: number
  missingOriginals: number
  ocrOriginals: number
  translatedComplete: number
  translatedPartial: number
  assistiveTranslations: number
  analysisDocuments: number
}

type DocumentAnalysisLibrary = {
  generatedAt: string
  manifestGeneratedAt: string | null
  mode: string
  neutrality: string
  extraction: { bodyText: string; detail: string }
  sourceStrategy: { priority: string[]; noFeePath: string; nfscPolicy: string }
  portfolioRead: { headline: string; synthesis: string[]; openLoops: string[] }
  analytics: DocumentAnalytics
  automation: AutomationPlan
  caseDossiers: CaseDossier[]
  counts: {
    totalFiles: number
    localAvailable: number
    translatedMetadata: number
    extractedSnippets: number
    cachedExtractions: number
    queuedForAi: number
    cachedDocumentAi: number
    cachedLocalRuleReads: number
    humanResearchDocuments: number
    legalReadDocuments: number
    pendingLegalReadDocuments: number
    pendingLegalReadReasons: {
      analysis_cache_missing: number
      extraction_cache_missing: number
      text_extraction_unavailable: number
      stale_source_sha: number
    }
    cachedCaseAi: number
    cachedLocalRuleCaseReads: number
    humanResearchCases: number
    completeTranslations: number
    sourceAlreadyTargetLanguage: number
    redactedTranslations: number
    partialTranslations: number
    assistiveTranslations: number
    highPriority: number
    errors: number
  }
  processingRules: string[]
  queue: DocumentAnalysisRecord[]
  catalog: DocumentAnalysisRecord[]
  catalogPage: {
    total: number
    filtered: number
    offset: number
    limit: number
    hasMore: boolean
  }
  errors: DocumentAnalysisRecord[]
}

type CompletenessAudit = {
  schemaVersion: number
  generatedAt: string
  mode: string
  refresh?: {
    status: 'complete' | 'partial' | 'stale' | 'local_only' | string
    attemptedAt: string | null
    dataGeneratedAt: string | null
    lastSuccessfulOnlineAt: string | null
    usedPreviousSuccessfulAudit: boolean
    sources: Record<string, {
      status: string
      checkedAt: string | null
      error: string
      successfulTargets?: number
      failedTargets?: number
      observedEntries?: number
      availableDocuments?: number
    }>
  }
  verdict: string
  verdictLabel?: string
  verdictReason: string
  methodology: string[]
  accessBoundaries: Record<string, string>
  totals: {
    trackedDockets: number
    observedDockets: number
    observedEntries: number
    metadataOnlyEntries: number
    publiclyAvailableMissing: number
    localFiles: number
    officialOrRecapLocalFiles: number
    mirrorLocalFiles: number
    localErrors: number
    untrackedLocalFiles?: number
    pendingRelationReviewFiles?: number
    discoveryAvailableDocuments?: number
    discoveryPubliclyAvailableMissing?: number
    untrackedCaseIds?: string[]
  }
  integrity: {
    manifestDigest: string
    hashedFiles: number
    unhashedAvailableFiles: number
    duplicatePayloadGroups: number
    crossSourceHashConflicts: number
    downloadErrors: Array<{ caseId: string; docketNumber: string | null; title: string; sourceUrl: string; error: string }>
  }
  dockets: Array<{
    id: string
    caseId: string
    caseTitle: string
    label: string
    court: string
    docketNumber: string
    courtListenerDocketId: number
    courtListenerUrl: string
    status: string
    statusLabel?: string
    latestObserved: string | null
    sourceMode: string
    counts: {
      observedEntries: number
      observedUniqueNumbers: number
      matchedObservedEntries: number
      metadataOnlyEntries: number
      recapAvailableDocuments: number
      publiclyAvailableMissing: number
      localFiles: number
      officialOrRecapLocalFiles: number
      mirrorLocalFiles: number
      localErrors: number
    }
    gaps: Array<{ type: string; docketNumber: string | null; label: string; sourceUrl: string; reason: string }>
    limitations: string[]
  }>
  discovery: {
    generatedAt: string | null
    status: string
    queries: string[]
    failures?: string[]
    candidates: Array<{
      courtListenerDocketId: number
      docketNumber: string
      title: string
      court: string
      latestObserved: string
      sourceUrl: string
      classification: string
      classificationLabel?: string
      score: number
      reason: string
      summary: string
      relationshipSignals?: string[]
    }>
    excludedLikelyFalseMatches: Array<{
      courtListenerDocketId: number
      docketNumber: string
      title: string
      court: string
      latestObserved: string
      sourceUrl: string
      classification: string
      score: number
      reason: string
      summary: string
    }>
  }
  errors: string[]
}

type ChartDatum = {
  key: string
  label: string
  value: number
  posture?: string
}

type TimelineDatum = {
  key: string
  label: string
  events: number
  documents: number
}

type CaseMatrixRecord = {
  caseId: string
  shortTitle: string
  docket: string
  priority: string
  events: number
  documents: number
  highPriorityDocuments: number
  sourceGaps: number
  sourceGapIds: string[]
  sourceReady: number
  sourceTotal: number
  stage: string
}

type RelationshipGraph = {
  nodes: Array<{ id: string; label: string; type: string; weight: number }>
  links: Array<{ source: string; target: string; label: string }>
}

type DocumentAnalytics = {
  categoryDistribution: ChartDatum[]
  priorityDistribution: ChartDatum[]
  sourceDistribution: ChartDatum[]
  verificationDistribution: ChartDatum[]
  activityTimeline: TimelineDatum[]
  caseMatrix: CaseMatrixRecord[]
  relationshipGraph: RelationshipGraphData
  gaps: {
    downloadErrors: number
    backupMirrorFiles: number
    officialOrRecapFiles: number
    needsFullText: number
  }
}

type AutomationStage = {
  id: string
  label: string
  status: 'active' | 'attention' | 'queued' | string
  detail: string
  done: number
  total: number
}

type AutomationPlan = {
  headline: string
  stages: AutomationStage[]
  blockers: string[]
}

type CaseDossier = {
  caseId: string
  title: string
  shortTitle: string
  docket: string
  court: string
  status: string
  posture: string
  plainRead: string
  analogy: string
  lawyerRead: string[]
  unresolvedIssues: string[]
  aiDossier?: {
    available: boolean
    provider?: 'local_rules' | 'openai' | 'ollama' | 'human_research' | string | null
    generatedAt: string | null
    model: string | null
    text: string
    evidenceCount: number
  } | null
  controllingDocs: Array<{
    id: string
    docNumber: string | null
    title: string
    category: string
    priority: Severity
    sourceUrl: string
  }>
  metrics: {
    events: number
    documents: number
    highPriority: number
  }
}

type RelationshipGraphData = {
  nodes: Array<{ id: string; label: string; type: string; weight: number }>
  links: Array<{ source: string; target: string; label: string }>
}

type DocumentCatalogPage = {
  generatedAt: string
  total: number
  filtered: number
  offset: number
  limit: number
  hasMore: boolean
  catalog: DocumentAnalysisRecord[]
  search?: {
    schemaVersion: string
    generatedAt: string
    query: string
    queryTruncated: boolean
    scope: DocumentSearchScope
    stale: boolean
    building: boolean
    coverage: DocumentSearchCoverage
  }
}

type AutomationRunStep = {
  id: string
  label: string
  detail: string
  status: 'queued' | 'running' | 'complete' | 'local_only' | 'failed' | string
  done: number
  total: number
  startedAt: string | null
  completedAt: string | null
  error: string
}

type AutomationRun = {
  id: string
  mode: string
  language: Language
  status: 'idle' | 'running' | 'complete' | 'failed' | 'interrupted' | string
  startedAt: string | null
  updatedAt: string | null
  completedAt: string | null
  currentStep: string
  requested: {
    includeAi: boolean
    includeTranslation: boolean
    pageLimit: number
    charLimit: number
    limit: number | string | null
    processingScope?: string
  }
  progress: { done: number; total: number }
  outputs: {
    refreshedEvents: number
    manifestFiles: number
    downloaded: number
    deferredDownloads?: number
    skippedExisting: number
    downloadErrors: number
    extracted: number
    translated: number
    sourceAlreadyTargetLanguage?: number
    partiallyTranslated?: number
    assistiveTranslated?: number
    redactedTranslated?: number
    aiAnalyzed: number
    localRuleAnalyzed?: number
    caseDossiers: number
    caseAiDossiers?: number
    localRuleCaseDossiers?: number
    blocked: string[]
  }
  steps: AutomationRunStep[]
  logs: Array<{ at: string; message: string }>
}

type SecretStatus = {
  configured: boolean
  masked: string
  source: 'secure_storage' | 'environment' | 'none' | string
}

type AppSettingsRecord = {
  aiProvider: 'openai' | 'anthropic' | 'gemini' | 'openai_compatible' | 'ollama' | 'local' | string
  aiModel: string
  translationModel: string
  aiReasoningEffort: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max' | string
  compatibleAiBaseUrl: string
  localAiProvider: 'ollama' | 'none' | string
  localAiBaseUrl: string
  localAiModel: string
  localAiTimeoutMs: number
  localAiContextChars: number
  translationProvider: 'openai' | 'anthropic' | 'gemini' | 'openai_compatible' | 'ollama' | 'local' | string
  autoRefresh: boolean
  refreshIntervalMinutes: number
  networkRetryMinutes: number
  autoProcessDocuments: boolean
  automaticProcessingScope: 'priority' | 'all' | string
  automaticProcessingLimit: number
  includeTranslation: boolean
  includeAi: boolean
  automationLanguage: 'zh' | 'en' | 'both' | string
  sendSnippetsToAi: boolean
  redactSensitiveDataBeforeAi: boolean
  localOcrEnabled: boolean
  ocrPageLimit: number
  pdfPageLimit: number
  pdfCharLimit: number
  translationChunkChars: number
  downloadConcurrency: number
  downloadTimeoutMs: number
  downloadRetries: number
  downloadMaxFileMb: number
  pdfMaxFileMb: number
  fileIntegrityMode: 'changed' | 'full' | 'remote' | string
  pacerAutoDownload: boolean
  pacerMonthlyBudgetUsd: number
}

type SettingsPayload = {
  settings: AppSettingsRecord
  secrets: Record<string, SecretStatus>
  secureStorageAvailable: boolean
  secureStorageStatus: string
  storage: string
  dataDirectory: string
  cacheDirectory: string
  environmentFallbacks: Record<string, boolean>
  capabilities: Record<string, string>
  sourceDiagnostics: SourceStatus[]
  integrationDiagnostics: Record<string, {
    status: string
    checkedAt: string | null
    latencyMs: number | null
    itemCount: number
    message: string
  }>
}

type ProceduralCalendarItem = {
  id: string
  caseId: string
  caseTitle: string
  docket: string
  title: string
  date: string
  deadlineType: string
  status: 'known' | 'inferred' | 'needs_verification' | string
  statusLabel: string
  basisDoc: string
  sourceUrl: string
  sourceTier: string
  note: string
}

type ProceduralCalendar = {
  generatedAt: string
  disclaimer: string
  items: ProceduralCalendarItem[]
}

type AiTestResult = {
  status: 'ok' | 'error'
  provider: string
  model?: string
  latencyMs?: number
  message: string
}

const severityText: Record<Language, Record<Severity, string>> = {
  zh: {
    critical: '关键',
    high: '高',
    medium: '中',
    low: '低',
  },
  en: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },
}

const confidenceText: Record<Language, Record<string, string>> = {
  zh: {
    highest: '最高',
    high: '高',
    medium: '中',
    low: '低',
  },
  en: {
    highest: 'Highest',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },
}

const statusText: Record<Language, Record<string, string>> = {
  zh: {
    ok: '正常',
    limited: '受限',
    error: '错误',
    not_run: '未刷新',
    disabled: '停用',
    needs_credentials: '需凭证',
    needs_implementation: '待接入',
    stale: '上次刷新失败',
  },
  en: {
    ok: 'OK',
    limited: 'Limited',
    error: 'Error',
    not_run: 'Not run',
    disabled: 'Disabled',
    needs_credentials: 'Credentials',
    needs_implementation: 'Pending',
    stale: 'Latest refresh failed',
  },
}

const ui = {
  zh: {
    loading: '加载案件情报库',
    apiError: '无法连接本地 API',
    brand: '案卷观察台',
    brandEyebrow: '案件指挥台',
    navLatest: '最新案卷',
    navCases: '案件组合',
    navPositions: '诉讼方动态',
    navEntities: '实体关系',
    navPolicy: '政策雷达',
    navCalendar: '程序日历',
    navDocuments: '证据文件库',
    navSettings: '设置',
    settingsTitle: '本地设置',
    settingsEyebrow: '配置与安全',
    settingsCopy: '管理来源接入、AI、翻译、自动处理和本地隐私。密钥只保存在本机安全存储，不会显示在页面或写入普通配置文件。',
    backHome: '返回主页',
    saveSettings: '保存设置',
    saved: '已保存',
    saving: '保存中',
    settingsLoadError: '设置加载失败',
    settingsSaveError: '设置保存失败',
    credentialsTitle: '来源与 API 凭据',
    credentialsCopy: '正式案卷、RECAP 和 AI 是可选接入。PACER 账号仅用于未来明确实现的费用感知适配器，程序不会绕过登录或自动付费。',
    openaiKey: 'OpenAI API Key',
    anthropicKey: 'Anthropic API Key',
    geminiKey: 'Google Gemini API Key',
    compatibleKey: '兼容接口 / 中转站 API Key',
    courtlistenerToken: 'CourtListener / RECAP Token',
    pacerUsername: 'PACER 用户名',
    pacerPassword: 'PACER 密码',
    pacerClientCode: 'PACER Client Code（可选）',
    configured: '已配置',
    notConfigured: '未配置',
    secureStorage: '系统加密存储',
    environmentStorage: '环境变量回退',
    secureStorageUnavailable: '当前环境没有可用的系统加密存储；请通过 macOS 或 Windows Electron 桌面版配置密钥。',
    secureStorageDenied: '系统加密存储暂时不可用，密钥没有保存。程序不会显示系统认证提示；普通设置和无 Key 功能仍可使用，重启程序后可再次尝试。',
    secureStorageCorrupt: '本地加密凭据库无法读取。程序没有覆盖原文件；请在发布者协助下检查或重置凭据库。',
    clearCredential: '清除',
    deleteCredential: '删除',
    undoDelete: '撤销删除',
    cancelCredentialChange: '取消更改',
    pendingCredentialAdd: '待添加',
    pendingCredentialReplace: '待替换',
    pendingCredentialDelete: '待删除',
    enterCredentialReplacement: '输入新值以替换',
    discardCredentialChanges: '放弃凭据更改',
    deleteAllLocalCredentials: '删除全部本地凭据',
    credentialControlDetail: '凭据由用户控制。保存后才会添加、替换或删除本机加密库中的值；环境变量必须由用户在启动环境中修改。',
    environmentManagedExternally: '由启动环境管理，可输入本地值覆盖',
    showCredential: '显示',
    hideCredential: '隐藏',
    testConnection: '测试连接',
    testingConnection: '测试中',
    connectionPassed: '连接成功',
    connectionFailed: '连接失败',
    testAi: '测试 AI',
    aiTitle: 'AI 与翻译',
    aiProvider: 'AI 提供商',
    localRules: '本地规则（无需外联）',
    localOllama: '本机 Ollama（可选，无云端）',
    localAiBaseUrl: '本机 AI 地址',
    localAiModel: '本机模型名称',
    localAiTimeout: '本机 AI 超时（毫秒）',
    localAiContext: '本机 AI 最大上下文字符',
    localAiDetail: 'Ollama 只允许连接 localhost / 127.0.0.1 的本机服务；未安装或未启动时自动回退到本地确定性规则。',
    openai: 'OpenAI（可选）',
    anthropic: 'Anthropic Claude（可选）',
    gemini: 'Google Gemini（可选）',
    openaiCompatible: 'OpenAI 兼容接口 / 中转站',
    noCloudTranslation: '本地辅助译文（默认）',
    localTranslationDetail: '完整版直接提供发布基线中已有的译文与阅读辅助。新增文件在无生成式服务时只形成明确标注的初步阅读辅助，不会覆盖或降级内置基线；Ollama、官方云端模型或兼容接口可生成更完整的正文翻译。',
    aiModel: '法律分析模型 ID',
    translationModel: '正文翻译模型 ID',
    compatibleAiBaseUrl: '兼容接口 Base URL',
    compatibleAiDetail: '用于实现 OpenAI-compatible /chat/completions 的中转站、自托管服务或其他模型平台。远程地址必须使用 HTTPS，本机服务可使用 HTTP；请填写服务商给出的 API 根地址。',
    aiReasoningEffort: '法律分析推理强度',
    reasoningNone: '不推理（最快）',
    reasoningLow: '低（快速）',
    reasoningMedium: '中等（更快）',
    reasoningHigh: '高（推荐）',
    reasoningXHigh: '超高（更深入）',
    reasoningMax: '最大（最慢）',
    reasoningDetail: '推理强度仅对支持该参数的模型生效；强度越高通常耗时更长、用量更高。其他提供商会忽略该选项，纯翻译和连接测试不使用深度推理。',
    modelQualityDetail: '程序支持的是协议与自定义模型 ID，不代表所有模型质量相同。译文忠实度、法律推理、长文档覆盖、引用稳定性和速度，取决于模型能力、上下文长度、推理强度、服务商兼容实现及账户额度。小模型或不完整中转可能遗漏内容、误译术语或生成不稳定引用；任何 AI 输出都不是正式法律意见。',
    translationProvider: '翻译方式',
    aiPrivacy: '允许向云端 AI 发送提取正文',
    aiPrivacyDetail: '仅控制所有云端 AI 提供商和中转接口。关闭后，云端解读只使用元数据且云端正文翻译停用；本机 Ollama 仍可在 loopback 内读取本地提取正文。始终不上传 PDF 文件或本地路径。',
    aiDataBoundary: 'OpenAI 官方请求使用 store:false；Anthropic、Gemini 和中转站的保留政策由对应服务商决定；Ollama 只允许本机 loopback 连接。密钥不返回前端，AI 输出是研究辅助，不是正式法律意见。',
    aiRedaction: '发送前自动脱敏敏感信息',
    aiRedactionDetail: '默认遮盖邮箱、美国社保号、常见电话号码和账户/路由号形式；本地原文不改写。自动规则不能保证识别所有个人信息，发送前仍需核对。',
    automationTitle: '自动抓取与处理',
    autoRefresh: '联网后自动刷新来源',
    refreshInterval: '刷新间隔（分钟）',
    networkRetry: '联网失败重试（分钟）',
    autoProcess: '刷新后自动下载、翻译和分析公开文件',
    automaticScope: '自动处理范围',
    automaticLimit: '日常每轮新增下载/处理上限',
    automaticScopePriority: '优先文件（推荐）',
    automaticScopeAll: '全部公开文件',
    automaticScopePriorityDetail: '联网刷新后只处理高价值材料，适合日常监控并控制 API 用量。',
    automaticScopeAllDetail: '联网刷新后处理全部可下载文件，可能耗时较长并产生更多翻译与 AI 请求。',
    includeTranslation: '自动翻译文件正文',
    includeAi: '自动生成文件级和案件级解读',
    automationLanguage: '后台输出语言',
    automationBoth: '中英双语（推荐）',
    automationChinese: '仅中文',
    automationEnglish: '仅英文',
    processingTitle: '处理性能与边界',
    localOcr: '本地 OCR 回退',
    localOcrDetail: '扫描版 PDF 没有文本层时，使用内置 Tesseract.js 在本机识别中英文；扫描页不会上传。',
    ocrPages: '扫描 PDF 最大 OCR 页数',
    pdfPages: '每个文件最多提取页数',
    pdfChars: '每个文件最多提取字符数',
    translationChunk: '翻译分块字符数',
    downloadConcurrency: '并行下载数',
    timeout: '单次请求超时（毫秒）',
    retries: '失败重试次数',
    downloadMaxSize: '单个下载最大体积（MB）',
    pdfMaxSize: '单个 PDF 解析上限（MB）',
    integrityMode: '文件完整性核验',
    integrityChanged: '变更时完整哈希（推荐）',
    integrityFull: '每次刷新完整哈希（较慢）',
    integrityRemote: '重新下载并比对远端（最严格）',
    pacerTitle: 'PACER 费用闸门',
    pacerBudget: '未来 PACER 适配器预算上限（美元，仅记录）',
    pacerAutoDownload: '自动付费下载',
    disabledByDesign: '为防止意外费用，当前版本永久关闭；需要人工确认后再实现。',
    dataTitle: '本地数据与诊断',
    dataDirectory: '应用管理的文件目录（只读）',
    cacheDirectory: '应用管理的缓存目录（只读）',
    diagnosticTitle: '能力状态',
    diagnosticCopy: '普通设置保存在本机并在保存后生效；“已配置”只代表凭据存在。目录由应用管理，当前版本不支持在此迁移资料库。请使用每个来源的连接测试确认权限和接口可用性。',
    sourcePacer: 'PACER 正式案卷',
    sourceRecap: 'CourtListener / RECAP',
    sourceAi: '云端 AI 协议',
    sourceLocalAi: '本机 Ollama',
    sourcePublic: 'DOJ / SEC / Federal Register',
    sourceEpiq: 'Epiq 破产案卷',
    sourceLocalPdf: '本地 PDF 提取',
    sourceNfsc: 'NFSC 备用镜像',
    capabilityReady: '可用',
    capabilityCredentials: '凭证已存，待测试',
    capabilityNotImplemented: '尚未接入',
    capabilityNeedsSetup: '需要配置',
    capabilityLimited: '受限',
    capabilityError: '测试失败',
    capabilityNoKey: '无需 API Key',
    capabilityPacerDetail: 'PACER 是正式案卷来源，但当前版本只有加密凭证和费用闸门，尚无登录或下载适配器。',
    capabilityRecapDetail: '无需 Token 可读取 26 宗固定案卷的公开 Feed、结构化搜索结果和当前公开 RECAP PDF，并自动下载；Token 可增强完整案卷条目分页。PACER 仍是正式案卷。',
    capabilityAiDetail: '无 Key 时直接使用完整版内置的现行法律解读和案件总览；新增文件可先做本地结构化初读，且不会覆盖内置基线。可选择 Ollama、OpenAI、Anthropic、Gemini，或填写任意 OpenAI 兼容服务的模型 ID 和 Base URL。',
    capabilityPublicDetail: '公开机构网页和政策 API 直接抓取，不需要用户凭证。',
    capabilityEpiqDetail: '公开页面可访问；完整 docket JSON 适配器尚未接入。',
    capabilityLocalDetail: 'pdf-parse 提取文本层；扫描版 PDF 使用本地 Tesseract.js OCR 回退。PDF 和扫描页不会因此上传。',
    capabilityNfscDetail: '仅作缺口补充和交叉核验，不能替代 PACER 或 RECAP。',
    lastChecked: '最近测试',
    neverChecked: '尚未测试',
    diagnosticItems: '返回条目',
    settingsOverview: '总览',
    settingsCredentials: '凭证',
    settingsAiPrivacy: 'AI 与隐私',
    settingsAutomation: '自动化',
    settingsProcessing: '处理参数',
    settingsPacer: 'PACER',
    settingsData: '数据与诊断',
    localOnly: '本机服务',
    settingsNavLabel: '设置目录',
    saveBeforeTest: '请先保存新凭证，再测试连接。',
    providerPortal: '官方配置页',
    configuredCount: '已加密配置项',
    autoRefreshState: '自动刷新',
    noKeyMatrixTitle: '零密钥能力矩阵',
    noKeyCore: '核心本地模式',
    noKeyCoreDetail: '完整版直接提供当前全部资料、现有正文/译文、文件解读、案件整体解读和搜索数据。联网后只处理增量文件；本地初步输出与发布基线分层保存，不会覆盖或降低内置内容。',
    noKeyGenerative: '本机生成式增强',
    noKeyGenerativeDetail: '选择并启动 Ollama 后，无需付费 API Key 即可进行正文翻译、文件级和案件级生成式解读。程序不会静默下载多 GB 模型。',
    cloudEnhancement: '云端增强',
    cloudEnhancementDetail: '可选配置官方 AI 或 OpenAI 兼容中转服务；正文发送默认关闭，启用后仍不发送 PDF 文件或本地路径。最终质量取决于所选模型和服务商实现。',
    officialCompleteness: '正式案卷完整性',
    officialCompletenessDetail: 'PACER 是正式案卷，但当前适配器尚未实现；RECAP/官方来源可免费补充，NFSC 仅作备用。',
    activeNow: '当前可用',
    optionalSetup: '可选配置',
    adapterPending: '适配器待实现',
    enabled: '已开启',
    disabled: '已关闭',
    settingsSecurityNote: '无遥测、无远程数据库、无自动更新服务。配置文件只存普通参数；macOS 使用禁止认证界面的钥匙串密钥加密，Windows 使用 DPAPI。',
    sourcesStatus: '来源状态',
    sourceOverview: '来源总览',
    sourceOkShort: '正常',
    sourceActionShort: '需处理',
    sourceOfficialShort: 'PACER/RECAP',
    sourceAgencyShort: '官方机构',
    sourceMirrorShort: '备份镜像',
    officialFileCoverage: '正式案卷覆盖',
    sourceCredentialShort: '凭证缺口',
    sourcePrimaryHint: '正式案卷和已归档法院/机构来源优先；公开镜像只作备用。',
    sourceDiagnosticsLink: '查看全部来源诊断',
    navigationLabel: '案件导航',
    scopeLabel: '监控范围',
    metricsLabel: '核心指标',
    headerKicker: '案件情报工作台',
    headerTitle: '郭文贵 / G 系列 / 破产与资产追回监控',
    headerCopy: '最新事件、证据来源、交叉案件和政策背景分开呈现，避免把法院文件、官方指控、第三方申请和媒体叙事混为一谈。',
    timelineWorkspaceTitle: '最新案卷与法院进展',
    timelineWorkspaceCopy: '按时间核对最新文件、程序动作和原始来源，并查看当前事件的专业与通俗法律解读。',
    documentsWorkspaceTitle: '证据文件、翻译与法律解读',
    documentsWorkspaceCopy: '集中管理公开文件、本地正文提取、可核验覆盖范围的翻译、来源权威性和逐份律师式解读。',
    casesWorkspaceTitle: '案件组合与整体法律解读',
    casesWorkspaceCopy: '按案号梳理刑事、民事、监管、破产和资产追回程序，分开呈现案件阶段、控制性文件与案件级法律总览。',
    positionsWorkspaceTitle: '诉讼方动态与动议追踪',
    positionsWorkspaceCopy: '按案件、提交方和程序状态核对检方、辩方、法院及其他诉讼参与人的动议、回应和裁定，并保留原始文件依据。',
    entitiesWorkspaceTitle: '关联人物、机构与资产网络',
    entitiesWorkspaceCopy: '查看跨案件的人物、公司、基金与资产关系；关系只表示资料中的关联，不自动推定责任。',
    policyWorkspaceTitle: '美国政策与制度环境',
    policyWorkspaceCopy: '独立跟踪与案件相关的法律政策、执法制度和公开机构来源，避免把政策背景混同为个案事实。',
    calendarWorkspaceTitle: '案卷日期与期限核验',
    calendarWorkspaceCopy: '按时间整理已经发生的文件提交、命令和听证日期；只有明确标为法院期限的项目才可视为截止日，待核验与研究推算不能作为诉讼期限。',
    notRefreshed: '尚未执行在线刷新',
    latest: '最新',
    sources: '来源',
    refresh: '刷新',
    scope: ['纽约南区刑事主案', '第二巡回', 'SEC / Fair Fund', '康州破产案', 'G 系列实体'],
    metricEvents: '事件总数',
    metricEventsDetail: '种子库 + 在线抓取',
    metricCritical: '关键更新',
    metricCriticalDetail: '判决、上诉、没收',
    metricCases: '案件主线',
    metricCasesDetail: '刑事/SEC/破产',
    metricEntities: '人物实体',
    metricEntitiesDetail: '公司、资产、关联人',
    metricOfficial: '官方机构/法院',
    metricOfficialDetail: 'DOJ、SEC、PACER',
    metricAction: '需处理来源',
    metricActionDetail: '凭证、受限、错误',
    portfolio: '组合判断',
    timelineEyebrow: '案卷时间线',
    latestEvents: '最新进展',
    items: '条',
    search: '搜索 Doc、案号、实体、关键词',
    allCases: '全部案件',
    allTypes: '全部类型',
    externalSource: '原始来源',
    evidencePosture: '证据姿态',
    filingNo: '文件号',
    source: '来源',
    type: '类型',
    confidence: '可信度',
    aiAnalysis: '法律分析',
    activeCase: '所属案件',
    casePortfolio: '案件组合',
    casePortfolioEyebrow: '案件组合',
    docketNo: '案号',
    latestKnown: '最新',
    events: '事件',
    entityMap: '关联人、公司与资产线',
    entityEyebrow: '实体图谱',
    policyTitle: '美国政策与制度背景',
    policyEyebrow: '政策监控',
    calendarTitle: '案卷日期索引与正式期限核验',
    calendarEyebrow: '日期证据索引',
    calendarKnown: '已确认文件日期',
    calendarNeedsVerification: '待官方核验',
    calendarInferred: '研究推算，非正式期限',
    calendarBasis: '依据',
    sourceAudit: '来源审计',
    sourceAuditEyebrow: '来源审计',
    officialSourcePriority: '官方来源优先',
    lawyerRead: '律师解读',
    plainRead: '通俗解读',
    caseConnections: '案件关联',
    extractedSnippets: '正文片段',
    originalText: '原始正文',
    sourceTextPreserved: '证据正文按来源语言保留；它可能与当前界面语言不同，不会为了界面显示而改写。',
    translatedBody: '中文译文',
    evidenceCitations: '页码证据引用',
    aiConclusionCitations: '结论与页码依据',
    sourceMetadataCitation: '来源元数据',
    pageLabel: '第 {page} 页',
    textHash: '文本校验值',
    metadataOnly: '仅基于元数据',
    noCachedTranslation: '尚无缓存译文；运行深度处理后会在此显示。',
    aiCaseRead: 'AI 案件总览',
    localCaseRead: '本地规则总览',
    generatedAtLabel: '生成时间',
    evidenceCountLabel: '依据条目',
    overallRead: '整体案件解读',
    neutralMonitor: '监控范围与核验标准',
    neutralMonitorEyebrow: '自动监控',
    monitorDetails: '查看核验规则与自动化策略',
    documentPipeline: '文件翻译与 AI 队列',
    documentPipelineEyebrow: '自动处理',
    documentPipelineLoading: '加载文件分析队列',
    documentPipelineError: '文件分析队列加载失败',
    retry: '重试',
    documentLibrary: '本地文件库',
    documentLibraryEyebrow: '下载文件',
    localAvailable: '本地可用',
    downloaded: '已下载',
    collected: '已收集',
    downloadErrors: '失败',
    credentialsNeeded: '需凭证来源',
    manifestRoot: '目录',
    recentDocuments: '最近文件',
    blockedSources: '受限来源',
    openFile: '打开文件',
    fileUnavailable: '文件不可用',
    sourcePage: '来源页',
    noDocumentErrors: '没有下载失败记录',
    bytes: '大小',
    translatedMetadata: '元数据翻译',
    queuedForAi: '生成式 AI 已解读',
    highPriorityDocs: '高优先文件',
    bodyExtraction: '正文提取',
    neutrality: '中立边界',
    processingRules: '处理规则',
    processingDetails: '查看文件处理与来源规则',
    discoveryRules: '新案件发现',
    evidenceTiers: '证据层级',
    watchTopics: '监控主题',
    verification: '核验任务',
    fileSummary: '文件摘要',
    fullDocumentCatalog: '全量文件解读',
    catalogSearch: '搜索文号、标题、PDF 正文、译文或关键词',
    searchScope: '搜索范围',
    searchScopeAll: '全部内容',
    searchScopeOriginal: 'PDF 原文',
    searchScopeTranslation: '中英文译文',
    searchScopeAnalysis: '法律解读',
    searchScopeWeb: '来源网页',
    searchIndexReady: '本地全文索引',
    searchIndexRebuilding: '后台更新索引',
    searchCoverageComplete: '完整正文',
    searchCoveragePartial: '部分正文',
    searchCoverageMissing: '缺少正文',
    searchCoverageOcr: 'OCR 文件',
    searchNoResults: '没有找到符合当前关键词与筛选条件的文件。',
    searchQueryTruncated: '查询过长，已按前 240 个字符检索。',
    searchMatchDocket: '文号 / 案号',
    searchMatchTitle: '标题与元数据',
    searchMatchOriginal: 'PDF 原文',
    searchMatchTranslation: '正文译文',
    searchMatchAnalysis: '法律解读',
    searchMatchWeb: '来源网页',
    searchMatchPage: '第 {page} 页',
    searchMatchPages: '匹配页 {pages}',
    searchMatchComplete: '完整覆盖',
    searchMatchPartial: '部分覆盖',
    searchMatchAssistive: '辅助译文',
    searchOpenPage: '打开 PDF 命中页',
    allPriorities: '全部优先级',
    showingDocs: '显示文件',
    loadMore: '加载更多',
    analyzeDocument: '生成解读',
    analyzingDocument: '分析中',
    analysisDialogTitle: '法律文件解读',
    analysisDialogEyebrow: '文件级法律分析',
    analysisDialogLoading: '正在提取正文并生成专业与通俗解读',
    closeDialog: '关闭弹窗',
    pdfReaderTitle: '程序内 PDF 阅读器',
    pdfReaderEyebrow: '本地证据文件',
    pdfLoading: '正在从本地资料库读取 PDF',
    pdfLoadError: '无法读取本地 PDF',
    pdfLoadTimeout: 'PDF 读取超时（45 秒）。',
    pdfInvalidResponse: '本地资料库返回的文件不是有效 PDF。',
    pdfPage: '页',
    previousPage: '上一页',
    nextPage: '下一页',
    zoomOut: '缩小',
    zoomIn: '放大',
    managedLibraryCopy: '文件由程序内置资料库或本机可写资料库提供，并保留原始来源链接。',
    translation: '翻译',
    aiQueue: 'AI 队列',
    securityAudit: '开源安全',
    securityAuditEyebrow: '透明审计',
    securityCopy: '无遥测、无远程数据库、无自动更新服务；外联域名由源码白名单控制，打包前运行安全检查。',
    securityChecks: ['源码可审计', '网络白名单', '本地缓存隔离', 'AI 默认只处理元数据/片段'],
    analysisLoading: '生成结构化分析',
    changed: '变化',
    meaning: '意义',
    procedure: '程序状态',
    risks: '风险标记',
    next: '下一步',
    linkSources: '外部来源',
    intelligenceBoard: '态势雷达',
    intelligenceBoardEyebrow: '可视化工作台',
    activityTrend: '近期活动',
    documentMix: '文件类型分布',
    sourceAuthority: '来源权威分布',
    priorityLoad: '优先级负载',
    automationMap: '自主处理流水线',
    automationConsole: '自动处理控制台',
    automationConsoleEyebrow: '本机作业',
    automationIdle: '等待启动',
    automationRunning: '后台运行中',
    automationComplete: '处理完成',
    automationCompleteWithGaps: '完成但有缺口',
    automationFailed: '处理失败',
    automationInterrupted: '上次任务中断',
    automationStartDeep: '启动深度处理',
    automationStartFull: '启动全量处理',
    automationStarting: '启动中',
    automationUpdated: '更新',
    automationLogs: '运行日志',
    automationOutput: '处理产出',
    automationOutputScope: '以下数字仅代表最近一次增量任务，不代表安装包内置资料、译文或解读总量。',
    automationScope: '处理范围',
    automationDeepDetail: '深度模式优先处理高优先文件，适合日常联网刷新、翻译和法律解读。',
    automationFullDetail: '全量模式会遍历所有公开文件，适合长时间联网和 API key 已配置的环境。',
    automationCapabilityTitle: '完整版直接可用，联网只补增量',
    automationCapabilityDetail: '安装包已内置发布基线的全部 PDF、当前正文/译文、文件解读、案件整体解读、审计和搜索数据；无 Key 用户不会重新爬取或重新生成历史库。联网后只下载、校验和整理新增文件，本地初步结果不会覆盖内置基线。配置本机 Ollama，或填写官方/兼容云端 Key、模型 ID 并授权发送提取正文后，可为新增文件获得完整生成式翻译和解读；质量与模型能力直接相关。CourtListener Token 只增强 RECAP 覆盖。',
    pacerBoundary: 'PACER 是正式案卷来源；本程序不会绕过凭证、费用或法院访问规则。',
    translatedText: '已翻译正文',
    sourceAlreadyTargetLanguage: '原文已是目标语言',
    assistiveTranslation: '词表辅助阅读',
    partialBodyTranslation: '部分正文译文',
    redactedBodyTranslation: '完整页数脱敏译文',
    aiReadsDone: 'AI 解读',
    localRuleReadsDone: '本地规则解读',
    caseReadsDone: '本地规则案件总览',
    caseAiReadsDone: 'AI 案件总览',
    deferredDownloads: '待后续增量下载',
    automationBlockers: '待接入能力',
    relationshipMap: '案件关系图',
    caseMatrix: '案件矩阵',
    caseDossiers: '案件整体解读',
    openCaseDossier: '查看完整案件解读',
    caseDossierDialogEyebrow: '案件级法律研究',
    casePlainExplanation: '通俗解读',
    caseAnalogy: '帮助理解',
    caseProfessionalAnalysis: '专业法律分析',
    caseEvidenceDossier: '证据化案件总览',
    caseAnalogyBoundary: '类比只用于解释程序结构，不代表法院结论，也不能用于预测结果。',
    controllingDocs: '关键文件',
    unresolvedIssues: '未闭合问题',
    eventsShort: '事件',
    docsShort: '文件',
    highPriorityShort: '高优先',
    sourceGapsShort: '来源缺口',
    maxValue: '峰值',
    noChartData: '暂无可视化数据',
    chartActivityInsight: '蓝色为案件事件，绿色为文件数量；高峰月份代表需要集中复核的案卷活动。',
    chartDocumentInsight: '按文件性质归类，帮助先定位判决、命令、量刑、上诉和没收等关键材料。',
    chartSourceInsight: '左侧看来源分布，右侧看证据层级；PACER/RECAP 优先，NFSC 仅作备份镜像。',
    chartPriorityInsight: '关键和高优先文件先进入下载、翻译和法律解读队列，低优先主要用于背景归档。',
    chartAutomationInsight: '展示从发现新文件到案件总览重建的本机处理链路，以及仍需凭证或 API 的环节。',
    chartRelationshipInsight: '左侧选择案件或实体，中间只显示当前节点的直接连接，右侧列出关系性质；点击相邻节点可继续追踪。',
    chartEvents: '案件事件',
    chartDocuments: '文件数量',
    sourceListLabel: '来源列表',
    evidenceTierLabel: '证据层级',
    citeReady: '可优先引用',
    needsVerification: '需补充核验',
    sourceReliabilityNote: '数量不等于真实性强弱；正式案卷和已归档法院文件优先。',
    priorityShare: '占比',
    priorityCriticalHint: '判决、上诉、量刑、没收等会改变案件位置。',
    priorityHighHint: '动议、关键命令、正式通知，影响下一步判断。',
    priorityMediumHint: '程序性更新或辅助材料，适合批量复核。',
    priorityLowHint: '背景归档与镜像资料，通常排在后处理。',
    graphCases: '案件节点',
    graphEntities: '实体节点',
    graphMainLinks: '主要关联',
    noRelationshipLinks: '暂无关系数据',
    switchToLight: '切换到浅色模式',
    switchToDark: '切换到深色模式',
    themeLabel: '外观模式',
    lightTheme: '浅色',
    darkTheme: '深色',
    metricRecent: '近 7 日变化',
    metricRecentDetail: '以资料库最新日期为基准',
    metricVerify: '待官方核验',
    metricVerifyDetail: '镜像文件需由 PACER/RECAP 复核',
    metricAiBacklog: '待法律解读',
    metricAiBacklogDetail: '本地文件中尚无缓存规则或生成式法律解读',
    metricDeadline: '期限待核验',
    metricDeadlineDetail: '不得作为最终截止日依赖',
    metricOpenIssues: '开放法律问题',
    metricOpenIssuesDetail: '跨案件仍待文件回答',
    metricBlocked: '受限信息源',
    metricBlockedDetail: '凭证、限流或适配器缺口',
    documentTabFiles: '文件',
    documentTabReview: '复核队列',
    documentTabAudit: '覆盖审计',
    documentTabAnalytics: '分析图表',
    documentTabAutomation: '自动处理',
    documentTabsLabel: '文件工作区',
    documentFilesSummary: '搜索、阅读并核验已归档法院文件和本机资料。',
    documentReviewSummary: '集中处理待翻译、待法律解读和来源待核验文件。',
    documentAuditSummary: '逐案号核对公开案卷、文件落地、来源权威性、哈希一致性和自动发现候选。',
    documentAnalyticsSummary: '查看活动量、来源权威性、文件性质和处理优先级。',
    documentAutomationSummary: '运行联网抓取、下载、正文提取、翻译和案件总览重建。',
    caseStage: '程序阶段',
    latestControllingDoc: '最新关键文件',
    nextQuestion: '下一核验问题',
    aiDossierUpdated: '案件总览更新',
    relationshipDisclaimer: '图中连线只表示资料记录的关联，不代表责任、控制或违法结论。',
    selectedEntity: '当前节点',
    relationshipCount: '关联数',
    clearSelection: '显示全部',
    policyArea: '政策领域',
    allPolicyAreas: '全部政策领域',
    monitorTermsLabel: '监控词',
    calendarFilterAll: '全部',
    calendarCaseFilter: '案件筛选',
    noCalendarItems: '没有符合筛选条件的日期。',
    positionsEyebrow: '诉讼动作索引',
    positionsTitle: '动议、回应与法院裁定',
    positionsTotal: '已索引动作',
    positionsExplicit: '提交方明确',
    positionsResolved: '法院已处理',
    positionsVerify: '待官方核验',
    positionsSearch: '搜索文件、动议、案号或关键词',
    allRoles: '全部诉讼方',
    allActions: '全部动作',
    allStatuses: '全部状态',
    newestFirst: '时间：最新优先',
    oldestFirst: '时间：最早优先',
    positionsShowing: '显示动态',
    positionsDetails: '动作与证据详情',
    recordedAction: '已记录动作',
    proceduralStatusLabel: '程序状态',
    identificationBasis: '角色识别依据',
    sourceAuthorityLabel: '来源权威性',
    primaryRecord: '官方法院 / RECAP',
    verificationRequired: '需 PACER / RECAP 核验',
    openOriginalFiling: '打开原始文件',
    noPositionActions: '没有符合当前筛选条件的诉讼动态。',
    positionNotOutcome: '动作记录不等于法院接受该方主张，也不代表案件胜负。',
    auditTitle: '逐案卷完整性与缺口审计',
    auditEyebrow: '可重复核验',
    auditNotComplete: '当前结果不能证明所有案件或文件绝对齐全',
    auditRefresh: '重新联网核验',
    auditRefreshing: '正在核验',
    auditTrackedDockets: '独立跟踪案卷',
    auditObservedDockets: '本次观测案卷',
    auditObservedEntries: '观测到的条目',
    auditLocalFiles: '本地文件',
    auditOfficialFiles: 'PACER / RECAP 本地文件',
    auditMetadataOnly: '仅元数据条目',
    auditPublicPdfMissing: '公开 PDF 未落地',
    auditDownloadErrors: '待关系核验文件',
    auditDocketTable: '独立案卷核对表',
    auditDiscoveryCandidates: '自动发现候选',
    auditLikelyFalseMatches: '已隔离的可能误匹配',
    auditIntegrity: '文件完整性',
    auditMethodology: '核验方法与访问边界',
    auditCourt: '法院',
    auditDocket: '案号',
    auditStatus: '状态',
    auditObserved: '观测条目',
    auditOfficialLocal: '正式/RECAP 本地',
    auditGaps: '缺口',
    auditLatest: '最近观测',
    auditOpenDocket: '打开案卷',
    auditNoCandidates: '本次搜索没有新的待核验候选。',
    auditManifestDigest: 'Manifest 摘要',
    auditHashedFiles: '已哈希文件',
    auditUnhashedFiles: '未哈希文件',
    auditDuplicateGroups: '重复内容组',
    auditHashConflicts: '跨来源哈希冲突',
	    auditGenerated: '报告生成时间',
	    auditSearchTerms: '搜索规则',
	    auditCandidateNotice: '候选只表示相关性线索，必须核对案卷首页、当事人和文件后才能升级为已跟踪案件。',
	    relationshipAuditTitle: '关系归属核验',
	    relationshipAuditCopy: '按公开案名、当事人、案卷元数据和本地文件来源区分正式跟踪、发现关联、资产追回、服务商/第三方和已排除误匹配；不把程序性关系自动推断成控制、所有权或责任。',
	    relationshipAuditUnavailable: '关系归属核验暂未生成',
	    relationshipType: '关系类型',
	    relationshipStatus: '核验状态',
	    relationshipConfidence: '关系可信度',
	    relationshipEvidence: '关系证据',
	    relationshipControlWarning: '控制权警示',
	    relationshipFiles: '文件处理',
	    relationshipExtracted: '已提取',
	    relationshipTranslated: '已翻译',
	    relationshipAiAnalyzed: 'AI 已解读',
	    relationshipPending: '待人工核验',
	    relationshipProbable: '较可能关系',
	    relationshipVerified: '已核实公开关系',
	    relationshipExcluded: '已排除',
	    formalTrackedCases: '正式跟踪案卷',
	    discoveredRelatedDockets: '发现关联案卷',
	    relationshipReviewQueue: '重点核验清单',
	    relationshipSourceLimitations: '来源边界',
	    relationshipOpenDocket: '打开案卷来源',
	    relationshipNoEvidence: '暂无可展示证据',
	    relationshipNoTasks: '暂无额外核验任务',
	    relationshipMirrorWarning: '镜像资料必须与 PACER / RECAP 或官方来源交叉核验后再引用。',
	  },
  en: {
    loading: 'Loading case intelligence',
    apiError: 'Cannot connect to local API',
    brand: 'Docket Observatory',
    brandEyebrow: 'Case Command',
    navLatest: 'Latest docket',
    navCases: 'Case portfolio',
    navPositions: 'Party activity',
    navEntities: 'Entity map',
    navPolicy: 'Policy radar',
    navCalendar: 'Calendar',
    navDocuments: 'Evidence library',
    navSettings: 'Settings',
    settingsTitle: 'Local settings',
    settingsEyebrow: 'Configuration and security',
    settingsCopy: 'Manage source access, AI, translation, automation, and local privacy. Secrets stay in encrypted local storage and are never returned to the UI in full.',
    backHome: 'Back to home',
    saveSettings: 'Save settings',
    saved: 'Saved',
    saving: 'Saving',
    settingsLoadError: 'Settings failed to load',
    settingsSaveError: 'Settings failed to save',
    credentialsTitle: 'Source and API credentials',
    credentialsCopy: 'PACER, RECAP, and AI are optional. PACER credentials are reserved for a future fee-aware adapter; the app never bypasses login or auto-pays for downloads.',
    openaiKey: 'OpenAI API key',
    anthropicKey: 'Anthropic API key',
    geminiKey: 'Google Gemini API key',
    compatibleKey: 'Compatible gateway API key',
    courtlistenerToken: 'CourtListener / RECAP token',
    pacerUsername: 'PACER username',
    pacerPassword: 'PACER password',
    pacerClientCode: 'PACER client code (optional)',
    configured: 'Configured',
    notConfigured: 'Not configured',
    secureStorage: 'OS-encrypted storage',
    environmentStorage: 'Environment fallback',
    secureStorageUnavailable: 'OS-encrypted storage is unavailable here; configure secrets through the macOS or Windows Electron desktop build.',
    secureStorageDenied: 'OS-encrypted storage is temporarily unavailable and no credential was saved. The app does not display an operating-system authentication prompt; ordinary settings and no-key features remain available. Restart the app to try again.',
    secureStorageCorrupt: 'The encrypted credential vault could not be read. The app did not overwrite it; inspect or reset the vault with publisher guidance.',
    clearCredential: 'Clear',
    deleteCredential: 'Delete',
    undoDelete: 'Undo delete',
    cancelCredentialChange: 'Cancel change',
    pendingCredentialAdd: 'Pending add',
    pendingCredentialReplace: 'Pending replace',
    pendingCredentialDelete: 'Pending deletion',
    enterCredentialReplacement: 'Enter a new value to replace it',
    discardCredentialChanges: 'Discard credential changes',
    deleteAllLocalCredentials: 'Delete all local credentials',
    credentialControlDetail: 'Credentials are user-controlled. Saving commits additions, replacements, or deletions in encrypted local storage. Environment variables must be changed in the launch environment.',
    environmentManagedExternally: 'Managed by the launch environment; enter a local value to override it',
    showCredential: 'Show',
    hideCredential: 'Hide',
    testConnection: 'Test connection',
    testingConnection: 'Testing',
    connectionPassed: 'Connection passed',
    connectionFailed: 'Connection failed',
    testAi: 'Test AI',
    aiTitle: 'AI and translation',
    aiProvider: 'AI provider',
    localRules: 'Local rules (no outbound AI)',
    localOllama: 'Local Ollama (optional, no cloud)',
    localAiBaseUrl: 'Local AI URL',
    localAiModel: 'Local model name',
    localAiTimeout: 'Local AI timeout (ms)',
    localAiContext: 'Local AI context characters',
    localAiDetail: 'Ollama is allowed only on localhost / 127.0.0.1. If it is not installed or running, the app falls back to deterministic local rules.',
    openai: 'OpenAI (optional)',
    anthropic: 'Anthropic Claude (optional)',
    gemini: 'Google Gemini (optional)',
    openaiCompatible: 'OpenAI-compatible gateway',
    noCloudTranslation: 'Local assistive translation (default)',
    localTranslationDetail: 'The complete edition starts with the translations and reading aids bundled in the release baseline. New files receive clearly labeled preliminary reading assistance when no generative provider is active; it never overwrites or downgrades the bundled baseline. Ollama, official cloud models, or compatible gateways can generate fuller body translations.',
    aiModel: 'Legal-analysis model ID',
    translationModel: 'Body-translation model ID',
    compatibleAiBaseUrl: 'Compatible API base URL',
    compatibleAiDetail: 'For gateways, self-hosted services, and model platforms that implement OpenAI-compatible /chat/completions. Remote endpoints must use HTTPS; local endpoints may use HTTP. Enter the API root supplied by the provider.',
    aiReasoningEffort: 'Legal-analysis reasoning effort',
    reasoningNone: 'None (fastest)',
    reasoningLow: 'Low (fast)',
    reasoningMedium: 'Medium (faster)',
    reasoningHigh: 'High (recommended)',
    reasoningXHigh: 'Extra high (deeper)',
    reasoningMax: 'Maximum (slowest)',
    reasoningDetail: 'Reasoning effort applies only to models that support this parameter. Higher effort generally takes longer and uses more API resources. Other providers ignore this option; translation and connection tests do not use deep reasoning.',
    modelQualityDetail: 'The app supports protocols and user-supplied model IDs; it does not imply equal capability across models. Translation fidelity, legal reasoning, long-document coverage, citation stability, speed, and cost depend on model capability, context length, reasoning mode, provider compatibility, and account limits. Smaller models or incomplete gateways may omit text, mistranslate legal terms, or produce unstable citations. AI output is research assistance, not formal legal advice.',
    translationProvider: 'Translation provider',
    aiPrivacy: 'Allow extracted body text to cloud AI',
    aiPrivacyDetail: 'This controls every cloud AI provider and compatible gateway. When off, cloud reads are metadata-only and cloud body translation is disabled; loopback Ollama may still read locally extracted text. PDF files and local paths are never uploaded.',
    aiDataBoundary: 'Official OpenAI requests use store:false. Anthropic, Gemini, and gateway retention follow the selected provider policy. Ollama is restricted to loopback, and secrets are never returned to the renderer. AI output is research assistance, not formal legal advice.',
    aiRedaction: 'Redact sensitive data before sending',
    aiRedactionDetail: 'Masks emails, U.S. Social Security numbers, common phone formats, and account/routing identifiers by default. Local source text is unchanged. Automated detection cannot identify every personal detail, so review remains necessary.',
    automationTitle: 'Automatic refresh and processing',
    autoRefresh: 'Refresh sources when online',
    refreshInterval: 'Refresh interval (minutes)',
    networkRetry: 'Retry after network failure (minutes)',
    autoProcess: 'Download, translate, and analyze public files after refresh',
    automaticScope: 'Automatic processing scope',
    automaticLimit: 'New downloads/files per routine run',
    automaticScopePriority: 'Priority files (recommended)',
    automaticScopeAll: 'All public files',
    automaticScopePriorityDetail: 'Process high-value materials after refresh for routine monitoring and controlled API use.',
    automaticScopeAllDetail: 'Process every downloadable file after refresh; this can take much longer and use more translation and AI requests.',
    includeTranslation: 'Translate document text automatically',
    includeAi: 'Generate document and case-level reads automatically',
    automationLanguage: 'Background output language',
    automationBoth: 'Chinese and English (recommended)',
    automationChinese: 'Chinese only',
    automationEnglish: 'English only',
    processingTitle: 'Processing performance and limits',
    localOcr: 'Local OCR fallback',
    localOcrDetail: 'When a scanned PDF has no text layer, bundled Tesseract.js recognizes English and Chinese locally. Scanned pages are not uploaded.',
    ocrPages: 'Maximum OCR pages per scanned PDF',
    pdfPages: 'Maximum pages extracted per file',
    pdfChars: 'Maximum characters extracted per file',
    translationChunk: 'Translation chunk size',
    downloadConcurrency: 'Parallel downloads',
    timeout: 'Request timeout (ms)',
    retries: 'Retry count',
    downloadMaxSize: 'Maximum download size per file (MB)',
    pdfMaxSize: 'Maximum PDF parsing size (MB)',
    integrityMode: 'File integrity verification',
    integrityChanged: 'Full hash when changed (recommended)',
    integrityFull: 'Full hash on every refresh (slower)',
    integrityRemote: 'Re-download and compare remote copies (strictest)',
    pacerTitle: 'PACER fee guard',
    pacerBudget: 'Future PACER adapter budget cap (USD, stored only)',
    pacerAutoDownload: 'Automatic paid downloads',
    disabledByDesign: 'Permanently disabled in this version to prevent surprise charges; any future implementation requires explicit confirmation.',
    dataTitle: 'Local data and diagnostics',
    dataDirectory: 'App-managed document directory (read-only)',
    cacheDirectory: 'App-managed cache directory (read-only)',
    diagnosticTitle: 'Capability status',
    diagnosticCopy: 'Ordinary settings are stored locally and take effect after saving; configured only means a credential exists. Directories are app-managed, and this version does not migrate the library from this screen. Use each source test to confirm permission and endpoint availability.',
    sourcePacer: 'PACER docket of record',
    sourceRecap: 'CourtListener / RECAP',
    sourceAi: 'Cloud AI protocols',
    sourceLocalAi: 'Local Ollama',
    sourcePublic: 'DOJ / SEC / Federal Register',
    sourceEpiq: 'Epiq bankruptcy docket',
    sourceLocalPdf: 'Local PDF extraction',
    sourceNfsc: 'NFSC backup mirror',
    capabilityReady: 'Available',
    capabilityCredentials: 'Credentials saved; test needed',
    capabilityNotImplemented: 'Not implemented',
    capabilityNeedsSetup: 'Setup required',
    capabilityLimited: 'Limited',
    capabilityError: 'Test failed',
    capabilityNoKey: 'No API key required',
    capabilityPacerDetail: 'PACER is the docket of record, but this build has only encrypted credentials and fee guards; login and download adapters are not implemented.',
    capabilityRecapDetail: 'Without a token, the app reads public feeds and structured search for 26 fixed dockets, discovers the currently exposed RECAP PDFs, and downloads them. A token adds full docket-entry pagination; PACER remains the docket of record.',
    capabilityAiDetail: 'Without a key, the complete edition uses its bundled current legal reads and case dossiers. New files may receive a preliminary local structured read without overwriting the bundled baseline. Select Ollama, OpenAI, Anthropic, Gemini, or supply any OpenAI-compatible service model ID and base URL.',
    capabilityPublicDetail: 'Public agency pages and the policy API are fetched without user credentials.',
    capabilityEpiqDetail: 'The public shell is reachable; full docket JSON extraction is not implemented.',
    capabilityLocalDetail: 'pdf-parse reads text layers; bundled local Tesseract.js handles scanned PDFs. Neither PDFs nor scanned pages are uploaded.',
    capabilityNfscDetail: 'Gap-filling and cross-checking only; it never replaces PACER or RECAP.',
    lastChecked: 'Last tested',
    neverChecked: 'Never tested',
    diagnosticItems: 'Items returned',
    settingsOverview: 'Overview',
    settingsCredentials: 'Credentials',
    settingsAiPrivacy: 'AI and privacy',
    settingsAutomation: 'Automation',
    settingsProcessing: 'Processing',
    settingsPacer: 'PACER',
    settingsData: 'Data and diagnostics',
    localOnly: 'Local service',
    settingsNavLabel: 'Settings sections',
    saveBeforeTest: 'Save the new credential before testing it.',
    providerPortal: 'Official setup page',
    configuredCount: 'Encrypted fields saved',
    autoRefreshState: 'Automatic refresh',
    noKeyMatrixTitle: 'No-key capability matrix',
    noKeyCore: 'Core local mode',
    noKeyCoreDetail: 'The complete edition immediately provides the current files, text and translation data, document reads, case dossiers, and search data. Online runs process only incremental files; preliminary local output is stored separately and never overwrites or downgrades the bundled baseline.',
    noKeyGenerative: 'Local generative enhancement',
    noKeyGenerativeDetail: 'Select and start Ollama for body translation and generative document/case reads without a paid API key. The app never silently downloads a multi-GB model.',
    cloudEnhancement: 'Cloud enhancement',
    cloudEnhancementDetail: 'Official AI providers and OpenAI-compatible gateways are optional. Body transmission is off by default, and PDF files or local paths are never sent. Final quality depends on the selected model and provider implementation.',
    officialCompleteness: 'Official docket completeness',
    officialCompletenessDetail: 'PACER is the docket of record, but its adapter is not implemented. RECAP and official sources provide free coverage; NFSC is backup only.',
    activeNow: 'Available now',
    optionalSetup: 'Optional setup',
    adapterPending: 'Adapter pending',
    enabled: 'Enabled',
    disabled: 'Disabled',
    settingsSecurityNote: 'No telemetry, remote database, or auto-update service. Plain settings stay local; macOS uses a no-authentication-UI Keychain key and Windows uses DPAPI.',
    sourcesStatus: 'Source status',
    sourceOverview: 'Source overview',
    sourceOkShort: 'OK',
    sourceActionShort: 'Action',
    sourceOfficialShort: 'PACER/RECAP',
    sourceAgencyShort: 'Official agency',
    sourceMirrorShort: 'Backup mirror',
    officialFileCoverage: 'Docket-of-record coverage',
    sourceCredentialShort: 'Access',
    sourcePrimaryHint: 'Docket-of-record and archived court/agency sources first; public mirrors stay secondary.',
    sourceDiagnosticsLink: 'View all source diagnostics',
    navigationLabel: 'Case navigation',
    scopeLabel: 'Monitoring scope',
    metricsLabel: 'Core metrics',
    headerKicker: 'Case intelligence workbench',
    headerTitle: 'Guo / G-Series / Bankruptcy and Asset Recovery Monitor',
    headerCopy: 'Events, evidence sources, linked proceedings, and policy context are separated so court filings, agency allegations, third-party petitions, and commentary are not mixed together.',
    timelineWorkspaceTitle: 'Latest docket and court developments',
    timelineWorkspaceCopy: 'Review recent filings, procedural moves, and original sources in time order, with professional and plain-language legal analysis for the selected event.',
    documentsWorkspaceTitle: 'Evidence, translation, and legal reads',
    documentsWorkspaceCopy: 'Manage public files, local text extraction, translation with verifiable coverage, source authority, and document-by-document lawyer-style analysis in one workspace.',
    casesWorkspaceTitle: 'Case portfolio and overall legal reads',
    casesWorkspaceCopy: 'Organize criminal, civil, regulatory, bankruptcy, and asset-recovery proceedings by docket, with stages, controlling documents, and case-level legal dossiers.',
    positionsWorkspaceTitle: 'Litigation positions and motion tracking',
    positionsWorkspaceCopy: 'Review motions, responses, and rulings by matter, filer, and procedural status across prosecution, defense, courts, and other participants, with links to the underlying record.',
    entitiesWorkspaceTitle: 'People, organizations, and asset network',
    entitiesWorkspaceCopy: 'Review cross-case links among people, companies, funds, and assets. A displayed link records an association in the materials and does not itself establish liability.',
    policyWorkspaceTitle: 'U.S. policy and institutional context',
    policyWorkspaceCopy: 'Track relevant legal policy, enforcement institutions, and public-agency sources separately from adjudicated facts in individual proceedings.',
    calendarWorkspaceTitle: 'Docket dates and deadline verification',
    calendarWorkspaceCopy: 'Index past filing, order, and hearing dates separately from operative deadlines. Only an item explicitly identified as a court deadline should be treated as a cutoff.',
    notRefreshed: 'No online refresh yet',
    latest: 'Latest',
    sources: 'Sources',
    refresh: 'Refresh',
    scope: ['SDNY criminal case', 'Second Circuit', 'SEC / Fair Fund', 'D. Conn. Bankruptcy', 'G-Series entities'],
    metricEvents: 'Events',
    metricEventsDetail: 'Seed library + live fetch',
    metricCritical: 'Critical updates',
    metricCriticalDetail: 'Judgment, appeal, forfeiture',
    metricCases: 'Case tracks',
    metricCasesDetail: 'Criminal / SEC / bankruptcy',
    metricEntities: 'Entities',
    metricEntitiesDetail: 'Companies, assets, people',
    metricOfficial: 'Official agency/court',
    metricOfficialDetail: 'DOJ, SEC, PACER',
    metricAction: 'Source gaps',
    metricActionDetail: 'Credentials, limited, errors',
    portfolio: 'Portfolio read',
    timelineEyebrow: 'Docket timeline',
    latestEvents: 'Latest developments',
    items: 'items',
    search: 'Search doc, docket, entity, keyword',
    allCases: 'All cases',
    allTypes: 'All types',
    externalSource: 'External source',
    evidencePosture: 'Evidence posture',
    filingNo: 'Filing no.',
    source: 'Source',
    type: 'Type',
    confidence: 'Confidence',
    aiAnalysis: 'Legal analysis',
    activeCase: 'Case track',
    casePortfolio: 'Case portfolio',
    casePortfolioEyebrow: 'Case portfolio',
    docketNo: 'Docket',
    latestKnown: 'Latest',
    events: 'Events',
    entityMap: 'People, companies, and asset lines',
    entityEyebrow: 'Entity map',
    policyTitle: 'U.S. policy and legal context',
    policyEyebrow: 'Policy watch',
    calendarTitle: 'Docket date index and formal deadline verification',
    calendarEyebrow: 'Date evidence index',
    calendarKnown: 'Confirmed filing dates',
    calendarNeedsVerification: 'Official verification needed',
    calendarInferred: 'Research estimate, not a deadline',
    calendarBasis: 'Basis',
    sourceAudit: 'Source audit',
    sourceAuditEyebrow: 'Source audit',
    officialSourcePriority: 'Official source priority',
    lawyerRead: 'Lawyer read',
    plainRead: 'Plain-language read',
    caseConnections: 'Case connections',
    extractedSnippets: 'Body snippets',
    originalText: 'Original text',
    sourceTextPreserved: 'Evidence text is preserved in its source language. It may differ from the interface language and is not rewritten for display.',
    translatedBody: 'Translated text',
    evidenceCitations: 'Page citations',
    aiConclusionCitations: 'Findings and page support',
    sourceMetadataCitation: 'Source metadata',
    pageLabel: 'Page {page}',
    textHash: 'Text hash',
    metadataOnly: 'Metadata only',
    noCachedTranslation: 'No cached translation yet. Run deep processing to generate it.',
    aiCaseRead: 'AI case dossier',
    localCaseRead: 'Local-rule dossier',
    generatedAtLabel: 'Generated',
    evidenceCountLabel: 'Evidence items',
    overallRead: 'Overall case read',
    neutralMonitor: 'Monitoring scope and verification standards',
    neutralMonitorEyebrow: 'Automated monitoring',
    monitorDetails: 'View verification rules and automation policy',
    documentPipeline: 'Document translation and AI queue',
    documentPipelineEyebrow: 'Automated processing',
    documentPipelineLoading: 'Loading document analysis queue',
    documentPipelineError: 'Document analysis queue failed to load',
    retry: 'Retry',
    documentLibrary: 'Document library',
    documentLibraryEyebrow: 'Downloaded files',
    localAvailable: 'Local files',
    downloaded: 'Downloaded',
    collected: 'Collected',
    downloadErrors: 'Errors',
    credentialsNeeded: 'Credential-gated',
    manifestRoot: 'Root',
    recentDocuments: 'Recent files',
    blockedSources: 'Gated sources',
    openFile: 'Open file',
    fileUnavailable: 'File unavailable',
    sourcePage: 'Source page',
    noDocumentErrors: 'No download errors',
    bytes: 'Size',
    translatedMetadata: 'Metadata translated',
    queuedForAi: 'Generative AI reads',
    highPriorityDocs: 'High-priority docs',
    bodyExtraction: 'Body extraction',
    neutrality: 'Neutrality boundary',
    processingRules: 'Processing rules',
    processingDetails: 'View document processing and source rules',
    discoveryRules: 'New-case discovery',
    evidenceTiers: 'Evidence tiers',
    watchTopics: 'Watch topics',
    verification: 'Verification tasks',
    fileSummary: 'File summary',
    fullDocumentCatalog: 'Full document catalog',
    catalogSearch: 'Search docket no., title, PDF text, translation, or keyword',
    searchScope: 'Search scope',
    searchScopeAll: 'All content',
    searchScopeOriginal: 'Original PDF',
    searchScopeTranslation: 'Translations',
    searchScopeAnalysis: 'Legal analysis',
    searchScopeWeb: 'Source pages',
    searchIndexReady: 'Local full-text index',
    searchIndexRebuilding: 'Updating index',
    searchCoverageComplete: 'Complete text',
    searchCoveragePartial: 'Partial text',
    searchCoverageMissing: 'Missing text',
    searchCoverageOcr: 'OCR files',
    searchNoResults: 'No documents match the current query and filters.',
    searchQueryTruncated: 'The query was truncated to 240 characters.',
    searchMatchDocket: 'Docket / document no.',
    searchMatchTitle: 'Title and metadata',
    searchMatchOriginal: 'Original PDF',
    searchMatchTranslation: 'Body translation',
    searchMatchAnalysis: 'Legal analysis',
    searchMatchWeb: 'Source page',
    searchMatchPage: 'Page {page}',
    searchMatchPages: 'Pages {pages}',
    searchMatchComplete: 'Complete coverage',
    searchMatchPartial: 'Partial coverage',
    searchMatchAssistive: 'Assistive translation',
    searchOpenPage: 'Open matching PDF page',
    allPriorities: 'All priorities',
    showingDocs: 'Showing documents',
    loadMore: 'Load more',
    analyzeDocument: 'Generate read',
    analyzingDocument: 'Analyzing',
    analysisDialogTitle: 'Legal document analysis',
    analysisDialogEyebrow: 'Document-level legal analysis',
    analysisDialogLoading: 'Extracting text and preparing professional and plain-language analysis',
    closeDialog: 'Close dialog',
    pdfReaderTitle: 'In-app PDF reader',
    pdfReaderEyebrow: 'Local evidence file',
    pdfLoading: 'Loading the PDF from the managed local library',
    pdfLoadError: 'The local PDF could not be opened',
    pdfLoadTimeout: 'PDF loading timed out after 45 seconds.',
    pdfInvalidResponse: 'The managed library response is not a valid PDF.',
    pdfPage: 'Page',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    managedLibraryCopy: 'The file is provided by the bundled or writable managed library and retains its original source link.',
    translation: 'Translation',
    aiQueue: 'AI queue',
    securityAudit: 'Open-source security',
    securityAuditEyebrow: 'Transparency audit',
    securityCopy: 'No telemetry, no remote database, no auto-update service; outbound hosts are controlled by a source-code allowlist, and security checks run before packaging.',
    securityChecks: ['Auditable source', 'Network allowlist', 'Local cache isolation', 'AI metadata/snippet default'],
    analysisLoading: 'Generating structured analysis',
    changed: 'What changed',
    meaning: 'Why it matters',
    procedure: 'Procedural status',
    risks: 'Risk flags',
    next: 'Next steps',
    linkSources: 'External sources',
    intelligenceBoard: 'Situation Radar',
    intelligenceBoardEyebrow: 'Visual workbench',
    activityTrend: 'Recent activity',
    documentMix: 'Document mix',
    sourceAuthority: 'Source authority',
    priorityLoad: 'Priority load',
    automationMap: 'Autonomous pipeline',
    automationConsole: 'Automation console',
    automationConsoleEyebrow: 'Local job runner',
    automationIdle: 'Idle',
    automationRunning: 'Running in background',
    automationComplete: 'Complete',
    automationCompleteWithGaps: 'Complete with gaps',
    automationFailed: 'Failed',
    automationInterrupted: 'Previous run interrupted',
    automationStartDeep: 'Start deep run',
    automationStartFull: 'Start full run',
    automationStarting: 'Starting',
    automationUpdated: 'Updated',
    automationLogs: 'Run logs',
    automationOutput: 'Outputs',
    automationOutputScope: 'These figures describe only the latest incremental run, not the total files, translations, or legal reads bundled with the installer.',
    automationScope: 'Processing scope',
    automationDeepDetail: 'Deep mode prioritizes high-priority files for daily online refresh, translation, and legal reads.',
    automationFullDetail: 'Full mode walks every public file and is intended for long online runs with API keys configured.',
    automationCapabilityTitle: 'Complete on install; online adds increments',
    automationCapabilityDetail: 'The installer bundles every release-baseline PDF plus the current text and translation data, document reads, case dossiers, audits, and search data. No-key users do not crawl or regenerate the historical library. Online runs only download, verify, and organize new material, and preliminary local output never overwrites the bundled baseline. Configure Ollama, or add an official/compatible cloud key and model ID, then authorize extracted-body transmission for complete generative translation and reads on new material. Quality directly depends on model capability. A CourtListener token improves RECAP coverage only.',
    pacerBoundary: 'PACER is the docket of record; the app will not bypass credentials, fees, or court access rules.',
    translatedText: 'Text translated',
    sourceAlreadyTargetLanguage: 'Source already in target language',
    assistiveTranslation: 'Glossary reading aids',
    partialBodyTranslation: 'Partial body translations',
    redactedBodyTranslation: 'Full-page redacted translations',
    aiReadsDone: 'AI reads',
    localRuleReadsDone: 'Local-rule reads',
    caseReadsDone: 'Local-rule case reads',
    caseAiReadsDone: 'AI case reads',
    deferredDownloads: 'Deferred incremental downloads',
    automationBlockers: 'Capabilities to wire',
    relationshipMap: 'Case relationship map',
    caseMatrix: 'Case matrix',
    caseDossiers: 'Case-level reads',
    openCaseDossier: 'Open full case read',
    caseDossierDialogEyebrow: 'Case-level legal research',
    casePlainExplanation: 'Plain-language orientation',
    caseAnalogy: 'How to understand it',
    caseProfessionalAnalysis: 'Professional legal analysis',
    caseEvidenceDossier: 'Evidence-grounded case dossier',
    caseAnalogyBoundary: 'The analogy explains procedure only; it is not a court finding and does not predict the outcome.',
    controllingDocs: 'Controlling files',
    unresolvedIssues: 'Open issues',
    eventsShort: 'Events',
    docsShort: 'Docs',
    highPriorityShort: 'High priority',
    sourceGapsShort: 'Source gaps',
    maxValue: 'Peak',
    noChartData: 'No visualization data',
    chartActivityInsight: 'Blue bars are case events and green bars are document volume; peak months mark heavier review load.',
    chartDocumentInsight: 'Grouped by filing character so orders, judgments, sentencing, appeal, and forfeiture records stand out first.',
    chartSourceInsight: 'Left shows source volume and right shows evidence tier; PACER/RECAP first, NFSC as backup mirror only.',
    chartPriorityInsight: 'Critical and high-priority files enter download, translation, and AI legal-read queues first; low priority is background archive.',
    chartAutomationInsight: 'Shows the local chain from new-file discovery to rebuilt case reads, including credential/API blockers.',
    chartRelationshipInsight: 'Choose a case or entity on the left, inspect its direct links in the center, and read the relationship basis on the right. Select a neighbor to continue tracing.',
    chartEvents: 'Case events',
    chartDocuments: 'Documents',
    sourceListLabel: 'Source list',
    evidenceTierLabel: 'Evidence tier',
    citeReady: 'Citation-ready',
    needsVerification: 'Needs checks',
    sourceReliabilityNote: 'Volume is not the same as truth weight; docket-of-record and archived court files are prioritized.',
    priorityShare: 'Share',
    priorityCriticalHint: 'Judgment, appeal, sentencing, forfeiture, or other posture-changing records.',
    priorityHighHint: 'Motions, key orders, and formal notices that affect next-step assessment.',
    priorityMediumHint: 'Procedural updates or supporting material suited for batch review.',
    priorityLowHint: 'Background archive and mirror material, usually processed after higher-impact files.',
    graphCases: 'Case nodes',
    graphEntities: 'Entity nodes',
    graphMainLinks: 'Main links',
    noRelationshipLinks: 'No relationship data',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
    themeLabel: 'Appearance',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    metricRecent: 'Changes in 7 days',
    metricRecentDetail: 'Relative to the latest library date',
    metricVerify: 'Needs official check',
    metricVerifyDetail: 'Mirror files awaiting PACER/RECAP confirmation',
    metricAiBacklog: 'Awaiting legal read',
    metricAiBacklogDetail: 'Local files without a cached deterministic or generative legal read',
    metricDeadline: 'Deadlines to verify',
    metricDeadlineDetail: 'Do not rely on these as final deadlines',
    metricOpenIssues: 'Open legal questions',
    metricOpenIssuesDetail: 'Cross-case questions awaiting records',
    metricBlocked: 'Limited sources',
    metricBlockedDetail: 'Credential, rate-limit, or adapter gaps',
    documentTabFiles: 'Files',
    documentTabReview: 'Review queue',
    documentTabAudit: 'Coverage audit',
    documentTabAnalytics: 'Analytics',
    documentTabAutomation: 'Automation',
    documentTabsLabel: 'Document workspace',
    documentFilesSummary: 'Search, read, and verify archived court records and local files.',
    documentReviewSummary: 'Work translation, AI-read, and source-verification backlogs in one queue.',
    documentAuditSummary: 'Reconcile each docket against public entries, local files, source authority, hashes, and discovery candidates.',
    documentAnalyticsSummary: 'Review activity, source authority, filing mix, and processing priority.',
    documentAutomationSummary: 'Run online discovery, download, extraction, translation, and case-dossier rebuilds.',
    caseStage: 'Procedural stage',
    latestControllingDoc: 'Latest controlling file',
    nextQuestion: 'Next verification question',
    aiDossierUpdated: 'Dossier updated',
    relationshipDisclaimer: 'A line records an association in the materials. It does not establish liability, control, or unlawful conduct.',
    selectedEntity: 'Selected node',
    relationshipCount: 'Relationships',
    clearSelection: 'Show all',
    policyArea: 'Policy area',
    allPolicyAreas: 'All policy areas',
    monitorTermsLabel: 'Monitor terms',
    calendarFilterAll: 'All',
    calendarCaseFilter: 'Case filter',
    noCalendarItems: 'No dates match the current filters.',
    positionsEyebrow: 'Litigation action index',
    positionsTitle: 'Motions, responses, and court rulings',
    positionsTotal: 'Indexed actions',
    positionsExplicit: 'Filer explicit',
    positionsResolved: 'Court handled',
    positionsVerify: 'Needs verification',
    positionsSearch: 'Search filing, motion, docket, or keyword',
    allRoles: 'All participants',
    allActions: 'All actions',
    allStatuses: 'All statuses',
    newestFirst: 'Time: newest first',
    oldestFirst: 'Time: oldest first',
    positionsShowing: 'Showing actions',
    positionsDetails: 'Action and evidence details',
    recordedAction: 'Recorded action',
    proceduralStatusLabel: 'Procedural status',
    identificationBasis: 'Actor identification',
    sourceAuthorityLabel: 'Source authority',
    primaryRecord: 'Official court / RECAP',
    verificationRequired: 'Verify through PACER / RECAP',
    openOriginalFiling: 'Open original filing',
    noPositionActions: 'No litigation actions match the current filters.',
    positionNotOutcome: 'A recorded action does not mean the court accepted that position and does not indicate who will prevail.',
    auditTitle: 'Docket-by-docket completeness and gap audit',
    auditEyebrow: 'Repeatable verification',
    auditNotComplete: 'This audit does not prove that every related case or filing is complete',
    auditRefresh: 'Refresh online audit',
    auditRefreshing: 'Auditing',
    auditTrackedDockets: 'Tracked dockets',
    auditObservedDockets: 'Observed dockets',
    auditObservedEntries: 'Observed entries',
    auditLocalFiles: 'Local files',
    auditOfficialFiles: 'Local PACER / RECAP files',
    auditMetadataOnly: 'Metadata-only entries',
    auditPublicPdfMissing: 'Public PDFs missing locally',
    auditDownloadErrors: 'Pending relation review',
    auditDocketTable: 'Independent docket reconciliation',
    auditDiscoveryCandidates: 'Discovery candidates',
    auditLikelyFalseMatches: 'Quarantined likely false matches',
    auditIntegrity: 'File integrity',
    auditMethodology: 'Method and access boundaries',
    auditCourt: 'Court',
    auditDocket: 'Docket',
    auditStatus: 'Status',
    auditObserved: 'Observed entries',
    auditOfficialLocal: 'Official/RECAP local',
    auditGaps: 'Gaps',
    auditLatest: 'Latest observed',
    auditOpenDocket: 'Open docket',
    auditNoCandidates: 'No new verification candidates were found in this search.',
    auditManifestDigest: 'Manifest digest',
    auditHashedFiles: 'Hashed files',
    auditUnhashedFiles: 'Unhashed files',
    auditDuplicateGroups: 'Duplicate payload groups',
    auditHashConflicts: 'Cross-source hash conflicts',
	    auditGenerated: 'Report generated',
	    auditSearchTerms: 'Search rules',
	    auditCandidateNotice: 'A candidate is a relationship lead only. Verify the docket header, parties, and filings before promoting it into the tracked registry.',
	    relationshipAuditTitle: 'Relationship attribution audit',
	    relationshipAuditCopy: 'Classifies tracked dockets, discovered related matters, asset-recovery proceedings, service providers/counterparties, and excluded false matches from public captions, party metadata, docket metadata, and local file sources. It does not infer control, ownership, or liability from procedural association.',
	    relationshipAuditUnavailable: 'Relationship attribution audit has not been generated',
	    relationshipType: 'Relation type',
	    relationshipStatus: 'Verification status',
	    relationshipConfidence: 'Relation confidence',
	    relationshipEvidence: 'Relation evidence',
	    relationshipControlWarning: 'Control warning',
	    relationshipFiles: 'File processing',
	    relationshipExtracted: 'Extracted',
	    relationshipTranslated: 'Translated',
	    relationshipAiAnalyzed: 'AI read',
	    relationshipPending: 'Manual review',
	    relationshipProbable: 'Probable relation',
	    relationshipVerified: 'Verified public relation',
	    relationshipExcluded: 'Excluded',
	    formalTrackedCases: 'Formal tracked dockets',
	    discoveredRelatedDockets: 'Discovered related dockets',
	    relationshipReviewQueue: 'Priority verification queue',
	    relationshipSourceLimitations: 'Source boundaries',
	    relationshipOpenDocket: 'Open docket source',
	    relationshipNoEvidence: 'No displayable evidence yet',
	    relationshipNoTasks: 'No additional verification tasks',
	    relationshipMirrorWarning: 'Mirror material must be cross-checked against PACER / RECAP or official sources before citation.',
	  },
}

function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('X-Docket-Observatory-Request', '1')
  return fetch(input, { ...init, headers, cache: 'no-store' })
}

function safeExternalHref(value: string | null | undefined) {
  try {
    const url = new URL(String(value ?? ''))
    if (url.protocol === 'https:') return url.toString()
    if (url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return url.toString()
  } catch {
    // Invalid or relative external destinations remain inert.
  }
  return '#'
}

function localeFor(language: Language) {
  return language === 'zh' ? 'zh-CN' : 'en-US'
}

function formatDate(dateValue: string | null | undefined, language: Language) {
  if (!dateValue) return language === 'zh' ? '未记录' : 'Not recorded'
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateValue
  return new Intl.DateTimeFormat(localeFor(language), {
    year: 'numeric',
    month: language === 'zh' ? '2-digit' : 'short',
    day: '2-digit',
  }).format(date)
}

function formatDateParts(dateValue: string, language: Language) {
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return { day: dateValue, year: '' }
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  if (language === 'zh') return { day: `${month}/${day}`, year: String(date.getFullYear()) }
  return {
    day: new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(date),
    year: String(date.getFullYear()),
  }
}

function formatNumber(value: number, language: Language) {
  return value.toLocaleString(localeFor(language))
}

function formatOptionalNumber(value: number | null | undefined, language: Language) {
  return value == null ? '-' : formatNumber(value, language)
}

function relationshipStatusLabel(status: string | undefined, language: Language, localized?: string) {
  if (localized) return localized
  const labels: Record<Language, Record<string, string>> = {
    zh: {
      verified_public_relation: '已核实的公开关系',
      probable_relation: '较可能的关系',
      pending_manual_review: '待人工核验',
      excluded: '已排除',
    },
    en: {
      verified_public_relation: 'Verified public relation',
      probable_relation: 'Probable relation',
      pending_manual_review: 'Manual review',
      excluded: 'Excluded',
    },
  }
  return labels[language][status ?? ''] ?? String(status ?? (language === 'zh' ? '未分类' : 'Unclassified')).replaceAll('_', ' ')
}

function relationshipTypeLabel(
  type: string | undefined,
  audit: RelationshipAudit | null,
  language: Language,
  localized?: string,
) {
  if (localized) return localized
  const definition = type ? audit?.relationTypes?.[type] : null
  const fallback = type ? type.replaceAll('_', ' ') : language === 'zh' ? '未分类' : 'Unclassified'
  if (!definition) return fallback
  if (language === 'zh') return definition.label ?? definition.labelZh ?? definition.labelEn ?? fallback
  return definition.label ?? definition.labelEn ?? definition.labelZh ?? fallback
}

function relationshipEvidenceLabel(evidence: RelationshipEvidence, language: Language) {
  return evidence.label ?? (language === 'zh' ? evidence.labelZh : evidence.labelEn) ?? evidence.type?.replaceAll('_', ' ') ?? evidence.kind
}

function relationshipEvidenceDescription(evidence: RelationshipEvidence, language: Language) {
  return evidence.description ?? (language === 'zh' ? evidence.descriptionZh : evidence.descriptionEn) ?? ''
}

function relationshipTone(status: string | undefined) {
  if (status === 'verified_public_relation') return 'verified'
  if (status === 'probable_relation') return 'probable'
  if (status === 'pending_manual_review') return 'pending'
  if (status === 'excluded') return 'excluded'
  return 'unknown'
}

function documentAnalysisProviderLabel(status: DocumentAnalysisRecord['aiStatus'], language: Language) {
  if (!status.generated || !status.provider) {
    return language === 'zh' ? '尚未生成；可按需处理' : 'Not generated; available on demand'
  }
  const labels: Record<string, Record<Language, string>> = {
    local_rules: { zh: '本地规则辅助（非生成式 AI）', en: 'Local-rule assistance (not generative AI)' },
    openai: { zh: 'OpenAI 正文解读', en: 'OpenAI body analysis' },
    anthropic: { zh: 'Anthropic Claude 正文解读', en: 'Anthropic Claude body analysis' },
    gemini: { zh: 'Google Gemini 正文解读', en: 'Google Gemini body analysis' },
    openai_compatible: { zh: '兼容接口正文解读', en: 'Compatible-provider body analysis' },
    ollama: { zh: '本机 Ollama 正文解读', en: 'Local Ollama body analysis' },
    human_research: { zh: '人工法律研究', en: 'Human legal research' },
  }
  return labels[status.provider]?.[language] ?? status.mode
}

function caseDossierProviderLabel(dossier: NonNullable<CaseDossier['aiDossier']>, language: Language) {
  const labels: Record<string, Record<Language, string>> = {
    local_rules: { zh: '本地规则案件总览', en: 'Local-rule case dossier' },
    openai: { zh: 'OpenAI 案件总览', en: 'OpenAI case dossier' },
    anthropic: { zh: 'Anthropic Claude 案件总览', en: 'Anthropic Claude case dossier' },
    gemini: { zh: 'Google Gemini 案件总览', en: 'Google Gemini case dossier' },
    openai_compatible: { zh: '兼容接口案件总览', en: 'Compatible-provider case dossier' },
    ollama: { zh: '本机 Ollama 案件总览', en: 'Local Ollama case dossier' },
    human_research: { zh: '人工法律研究总览', en: 'Human legal research dossier' },
  }
  return labels[dossier.provider ?? '']?.[language]
    ?? (language === 'zh' ? '案件整体解读' : 'Case dossier')
}

function formatBytes(bytes: number, language: Language) {
  if (!bytes) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(size)} ${units[unitIndex]}`
}

function displayLocalPath(value: string, language: Language) {
  if (!value || language === 'zh') return value
  let readableValue = value
  try {
    readableValue = decodeURI(value)
  } catch {
    // Keep the original display string if it is not a valid encoded URI.
  }
  const normalized = readableValue.replaceAll('\\', '/')
  const projectMarker = '/guo-intel/'
  const projectIndex = normalized.indexOf(projectMarker)
  if (projectIndex >= 0) return `[Project]/${normalized.slice(projectIndex + projectMarker.length)}`
  const homeMatch = normalized.match(/^\/Users\/[^/]+\/(.*)$/)
  if (homeMatch && !/[\u3400-\u9fff]/u.test(homeMatch[1])) return `~/${homeMatch[1]}`
  return /[\u3400-\u9fff]/u.test(normalized) ? '[Local application data]' : normalized
}

function statusClass(status: string) {
  if (status === 'ok') return 'status-ok'
  if (status === 'limited' || status === 'stale' || status === 'needs_credentials' || status === 'needs_implementation') return 'status-warn'
  if (status === 'error') return 'status-error'
  return 'status-muted'
}

function statusTone(status: string) {
  if (status === 'ok') return 'ok'
  if (status === 'error') return 'error'
  if (status === 'limited' || status === 'stale' || status === 'needs_credentials' || status === 'needs_implementation') return 'warn'
  return 'muted'
}

function sourceById(sources: SourceRecord[], sourceId: string) {
  return sources.find((source) => source.id === sourceId)
}

function sourcePriority(source: SourceRecord) {
  const order: Record<string, number> = {
    pacer: 0,
    'courtlistener-recap': 1,
    'doj-victim-page': 2,
    'doj-sentencing-release': 3,
    'sec-press-2023-50': 4,
    'gtv-fair-fund': 5,
    'epiq-kwok-trustee': 6,
    'federal-register-policy': 7,
    'nfsc-criminal-mirror': 8,
  }
  return order[source.id] ?? 20
}

function isBackupMirror(source: SourceRecord) {
  const value = `${source.id} ${source.type} ${source.shortName}`.toLowerCase()
  return value.includes('mirror') || value.includes('镜像')
}

function sourcesForEntity(entity: EntityRecord, cases: CaseRecord[]) {
  const sourceIds = new Set<string>()
  for (const caseId of entity.caseIds) {
    const caseRecord = cases.find((item) => item.id === caseId)
    for (const sourceId of caseRecord?.sourceIds ?? []) sourceIds.add(sourceId)
  }
  return [...sourceIds]
}

function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('guo-intel-language') === 'en' ? 'en' : 'zh'))
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('guo-intel-theme') === 'light' ? 'light' : 'dark'))
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [documents, setDocuments] = useState<DocumentLibrary | null>(null)
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysisLibrary | null>(null)
  const [documentAnalysisLoading, setDocumentAnalysisLoading] = useState(false)
  const [documentAnalysisError, setDocumentAnalysisError] = useState('')
  const [completenessAudit, setCompletenessAudit] = useState<CompletenessAudit | null>(null)
  const [completenessAuditLoading, setCompletenessAuditLoading] = useState(false)
  const [completenessAuditError, setCompletenessAuditError] = useState('')
  const [relationshipAudit, setRelationshipAudit] = useState<RelationshipAudit | null>(null)
  const [relationshipAuditLoading, setRelationshipAuditLoading] = useState(false)
  const [relationshipAuditError, setRelationshipAuditError] = useState('')
  const [monitoringProfile, setMonitoringProfile] = useState<MonitoringProfile | null>(null)
  const [proceduralCalendar, setProceduralCalendar] = useState<ProceduralCalendar | null>(null)
  const [litigationPositions, setLitigationPositions] = useState<LitigationPositionsLibrary | null>(null)
  const [litigationPositionsLoading, setLitigationPositionsLoading] = useState(false)
  const [litigationPositionsError, setLitigationPositionsError] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [query, setQuery] = useState('')
  const [caseFilter, setCaseFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [timelineLimit, setTimelineLimit] = useState(40)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [documentInsight, setDocumentInsight] = useState<DocumentAnalysisRecord | null>(null)
  const [documentInsightUrl, setDocumentInsightUrl] = useState('')
  const [documentInsightLoading, setDocumentInsightLoading] = useState(false)
  const [documentAnalysisDialogOpen, setDocumentAnalysisDialogOpen] = useState(false)
  const [pdfTarget, setPdfTarget] = useState<ManagedDocumentTarget | null>(null)
  const documentModalTriggerRef = useRef<HTMLElement | null>(null)
  const pendingDocumentModalFocusRef = useRef(false)
  const previousAutomationStatusRef = useRef<string | null>(null)
  const [automationRun, setAutomationRun] = useState<AutomationRun | null>(null)
  const [automationLoading, setAutomationLoading] = useState(false)
  const [automationError, setAutomationError] = useState('')
  const [settingsPayload, setSettingsPayload] = useState<SettingsPayload | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsNotice, setSettingsNotice] = useState('')
  const [settingsDraftSecrets, setSettingsDraftSecrets] = useState<Record<string, string | null>>({})
  const [visibleCredentials, setVisibleCredentials] = useState<Record<string, boolean>>({})
  const [testingSourceId, setTestingSourceId] = useState('')
  const [sourceTestResults, setSourceTestResults] = useState<Record<string, SourceStatus>>({})
  const [aiTestResults, setAiTestResults] = useState<Partial<Record<string, AiTestResult>>>({})
  const [localAiTestResult, setLocalAiTestResult] = useState<AiTestResult | null>(null)
  const [activeHash, setActiveHash] = useState(() => window.location.hash || '#timeline')
  const [documentWorkspaceTab, setDocumentWorkspaceTab] = useState<DocumentWorkspaceTab>('files')
  const text = ui[language]
  const workspaceView = normalizeWorkspaceView(activeHash)

  useEffect(() => {
    localStorage.setItem('guo-intel-theme', theme)
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    localStorage.setItem('guo-intel-language', language)
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.title = language === 'zh' ? '案卷观察台' : 'Docket Observatory'
    void loadDashboard(language)
    void loadDocuments(language).then(() => loadDocumentAnalysis(language))
    void loadCompletenessAudit(language)
    void loadRelationshipAudit(language)
    void loadMonitoringProfile(language)
    void loadAutomationRun(language)
    void loadProceduralCalendar(language)
    void loadLitigationPositions(language)
    void loadSettings(language)
  }, [language])

  useEffect(() => {
    const updateActiveHash = () => setActiveHash(window.location.hash || '#timeline')
    updateActiveHash()
    window.addEventListener('hashchange', updateActiveHash)
    return () => window.removeEventListener('hashchange', updateActiveHash)
  }, [])

  useEffect(() => {
    if (!activeHash.startsWith('#settings')) {
      window.requestAnimationFrame(() => window.scrollTo(0, 0))
    }
  }, [activeHash, workspaceView])

  useEffect(() => {
    if (automationRun?.status !== 'running') return undefined
    const handle = window.setInterval(() => {
      void loadAutomationRun(language)
    }, 2500)
    return () => window.clearInterval(handle)
  }, [automationRun?.status, language])

  useEffect(() => {
    const previousStatus = previousAutomationStatusRef.current
    const currentStatus = automationRun?.status ?? null
    previousAutomationStatusRef.current = currentStatus
    if (previousStatus !== 'running' || currentStatus === 'running') return
    void Promise.all([
      loadDashboard(language),
      loadDocuments(language).then(() => loadDocumentAnalysis(language)),
      loadCompletenessAudit(language),
      loadRelationshipAudit(language),
      loadProceduralCalendar(language),
      loadLitigationPositions(language),
    ])
  }, [automationRun?.status, language])

  const categories = useMemo(() => {
    if (!dashboard) return []
    return [...new Set(dashboard.events.map((event) => event.category))].sort()
  }, [dashboard])

  const filteredEvents = useMemo(() => {
    if (!dashboard) return []
    const normalizedQuery = query.trim().toLowerCase()
    return dashboard.events.filter((event) => {
      const matchesCase = caseFilter === 'all' || event.caseId === caseFilter || event.relatedCaseIds.includes(caseFilter)
      const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter
      const haystack = `${event.title} ${event.summary} ${event.docketNumber} ${event.filingNumber} ${event.tags.join(' ')}`.toLowerCase()
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)
      return matchesCase && matchesCategory && matchesQuery
    })
  }, [caseFilter, categoryFilter, dashboard, query])

  const selectedEvent = useMemo(() => {
    if (!dashboard) return null
    return filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? dashboard.events[0] ?? null
  }, [dashboard, filteredEvents, selectedEventId])

  useEffect(() => {
    setTimelineLimit(40)
  }, [query, caseFilter, categoryFilter, language])

  const loadAnalysis = useCallback(async (eventId: string) => {
    setAnalysisLoading(true)
    try {
      const response = await apiFetch(`/api/analyze?lang=${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Docket-Observatory-Request': '1' },
        body: JSON.stringify({ eventId }),
      })
      if (!response.ok) throw new Error(`API ${response.status}`)
      const payload = (await response.json()) as { analysis: Analysis }
      setAnalysis(payload.analysis)
    } catch (fetchError) {
      setAnalysis({
        mode: 'client-error',
        confidence: 'low',
        whatChanged: [language === 'zh' ? '分析接口调用失败。' : 'Analysis API call failed.'],
        whyItMatters: [language === 'zh' ? '无法加载结构化分析时，只能先阅读原始来源。' : 'When structured analysis cannot load, use the original source first.'],
        proceduralStatus: [],
        riskFlags: [fetchError instanceof Error ? fetchError.message : String(fetchError)],
        followUps: [language === 'zh' ? '确认本地 API 服务是否运行。' : 'Confirm the local API service is running.'],
        evidence: [],
      })
    } finally {
      setAnalysisLoading(false)
    }
  }, [language])

  useEffect(() => {
    if (selectedEvent && selectedEvent.id !== selectedEventId) {
      setSelectedEventId(selectedEvent.id)
    }
  }, [selectedEvent, selectedEventId])

  useEffect(() => {
    if (!selectedEvent) return
    if (dashboard?.events[0]?.id === selectedEvent.id && dashboard.latestAnalysis) {
      setAnalysis(dashboard.latestAnalysis)
      return
    }
    void loadAnalysis(selectedEvent.id)
  }, [dashboard, loadAnalysis, selectedEvent])

  async function loadDashboard(nextLanguage = language) {
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch(`/api/dashboard?lang=${nextLanguage}`)
      if (!response.ok) throw new Error(`API ${response.status}`)
      const payload = (await response.json()) as Dashboard
      setDashboard(payload)
      setSelectedEventId((current) => current || payload.events[0]?.id || '')
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError))
    } finally {
      setLoading(false)
    }
  }

  async function refreshSources() {
    setRefreshing(true)
    setError('')
    try {
      const response = await apiFetch(`/api/refresh?lang=${language}`, { method: 'POST', headers: { 'X-Docket-Observatory-Request': '1' } })
      if (!response.ok) throw new Error(`API ${response.status}`)
      const payload = (await response.json()) as Dashboard
      setDashboard(payload)
      setSelectedEventId(payload.events[0]?.id || '')
      void loadDocuments(language)
      void loadDocumentAnalysis(language)
      void loadMonitoringProfile(language)
      void loadLitigationPositions(language)
      void loadRelationshipAudit(language)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError))
    } finally {
      setRefreshing(false)
    }
  }

  async function loadDocuments(nextLanguage = language) {
    try {
      const response = await apiFetch(`/api/documents?lang=${nextLanguage}`)
      if (!response.ok) return
      setDocuments((await response.json()) as DocumentLibrary)
    } catch {
      // Retain the last successful library during a transient local API restart.
    }
  }

  async function loadDocumentAnalysis(nextLanguage = language) {
    setDocumentAnalysisLoading(true)
    setDocumentAnalysisError('')
    try {
      const response = await apiFetch(`/api/document-analysis?lang=${nextLanguage}&catalog=compact`)
      if (!response.ok) throw new Error(`API ${response.status}`)
      setDocumentAnalysis((await response.json()) as DocumentAnalysisLibrary)
    } catch (fetchError) {
      setDocumentAnalysisError(fetchError instanceof Error ? fetchError.message : String(fetchError))
    } finally {
      setDocumentAnalysisLoading(false)
    }
  }

  async function loadCompletenessAudit(nextLanguage = language) {
    try {
      const response = await apiFetch(`/api/completeness-audit?lang=${nextLanguage}`)
      if (!response.ok) throw new Error(`API ${response.status}`)
      setCompletenessAudit((await response.json()) as CompletenessAudit)
      setCompletenessAuditError('')
    } catch (fetchError) {
      setCompletenessAuditError(fetchError instanceof Error ? fetchError.message : String(fetchError))
    }
  }

  async function loadRelationshipAudit(nextLanguage = language) {
    setRelationshipAuditLoading(true)
    try {
      const response = await apiFetch(`/api/relationship-audit?lang=${nextLanguage}`)
      if (!response.ok) throw new Error(`API ${response.status}`)
      setRelationshipAudit((await response.json()) as RelationshipAudit)
      setRelationshipAuditError('')
    } catch (fetchError) {
      setRelationshipAuditError(fetchError instanceof Error ? fetchError.message : String(fetchError))
    } finally {
      setRelationshipAuditLoading(false)
    }
  }

  async function refreshCompletenessAuditView() {
    setCompletenessAuditLoading(true)
    setRelationshipAuditLoading(true)
    setCompletenessAuditError('')
    setRelationshipAuditError('')
    try {
      const response = await apiFetch(`/api/completeness-audit/refresh?lang=${language}`, {
        method: 'POST',
        headers: { 'X-Docket-Observatory-Request': '1' },
      })
      const payload = (await response.json()) as CompletenessAudit & { error?: string }
      if (!response.ok) throw new Error(payload.error || `API ${response.status}`)
      setCompletenessAudit(payload)
      void loadDashboard(language)
      void loadDocumentAnalysis(language)
      void loadDocuments(language)
      await loadRelationshipAudit(language)
    } catch (fetchError) {
      setCompletenessAuditError(fetchError instanceof Error ? fetchError.message : String(fetchError))
      setRelationshipAuditError(fetchError instanceof Error ? fetchError.message : String(fetchError))
    } finally {
      setCompletenessAuditLoading(false)
      setRelationshipAuditLoading(false)
    }
  }

  async function analyzeDocument(sourceUrl: string) {
    if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('[role="dialog"]')) {
      documentModalTriggerRef.current = document.activeElement
    }
    pendingDocumentModalFocusRef.current = false
    setPdfTarget(null)
    setDocumentAnalysisDialogOpen(true)
    setDocumentInsightLoading(true)
    setDocumentInsightUrl(sourceUrl)
    setDocumentInsight(null)
    try {
      const response = await apiFetch(`/api/analyze-document?lang=${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Docket-Observatory-Request': '1' },
        body: JSON.stringify({ sourceUrl }),
      })
      if (!response.ok) throw new Error(`API ${response.status}`)
      const payload = (await response.json()) as { document: DocumentAnalysisRecord }
      setDocumentInsight(payload.document)
    } catch (fetchError) {
      setDocumentInsight({
        id: `error-${sourceUrl}`,
        docNumber: null,
        title: language === 'zh' ? '文件分析失败' : 'Document analysis failed',
        originalTitle: '',
        variantKey: 'source',
        variantLabel: language === 'zh' ? '来源原件' : 'Source-language original',
        caseId: '',
        sourceId: '',
        sourceLabel: '',
        sourceUrl,
        localPath: '',
        bytes: 0,
        status: 'error',
        category: language === 'zh' ? '错误' : 'Error',
        categoryKey: 'Error',
        priority: 'low',
        confidence: 'low',
        sourcePosture: '',
        summary: fetchError instanceof Error ? fetchError.message : String(fetchError),
        plainEnglish: fetchError instanceof Error ? fetchError.message : String(fetchError),
        legalReading: [],
        caseConnections: [],
        whyItMatters: [],
        verificationTasks: [language === 'zh' ? '确认本地 API 是否运行，并检查该文件是否仍在 manifest 中。' : 'Confirm the local API is running and the file still exists in the manifest.'],
        riskFlags: [],
        citations: [],
        aiFindings: [],
        translation: null,
        relatedTopics: [],
        relatedTopicIds: [],
	        translationStatus: { metadata: '', body: '', note: '' },
	        aiStatus: { available: false, mode: 'client-error', batchDefault: '' },
	        sourceVerification: { tier: 'error', primary: false, label: '', note: '' },
	        relationshipStatus: 'pending_manual_review',
	        relationshipType: 'weak_or_unverified',
	        relationshipTypes: ['weak_or_unverified'],
	        relationshipConfidence: 'low',
	        relationshipLabel: language === 'zh' ? '弱关联或待核验线索' : 'Weak or unverified lead',
	        relationshipEvidence: [],
		        relationshipControlWarning: language === 'zh' ? '当前未能加载该文件的关系归属证据。' : 'Relationship attribution evidence could not be loaded for this file.',
		        relationshipVerificationTasks: [language === 'zh' ? '恢复本地 API 后重新打开文件解读。' : 'Reopen the document read after the local API is available.'],
		        analysisBasis: 'client-error',
		        researchQuality: {
		          key: 'unavailable',
		          label: language === 'zh' ? '文件不可用' : 'Document unavailable',
		          detail: language === 'zh' ? '文件解读请求失败，未取得可核验正文。' : 'The analysis request failed and no verifiable body text was returned.',
		        },
	        textExtraction: {
          status: 'error',
          label: language === 'zh' ? '分析失败' : 'Analysis failed',
          engine: '',
          pageLimit: 0,
          totalPages: null,
          pagesParsed: 0,
          charCount: 0,
          snippet: '',
        },
      })
    } finally {
      setDocumentInsightLoading(false)
    }
  }

  function openDocument(target: ManagedDocumentTarget) {
    if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('[role="dialog"]')) {
      documentModalTriggerRef.current = document.activeElement
    }
    pendingDocumentModalFocusRef.current = false
    setDocumentAnalysisDialogOpen(false)
    setPdfTarget(target)
  }

  function closeDocumentAnalysisDialog() {
    pendingDocumentModalFocusRef.current = true
    setDocumentAnalysisDialogOpen(false)
  }

  function closePdfReader() {
    pendingDocumentModalFocusRef.current = true
    setPdfTarget(null)
  }

  useEffect(() => {
    if (documentAnalysisDialogOpen || pdfTarget || documentInsightLoading || !pendingDocumentModalFocusRef.current) return
    let attempts = 0
    let frame = 0
    const restore = () => {
      const target = documentModalTriggerRef.current
      if (target?.isConnected && !('disabled' in target && target.disabled)) {
        target.focus()
        pendingDocumentModalFocusRef.current = false
        return
      }
      attempts += 1
      if (attempts < 12) frame = window.requestAnimationFrame(restore)
    }
    frame = window.requestAnimationFrame(restore)
    return () => window.cancelAnimationFrame(frame)
  }, [documentAnalysisDialogOpen, documentInsightLoading, pdfTarget])

  async function loadMonitoringProfile(nextLanguage = language) {
    try {
      const response = await apiFetch(`/api/monitoring-profile?lang=${nextLanguage}`)
      if (!response.ok) return
      setMonitoringProfile((await response.json()) as MonitoringProfile)
    } catch {
      setMonitoringProfile(null)
    }
  }

  async function loadProceduralCalendar(nextLanguage = language) {
    try {
      const response = await apiFetch(`/api/calendar?lang=${nextLanguage}`)
      if (!response.ok) return
      setProceduralCalendar((await response.json()) as ProceduralCalendar)
    } catch {
      setProceduralCalendar(null)
    }
  }

  async function loadLitigationPositions(nextLanguage = language) {
    setLitigationPositionsLoading(true)
    setLitigationPositionsError('')
    try {
      const response = await apiFetch(`/api/litigation-positions?lang=${nextLanguage}`)
      if (!response.ok) throw new Error(`API ${response.status}`)
      setLitigationPositions((await response.json()) as LitigationPositionsLibrary)
    } catch (fetchError) {
      setLitigationPositionsError(fetchError instanceof Error ? fetchError.message : String(fetchError))
      setLitigationPositions(null)
    } finally {
      setLitigationPositionsLoading(false)
    }
  }

  async function loadAutomationRun(nextLanguage = language) {
    try {
      const response = await apiFetch(`/api/automation?lang=${nextLanguage}`)
      if (!response.ok) return
      setAutomationRun((await response.json()) as AutomationRun)
    } catch {
      setAutomationRun(null)
    }
  }

  async function loadSettings(nextLanguage = language) {
    setSettingsLoading(true)
    setSettingsError('')
    try {
      const response = await apiFetch(`/api/settings?lang=${nextLanguage}`)
      if (!response.ok) throw new Error(`API ${response.status}`)
      setSettingsPayload((await response.json()) as SettingsPayload)
    } catch (fetchError) {
      setSettingsError(fetchError instanceof Error ? fetchError.message : String(fetchError))
    } finally {
      setSettingsLoading(false)
    }
  }

  async function saveSettings(nextSettings: AppSettingsRecord) {
    const changedSecretKeys = new Set(Object.keys(settingsDraftSecrets))
    setSettingsSaving(true)
    setSettingsError('')
    setSettingsNotice('')
    try {
      const response = await apiFetch(`/api/settings?lang=${language}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Docket-Observatory-Request': '1' },
        body: JSON.stringify({ settings: nextSettings, secrets: settingsDraftSecrets }),
      })
      const payload = (await response.json()) as SettingsPayload & { error?: string }
      if (!response.ok) throw new Error(payload.error || `API ${response.status}`)
      setSettingsPayload(payload)
      setSettingsDraftSecrets({})
      setVisibleCredentials({})
      const changedAiProviders = {
        openaiApiKey: 'openai',
        anthropicApiKey: 'anthropic',
        geminiApiKey: 'gemini',
        compatibleApiKey: 'openai_compatible',
      } as const
      setAiTestResults((current) => {
        const next = { ...current }
        for (const [secretKey, provider] of Object.entries(changedAiProviders)) {
          if (changedSecretKeys.has(secretKey)) delete next[provider]
        }
        return next
      })
      setSourceTestResults((current) => {
        const next = { ...current }
        if (changedSecretKeys.has('courtlistenerToken')) delete next['courtlistener-recap']
        if (['pacerUsername', 'pacerPassword', 'pacerClientCode'].some((key) => changedSecretKeys.has(key))) delete next.pacer
        return next
      })
      setSettingsNotice(text.saved)
      void loadDashboard(language)
      void loadDocumentAnalysis(language)
      void loadAutomationRun(language)
    } catch (saveError) {
      setSettingsError(saveError instanceof Error ? saveError.message : String(saveError))
      void loadSettings(language)
    } finally {
      setSettingsSaving(false)
    }
  }

  async function testSource(sourceId: string) {
    setTestingSourceId(sourceId)
    try {
      const response = await apiFetch(`/api/settings/test-source?lang=${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Docket-Observatory-Request': '1' },
        body: JSON.stringify({ sourceId }),
      })
      const payload = (await response.json()) as { status?: SourceStatus; error?: string }
      if (!response.ok || !payload.status) throw new Error(payload.error || `API ${response.status}`)
      setSourceTestResults((current) => ({ ...current, [sourceId]: payload.status as SourceStatus }))
    } catch (testError) {
      setSourceTestResults((current) => ({
        ...current,
        [sourceId]: {
          sourceId,
          status: 'error',
          checkedAt: new Date().toISOString(),
          latencyMs: null,
          itemCount: 0,
          message: testError instanceof Error ? testError.message : String(testError),
          facts: [],
        },
      }))
    } finally {
      setTestingSourceId('')
    }
  }

  async function testAi(provider: string) {
    setTestingSourceId(provider)
    setAiTestResults((current) => {
      const next = { ...current }
      delete next[provider]
      return next
    })
    try {
      const response = await apiFetch(`/api/settings/test-ai?lang=${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Docket-Observatory-Request': '1' },
        body: JSON.stringify({ provider }),
      })
      const payload = (await response.json()) as AiTestResult
      setAiTestResults((current) => ({ ...current, [provider]: payload }))
    } catch (testError) {
      setAiTestResults((current) => ({
        ...current,
        [provider]: { status: 'error', provider, message: testError instanceof Error ? testError.message : String(testError) },
      }))
    } finally {
      setTestingSourceId('')
    }
  }

  async function testLocalAi() {
    setTestingSourceId('local-ai')
    setLocalAiTestResult(null)
    try {
      const response = await apiFetch(`/api/settings/test-local-ai?lang=${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Docket-Observatory-Request': '1' },
        body: JSON.stringify({}),
      })
      const payload = (await response.json()) as AiTestResult
      setLocalAiTestResult(payload)
    } catch (testError) {
      setLocalAiTestResult({ status: 'error', provider: 'ollama', message: testError instanceof Error ? testError.message : String(testError) })
    } finally {
      setTestingSourceId('')
    }
  }

  async function startAutomation(mode: 'deep' | 'full') {
    setAutomationLoading(true)
    setAutomationError('')
    try {
      const response = await apiFetch(`/api/automation/start?lang=${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Docket-Observatory-Request': '1' },
        body: JSON.stringify({
          mode,
          limit: mode === 'full' ? 'all' : settingsPayload?.settings.automaticProcessingLimit ?? 120,
          includeAi: settingsPayload?.settings.includeAi ?? true,
          includeTranslation: settingsPayload?.settings.includeTranslation ?? true,
          outputLanguages: settingsPayload?.settings.automationLanguage ?? language,
        }),
      })
      if (!response.ok) throw new Error(`API ${response.status}`)
      setAutomationRun((await response.json()) as AutomationRun)
    } catch (fetchError) {
      setAutomationError(fetchError instanceof Error ? fetchError.message : String(fetchError))
      void loadAutomationRun(language)
    } finally {
      setAutomationLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="boot-screen">
        <Loader2 className="spin" size={28} />
        <span>{text.loading}</span>
      </main>
    )
  }

  if (!dashboard) {
    return (
      <main className="boot-screen">
        <AlertTriangle size={28} />
        <span>{text.apiError}: {error || 'unknown'}</span>
      </main>
    )
  }

  const activeCase = selectedEvent ? dashboard.cases.find((caseRecord) => caseRecord.id === selectedEvent.caseId) : null
  const activeSource = selectedEvent ? sourceById(dashboard.sources, selectedEvent.sourceId) : null
  const sourceStatuses = new Map(dashboard.sourceStatuses.map((status) => [status.sourceId, status]))
  const sortedRailSources = [...dashboard.sources].sort((a, b) => sourcePriority(a) - sourcePriority(b))
  const attentionRailSources = sortedRailSources.filter((source) => statusTone(sourceStatuses.get(source.id)?.status ?? 'not_run') !== 'ok')
  const okSourceCount = dashboard.sourceStatuses.filter((status) => status.status === 'ok').length
  const actionSourceCount = dashboard.sourceStatuses.filter((status) => ['limited', 'stale', 'needs_credentials', 'needs_implementation', 'error'].includes(status.status)).length
  const credentialGapCount = dashboard.sourceStatuses.filter((status) => status.status === 'needs_credentials').length
  const officialOrRecapFileCount = documentAnalysis?.analytics.gaps.officialOrRecapFiles ?? null
  const officialAgencyFileCount = documentAnalysis?.analytics.verificationDistribution.find((item) => item.key === 'official_agency')?.value ?? null
  const backupMirrorFileCount = documentAnalysis?.analytics.gaps.backupMirrorFiles ?? null
  const localDocumentCount = documents?.counts.localAvailable ?? documentAnalysis?.counts.localAvailable ?? null
  const latestEventTime = Math.max(0, ...dashboard.events.map((event) => new Date(`${event.date}T00:00:00`).getTime()).filter(Number.isFinite))
  const recentEventCount = dashboard.events.filter((event) => {
    const eventTime = new Date(`${event.date}T00:00:00`).getTime()
    return Number.isFinite(eventTime) && latestEventTime - eventTime <= 7 * 24 * 60 * 60 * 1000
  }).length
  const aiBacklogCount = documentAnalysis?.counts.pendingLegalReadDocuments ?? null
  const aiBacklogDetail = documentAnalysis
    ? documentAnalysis.counts.pendingLegalReadDocuments === 0
      ? language === 'zh'
        ? '全部本地文件已有人工研究、本地规则或生成式法律解读'
        : 'Every local file has a human, deterministic, or generative legal read'
      : language === 'zh'
        ? `${formatNumber(documentAnalysis.counts.pendingLegalReadReasons.analysis_cache_missing, language)} 份只缺解读缓存，${formatNumber(documentAnalysis.counts.pendingLegalReadReasons.extraction_cache_missing + documentAnalysis.counts.pendingLegalReadReasons.text_extraction_unavailable, language)} 份需先处理正文`
        : `${formatNumber(documentAnalysis.counts.pendingLegalReadReasons.analysis_cache_missing, language)} need a read cache; ${formatNumber(documentAnalysis.counts.pendingLegalReadReasons.extraction_cache_missing + documentAnalysis.counts.pendingLegalReadReasons.text_extraction_unavailable, language)} need body-text processing first`
    : text.metricAiBacklogDetail
  const deadlineVerificationCount = proceduralCalendar?.items.filter((item) => item.status === 'needs_verification').length ?? 0
  const openIssueCount = dashboard.portfolioAnalysis.openLoops.length
  const workspaceMeta: Record<WorkspaceView, { title: string; copy: string }> = {
    '#timeline': { title: text.timelineWorkspaceTitle, copy: text.timelineWorkspaceCopy },
    '#documents': { title: text.documentsWorkspaceTitle, copy: text.documentsWorkspaceCopy },
    '#cases': { title: text.casesWorkspaceTitle, copy: text.casesWorkspaceCopy },
    '#positions': { title: text.positionsWorkspaceTitle, copy: text.positionsWorkspaceCopy },
    '#entities': { title: text.entitiesWorkspaceTitle, copy: text.entitiesWorkspaceCopy },
    '#policy': { title: text.policyWorkspaceTitle, copy: text.policyWorkspaceCopy },
    '#calendar': { title: text.calendarWorkspaceTitle, copy: text.calendarWorkspaceCopy },
  }
  const activeWorkspace = workspaceMeta[workspaceView]
  const navItems = [
    { href: '#timeline', label: text.navLatest, icon: <FileText size={17} />, metric: formatNumber(dashboard.metrics.totalEvents, language) },
    { href: '#documents', label: text.navDocuments, icon: <FolderOpen size={17} />, metric: formatOptionalNumber(localDocumentCount, language) },
    { href: '#cases', label: text.navCases, icon: <BriefcaseBusiness size={17} />, metric: formatNumber(dashboard.metrics.monitoredCases, language) },
    { href: '#positions', label: text.navPositions, icon: <UserRoundCheck size={17} />, metric: formatNumber(litigationPositions?.counts.total ?? 0, language) },
    { href: '#entities', label: text.navEntities, icon: <GitBranch size={17} />, metric: formatNumber(dashboard.metrics.monitoredEntities, language) },
    { href: '#policy', label: text.navPolicy, icon: <Landmark size={17} />, metric: formatNumber(dashboard.policyWatch.length, language) },
    { href: '#calendar', label: text.navCalendar, icon: <CalendarClock size={17} />, metric: formatNumber(proceduralCalendar?.items.length ?? 0, language) },
  ]

  if (activeHash.startsWith('#settings')) {
    return (
      <SettingsView
        language={language}
        text={text}
        payload={settingsPayload}
        loading={settingsLoading}
        saving={settingsSaving}
        error={settingsError}
        notice={settingsNotice}
        draftSecrets={settingsDraftSecrets}
        visibleCredentials={visibleCredentials}
        testingSourceId={testingSourceId}
        sourceTestResults={sourceTestResults}
        aiTestResults={aiTestResults}
        localAiTestResult={localAiTestResult}
        theme={theme}
        onBack={() => {
          window.history.replaceState(null, '', `${window.location.pathname}#timeline`)
          setActiveHash('#timeline')
          window.scrollTo(0, 0)
        }}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        onSave={saveSettings}
        onSecretChange={(key, value) => setSettingsDraftSecrets((current) => {
          const next = { ...current }
          if (value === undefined) delete next[key]
          else next[key] = value
          return next
        })}
        onToggleCredential={(key) => setVisibleCredentials((current) => ({ ...current, [key]: !current[key] }))}
        onTestSource={testSource}
        onTestAi={testAi}
        onTestLocalAi={testLocalAi}
      />
    )
  }

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <div className="brand-block">
          <div className="brand-mark">
            <img src={brandLogo} alt="" />
          </div>
          <div>
            <p className="eyebrow">{text.brandEyebrow}</p>
            <h1>{text.brand}</h1>
          </div>
        </div>

        <div className="rail-nav-group">
          <p className="rail-nav-label">{text.navigationLabel}</p>
          <nav className="rail-nav" aria-label={text.navigationLabel}>
          {navItems.map((item) => (
            <a
              href={item.href}
              className={`rail-link ${workspaceView === item.href ? 'active' : ''}`}
              aria-current={workspaceView === item.href ? 'page' : undefined}
              onClick={() => {
                if (item.href === '#documents') setDocumentWorkspaceTab('files')
              }}
              key={item.href}
            >
              {item.icon}
              <span>{item.label}</span>
              <strong>{item.metric}</strong>
            </a>
          ))}
          </nav>
        </div>

        <section className="rail-section">
          <div className="rail-section-title">
            <DatabaseZap size={16} />
            <span>{text.sourcesStatus}</span>
          </div>
          <div className={`rail-source-overview ${language === 'en' ? 'rail-source-overview-en' : ''}`} aria-label={text.sourceOverview}>
            <div>
              <span>{text.sourceOkShort}</span>
              <strong>{formatNumber(okSourceCount, language)}</strong>
            </div>
            <div>
              <span>{text.sourceActionShort}</span>
              <strong>{formatNumber(actionSourceCount, language)}</strong>
            </div>
            <div>
              <span>{text.sourceCredentialShort}</span>
              <strong>{formatNumber(credentialGapCount, language)}</strong>
            </div>
          </div>
          <div className="source-stack">
            {(attentionRailSources.length ? attentionRailSources : sortedRailSources.slice(0, 3)).slice(0, 3).map((source) => {
              const status = sourceStatuses.get(source.id)
              const statusValue = status?.status ?? 'not_run'
              return (
                <div className={`source-mini source-${statusTone(statusValue)}`} key={source.id}>
                  <span className={`status-dot ${statusClass(statusValue)}`} />
                  <div>
                    <strong>{source.shortName}</strong>
                    <span>{statusText[language][statusValue] ?? statusValue}</span>
                    <small>
                      {statusValue === 'needs_credentials'
                        ? text.sourceCredentialShort
                        : isBackupMirror(source)
                          ? text.sourceMirrorShort
                          : source.type}
                    </small>
                  </div>
                  <b>{formatNumber(status?.itemCount ?? 0, language)}</b>
                </div>
              )
            })}
          </div>
          {actionSourceCount > 0 && <a className="rail-source-details" href="#settings-diagnostics"><span>{text.sourceDiagnosticsLink}</span><ArrowUpRight size={13} /></a>}
          <div className="rail-evidence-coverage">
            <span><ShieldAlert size={13} />{text.officialFileCoverage}</span>
            <strong>{formatOptionalNumber(officialOrRecapFileCount, language)} / {formatOptionalNumber(localDocumentCount, language)}</strong>
          </div>
          <div className="rail-source-footnote">
            <span>{text.sourceOfficialShort} {formatOptionalNumber(officialOrRecapFileCount, language)}</span>
            <span>{text.sourceAgencyShort} {formatOptionalNumber(officialAgencyFileCount, language)}</span>
            <span>{text.sourceMirrorShort} {formatOptionalNumber(backupMirrorFileCount, language)}</span>
          </div>
        </section>

        <div className="rail-footer">
          <p>{text.sourcePrimaryHint}</p>
          <a href="#settings" className="rail-settings-link">
            <span><Settings2 size={17} />{text.navSettings}</span>
            <SlidersHorizontal size={14} />
          </a>
        </div>
      </aside>

      <main className={`workspace workspace-${workspaceView.slice(1)}`}>
        <header className="topbar">
          <div>
            <p className="header-kicker">
              <span className="live-dot" />
              {text.headerKicker} · {dashboard.lastRefresh ? new Date(dashboard.lastRefresh.completedAt).toLocaleString(localeFor(language)) : text.notRefreshed}
            </p>
            <h2>{activeWorkspace.title}</h2>
            <p className="topbar-copy">{activeWorkspace.copy}</p>
            {workspaceView === '#timeline' && (
              <div className="scope-strip" aria-label={text.scopeLabel}>
                {text.scope.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <ThemeToggle theme={theme} text={text} onChange={setTheme} />
            <div className="language-switch" aria-label="Language">
              <Languages size={15} />
              <button type="button" className={language === 'zh' ? 'active' : ''} onClick={() => setLanguage('zh')}>
                {language === 'zh' ? '中文' : 'ZH'}
              </button>
              <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>
                EN
              </button>
            </div>
            <div className="header-stat">
              <span>{text.latest}</span>
              <strong>{dashboard.events[0]?.filingNumber ? `${language === 'zh' ? '文件' : 'Doc'} ${dashboard.events[0].filingNumber}` : text.notRefreshed}</strong>
            </div>
            <div className="header-stat">
              <span>{text.sources}</span>
              <strong>{dashboard.sourceStatuses.length}</strong>
            </div>
            <span className="ai-mode">
              <Bot size={16} />
              {dashboard.aiMode}
            </span>
            <button className="icon-button primary" type="button" onClick={refreshSources} disabled={refreshing} title={text.refresh}>
              {refreshing ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
              <span>{text.refresh}</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="error-strip">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {workspaceView === '#timeline' && (
          <section className="metric-grid" aria-label={text.metricsLabel}>
            <Metric tone="teal" icon={<Activity size={19} />} label={text.metricRecent} value={recentEventCount} detail={text.metricRecentDetail} language={language} />
            <Metric tone="red" icon={<ShieldAlert size={19} />} label={text.metricVerify} value={backupMirrorFileCount} detail={text.metricVerifyDetail} language={language} />
            <Metric tone="blue" icon={<Bot size={19} />} label={text.metricAiBacklog} value={aiBacklogCount} detail={aiBacklogDetail} language={language} />
            <Metric tone="green" icon={<CalendarClock size={19} />} label={text.metricDeadline} value={deadlineVerificationCount} detail={text.metricDeadlineDetail} language={language} />
            <Metric tone="gold" icon={<BookOpenCheck size={19} />} label={text.metricOpenIssues} value={openIssueCount} detail={text.metricOpenIssuesDetail} language={language} />
            <Metric tone="amber" icon={<AlertTriangle size={19} />} label={text.metricBlocked} value={actionSourceCount} detail={text.metricBlockedDetail} language={language} />
          </section>
        )}

        {workspaceView === '#documents' && (
          <DocumentWorkspaceTabs active={documentWorkspaceTab} text={text} onChange={setDocumentWorkspaceTab} />
        )}

        {workspaceView === '#documents' && documentWorkspaceTab === 'analytics' && documentAnalysis && (
          <IntelligenceBoard library={documentAnalysis} dashboard={dashboard} language={language} text={text} view="documents" />
        )}

	        {workspaceView === '#documents' && documentWorkspaceTab === 'audit' && (
	          <CompletenessAuditView
	            audit={completenessAudit}
	            relationshipAudit={relationshipAudit}
	            language={language}
	            text={text}
	            loading={completenessAuditLoading || relationshipAuditLoading}
	            error={completenessAuditError || relationshipAuditError}
	            onRefresh={() => void refreshCompletenessAuditView()}
	            onRetry={() => {
	              void loadCompletenessAudit(language)
	              void loadRelationshipAudit(language)
	            }}
	          />
	        )}

        {workspaceView === '#documents' && documentWorkspaceTab === 'automation' && (
          <AutomationConsole run={automationRun} text={text} language={language} loading={automationLoading} error={automationError} onStart={startAutomation} />
        )}

        {workspaceView === '#cases' && (
          <>
            <section className="analysis-band">
              <div>
                <p className="eyebrow">{text.portfolio}</p>
                <h3>{dashboard.portfolioAnalysis.thesis}</h3>
              </div>
              <div className="risk-line">
                {dashboard.portfolioAnalysis.priorityRisks.slice(0, 3).map((risk) => (
                  <span key={risk}>{risk}</span>
                ))}
              </div>
            </section>
            {documentAnalysis && (
              <IntelligenceBoard
                library={documentAnalysis}
                dashboard={dashboard}
                language={language}
                text={text}
                view="cases"
              />
            )}
          </>
        )}

        {workspaceView === '#cases' && monitoringProfile && (
          <section className="automation-grid single-workspace-panel">
            <MonitoringProfileView profile={monitoringProfile} text={text} sources={dashboard.sources} language={language} />
          </section>
        )}

        {workspaceView === '#positions' && (
          litigationPositions ? (
            <LitigationPositionsWorkspace
              library={litigationPositions}
              cases={dashboard.cases}
              language={language}
              text={text}
            />
          ) : (
            <section className="positions-status-panel">
              {litigationPositionsLoading ? <Loader2 className="spin" size={20} /> : <AlertTriangle size={20} />}
              <strong>{litigationPositionsLoading ? text.analysisLoading : text.documentPipelineError}</strong>
              {litigationPositionsError && <span>{litigationPositionsError}</span>}
              {!litigationPositionsLoading && <button type="button" onClick={() => void loadLitigationPositions(language)}>{text.retry}</button>}
            </section>
          )
        )}

        {workspaceView === '#documents' && ['files', 'review'].includes(documentWorkspaceTab) && (documentAnalysis || documentAnalysisLoading || documentAnalysisError) && (
          <section className="automation-grid">
            {documentAnalysis && documentAnalysisError && (
              <div className="catalog-error recoverable-api-error" role="status">
                <AlertTriangle size={14} />
                <span>{text.documentPipelineError}: {documentAnalysisError}</span>
                <button type="button" onClick={() => void loadDocumentAnalysis(language)}>{text.retry}</button>
              </div>
            )}
            {documentAnalysis && (
              <DocumentAnalysisView
                library={documentAnalysis}
                language={language}
                text={text}
                documentInsightUrl={documentInsightUrl}
                documentInsightLoading={documentInsightLoading}
                onAnalyzeDocument={analyzeDocument}
                onOpenDocument={openDocument}
                mode={documentWorkspaceTab === 'review' ? 'review' : 'files'}
              />
            )}
            {!documentAnalysis && (
              <DocumentAnalysisStatus
                loading={documentAnalysisLoading}
                error={documentAnalysisError}
                text={text}
                onRetry={() => void loadDocumentAnalysis(language)}
              />
            )}
          </section>
        )}

        {workspaceView === '#documents' && documentWorkspaceTab === 'files' && documents && (
          <DocumentLibraryView
            documents={documents}
            language={language}
            text={text}
            sources={dashboard.sources}
            onOpenDocument={openDocument}
          />
        )}

        {workspaceView === '#timeline' && <section className="work-grid" id="timeline">
          <div className="timeline-pane">
            <div className="pane-heading">
              <div>
                <p className="eyebrow">{text.timelineEyebrow}</p>
                <h3>{text.latestEvents}</h3>
              </div>
              <span>{filteredEvents.length} {text.items}</span>
            </div>

            <div className="filters">
              <label className="search-box">
                <Search size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.search} />
              </label>
              <CustomSelect
                className="select-box"
                value={caseFilter}
                options={[
                  { value: 'all', label: text.allCases },
                  ...dashboard.cases.map((caseRecord) => ({ value: caseRecord.id, label: caseRecord.shortTitle })),
                ]}
                onChange={setCaseFilter}
                icon={<SlidersHorizontal size={16} />}
                ariaLabel={text.allCases}
              />
              <CustomSelect
                className="select-box"
                value={categoryFilter}
                options={[
                  { value: 'all', label: text.allTypes },
                  ...categories.map((category) => ({ value: category, label: category })),
                ]}
                onChange={setCategoryFilter}
                icon={<FilterIcon />}
                ariaLabel={text.allTypes}
              />
            </div>

            <div className="event-list">
              {filteredEvents.slice(0, timelineLimit).map((event) => (
                <EventRow event={event} language={language} selected={event.id === selectedEvent?.id} onSelect={() => setSelectedEventId(event.id)} key={event.id} />
              ))}
            </div>
            {timelineLimit < filteredEvents.length && (
              <button className="catalog-load-button timeline-load-button" type="button" onClick={() => setTimelineLimit((current) => current + 40)}>
                {text.loadMore}
              </button>
            )}
          </div>

          <aside className="detail-pane">
            {selectedEvent && (
              <>
                <div className="detail-head">
                  <div>
                    <div className="detail-kicker">
                      <span className={`severity-pill severity-${selectedEvent.severity}`}>{severityText[language][selectedEvent.severity]}</span>
                      <span>{selectedEvent.category}</span>
                      <span>{formatEventDateWithBasis(selectedEvent, language)}</span>
                    </div>
                    <h3>{selectedEvent.title}</h3>
                    <p>{formatEventDateWithBasis(selectedEvent, language)} · {selectedEvent.court} · {selectedEvent.docketNumber}</p>
                  </div>
                  <a href={safeExternalHref(selectedEvent.sourceUrl)} target="_blank" rel="noreferrer" className="source-link">
                    {text.externalSource}
                    <ArrowUpRight size={16} />
                  </a>
                </div>

                <div className="detail-section">
                  <h4>{text.evidencePosture}</h4>
                  <dl className="fact-grid">
                    <div>
                      <dt>{text.filingNo}</dt>
                      <dd>{selectedEvent.filingNumber}</dd>
                    </div>
                    <div>
                      <dt>{text.source}</dt>
                      <dd>{selectedEvent.sourceLabel}</dd>
                    </div>
                    <div>
                      <dt>{text.type}</dt>
                      <dd>{selectedEvent.assertionType}</dd>
                    </div>
                    <div>
                      <dt>{text.confidence}</dt>
                      <dd>{confidenceText[language][selectedEvent.confidence] ?? selectedEvent.confidence}</dd>
                    </div>
                  </dl>
                  <p className="detail-copy">{selectedEvent.impact}</p>
                  {activeSource && <p className="source-note">{activeSource.limitations}</p>}
                </div>

                <div className="detail-section">
                  <h4>{text.aiAnalysis}</h4>
                  {analysisLoading ? (
                    <div className="analysis-loading">
                      <Loader2 className="spin" size={18} />
                      <span>{text.analysisLoading}</span>
                    </div>
                  ) : (
                    analysis && <AnalysisView analysis={analysis} text={text} language={language} />
                  )}
                </div>

                {activeCase && (
                  <div className="detail-section">
                    <h4>{text.activeCase}</h4>
                    <p className="case-title">{activeCase.title}</p>
                    <p className="detail-copy">{activeCase.focus}</p>
                  </div>
                )}
              </>
            )}
          </aside>
        </section>}

        {workspaceView === '#cases' && <section className="case-section" id="cases">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{text.casePortfolioEyebrow}</p>
              <h3>{text.casePortfolio}</h3>
            </div>
          </div>
          <div className="case-grid">
            {dashboard.cases.map((caseRecord) => (
              <article className="case-card" key={caseRecord.id}>
                <div className="case-card-top">
                  <span>{caseRecord.kind}</span>
                  <strong>{confidenceText[language][caseRecord.priority] ?? caseRecord.priority}</strong>
                </div>
                <h4>{caseRecord.shortTitle}</h4>
                <p>{caseRecord.status}</p>
                <dl>
                  <div>
                    <dt>{text.docketNo}</dt>
                    <dd>{caseRecord.docket}</dd>
                  </div>
                  <div>
                    <dt>{text.caseStage}</dt>
                    <dd>{caseRecord.stage}</dd>
                  </div>
                  <div>
                    <dt>{text.latestKnown}</dt>
                    <dd>{caseRecord.latestEvent?.filingNumber || caseRecord.lastKnownFiling}</dd>
                  </div>
                </dl>
                {caseRecord.latestEvent && <a className="case-latest-event" href={safeExternalHref(caseRecord.latestEvent.sourceUrl)} target="_blank" rel="noreferrer"><span>{formatDate(caseRecord.latestEvent.date, language)}</span><strong>{caseRecord.latestEvent.title}</strong><ArrowUpRight size={13} /></a>}
                <ExternalLinks sourceIds={caseRecord.sourceIds} sources={dashboard.sources} label={text.linkSources} />
                <ul>
                  {caseRecord.watchQuestions.slice(0, 1).map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>}

        {workspaceView === '#calendar' && proceduralCalendar && <ProceduralCalendarView calendar={proceduralCalendar} language={language} text={text} />}

        {workspaceView === '#entities' && (
          <>
            {documentAnalysis && (
              <IntelligenceBoard
                library={documentAnalysis}
                dashboard={dashboard}
                language={language}
                text={text}
                view="entities"
              />
            )}
            <section className="lower-grid">
              <div className="entity-panel" id="entities">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{text.entityEyebrow}</p>
                <h3>{text.entityMap}</h3>
              </div>
            </div>
            <div className="entity-list">
              {dashboard.entities.map((entity) => (
                <article className="entity-row" key={entity.id}>
                  <div className="entity-icon">
                    {entity.type.includes('Person') ? <UsersRound size={18} /> : entity.type.includes('Company') ? <Building2 size={18} /> : <CircleDollarSign size={18} />}
                  </div>
                  <div>
                    <h4>{entity.name}</h4>
                    <p>{entity.role}</p>
                    <div className="event-tags">
                      {entity.riskAreas.slice(0, 4).map((risk) => (
                        <span key={risk}>{risk}</span>
                      ))}
                    </div>
                    <ExternalLinks sourceIds={sourcesForEntity(entity, dashboard.cases)} sources={dashboard.sources} label={text.linkSources} compact />
                  </div>
                </article>
              ))}
            </div>
              </div>
            </section>
          </>
        )}

        {workspaceView === '#policy' && <PolicyWorkspace policies={dashboard.policyWatch} sources={dashboard.sources} text={text} />}

        {documentAnalysisDialogOpen && (
          <DocumentAnalysisDialog
            record={documentInsight}
            loading={documentInsightLoading}
            sourceUrl={documentInsightUrl}
            language={language}
            text={text}
            onClose={closeDocumentAnalysisDialog}
            onOpenDocument={openDocument}
            restoreFocusTo={documentModalTriggerRef.current}
          />
        )}

        {pdfTarget && (
          <PdfReaderDialog
            target={pdfTarget}
            language={language}
            text={text}
            onClose={closePdfReader}
            restoreFocusTo={documentModalTriggerRef.current}
          />
        )}
      </main>
    </div>
  )
}

function ThemeToggle({ theme, text, onChange }: { theme: Theme; text: (typeof ui)[Language]; onChange: (theme: Theme) => void }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const label = theme === 'dark' ? text.switchToLight : text.switchToDark
  return (
    <button className="theme-toggle" type="button" onClick={() => onChange(nextTheme)} title={label} aria-label={label}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

type CustomSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

function CustomSelect({
  value,
  options,
  onChange,
  icon,
  ariaLabel,
  className = '',
}: {
  value: string
  options: CustomSelectOption[]
  onChange: (value: string) => void
  icon?: ReactNode
  ariaLabel: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const listboxId = `${useId().replace(/:/g, '')}-listbox`
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const selectedOption = options[selectedIndex] ?? options[0]

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportMargin = 8
    const menuGap = 6
    const availableBelow = window.innerHeight - rect.bottom - menuGap - viewportMargin
    const availableAbove = rect.top - menuGap - viewportMargin
    const openAbove = availableBelow < 180 && availableAbove > availableBelow
    const maxHeight = Math.max(120, Math.min(320, openAbove ? availableAbove : availableBelow))
    const width = Math.min(Math.max(rect.width, 220), 340, window.innerWidth - viewportMargin * 2)
    const left = Math.min(Math.max(viewportMargin, rect.left), window.innerWidth - width - viewportMargin)
    setMenuStyle(openAbove
      ? { left, bottom: window.innerHeight - rect.top + menuGap, width, maxHeight }
      : { left, top: rect.bottom + menuGap, width, maxHeight })
  }, [])

  useLayoutEffect(() => {
    if (!open) return undefined
    setActiveIndex(selectedIndex)
    positionMenu()
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    const handlePositionChange = () => positionMenu()
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('resize', handlePositionChange)
    window.addEventListener('scroll', handlePositionChange, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', handlePositionChange)
      window.removeEventListener('scroll', handlePositionChange, true)
    }
  }, [open, positionMenu, selectedIndex])

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const moveActive = (direction: 1 | -1) => {
    if (!options.length) return
    let nextIndex = activeIndex
    do {
      nextIndex = (nextIndex + direction + options.length) % options.length
    } while (options[nextIndex]?.disabled && nextIndex !== activeIndex)
    setActiveIndex(nextIndex)
  }

  const chooseOption = (option: CustomSelectOption) => {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setActiveIndex(selectedIndex)
        setOpen(true)
      } else {
        moveActive(event.key === 'ArrowDown' ? 1 : -1)
      }
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) setOpen(true)
      else if (options[activeIndex]) chooseOption(options[activeIndex])
      return
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    }
    if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div className={`custom-select ${className} ${open ? 'open' : ''}`.trim()}>
      <button
        ref={triggerRef}
        className="custom-select-trigger"
        type="button"
        aria-label={`${ariaLabel}: ${selectedOption?.label ?? ariaLabel}`}
        title={selectedOption?.label ?? ariaLabel}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        {icon && <span className="custom-select-icon">{icon}</span>}
        <span className="custom-select-value" title={selectedOption?.label}>{selectedOption?.label ?? ariaLabel}</span>
        <ChevronDown className="custom-select-chevron" size={14} />
      </button>
      {open && createPortal(
        <div ref={menuRef} id={listboxId} className="custom-select-menu" style={menuStyle} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              className={`custom-select-option ${option.value === value ? 'selected' : ''} ${index === activeIndex ? 'active' : ''}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              data-option-index={index}
              title={option.label}
              onClick={() => chooseOption(option)}
              key={option.value}
            >
              <span className="custom-select-check">{option.value === value ? <Check size={14} /> : null}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

function LitigationPositionsWorkspace({
  library,
  cases,
  language,
  text,
}: {
  library: LitigationPositionsLibrary
  cases: CaseRecord[]
  language: Language
  text: (typeof ui)[Language]
}) {
  const [query, setQuery] = useState('')
  const [caseFilter, setCaseFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [selectedActionId, setSelectedActionId] = useState(library.actions[0]?.id ?? '')

  const availableActions = useMemo(() => [...new Set(library.actions.map((action) => action.actionKey))], [library.actions])
  const availableStatuses = useMemo(() => [...new Set(library.actions.map((action) => action.statusKey))], [library.actions])
  const visibleActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return library.actions
      .filter((action) => {
        const matchesCase = caseFilter === 'all' || action.caseId === caseFilter
        const matchesRole = roleFilter === 'all' || action.roleKey === roleFilter
        const matchesAction = actionFilter === 'all' || action.actionKey === actionFilter
        const matchesStatus = statusFilter === 'all' || action.statusKey === statusFilter
        const haystack = `${action.title} ${action.summary} ${action.filingNumber} ${action.docketNumber} ${action.roleLabel} ${action.actionLabel}`.toLowerCase()
        return matchesCase && matchesRole && matchesAction && matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery))
      })
      .sort((left, right) => {
        const dateOrder = left.date.localeCompare(right.date)
        return sortOrder === 'asc' ? dateOrder : -dateOrder
      })
  }, [actionFilter, caseFilter, library.actions, query, roleFilter, sortOrder, statusFilter])

  const selectedAction = visibleActions.find((action) => action.id === selectedActionId) ?? visibleActions[0] ?? null
  const roleSummary: LitigationRoleKey[] = ['government', 'defense', 'court', 'third_party', 'regulator', 'trustee']

  return (
    <section className="positions-workspace" id="positions">
      <div className="positions-summary-grid">
        <article>
          <span>{text.positionsTotal}</span>
          <strong>{formatNumber(library.counts.total, language)}</strong>
          <small>{formatNumber(library.counts.explicit, language)} {text.positionsExplicit}</small>
        </article>
        {roleSummary.map((roleKey) => (
          <button
            className={`position-role-summary role-${roleKey} ${roleFilter === roleKey ? 'active' : ''}`}
            type="button"
            onClick={() => setRoleFilter((current) => current === roleKey ? 'all' : roleKey)}
            key={roleKey}
          >
            <span>{library.labels.roles[roleKey]}</span>
            <strong>{formatNumber(library.counts.roleCounts[roleKey] ?? 0, language)}</strong>
          </button>
        ))}
        <article className="positions-verify-summary">
          <span>{text.positionsVerify}</span>
          <strong>{formatNumber(library.counts.needsVerification, language)}</strong>
          <small>{formatNumber(library.counts.courtResolved, language)} {text.positionsResolved}</small>
        </article>
      </div>

      <div className="positions-methodology">
        <ShieldCheck size={16} />
        <p>{library.methodology}</p>
        <span>{text.positionNotOutcome}</span>
      </div>

      <div className="positions-filterbar">
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.positionsSearch} />
        </label>
        <CustomSelect className="select-box" value={caseFilter} options={[{ value: 'all', label: text.allCases }, ...cases.map((record) => ({ value: record.id, label: record.shortTitle }))]} onChange={setCaseFilter} icon={<BriefcaseBusiness size={15} />} ariaLabel={text.allCases} />
        <CustomSelect className="select-box" value={roleFilter} options={[{ value: 'all', label: text.allRoles }, ...Object.entries(library.labels.roles).map(([value, label]) => ({ value, label }))]} onChange={setRoleFilter} icon={<UsersRound size={15} />} ariaLabel={text.allRoles} />
        <CustomSelect className="select-box" value={actionFilter} options={[{ value: 'all', label: text.allActions }, ...availableActions.map((key) => ({ value: key, label: library.labels.actions[key] }))]} onChange={setActionFilter} icon={<SlidersHorizontal size={15} />} ariaLabel={text.allActions} />
        <CustomSelect className="select-box" value={statusFilter} options={[{ value: 'all', label: text.allStatuses }, ...availableStatuses.map((key) => ({ value: key, label: library.labels.statuses[key] }))]} onChange={setStatusFilter} icon={<ClipboardCheck size={15} />} ariaLabel={text.allStatuses} />
        <CustomSelect className="select-box" value={sortOrder} options={[{ value: 'desc', label: text.newestFirst }, { value: 'asc', label: text.oldestFirst }]} onChange={(value) => setSortOrder(value === 'asc' ? 'asc' : 'desc')} icon={<ArrowDownUp size={15} />} ariaLabel={text.newestFirst} />
      </div>

      <div className="positions-grid">
        <div className="positions-list-panel">
          <div className="pane-heading">
            <div><p className="eyebrow">{text.positionsEyebrow}</p><h3>{text.positionsTitle}</h3></div>
            <span>{text.positionsShowing} {formatNumber(visibleActions.length, language)}</span>
          </div>
          <div className="positions-list">
            {visibleActions.map((action) => (
              <button
                className={`position-row role-${action.roleKey} ${selectedAction?.id === action.id ? 'selected' : ''}`}
                type="button"
                onClick={() => setSelectedActionId(action.id)}
                key={action.id}
              >
                <time dateTime={action.date}>{formatDate(action.date, language)}</time>
                <div>
                  <div className="position-row-meta">
                    <span className="position-role-chip">{action.roleLabel}</span>
                    <span>{action.actionLabel}</span>
                    <span>{action.statusLabel}</span>
                    {action.courtDispositionLabel && <span className="position-court-result">{action.courtDispositionLabel}</span>}
                  </div>
                  <strong>{action.title}</strong>
                  <p>{action.caseTitle} · {language === 'zh' ? '文件' : 'Doc'} {action.filingNumber}</p>
                </div>
                {action.requiresVerification ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
              </button>
            ))}
            {!visibleActions.length && <p className="positions-empty">{text.noPositionActions}</p>}
          </div>
        </div>

        <aside className="position-detail-panel">
          {selectedAction ? (
            <>
              <div className="position-detail-head">
                <div className="position-row-meta">
                  <span className={`position-role-chip role-${selectedAction.roleKey}`}>{selectedAction.roleLabel}</span>
                  <span>{selectedAction.actionLabel}</span>
                  <span>{formatDate(selectedAction.date, language)}</span>
                </div>
                <h3>{selectedAction.title}</h3>
                <p>{selectedAction.court} · {selectedAction.docketNumber} · {language === 'zh' ? '文件' : 'Doc'} {selectedAction.filingNumber}</p>
              </div>
              <div className="position-detail-body">
                <dl className="position-facts">
                  <div><dt>{text.recordedAction}</dt><dd>{selectedAction.actionLabel}</dd></div>
                  <div><dt>{text.proceduralStatusLabel}</dt><dd>{selectedAction.statusLabel}</dd></div>
                  {selectedAction.courtDispositionLabel && <div><dt>{language === 'zh' ? '法院处理结果' : 'Court disposition'}</dt><dd>{selectedAction.courtDispositionLabel}</dd></div>}
                  <div><dt>{text.identificationBasis}</dt><dd>{selectedAction.roleBasisLabel}</dd></div>
                  <div><dt>{text.sourceAuthorityLabel}</dt><dd>{selectedAction.primarySource ? text.primaryRecord : text.verificationRequired}</dd></div>
                </dl>
                <section>
                  <h4>{text.fileSummary}</h4>
                  <p>{selectedAction.summary}</p>
                </section>
                <section>
                  <h4>{text.meaning}</h4>
                  <p>{selectedAction.significance}</p>
                </section>
                <div className={`position-source-note ${selectedAction.requiresVerification ? 'needs-verification' : ''}`}>
                  {selectedAction.requiresVerification ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                  <div><strong>{selectedAction.sourceLabel}</strong><p>{selectedAction.sourceNote || library.sourceBoundary}</p></div>
                </div>
                <a className="position-source-link" href={safeExternalHref(selectedAction.sourceUrl)} target="_blank" rel="noreferrer">
                  {text.openOriginalFiling}<ArrowUpRight size={15} />
                </a>
              </div>
            </>
          ) : <p className="positions-empty">{text.noPositionActions}</p>}
        </aside>
      </div>
    </section>
  )
}

function DocumentWorkspaceTabs({ active, text, onChange }: { active: DocumentWorkspaceTab; text: (typeof ui)[Language]; onChange: (tab: DocumentWorkspaceTab) => void }) {
  const tabs: Array<{ id: DocumentWorkspaceTab; label: string; detail: string; icon: ReactNode }> = [
    { id: 'files', label: text.documentTabFiles, detail: text.documentFilesSummary, icon: <FolderOpen size={15} /> },
    { id: 'review', label: text.documentTabReview, detail: text.documentReviewSummary, icon: <ClipboardCheck size={15} /> },
    { id: 'audit', label: text.documentTabAudit, detail: text.documentAuditSummary, icon: <ShieldCheck size={15} /> },
    { id: 'analytics', label: text.documentTabAnalytics, detail: text.documentAnalyticsSummary, icon: <Activity size={15} /> },
    { id: 'automation', label: text.documentTabAutomation, detail: text.documentAutomationSummary, icon: <Workflow size={15} /> },
  ]
  return (
    <section className="workspace-tabs" aria-label={text.documentTabsLabel}>
      <div className="workspace-tab-list" role="tablist">
        {tabs.map((tab) => (
          <button type="button" role="tab" aria-selected={active === tab.id} className={active === tab.id ? 'active' : ''} onClick={() => onChange(tab.id)} key={tab.id}>
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <p>{tabs.find((tab) => tab.id === active)?.detail}</p>
    </section>
  )
}

function EventRow({ event, selected, onSelect, language }: { event: EventRecord; selected: boolean; onSelect: () => void; language: Language }) {
  const date = formatDateParts(event.date, language)
  const dateBasis = eventDateBasisLabel(event.dateBasis, language)

  return (
    <button type="button" className={`event-row ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="event-date">
        <strong>{date.day}</strong>
        <span>{date.year}</span>
        {dateBasis && <small>{dateBasis}</small>}
      </div>
      <div className="event-row-main">
        <div className="event-row-top">
          <div className="event-row-kicker">
            <span className={`severity-pill severity-${event.severity}`}>{severityText[language][event.severity]}</span>
            <span>{event.category}</span>
            <span>{event.sourceType}</span>
          </div>
          <span className="filing-code">{event.docketNumber}</span>
        </div>
        <strong className="event-title">{event.title}</strong>
        <p>{event.summary}</p>
        <div className="event-tags">
          <span>{event.assertionType}</span>
          <span>{event.filingNumber}</span>
          {event.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </button>
  )
}

function eventDateBasisLabel(dateBasis: EventRecord['dateBasis'], language: Language) {
  const labels = {
    court_filed: { zh: '法院提交日', en: 'Court filed' },
    court_entered: { zh: '法院入卷日', en: 'Court entered' },
    agency_published: { zh: '机构发布日期', en: 'Agency published' },
    source_reported: { zh: '来源记载日', en: 'Source reported' },
  }
  return dateBasis ? labels[dateBasis]?.[language] ?? '' : ''
}

function formatEventDateWithBasis(event: EventRecord, language: Language) {
  const basis = eventDateBasisLabel(event.dateBasis, language)
  const date = formatDate(event.date, language)
  return basis ? `${basis} · ${date}` : date
}

function ExternalLinks({ sourceIds, sources, label, compact = false }: { sourceIds: string[]; sources: SourceRecord[]; label: string; compact?: boolean }) {
  const linkedSources = sourceIds.map((sourceId) => sourceById(sources, sourceId)).filter((source): source is SourceRecord => Boolean(source))
  if (!linkedSources.length) return null

  return (
    <div className={`external-links ${compact ? 'compact' : ''}`}>
      <span>{label}</span>
      {linkedSources.slice(0, compact ? 3 : 5).map((source) => (
        <a href={safeExternalHref(source.url)} target="_blank" rel="noreferrer" key={source.id}>
          {source.shortName}
          <ArrowUpRight size={12} />
        </a>
      ))}
    </div>
  )
}

function PolicyWorkspace({ policies, sources, text }: { policies: PolicyWatch[]; sources: SourceRecord[]; text: (typeof ui)[Language] }) {
  const [areaFilter, setAreaFilter] = useState('all')
  const areas = [...new Set(policies.map((policy) => policy.area))].sort()
  const visiblePolicies = policies.filter((policy) => areaFilter === 'all' || policy.area === areaFilter)
  return (
    <section className="lower-grid">
      <div className="policy-panel" id="policy">
        <div className="section-heading policy-heading">
          <div><p className="eyebrow">{text.policyEyebrow}</p><h3>{text.policyTitle}</h3></div>
          <CustomSelect
            className="select-box"
            value={areaFilter}
            options={[{ value: 'all', label: text.allPolicyAreas }, ...areas.map((area) => ({ value: area, label: area }))]}
            onChange={setAreaFilter}
            icon={<Landmark size={15} />}
            ariaLabel={text.allPolicyAreas}
          />
        </div>
        <div className="policy-list">
          {visiblePolicies.map((policy) => (
            <article className="policy-row" key={policy.id}>
              <div className="policy-main">
                <span>{policy.area}</span>
                <h4>{policy.title}</h4>
                <p>{policy.relevance}</p>
                <ExternalLinks sourceIds={policy.sourceIds} sources={sources} label={text.linkSources} compact />
              </div>
              <div className="policy-context">
                <strong>{policy.posture}</strong>
                {policy.monitorTerms.length > 0 && <div><span>{text.monitorTermsLabel}</span><p>{policy.monitorTerms.join(' / ')}</p></div>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProceduralCalendarView({ calendar, language, text }: { calendar: ProceduralCalendar; language: Language; text: (typeof ui)[Language] }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [caseFilter, setCaseFilter] = useState('all')
  const [visibleLimit, setVisibleLimit] = useState(24)
  const known = calendar.items.filter((item) => item.status === 'known').length
  const inferred = calendar.items.filter((item) => item.status === 'inferred').length
  const verify = calendar.items.length - known - inferred
  const cases = [...new Map(calendar.items.map((item) => [item.caseId, item.caseTitle])).entries()]
  const filteredItems = calendar.items.filter((item) => (statusFilter === 'all' || item.status === statusFilter) && (caseFilter === 'all' || item.caseId === caseFilter))
  const visibleItems = filteredItems.slice(0, visibleLimit)
  const updateStatusFilter = (value: string) => {
    setStatusFilter(value)
    setVisibleLimit(24)
  }
  const updateCaseFilter = (value: string) => {
    setCaseFilter(value)
    setVisibleLimit(24)
  }
  return (
    <section className="calendar-panel" id="calendar">
      <div className="section-heading calendar-heading">
        <div>
          <p className="eyebrow">{text.calendarEyebrow}</p>
          <h3>{text.calendarTitle}</h3>
        </div>
        <div className="calendar-totals">
          <span><strong>{formatNumber(known, language)}</strong>{text.calendarKnown}</span>
          <span><strong>{formatNumber(verify, language)}</strong>{text.calendarNeedsVerification}</span>
          <span><strong>{formatNumber(inferred, language)}</strong>{text.calendarInferred}</span>
        </div>
      </div>
      <div className="calendar-filters">
        <div className="filter-tabs" role="group" aria-label={text.calendarTitle}>
          {[
            ['all', text.calendarFilterAll],
            ['known', text.calendarKnown],
            ['needs_verification', text.calendarNeedsVerification],
            ['inferred', text.calendarInferred],
          ].map(([value, label]) => <button type="button" className={statusFilter === value ? 'active' : ''} onClick={() => updateStatusFilter(value)} key={value}>{label}</button>)}
        </div>
        <CustomSelect
          className="select-box"
          value={caseFilter}
          options={[{ value: 'all', label: text.calendarCaseFilter }, ...cases.map(([value, label]) => ({ value, label }))]}
          onChange={updateCaseFilter}
          icon={<BriefcaseBusiness size={15} />}
          ariaLabel={text.calendarCaseFilter}
        />
      </div>
      <div className="calendar-disclaimer"><ShieldAlert size={15} /><span>{calendar.disclaimer}</span></div>
      <div className="calendar-list">
        {visibleItems.map((item) => (
          <article className="calendar-row" key={item.id}>
            <time dateTime={item.date}><strong>{formatDate(item.date, language)}</strong><span>{item.deadlineType}</span></time>
            <div>
              <div className="calendar-row-title">
                <span className={`calendar-status status-${item.status}`}>{item.statusLabel}</span>
                <strong>{item.title}</strong>
              </div>
              <p>{item.caseTitle} · {item.docket}</p>
              <small>{item.note}</small>
            </div>
            <a href={safeExternalHref(item.sourceUrl)} target="_blank" rel="noreferrer" title={item.sourceTier}>
              <span>{text.calendarBasis}: {item.basisDoc}</span>
              <ArrowUpRight size={13} />
            </a>
          </article>
        ))}
        {!filteredItems.length && <p className="calendar-empty">{text.noCalendarItems}</p>}
      </div>
      {visibleItems.length < filteredItems.length && (
        <button className="catalog-load-button calendar-load-button" type="button" onClick={() => setVisibleLimit((current) => current + 24)}>
          {text.loadMore} · {formatNumber(visibleItems.length, language)} / {formatNumber(filteredItems.length, language)}
        </button>
      )}
    </section>
  )
}

function MonitoringProfileView({
  profile,
  text,
  sources,
  language,
}: {
  profile: MonitoringProfile
  text: (typeof ui)[Language]
  sources: SourceRecord[]
  language: Language
}) {
  return (
    <section className="automation-panel monitor-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">{text.neutralMonitorEyebrow}</p>
          <h3>{text.neutralMonitor}</h3>
        </div>
        <span className="panel-badge">
          <Scale size={14} />
          {profile.posture}
        </span>
      </div>

      <div className="monitor-body">
        <p className="neutral-copy">{profile.description}</p>
        <div className="watch-topic-grid">
          {profile.watchTopics.slice(0, 4).map((topic) => (
            <article className="watch-topic-card" key={topic.id}>
              <div>
                <span className={`priority-chip priority-${topic.priority}`}>{severityText[language][topic.priority as Severity] ?? topic.priority}</span>
                <h4>{topic.title}</h4>
                <p>{topic.scope}</p>
                <div className="event-tags">
                  {topic.keywords.slice(0, 3).map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              </div>
              <ExternalLinks sourceIds={topic.sourceIds} sources={sources} label={text.linkSources} compact />
            </article>
          ))}
        </div>

        <details className="monitor-details">
          <summary>
            <ClipboardCheck size={15} />
            <span>{text.monitorDetails}</span>
          </summary>
          <div className="monitor-details-body">
            <div className="rule-grid">
              {profile.operatingRules.slice(0, 4).map((rule) => (
                <article className="rule-card" key={rule.id}>
                  <ClipboardCheck size={16} />
                  <h4>{rule.title}</h4>
                  <p>{rule.description}</p>
                </article>
              ))}
            </div>
            <div className="automation-columns">
              <AutomationList icon={<Search size={15} />} title={text.discoveryRules} items={profile.automation.newCaseDiscovery} />
              <AutomationList icon={<Bot size={15} />} title={text.aiQueue} items={profile.automation.aiPolicy} />
            </div>
          </div>
        </details>
      </div>
    </section>
  )
}

function IntelligenceBoard({
  library,
  dashboard,
  language,
  text,
  view,
}: {
  library: DocumentAnalysisLibrary
  dashboard: Dashboard
  language: Language
  text: (typeof ui)[Language]
  view: 'documents' | 'cases' | 'entities'
}) {
  const [selectedDossier, setSelectedDossier] = useState<CaseDossier | null>(null)
  const [visibleCaseRows, setVisibleCaseRows] = useState(8)
  const [visibleDossiers, setVisibleDossiers] = useState(8)
  const dossierTriggerRef = useRef<HTMLElement | null>(null)
  const graphNodeLabels = new Map([
    ...dashboard.cases.map((caseRecord) => [caseRecord.id, caseRecord.shortTitle] as const),
    ...dashboard.entities.map((entity) => [entity.id, entity.name] as const),
  ])
  const graphNodes = library.analytics.relationshipGraph.nodes.map((node) => ({
    ...node,
    label: graphNodeLabels.get(node.id) ?? node.label,
  }))
  const graphLinks = library.analytics.relationshipGraph.links
  const heading = view === 'documents' ? text.intelligenceBoard : view === 'cases' ? text.caseMatrix : text.relationshipMap
  const eyebrow = view === 'documents' ? text.intelligenceBoardEyebrow : view === 'cases' ? text.casePortfolioEyebrow : text.entityEyebrow
  const badge = view === 'documents'
    ? (dashboard.generatedAt ? new Date(dashboard.generatedAt).toLocaleString(localeFor(language)) : dashboard.aiMode)
    : view === 'cases'
      ? formatNumber(library.caseDossiers.length, language)
      : `${formatNumber(graphLinks.length, language)} ${language === 'zh' ? '条关系' : 'links'}`
  return (
    <section className={`intel-board intel-board-${view}`}>
      {view !== 'entities' && <div className="section-heading intel-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{heading}</h3>
        </div>
        <span className="panel-badge">
          {view === 'cases' ? <BookOpenCheck size={14} /> : <Activity size={14} />}
          {badge}
        </span>
      </div>}

      {view === 'documents' && (
        <div className="intel-spotlight intel-spotlight-documents">
          <div>
            <span>{text.officialSourcePriority}</span>
            <strong>{formatNumber(library.analytics.gaps.officialOrRecapFiles, language)} / {formatNumber(library.analytics.gaps.backupMirrorFiles, language)}</strong>
            <p>{library.sourceStrategy.nfscPolicy}</p>
          </div>
          <div>
            <span>{text.bodyExtraction}</span>
            <strong>{formatNumber(library.counts.cachedExtractions, language)} / {formatNumber(library.counts.localAvailable, language)}</strong>
            <p>{library.extraction.detail}</p>
          </div>
        </div>
      )}

      {view === 'documents' && (
        <div className="intel-grid">
          <div className="visual-panel activity-panel">
            <ChartHeader
              icon={<Activity size={16} />}
              title={text.activityTrend}
              meta={`${text.maxValue}: ${formatNumber(maxTimelineValue(library.analytics.activityTimeline), language)}`}
              detail={text.chartActivityInsight}
            />
            <ActivityChart data={library.analytics.activityTimeline} language={language} text={text} />
          </div>

          <div className="visual-panel">
            <ChartHeader
              icon={<FileSearch size={16} />}
              title={text.documentMix}
              meta={`${formatNumber(library.counts.totalFiles, language)} ${text.docsShort}`}
              detail={text.chartDocumentInsight}
            />
            <HorizontalBars data={library.analytics.categoryDistribution.slice(0, 8)} language={language} emptyLabel={text.noChartData} />
          </div>

          <div className="visual-panel">
            <ChartHeader
              icon={<ShieldCheck size={16} />}
              title={text.sourceAuthority}
              meta={`${formatNumber(library.analytics.gaps.backupMirrorFiles, language)} NFSC`}
              detail={text.chartSourceInsight}
            />
            <SourceAuthorityView
              sources={library.analytics.sourceDistribution}
              tiers={library.analytics.verificationDistribution}
              language={language}
              emptyLabel={text.noChartData}
              text={text}
            />
          </div>

          <div className="visual-panel">
            <ChartHeader
              icon={<ShieldAlert size={16} />}
              title={text.priorityLoad}
              meta={`${formatNumber(library.counts.highPriority, language)} ${text.highPriorityShort}`}
              detail={text.chartPriorityInsight}
            />
            <PriorityStack data={library.analytics.priorityDistribution} language={language} text={text} />
          </div>

          <div className="visual-panel automation-visual-panel">
            <ChartHeader icon={<Workflow size={16} />} title={text.automationMap} meta={library.mode} detail={text.chartAutomationInsight} />
            <PipelineMap automation={library.automation} language={language} />
          </div>
        </div>
      )}

      {view === 'entities' && (
        <div className="intel-grid">
        <div className="visual-panel relationship-panel">
          <ChartHeader
            icon={<ChartNetwork size={16} />}
            title={text.relationshipMap}
            meta={`${formatNumber(graphLinks.length, language)} ${language === 'zh' ? '条关系' : 'links'}`}
            detail={text.chartRelationshipInsight}
          />
          <RelationshipGraph nodes={graphNodes} links={graphLinks} language={language} text={text} />
        </div>
        </div>
      )}

      {view === 'cases' && (
        <>
      <div className="case-matrix-panel">
        <div className="section-heading compact inline-heading">
          <div>
            <p className="eyebrow">{text.casePortfolioEyebrow}</p>
            <h3>{text.caseMatrix}</h3>
          </div>
          <span className="panel-badge">
            <Landmark size={14} />
            {formatNumber(library.analytics.caseMatrix.length, language)}
          </span>
        </div>
        <div className="case-matrix-grid">
          {library.analytics.caseMatrix.slice(0, visibleCaseRows).map((row) => (
            <article className="case-matrix-row" key={row.caseId}>
              <div>
                <strong>{row.shortTitle}</strong>
                <span>{row.docket}</span>
                <p><b>{text.caseStage}</b>{row.stage}</p>
                {library.caseDossiers.find((dossier) => dossier.caseId === row.caseId)?.controllingDocs[0] && (() => {
                  const document = library.caseDossiers.find((dossier) => dossier.caseId === row.caseId)?.controllingDocs[0]
                  return document ? <a className="matrix-controlling-doc" href={safeExternalHref(document.sourceUrl)} target="_blank" rel="noreferrer"><span>{text.latestControllingDoc}</span>{document.docNumber ? `${language === 'zh' ? '文件' : 'Doc'} ${document.docNumber}` : document.title}<ArrowUpRight size={12} /></a> : null
                })()}
              </div>
              <div className="case-matrix-stats">
                <span><strong>{formatNumber(row.events, language)}</strong>{text.eventsShort}</span>
                <span><strong>{formatNumber(row.documents, language)}</strong>{text.docsShort}</span>
                <span className={row.highPriorityDocuments > 0 ? 'has-value' : ''}><strong>{formatNumber(row.highPriorityDocuments, language)}</strong>{text.highPriorityShort}</span>
                <span className={row.sourceGaps > 0 ? 'needs-action' : ''}><strong>{formatNumber(row.sourceGaps, language)}</strong>{text.sourceGapsShort}</span>
              </div>
              {(() => {
                const caseRecord = dashboard.cases.find((item) => item.id === row.caseId)
                const dossier = library.caseDossiers.find((item) => item.caseId === row.caseId)
                return (
                  <div className="case-matrix-next">
                    <span><strong>{text.unresolvedIssues}</strong>{formatNumber(dossier?.unresolvedIssues.length ?? caseRecord?.watchQuestions.length ?? 0, language)}</span>
                    <p><b>{text.nextQuestion}</b>{dossier?.unresolvedIssues[0] ?? caseRecord?.watchQuestions[0] ?? caseRecord?.focus}</p>
                    {dossier?.aiDossier?.generatedAt && (
                      <small>
                        {caseDossierProviderLabel(dossier.aiDossier, language)} · {text.aiDossierUpdated}: {new Date(dossier.aiDossier.generatedAt).toLocaleString(localeFor(language))}
                      </small>
                    )}
                  </div>
                )
              })()}
            </article>
          ))}
        </div>
        {visibleCaseRows < library.analytics.caseMatrix.length && (
          <button className="catalog-load-button case-load-button" type="button" onClick={() => setVisibleCaseRows((current) => current + 8)}>
            {text.loadMore} · {formatNumber(visibleCaseRows, language)} / {formatNumber(library.analytics.caseMatrix.length, language)}
          </button>
        )}
      </div>

      <div className="case-dossier-strip">
        <div className="section-heading compact inline-heading">
          <div>
            <p className="eyebrow">{text.overallRead}</p>
            <h3>{text.caseDossiers}</h3>
          </div>
          <span className="panel-badge">
            <BookOpenCheck size={14} />
            {formatNumber(library.caseDossiers.length, language)}
          </span>
        </div>
        <div className="dossier-grid">
          {library.caseDossiers.slice(0, visibleDossiers).map((dossier) => (
            <CaseDossierCard
              dossier={dossier}
              language={language}
              text={text}
              onOpen={(trigger) => {
                dossierTriggerRef.current = trigger
                setSelectedDossier(dossier)
              }}
              key={dossier.caseId}
            />
          ))}
        </div>
        {visibleDossiers < library.caseDossiers.length && (
          <button className="catalog-load-button case-load-button" type="button" onClick={() => setVisibleDossiers((current) => current + 8)}>
            {text.loadMore} · {formatNumber(visibleDossiers, language)} / {formatNumber(library.caseDossiers.length, language)}
          </button>
        )}
      </div>
      {selectedDossier && (
        <CaseDossierDialog
          dossier={selectedDossier}
          language={language}
          text={text}
          onClose={() => setSelectedDossier(null)}
          restoreFocusTo={dossierTriggerRef.current}
        />
      )}
        </>
      )}
    </section>
  )
}

function ChartHeader({ icon, title, meta, detail }: { icon: ReactNode; title: string; meta: string; detail?: string }) {
  return (
    <div className="chart-head-wrap">
      <div className="chart-head">
        <div>
          {icon}
          <strong>{title}</strong>
        </div>
        <span>{meta}</span>
      </div>
      {detail && <p className="chart-note">{detail}</p>}
    </div>
  )
}

function AutomationConsole({
  run,
  text,
  language,
  loading,
  error,
  onStart,
}: {
  run: AutomationRun | null
  text: (typeof ui)[Language]
  language: Language
  loading: boolean
  error: string
  onStart: (mode: 'deep' | 'full') => void
}) {
  const status = run?.status ?? 'idle'
  const hasCapabilityGaps = Boolean(run?.outputs.blocked.length)
  const startedAt = run?.startedAt ? new Date(run.startedAt).toLocaleString(localeFor(language)) : text.automationIdle
  const updatedAt = run?.updatedAt ? new Date(run.updatedAt).toLocaleString(localeFor(language)) : text.automationIdle
  const statusLabel = automationStatusLabel(status, hasCapabilityGaps, text)
  const outputs = run?.outputs
  const steps = run?.steps ?? []
  const processingScope = run?.requested.processingScope === 'all' ? text.automaticScopeAll : text.automaticScopePriority
  const progress = run?.progress.total ? Math.round((run.progress.done / Math.max(1, run.progress.total)) * 100) : 0
  return (
    <section className="automation-console">
      <div className="section-heading automation-console-heading">
        <div>
          <p className="eyebrow">{text.automationConsoleEyebrow}</p>
          <h3>{text.automationConsole}</h3>
        </div>
        <span className={`run-status run-${status}${status === 'complete' && hasCapabilityGaps ? ' run-complete-gaps' : ''}`}>
          {status === 'running' ? <Loader2 className="spin" size={14} /> : <Workflow size={14} />}
          {statusLabel}
        </span>
      </div>

      <div className="automation-console-body">
        <div className="run-brief">
          <div>
            <span>{text.automationScope}</span>
            <strong>{processingScope}</strong>
            <p>{run?.currentStep || text.automationIdle}</p>
            <small>{text.pacerBoundary}</small>
          </div>
          <div className="run-progress-card">
            <div>
              <span>{startedAt}</span>
              <strong>{progress}%</strong>
              <span>{text.automationUpdated}: {updatedAt}</span>
            </div>
            <i>
              <b style={{ width: `${progress}%` }} />
            </i>
          </div>
          <div className="run-actions">
            <button type="button" onClick={() => onStart('deep')} disabled={loading || status === 'running'}>
              {loading && status !== 'running' ? <Loader2 className="spin" size={14} /> : <DatabaseZap size={14} />}
              {loading ? text.automationStarting : text.automationStartDeep}
            </button>
            <button type="button" onClick={() => onStart('full')} disabled={loading || status === 'running'}>
              <CloudDownload size={14} />
              {text.automationStartFull}
            </button>
          </div>
        </div>

        {error && (
          <div className="catalog-error">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="run-mode-grid">
          <article>
            <strong>{text.automationStartDeep}</strong>
            <p>{text.automationDeepDetail}</p>
          </article>
          <article>
            <strong>{text.automationStartFull}</strong>
            <p>{text.automationFullDetail}</p>
          </article>
        </div>

        <div className="automation-capability-note">
          <Cpu size={17} />
          <div>
            <strong>{text.automationCapabilityTitle}</strong>
            <p>{text.automationCapabilityDetail}</p>
          </div>
        </div>

        <div className="run-output-heading">
          <strong>{text.automationOutput}</strong>
          <span>{text.automationOutputScope}</span>
        </div>
        <div className="run-output-grid">
          <span><strong>{formatNumber(outputs?.manifestFiles ?? 0, language)}</strong>{text.collected}</span>
          <span><strong>{formatNumber((outputs?.downloaded ?? 0) + (outputs?.skippedExisting ?? 0), language)}</strong>{text.localAvailable}</span>
          <span><strong>{formatNumber(outputs?.extracted ?? 0, language)}</strong>{text.bodyExtraction}</span>
          <span><strong>{formatNumber(outputs?.translated ?? 0, language)}</strong>{text.translatedText}</span>
          <span><strong>{formatNumber(outputs?.sourceAlreadyTargetLanguage ?? 0, language)}</strong>{text.sourceAlreadyTargetLanguage}</span>
          <span><strong>{formatNumber(outputs?.redactedTranslated ?? 0, language)}</strong>{text.redactedBodyTranslation}</span>
          <span><strong>{formatNumber(outputs?.partiallyTranslated ?? 0, language)}</strong>{text.partialBodyTranslation}</span>
          <span><strong>{formatNumber(outputs?.assistiveTranslated ?? 0, language)}</strong>{text.assistiveTranslation}</span>
          <span><strong>{formatNumber(outputs?.aiAnalyzed ?? 0, language)}</strong>{text.aiReadsDone}</span>
          <span><strong>{formatNumber(outputs?.localRuleAnalyzed ?? 0, language)}</strong>{text.localRuleReadsDone}</span>
          <span><strong>{formatNumber(outputs?.caseDossiers ?? 0, language)}</strong>{text.caseReadsDone}</span>
          <span><strong>{formatNumber(outputs?.caseAiDossiers ?? 0, language)}</strong>{text.caseAiReadsDone}</span>
          <span><strong>{formatNumber(outputs?.deferredDownloads ?? 0, language)}</strong>{text.deferredDownloads}</span>
        </div>

        <div className="run-step-grid">
          {steps.map((step, index) => (
            <article className={`run-step step-${step.status}`} key={step.id}>
              <div>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {stageIcon(step.id)}
              </div>
              <strong>{step.label}</strong>
              <small>{formatNumber(step.done, language)} / {formatNumber(step.total, language)}</small>
              <i>
                <b style={{ width: `${step.total ? Math.min(100, Math.round((step.done / step.total) * 100)) : ['complete', 'local_only', 'attention'].includes(step.status) ? 100 : 0}%` }} />
              </i>
              <p>{step.error || step.detail}</p>
            </article>
          ))}
        </div>

        {Boolean(run?.outputs.blocked.length) && (
          <div className="blocker-list run-blockers">
            {run?.outputs.blocked.slice(0, 4).map((item) => (
              <span key={item}>
                <AlertTriangle size={13} />
                {item}
              </span>
            ))}
          </div>
        )}

        {Boolean(run?.logs.length) && (
          <details className="run-log-details">
            <summary>
              <FileText size={15} />
              <span>{text.automationLogs}</span>
            </summary>
            <div>
              {run?.logs.slice(-10).map((item) => (
                <p key={`${item.at}-${item.message}`}>
                  <span>{new Date(item.at).toLocaleTimeString(localeFor(language))}</span>
                  {item.message}
                </p>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  )
}

function automationStatusLabel(status: string, hasCapabilityGaps: boolean, text: (typeof ui)[Language]) {
  if (status === 'running') return text.automationRunning
  if (status === 'complete') return hasCapabilityGaps ? text.automationCompleteWithGaps : text.automationComplete
  if (status === 'failed') return text.automationFailed
  if (status === 'interrupted') return text.automationInterrupted
  return text.automationIdle
}

function ActivityChart({
  data,
  language,
  text,
}: {
  data: TimelineDatum[]
  language: Language
  text: (typeof ui)[Language]
}) {
  const peak = Math.max(1, ...data.map((item) => item.events + item.documents))
  return (
    <div className="activity-chart-wrap">
      <div className="chart-legend-row">
        <span><i className="legend-event" />{text.chartEvents}</span>
        <span><i className="legend-doc" />{text.chartDocuments}</span>
      </div>
      <div className="activity-chart">
        {data.map((item) => {
          const eventHeight = Math.max(5, Math.round((item.events / peak) * 100))
          const docHeight = Math.max(5, Math.round((item.documents / peak) * 100))
          return (
            <div className="activity-column" key={item.key}>
              <div className="activity-bars" title={`${item.label}: ${item.events} / ${item.documents}`}>
                <span className="bar-event" style={{ height: `${eventHeight}%` }} />
                <span className="bar-doc" style={{ height: `${docHeight}%` }} />
              </div>
              <strong>{item.label}</strong>
              <small>{formatNumber(item.events + item.documents, language)}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HorizontalBars({ data, language, emptyLabel }: { data: ChartDatum[]; language: Language; emptyLabel: string }) {
  if (!data.length) return <p className="chart-empty">{emptyLabel}</p>
  const peak = Math.max(1, ...data.map((item) => item.value))
  return (
    <div className="bar-list">
      {data.map((item) => (
        <div className="bar-row" key={item.key}>
          <span>{item.label}</span>
          <div>
            <i style={{ width: `${Math.max(4, (item.value / peak) * 100)}%` }} />
          </div>
          <strong>{formatNumber(item.value, language)}</strong>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ data, language, emptyLabel }: { data: ChartDatum[]; language: Language; emptyLabel: string }) {
  if (!data.length) return <p className="chart-empty">{emptyLabel}</p>
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let cursor = 0
  const colors = ['#8bb8cb', '#8db99d', '#d4ac69', '#8fa6d8', '#d97872', '#b7d3c0']
  const stops = data.map((item, index) => {
    const start = cursor
    cursor += (item.value / Math.max(1, total)) * 100
    return `${colors[index % colors.length]} ${start}% ${cursor}%`
  })
  return (
    <div className="donut-layout">
      <div className="donut" style={{ background: `conic-gradient(${stops.join(', ')})` }}>
        <span>
          <strong>{formatNumber(total, language)}</strong>
        </span>
      </div>
      <div className="donut-legend">
        {data.map((item, index) => (
          <span key={item.key}>
            <i style={{ background: colors[index % colors.length] }} />
            {item.label}
            <strong>{formatNumber(item.value, language)}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

function PriorityStack({
  data,
  language,
  text,
}: {
  data: ChartDatum[]
  language: Language
  text: (typeof ui)[Language]
}) {
  const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0))
  const hints: Record<string, string> = {
    critical: text.priorityCriticalHint,
    high: text.priorityHighHint,
    medium: text.priorityMediumHint,
    low: text.priorityLowHint,
  }
  return (
    <div className="priority-stack">
      <div className="priority-total-line">
        <span>{language === 'zh' ? '全部文件' : 'All files'}</span>
        <strong>{formatNumber(total, language)}</strong>
      </div>
      <div className="priority-load-list">
        {data.map((item) => (
          <article className={`priority-load-row priority-load-${item.key}`} key={item.key}>
            <div className="priority-load-top">
              <span><i className={`stack-${item.key}`} />{item.label}</span>
              <strong>{formatNumber(item.value, language)}</strong>
            </div>
            <div className="priority-load-meter" title={`${item.label}: ${item.value}`}>
              <b className={`stack-${item.key}`} style={{ width: `${Math.max(3, (item.value / total) * 100)}%` }} />
            </div>
            <p>{hints[item.key] ?? item.posture ?? item.label}</p>
            <small>{text.priorityShare}: {Math.round((item.value / total) * 100)}%</small>
          </article>
        ))}
      </div>
    </div>
  )
}

function PipelineMap({ automation, language }: { automation: AutomationPlan; language: Language }) {
  const completeCount = automation.stages.filter((stage) => ['complete', 'active'].includes(stage.status)).length
  const attentionCount = automation.stages.filter((stage) => stage.status === 'attention').length
  const queuedCount = automation.stages.filter((stage) => stage.status === 'queued').length
  return (
    <div className="pipeline-map">
      <p>{automation.headline}</p>
      <div className="pipeline-summary-strip">
        <span><strong>{formatNumber(completeCount, language)}</strong>{language === 'zh' ? '可运行/已接入' : 'wired'}</span>
        <span><strong>{formatNumber(attentionCount, language)}</strong>{language === 'zh' ? '需处理' : 'attention'}</span>
        <span><strong>{formatNumber(queuedCount, language)}</strong>{language === 'zh' ? '等待' : 'queued'}</span>
      </div>
      <div className="pipeline-stage-grid">
        {automation.stages.map((stage, index) => {
          const progress = stage.total ? Math.min(100, Math.round((stage.done / stage.total) * 100)) : 0
          return (
            <article className={`pipeline-stage stage-${stage.status}`} key={stage.id}>
              <div>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {stageIcon(stage.id)}
              </div>
              <strong>{stage.label}</strong>
              <small>{formatNumber(stage.done, language)} / {formatNumber(stage.total, language)}</small>
              <i>
                <b style={{ width: `${progress}%` }} />
              </i>
              <p>{stage.detail}</p>
            </article>
          )
        })}
      </div>
      {automation.blockers.length > 0 && (
        <div className="blocker-list">
          {automation.blockers.slice(0, 3).map((item) => (
            <span key={item}>
              <AlertTriangle size={13} />
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function stageIcon(stageId: string) {
  if (stageId === 'discover') return <Search size={15} />
  if (stageId === 'download') return <CloudDownload size={15} />
  if (stageId === 'verify') return <ShieldCheck size={15} />
  if (stageId === 'extract') return <ScanText size={15} />
  if (stageId === 'translate') return <Languages size={15} />
  if (stageId === 'ai') return <Cpu size={15} />
  return <BookOpenCheck size={15} />
}

function SourceAuthorityView({
  sources,
  tiers,
  language,
  emptyLabel,
  text,
}: {
  sources: ChartDatum[]
  tiers: ChartDatum[]
  language: Language
  emptyLabel: string
  text: (typeof ui)[Language]
}) {
  const activeTiers = tiers.filter((tier) => tier.value > 0)
  const citeReady = activeTiers
    .filter((tier) => ['official_record', 'recap_court_record', 'official_agency', 'claims_administrator'].includes(tier.key))
    .reduce((sum, tier) => sum + tier.value, 0)
  const needsVerification = activeTiers.reduce((sum, tier) => sum + tier.value, 0) - citeReady
  return (
    <div className="authority-stack">
      <div className="authority-summary">
        <span>
          <strong>{formatNumber(citeReady, language)}</strong>
          {text.citeReady}
        </span>
        <span>
          <strong>{formatNumber(needsVerification, language)}</strong>
          {text.needsVerification}
        </span>
      </div>
      <div className="authority-columns">
        <div>
          <small>{text.sourceListLabel}</small>
          <HorizontalBars data={sources} language={language} emptyLabel={emptyLabel} />
        </div>
        <div>
          <small>{text.evidenceTierLabel}</small>
          <DonutChart data={activeTiers} language={language} emptyLabel={emptyLabel} />
        </div>
      </div>
      <p className="chart-footnote">{text.sourceReliabilityNote}</p>
    </div>
  )
}

function RelationshipGraph({
  nodes,
  links,
  language,
  text,
}: RelationshipGraphData & {
  language: Language
  text: (typeof ui)[Language]
}) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const degreeById = useMemo(() => {
    const degree = new Map(nodes.map((node) => [node.id, 0]))
    links.forEach((link) => {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1)
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1)
    })
    return degree
  }, [links, nodes])
  const defaultNodeId = useMemo(() => [...nodes]
    .sort((left, right) => (degreeById.get(right.id) ?? 0) - (degreeById.get(left.id) ?? 0))[0]?.id ?? null, [degreeById, nodes])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(() => defaultNodeId)
  const [directoryQuery, setDirectoryQuery] = useState('')
  const [directoryType, setDirectoryType] = useState('all')
  const [graphZoom, setGraphZoom] = useState(1)
  const [graphPan, setGraphPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const graphCanvasRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!selectedNodeId || !byId.has(selectedNodeId)) setSelectedNodeId(defaultNodeId)
  }, [byId, defaultNodeId, selectedNodeId])

  useEffect(() => {
    const canvas = graphCanvasRef.current
    if (!canvas) return undefined
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      setGraphZoom((zoom) => Math.min(1.4, Math.max(0.75, Number((zoom + (event.deltaY < 0 ? 0.08 : -0.08)).toFixed(2)))))
    }
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

  const selectedNode = (selectedNodeId ? byId.get(selectedNodeId) : null) ?? (defaultNodeId ? byId.get(defaultNodeId) : null) ?? null
  const displayedLinks = selectedNode
    ? links.filter((link) => link.source === selectedNode.id || link.target === selectedNode.id)
    : []
  const neighborNodes = displayedLinks
    .map((link) => byId.get(link.source === selectedNode?.id ? link.target : link.source))
    .filter((node): node is RelationshipGraphData['nodes'][number] => Boolean(node))
    .sort((left, right) => left.type.localeCompare(right.type) || left.label.localeCompare(right.label))
  const positionedNeighbors = positionFocusedGraphNodes(neighborNodes)
  const caseCount = nodes.filter((node) => node.type === 'case').length
  const entityCount = nodes.length - caseCount
  const normalizedQuery = directoryQuery.trim().toLowerCase()
  const directoryNodes = [...nodes]
    .filter((node) => directoryType === 'all' || node.type === directoryType)
    .filter((node) => !normalizedQuery || node.label.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => (degreeById.get(right.id) ?? 0) - (degreeById.get(left.id) ?? 0) || left.label.localeCompare(right.label))
  const resetViewport = () => {
    setGraphZoom(1)
    setGraphPan({ x: 0, y: 0 })
  }
  const focusNode = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    resetViewport()
  }
  const focusLabel = language === 'zh' ? '聚焦关系' : 'Focused relationships'
  const directoryLabel = language === 'zh' ? '节点目录' : 'Node directory'
  const directorySearch = language === 'zh' ? '搜索案件、人物或机构' : 'Search cases, people, or organizations'
  const directLinksLabel = language === 'zh' ? '直接关联' : 'Direct links'
  const resetViewLabel = language === 'zh' ? '复位视图' : 'Reset view'
  return (
    <div className="relationship-graph">
      <div className="graph-layout">
        <aside className="graph-directory">
          <div className="graph-directory-heading">
            <div><span>{directoryLabel}</span><strong>{formatNumber(directoryNodes.length, language)}</strong></div>
            <label className="graph-directory-search"><Search size={14} /><input value={directoryQuery} onChange={(event) => setDirectoryQuery(event.target.value)} placeholder={directorySearch} /></label>
          </div>
          <div className="graph-type-filters" role="group" aria-label={directoryLabel}>
            {['all', 'case', 'person', 'company', 'asset'].map((type) => (
              <button className={directoryType === type ? 'active' : ''} type="button" onClick={() => setDirectoryType(type)} key={type}>
                {type === 'all' ? (language === 'zh' ? '全部' : 'All') : graphTypeLabel(type, language)}
              </button>
            ))}
          </div>
          <div className="graph-directory-list">
            {directoryNodes.map((node) => (
              <button className={selectedNode?.id === node.id ? 'selected' : ''} type="button" onClick={() => focusNode(node.id)} key={node.id}>
                <i className={`node-${node.type}`} />
                <span><strong title={node.label}>{node.label}</strong><small>{graphTypeLabel(node.type, language)}</small></span>
                <b>{formatNumber(degreeById.get(node.id) ?? 0, language)}</b>
              </button>
            ))}
          </div>
        </aside>
        <div className="graph-canvas-shell">
          <div className="graph-canvas-toolbar">
            <div><span>{focusLabel}</span><strong>{selectedNode?.label ?? text.noRelationshipLinks}</strong></div>
            <div className="graph-zoom-controls">
              <button type="button" onClick={() => setGraphZoom((zoom) => Math.max(0.75, Number((zoom - 0.1).toFixed(2))))} disabled={graphZoom <= 0.75} title={text.zoomOut}><Minus size={15} /></button>
              <span>{Math.round(graphZoom * 100)}%</span>
              <button type="button" onClick={() => setGraphZoom((zoom) => Math.min(1.4, Number((zoom + 0.1).toFixed(2))))} disabled={graphZoom >= 1.4} title={text.zoomIn}><Plus size={15} /></button>
              <button type="button" onClick={resetViewport} title={resetViewLabel}><RefreshCw size={14} /></button>
            </div>
          </div>
          <svg
            ref={graphCanvasRef}
            className="relationship-focus-canvas"
            viewBox="0 0 760 520"
            role="img"
            aria-label={text.relationshipMap}
            onPointerDown={(event) => {
              if ((event.target as Element).closest('.graph-node')) return
              dragRef.current = { x: event.clientX, y: event.clientY, panX: graphPan.x, panY: graphPan.y }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (!dragRef.current) return
              setGraphPan({ x: dragRef.current.panX + event.clientX - dragRef.current.x, y: dragRef.current.panY + event.clientY - dragRef.current.y })
            }}
            onPointerUp={() => { dragRef.current = null }}
            onPointerCancel={() => { dragRef.current = null }}
          >
            <g transform={`translate(${graphPan.x} ${graphPan.y}) translate(380 260) scale(${graphZoom}) translate(-380 -260)`}>
              {positionedNeighbors.map((node) => (
                <line className="graph-focus-link" x1="380" y1="260" x2={node.x} y2={node.y} key={`line-${node.id}`} />
              ))}
              {positionedNeighbors.map((node) => (
                <FocusedGraphNode node={node} language={language} onFocus={focusNode} key={node.id} />
              ))}
              {selectedNode && <FocusedGraphNode node={{ ...selectedNode, x: 380, y: 260, center: true }} language={language} onFocus={focusNode} />}
            </g>
          </svg>
          <div className="graph-canvas-caption"><span><b>{formatNumber(displayedLinks.length, language)}</b>{directLinksLabel}</span><small>{language === 'zh' ? '拖动画布，滚轮或按钮缩放；点击节点继续追踪。' : 'Drag to pan, zoom with the wheel or controls, and click a node to follow it.'}</small></div>
        </div>
        <div className="relationship-side">
          <div className="graph-type-summary">
            <span><strong>{formatNumber(caseCount, language)}</strong>{text.graphCases}</span>
            <span><strong>{formatNumber(entityCount, language)}</strong>{text.graphEntities}</span>
          </div>
          <div className="graph-selection">
            <div><span>{text.selectedEntity}</span><strong>{selectedNode?.label ?? text.clearSelection}</strong><small>{selectedNode ? graphTypeLabel(selectedNode.type, language) : text.relationshipDisclaimer}</small></div>
            <span><b>{formatNumber(displayedLinks.length, language)}</b>{text.relationshipCount}</span>
          </div>
          <div className="relationship-links">
            <strong>{text.graphMainLinks}</strong>
            {displayedLinks.length ? displayedLinks.map((link) => {
              const source = byId.get(link.source)
              const target = byId.get(link.target)
              if (!source || !target) return null
              const neighbor = source.id === selectedNode?.id ? target : source
              return (
                <button className="relationship-link-row" type="button" onClick={() => focusNode(neighbor.id)} key={`${link.source}-${link.target}`}>
                  <small><i className={`node-${neighbor.type}`} />{neighbor.label}</small>
                  <b>{link.label}</b>
                </button>
              )
            }) : <p className="chart-empty">{text.noRelationshipLinks}</p>}
          </div>
          <p className="relationship-disclaimer"><ShieldCheck size={14} />{text.relationshipDisclaimer}</p>
        </div>
      </div>
      <div className="graph-legend">
        {['case', 'person', 'company', 'asset'].map((type) => (
          <span key={type}>
            <i className={`node-${type}`} />
            {graphTypeLabel(type, language)}
          </span>
        ))}
      </div>
    </div>
  )
}

function positionFocusedGraphNodes(nodes: RelationshipGraphData['nodes']) {
  const leftCount = Math.ceil(nodes.length / 2)
  return nodes.map((node, index) => {
    const onLeft = index < leftCount
    const columnIndex = onLeft ? index : index - leftCount
    const columnCount = onLeft ? leftCount : nodes.length - leftCount
    const y = columnCount <= 1 ? 260 : 72 + (columnIndex * 376) / (columnCount - 1)
    return { ...node, x: onLeft ? 178 : 582, y, center: false }
  })
}

function FocusedGraphNode({ node, language, onFocus }: {
  node: RelationshipGraphData['nodes'][number] & { x: number; y: number; center?: boolean }
  language: Language
  onFocus: (nodeId: string) => void
}) {
  const width = node.center ? 210 : 168
  const height = node.center ? 64 : 50
  return (
    <g
      className={`graph-node graph-focus-node ${node.center ? 'center' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`${node.label}, ${graphTypeLabel(node.type, language)}`}
      onClick={() => onFocus(node.id)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onFocus(node.id)
      }}
    >
      <circle cx={node.x} cy={node.y} r={node.center ? 16 : 10} className={`node-${node.type}`} />
      <foreignObject x={node.x - width / 2} y={node.y + (node.center ? 24 : 16)} width={width} height={height}>
        <div className="graph-focus-label" title={node.label}>
          <strong>{node.label}</strong>
          <span>{graphTypeLabel(node.type, language)}</span>
        </div>
      </foreignObject>
    </g>
  )
}

function graphTypeLabel(type: string, language: Language) {
  const labels = {
    zh: {
      case: '案件',
      person: '人物',
      company: '公司',
      asset: '资产/基金',
    },
    en: {
      case: 'Case',
      person: 'Person',
      company: 'Company',
      asset: 'Asset/Fund',
    },
  }
  return labels[language][type as keyof (typeof labels)[Language]] ?? type
}

function CaseDossierCard({
  dossier,
  language,
  text,
  onOpen,
}: {
  dossier: CaseDossier
  language: Language
  text: (typeof ui)[Language]
  onOpen: (trigger: HTMLElement) => void
}) {
  return (
    <article className="dossier-card">
      <div className="case-card-top">
        <span>{dossier.court}</span>
        <strong>{dossier.docket}</strong>
      </div>
      <h4>{dossier.shortTitle}</h4>
      <p>{dossier.plainRead}</p>
      <div className="dossier-metrics">
        <span><strong>{formatNumber(dossier.metrics.events, language)}</strong>{text.eventsShort}</span>
        <span><strong>{formatNumber(dossier.metrics.documents, language)}</strong>{text.docsShort}</span>
        <span><strong>{formatNumber(dossier.metrics.highPriority, language)}</strong>{text.highPriorityShort}</span>
      </div>
      <div className="mini-task-list">
        <strong>{dossier.aiDossier ? caseDossierProviderLabel(dossier.aiDossier, language) : text.localCaseRead}</strong>
        {dossier.aiDossier ? (
          <small>{dossier.aiDossier.model} · {text.evidenceCountLabel} {formatNumber(dossier.aiDossier.evidenceCount, language)} · {text.generatedAtLabel} {dossier.aiDossier.generatedAt ? new Date(dossier.aiDossier.generatedAt).toLocaleString(localeFor(language)) : '?'}</small>
        ) : dossier.lawyerRead.slice(0, 2).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      {dossier.unresolvedIssues.length > 0 && <div className="dossier-open-issues"><strong>{text.unresolvedIssues}</strong><span>{dossier.unresolvedIssues[0]}</span></div>}
      <div className="dossier-card-footer">
        <div className={`controlling-docs${dossier.controllingDocs.length ? '' : ' is-empty'}`}>
          <strong>{text.controllingDocs}</strong>
          {dossier.controllingDocs.slice(0, 2).map((doc) => (
            <a href={safeExternalHref(doc.sourceUrl)} target="_blank" rel="noreferrer" key={doc.id}>
              {doc.docNumber ? `${language === 'zh' ? '文件' : 'Doc'} ${doc.docNumber}` : doc.category}
              <ArrowUpRight size={11} />
            </a>
          ))}
        </div>
        <button className="dossier-open-button" type="button" onClick={(event) => onOpen(event.currentTarget)}>
          <BookOpenCheck size={14} />
          {text.openCaseDossier}
        </button>
      </div>
    </article>
  )
}

function CaseDossierDialog({
  dossier,
  language,
  text,
  onClose,
  restoreFocusTo,
}: {
  dossier: CaseDossier
  language: Language
  text: (typeof ui)[Language]
  onClose: () => void
  restoreFocusTo: HTMLElement | null
}) {
  return (
    <ModalShell
      eyebrow={text.caseDossierDialogEyebrow}
      title={`${dossier.shortTitle} · ${dossier.docket}`}
      closeLabel={text.closeDialog}
      onClose={onClose}
      className="case-dossier-modal"
      restoreFocusTo={restoreFocusTo}
    >
      <div className="case-dossier-modal-summary">
        <div>
          <span>{dossier.court}</span>
          <strong>{dossier.status}</strong>
          <p>{dossier.posture}</p>
        </div>
        <div className="dossier-metrics">
          <span><strong>{formatNumber(dossier.metrics.events, language)}</strong>{text.eventsShort}</span>
          <span><strong>{formatNumber(dossier.metrics.documents, language)}</strong>{text.docsShort}</span>
          <span><strong>{formatNumber(dossier.metrics.highPriority, language)}</strong>{text.highPriorityShort}</span>
        </div>
      </div>
      <section className="case-dossier-reading-layer layer-plain">
        <div className="case-dossier-layer-heading">
          <span>01</span>
          <strong>{text.casePlainExplanation}</strong>
        </div>
        <p>{dossier.plainRead}</p>
      </section>
      <section className="case-dossier-reading-layer layer-analogy">
        <div className="case-dossier-layer-heading">
          <span>02</span>
          <strong>{text.caseAnalogy}</strong>
        </div>
        <p>{dossier.analogy}</p>
        <small>{text.caseAnalogyBoundary}</small>
      </section>
      <section className="case-dossier-reading-layer layer-professional">
        <div className="case-dossier-layer-heading">
          <span>03</span>
          <strong>{text.caseProfessionalAnalysis}</strong>
        </div>
        <div className="case-dossier-professional-list">
          {dossier.lawyerRead.map((item) => <p key={item}>{item}</p>)}
        </div>
      </section>
      <section className="case-dossier-modal-read case-dossier-reading-layer layer-evidence">
        <div className="case-dossier-layer-heading">
          <span>04</span>
          <strong>{text.caseEvidenceDossier}</strong>
        </div>
        <div className="case-dossier-provider-line">
          <strong>{dossier.aiDossier ? caseDossierProviderLabel(dossier.aiDossier, language) : text.localCaseRead}</strong>
          {dossier.aiDossier && (
            <span>{dossier.aiDossier.model} · {text.evidenceCountLabel} {formatNumber(dossier.aiDossier.evidenceCount, language)} · {text.generatedAtLabel} {dossier.aiDossier.generatedAt ? new Date(dossier.aiDossier.generatedAt).toLocaleString(localeFor(language)) : '?'}</span>
          )}
        </div>
        <p className="case-dossier-full-text">{dossier.aiDossier?.text ?? dossier.lawyerRead.join('\n\n')}</p>
      </section>
      {dossier.unresolvedIssues.length > 0 && (
        <section className="case-dossier-modal-issues">
          <strong>{text.unresolvedIssues}</strong>
          {dossier.unresolvedIssues.map((issue) => <p key={issue}>{issue}</p>)}
        </section>
      )}
      <section className="case-dossier-modal-docs">
        <strong>{text.controllingDocs}</strong>
        <div>
          {dossier.controllingDocs.map((doc) => (
            <a href={safeExternalHref(doc.sourceUrl)} target="_blank" rel="noreferrer" key={doc.id}>
              <span>{doc.docNumber ? `${language === 'zh' ? '文件' : 'Doc'} ${doc.docNumber}` : doc.category}</span>
              <small>{doc.title}</small>
              <ArrowUpRight size={13} />
            </a>
          ))}
        </div>
      </section>
    </ModalShell>
  )
}

function auditStatusLabel(status: string, language: Language, provided?: string) {
  if (provided) return provided
  const labels = {
    zh: {
      partial_verified: '部分核验',
      partial: '部分覆盖',
      metadata_only: '仅元数据',
      not_observed: '当前未观测到',
      blocked: '受限',
    },
    en: {
      partial_verified: 'Partially verified',
      partial: 'Partial coverage',
      metadata_only: 'Metadata only',
      not_observed: 'Not observed',
      blocked: 'Blocked',
    },
  }
  return labels[language][status as keyof (typeof labels)[Language]] ?? status.replaceAll('_', ' ')
}

function auditCandidateLabel(classification: string, language: Language, provided?: string) {
  if (provided) return provided
  const labels = {
    zh: {
      tracked: '已跟踪',
      direct_candidate: '高相关搜索线索',
      related_candidate: '一般相关搜索线索',
      likely_false_match: '可能误匹配',
    },
    en: {
      tracked: 'Tracked',
      direct_candidate: 'High-signal search lead',
      related_candidate: 'Related search lead',
      likely_false_match: 'Likely false match',
    },
  }
  return labels[language][classification as keyof (typeof labels)[Language]] ?? classification.replaceAll('_', ' ')
}

function auditSourceStatusLabel(status: string, language: Language) {
  const labels: Record<string, Record<Language, string>> = {
    ok: { zh: '成功', en: 'OK' },
    partial: { zh: '部分成功', en: 'Partial' },
    error: { zh: '失败', en: 'Failed' },
    not_configured: { zh: '未配置', en: 'Not configured' },
  }
  return labels[status]?.[language] ?? status.replaceAll('_', ' ')
}

function compactAuditError(value: string, language: Language = 'zh') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  const source = text.match(/^([a-z_]+):\s*/i)?.[1]
  const sourceLabel = source ? `${source.replaceAll('_', ' ')}: ` : ''
  const retrySeconds = text.match(/available in\s+(\d+)\s+seconds?/i)?.[1]
  if (/HTTP\s+429|rate limit exceeded|throttled/i.test(text)) {
    return language === 'zh'
      ? `${sourceLabel}CourtListener 已限流（HTTP 429）${retrySeconds ? `，约 ${retrySeconds} 秒后可重试` : ''}`
      : `${sourceLabel}CourtListener rate limit reached (HTTP 429)${retrySeconds ? `; retry in about ${retrySeconds} seconds` : ''}`
  }
  if (/fetch failed/i.test(text)) return language === 'zh'
    ? `${sourceLabel}网络请求失败或超时`
    : `${sourceLabel}network request failed or timed out`
  return text.slice(0, 220)
}

function CompletenessAuditView({
  audit,
  relationshipAudit,
  language,
  text,
  loading,
  error,
  onRefresh,
  onRetry,
}: {
  audit: CompletenessAudit | null
  relationshipAudit: RelationshipAudit | null
  language: Language
  text: (typeof ui)[Language]
  loading: boolean
  error: string
  onRefresh: () => void
  onRetry: () => void
}) {
  if (!audit) {
    return (
      <section className="audit-empty-state" role="status">
        {loading ? <Loader2 className="spin" size={22} /> : <ShieldAlert size={22} />}
        <strong>{loading ? text.auditRefreshing : text.documentPipelineError}</strong>
        {error && <span>{error}</span>}
        {!loading && <button type="button" onClick={onRetry}>{text.retry}</button>}
      </section>
    )
  }

  const totals = audit.totals
  const refreshStatus = audit.refresh?.status ?? (audit.mode === 'local' ? 'local_only' : 'complete')
  const refreshLabels = {
    zh: { complete: '在线刷新完成', partial: '部分在线刷新', stale: '沿用上次成功审计', local_only: '仅本地审计' },
    en: { complete: 'Online refresh complete', partial: 'Partial online refresh', stale: 'Using last successful audit', local_only: 'Local-only audit' },
  }
  const refreshLabel = refreshLabels[language][refreshStatus as keyof (typeof refreshLabels)[Language]] ?? refreshStatus.replaceAll('_', ' ')
  const refreshSourceLabels: Record<string, Record<Language, string>> = {
    public_feed: { zh: '公开 RECAP Feed', en: 'Public RECAP feed' },
    public_search: { zh: '公开 RECAP 搜索', en: 'Public RECAP search' },
    public_portfolio: { zh: '组合发现搜索', en: 'Portfolio discovery search' },
    recap_api: { zh: 'Token 增强 RECAP', en: 'Token-enhanced RECAP' },
    discovery: { zh: '关联候选发现', en: 'Related-docket discovery' },
  }
  const refreshSources = Object.entries(audit.refresh?.sources ?? {}).map(([sourceName, source]) => ({
    id: sourceName,
    label: refreshSourceLabels[sourceName]?.[language] ?? sourceName.replaceAll('_', ' '),
    ...source,
  }))
  const publicFeedUsable = ['ok', 'partial'].includes(audit.refresh?.sources?.public_feed?.status ?? '')
  const publicSearchUsable = ['ok', 'partial'].includes(audit.refresh?.sources?.public_search?.status ?? '')
  const refreshEvidenceSummary = language === 'zh'
    ? `${publicFeedUsable ? '公开 Feed 元数据已与本地资料核对' : '本次公开 Feed 未取得可用结果'}；${publicSearchUsable ? '无 Token 的 RECAP 结构化搜索也已核对' : '无 Token 的 RECAP 结构化搜索本次不可用'}。完整历史分页和 PACER 正式案卷核验仍不可用。`
    : `${publicFeedUsable ? 'Public-feed metadata was reconciled locally' : 'The public feed returned no usable result this run'}; ${publicSearchUsable ? 'no-token structured RECAP search was also reconciled' : 'no-token structured RECAP search was unavailable this run'}. Full historical pagination and PACER record-of-docket verification remain unavailable.`
  const summary = [
    { label: text.auditTrackedDockets, value: totals.trackedDockets, tone: 'blue' },
    { label: text.auditObservedDockets, value: totals.observedDockets, tone: 'cyan' },
    { label: text.auditObservedEntries, value: totals.observedEntries, tone: 'violet' },
    { label: text.auditLocalFiles, value: totals.localFiles, tone: 'green' },
    { label: text.auditOfficialFiles, value: totals.officialOrRecapLocalFiles, tone: 'gold' },
    { label: text.auditMetadataOnly, value: totals.metadataOnlyEntries, tone: 'amber' },
    { label: text.auditPublicPdfMissing, value: totals.publiclyAvailableMissing, tone: 'red' },
    { label: text.auditDownloadErrors, value: totals.pendingRelationReviewFiles ?? totals.untrackedLocalFiles ?? 0, tone: 'red' },
  ]

  return (
    <section className="completeness-audit-workspace">
      <div className="audit-hero">
        <div>
          <p className="eyebrow">{text.auditEyebrow}</p>
          <h3>{text.auditTitle}</h3>
          <p>{text.auditNotComplete}. {refreshEvidenceSummary}</p>
        </div>
        <div className="audit-hero-actions">
          <span className={`audit-verdict verdict-${audit.verdict}`}><ShieldAlert size={15} />{audit.verdictLabel ?? audit.verdict.replaceAll('_', ' ')}</span>
          <button type="button" className="audit-refresh-button" onClick={onRefresh} disabled={loading}>
            {loading ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />}
            {loading ? text.auditRefreshing : text.auditRefresh}
          </button>
        </div>
      </div>

      {error && <div className="audit-inline-error" role="status"><AlertTriangle size={15} /><span>{error}</span></div>}
      {(refreshStatus !== 'complete' || audit.errors.length > 0) && (
        <div className="audit-inline-error" role="status">
          <AlertTriangle size={15} />
          <span>
            <strong>{refreshLabel}</strong>
            {audit.refresh?.lastSuccessfulOnlineAt
              ? ` · ${language === 'zh' ? '最近成功在线来源' : 'Last successful online source'}: ${new Date(audit.refresh.lastSuccessfulOnlineAt).toLocaleString(localeFor(language))}`
              : ''}
            {audit.errors.length ? ` · ${audit.errors.slice(0, 2).map((item) => compactAuditError(item, language)).join(' · ')}` : ''}
          </span>
        </div>
      )}

      {refreshSources.length > 0 && (
        <div className="audit-source-health" aria-label={language === 'zh' ? '在线来源扫描结果' : 'Online source scan results'}>
          {refreshSources.map((source) => (
            <article className={`source-${statusTone(source.status)}`} key={source.id}>
              <div><strong>{source.label}</strong><span>{auditSourceStatusLabel(source.status, language)}</span></div>
              {(source.successfulTargets !== undefined || source.failedTargets !== undefined) && (
                <p>
                  {language === 'zh' ? '成功案卷' : 'Successful dockets'} {formatNumber(source.successfulTargets ?? 0, language)}
                  {' / '}
                  {language === 'zh' ? '失败' : 'failed'} {formatNumber(source.failedTargets ?? 0, language)}
                  {' · '}
                  {language === 'zh' ? '观测条目' : 'observed entries'} {formatNumber(source.observedEntries ?? 0, language)}
                </p>
              )}
              {source.error && <small title={source.error}>{compactAuditError(source.error, language)}</small>}
            </article>
          ))}
        </div>
      )}

      <div className="audit-summary-grid" aria-label={text.auditTitle}>
        {summary.map((item) => (
          <article className={`audit-summary-card tone-${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{formatNumber(item.value, language)}</strong>
          </article>
        ))}
      </div>

	      <section className="audit-panel">
	        <div className="section-heading compact">
	          <div><p className="eyebrow">{text.auditEyebrow}</p><h3>{text.auditDocketTable}</h3></div>
          <span>{formatDate(audit.generatedAt.slice(0, 10), language)}</span>
        </div>
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead><tr>
              <th>{text.auditCourt}</th>
              <th>{text.auditDocket}</th>
              <th>{text.auditStatus}</th>
              <th>{text.auditObserved}</th>
              <th>{text.auditLocalFiles}</th>
              <th>{text.auditOfficialLocal}</th>
              <th>{text.auditGaps}</th>
              <th>{text.auditLatest}</th>
              <th aria-label={text.externalSource} />
            </tr></thead>
            <tbody>
              {audit.dockets.map((docket) => (
                <tr key={docket.id}>
                  <td><strong>{docket.court}</strong><small>{docket.caseTitle}</small></td>
                  <td><code>{docket.docketNumber}</code><small>CL {docket.courtListenerDocketId}</small></td>
                  <td><span className={`audit-status status-${docket.status}`}><i />{auditStatusLabel(docket.status, language, docket.statusLabel)}</span></td>
                  <td>{formatNumber(docket.counts.observedEntries, language)}</td>
                  <td>{formatNumber(docket.counts.localFiles, language)}</td>
                  <td>{formatNumber(docket.counts.officialOrRecapLocalFiles, language)}</td>
                  <td><strong>{formatNumber(docket.counts.metadataOnlyEntries + docket.counts.publiclyAvailableMissing + docket.counts.localErrors, language)}</strong></td>
                  <td>{formatDate(docket.latestObserved, language)}</td>
                  <td><a href={safeExternalHref(docket.courtListenerUrl)} target="_blank" rel="noreferrer" title={text.auditOpenDocket}><ArrowUpRight size={15} /></a></td>
                </tr>
              ))}
            </tbody>
          </table>
	        </div>
	      </section>

	      <RelationshipAuditPanel audit={relationshipAudit} language={language} text={text} loading={loading} error={error} />

	      <div className="audit-lower-grid">
        <section className="audit-panel audit-candidates-panel">
          <div className="section-heading compact"><div><p className="eyebrow">{text.auditEyebrow}</p><h3>{text.auditDiscoveryCandidates}</h3></div><span>{formatNumber(audit.discovery.candidates.length, language)}</span></div>
          <p className="audit-notice"><ShieldCheck size={15} />{text.auditCandidateNotice}</p>
          <div className="audit-candidate-list">
            {audit.discovery.candidates.length ? audit.discovery.candidates.slice(0, 28).map((candidate) => (
              <article className="audit-candidate" key={candidate.courtListenerDocketId}>
	                <div><span className={`candidate-class candidate-${candidate.classification}`}>{auditCandidateLabel(candidate.classification, language, candidate.classificationLabel)}</span><code>{candidate.docketNumber || `CL ${candidate.courtListenerDocketId}`}</code></div>
                <strong>{candidate.title}</strong>
                <p>{candidate.court} · {candidate.summary}</p>
                {candidate.relationshipSignals?.length ? <small>{candidate.relationshipSignals.join(' · ')}</small> : null}
                <a href={safeExternalHref(candidate.sourceUrl)} target="_blank" rel="noreferrer">{text.auditOpenDocket}<ArrowUpRight size={12} /></a>
              </article>
            )) : <p className="audit-muted">{text.auditNoCandidates}</p>}
          </div>
        </section>

        <section className="audit-panel">
          <div className="section-heading compact"><div><p className="eyebrow">{text.auditIntegrity}</p><h3>{text.auditIntegrity}</h3></div></div>
          <dl className="audit-integrity-list">
            <div><dt>{text.auditManifestDigest}</dt><dd><code>{audit.integrity.manifestDigest}</code></dd></div>
            <div><dt>{text.auditHashedFiles}</dt><dd>{formatNumber(audit.integrity.hashedFiles, language)}</dd></div>
            <div><dt>{text.auditUnhashedFiles}</dt><dd>{formatNumber(audit.integrity.unhashedAvailableFiles, language)}</dd></div>
            <div><dt>{text.auditDuplicateGroups}</dt><dd>{formatNumber(audit.integrity.duplicatePayloadGroups, language)}</dd></div>
            <div><dt>{text.auditHashConflicts}</dt><dd className={audit.integrity.crossSourceHashConflicts ? 'audit-danger-value' : ''}>{formatNumber(audit.integrity.crossSourceHashConflicts, language)}</dd></div>
          </dl>
          <details className="audit-details"><summary>{text.auditMethodology}</summary><ul>{audit.methodology.map((item) => <li key={item}>{item}</li>)}</ul>{Object.entries(audit.accessBoundaries).map(([key, value]) => <p key={key}><strong>{key}</strong> · {value}</p>)}</details>
          <p className="audit-generated">{text.auditGenerated}: {new Date(audit.generatedAt).toLocaleString(localeFor(language))}</p>
        </section>
      </div>
    </section>
  )
}

function RelationshipAuditPanel({
  audit,
  language,
  text,
  loading,
  error,
}: {
  audit: RelationshipAudit | null
  language: Language
  text: (typeof ui)[Language]
  loading: boolean
  error: string
}) {
  if (!audit) {
    return (
      <section className="audit-panel relationship-audit-panel relationship-audit-empty" role="status">
        {loading ? <Loader2 className="spin" size={20} /> : <ShieldAlert size={20} />}
        <strong>{loading ? text.auditRefreshing : text.relationshipAuditUnavailable}</strong>
        {error && <span>{error}</span>}
      </section>
    )
  }

  const statusCounts = audit.counts.byStatus ?? {}
  const summary = [
    { label: text.formalTrackedCases, value: audit.counts.formalTrackedDockets, tone: 'blue', icon: <Landmark size={15} /> },
    { label: text.discoveredRelatedDockets, value: audit.counts.discoveredDockets, tone: 'cyan', icon: <GitBranch size={15} /> },
    { label: text.relationshipVerified, value: statusCounts.verified_public_relation ?? 0, tone: 'green', icon: <ShieldCheck size={15} /> },
    { label: text.relationshipProbable, value: statusCounts.probable_relation ?? 0, tone: 'violet', icon: <ChartNetwork size={15} /> },
    { label: text.relationshipPending, value: statusCounts.pending_manual_review ?? 0, tone: 'amber', icon: <ShieldAlert size={15} /> },
    { label: text.relationshipExcluded, value: statusCounts.excluded ?? 0, tone: 'red', icon: <X size={15} /> },
  ]
  const visibleDockets = audit.dockets.filter((docket) => docket.relationship.status !== 'excluded')
  const excludedDockets = audit.excluded.slice(0, 8)
  const typeRows = Object.entries(audit.counts.byType ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)

  return (
    <section className="audit-panel relationship-audit-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">{text.auditEyebrow}</p>
          <h3>{text.relationshipAuditTitle}</h3>
        </div>
        <span>{new Date(audit.generatedAt).toLocaleString(localeFor(language))}</span>
      </div>
      <p className="audit-notice relationship-audit-copy"><ShieldCheck size={15} />{text.relationshipAuditCopy}</p>

      <div className="relationship-summary-grid" aria-label={text.relationshipAuditTitle}>
        {summary.map((item) => (
          <article className={`relationship-summary-card tone-${item.tone}`} key={item.label}>
            <span>{item.icon}{item.label}</span>
            <strong>{formatNumber(item.value, language)}</strong>
          </article>
        ))}
      </div>

      <div className="relationship-audit-layout">
        <div className="relationship-audit-main">
          <div className="relationship-review-head">
            <span>{text.relationshipReviewQueue}</span>
            <strong>{formatNumber(audit.pendingReview.length, language)} / {formatNumber(visibleDockets.length, language)}</strong>
          </div>
          <div className="relationship-docket-list">
            {visibleDockets.map((docket) => (
              <RelationshipDocketCard docket={docket} audit={audit} language={language} text={text} key={docket.id} />
            ))}
          </div>
        </div>

        <aside className="relationship-audit-side">
          <section>
            <h4>{text.relationshipSourceLimitations}</h4>
            {Object.entries(audit.sourceLimitations).map(([key, value]) => (
              <p key={key}><strong>{key}</strong><span>{value}</span></p>
            ))}
          </section>
          <section>
            <h4>{text.relationshipType}</h4>
            {typeRows.map(([type, value]) => (
              <div className="relationship-type-row" key={type}>
                <span>{relationshipTypeLabel(type, audit, language)}</span>
                <strong>{formatNumber(value, language)}</strong>
              </div>
            ))}
          </section>
          {excludedDockets.length > 0 && (
            <section>
              <h4>{text.relationshipExcluded}</h4>
              {excludedDockets.map((docket) => (
                <a className="relationship-excluded-link" href={safeExternalHref(docket.relationship.docketUrl || docket.sourceUrls[0])} target="_blank" rel="noreferrer" key={docket.id}>
                  <span>{docket.docketNumber ?? `CL ${docket.courtListenerDocketId}`}</span>
                  <ArrowUpRight size={12} />
                </a>
              ))}
            </section>
          )}
        </aside>
      </div>
    </section>
  )
}

function RelationshipDocketCard({
  docket,
  audit,
  language,
  text,
}: {
  docket: RelationshipAuditDocket
  audit: RelationshipAudit
  language: Language
  text: (typeof ui)[Language]
}) {
  const relation = docket.relationship
  const tone = relationshipTone(relation.status)
  const sourceUrl = relation.docketUrl || docket.sourceUrls[0] || ''
  const discoveryLabel = docket.discoveryState === 'tracked'
    ? text.formalTrackedCases
    : docket.discoveryState === 'discovered'
      ? text.discoveredRelatedDockets
      : text.auditDiscoveryCandidates
  return (
    <article className={`relationship-docket-card relation-${tone}`}>
      <div className="relationship-docket-head">
        <div>
          <span className={`relationship-status-chip relation-${tone}`}>{relationshipStatusLabel(relation.status, language, relation.statusLabel)}</span>
          <code>{docket.docketNumber ?? `CL ${docket.courtListenerDocketId}`}</code>
          <span>{discoveryLabel}</span>
        </div>
        {sourceUrl && (
          <a href={safeExternalHref(sourceUrl)} target="_blank" rel="noreferrer" title={text.relationshipOpenDocket}>
            <ArrowUpRight size={14} />
          </a>
        )}
      </div>

      <h4>{docket.caption}</h4>
      <p className="relationship-docket-meta">{docket.court} · {formatDate(docket.latestObserved, language)}</p>

      <dl className="relationship-fact-grid">
        <div><dt>{text.relationshipType}</dt><dd>{relationshipTypeLabel(relation.primaryType, audit, language, relation.label)}</dd></div>
        <div><dt>{text.relationshipConfidence}</dt><dd>{confidenceText[language][relation.confidence] ?? relation.confidence}</dd></div>
        <div><dt>{text.relationshipFiles}</dt><dd>{formatNumber(docket.files.usable, language)} / {formatNumber(docket.files.total, language)}</dd></div>
        <div><dt>{text.auditOfficialLocal}</dt><dd>{formatNumber(docket.files.officialOrRecap, language)}</dd></div>
      </dl>

      <div className="relationship-processing-grid">
        <RelationshipProgress label={text.relationshipExtracted} done={docket.files.extracted} total={docket.files.usable} language={language} />
        <RelationshipProgress label={text.relationshipTranslated} done={docket.files.translated} total={docket.files.usable} language={language} />
        <RelationshipProgress label={text.relationshipAiAnalyzed} done={docket.files.aiAnalyzed} total={docket.files.usable} language={language} />
      </div>

      <div className="relationship-evidence-block">
        <strong>{text.relationshipEvidence}</strong>
        {docket.evidence.length ? docket.evidence.slice(0, 3).map((evidence, index) => (
          <a href={safeExternalHref(evidence.sourceUrl || sourceUrl)} target="_blank" rel="noreferrer" key={`${docket.id}-evidence-${index}`}>
            <span>{relationshipEvidenceLabel(evidence, language)} · {confidenceText[language][evidence.confidence] ?? evidence.confidence}</span>
            {relationshipEvidenceDescription(evidence, language) && <small>{relationshipEvidenceDescription(evidence, language)}</small>}
            {evidence.excerpt && <p>{evidence.excerpt}</p>}
          </a>
        )) : <p>{text.relationshipNoEvidence}</p>}
      </div>

      {(relation.controlWarning || relation.controlWarningEn || relation.controlWarningZh) && (
        <p className="relationship-control-note">
          <ShieldAlert size={14} />
          {relation.controlWarning ?? (language === 'zh' ? relation.controlWarningZh : relation.controlWarningEn)}
        </p>
      )}

      <div className="relationship-task-list">
        <strong>{text.verification}</strong>
        {docket.verificationTasks.length ? docket.verificationTasks.slice(0, 4).map((task) => <span key={task}>{task}</span>) : <span>{text.relationshipNoTasks}</span>}
        {docket.files.backupMirror > 0 && <span>{text.relationshipMirrorWarning}</span>}
      </div>
    </article>
  )
}

function RelationshipProgress({ label, done, total, language }: { label: string; done: number; total: number; language: Language }) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, done / total)) : 0
  return (
    <span className="relationship-progress">
      <i style={{ transform: `scaleX(${ratio})` }} />
      <b>{formatNumber(done, language)} / {formatNumber(total, language)}</b>
      <em>{label}</em>
    </span>
  )
}

function maxTimelineValue(data: TimelineDatum[]) {
  return Math.max(0, ...data.map((item) => item.events + item.documents))
}

function DocumentAnalysisView({
  library,
  language,
  text,
  documentInsightUrl,
  documentInsightLoading,
  onAnalyzeDocument,
  onOpenDocument,
  mode,
}: {
  library: DocumentAnalysisLibrary
  language: Language
  text: (typeof ui)[Language]
  documentInsightUrl: string
  documentInsightLoading: boolean
  onAnalyzeDocument: (sourceUrl: string) => void
  onOpenDocument: (target: ManagedDocumentTarget) => void
  mode: 'files' | 'review'
}) {
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogPriority, setCatalogPriority] = useState<'all' | Severity>('all')
  const [catalogScope, setCatalogScope] = useState<DocumentSearchScope>('all')
  const [catalogRows, setCatalogRows] = useState<DocumentAnalysisRecord[]>(() => library.catalog)
  const [catalogPage, setCatalogPage] = useState(library.catalogPage)
  const [catalogSearchStatus, setCatalogSearchStatus] = useState<DocumentCatalogPage['search']>(undefined)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const catalogRequestRef = useRef('')
  const catalogSequenceRef = useRef(0)
  const catalogAbortRef = useRef<AbortController | null>(null)
  const stats = [
    { label: text.localAvailable, value: library.counts.localAvailable },
    { label: text.translatedMetadata, value: library.counts.translatedMetadata },
    { label: text.extractedSnippets, value: library.counts.cachedExtractions },
    { label: language === 'zh' ? '人工研究文件' : 'Human-researched docs', value: library.counts.humanResearchDocuments },
    { label: text.queuedForAi, value: library.counts.cachedDocumentAi },
    { label: text.localRuleReadsDone, value: library.counts.cachedLocalRuleReads },
  ]
  const fetchCatalogPage = useCallback(async (offset: number, append: boolean) => {
    const normalizedQuery = catalogQuery.trim()
    const requestKey = `${language}:${catalogScope}:${catalogPriority}:${normalizedQuery}:${offset}:${append ? 'append' : 'replace'}`
    if (catalogRequestRef.current === requestKey) return
    catalogAbortRef.current?.abort()
    const controller = new AbortController()
    catalogAbortRef.current = controller
    catalogRequestRef.current = requestKey
    const requestSequence = catalogSequenceRef.current + 1
    catalogSequenceRef.current = requestSequence
    const params = new URLSearchParams({
      lang: language,
      scope: catalogScope,
      priority: catalogPriority,
      offset: String(offset),
      limit: '12',
    })
    if (normalizedQuery) params.set('q', normalizedQuery)
    setCatalogLoading(true)
    setCatalogError('')
    try {
      const response = await apiFetch(`/api/document-catalog?${params.toString()}`, { signal: controller.signal })
      if (!response.ok) throw new Error(`API ${response.status}`)
      const payload = (await response.json()) as DocumentCatalogPage
      if (requestSequence !== catalogSequenceRef.current) return
      setCatalogPage({
        total: payload.total,
        filtered: payload.filtered,
        offset: payload.offset,
        limit: payload.limit,
        hasMore: payload.hasMore,
      })
      setCatalogSearchStatus(payload.search)
      setCatalogRows((current) => {
        if (!append) return payload.catalog
        const seen = new Set(current.map((record) => record.id))
        return [...current, ...payload.catalog.filter((record) => !seen.has(record.id))]
      })
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
      if (requestSequence !== catalogSequenceRef.current) return
      setCatalogError(fetchError instanceof Error ? fetchError.message : String(fetchError))
    } finally {
      if (requestSequence === catalogSequenceRef.current) {
        setCatalogLoading(false)
        catalogRequestRef.current = ''
        if (catalogAbortRef.current === controller) catalogAbortRef.current = null
      }
    }
  }, [catalogPriority, catalogQuery, catalogScope, language])

  useEffect(() => {
    if (catalogQuery.trim() || catalogPriority !== 'all' || catalogScope !== 'all') return
    setCatalogRows(library.catalog)
    setCatalogPage(library.catalogPage)
    setCatalogError('')
  }, [catalogPriority, catalogQuery, catalogScope, library.generatedAt, library.catalog, library.catalogPage])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchCatalogPage(0, false)
    }, catalogQuery.trim() ? 220 : 0)
    return () => window.clearTimeout(handle)
  }, [catalogQuery, fetchCatalogPage])

  useEffect(() => () => catalogAbortRef.current?.abort(), [])

  useEffect(() => {
    if (!catalogSearchStatus?.building) return undefined
    const handle = window.setTimeout(() => void fetchCatalogPage(0, false), 1200)
    return () => window.clearTimeout(handle)
  }, [catalogSearchStatus?.building, fetchCatalogPage])

  function loadMoreCatalog() {
    if (catalogLoading) return
    setCatalogRows((current) => {
      void fetchCatalogPage(current.length, true)
      return current
    })
  }

  return (
    <section className="automation-panel document-ai-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">{text.documentPipelineEyebrow}</p>
          <h3>{text.documentPipeline}</h3>
        </div>
        <span className="panel-badge">
          <Bot size={14} />
          {library.mode}
        </span>
      </div>

      <div className="document-ai-body">
        {mode === 'review' && <div className="pipeline-summary">
          <div>
            <span>{text.neutrality}</span>
            <p>{library.neutrality}</p>
          </div>
          <div>
            <span>{text.bodyExtraction}</span>
            <p>{library.extraction.detail}</p>
          </div>
          <div>
            <span>{text.officialSourcePriority}</span>
            <p>{library.sourceStrategy.noFeePath}</p>
            <div className="priority-ladder">
              {library.sourceStrategy.priority.map((item, index) => (
                <span key={item}>{index + 1}. {item}</span>
              ))}
            </div>
            <p>{library.sourceStrategy.nfscPolicy}</p>
          </div>
          <div>
            <span>{text.overallRead}</span>
            <p>{library.portfolioRead.headline}</p>
            <ul className="compact-list">
              {library.portfolioRead.synthesis.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>}

        <div className="pipeline-stats">
          {stats.map((stat) => (
            <span key={stat.label}>
              <strong>{formatNumber(stat.value, language)}</strong>
              {stat.label}
            </span>
          ))}
        </div>

        {mode === 'review' && <div className="document-subhead">
          <FolderOpen size={15} />
          <span>{text.aiQueue}</span>
        </div>}
        {mode === 'review' && <div className="analysis-document-list">
          {library.queue.slice(0, 5).map((record) => (
            <DocumentQueueRow
              record={record}
              language={language}
              text={text}
              onAnalyzeDocument={onAnalyzeDocument}
              onOpenDocument={onOpenDocument}
              isAnalyzing={documentInsightLoading && documentInsightUrl === record.sourceUrl}
              key={record.id}
            />
          ))}
        </div>}

        {mode === 'files' && <>
        <div className="document-subhead">
          <FolderOpen size={15} />
          <span>{text.fullDocumentCatalog}</span>
        </div>
        <div className="catalog-toolbar">
          <label className="search-box">
            <Search size={16} />
            <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder={text.catalogSearch} />
          </label>
          <CustomSelect
            className="select-box"
            value={catalogScope}
            options={[
              { value: 'all', label: text.searchScopeAll },
              { value: 'original', label: text.searchScopeOriginal },
              { value: 'translation', label: text.searchScopeTranslation },
              { value: 'analysis', label: text.searchScopeAnalysis },
              { value: 'web', label: text.searchScopeWeb },
            ]}
            onChange={(value) => setCatalogScope(value as DocumentSearchScope)}
            icon={<FileSearch size={15} />}
            ariaLabel={text.searchScope}
          />
          <CustomSelect
            className="select-box"
            value={catalogPriority}
            options={[
              { value: 'all', label: text.allPriorities },
              ...(['critical', 'high', 'medium', 'low'] as Severity[]).map((priority) => ({ value: priority, label: severityText[language][priority] })),
            ]}
            onChange={(value) => setCatalogPriority(value as 'all' | Severity)}
            icon={<SlidersHorizontal size={15} />}
            ariaLabel={text.allPriorities}
          />
          <span>
            {text.showingDocs}: {formatNumber(catalogRows.length, language)} / {formatNumber(catalogPage.filtered, language)}
          </span>
        </div>
        {catalogSearchStatus && (
          <div className={`catalog-search-status ${catalogSearchStatus.stale || catalogSearchStatus.building ? 'is-building' : ''}`}>
            <div>
              {catalogSearchStatus.stale || catalogSearchStatus.building ? <Loader2 className="spin" size={15} /> : <DatabaseZap size={15} />}
              <strong>{catalogSearchStatus.stale || catalogSearchStatus.building ? text.searchIndexRebuilding : text.searchIndexReady}</strong>
              <span>{formatNumber(catalogSearchStatus.coverage.indexedOriginals, language)} / {formatNumber(catalogSearchStatus.coverage.uniquePdfContents, language)}</span>
            </div>
            <div className="catalog-search-coverage">
              <span><CheckCircle2 size={12} />{text.searchCoverageComplete} {formatNumber(catalogSearchStatus.coverage.completeOriginals, language)}</span>
              <span><FileText size={12} />{text.searchCoveragePartial} {formatNumber(catalogSearchStatus.coverage.partialOriginals, language)}</span>
              <span className={catalogSearchStatus.coverage.missingOriginals ? 'has-gap' : ''}><AlertTriangle size={12} />{text.searchCoverageMissing} {formatNumber(catalogSearchStatus.coverage.missingOriginals, language)}</span>
              <span><ScanText size={12} />{text.searchCoverageOcr} {formatNumber(catalogSearchStatus.coverage.ocrOriginals, language)}</span>
            </div>
            {catalogSearchStatus.queryTruncated && <p>{text.searchQueryTruncated}</p>}
          </div>
        )}
        {catalogError && (
          <div className="catalog-error">
            <AlertTriangle size={14} />
            <span>{catalogError}</span>
          </div>
        )}
        <div className="catalog-grid">
          {catalogRows.map((record) => (
            <DocumentCatalogRow
              record={record}
              language={language}
              text={text}
              onAnalyzeDocument={onAnalyzeDocument}
              onOpenDocument={onOpenDocument}
              isAnalyzing={documentInsightLoading && documentInsightUrl === record.sourceUrl}
              key={record.id}
            />
          ))}
        </div>
        {!catalogLoading && !catalogError && catalogRows.length === 0 && (
          <div className="catalog-empty-state">
            <FileSearch size={22} />
            <span>{text.searchNoResults}</span>
          </div>
        )}
        {catalogPage.hasMore && (
          <button className="catalog-load-button" type="button" onClick={loadMoreCatalog} disabled={catalogLoading}>
            {catalogLoading ? <Loader2 className="spin" size={13} /> : null}
            {catalogLoading ? text.documentPipelineLoading : text.loadMore}
          </button>
        )}
        </>}

        {mode === 'review' && <details className="pipeline-policy-details">
          <summary>
            <ShieldCheck size={15} />
            <span>{text.processingDetails}</span>
          </summary>
          <AutomationList icon={<ShieldCheck size={15} />} title={text.processingRules} items={library.processingRules.slice(0, 4)} />
        </details>}
      </div>
    </section>
  )
}

function SettingsView({
  language,
  text,
  payload,
  loading,
  saving,
  error,
  notice,
  draftSecrets,
  visibleCredentials,
  testingSourceId,
  sourceTestResults,
  aiTestResults,
  localAiTestResult,
  theme,
  onBack,
  onLanguageChange,
  onThemeChange,
  onSave,
  onSecretChange,
  onToggleCredential,
  onTestSource,
  onTestAi,
  onTestLocalAi,
}: {
  language: Language
  text: (typeof ui)[Language]
  payload: SettingsPayload | null
  loading: boolean
  saving: boolean
  error: string
  notice: string
  draftSecrets: Record<string, string | null>
  visibleCredentials: Record<string, boolean>
  testingSourceId: string
  sourceTestResults: Record<string, SourceStatus>
  aiTestResults: Partial<Record<string, AiTestResult>>
  localAiTestResult: AiTestResult | null
  theme: Theme
  onBack: () => void
  onLanguageChange: (language: Language) => void
  onThemeChange: (theme: Theme) => void
  onSave: (settings: AppSettingsRecord) => void
  onSecretChange: (key: string, value: string | null | undefined) => void
  onToggleCredential: (key: string) => void
  onTestSource: (sourceId: string) => void
  onTestAi: (provider: string) => void
  onTestLocalAi: () => void
}) {
  const [draft, setDraft] = useState<AppSettingsRecord | null>(payload?.settings ?? null)
  const [activeSection, setActiveSection] = useState('settings-overview')
  const settingsGridRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (payload?.settings) setDraft(payload.settings)
  }, [payload?.settings])

  useLayoutEffect(() => {
    const grid = settingsGridRef.current
    if (!grid || typeof ResizeObserver === 'undefined') return undefined
    let frame = 0
    const cards = Array.from(grid.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
    const layoutCards = () => {
      const style = window.getComputedStyle(grid)
      const rowHeight = Number.parseFloat(style.gridAutoRows)
      const rowGap = Number.parseFloat(style.rowGap)
      if (!Number.isFinite(rowHeight) || rowHeight <= 0 || !Number.isFinite(rowGap)) return
      cards.forEach((card) => {
        const span = Math.max(1, Math.ceil((card.getBoundingClientRect().height + rowGap) / (rowHeight + rowGap)))
        card.style.gridRowEnd = `span ${span}`
      })
    }
    const scheduleLayout = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(layoutCards)
    }
    const observer = new ResizeObserver(scheduleLayout)
    cards.forEach((card) => observer.observe(card))
    scheduleLayout()
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      cards.forEach((card) => card.style.removeProperty('grid-row-end'))
    }
  }, [payload])

  useEffect(() => {
    const targetId = window.location.hash.replace(/^#/, '')
    if (!targetId || targetId === 'settings') return undefined
    const frame = window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block: 'start' }))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const sectionIds = ['settings-overview', 'settings-credentials', 'settings-ai', 'settings-automation', 'settings-processing', 'settings-pacer', 'settings-diagnostics']
    const sections = sectionIds.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section))
    if (!sections.length) return undefined
    let frame = 0
    const updateActiveSection = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const anchor = 125
        const visible = sections.filter((section) => section.getBoundingClientRect().bottom > anchor)
        if (!visible.length) {
          setActiveSection(sections[sections.length - 1].id)
          return
        }
        const nearestTop = Math.min(...visible.map((section) => Math.abs(section.getBoundingClientRect().top - anchor)))
        const candidates = visible.filter((section) => Math.abs(Math.abs(section.getBoundingClientRect().top - anchor) - nearestTop) < 2)
        const hashTarget = window.location.hash.replace(/^#/, '')
        const selected = candidates.find((section) => section.id === hashTarget) ?? candidates[0]
        if (selected) setActiveSection(selected.id)
      })
    }
    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateActiveSection)
    }
  }, [payload])

  function update<K extends keyof AppSettingsRecord>(key: K, value: AppSettingsRecord[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current)
  }

  if (loading && !payload) {
    return <main className="settings-screen boot-screen"><Loader2 className="spin" size={28} /><span>{text.loading}</span></main>
  }

  if (!draft || !payload) {
    return (
      <main className="settings-screen boot-screen">
        <AlertTriangle size={28} />
        <span>{text.settingsLoadError}: {error || 'unknown'}</span>
        <button className="settings-back-button" type="button" onClick={onBack}><ArrowLeft size={16} />{text.backHome}</button>
      </main>
    )
  }

  const credentialFields = [
    { key: 'openaiApiKey', label: text.openaiKey, placeholder: 'sk-...', sourceId: 'openai', setupUrl: 'https://platform.openai.com/api-keys', icon: <Bot size={16} />, isAi: true },
    { key: 'anthropicApiKey', label: text.anthropicKey, placeholder: 'sk-ant-...', sourceId: 'anthropic', setupUrl: 'https://console.anthropic.com/settings/keys', icon: <BrainCircuit size={16} />, isAi: true },
    { key: 'geminiApiKey', label: text.geminiKey, placeholder: 'AIza...', sourceId: 'gemini', setupUrl: 'https://aistudio.google.com/app/apikey', icon: <Sparkles size={16} />, isAi: true },
    { key: 'compatibleApiKey', label: text.compatibleKey, placeholder: 'Provider API key', sourceId: 'openai_compatible', setupUrl: '', icon: <Network size={16} />, isAi: true },
    { key: 'courtlistenerToken', label: text.courtlistenerToken, placeholder: 'Token ...', sourceId: 'courtlistener-recap', setupUrl: 'https://www.courtlistener.com/sign-in/', icon: <Landmark size={16} />, isAi: false },
    { key: 'pacerUsername', label: text.pacerUsername, placeholder: 'PACER account', sourceId: '', setupUrl: 'https://pacer.uscourts.gov/register-account', icon: <Scale size={16} />, isAi: false },
    { key: 'pacerPassword', label: text.pacerPassword, placeholder: 'Password', sourceId: 'pacer', setupUrl: '', icon: <LockKeyhole size={16} />, isAi: false },
    { key: 'pacerClientCode', label: text.pacerClientCode, placeholder: 'Optional billing code', sourceId: '', setupUrl: '', icon: <CircleDollarSign size={16} />, isAi: false },
  ]

  const fieldStatus = (key: string) => payload.secrets[key] ?? { configured: false, masked: '', source: 'none' }
  const testLabel = (sourceId: string) => {
    if (testingSourceId === sourceId) return text.testingConnection
    const result = aiTestResults[sourceId] ?? (sourceId === 'local-ai' ? localAiTestResult : sourceTestResults[sourceId])
    if (result?.status === 'ok') return text.connectionPassed
    if (result?.status === 'needs_implementation') return text.capabilityNotImplemented
    if (result?.status === 'error') return text.connectionFailed
    return text.testConnection
  }
  const configuredCredentialCount = Object.values(payload.secrets).filter((secret) => secret.configured).length
  const localStoredCredentialCount = Object.values(payload.secrets).filter((secret) => secret.source === 'secure_storage').length
  const persistedDiagnostics = new Map((payload.sourceDiagnostics ?? []).map((status) => [status.sourceId, status]))
  const diagnosticFor = (id: string) => id === 'local-ai' && localAiTestResult
    ? {
        sourceId: 'local-ai',
        status: localAiTestResult.status,
        checkedAt: new Date().toISOString(),
        latencyMs: localAiTestResult.latencyMs ?? null,
        itemCount: localAiTestResult.status === 'ok' ? 1 : 0,
        message: localAiTestResult.message,
        facts: [],
      } as SourceStatus
    : sourceTestResults[id] ?? persistedDiagnostics.get(id) ?? payload.integrationDiagnostics?.[id] ?? null
  const pacerCredentials = Boolean(payload.secrets.pacerUsername?.configured && payload.secrets.pacerPassword?.configured)
  const recapCredentials = Boolean(payload.secrets.courtlistenerToken?.configured)
  const cloudProviderSecretKeys: Record<string, string> = {
    openai: 'openaiApiKey',
    anthropic: 'anthropicApiKey',
    gemini: 'geminiApiKey',
    openai_compatible: 'compatibleApiKey',
  }
  const cloudProviderLabels: Record<string, string> = {
    openai: text.openai,
    anthropic: text.anthropic,
    gemini: text.gemini,
    openai_compatible: text.openaiCompatible,
    ollama: text.localOllama,
    local: text.localRules,
  }
  const cloudProviderOptions: Array<[string, string]> = [
    ['local', text.localRules],
    ['ollama', text.localOllama],
    ['openai', text.openai],
    ['anthropic', text.anthropic],
    ['gemini', text.gemini],
    ['openai_compatible', text.openaiCompatible],
  ]
  const selectedCloudProviders = [...new Set([draft.aiProvider, draft.translationProvider].filter((provider) => provider in cloudProviderSecretKeys))]
  const configuredCloudProviders = Object.entries(cloudProviderSecretKeys).filter(([, secretKey]) => payload.secrets[secretKey]?.configured).map(([provider]) => provider)
  const selectedCloudReady = selectedCloudProviders.length > 0 && selectedCloudProviders.every((provider) => payload.secrets[cloudProviderSecretKeys[provider]]?.configured)
  const localAiEnabled = draft.aiProvider === 'ollama' || draft.translationProvider === 'ollama'
  const localAiReady = diagnosticFor('local-ai')?.status === 'ok'
  const connectedState = (id: string, configured: boolean): CapabilityState => {
    if (!configured) return 'needs_setup'
    const status = diagnosticFor(id)?.status
    if (status === 'ok') return 'ready'
    if (status === 'error') return 'error'
    if (status === 'limited') return 'limited'
    if (status === 'stale') return 'limited'
    return 'credentials_only'
  }
  const capabilityRows: Array<{ id: string; label: string; detail: string; state: CapabilityState; diagnostic?: SourceStatus | null }> = [
    { id: 'pacer', label: text.sourcePacer, detail: text.capabilityPacerDetail, state: 'not_implemented', diagnostic: diagnosticFor('pacer') as SourceStatus | null },
    { id: 'courtlistener-recap', label: text.sourceRecap, detail: text.capabilityRecapDetail, state: recapCredentials ? connectedState('courtlistener-recap', true) : 'limited', diagnostic: diagnosticFor('courtlistener-recap') as SourceStatus | null },
    { id: selectedCloudProviders[0] ?? 'cloud-ai', label: text.sourceAi, detail: text.capabilityAiDetail, state: selectedCloudProviders.length ? selectedCloudReady ? connectedState(selectedCloudProviders[0], true) : 'needs_setup' : 'limited', diagnostic: selectedCloudProviders.length === 1 ? diagnosticFor(selectedCloudProviders[0]) as SourceStatus | null : null },
    { id: 'local-ai', label: text.sourceLocalAi, detail: text.localAiDetail, state: localAiReady ? 'no_key' : localAiEnabled && diagnosticFor('local-ai')?.status === 'error' ? 'error' : 'needs_setup', diagnostic: diagnosticFor('local-ai') as SourceStatus | null },
    { id: 'official-public', label: text.sourcePublic, detail: text.capabilityPublicDetail, state: 'ready' },
    { id: 'epiq-kwok-trustee', label: text.sourceEpiq, detail: text.capabilityEpiqDetail, state: 'limited', diagnostic: diagnosticFor('epiq-kwok-trustee') as SourceStatus | null },
    { id: 'local-pdf', label: text.sourceLocalPdf, detail: text.capabilityLocalDetail, state: 'ready' },
    { id: 'nfsc-criminal-mirror', label: text.sourceNfsc, detail: text.capabilityNfscDetail, state: 'limited', diagnostic: diagnosticFor('nfsc-criminal-mirror') as SourceStatus | null },
  ]
  const hasUnsavedSecrets = Object.values(draftSecrets).some((value) => value !== undefined)
  const aiSettingsChanged = draft.aiModel !== payload.settings.aiModel
    || draft.translationModel !== payload.settings.translationModel
    || draft.compatibleAiBaseUrl !== payload.settings.compatibleAiBaseUrl

  return (
    <main className="settings-screen">
      <div className="settings-shell">
        <header className="settings-topbar">
          <div className="settings-topbar-main">
            <button className="settings-back-button" type="button" onClick={onBack} title={text.backHome}>
              <ArrowLeft size={17} />
              <span>{text.backHome}</span>
            </button>
            <div className="settings-title-block">
              <p className="eyebrow">{text.settingsEyebrow}</p>
              <h1>{text.settingsTitle}</h1>
              <p>{text.settingsCopy}</p>
            </div>
          </div>
          <div className="settings-header-actions">
            <ThemeToggle theme={theme} text={text} onChange={onThemeChange} />
            <div className="language-switch" aria-label="Language">
              <Languages size={15} />
              <button type="button" className={language === 'zh' ? 'active' : ''} onClick={() => onLanguageChange('zh')}>{language === 'zh' ? '中文' : 'ZH'}</button>
              <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => onLanguageChange('en')}>EN</button>
            </div>
            <button className="settings-save-button" type="button" onClick={() => onSave(draft)} disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              {saving ? text.saving : text.saveSettings}
            </button>
          </div>
        </header>

        <div className="settings-layout">
          <aside className="settings-sidebar">
            <nav aria-label={text.settingsNavLabel}>
              <a className={activeSection === 'settings-overview' ? 'active' : ''} href="#settings-overview"><ClipboardCheck size={15} />{text.settingsOverview}</a>
              <a className={activeSection === 'settings-credentials' ? 'active' : ''} href="#settings-credentials"><KeyRound size={15} />{text.settingsCredentials}</a>
              <a className={activeSection === 'settings-ai' ? 'active' : ''} href="#settings-ai"><Bot size={15} />{text.settingsAiPrivacy}</a>
              <a className={activeSection === 'settings-automation' ? 'active' : ''} href="#settings-automation"><RefreshCw size={15} />{text.settingsAutomation}</a>
              <a className={activeSection === 'settings-processing' ? 'active' : ''} href="#settings-processing"><ScanText size={15} />{text.settingsProcessing}</a>
              <a className={activeSection === 'settings-pacer' ? 'active' : ''} href="#settings-pacer"><Scale size={15} />{text.settingsPacer}</a>
              <a className={activeSection === 'settings-diagnostics' ? 'active' : ''} href="#settings-diagnostics"><DatabaseZap size={15} />{text.settingsData}</a>
            </nav>
            <div className="settings-local-state">
              <span><LockKeyhole size={14} />{text.localOnly}</span>
              <strong>{payload.secureStorageAvailable ? text.secureStorage : text.environmentStorage}</strong>
            </div>
          </aside>

          <div className="settings-content">
            {(error || notice) && <div className={`settings-feedback ${error ? 'error' : 'success'}`}><span>{error || notice}</span></div>}
            <section className="settings-overview-band" id="settings-overview">
              <div><KeyRound size={17} /><span>{text.configuredCount}</span><strong>{configuredCredentialCount}/{credentialFields.length}</strong></div>
              <div><RefreshCw size={17} /><span>{text.autoRefreshState}</span><strong>{draft.autoRefresh ? text.enabled : text.disabled}</strong></div>
              <div><Cpu size={17} /><span>{text.aiProvider}</span><strong>{cloudProviderLabels[draft.aiProvider] ?? draft.aiProvider}</strong></div>
            </section>
            <section className="no-key-capability-matrix" aria-label={text.noKeyMatrixTitle}>
              <header>
                <div><ShieldCheck size={17} /><strong>{text.noKeyMatrixTitle}</strong></div>
                <span>{text.capabilityNoKey}</span>
              </header>
              <div className="no-key-capability-grid">
                <article className="capability-active"><CheckCircle2 size={17} /><div><strong>{text.noKeyCore}</strong><p>{text.noKeyCoreDetail}</p></div><span>{text.activeNow}</span></article>
                <article className={localAiReady ? 'capability-active' : ''}><Cpu size={17} /><div><strong>{text.noKeyGenerative}</strong><p>{text.noKeyGenerativeDetail}</p></div><span>{localAiReady ? text.activeNow : text.optionalSetup}</span></article>
                <article className={configuredCloudProviders.length ? 'capability-active' : ''}><Bot size={17} /><div><strong>{text.cloudEnhancement}</strong><p>{text.cloudEnhancementDetail}</p></div><span>{configuredCloudProviders.length ? text.capabilityCredentials : text.optionalSetup}</span></article>
                <article><Scale size={17} /><div><strong>{text.officialCompleteness}</strong><p>{text.officialCompletenessDetail}</p></div><span>{text.adapterPending}</span></article>
              </div>
            </section>

            <div className="settings-grid" ref={settingsGridRef}>
          <section className="settings-section settings-credentials" id="settings-credentials">
            <div className="settings-section-heading">
              <div className="settings-section-icon"><KeyRound size={18} /></div>
              <div><p className="eyebrow">{text.secureStorage}</p><h2>{text.credentialsTitle}</h2></div>
            </div>
            <p className="settings-section-copy">{text.credentialsCopy}</p>
            {!payload.secureStorageAvailable && (
              <div className="settings-warning">
                <AlertTriangle size={16} />
                {payload.secureStorageStatus === 'denied_or_unavailable'
                  ? text.secureStorageDenied
                  : payload.secureStorageStatus === 'corrupt'
                    ? text.secureStorageCorrupt
                    : text.secureStorageUnavailable}
              </div>
            )}
            <div className="credential-grid">
              {credentialFields.map((field) => {
                const status = fieldStatus(field.key)
                const draftValue = draftSecrets[field.key]
                const value = typeof draftValue === 'string' ? draftValue : ''
                const pendingDelete = draftValue === null
                const pendingWrite = typeof draftValue === 'string' && Boolean(draftValue.trim())
                const hasPendingChange = draftValue !== undefined
                const isVisible = Boolean(visibleCredentials[field.key])
                const result = field.isAi ? aiTestResults[field.sourceId] : field.sourceId ? sourceTestResults[field.sourceId] : null
                const sourceHasUnsavedSecret = field.sourceId === 'pacer'
                  ? draftSecrets.pacerUsername !== undefined || draftSecrets.pacerPassword !== undefined || draftSecrets.pacerClientCode !== undefined
                  : draftSecrets[field.key] !== undefined
                const testDisabled = Boolean(testingSourceId === field.sourceId || sourceHasUnsavedSecret || (field.isAi && aiSettingsChanged) || (field.sourceId === 'pacer' && !pacerCredentials))
                const statusLabel = pendingDelete
                  ? text.pendingCredentialDelete
                  : pendingWrite
                    ? status.configured ? text.pendingCredentialReplace : text.pendingCredentialAdd
                    : status.configured ? text.configured : text.notConfigured
                const storageLabel = pendingDelete
                  ? text.pendingCredentialDelete
                  : pendingWrite
                    ? status.configured ? text.pendingCredentialReplace : text.pendingCredentialAdd
                    : status.source === 'secure_storage'
                      ? text.secureStorage
                      : status.source === 'environment'
                        ? text.environmentManagedExternally
                        : text.notConfigured
                return (
                  <form className={`credential-field ${field.isAi ? 'credential-field-ai' : ''}`} key={field.key} onSubmit={(event) => event.preventDefault()}>
                    <div className="credential-label"><span>{field.icon}{field.label}</span><b className={pendingDelete ? 'pending-delete' : pendingWrite ? 'pending-change' : status.configured ? 'configured' : ''}>{statusLabel}</b></div>
                    <div className="credential-input-wrap">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={value}
                        placeholder={status.configured ? `${status.masked} · ${text.enterCredentialReplacement}` : field.placeholder}
                        disabled={!payload.secureStorageAvailable || pendingDelete}
                        autoComplete="off"
                        onChange={(event) => onSecretChange(field.key, event.target.value || undefined)}
                      />
                      {value && <button type="button" className="credential-icon-button" onClick={() => onToggleCredential(field.key)} title={isVisible ? text.hideCredential : text.showCredential}>
                        {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>}
                      {pendingDelete ? (
                        <button type="button" className="credential-undo-button" onClick={() => onSecretChange(field.key, undefined)}><RotateCcw size={13} />{text.undoDelete}</button>
                      ) : hasPendingChange ? (
                        <button type="button" className="credential-undo-button" onClick={() => onSecretChange(field.key, undefined)}><RotateCcw size={13} />{text.cancelCredentialChange}</button>
                      ) : status.source === 'secure_storage' ? (
                        <button type="button" className="credential-clear-button" onClick={() => onSecretChange(field.key, null)}><Trash2 size={13} />{text.deleteCredential}</button>
                      ) : null}
                    </div>
                    <div className="credential-meta">
                      <span>{storageLabel}</span>
                      {field.setupUrl && <a className="credential-portal" href={safeExternalHref(field.setupUrl)} target="_blank" rel="noreferrer">{text.providerPortal}<ArrowUpRight size={12} /></a>}
                      {field.sourceId && !field.isAi && <button type="button" className={`connection-button ${result?.status === 'ok' ? 'passed' : result?.status === 'error' || result?.status === 'needs_implementation' ? 'failed' : ''}`} onClick={() => onTestSource(field.sourceId)} disabled={testDisabled} title={sourceHasUnsavedSecret ? text.saveBeforeTest : ''}>
                        {testingSourceId === field.sourceId && <Loader2 className="spin" size={13} />}
                        {testLabel(field.sourceId)}
                      </button>}
                      {field.isAi && <button type="button" className={`connection-button ${result?.status === 'ok' ? 'passed' : result?.status === 'error' ? 'failed' : ''}`} onClick={() => onTestAi(field.sourceId)} disabled={testDisabled} title={sourceHasUnsavedSecret || aiSettingsChanged ? text.saveBeforeTest : ''}>
                        {testingSourceId === field.sourceId && <Loader2 className="spin" size={13} />}
                        {testingSourceId === field.sourceId ? text.testingConnection : result?.status === 'ok' ? text.connectionPassed : result?.status === 'error' ? text.connectionFailed : text.testAi}
                      </button>}
                    </div>
                    {!sourceHasUnsavedSecret && result?.message && <small className={`connection-message ${result.status === 'ok' ? 'passed' : 'failed'}`}>{result.message}{field.isAi && result.latencyMs ? ` · ${result.latencyMs} ms` : ''}</small>}
                  </form>
                )
              })}
            </div>
            <div className="credential-control-bar">
              <p>{text.credentialControlDetail}</p>
              <div>
                {hasUnsavedSecrets && <button type="button" className="credential-undo-button" onClick={() => credentialFields.forEach((field) => onSecretChange(field.key, undefined))}><RotateCcw size={14} />{text.discardCredentialChanges}</button>}
                {localStoredCredentialCount > 0 && <button type="button" className="credential-clear-button" onClick={() => credentialFields.forEach((field) => onSecretChange(field.key, fieldStatus(field.key).source === 'secure_storage' ? null : undefined))}><Trash2 size={14} />{text.deleteAllLocalCredentials}</button>}
              </div>
            </div>
          </section>

          <SettingsCard id="settings-ai" icon={<Bot size={18} />} eyebrow={text.aiTitle} title={text.aiTitle}>
            <div className="settings-form-grid two">
              <SettingSelect label={text.aiProvider} value={draft.aiProvider} options={cloudProviderOptions} onChange={(value) => update('aiProvider', value)} />
              <SettingInput label={text.aiModel} value={draft.aiModel} onChange={(value) => update('aiModel', value)} />
              <SettingSelect label={text.aiReasoningEffort} value={draft.aiReasoningEffort} options={[["none", text.reasoningNone], ["low", text.reasoningLow], ["medium", text.reasoningMedium], ["high", text.reasoningHigh], ["xhigh", text.reasoningXHigh], ["max", text.reasoningMax]]} onChange={(value) => update('aiReasoningEffort', value)} />
              <SettingSelect label={text.translationProvider} value={draft.translationProvider} options={cloudProviderOptions.map(([value, label]) => [value, value === 'local' ? text.noCloudTranslation : label])} onChange={(value) => update('translationProvider', value)} />
              <SettingInput label={text.translationModel} value={draft.translationModel} onChange={(value) => update('translationModel', value)} />
              <SettingInput label={text.compatibleAiBaseUrl} value={draft.compatibleAiBaseUrl} onChange={(value) => update('compatibleAiBaseUrl', value)} />
            </div>
            <div className="settings-form-grid two">
              <SettingInput label={text.localAiBaseUrl} value={draft.localAiBaseUrl} onChange={(value) => update('localAiBaseUrl', value)} />
              <SettingInput label={text.localAiModel} value={draft.localAiModel} onChange={(value) => update('localAiModel', value)} />
              <SettingNumber label={text.localAiTimeout} value={draft.localAiTimeoutMs} min={10000} max={600000} step={1000} onChange={(value) => update('localAiTimeoutMs', value)} />
              <SettingNumber label={text.localAiContext} value={draft.localAiContextChars} min={20000} max={500000} step={10000} onChange={(value) => update('localAiContextChars', value)} />
            </div>
            <div className="settings-info"><Cpu size={15} />{text.reasoningDetail}</div>
            <div className="settings-info"><ShieldAlert size={15} />{text.modelQualityDetail}</div>
            <div className="settings-info"><Network size={15} />{text.compatibleAiDetail}</div>
            <div className="settings-info"><Bot size={15} />{text.localAiDetail}</div>
            <div className="settings-info"><Languages size={15} />{text.localTranslationDetail}</div>
            <div className="settings-inline-actions">
              <a className="connection-button" href="https://ollama.com/download" target="_blank" rel="noreferrer">{text.providerPortal}<ArrowUpRight size={12} /></a>
            </div>
            <div className="settings-inline-actions">
              <button type="button" className={`connection-button ${localAiTestResult?.status === 'ok' ? 'passed' : localAiTestResult?.status === 'error' ? 'failed' : ''}`} onClick={onTestLocalAi} disabled={testingSourceId === 'local-ai'}>
                {testingSourceId === 'local-ai' && <Loader2 className="spin" size={13} />}
                {testingSourceId === 'local-ai' ? text.testingConnection : localAiTestResult?.status === 'ok' ? text.connectionPassed : localAiTestResult?.status === 'error' ? text.connectionFailed : text.testConnection}
              </button>
              {localAiTestResult?.message && <small className={`connection-message ${localAiTestResult.status === 'ok' ? 'passed' : 'failed'}`}>{localAiTestResult.message}{localAiTestResult.latencyMs ? ` · ${localAiTestResult.latencyMs} ms` : ''}</small>}
            </div>
            <ToggleRow label={text.aiPrivacy} detail={text.aiPrivacyDetail} checked={draft.sendSnippetsToAi} onChange={(value) => update('sendSnippetsToAi', value)} />
            <ToggleRow label={text.aiRedaction} detail={text.aiRedactionDetail} checked={draft.redactSensitiveDataBeforeAi} onChange={(value) => update('redactSensitiveDataBeforeAi', value)} />
            <div className="settings-info"><ShieldCheck size={15} />{text.aiDataBoundary}</div>
          </SettingsCard>

          <SettingsCard id="settings-automation" icon={<RefreshCw size={18} />} eyebrow={text.automationTitle} title={text.automationTitle}>
            <ToggleRow label={text.autoRefresh} checked={draft.autoRefresh} onChange={(value) => update('autoRefresh', value)} />
            <div className="settings-form-grid two">
              <SettingNumber label={text.refreshInterval} value={draft.refreshIntervalMinutes} min={5} max={1440} onChange={(value) => update('refreshIntervalMinutes', value)} />
              <SettingNumber label={text.networkRetry} value={draft.networkRetryMinutes} min={1} max={60} onChange={(value) => update('networkRetryMinutes', value)} />
              <SettingSelect label={text.automationLanguage} value={draft.automationLanguage} options={[["both", text.automationBoth], ["zh", text.automationChinese], ["en", text.automationEnglish]]} onChange={(value) => update('automationLanguage', value)} />
              <SettingSelect label={text.automaticScope} value={draft.automaticProcessingScope} options={[["priority", text.automaticScopePriority], ["all", text.automaticScopeAll]]} onChange={(value) => update('automaticProcessingScope', value)} />
              <SettingNumber label={text.automaticLimit} value={draft.automaticProcessingLimit} min={1} max={500} onChange={(value) => update('automaticProcessingLimit', value)} />
            </div>
            <ToggleRow label={text.autoProcess} checked={draft.autoProcessDocuments} onChange={(value) => update('autoProcessDocuments', value)} />
            <div className="settings-info"><Workflow size={15} />{draft.automaticProcessingScope === 'all' ? text.automaticScopeAllDetail : text.automaticScopePriorityDetail}</div>
            <ToggleRow label={text.includeTranslation} checked={draft.includeTranslation} onChange={(value) => update('includeTranslation', value)} />
            <ToggleRow label={text.includeAi} checked={draft.includeAi} onChange={(value) => update('includeAi', value)} />
          </SettingsCard>

          <SettingsCard id="settings-processing" icon={<ScanText size={18} />} eyebrow={text.processingTitle} title={text.processingTitle}>
            <ToggleRow label={text.localOcr} detail={text.localOcrDetail} checked={draft.localOcrEnabled} onChange={(value) => update('localOcrEnabled', value)} />
            <div className="settings-form-grid three">
              <SettingNumber label={text.ocrPages} value={draft.ocrPageLimit} min={1} max={80} onChange={(value) => update('ocrPageLimit', value)} />
              <SettingNumber label={text.pdfPages} value={draft.pdfPageLimit} min={1} max={300} onChange={(value) => update('pdfPageLimit', value)} />
              <SettingNumber label={text.pdfChars} value={draft.pdfCharLimit} min={1000} max={1000000} onChange={(value) => update('pdfCharLimit', value)} />
              <SettingNumber label={text.translationChunk} value={draft.translationChunkChars} min={2000} max={30000} onChange={(value) => update('translationChunkChars', value)} />
              <SettingNumber label={text.downloadConcurrency} value={draft.downloadConcurrency} min={1} max={8} onChange={(value) => update('downloadConcurrency', value)} />
              <SettingNumber label={text.timeout} value={draft.downloadTimeoutMs} min={5000} max={120000} onChange={(value) => update('downloadTimeoutMs', value)} />
              <SettingNumber label={text.retries} value={draft.downloadRetries} min={0} max={6} onChange={(value) => update('downloadRetries', value)} />
              <SettingNumber label={text.downloadMaxSize} value={draft.downloadMaxFileMb} min={10} max={500} onChange={(value) => update('downloadMaxFileMb', value)} />
              <SettingNumber label={text.pdfMaxSize} value={draft.pdfMaxFileMb} min={10} max={500} onChange={(value) => update('pdfMaxFileMb', value)} />
              <SettingSelect label={text.integrityMode} value={draft.fileIntegrityMode} options={[["changed", text.integrityChanged], ["full", text.integrityFull], ["remote", text.integrityRemote]]} onChange={(value) => update('fileIntegrityMode', value)} />
            </div>
          </SettingsCard>

          <SettingsCard id="settings-pacer" icon={<ShieldCheck size={18} />} eyebrow={text.pacerTitle} title={text.pacerTitle}>
            <div className="settings-form-grid two"><SettingNumber label={text.pacerBudget} value={draft.pacerMonthlyBudgetUsd} min={0} max={500} step={1} onChange={(value) => update('pacerMonthlyBudgetUsd', value)} /></div>
            <ToggleRow label={text.pacerAutoDownload} detail={text.disabledByDesign} checked={false} disabled onChange={() => undefined} />
            <div className="settings-warning"><ShieldCheck size={16} />{text.pacerBoundary}</div>
          </SettingsCard>

          <section className="settings-section settings-diagnostics" id="settings-diagnostics">
            <div className="settings-section-heading"><div className="settings-section-icon"><DatabaseZap size={18} /></div><div><p className="eyebrow">{text.diagnosticTitle}</p><h2>{text.dataTitle}</h2></div></div>
            <p className="settings-section-copy">{text.diagnosticCopy}</p>
            <div className="settings-path-list"><PathRow label={text.dataDirectory} value={payload.dataDirectory} language={language} /><PathRow label={text.cacheDirectory} value={payload.cacheDirectory} language={language} /></div>
            <div className="capability-list">
              {capabilityRows.map((capability) => <CapabilityRow key={capability.id} language={language} text={text} {...capability} />)}
            </div>
            <p className="settings-security-note"><LockKeyhole size={14} />{text.settingsSecurityNote}</p>
          </section>
            </div>
            {hasUnsavedSecrets && <div className="settings-unsaved-note"><AlertTriangle size={14} />{text.saveBeforeTest}</div>}
          </div>
        </div>
      </div>
    </main>
  )
}

function SettingsCard({ id, icon, eyebrow, title, children }: { id?: string; icon: ReactNode; eyebrow: string; title: string; children: ReactNode }) {
  return <section className="settings-section settings-card" id={id}><div className="settings-section-heading"><div className="settings-section-icon">{icon}</div><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div><div className="settings-card-body">{children}</div></section>
}

function SettingInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="setting-control"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function SettingNumber({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="setting-control"><span>{label}</span><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

function SettingSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <div className="setting-control"><span>{label}</span><CustomSelect value={value} options={options.map(([option, optionLabel]) => ({ value: option, label: optionLabel }))} onChange={onChange} ariaLabel={label} /></div>
}

function ToggleRow({ label, detail, checked, disabled = false, onChange }: { label: string; detail?: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <label className={`toggle-row ${disabled ? 'disabled' : ''}`}><span><strong>{label}</strong>{detail && <small>{detail}</small>}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>
}

function PathRow({ label, value, language }: { label: string; value: string; language: Language }) {
  const displayValue = displayLocalPath(value, language)
  return <div className="path-row" title={displayValue}><span>{label}</span><code>{displayValue}</code></div>
}

type CapabilityState = 'ready' | 'credentials_only' | 'not_implemented' | 'needs_setup' | 'limited' | 'error' | 'no_key'

function CapabilityRow({ language, text, label, detail, state, diagnostic }: { language: Language; text: (typeof ui)[Language]; label: string; detail: string; state: CapabilityState; diagnostic?: SourceStatus | null }) {
  const labels: Record<CapabilityState, string> = {
    ready: text.capabilityReady,
    credentials_only: text.capabilityCredentials,
    not_implemented: text.capabilityNotImplemented,
    needs_setup: text.capabilityNeedsSetup,
    limited: text.capabilityLimited,
    error: text.capabilityError,
    no_key: text.capabilityNoKey,
  }
  const tone = state === 'ready' || state === 'no_key' ? 'ready' : state === 'error' ? 'error' : 'warning'
  const checked = diagnostic?.checkedAt ? new Date(diagnostic.checkedAt).toLocaleString(localeFor(language)) : text.neverChecked
  return (
    <div className={`capability-row capability-${tone}`}>
      <div className="capability-main">
        <span>{state === 'ready' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}{label}</span>
        <p>{detail}</p>
      </div>
      <div className="capability-meta">
        <strong>{labels[state]}</strong>
        <small>{text.lastChecked}: {checked}{diagnostic?.latencyMs != null ? ` · ${diagnostic.latencyMs} ms` : ''}</small>
        {diagnostic && <small>{text.diagnosticItems}: {diagnostic.itemCount ?? 0}</small>}
      </div>
      {diagnostic?.message && <p className="capability-message">{diagnostic.message}</p>}
      {diagnostic?.lastAttempt?.message && (
        <p className="capability-message">
          {language === 'en' ? 'Latest refresh attempt failed' : '最近一次刷新尝试失败'}: {diagnostic.lastAttempt.message}
        </p>
      )}
    </div>
  )
}

function DocumentAnalysisStatus({
  loading,
  error,
  text,
  onRetry,
}: {
  loading: boolean
  error: string
  text: (typeof ui)[Language]
  onRetry: () => void
}) {
  return (
    <section className="automation-panel document-ai-panel document-ai-status">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">{text.documentPipelineEyebrow}</p>
          <h3>{text.documentPipeline}</h3>
        </div>
        <span className="panel-badge">
          {loading ? <Loader2 className="spin" size={14} /> : <AlertTriangle size={14} />}
          {loading ? text.documentPipelineLoading : text.documentPipelineError}
        </span>
      </div>
      <div className="document-status-body">
        {loading ? <p>{text.documentPipelineLoading}</p> : <p>{text.documentPipelineError}: {error || 'unknown'}</p>}
        {!loading && (
          <button className="document-analyze-button" type="button" onClick={onRetry}>
            <RefreshCw size={13} />
            {text.retry}
          </button>
        )}
      </div>
    </section>
  )
}

function DocumentAnalysisRow({
  record,
  language,
  text,
  onAnalyzeDocument,
  isAnalyzing = false,
  emphasis = false,
}: {
  record: DocumentAnalysisRecord
  language: Language
  text: (typeof ui)[Language]
  onAnalyzeDocument?: (sourceUrl: string) => void
  isAnalyzing?: boolean
  emphasis?: boolean
}) {
  const relationshipEvidence = record.relationship?.evidence ?? record.relationshipEvidence ?? []
  const relationshipTasks = record.relationshipVerificationTasks ?? []
  const relationshipStatus = record.relationship?.status ?? record.relationshipStatus
  const relationshipType = record.relationship?.primaryType ?? record.relationshipType
  const relationshipLabel = record.relationship?.label ?? record.relationshipLabel
  const relationshipConfidence = record.relationship?.confidence ?? record.relationshipConfidence
  const relationshipControlWarning = record.relationship?.controlWarning ?? record.relationshipControlWarning
  const relationshipToneClass = relationshipTone(relationshipStatus)
  const verificationItems = [...new Set([...record.verificationTasks, ...relationshipTasks])]
  const researchQuality = record.researchQuality ?? {
    key: 'metadata_only',
    label: language === 'zh' ? '仅元数据辅助' : 'Metadata assistance only',
    detail: language === 'zh' ? '尚无可核验的正文覆盖信息。' : 'No verifiable body-coverage information is available yet.',
  }
  return (
    <article className={`analysis-document-row ${emphasis ? 'emphasis' : ''}`}>
      <div className="analysis-document-main">
        <div className="event-row-kicker">
          <span className={`severity-pill severity-${record.priority}`}>{severityText[language][record.priority]}</span>
          <span>{record.variantLabel}</span>
          <span>{record.category}</span>
          <span>{record.sourceLabel}</span>
          <span className={`research-quality-chip quality-${researchQuality.key}`} title={researchQuality.detail}>{researchQuality.label}</span>
        </div>
        <h4>{record.docNumber ? `${language === 'zh' ? '文件' : 'Doc'} ${record.docNumber}` : record.title}</h4>
        <p>{record.title}</p>
        <small>{text.source}: {record.sourceVerification.label}</small>
        <small>{text.bodyExtraction}: {record.textExtraction.label} · {record.textExtraction.pagesParsed}/{record.textExtraction.totalPages ?? '?'} · {formatNumber(record.textExtraction.charCount, language)}</small>
        <small>{text.translation}: {record.translationStatus.metadata} / {record.translationStatus.body}</small>
        <small>{text.aiAnalysis}: {documentAnalysisProviderLabel(record.aiStatus, language)}</small>
        {relationshipStatus && (
          <div className="document-relationship-strip">
            <span className={`relationship-status-chip relation-${relationshipToneClass}`}>{relationshipStatusLabel(relationshipStatus, language)}</span>
            <strong>{relationshipLabel ?? relationshipTypeLabel(relationshipType, null, language)}</strong>
            {relationshipConfidence && <small>{text.relationshipConfidence}: {confidenceText[language][relationshipConfidence] ?? relationshipConfidence}</small>}
          </div>
        )}
        {record.localPath && <small className="document-path">{text.localAvailable}</small>}
        <DocumentSourceAlternatives record={record} language={language} text={text} />
      </div>
      <div className="analysis-document-side">
        <div className="lawyer-read">
          <span>{text.plainRead}</span>
          <p>{record.plainEnglish || record.summary}</p>
        </div>
        <div className="mini-task-list">
          <strong>{text.lawyerRead}</strong>
          {record.legalReading.slice(0, 3).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="mini-task-list">
          <strong>{text.caseConnections}</strong>
          {record.caseConnections.slice(0, 2).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        {(relationshipEvidence.length > 0 || relationshipControlWarning) && (
          <div className="mini-task-list relationship-mini-list">
            <strong>{text.relationshipEvidence}</strong>
            {relationshipEvidence.slice(0, emphasis ? 5 : 2).map((evidence, index) => (
              <a href={safeExternalHref(evidence.sourceUrl || record.sourceUrl)} target="_blank" rel="noreferrer" key={`${record.id}-relationship-${index}`}>
                <span>{relationshipEvidenceLabel(evidence, language)}</span>
                {evidence.excerpt && <small>{evidence.excerpt}</small>}
                <ArrowUpRight size={11} />
              </a>
            ))}
            {relationshipControlWarning && <p>{relationshipControlWarning}</p>}
          </div>
        )}
        <div className="mini-task-list">
          <strong>{text.verification}</strong>
          {verificationItems.slice(0, emphasis ? 5 : 2).map((task) => (
            <span key={task}>{task}</span>
          ))}
        </div>
        {record.aiFindings?.length > 0 && (
          <div className="ai-finding-citations analysis-findings">
            <strong>{text.aiConclusionCitations}</strong>
            {record.aiFindings.map((finding, index) => (
              <article key={`${record.id}-ai-finding-${index}`}>
                <p>{finding.text}</p>
                <span>{finding.citations.map((citation) => citation.kind === 'extracted_page' && citation.pageNumber
                  ? text.pageLabel.replace('{page}', String(citation.pageNumber))
                  : text.sourceMetadataCitation).join(' · ')}</span>
              </article>
            ))}
          </div>
        )}
        {(record.textExtraction.snippet || record.translation?.translatedText || record.citations?.length) && (
          <details className="document-reader">
            <summary><BookOpenCheck size={14} />{text.extractedSnippets}</summary>
            <div className="document-reader-grid">
              <section>
                <strong>{text.originalText}</strong>
                <small className="document-source-language-note">{text.sourceTextPreserved}</small>
                {record.textExtraction.pageSnippets?.length ? record.textExtraction.pageSnippets.slice(0, 8).map((page) => (
                  <article className="reader-page" key={`${record.id}-page-${page.pageNumber}`}>
                    <span>{text.pageLabel.replace('{page}', String(page.pageNumber))}</span>
                    <p>{page.text}</p>
                  </article>
                )) : <p>{record.textExtraction.snippet}</p>}
              </section>
              <section>
                <strong>{text.translatedBody}</strong>
                {record.translation?.translatedText ? <p className="translated-copy">{record.translation.translatedText}</p> : <p className="reader-empty">{text.noCachedTranslation}</p>}
                {record.translation && <small>{record.translation.mode} · {record.translation.charCount} · {record.translation.translatedAt ? new Date(record.translation.translatedAt).toLocaleString(localeFor(language)) : '?'}</small>}
              </section>
            </div>
            {record.citations?.length > 0 && (
              <div className="citation-list">
                <strong>{text.evidenceCitations}</strong>
                {record.citations.slice(0, 8).map((citation) => (
                  <a href={safeExternalHref(citation.sourceUrl)} target="_blank" rel="noreferrer" key={citation.id}>
                    <span>{text.pageLabel.replace('{page}', String(citation.pageNumber))} · {citation.sourcePosture}</span>
                    <code>{text.textHash}: {citation.textHash?.slice(0, 16) ?? '?'}</code>
                    <ArrowUpRight size={12} />
                  </a>
                ))}
              </div>
            )}
          </details>
        )}
        {onAnalyzeDocument && (
          <button className="document-analyze-button" type="button" onClick={() => onAnalyzeDocument(record.sourceUrl)} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="spin" size={13} /> : <Bot size={13} />}
            {isAnalyzing ? text.analyzingDocument : text.analyzeDocument}
          </button>
        )}
        <a href={safeExternalHref(record.sourceUrl)} target="_blank" rel="noreferrer">
          {text.sourcePage}
          <ArrowUpRight size={12} />
        </a>
      </div>
    </article>
  )
}

function DocumentQueueRow({
  record,
  language,
  text,
  onAnalyzeDocument,
  onOpenDocument,
  isAnalyzing,
}: {
  record: DocumentAnalysisRecord
  language: Language
  text: (typeof ui)[Language]
  onAnalyzeDocument: (sourceUrl: string) => void
  onOpenDocument: (target: ManagedDocumentTarget) => void
  isAnalyzing: boolean
}) {
  return (
    <article className="document-queue-row">
      <div className="document-queue-main">
        <div className="event-row-kicker">
          <span className={`severity-pill severity-${record.priority}`}>{severityText[language][record.priority]}</span>
          <span>{record.variantLabel}</span>
          <span>{record.category}</span>
          <span>{record.sourceVerification.label}</span>
          <span className={`research-quality-chip quality-${record.researchQuality?.key ?? 'metadata_only'}`} title={record.researchQuality?.detail}>
            {record.researchQuality?.label ?? (language === 'zh' ? '仅元数据辅助' : 'Metadata assistance only')}
          </span>
        </div>
        <h4>{record.docNumber ? `${language === 'zh' ? '文件' : 'Doc'} ${record.docNumber}` : record.title}</h4>
        <p>{record.title}</p>
        <DocumentSourceAlternatives record={record} language={language} text={text} onOpenDocument={onOpenDocument} />
      </div>
      <div className="document-queue-read">
        <span>{text.plainRead}</span>
        <p>{record.plainEnglish || record.summary}</p>
      </div>
      <div className="document-queue-actions">
        {record.resourceKind !== 'web_page' && (
          <button type="button" onClick={() => onAnalyzeDocument(record.sourceUrl)} disabled={isAnalyzing} title={text.analyzeDocument}>
            {isAnalyzing ? <Loader2 className="spin" size={14} /> : <Bot size={14} />}
            <span>{isAnalyzing ? text.analyzingDocument : text.analyzeDocument}</span>
          </button>
        )}
        {record.resourceKind !== 'web_page' && record.status !== 'error' && (
          <button
            type="button"
            onClick={() => onOpenDocument({ sourceUrl: record.sourceUrl, title: record.title, docNumber: record.docNumber, sourceLabel: record.sourceLabel, variantLabel: record.variantLabel })}
            title={text.openFile}
          >
            <BookOpenCheck size={14} />
          </button>
        )}
        {record.status === 'error' && <span className="catalog-unavailable">{text.fileUnavailable}</span>}
        <a href={safeExternalHref(record.sourceUrl)} target="_blank" rel="noreferrer" title={text.sourcePage}>
          <ArrowUpRight size={14} />
        </a>
      </div>
    </article>
  )
}

function DocumentCatalogRow({
  record,
  language,
  text,
  onAnalyzeDocument,
  onOpenDocument,
  isAnalyzing,
}: {
  record: DocumentAnalysisRecord
  language: Language
  text: (typeof ui)[Language]
  onAnalyzeDocument: (sourceUrl: string) => void
  onOpenDocument: (target: ManagedDocumentTarget) => void
  isAnalyzing: boolean
}) {
  return (
    <article className="catalog-row">
      <div>
        <div className="event-row-kicker">
          <span className={`severity-pill severity-${record.priority}`}>{severityText[language][record.priority]}</span>
          <span>{record.variantLabel}</span>
          <span>{record.category}</span>
          <span>{record.sourceVerification.label}</span>
          <span className={`research-quality-chip quality-${record.researchQuality?.key ?? 'metadata_only'}`} title={record.researchQuality?.detail}>
            {record.researchQuality?.label ?? (language === 'zh' ? '仅元数据辅助' : 'Metadata assistance only')}
          </span>
        </div>
        <h4>{record.docNumber ? `${language === 'zh' ? '文件' : 'Doc'} ${record.docNumber}` : record.title}</h4>
        <p>{record.plainEnglish || record.summary}</p>
        {record.searchMatches?.[0] && (
          <DocumentSearchHit
            match={record.searchMatches[0]}
            record={record}
            text={text}
            onOpenDocument={onOpenDocument}
          />
        )}
        <DocumentSourceAlternatives record={record} language={language} text={text} onOpenDocument={onOpenDocument} />
      </div>
      <div className="catalog-actions">
        {record.resourceKind !== 'web_page' && (
          <button type="button" onClick={() => onAnalyzeDocument(record.sourceUrl)} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="spin" size={13} /> : <Bot size={13} />}
            {isAnalyzing ? text.analyzingDocument : text.analyzeDocument}
          </button>
        )}
        {record.resourceKind !== 'web_page' && record.status !== 'error' && (
          <button
            type="button"
            onClick={() => onOpenDocument({ sourceUrl: record.sourceUrl, title: record.title, docNumber: record.docNumber, sourceLabel: record.sourceLabel, variantLabel: record.variantLabel })}
            title={text.openFile}
          >
            <BookOpenCheck size={13} />
          </button>
        )}
        <a href={safeExternalHref(record.sourceUrl)} target="_blank" rel="noreferrer" title={text.sourcePage}>
          <ArrowUpRight size={13} />
        </a>
      </div>
    </article>
  )
}

function DocumentSearchHit({
  match,
  record,
  text,
  onOpenDocument,
}: {
  match: DocumentSearchMatch
  record: DocumentAnalysisRecord
  text: (typeof ui)[Language]
  onOpenDocument: (target: ManagedDocumentTarget) => void
}) {
  const matchLabel = {
    docket_number: text.searchMatchDocket,
    title: text.searchMatchTitle,
    body_original: text.searchMatchOriginal,
    body_translation: text.searchMatchTranslation,
    legal_analysis: text.searchMatchAnalysis,
    web_page: text.searchMatchWeb,
  }[match.kind] ?? text.searchMatchTitle
  const canOpenPage = record.resourceKind !== 'web_page' && record.status !== 'error' && Number(match.pageNumber) > 0
  const coverageLabel = match.contentIntegrity === 'assistive_glossary'
    ? text.searchMatchAssistive
    : match.coverage === 'complete'
      ? text.searchMatchComplete
      : ['partial', 'unknown'].includes(match.coverage)
        ? text.searchMatchPartial
        : ''
  const content = (
    <>
      <span className="catalog-search-hit-head">
        <span><Search size={12} />{matchLabel}</span>
        {match.matchedPageNumbers && match.matchedPageNumbers.length > 1
          ? <span>{text.searchMatchPages.replace('{pages}', match.matchedPageNumbers.join(', '))}</span>
          : match.pageNumber && <span>{text.searchMatchPage.replace('{page}', String(match.pageNumber))}</span>}
        {coverageLabel && <span>{coverageLabel}</span>}
        {String(match.engine ?? '').toLowerCase().includes('tesseract') && <span>OCR</span>}
      </span>
      <span className="catalog-search-hit-text">
        <HighlightedSearchText value={match.snippet} terms={match.terms} />
      </span>
    </>
  )
  if (!canOpenPage) return <div className={`catalog-search-hit match-${match.kind}`}>{content}</div>
  return (
    <button
      className={`catalog-search-hit match-${match.kind}`}
      type="button"
      title={text.searchOpenPage}
      onClick={() => onOpenDocument({
        sourceUrl: match.sourceUrl || record.sourceUrl,
        title: record.title,
        docNumber: record.docNumber,
        sourceLabel: record.sourceLabel,
        variantLabel: record.variantLabel,
        initialPage: Number(match.pageNumber),
      })}
    >
      {content}
    </button>
  )
}

function HighlightedSearchText({ value, terms }: { value: string; terms: string[] }) {
  const patterns = terms.map((term) => {
    const normalized = term.normalize('NFKC').replace(/[,_，]/g, '')
    if (/^\d{4,}$/.test(normalized)) return normalized.split('').map(escapeRegularExpression).join('[,_，]?')
    return escapeRegularExpression(term.normalize('NFKC'))
  }).filter(Boolean)
  if (!patterns.length) return value
  const expression = new RegExp(`(${patterns.join('|')})`, 'giu')
  const exactMatch = new RegExp(`^(?:${patterns.join('|')})$`, 'iu')
  return value.split(expression).map((part, index) => exactMatch.test(part)
    ? <mark key={`${part}-${index}`}>{part}</mark>
    : <span key={`${part}-${index}`}>{part}</span>)
}

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function DocumentSourceAlternatives({
  record,
  language,
  text,
  onOpenDocument,
}: {
  record: DocumentAnalysisRecord
  language: Language
  text: (typeof ui)[Language]
  onOpenDocument?: (target: ManagedDocumentTarget) => void
}) {
  const alternatives = record.sourceAlternatives ?? []
  if (!alternatives.length) return null
  return (
    <div className="document-source-alternatives">
      <span><GitBranch size={11} />{language === 'zh' ? '可用核验件' : 'Verification alternatives'}</span>
      <div>
        {alternatives.slice(0, 3).map((alternative) => (
          <div key={`${record.id}-${alternative.kind}-${alternative.sourceUrl}`} title={alternative.note}>
            <a href={safeExternalHref(alternative.sourcePage || alternative.sourceUrl)} target="_blank" rel="noreferrer">
              {alternative.label}
              <ArrowUpRight size={10} />
            </a>
            {alternative.localAvailable && onOpenDocument && (
              <button
                type="button"
                onClick={() => onOpenDocument({
                  sourceUrl: alternative.sourceUrl,
                  title: record.title,
                  docNumber: record.docNumber,
                  sourceLabel: alternative.sourceLabel,
                  variantLabel: alternative.label,
                })}
                title={text.openFile}
              >
                <BookOpenCheck size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DocumentAnalysisDialog({
  record,
  loading,
  sourceUrl,
  language,
  text,
  onClose,
  onOpenDocument,
  restoreFocusTo,
}: {
  record: DocumentAnalysisRecord | null
  loading: boolean
  sourceUrl: string
  language: Language
  text: (typeof ui)[Language]
  onClose: () => void
  onOpenDocument: (target: ManagedDocumentTarget) => void
  restoreFocusTo: HTMLElement | null
}) {
  return (
    <ModalShell
      eyebrow={text.analysisDialogEyebrow}
      title={text.analysisDialogTitle}
      closeLabel={text.closeDialog}
      onClose={onClose}
      className="analysis-modal"
      restoreFocusTo={restoreFocusTo}
    >
      {loading && (
        <div className="modal-loading-state">
          <Loader2 className="spin" size={26} />
          <strong>{text.analysisDialogLoading}</strong>
          <span>{text.managedLibraryCopy}</span>
        </div>
      )}
      {!loading && record && (
        <>
          <div className="modal-document-actions">
            {record.resourceKind !== 'web_page' && (
              <button
                type="button"
                onClick={() => onOpenDocument({
                  sourceUrl: record.sourceUrl,
                  title: record.title,
                  docNumber: record.docNumber,
                  sourceLabel: record.sourceLabel,
                  variantLabel: record.variantLabel,
                })}
              >
                <BookOpenCheck size={15} />
                {text.openFile}
              </button>
            )}
            <a href={safeExternalHref(record.sourceUrl)} target="_blank" rel="noreferrer">
              {text.sourcePage}
              <ArrowUpRight size={13} />
            </a>
          </div>
          <DocumentAnalysisRow record={record} language={language} text={text} emphasis />
        </>
      )}
      {!loading && !record && (
        <div className="modal-error-state">
          <AlertTriangle size={24} />
          <strong>{text.documentPipelineError}</strong>
          <a href={safeExternalHref(sourceUrl)} target="_blank" rel="noreferrer">{text.sourcePage}<ArrowUpRight size={13} /></a>
        </div>
      )}
    </ModalShell>
  )
}

function PdfReaderDialog({
  target,
  language,
  text,
  onClose,
  restoreFocusTo,
}: {
  target: ManagedDocumentTarget
  language: Language
  text: (typeof ui)[Language]
  onClose: () => void
  restoreFocusTo: HTMLElement | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(() => Math.max(1, Number(target.initialPage ?? 1)))
  const [scale, setScale] = useState(1.25)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState('')
  const fileUrl = `/api/document-file?sourceUrl=${encodeURIComponent(target.sourceUrl)}`

  useEffect(() => {
    let active = true
    let task: ReturnType<(typeof import('pdfjs-dist'))['getDocument']> | null = null
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 45_000)
    setLoading(true)
    setError('')
    setPageNumber(Math.max(1, Number(target.initialPage ?? 1)))
    setPdfDocument(null)
    const filePromise = apiFetch(fileUrl, {
      cache: 'no-store',
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`PDF API ${response.status}`)
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.toLowerCase().includes('application/pdf')) throw new Error(text.pdfInvalidResponse)
      return new Uint8Array(await response.arrayBuffer())
    })
    void Promise.all([loadPdfJs(), filePromise]).then(([pdfJs, data]) => {
      if (!active) return null
      task = pdfJs.getDocument({ data })
      return task.promise
    }).then((document) => {
      if (!document) return
      if (!active) {
        void document.destroy()
        return
      }
      setPdfDocument(document)
      setPageNumber((value) => Math.min(document.numPages, Math.max(1, value)))
      setLoading(false)
      window.clearTimeout(timeout)
    }).catch((loadError) => {
      if (!active) return
      const message = loadError instanceof Error ? loadError.message : String(loadError)
      setError(loadError instanceof DOMException && loadError.name === 'AbortError' ? text.pdfLoadTimeout : message)
      setLoading(false)
      window.clearTimeout(timeout)
    })
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
      void task?.destroy()
    }
  }, [fileUrl, target.initialPage, text.pdfInvalidResponse, text.pdfLoadTimeout])

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return undefined
    let active = true
    let renderTask: RenderTask | null = null
    setRendering(true)
    void pdfDocument.getPage(pageNumber).then((page) => {
      if (!active || !canvasRef.current) return
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas 2D context is unavailable.')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      renderTask = page.render({ canvas, canvasContext: context, viewport })
      return renderTask.promise
    }).then(() => {
      if (active) setRendering(false)
    }).catch((renderError) => {
      if (!active || renderError?.name === 'RenderingCancelledException') return
      setError(renderError instanceof Error ? renderError.message : String(renderError))
      setRendering(false)
    })
    return () => {
      active = false
      renderTask?.cancel()
    }
  }, [pageNumber, pdfDocument, scale])

  return (
    <ModalShell
      eyebrow={text.pdfReaderEyebrow}
      title={text.pdfReaderTitle}
      closeLabel={text.closeDialog}
      onClose={onClose}
      className="pdf-modal"
      restoreFocusTo={restoreFocusTo}
    >
      <div className="pdf-reader-toolbar">
        <div>
          <strong>{target.docNumber ? `${language === 'zh' ? '文件' : 'Doc'} ${target.docNumber}` : target.title}</strong>
          <span>{target.variantLabel} · {target.sourceLabel}</span>
        </div>
        <div className="pdf-reader-controls">
          <button type="button" onClick={() => setPageNumber((value) => Math.max(1, value - 1))} disabled={!pdfDocument || pageNumber <= 1} title={text.previousPage}>
            <ChevronLeft size={16} />
          </button>
          <span>{text.pdfPage} {pageNumber} / {pdfDocument?.numPages ?? '?'}</span>
          <button type="button" onClick={() => setPageNumber((value) => Math.min(pdfDocument?.numPages ?? value, value + 1))} disabled={!pdfDocument || pageNumber >= pdfDocument.numPages} title={text.nextPage}>
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={() => setScale((value) => Math.max(0.7, Number((value - 0.15).toFixed(2))))} disabled={!pdfDocument || scale <= 0.7} title={text.zoomOut}>
            <Minus size={16} />
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale((value) => Math.min(2.2, Number((value + 0.15).toFixed(2))))} disabled={!pdfDocument || scale >= 2.2} title={text.zoomIn}>
            <Plus size={16} />
          </button>
          <a href={safeExternalHref(target.sourceUrl)} target="_blank" rel="noreferrer" title={text.sourcePage}><ArrowUpRight size={15} /></a>
        </div>
      </div>
      <div className="pdf-reader-stage">
        {(loading || rendering) && !error && (
          <div className={`pdf-reader-progress ${pdfDocument ? 'rendering' : ''}`}>
            <Loader2 className="spin" size={22} />
            <span>{text.pdfLoading}</span>
          </div>
        )}
        {error ? (
          <div className="modal-error-state">
            <AlertTriangle size={24} />
            <strong>{text.pdfLoadError}</strong>
            <span>{error}</span>
            <a href={safeExternalHref(target.sourceUrl)} target="_blank" rel="noreferrer">{text.sourcePage}<ArrowUpRight size={13} /></a>
          </div>
        ) : (
          <canvas ref={canvasRef} aria-label={`${target.title}, ${text.pdfPage} ${pageNumber}`} />
        )}
      </div>
    </ModalShell>
  )
}

function ModalShell({
  eyebrow,
  title,
  closeLabel,
  onClose,
  className,
  restoreFocusTo,
  children,
}: {
  eyebrow: string
  title: string
  closeLabel: string
  onClose: () => void
  className: string
  restoreFocusTo?: HTMLElement | null
  children: ReactNode
}) {
  const onCloseRef = useRef(onClose)
  const dialogRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.getClientRects().length > 0)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      const focusTarget = restoreFocusTo?.isConnected && !('disabled' in restoreFocusTo && restoreFocusTo.disabled)
        ? restoreFocusTo
        : previousFocus?.isConnected ? previousFocus : null
      focusTarget?.focus()
    }
  }, [restoreFocusTo])
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        event.preventDefault()
        onClose()
      }
    }}>
      <section ref={dialogRef} className={`app-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={`${className}-title`}>
        <header className="modal-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={`${className}-title`}>{title}</h2>
          </div>
          <button ref={closeButtonRef} className="modal-close-button" type="button" onClick={onClose} title={closeLabel} aria-label={closeLabel}>
            <X size={19} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}

function AutomationList({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <div className="automation-list">
      <div className="document-subhead">
        {icon}
        <span>{title}</span>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function DocumentLibraryView({
  documents,
  language,
  text,
  sources,
  onOpenDocument,
}: {
  documents: DocumentLibrary
  language: Language
  text: (typeof ui)[Language]
  sources: SourceRecord[]
  onOpenDocument: (target: ManagedDocumentTarget) => void
}) {
  return (
    <section className="document-band" id="documents">
      <div className="document-summary">
        <div>
          <p className="eyebrow">{text.documentLibraryEyebrow}</p>
          <h3>{text.documentLibrary}</h3>
          <p>{text.managedLibraryCopy}</p>
        </div>
        <div className="document-stats">
          <span><strong>{formatNumber(documents.counts.localAvailable ?? documents.counts.downloaded, language)}</strong>{text.localAvailable}</span>
          <span><strong>{formatNumber(documents.counts.collected, language)}</strong>{text.collected}</span>
          <span><strong>{formatNumber(documents.counts.errors, language)}</strong>{text.downloadErrors}</span>
          <span><strong>{formatNumber(documents.credentialRequired.length, language)}</strong>{text.credentialsNeeded}</span>
        </div>
      </div>

      <div className="document-content">
        <div className="document-list">
          <div className="document-subhead">
            <FolderOpen size={15} />
            <span>{text.recentDocuments}</span>
          </div>
          {documents.sampleFiles.slice(0, 6).map((file) => (
            <DocumentFileRow file={file} language={language} text={text} onOpenDocument={onOpenDocument} key={`${file.sourceUrl}-${file.localPath}`} />
          ))}
        </div>

        <div className="document-list secondary">
          <div className="document-subhead">
            <AlertTriangle size={15} />
            <span>{documents.errorFiles.length ? text.downloadErrors : text.blockedSources}</span>
          </div>
          {documents.errorFiles.length ? (
            documents.errorFiles.slice(0, 3).map((file) => (
              <DocumentFileRow file={file} language={language} text={text} onOpenDocument={onOpenDocument} key={`${file.sourceUrl}-${file.error}`} error />
            ))
          ) : (
            <p className="document-empty">{text.noDocumentErrors}</p>
          )}
          <div className="credential-stack">
            {documents.credentialRequired.map((item) => {
              const source = sourceById(sources, item.sourceId)
              return (
                <a href={safeExternalHref(item.source ?? source?.url)} target="_blank" rel="noreferrer" key={item.sourceId} title={item.reason}>
                  <span>{source?.shortName ?? item.sourceId}</span>
                  <ArrowUpRight size={12} />
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function DocumentFileRow({
  file,
  language,
  text,
  onOpenDocument,
  error = false,
}: {
  file: DocumentFile
  language: Language
  text: (typeof ui)[Language]
  onOpenDocument: (target: ManagedDocumentTarget) => void
  error?: boolean
}) {
  const fileName = file.localPath.split('/').pop() || file.title
  return (
    <article className={`document-row ${error ? 'error' : ''}`}>
      <div>
        <strong>{file.docNumber ? `${language === 'zh' ? '文件' : 'Doc'} ${file.docNumber}` : fileName}</strong>
        <span className="document-variant-label">{file.variantLabel}</span>
        <p>{file.title}</p>
        <span>{text.bytes}: {formatBytes(file.bytes, language)} · {file.sourceLabel ?? file.sourceId}</span>
        {file.error && <small>{file.error}</small>}
      </div>
      <div className="document-actions">
        {file.localPath && !error ? (
          <button
            type="button"
            onClick={() => onOpenDocument({ sourceUrl: file.sourceUrl, title: file.title, docNumber: file.docNumber, sourceLabel: file.sourceLabel ?? file.sourceId, variantLabel: file.variantLabel })}
            title={text.openFile}
          >
            {text.openFile}
          </button>
        ) : (
          <span>{text.fileUnavailable}</span>
        )}
        <a href={safeExternalHref(file.sourceUrl)} target="_blank" rel="noreferrer">
          {text.sourcePage}
          <ArrowUpRight size={12} />
        </a>
      </div>
    </article>
  )
}

function Metric({ icon, label, value, detail, tone, language }: { icon: ReactNode; label: string; value: number | null; detail: string; tone: string; language: Language }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{formatOptionalNumber(value, language)}</strong>
        <p>{detail}</p>
      </div>
    </article>
  )
}

function AnalysisView({ analysis, text, language }: { analysis: Analysis; text: (typeof ui)[Language]; language: Language }) {
  return (
    <div className="analysis-view">
      <div className="analysis-mode">
        <Bot size={16} />
        <span>{analysis.mode}</span>
        <strong>{confidenceText[language][analysis.confidence] ?? analysis.confidence}</strong>
      </div>
      <AnalysisGroup title={text.changed} items={analysis.whatChanged} />
      <AnalysisGroup title={text.meaning} items={analysis.whyItMatters} />
      <AnalysisGroup title={text.procedure} items={analysis.proceduralStatus} />
      <AnalysisGroup title={text.risks} items={analysis.riskFlags} warning />
      <AnalysisGroup title={text.next} items={analysis.followUps} />
      <div className="evidence-list">
        {analysis.evidence.map((item) => (
          <a href={safeExternalHref(item.url)} target="_blank" rel="noreferrer" key={`${item.label}-${item.url}`}>
            <CheckCircle2 size={15} />
            <span>{item.label}</span>
            <small>{item.sourceType}</small>
          </a>
        ))}
      </div>
    </div>
  )
}

function AnalysisGroup({ title, items, warning = false }: { title: string; items: string[]; warning?: boolean }) {
  return (
    <div className={`analysis-group ${warning ? 'warning' : ''}`}>
      <h5>{title}</h5>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function FilterIcon() {
  return <SlidersHorizontal size={16} />
}

export default App
