import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-zero-key-'))
const cacheDir = path.join(temporaryRoot, 'cache')
const downloadDir = path.join(temporaryRoot, 'court-files')

for (const key of [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'OPENAI_COMPATIBLE_API_KEY',
  'OPENAI_COMPATIBLE_BASE_URL',
  'COURTLISTENER_TOKEN',
  'PACER_USERNAME',
  'PACER_PASSWORD',
  'PACER_CLIENT_CODE',
]) {
  delete process.env[key]
}

process.env.GUO_INTEL_CACHE_DIR = cacheDir
process.env.GUO_INTEL_DOWNLOAD_DIR = downloadDir

try {
  const { getPublicSettings, initializeSettingsStore } = await import('../server/settings-store.js')
  await initializeSettingsStore()
  const runtime = getPublicSettings()

  assert.equal(runtime.settings.autoRefresh, true, 'Public-source refresh must be enabled on a fresh install.')
  assert.equal(runtime.settings.autoProcessDocuments, true, 'Automatic document processing must be enabled on a fresh install.')
  assert.equal(runtime.settings.includeTranslation, true, 'Translation processing must be enabled on a fresh install.')
  assert.equal(runtime.settings.includeAi, true, 'Legal-read processing must be enabled on a fresh install.')
  assert.equal(runtime.settings.aiProvider, 'local', 'A fresh install must not select a paid cloud AI provider.')
  assert.equal(runtime.settings.translationProvider, 'local', 'A fresh install must default to local assistive translation.')
  assert.equal(runtime.settings.pacerAutoDownload, false, 'PACER paid downloads must remain disabled.')
  assert.equal(runtime.capabilities.pacerAdapter, 'not_implemented_fee_guarded')
  assert.equal(runtime.capabilities.recapAdapter, 'implemented_public_feed_and_search_optional_token_api')
  assert.equal(runtime.capabilities.translation, 'local_assistive_default_ollama_or_configured_cloud_provider_enhanced')
  assert.equal(runtime.secrets.openaiApiKey.configured, false)
  assert.equal(runtime.secrets.anthropicApiKey.configured, false)
  assert.equal(runtime.secrets.geminiApiKey.configured, false)
  assert.equal(runtime.secrets.compatibleApiKey.configured, false)
  assert.equal(runtime.secrets.courtlistenerToken.configured, false)
  assert.equal(runtime.secrets.pacerUsername.configured, false)

  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.notEqual(packageJson.version, '0.0.0', 'Release metadata must use a meaningful version.')
  const bundledTargets = new Set((packageJson.build?.extraResources ?? []).map((entry) => entry.to))
  assert.ok(bundledTargets.has('court-files'), 'The complete release must bundle the audited court-file corpus.')
  assert.ok(bundledTargets.has('court-files/manifest.json'), 'The complete release must bundle the sanitized corpus manifest.')
  assert.ok(bundledTargets.has('seed-cache'), 'The complete release must bundle precomputed translation, legal-read, and search data.')
  assert.ok(bundledTargets.has('seed-cache-manifest.json'), 'The complete release must bundle the research-seed integrity manifest.')
  assert.ok(packageJson.build?.win?.target, 'The release configuration must include a Windows installer target.')

  const electronMain = await readFile(new URL('../electron/main.cjs', import.meta.url), 'utf8')
  const seedInstaller = await readFile(new URL('../electron/seed-installer.cjs', import.meta.url), 'utf8')
  assert.match(electronMain, /app\.getPath\('userData'\), 'court-files'/, 'Packaged downloads must use the writable operating-system user-data directory.')
  assert.match(electronMain, /installBundledSeedCache/, 'Packaged releases must install the complete research seed before startup.')
  assert.match(seedInstaller, /verifySeedCache/, 'Packaged releases must verify the complete research seed before startup.')
  assert.doesNotMatch(`${electronMain}\n${seedInstaller}`, /local processing will rebuild it/, 'Packaged releases must not silently replace the complete baseline with a local rebuild.')

  console.log('Zero-key release defaults passed: verified complete baseline, public incremental refresh, bounded local processing, and no paid provider.')
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}
