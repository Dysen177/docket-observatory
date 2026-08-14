# Network Manifest

All routine outbound access should be visible here and enforced in `server/network-policy.cjs`.

| Host | Purpose | Data |
| --- | --- | --- |
| `nfsc.press` | Public mirror for docket-linked PDFs. | Public mirror metadata and PDFs. |
| `www.justice.gov` | DOJ victim information and press releases. | Public agency pages. |
| `www.sec.gov` | SEC enforcement releases and linked files. | Public agency pages and PDFs. |
| `www.gtvmediagroupfairfund.com` | GTV Media Group Fair Fund status. | Public claims-administration pages and PDFs. |
| `himalayarestoration.org` | Public entry point for the current Himalaya Restoration project site. | Public redirects and project-site metadata. |
| `himalayarestoration.com` | Historical Himalaya Restoration pages and previously public court-file links. | Public legal updates and publication-history metadata. |
| `bragey5.dreamhosters.com` | Current public Himalaya Restoration WordPress host. | Public pages, posts, and attachment metadata. |
| `web.archive.org` | Internet Archive captures of historical Himalaya Restoration pages and linked public PDFs. | Historical public pages and court-file copies; incomplete or truncated payloads are rejected. |
| `dm.epiq11.com` | Epiq bankruptcy docket shell and future extraction endpoint mapping. | Public claims-agent docket metadata. |
| `www.courtlistener.com` | Public fixed-docket Atom feeds, anonymous structured search, optional token API, and source pages. | Feed and limited structured-search metadata need no token; a token enables full docket-entry pagination. |
| `storage.courtlistener.com` | Public PDFs already present in the RECAP archive. | Public court PDFs downloaded from validated search/API results or an exact docket/document/attachment coordinate independently reconciled to a public CourtListener record. |
| `www.federalregister.gov` | Federal Register policy search API. | Public policy metadata. |
| `pacer.uscourts.gov` | PACER credential entry point and future fee-aware adapter. | Credential-gated official court metadata. |
| `api.openai.com` | Optional structured AI analysis and full-text translation. | Public metadata; extracted text only when explicitly enabled; `store: false`. |
| `api.anthropic.com` | Optional Anthropic Claude analysis and full-text translation. | Public metadata; extracted text only when explicitly enabled. |
| `generativelanguage.googleapis.com` | Optional Google Gemini analysis and full-text translation. | Public metadata; extracted text only when explicitly enabled. |
| `platform.openai.com` | User-opened official API-key setup page. | No automatic transfer; external browser navigation only. |
| `console.anthropic.com` | User-opened official Anthropic API-key setup page. | No automatic transfer; external browser navigation only. |
| `aistudio.google.com` | User-opened official Gemini API-key setup page. | No automatic transfer; external browser navigation only. |
| `ollama.com` | User-opened official Ollama download page for optional local generative AI. | No automatic transfer; external browser navigation only. |

The local UI and API use:

- `http://127.0.0.1:5173` for Vite development.
- `http://127.0.0.1:4177` for the local API.

Additional development ports must be explicitly listed in `GUO_INTEL_ALLOWED_APP_PORTS` as comma-separated numeric ports. This extends only the loopback-origin allowlist; it cannot authorize a remote host.

Do not add a new host without updating this file and `server/network-policy.cjs`.

The Settings view allows one explicit custom destination only for the reviewed OpenAI-compatible AI adapter. Remote custom endpoints must use HTTPS, local endpoints may use HTTP, and requests plus redirects must remain on the exact saved Origin. This does not create a general-purpose URL-fetch endpoint. All court/source adapters continue to use the source-controlled host allowlist.

PACER credentials can be stored locally, but no PACER login, browser verification, or paid-download request is implemented. The existing PACER URL is an external registration entry point only.

The no-token CourtListener path combines public Atom feeds with rate-limited anonymous structured search. It can discover and download the currently surfaced public RECAP PDFs, but result windows are limited and cannot establish complete historical docket coverage or replace PACER as the docket of record. The client validates exact CourtListener docket IDs, API next-page hosts, source-page hosts, and `storage.courtlistener.com` PDF URLs.

Himalaya Restoration access is read-only and limited to public pages, historical snapshots, and public court-file URLs. Zoho forms, customer submission endpoints, authenticated customer areas, and private project backends are not allowlisted and are never queried by the application.
