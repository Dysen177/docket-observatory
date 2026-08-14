# Open Source Audit Notes

This project is prepared so another reviewer can inspect whether the application contains hidden data collection or backdoor behavior.

## What To Review

- `server/network-policy.cjs`: complete outbound host allowlist.
- `server/adapters.js`: public source refresh logic.
- `server/download-documents.js`: PDF collection and download logic.
- `server/recap-client.js`: no-key public feeds and rate-limited structured search for fixed and discovered dockets, optional token-enhanced pagination, and strict available-RECAP-PDF URL mapping.
- `server/document-analysis.js`: document metadata translation and optional AI analysis boundary.
- `server/pdf-extraction.js`: local PDF text extraction, bundled offline OCR fallback, resource cleanup, page/character limits, and cache invalidation.
- `server/document-search.js`: bounded search-index Worker thread with fixed structured input and no Electron-as-Node subprocess requirement.
- `server/index.js`: local API, CORS, headers, routes, and error handling.
- `electron/main.cjs`: renderer isolation and external-link policy.
- `electron/preload.cjs`: minimal context bridge; no Node APIs are exposed to the renderer.
- `server/settings-store.js`: ordinary settings plus encrypted-secret boundary and masked status API.
- `src/App.tsx`: UI data display and links.
- `package.json` and `package-lock.json`: dependency and script surface.

## Backdoor-Oriented Checks

Run:

```bash
npm run security:check
```

Then manually verify:

- No telemetry, analytics, remote database, or auto-update service exists.
- No `child_process`, `eval`, `new Function`, raw HTML injection, or wildcard CORS is used by app code.
- No secrets are hardcoded in source.
- No arbitrary URL fetch or arbitrary local-file read endpoint exists.
- Electron cannot open arbitrary schemes such as `javascript:`, custom protocols, or random local files.
- Official cloud AI calls go only to the reviewed OpenAI, Anthropic, or Gemini hosts. The compatible adapter is restricted to the exact user-saved HTTPS Origin, including redirects. Optional Ollama calls are restricted to a validated loopback address.
- Every official OpenAI Responses API call includes `store: false`; cloud body text transmission follows the explicit Settings switch for all providers. Loopback Ollama processing does not depend on that cloud-consent switch.
- PDF text extraction and OCR are local; Tesseract language data is bundled, rendered pages are not uploaded, and cached snippets and AI responses live under ignored cache directories.
- Zero-key scheduled runs bound new downloads and processing work, retain deferred discoveries in the manifest, and prioritize CourtListener/RECAP and official agency sources ahead of NFSC backup links.
- Complete DMG/EXE releases include a separately staged court-file baseline and research seed. The raw developer cache is never packaged directly: release preparation removes settings, logs, diagnostics, automation history, and developer-local paths, then emits public SHA-256 manifests under `release-metadata/`.
- Local glossary output is stored as `assistive_only`, and deterministic local-rule output is counted separately from cloud/Ollama generative output.
- Downloaded PDFs are checked for a PDF signature and recorded with SHA-256 hashes in the local manifest.
- Settings API never returns complete secret values. macOS writes AI-provider, RECAP, and PACER fields (including optional PACER client code) to an AES-256-GCM vault backed by a no-authentication-UI Keychain key; Windows uses asynchronous DPAPI-backed `safeStorage`.
- English API output omits untranslated Chinese PDF body text and raw Unicode local paths while retaining source links, page metadata, and hashes.
- Development web mode rejects secret writes when encrypted desktop storage is unavailable.
- Dynamic API responses use `Cache-Control: no-store` so a browser cannot silently present an older case/event set after a source refresh or API restart.
- All non-health API routes require the application request header, preventing cross-origin image/form requests from triggering local PDF reads, cloud calls, or expensive analysis in development web mode. Packaged requests additionally require the per-launch Electron session token.
- Electron waits for its own listener startup promise, denies unused permissions, blocks webview attachment, and is packaged with hardened ASAR/Fuse settings.
- Dynamic external links are reduced to `https:` or explicit loopback `http:` destinations before rendering; Electron applies the stricter documented host allowlist before opening them.
- GitHub Actions are pinned to full commit SHAs. CodeQL, dependency review, Dependabot, the lockfile, and dependency audit are part of the public supply-chain controls.

## Settings API Review

The UI uses `GET /api/settings` for masked state and `PUT /api/settings` for validated ordinary settings. Secret fields are accepted only by the local API and are persisted through the Electron vault. `POST /api/settings/test-source` performs a one-source adapter check and returns status/facts without returning authorization headers or tokens. `POST /api/settings/test-ai` sends a fixed non-case prompt. Diagnostics persist bounded status metadata only. PACER remains visibly `not implemented` even when credentials exist.

## Release Boundary

Open-source the source code, docs, lockfile, and release hash manifests. Do not publish raw development data:

- `.env` or any `*.local` file.
- `downloads/` directly in the source repository; publish only through reviewed complete installers or a separately versioned corpus artifact.
- `server/cache/` directly; package only the sanitized `release-data/seed-cache` generated by the release script.
- `output/`.
- DMG artifacts containing personal local data.

## Neutrality Boundary

The application is a neutral legal-intelligence tool. It separates court findings, agency allegations, party claims, third-party petitions, public mirrors, and policy context. Personal political views or litigation theories should be kept outside the program unless intentionally added later as a private note feature.

## Current Coverage Caveat

The source tree and UI must not claim a complete universe of Guo-related litigation. The 2026-08-14 checked development corpus has 1,605 manifest records and 1,578 valid local PDFs: 208 CourtListener/RECAP court-record files, 2 official SEC files, 34 complete Himalaya Restoration Wayback captures, and 1,334 NFSC backup copies. Twenty-seven retained error records describe 26 unavailable or rejected Wayback payloads plus the NFSC `Doc 81-21` mirror URL, which returns HTTP 404; they are not 27 proven missing docket documents. At the time of the latest no-token refresh, public feeds observed 337 recent records and the bounded fixed/portfolio searches surfaced 42 public PDF links before de-duplication. These live counts change and do not prove completeness. PACER, sealed/restricted/removed material, anonymous search windows, not-yet-mirrored PDFs, and unknown-name matters remain outside completeness proof. Current valid caches include curated human legal research and deterministic local reads, but zero cloud/Ollama generated complete cross-language body translations in the latest audit. Source text already in the selected language and glossary reading aids are counted separately from generated translation. Complete cross-language body translation and generative document/case AI still require a working Ollama model or a configured cloud provider. The 30-page public RECAP `24-05249 Doc 192` remains recorded with its SHA-256 in the manifest and integrity history. See `output/audit/全面审计报告.md` and `output/audit/completeness-audit.md` for the current verification snapshot; these generated local reports are not included in a clean source checkout.
