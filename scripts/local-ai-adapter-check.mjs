import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-local-ai-'))
const requests = []
let redirectTags = false

const server = createServer(async (request, response) => {
  requests.push(request.url)
  if (request.url === '/api/tags') {
    if (redirectTags) {
      response.statusCode = 302
      response.setHeader('Location', '/api/redirected')
      response.end()
      return
    }
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ models: [{ name: 'fixture-model:latest' }] }))
    return
  }
  if (request.url === '/api/generate') {
    for await (const _chunk of request) {
      // Drain the request body before returning the fixture stream.
    }
    response.setHeader('Content-Type', 'application/x-ndjson')
    response.end([
      JSON.stringify({ response: '{"answer":"' }),
      JSON.stringify({ response: 'OK"}', done: true }),
      '',
    ].join('\n'))
    return
  }
  response.statusCode = 500
  response.end('A redirected local-AI request must never reach this route.')
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})

try {
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const origin = `http://127.0.0.1:${address.port}`
  process.env.GUO_INTEL_CACHE_DIR = temporaryRoot
  process.env.GUO_INTEL_ALLOWED_LOCAL_AI_PORTS = String(address.port)
  process.env.OLLAMA_BASE_URL = origin
  process.env.OLLAMA_MODEL = 'fixture-model:latest'

  const settingsStore = await import('../server/settings-store.js')
  const { ollamaGenerateJson, ollamaModelInstalled } = await import('../server/local-legal-ai.js')
  const { researchChatStatus } = await import('../server/research-chat.js')
  await settingsStore.initializeSettingsStore()
  await settingsStore.updateSettings({
    settings: {
      aiProvider: 'ollama',
      localAiBaseUrl: origin,
      localAiModel: 'fixture-model:latest',
    },
  })

  assert.equal(await ollamaModelInstalled('fixture-model:latest'), true)
  assert.equal((await researchChatStatus('en')).ready, true)
  assert.deepEqual(await ollamaGenerateJson({
    system: 'Return fixture JSON.',
    user: 'Test local generation.',
    schemaName: 'fixture',
  }), { answer: 'OK' })

  redirectTags = true
  await assert.rejects(
    ollamaModelInstalled('fixture-model:latest'),
    /exceeded 0 allowed redirect/u,
  )
  assert.equal(requests.includes('/api/redirected'), false)

  console.log('Local AI adapter passed: loopback model probe, streamed generation, response limits, and redirect rejection.')
} finally {
  await new Promise((resolve) => server.close(resolve))
  await rm(temporaryRoot, { recursive: true, force: true })
}
