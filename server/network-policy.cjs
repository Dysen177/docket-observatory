const allowedFetchHosts = [
  {
    host: 'nfsc.press',
    purpose: 'Public mirror for court-file PDFs already linked from the source page.',
    dataClass: 'public court-file mirror metadata and PDFs',
  },
  {
    host: 'www.justice.gov',
    purpose: 'Official DOJ victim information and press-release pages.',
    dataClass: 'public agency web pages',
  },
  {
    host: 'www.sec.gov',
    purpose: 'Official SEC press releases and enforcement materials.',
    dataClass: 'public agency web pages and PDFs',
  },
  {
    host: 'www.gtvmediagroupfairfund.com',
    purpose: 'Claims administrator status for the GTV Media Group Fair Fund.',
    dataClass: 'public claims-administration web pages and PDFs',
  },
  {
    host: 'himalayarestoration.org',
    purpose: 'Public entry point for the Himalaya Restoration project site.',
    dataClass: 'public project-site redirects and legal-update metadata',
  },
  {
    host: 'himalayarestoration.com',
    purpose: 'Historical Himalaya Restoration project pages and public court-file links.',
    dataClass: 'public project-site legal updates and previously published court-file URLs',
  },
  {
    host: 'bragey5.dreamhosters.com',
    purpose: 'Current public Himalaya Restoration WordPress site and REST metadata.',
    dataClass: 'public project-site pages, posts, and attachment metadata',
  },
  {
    host: 'web.archive.org',
    purpose: 'Public Internet Archive snapshots of Himalaya Restoration pages and linked court files.',
    dataClass: 'historical public web pages and court-file copies',
  },
  {
    host: 'dm.epiq11.com',
    purpose: 'Public Epiq bankruptcy docket shell and future docket endpoint mapping.',
    dataClass: 'public claims-agent docket metadata',
  },
  {
    host: 'www.courtlistener.com',
    purpose: 'Public CourtListener Atom feeds and optional authenticated RECAP docket metadata.',
    dataClass: 'public Atom feed and RECAP docket metadata',
  },
  {
    host: 'storage.courtlistener.com',
    purpose: 'Public PDFs already available in the CourtListener/RECAP archive.',
    dataClass: 'public/RECAP court PDFs',
  },
  {
    host: 'www.federalregister.gov',
    purpose: 'Federal Register policy search API for legal and regulatory context.',
    dataClass: 'public policy metadata',
  },
  {
    host: 'pacer.uscourts.gov',
    purpose: 'PACER account entry point; full adapter requires explicit fee-aware implementation.',
    dataClass: 'credential-gated court docket metadata',
  },
  {
    host: 'api.openai.com',
    purpose: 'Optional structured AI analysis when OPENAI_API_KEY is set.',
    dataClass: 'public metadata and extracted document text only when explicitly enabled',
    aiProvider: true,
  },
  {
    host: 'api.anthropic.com',
    purpose: 'Optional Anthropic Claude analysis and translation when configured by the user.',
    dataClass: 'public metadata and extracted document text only when explicitly enabled',
    aiProvider: true,
  },
  {
    host: 'generativelanguage.googleapis.com',
    purpose: 'Optional Google Gemini analysis and translation when configured by the user.',
    dataClass: 'public metadata and extracted document text only when explicitly enabled',
    aiProvider: true,
  },
  {
    host: 'platform.openai.com',
    purpose: 'User-opened official page for creating and managing OpenAI API keys.',
    dataClass: 'no automatic transfer; external browser navigation only',
  },
  {
    host: 'console.anthropic.com',
    purpose: 'User-opened official page for creating and managing Anthropic API keys.',
    dataClass: 'no automatic transfer; external browser navigation only',
  },
  {
    host: 'aistudio.google.com',
    purpose: 'User-opened official page for creating and managing Google Gemini API keys.',
    dataClass: 'no automatic transfer; external browser navigation only',
  },
  {
    host: 'ollama.com',
    purpose: 'User-opened official Ollama download page for optional local generative AI.',
    dataClass: 'no automatic transfer; external browser navigation only',
  },
]

const externalOnlyHosts = [
  {
    host: 'youtube.com',
    purpose: 'User-opened historical livestream reposts; the application does not fetch or embed YouTube media.',
  },
  {
    host: 'www.youtube.com',
    purpose: 'User-opened historical livestream reposts; the application does not fetch or embed YouTube media.',
  },
  {
    host: 'youtu.be',
    purpose: 'User-opened YouTube short links for historical livestream reposts.',
  },
  {
    host: 'gettr.com',
    purpose: 'User-opened GETTR public statements and historical livestream posts.',
  },
  {
    host: 'www.gettr.com',
    purpose: 'User-opened GETTR public statements and historical livestream posts.',
  },
  {
    host: 'x.com',
    purpose: 'User-opened public statements on X.',
  },
  {
    host: 'www.x.com',
    purpose: 'User-opened public statements on X.',
  },
  {
    host: 'rumble.com',
    purpose: 'User-opened historical livestream reposts on Rumble.',
  },
  {
    host: 'www.rumble.com',
    purpose: 'User-opened historical livestream reposts on Rumble.',
  },
  {
    host: 'odysee.com',
    purpose: 'User-opened historical livestream reposts on Odysee.',
  },
  {
    host: 'abcnews.com',
    purpose: 'User-opened ABC News reporting used as a clearly labeled secondary source for the March 15, 2023 fire chronology.',
  },
  {
    host: 'www.hk01.com',
    purpose: 'User-opened reporting used to verify and credit the Kin Ming Je identification image.',
  },
  {
    host: 'china.caixin.com',
    purpose: 'User-opened reporting used to verify and credit the Yanping Wang identification image.',
  },
]

const allowedExternalHosts = [
  ...allowedFetchHosts.map(({ host, purpose }) => ({ host, purpose })),
  ...externalOnlyHosts,
]

const localhostNames = new Set(['localhost', '127.0.0.1', '::1'])
const configuredAppPorts = String(process.env.GUO_INTEL_ALLOWED_APP_PORTS ?? '')
  .split(',')
  .map((port) => port.trim())
  .filter((port) => /^\d{1,5}$/.test(port) && Number(port) >= 1 && Number(port) <= 65535)
const runtimeApiPort = String(process.env.GUO_INTEL_API_PORT ?? '').trim()
const allowedAppPorts = new Set(['4177', '5173', runtimeApiPort, ...configuredAppPorts].filter(Boolean))
const configuredLocalAiPorts = String(process.env.GUO_INTEL_ALLOWED_LOCAL_AI_PORTS ?? '')
  .split(',')
  .map((port) => port.trim())
  .filter((port) => /^\d{1,5}$/.test(port) && Number(port) >= 1 && Number(port) <= 65535)
const allowedLocalAiPorts = new Set(['11434', ...configuredLocalAiPorts])

function hostAllowed(hostname, options = {}) {
  const normalized = String(hostname || '').toLowerCase()
  if (!normalized) return false
  const configuredEntry = allowedFetchHosts.find((entry) => entry.host === normalized)
  if (configuredEntry?.aiProvider && (options.includeAi === false || options.includeOpenAI === false)) return false
  return allowedFetchHosts.some((entry) => entry.host === normalized)
}

function externalHostAllowed(hostname) {
  const normalized = String(hostname || '').toLowerCase()
  return Boolean(normalized) && allowedExternalHosts.some((entry) => entry.host === normalized)
}

function isAllowedOutboundUrl(value, options = {}) {
  try {
    const url = new URL(String(value))
    const allowedOrigins = Array.isArray(options.allowedOrigins) ? options.allowedOrigins : []
    if (allowedOrigins.includes(url.origin)) {
      return url.protocol === 'https:' || (url.protocol === 'http:' && localhostNames.has(url.hostname))
    }
    if (url.protocol !== 'https:') return false
    return hostAllowed(url.hostname, {
      includeOpenAI: options.includeOpenAI !== false,
      includeAi: options.includeAi !== false,
    })
  } catch {
    return false
  }
}

function isAllowedLocalAiUrl(value) {
  try {
    const url = new URL(String(value))
    return ['http:', 'https:'].includes(url.protocol) && localhostNames.has(url.hostname) && allowedLocalAiPorts.has(url.port || (url.protocol === 'https:' ? '443' : '80'))
  } catch {
    return false
  }
}

function assertAllowedOutboundUrl(value, options = {}) {
  if (!isAllowedOutboundUrl(value, options)) {
    let target = 'invalid URL'
    try {
      target = new URL(String(value)).host
    } catch {
      target = String(value).slice(0, 80)
    }
    throw new Error(`Outbound URL is not in the Docket Observatory network policy: ${target}`)
  }
}

function isAllowedExternalUrl(value) {
  try {
    const url = new URL(String(value))
    if (!['https:', 'http:'].includes(url.protocol)) return false
    if (url.protocol === 'http:' && !localhostNames.has(url.hostname)) return false
    return externalHostAllowed(url.hostname) || (localhostNames.has(url.hostname) && allowedAppPorts.has(url.port))
  } catch {
    return false
  }
}

function isAllowedLocalhostOrigin(origin) {
  if (!origin) return true
  try {
    const url = new URL(String(origin))
    return ['http:', 'https:'].includes(url.protocol) && localhostNames.has(url.hostname) && allowedAppPorts.has(url.port)
  } catch {
    return false
  }
}

module.exports = {
  allowedAppPorts: [...allowedAppPorts],
  allowedLocalAiPorts: [...allowedLocalAiPorts],
  allowedExternalHosts,
  allowedOutboundHosts: allowedFetchHosts,
  assertAllowedOutboundUrl,
  isAllowedExternalUrl,
  isAllowedLocalAiUrl,
  isAllowedLocalhostOrigin,
  isAllowedOutboundUrl,
}
