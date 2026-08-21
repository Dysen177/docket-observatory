# Network Manifest

All routine outbound access should be visible here and enforced in `server/network-policy.cjs`.

## AI Chat retrieval boundary

AI Chat does not perform unrestricted search-engine queries and does not place arbitrary live webpages directly into a model prompt. It answers from the local evidence library. Network refresh is a separate ingestion step governed by the allowlist below, source-type labels, URL validation, response-size limits, and local integrity metadata.

Evidence priority is:

1. PACER and official court records, when legitimately available through the user's own access.
2. CourtListener/RECAP records and court-hosted documents.
3. DOJ, SEC, Federal Register, trustee, and claims-administrator records.
4. Party or project publications, labeled as party/project material rather than adjudicated fact.
5. News reporting, when present, as secondary context only.
6. Social posts and historical broadcast transcripts as public statements only, never as proof of a judicial finding.

Conflicting sources remain separate. A lower-tier source cannot silently override an official record. Text fetched from any source is treated as untrusted evidence data: instructions embedded in a filing, webpage, transcript, or retrieved document are never executed by AI Chat.

| Host | Purpose | Data |
| --- | --- | --- |
| `ghot.ai` | Public bilingual text-archive catalog used as a secondary research reference. | Public glossary entries, declarations, reports, and secondary court-file summaries; court summaries do not replace PDF originals or official dockets. |
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
| `www.supremecourt.gov` | Official Supreme Court docket pages and court-hosted filings for tracked matters. | Public docket metadata and PDFs; currently includes No. 26-194. |
| `www.bop.gov` | Official Bureau of Prisons inmate locator for the verified register number. | Current public facility designation and projected-release field. The locator is not a transfer-history service and does not establish an exact transfer date. |
| `www.federalregister.gov` | Federal Register policy search API. | Public policy metadata. |
| `pacer.uscourts.gov` | PACER credential entry point and future fee-aware adapter. | Credential-gated official court metadata. |
| `api.openai.com` | Optional structured AI analysis and full-text translation. | Public metadata; extracted text only when explicitly enabled; `store: false`. |
| `api.anthropic.com` | Optional Anthropic Claude analysis and full-text translation. | Public metadata; extracted text only when explicitly enabled. |
| `generativelanguage.googleapis.com` | Optional Google Gemini analysis and full-text translation. | Public metadata; extracted text only when explicitly enabled. |
| `platform.openai.com` | User-opened official API-key setup page. | No automatic transfer; external browser navigation only. |
| `console.anthropic.com` | User-opened official Anthropic API-key setup page. | No automatic transfer; external browser navigation only. |
| `aistudio.google.com` | User-opened official Gemini API-key setup page. | No automatic transfer; external browser navigation only. |
| `ollama.com` | User-opened official Ollama download page for optional local generative AI. | No automatic transfer; external browser navigation only. |

## External-browser-only historical links

The historical public-record workspace can open the following hosts in the operating system browser. They are deliberately excluded from the backend-fetch allowlist: the application does not scrape, embed, proxy, or download their video, image, audio, or social-media payloads.

| Host | Purpose | Automatic application access |
| --- | --- | --- |
| `youtube.com`, `www.youtube.com`, `youtu.be` | User-selected historical livestream reposts. | None; browser open only. |
| `gettr.com`, `www.gettr.com` | User-selected historical GETTR posts and livestream copies. | None; browser open only. |
| `x.com`, `www.x.com` | User-selected public statements on X. | None; browser open only. |
| `rumble.com`, `www.rumble.com` | User-selected historical Rumble reposts. | None; browser open only. |
| `odysee.com` | User-selected historical Odysee reposts. | None; browser open only. |
| `abcnews.com` | User-selected ABC News reporting used as a labeled secondary source for the March 15, 2023 fire chronology. | None; browser open only. |
| `www.hk01.com` | User-selected reporting used to verify and credit the Kin Ming Je identification image. | None; browser open only. |
| `china.caixin.com` | User-selected reporting used to verify and credit the Yanping Wang identification image. | None; browser open only. |

The bundled index stores text metadata and external HTTPS links only. It does not contain third-party video, audio, thumbnails, profile images, cookies, session data, or platform credentials. A repost link records an accessible copy and is not labeled as an original official publication unless separately established.

The local UI and API use:

- `http://127.0.0.1:5173` for Vite development.
- `http://127.0.0.1:4177` for the local API.

Additional development ports must be explicitly listed in `GUO_INTEL_ALLOWED_APP_PORTS` as comma-separated numeric ports. This extends only the loopback-origin allowlist; it cannot authorize a remote host.

Do not add a new host without updating this file and `server/network-policy.cjs`.

The Settings view allows one explicit custom destination only for the reviewed OpenAI-compatible AI adapter. Remote custom endpoints must use HTTPS, local endpoints may use HTTP, and requests plus redirects must remain on the exact saved Origin. This does not create a general-purpose URL-fetch endpoint. All court/source adapters continue to use the source-controlled host allowlist.

PACER credentials can be stored locally, but no PACER login, browser verification, or paid-download request is implemented. The existing PACER URL is an external registration entry point only.

The no-token CourtListener path combines public Atom feeds with rate-limited anonymous structured search. It can discover and download the currently surfaced public RECAP PDFs, but result windows are limited and cannot establish complete historical docket coverage or replace PACER as the docket of record. The client validates exact CourtListener docket IDs, API next-page hosts, source-page hosts, and `storage.courtlistener.com` PDF URLs.

Himalaya Restoration access is read-only and limited to public pages, historical snapshots, and public court-file URLs. Zoho forms, customer submission endpoints, authenticated customer areas, and private project backends are not allowlisted and are never queried by the application.
