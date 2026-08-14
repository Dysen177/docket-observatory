import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-cloud-ai-'))
const requests = []
let storedSecrets = {}

process.env.GUO_INTEL_CACHE_DIR = temporaryRoot
delete process.env.OPENAI_COMPATIBLE_API_KEY
delete process.env.OPENAI_COMPATIBLE_BASE_URL

globalThis.guoIntelSecretStore = {
  available: true,
  async read() {
    return storedSecrets
  },
  async write(value) {
    storedSecrets = { ...value }
  },
}

const server = createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  requests.push({
    url: request.url,
    authorization: request.headers.authorization,
    body,
  })
  response.setHeader('Content-Type', 'application/json')
  if (requests.length === 1) {
    response.statusCode = 400
    response.end(JSON.stringify({ error: 'max_tokens is not supported; use max_completion_tokens' }))
    return
  }
  response.end(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }))
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})

try {
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const origin = `http://127.0.0.1:${address.port}`
  const settingsStore = await import('../server/settings-store.js')
  const { cloudGenerateText } = await import('../server/cloud-ai.js')
  await settingsStore.initializeSettingsStore()
  await settingsStore.updateSettings({
    settings: {
      aiProvider: 'openai_compatible',
      aiModel: 'fixture-model',
      compatibleAiBaseUrl: `${origin}/v1`,
    },
    secrets: { compatibleApiKey: 'fixture-compatible-token' },
  })

  const first = await cloudGenerateText({
    provider: 'openai_compatible',
    reasoning: false,
    system: 'Connection test.',
    user: 'Return OK.',
    maxOutputTokens: 32,
  })
  assert.equal(first, 'OK')
  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, '/v1/chat/completions')
  assert.equal(requests[0].authorization, 'Bearer fixture-compatible-token')
  assert.equal(requests[0].body.max_tokens, 32)
  assert.equal(requests[1].body.max_completion_tokens, 32)
  assert.equal('max_tokens' in requests[1].body, false)

  await settingsStore.updateSettings({ settings: { compatibleAiBaseUrl: `${origin}/v1/chat/completions` } })
  const second = await cloudGenerateText({
    provider: 'openai_compatible',
    reasoning: false,
    system: 'Connection test.',
    user: 'Return OK.',
    maxOutputTokens: 16,
  })
  assert.equal(second, 'OK')
  assert.equal(requests.at(-1).url, '/v1/chat/completions')
  assert.equal(requests.at(-1).body.max_tokens, 16)

  console.log('Cloud AI adapter passed: exact local origin, compatible endpoint normalization, bearer auth, and token-field fallback.')
} finally {
  await new Promise((resolve) => server.close(resolve))
  await rm(temporaryRoot, { recursive: true, force: true })
}
