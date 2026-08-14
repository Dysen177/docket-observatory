import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const verifyRoot = process.argv[2] === '--verify' ? process.argv[3] : ''
const temporaryRoot = verifyRoot || await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-settings-'))
const vaultPath = path.join(temporaryRoot, 'fixture-secret-vault.json')

process.env.GUO_INTEL_CACHE_DIR = temporaryRoot
delete process.env.OPENAI_API_KEY
delete process.env.ANTHROPIC_API_KEY
delete process.env.GEMINI_API_KEY
delete process.env.GOOGLE_API_KEY
delete process.env.OPENAI_COMPATIBLE_API_KEY
delete process.env.OPENAI_COMPATIBLE_BASE_URL
delete process.env.COURTLISTENER_TOKEN
delete process.env.PACER_USERNAME
delete process.env.PACER_PASSWORD
delete process.env.PACER_CLIENT_CODE

globalThis.guoIntelSecretStore = {
  available: true,
  async read() {
    return JSON.parse(await readFile(vaultPath, 'utf8')).secrets
  },
  async write(secrets) {
    await writeFile(vaultPath, `${JSON.stringify({ secrets })}\n`, { mode: 0o600 })
  },
}

const store = await import(`../server/settings-store.js?settings-check=${verifyRoot ? 'verify' : Date.now()}`)
await store.initializeSettingsStore()

const expectedSettings = {
  aiProvider: 'ollama',
  aiModel: 'fixture-legal-model',
  translationModel: 'fixture-translation-model',
  aiReasoningEffort: 'max',
  compatibleAiBaseUrl: 'https://gateway.example.com/v1',
  localAiProvider: 'ollama',
  localAiBaseUrl: 'http://localhost:11434',
  localAiModel: 'fixture-local-model:latest',
  localAiTimeoutMs: 123000,
  localAiContextChars: 110000,
  translationProvider: 'ollama',
  autoRefresh: false,
  refreshIntervalMinutes: 42,
  networkRetryMinutes: 7,
  autoProcessDocuments: false,
  automaticProcessingScope: 'all',
  automaticProcessingLimit: 321,
  includeTranslation: false,
  includeAi: false,
  automationLanguage: 'en',
  sendSnippetsToAi: true,
  redactSensitiveDataBeforeAi: false,
  localOcrEnabled: false,
  ocrPageLimit: 23,
  pdfPageLimit: 111,
  pdfCharLimit: 654321,
  translationChunkChars: 12345,
  downloadConcurrency: 7,
  downloadTimeoutMs: 54321,
  downloadRetries: 5,
  downloadMaxFileMb: 222,
  pdfMaxFileMb: 223,
  fileIntegrityMode: 'full',
  pacerAutoDownload: false,
  pacerMonthlyBudgetUsd: 123,
}

if (verifyRoot) {
  const publicSettings = store.getPublicSettings()
  assert.deepEqual(publicSettings.settings, expectedSettings)
  assert.equal(store.resolvedSecret('openaiApiKey'), 'sk-fixture-openai')
  assert.equal(store.resolvedSecret('anthropicApiKey'), 'fixture-anthropic-key')
  assert.equal(store.resolvedSecret('geminiApiKey'), 'fixture-gemini-key')
  assert.equal(store.resolvedSecret('compatibleApiKey'), 'fixture-compatible-key')
  assert.equal(store.resolvedSecret('courtlistenerToken'), 'fixture-courtlistener-token')
  assert.equal(store.resolvedSecret('pacerUsername'), 'fixture-pacer-user')
  assert.equal(store.resolvedSecret('pacerPassword'), 'fixture-pacer-password')
  assert.equal(store.resolvedSecret('pacerClientCode'), '')
  assert.equal(publicSettings.secrets.openaiApiKey.masked, '********enai')
  assert.equal(publicSettings.secrets.pacerClientCode.configured, false)
  console.log('Settings restart verification passed.')
  process.exit(0)
}

try {
  await store.updateSettings({
    settings: {
      ...expectedSettings,
      localAiBaseUrl: 'http://localhost:11434/api/generate?ignored=yes',
      pacerAutoDownload: true,
    },
    secrets: {
      openaiApiKey: 'sk-fixture-openai',
      anthropicApiKey: 'fixture-anthropic-key',
      geminiApiKey: 'fixture-gemini-key',
      compatibleApiKey: 'fixture-compatible-key',
      courtlistenerToken: 'fixture-courtlistener-token',
      pacerUsername: 'fixture-pacer-user',
      pacerPassword: 'fixture-pacer-password',
      pacerClientCode: 'fixture-client-code',
    },
  })

  let publicSettings = store.getPublicSettings()
  assert.deepEqual(publicSettings.settings, expectedSettings)
  assert.equal(publicSettings.secureStorageAvailable, true)
  assert.equal(publicSettings.secrets.openaiApiKey.configured, true)
  assert.equal(publicSettings.secrets.openaiApiKey.masked, '********enai')
  assert.equal(publicSettings.secrets.openaiApiKey.source, 'secure_storage')
  assert.equal(publicSettings.secrets.anthropicApiKey.configured, true)
  assert.equal(publicSettings.secrets.geminiApiKey.configured, true)
  assert.equal(publicSettings.secrets.compatibleApiKey.configured, true)

  const ordinarySettingsFile = await readFile(path.join(temporaryRoot, 'app-settings.json'), 'utf8')
  for (const secret of ['sk-fixture-openai', 'fixture-anthropic-key', 'fixture-gemini-key', 'fixture-compatible-key', 'fixture-courtlistener-token', 'fixture-pacer-user', 'fixture-pacer-password', 'fixture-client-code']) {
    assert.equal(ordinarySettingsFile.includes(secret), false, 'Ordinary settings must not contain secret values.')
  }

  await store.updateSettings({
    secrets: {
      openaiApiKey: 'fixture-openai-replaced',
      anthropicApiKey: 'fixture-anthropic-replaced',
      geminiApiKey: 'fixture-gemini-replaced',
      compatibleApiKey: 'fixture-compatible-replaced',
    },
  })
  assert.equal(store.resolvedSecret('openaiApiKey'), 'fixture-openai-replaced')
  assert.equal(store.resolvedSecret('anthropicApiKey'), 'fixture-anthropic-replaced')
  assert.equal(store.resolvedSecret('geminiApiKey'), 'fixture-gemini-replaced')
  assert.equal(store.resolvedSecret('compatibleApiKey'), 'fixture-compatible-replaced')
  let persistedVault = JSON.parse(await readFile(vaultPath, 'utf8')).secrets
  assert.equal(persistedVault.openaiApiKey, 'fixture-openai-replaced')
  assert.equal(persistedVault.anthropicApiKey, 'fixture-anthropic-replaced')
  assert.equal(persistedVault.geminiApiKey, 'fixture-gemini-replaced')
  assert.equal(persistedVault.compatibleApiKey, 'fixture-compatible-replaced')
  assert.equal(JSON.stringify(persistedVault).includes('sk-fixture-openai"'), false, 'Replacing a key must remove the previous value from the credential vault.')

  await store.updateSettings({
    secrets: {
      openaiApiKey: null,
      anthropicApiKey: null,
      geminiApiKey: null,
      compatibleApiKey: null,
      courtlistenerToken: null,
      pacerUsername: null,
      pacerPassword: null,
      pacerClientCode: null,
    },
  })
  publicSettings = store.getPublicSettings()
  for (const key of ['openaiApiKey', 'anthropicApiKey', 'geminiApiKey', 'compatibleApiKey', 'courtlistenerToken', 'pacerUsername', 'pacerPassword', 'pacerClientCode']) {
    assert.equal(publicSettings.secrets[key].configured, false)
    assert.equal(store.resolvedSecret(key), '')
  }
  persistedVault = JSON.parse(await readFile(vaultPath, 'utf8')).secrets
  assert.deepEqual(persistedVault, {}, 'Deleting all local credentials must leave no credential values in the vault.')

  process.env.COURTLISTENER_TOKEN = 'fixture-environment-token'
  publicSettings = store.getPublicSettings()
  assert.equal(publicSettings.secrets.courtlistenerToken.source, 'environment')
  await store.updateSettings({ secrets: { courtlistenerToken: null } })
  assert.equal(store.resolvedSecret('courtlistenerToken'), 'fixture-environment-token', 'The app must not claim to delete a credential owned by the launch environment.')
  delete process.env.COURTLISTENER_TOKEN

  await store.updateSettings({
    secrets: {
      openaiApiKey: 'sk-fixture-openai',
      anthropicApiKey: 'fixture-anthropic-key',
      geminiApiKey: 'fixture-gemini-key',
      compatibleApiKey: 'fixture-compatible-key',
      courtlistenerToken: 'fixture-courtlistener-token',
      pacerUsername: 'fixture-pacer-user',
      pacerPassword: 'fixture-pacer-password',
      pacerClientCode: 'fixture-client-code',
    },
  })

  await store.updateSettings({ secrets: { pacerClientCode: null } })
  publicSettings = store.getPublicSettings()
  assert.equal(publicSettings.secrets.pacerClientCode.configured, false)
  assert.equal(store.resolvedSecret('pacerClientCode'), '')

  await store.updateSettings({ settings: { localAiBaseUrl: 'https://remote-ai.example.com' } })
  assert.equal(store.getPublicSettings().settings.localAiBaseUrl, 'http://127.0.0.1:11434')
  await store.updateSettings({ settings: { localAiBaseUrl: expectedSettings.localAiBaseUrl } })

  await store.updateSettings({ settings: { compatibleAiBaseUrl: 'http://remote-ai.example.com/v1' } })
  assert.equal(store.getPublicSettings().settings.compatibleAiBaseUrl, '', 'An insecure remote compatible endpoint must fail closed instead of falling back to another provider.')
  await store.updateSettings({ settings: { compatibleAiBaseUrl: 'http://127.0.0.1:1234/v1/' } })
  assert.equal(store.getPublicSettings().settings.compatibleAiBaseUrl, 'http://127.0.0.1:1234/v1')
  await store.updateSettings({ settings: { compatibleAiBaseUrl: expectedSettings.compatibleAiBaseUrl } })

  const restarted = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--verify', temporaryRoot], {
    encoding: 'utf8',
    env: { GUO_INTEL_CACHE_DIR: temporaryRoot },
  })
  assert.equal(restarted.status, 0, restarted.stderr || restarted.stdout)

  console.log('Settings persistence passed: all controls, eight encrypted credentials, restart recovery, replacement/removal, loopback Ollama, and fail-closed compatible URL validation.')
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}
