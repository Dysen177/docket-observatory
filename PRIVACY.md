# Privacy

[中文隐私说明](PRIVACY.zh-CN.md) | [English](PRIVACY.md)

案卷观察台 is intended for local personal research.

## Local Data

The app may store:

- Downloaded public court PDFs under `downloads/court-files-complete` in development. Complete releases also contain a read-only bundled baseline; later downloads use the per-user macOS or Windows application-data directory.
- A document manifest under `downloads/court-files-complete/manifest.json`.
- Runtime cache files under `server/cache`, including local PDF text snippets and optional document-AI responses.
- Browser UI preferences such as selected language in `localStorage`.

These paths are ignored by git.

## External Requests

The app fetches public legal and policy sources listed in `NETWORK.md`. The API and development UI bind to `127.0.0.1`. Credential-gated services are disabled unless you configure credentials locally.

Like any direct HTTPS request, automatic refreshes disclose the user's public IP address, request time, and ordinary transport metadata to each contacted source or API provider. The app does not add a user identifier, analytics identifier, advertising identifier, or account profile to those requests. A VPN or network proxy, if independently configured at the operating-system level, remains outside the application's control.

## Historical Project Sources

The Himalaya Restoration integration reads only public project pages, Internet Archive snapshots, and court files that were publicly linked from those pages. It does not submit to or read Zoho customer forms, access customer portals or authenticated backends, or collect KYC records, account details, private communications, or sealed materials.

HID references may be indexed when they appear in a public court filing or public project page, but the application does not attempt to reconstruct a HID holder's natural-person identity or join HID values to customer records. Public cover filings and public claimant-count statements remain separate from any sealed or non-public claimant material.

## AI Requests

Cloud analysis is disabled unless the corresponding provider is selected and its key is configured. The app supports official OpenAI Responses, Anthropic Messages, Google Gemini `generateContent`, and a user-configured OpenAI-compatible `/chat/completions` endpoint. Every official OpenAI Responses request sets `store: false`; retention by other providers follows their account terms and data policies. Event and case reads send structured public metadata. Document reads send extracted text only when the explicit cloud body-transmission setting is enabled; this setting is off on a new installation. Raw PDFs and local paths are never sent. When cloud body transmission is disabled, cloud document reads are metadata-only and cloud full-text translation is blocked.

Ollama is an optional local generative provider. The application accepts only a loopback Ollama address, so extracted text remains on the user's computer and can be processed without enabling cloud body transmission. Ollama and its models are not bundled, installed, or downloaded automatically. If Ollama is unavailable, the bundled release-baseline translations and legal reads remain unchanged; newly discovered files may receive separately labeled preliminary local assistance instead of being presented as generative output.

Cloud-provider connection testing sends only the fixed text `Respond with the single word OK.` and no case, document, path, or PDF data. Local `pdf-parse` extraction, Tesseract.js OCR, glossary assistance, deterministic legal reads, and loopback Ollama processing do not upload PDFs or rendered pages. Extracted text, page hashes, translations, and analysis outputs are cached only in the ignored local cache directory or the packaged app's Application Support directory.

AI output is research assistance, not formal legal advice or a substitute for reading the operative court record. The application keeps source posture, quoted-page references, and verification tasks visible so conclusions can be checked against the underlying filing.

## Secrets

Do not commit `.env`, PACER credentials, CourtListener tokens, AI-provider keys, downloaded documents, or generated caches.

On macOS, secrets are encrypted in a local AES-256-GCM vault and its random key is protected by a non-interactive Keychain call. The app explicitly disables authentication UI, so an unavailable or inaccessible Keychain returns an error instead of a system password prompt. On Windows, Electron stores the vault with DPAPI-backed asynchronous `safeStorage`. The settings API returns only configured state, a masked suffix, and the storage source. Environment-provided secrets cannot be deleted from the UI because they are owned by the launching environment.

Court PDFs, extracted text, translations, and legal reads are intentionally stored in plaintext local application data so they remain searchable offline. They may contain personal information already present in public filings. Other software running as the same operating-system user may be able to read local research data even though application directories use restrictive permissions; encrypted credential-vault protection does not apply to the public research corpus.

English API responses omit untranslated Chinese source-body text and page excerpts until an English translation is cached. Source PDFs and source-language extraction remain local, while page numbers, hashes, translation status, and external source links remain available for verification.
