import { readTextWithLimit, safeFetch } from './safe-fetch.js'
import { responseOutputText } from './openai-response.js'
import { openAiReasoningOptions, resolvedSecret, runtimeSetting } from './settings-store.js'

export const cloudProviderIds = ['openai', 'anthropic', 'gemini', 'openai_compatible']

const providerDefinitions = {
  openai: {
    label: 'OpenAI',
    secretKey: 'openaiApiKey',
  },
  anthropic: {
    label: 'Anthropic Claude',
    secretKey: 'anthropicApiKey',
  },
  gemini: {
    label: 'Google Gemini',
    secretKey: 'geminiApiKey',
  },
  openai_compatible: {
    label: 'OpenAI-compatible provider',
    secretKey: 'compatibleApiKey',
  },
}

export function isCloudAiProvider(provider) {
  return cloudProviderIds.includes(provider)
}

export function cloudProviderLabel(provider) {
  return providerDefinitions[provider]?.label ?? String(provider || 'Cloud AI')
}

export function cloudProviderConfigured(provider) {
  const secretKey = providerDefinitions[provider]?.secretKey
  return Boolean(secretKey && resolvedSecret(secretKey))
}

export function cloudModelForPurpose(purpose = 'analysis') {
  return String(runtimeSetting(purpose === 'translation' ? 'translationModel' : 'aiModel') ?? '').trim()
}

export function cloudBodyTransmissionAllowed(provider) {
  return isCloudAiProvider(provider) && runtimeSetting('sendSnippetsToAi') !== false
}

export async function cloudGenerateText({
  provider,
  purpose = 'analysis',
  model = cloudModelForPurpose(purpose),
  system,
  user,
  schema = null,
  schemaName = 'structured_response',
  maxOutputTokens = 4000,
  timeoutMs = 180000,
  reasoning = purpose === 'analysis',
}) {
  if (!isCloudAiProvider(provider)) throw providerError(provider, 'is not a supported cloud protocol.')
  const definition = providerDefinitions[provider]
  const apiKey = resolvedSecret(definition.secretKey)
  if (!apiKey) throw providerError(provider, 'is not configured in Settings.', 400)
  if (!model) throw providerError(provider, 'requires a model ID in Settings.', 400)

  if (provider === 'openai') {
    return openAiGenerate({ apiKey, model, system, user, schema, schemaName, maxOutputTokens, timeoutMs, reasoning })
  }
  if (provider === 'anthropic') {
    return anthropicGenerate({ apiKey, model, system, user, schema, maxOutputTokens, timeoutMs })
  }
  if (provider === 'gemini') {
    return geminiGenerate({ apiKey, model, system, user, schema, maxOutputTokens, timeoutMs })
  }
  return compatibleGenerate({ apiKey, model, system, user, schema, maxOutputTokens, timeoutMs })
}

export function parseStructuredModelOutput(value, context = 'AI response') {
  const text = String(value ?? '').trim()
  if (!text) throw new Error(`${context} was empty.`)
  const unfenced = text
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '')
    .trim()
  try {
    return JSON.parse(unfenced)
  } catch {
    const start = unfenced.indexOf('{')
    const end = unfenced.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(unfenced.slice(start, end + 1))
    throw new Error(`${context} did not contain valid JSON.`)
  }
}

async function openAiGenerate({ apiKey, model, system, user, schema, schemaName, maxOutputTokens, timeoutMs, reasoning }) {
  const response = await safeFetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      ...(reasoning ? openAiReasoningOptions(model) : {}),
      store: false,
      max_output_tokens: maxOutputTokens,
      input: [
        { role: 'system', content: systemWithSchema(system, schema) },
        { role: 'user', content: user },
      ],
      ...(schema ? {
        text: {
          format: {
            type: 'json_schema',
            name: schemaName,
            strict: true,
            schema,
          },
        },
      } : {}),
    }),
  }, { timeoutMs })
  const body = await readTextWithLimit(response, 4 * 1024 * 1024)
  if (!response.ok) throw httpError('OpenAI', response.status, body)
  return responseOutputText(JSON.parse(body), 'OpenAI response')
}

async function anthropicGenerate({ apiKey, model, system, user, schema, maxOutputTokens, timeoutMs }) {
  const response = await safeFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      system: systemWithSchema(system, schema),
      messages: [{ role: 'user', content: user }],
    }),
  }, { timeoutMs })
  const body = await readTextWithLimit(response, 4 * 1024 * 1024)
  if (!response.ok) throw httpError('Anthropic', response.status, body)
  const payload = JSON.parse(body)
  const output = Array.isArray(payload.content)
    ? payload.content.filter((item) => item?.type === 'text' && typeof item.text === 'string').map((item) => item.text).join('\n')
    : ''
  if (!output.trim()) throw new Error('Anthropic response did not include text content.')
  return output
}

async function geminiGenerate({ apiKey, model, system, user, schema, maxOutputTokens, timeoutMs }) {
  const normalizedModel = model.replace(/^models\//u, '')
  const response = await safeFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(normalizedModel)}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemWithSchema(system, schema) }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens,
        ...(schema ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  }, { timeoutMs })
  const body = await readTextWithLimit(response, 4 * 1024 * 1024)
  if (!response.ok) throw httpError('Gemini', response.status, body)
  const payload = JSON.parse(body)
  const output = payload.candidates?.[0]?.content?.parts
    ?.filter((part) => typeof part?.text === 'string')
    .map((part) => part.text)
    .join('\n') ?? ''
  if (!output.trim()) {
    const reason = payload.promptFeedback?.blockReason || payload.candidates?.[0]?.finishReason || 'no text content'
    throw new Error(`Gemini response did not include text content: ${reason}.`)
  }
  return output
}

async function compatibleGenerate({ apiKey, model, system, user, schema, maxOutputTokens, timeoutMs }) {
  const endpoint = compatibleEndpoint(runtimeSetting('compatibleAiBaseUrl'))
  const request = async (tokenField) => {
    const response = await safeFetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemWithSchema(system, schema) },
          { role: 'user', content: user },
        ],
        [tokenField]: maxOutputTokens,
      }),
    }, { timeoutMs, allowedOrigins: [new URL(endpoint).origin] })
    return { response, body: await readTextWithLimit(response, 4 * 1024 * 1024) }
  }
  let { response, body } = await request('max_tokens')
  if (!response.ok && response.status === 400 && /max_tokens[\s\S]{0,160}(?:unsupported|not supported|use max_completion_tokens)|max_completion_tokens[\s\S]{0,160}(?:required|must)/iu.test(body)) {
    const retry = await request('max_completion_tokens')
    response = retry.response
    body = retry.body
  }
  if (!response.ok) throw httpError('OpenAI-compatible provider', response.status, body)
  const payload = JSON.parse(body)
  const content = payload.choices?.[0]?.message?.content
  const output = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.filter((item) => typeof item?.text === 'string').map((item) => item.text).join('\n')
      : ''
  if (!output.trim()) throw new Error('OpenAI-compatible response did not include message content.')
  return output
}

function compatibleEndpoint(value) {
  if (!String(value || '').trim()) throw providerError('openai_compatible', 'requires a Base URL in Settings.', 400)
  const url = new URL(String(value))
  const path = url.pathname.replace(/\/+$/u, '')
  url.pathname = path.endsWith('/chat/completions') ? path : `${path}/chat/completions`.replace(/^\/+/u, '/')
  url.search = ''
  url.hash = ''
  return url.toString()
}

function systemWithSchema(system, schema) {
  if (!schema) return system
  return `${system}\nReturn only one JSON object matching this JSON Schema. Do not wrap it in Markdown fences:\n${JSON.stringify(schema)}`
}

function providerError(provider, message, statusCode = 502) {
  const error = new Error(`${cloudProviderLabel(provider)} ${message}`)
  error.statusCode = statusCode
  return error
}

function httpError(provider, status, body) {
  const error = new Error(`${provider} HTTP ${status}: ${String(body).slice(0, 240)}`)
  error.statusCode = status === 401 || status === 403 ? 401 : status === 429 ? 429 : 502
  return error
}
