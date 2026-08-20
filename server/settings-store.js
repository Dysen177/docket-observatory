import { chmod, mkdir, readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { atomicWriteJson } from './atomic-write.js'

const cacheRoot = path.resolve(process.env.GUO_INTEL_CACHE_DIR ?? path.join(process.cwd(), 'server', 'cache'))
const settingsPath = path.join(cacheRoot, 'app-settings.json')
const diagnosticsPath = path.join(cacheRoot, 'integration-diagnostics.json')
const reasoningEfforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max']
const defaultReasoningEffort = reasoningEfforts.includes(process.env.OPENAI_REASONING_EFFORT) ? process.env.OPENAI_REASONING_EFFORT : 'high'

const defaultSettings = {
  aiProvider: 'local',
  aiModel: process.env.OPENAI_MODEL || 'gpt-5.6-sol',
  translationModel: process.env.TRANSLATION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-sol',
  aiReasoningEffort: defaultReasoningEffort,
  compatibleAiBaseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL || '',
  localAiProvider: 'ollama',
  localAiBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  localAiModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  localAiTimeoutMs: 180000,
  localAiContextChars: 48000,
  researchChatContextChars: 180000,
  translationProvider: 'local',
  autoRefresh: true,
  refreshIntervalMinutes: 30,
  networkRetryMinutes: 5,
  autoProcessDocuments: true,
  automaticProcessingScope: 'priority',
  automaticProcessingLimit: 120,
  includeTranslation: true,
  includeAi: true,
  automationLanguage: 'both',
  sendSnippetsToAi: false,
  redactSensitiveDataBeforeAi: true,
  localOcrEnabled: true,
  ocrPageLimit: 12,
  pdfPageLimit: 80,
  pdfCharLimit: 240000,
  translationChunkChars: 12000,
  downloadConcurrency: 4,
  downloadTimeoutMs: 30000,
  downloadRetries: 3,
  downloadMaxFileMb: 150,
  pdfMaxFileMb: 150,
  fileIntegrityMode: 'changed',
  pacerAutoDownload: false,
  pacerMonthlyBudgetUsd: 0,
}

const secretKeys = ['openaiApiKey', 'anthropicApiKey', 'geminiApiKey', 'compatibleApiKey', 'courtlistenerToken', 'pacerUsername', 'pacerPassword', 'pacerClientCode']
let settings = { ...defaultSettings }
let secrets = {}
let integrationDiagnostics = {}
let secureStorageAvailable = false
let initialized = false
let settingsMutationQueue = Promise.resolve()
let diagnosticsMutationQueue = Promise.resolve()
let secureStorageStatus = 'uninitialized'

function secureStore() {
  return globalThis.guoIntelSecretStore ?? null
}

export async function initializeSettingsStore() {
  if (initialized) return
  await mkdir(cacheRoot, { recursive: true, mode: 0o700 })
  await chmod(cacheRoot, 0o700).catch(() => undefined)
  try {
    const saved = JSON.parse(await readFile(settingsPath, 'utf8'))
    settings = normalizeSettings({ ...defaultSettings, ...saved })
  } catch {
    settings = { ...defaultSettings }
  }
  try {
    integrationDiagnostics = sanitizeDiagnostics(JSON.parse(await readFile(diagnosticsPath, 'utf8')))
  } catch {
    integrationDiagnostics = {}
  }
  await secureExistingCachePermissions(cacheRoot)

  const store = secureStore()
  if (store?.available) {
    try {
      secrets = sanitizeSecrets(await store.read())
      secureStorageAvailable = true
      secureStorageStatus = store.status ?? 'available'
    } catch {
      secrets = {}
      secureStorageAvailable = Boolean(store.available)
      secureStorageStatus = store.status ?? 'unavailable'
    }
  } else {
    secureStorageAvailable = false
    secureStorageStatus = store?.status ?? 'unavailable'
  }
  initialized = true
}

async function secureExistingCachePermissions(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  try {
    await chmod(directory, 0o700)
  } catch {
    // Some filesystems do not implement POSIX modes.
  }
  await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) return
    if (entry.isDirectory()) {
      await secureExistingCachePermissions(target)
      return
    }
    if (!entry.isFile()) return
    const info = await stat(target)
    if ((info.mode & 0o077) !== 0) await chmod(target, 0o600)
  }))
}

export function getRuntimeConfig() {
  return {
    settings: { ...settings },
    secrets: { ...secrets },
    secureStorageAvailable,
    secureStorageStatus,
  }
}

export function getPublicSettings() {
  const secretStatus = Object.fromEntries(secretKeys.map((key) => [key, publicSecretStatus(key)]))
  return {
    settings: { ...settings },
    secrets: secretStatus,
    secureStorageAvailable,
    secureStorageStatus,
    storage: secureStorageAvailable ? `${process.platform === 'win32' ? 'Windows' : 'macOS'} encrypted app storage` : 'environment variables only; secret writes disabled',
    dataDirectory: process.env.GUO_INTEL_DOWNLOAD_DIR ?? path.join(process.cwd(), 'downloads', 'court-files-complete'),
    cacheDirectory: cacheRoot,
    environmentFallbacks: {
      openaiApiKey: Boolean(process.env.OPENAI_API_KEY),
      anthropicApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
      geminiApiKey: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      compatibleApiKey: Boolean(process.env.OPENAI_COMPATIBLE_API_KEY),
      courtlistenerToken: Boolean(process.env.COURTLISTENER_TOKEN),
      pacerUsername: Boolean(process.env.PACER_USERNAME),
      pacerPassword: Boolean(process.env.PACER_PASSWORD),
      pacerClientCode: Boolean(process.env.PACER_CLIENT_CODE),
    },
    integrationDiagnostics: { ...integrationDiagnostics },
    capabilities: {
      pacerAdapter: 'not_implemented_fee_guarded',
      recapAdapter: 'implemented_public_feed_and_search_optional_token_api',
      openaiAnalysis: 'implemented_optional',
      cloudAiAnalysis: 'openai_anthropic_gemini_and_openai_compatible',
      localAiAnalysis: 'implemented_optional_ollama_loopback',
      translation: 'local_assistive_default_ollama_or_configured_cloud_provider_enhanced',
      localPdfExtraction: settings.localOcrEnabled ? 'implemented_pdf_parse_with_local_ocr' : 'implemented_pdf_parse_only',
      officialPublicSources: 'implemented_no_key_required',
    },
  }
}

export async function recordIntegrationDiagnostic(id, value = {}) {
  const operation = diagnosticsMutationQueue.catch(() => undefined).then(() => performRecordIntegrationDiagnostic(id, value))
  diagnosticsMutationQueue = operation.catch(() => undefined)
  return operation
}

async function performRecordIntegrationDiagnostic(id, value = {}) {
  const key = String(id ?? '').replace(/[^a-z0-9_-]/gi, '').slice(0, 64)
  if (!key) return
  integrationDiagnostics = {
    ...integrationDiagnostics,
    [key]: {
      status: String(value.status ?? 'error').slice(0, 40),
      checkedAt: typeof value.checkedAt === 'string' ? value.checkedAt : new Date().toISOString(),
      latencyMs: Number.isFinite(Number(value.latencyMs)) ? Number(value.latencyMs) : null,
      itemCount: Number.isFinite(Number(value.itemCount)) ? Number(value.itemCount) : 0,
      message: String(value.message ?? '').slice(0, 400),
    },
  }
  await atomicWriteJson(diagnosticsPath, integrationDiagnostics)
}

export async function updateSettings(input = {}) {
  const operation = settingsMutationQueue.catch(() => undefined).then(() => performUpdateSettings(input))
  settingsMutationQueue = operation.catch(() => undefined)
  return operation
}

async function performUpdateSettings(input = {}) {
  const nextSettings = normalizeSettings({ ...settings, ...(input.settings ?? {}) })
  const nextSecrets = { ...secrets }
  for (const key of secretKeys) {
    const value = input.secrets?.[key]
    if (typeof value === 'string' && value.trim()) nextSecrets[key] = normalizeSecret(key, value)
    if (value === null) delete nextSecrets[key]
  }

  const store = secureStore()
  const secretsChanged = secretKeys.some((key) => nextSecrets[key] !== secrets[key])
  if (secretsChanged) {
    if (!store?.available) {
      const error = new Error('Secure operating-system storage is unavailable. Use environment variables or run the Electron desktop build.')
      error.statusCode = 503
      throw error
    }
    try {
      await store.write(nextSecrets)
      secureStorageAvailable = true
      secureStorageStatus = store.status ?? 'available'
    } catch (error) {
      secureStorageAvailable = Boolean(store.available)
      secureStorageStatus = store.status ?? 'denied_or_unavailable'
      if (!error.statusCode) error.statusCode = 503
      throw error
    }
  }

  settings = nextSettings
  secrets = sanitizeSecrets(nextSecrets)
  await atomicWriteJson(settingsPath, settings)
  return getPublicSettings()
}

export function resolvedSecret(name) {
  return secrets[name] || environmentSecret(name)
}

export function runtimeSetting(name) {
  return settings[name] ?? defaultSettings[name]
}

export function openAiReasoningOptions(modelValue = runtimeSetting('aiModel')) {
  const model = String(modelValue ?? '')
  if (!/^gpt-5(?:\.|$)/i.test(model)) return {}
  const configuredEffort = runtimeSetting('aiReasoningEffort')
  const effort = /^gpt-5\.6(?:-|$)/i.test(model) || ['medium', 'high'].includes(configuredEffort)
    ? configuredEffort
    : 'high'
  return { reasoning: { effort } }
}

function envNameForSecret(name) {
  return {
    openaiApiKey: 'OPENAI_API_KEY',
    anthropicApiKey: 'ANTHROPIC_API_KEY',
    geminiApiKey: 'GEMINI_API_KEY',
    compatibleApiKey: 'OPENAI_COMPATIBLE_API_KEY',
    courtlistenerToken: 'COURTLISTENER_TOKEN',
    pacerUsername: 'PACER_USERNAME',
    pacerPassword: 'PACER_PASSWORD',
    pacerClientCode: 'PACER_CLIENT_CODE',
  }[name]
}

function publicSecretStatus(key) {
  const value = secrets[key] || environmentSecret(key)
  return {
    configured: Boolean(value),
    masked: value ? `********${value.slice(-4)}` : '',
    source: secrets[key] ? 'secure_storage' : value ? 'environment' : 'none',
  }
}

function sanitizeSecrets(value) {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(secretKeys.filter((key) => typeof value[key] === 'string' && value[key]).map((key) => [key, value[key]]))
}

function normalizeSecret(key, value) {
  const maximumLength = key === 'courtlistenerToken' ? 1024 : ['openaiApiKey', 'anthropicApiKey', 'geminiApiKey', 'compatibleApiKey'].includes(key) ? 2048 : 256
  const normalized = value.trim()
  if (normalized.length > maximumLength || normalized.includes('\0') || normalized.includes('\r') || normalized.includes('\n')) {
    const error = new Error(`Invalid ${key} credential value.`)
    error.statusCode = 400
    throw error
  }
  return normalized
}

function sanitizeDiagnostics(value) {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 32)
      .map(([key, diagnostic]) => [key, {
        status: String(diagnostic?.status ?? 'error').slice(0, 40),
        checkedAt: typeof diagnostic?.checkedAt === 'string' ? diagnostic.checkedAt : null,
        latencyMs: Number.isFinite(Number(diagnostic?.latencyMs)) ? Number(diagnostic.latencyMs) : null,
        itemCount: Number.isFinite(Number(diagnostic?.itemCount)) ? Number(diagnostic.itemCount) : 0,
        message: String(diagnostic?.message ?? '').slice(0, 400),
      }]),
  )
}

function normalizeSettings(value) {
  const result = { ...defaultSettings }
  if (['openai', 'anthropic', 'gemini', 'openai_compatible', 'ollama', 'local'].includes(value.aiProvider)) result.aiProvider = value.aiProvider
  if (typeof value.aiModel === 'string' && value.aiModel.trim()) {
    const model = value.aiModel.trim().replace(/[\r\n\0]/g, '').slice(0, 160)
    result.aiModel = model === 'gpt-5.6' ? 'gpt-5.6-sol' : model
  }
  if (typeof value.translationModel === 'string' && value.translationModel.trim()) {
    result.translationModel = value.translationModel.trim().replace(/[\r\n\0]/g, '').slice(0, 160)
  }
  if (reasoningEfforts.includes(value.aiReasoningEffort)) result.aiReasoningEffort = value.aiReasoningEffort
  if (['openai', 'anthropic', 'gemini', 'openai_compatible', 'ollama', 'local'].includes(value.translationProvider)) result.translationProvider = value.translationProvider
  if (typeof value.compatibleAiBaseUrl === 'string' && value.compatibleAiBaseUrl.trim()) {
    result.compatibleAiBaseUrl = normalizeCompatibleAiBaseUrl(value.compatibleAiBaseUrl)
  }
  if (['ollama', 'none'].includes(value.localAiProvider)) result.localAiProvider = value.localAiProvider
  if (typeof value.localAiBaseUrl === 'string' && value.localAiBaseUrl.trim()) {
    result.localAiBaseUrl = normalizeLocalAiBaseUrl(value.localAiBaseUrl)
  }
  if (typeof value.localAiModel === 'string' && value.localAiModel.trim()) {
    result.localAiModel = value.localAiModel.trim().replace(/[\r\n\0]/g, '').slice(0, 120)
  }
  result.localAiTimeoutMs = boundedInteger(value.localAiTimeoutMs, 10000, 600000, defaultSettings.localAiTimeoutMs)
  result.localAiContextChars = boundedInteger(value.localAiContextChars, 20000, 500000, defaultSettings.localAiContextChars)
  result.researchChatContextChars = boundedInteger(value.researchChatContextChars, 20000, 1500000, defaultSettings.researchChatContextChars)
  for (const key of ['autoRefresh', 'autoProcessDocuments', 'includeTranslation', 'includeAi', 'sendSnippetsToAi', 'redactSensitiveDataBeforeAi', 'localOcrEnabled']) {
    if (typeof value[key] === 'boolean') result[key] = value[key]
  }
  if (['zh', 'en', 'both'].includes(value.automationLanguage)) result.automationLanguage = value.automationLanguage
  if (['priority', 'all'].includes(value.automaticProcessingScope)) result.automaticProcessingScope = value.automaticProcessingScope
  result.automaticProcessingLimit = boundedInteger(value.automaticProcessingLimit, 1, 500, defaultSettings.automaticProcessingLimit)
  if (['changed', 'full', 'remote'].includes(value.fileIntegrityMode)) result.fileIntegrityMode = value.fileIntegrityMode
  result.refreshIntervalMinutes = boundedInteger(value.refreshIntervalMinutes, 5, 1440, defaultSettings.refreshIntervalMinutes)
  result.networkRetryMinutes = boundedInteger(value.networkRetryMinutes, 1, 60, defaultSettings.networkRetryMinutes)
  result.pdfPageLimit = boundedInteger(value.pdfPageLimit, 1, 300, defaultSettings.pdfPageLimit)
  result.ocrPageLimit = boundedInteger(value.ocrPageLimit, 1, 80, defaultSettings.ocrPageLimit)
  result.pdfCharLimit = boundedInteger(value.pdfCharLimit, 1000, 1000000, defaultSettings.pdfCharLimit)
  result.translationChunkChars = boundedInteger(value.translationChunkChars, 2000, 30000, defaultSettings.translationChunkChars)
  result.downloadConcurrency = boundedInteger(value.downloadConcurrency, 1, 8, defaultSettings.downloadConcurrency)
  result.downloadTimeoutMs = boundedInteger(value.downloadTimeoutMs, 5000, 120000, defaultSettings.downloadTimeoutMs)
  result.downloadRetries = boundedInteger(value.downloadRetries, 0, 6, defaultSettings.downloadRetries)
  result.downloadMaxFileMb = boundedInteger(value.downloadMaxFileMb, 10, 500, defaultSettings.downloadMaxFileMb)
  result.pdfMaxFileMb = boundedInteger(value.pdfMaxFileMb, 10, 500, defaultSettings.pdfMaxFileMb)
  result.pacerMonthlyBudgetUsd = boundedNumber(value.pacerMonthlyBudgetUsd, 0, 500, defaultSettings.pacerMonthlyBudgetUsd)
  result.pacerAutoDownload = false
  return result
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)))
}

function boundedNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

function normalizeLocalAiBaseUrl(value) {
  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol)) return defaultSettings.localAiBaseUrl
    if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return defaultSettings.localAiBaseUrl
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    return url.origin
  } catch {
    return defaultSettings.localAiBaseUrl
  }
}

function normalizeCompatibleAiBaseUrl(value) {
  try {
    const url = new URL(value.trim())
    const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return defaultSettings.compatibleAiBaseUrl
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    url.pathname = url.pathname.replace(/\/+$/u, '') || '/'
    return url.toString().replace(/\/$/u, '')
  } catch {
    return defaultSettings.compatibleAiBaseUrl
  }
}

function environmentSecret(name) {
  if (name === 'geminiApiKey') return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
  return process.env[envNameForSecret(name)] || ''
}
