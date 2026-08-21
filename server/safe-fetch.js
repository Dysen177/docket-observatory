import networkPolicy from './network-policy.cjs'

const { assertAllowedOutboundUrl } = networkPolicy
const redirectStatuses = new Set([301, 302, 303, 307, 308])
const sensitiveHeaders = new Set(['authorization', 'cookie', 'proxy-authorization'])

export async function safeFetch(url, options = {}, safety = {}) {
  const timeoutMs = boundedInteger(safety.timeoutMs, 1000, 1200000, 30000)
  const maxRedirects = boundedInteger(safety.maxRedirects, 0, 10, 5)
  const policyOptions = {
    includeOpenAI: safety.includeOpenAI !== false,
    includeAi: safety.includeAi !== false,
    allowedOrigins: Array.isArray(safety.allowedOrigins) ? safety.allowedOrigins : [],
  }
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal
  let currentUrl = String(url)
  let currentOptions = { ...options, headers: new Headers(options.headers), signal }

  for (let redirectCount = 0; ; redirectCount += 1) {
    assertAllowedOutboundUrl(currentUrl, policyOptions)
    const response = await fetch(currentUrl, { ...currentOptions, redirect: 'manual' })
    if (!redirectStatuses.has(response.status)) return response

    const location = response.headers.get('location')
    if (!location) return response
    if (redirectCount >= maxRedirects) {
      await response.body?.cancel().catch(() => undefined)
      throw new Error(`Outbound request exceeded ${maxRedirects} allowed redirect(s).`)
    }

    const nextUrl = new URL(location, currentUrl).toString()
    assertAllowedOutboundUrl(nextUrl, policyOptions)
    const previousOrigin = new URL(currentUrl).origin
    const nextOrigin = new URL(nextUrl).origin
    const headers = new Headers(currentOptions.headers)
    if (previousOrigin !== nextOrigin) {
      for (const name of sensitiveHeaders) headers.delete(name)
    }

    const method = String(currentOptions.method ?? 'GET').toUpperCase()
    if (response.status === 303 || ((response.status === 301 || response.status === 302) && method === 'POST')) {
      currentOptions = { ...currentOptions, method: 'GET', body: undefined, headers }
      headers.delete('content-length')
      headers.delete('content-type')
    } else {
      currentOptions = { ...currentOptions, headers }
    }
    await response.body?.cancel().catch(() => undefined)
    currentUrl = nextUrl
  }
}

export async function readTextWithLimit(response, maximumBytes = 5 * 1024 * 1024) {
  const declaredBytes = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredBytes) && declaredBytes > maximumBytes) {
    await response.body?.cancel().catch(() => undefined)
    throw new Error(`Response declares ${declaredBytes} bytes; the allowed limit is ${maximumBytes} bytes.`)
  }
  if (!response.body) return ''
  const chunks = []
  let total = 0
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk)
    total += bytes.length
    if (total > maximumBytes) {
      await response.body.cancel().catch(() => undefined)
      throw new Error(`Response exceeded the allowed ${maximumBytes}-byte limit.`)
    }
    chunks.push(bytes)
  }
  return Buffer.concat(chunks, total).toString('utf8')
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)))
}
