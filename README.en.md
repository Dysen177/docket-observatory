# Docket Observatory

[中文](README.md) | [English](README.en.md) | [Downloads and verification](DOWNLOADS.md) | [Security](SECURITY.md) | [Privacy](PRIVACY.md)

Docket Observatory is a neutral, local-first legal-intelligence desktop application for macOS and Windows. It tracks Guo-related criminal, civil, SEC/Fair Fund, bankruptcy, appellate, G-series entity, asset-recovery, and policy lines while separating court rulings, government allegations, party positions, third-party filings, and public mirrors.

## Download The Complete Edition

- [Download the latest release](../../releases/latest)
- [View all releases](../../releases)
- macOS Apple silicon: `Docket-Observatory-<version>-macOS-arm64.dmg`
- macOS Intel: `Docket-Observatory-<version>-macOS-x64.dmg`
- Windows 10/11 x64: `Docket-Observatory-<version>-Windows-x64.exe`
- Verify the installer against `SHA256SUMS.txt` by following [DOWNLOADS.md](DOWNLOADS.md).

This is a complete-data release, not an empty client that must rebuild the historical library after installation. The release baseline contains 1,605 collected records, 1,578 valid local PDFs (about 1.3 GB), the chained SHA-256 integrity record, and roughly 0.5 GB of current extracted text, existing translation/reading data, per-document legal reads, case-level reads, audits, and full-text-search seed data. Electron, local OCR models, and runtime dependencies add further size. The exact compressed download size is stated on each GitHub Release; keep at least 5 GB of free disk space for installation and writable updates. On first launch, the packaged app verifies every research-seed file against its SHA-256 manifest. A failed baseline verification stops startup instead of falling back to an empty rebuild.

The large PDFs and generated cache are not committed directly to the Git source repository. Before packaging, `release:prepare-data` builds a sanitized release baseline that removes developer paths, settings, diagnostics, automation history, and logs. The repository publishes a [corpus manifest](release-metadata/corpus-manifest.json) and [seed-cache manifest](release-metadata/seed-cache-manifest.json) so reviewers can inspect content identities and hashes.

## What Works Without Keys

On first launch, users immediately receive the same bundled research baseline, cached legal reads, and full-text search that were present when the release was prepared. The app does not re-crawl, re-translate, or replace that historical baseline with lower-tier output. While the application remains running and the computer is online, it refreshes public sources every 30 minutes by default and processes only incremental changes.

- Public discovery: fixed CourtListener/RECAP feeds and anonymous search, DOJ, SEC, Federal Register, Himalaya/Wayback, and NFSC as backup only.
- Local files: download, PDF validation, SHA-256 verification, text extraction, local OCR, and indexing.
- Translation: the bundled current translation and reading data is available immediately. New filings can receive a clearly labeled preliminary reading aid stored separately from the release baseline; it is not represented as a complete legal translation.
- Legal reads: bundled document and case reads are available immediately. A new filing may receive a preliminary structured local read when no generative provider is configured, but it does not overwrite or downgrade the bundled baseline.
- No silent charges: PACER paid retrieval is disabled and not implemented; cloud AI is never selected automatically.

## Optional Enhancements

- CourtListener token: adds full RECAP docket-entry pagination and broader discovery of PDFs already mirrored in RECAP. It does not improve translation or AI quality.
- Local Ollama: adds local generative body translation and document/case reads without sending extracted text to a cloud provider. Quality and speed depend on the selected model and hardware.
- Cloud AI: the app implements OpenAI Responses, Anthropic Messages, Google Gemini `generateContent`, and OpenAI-compatible `/chat/completions`. Analysis and translation may use different providers and arbitrary model IDs. Compatible mode accepts a user-controlled HTTPS Base URL and key for gateways such as OpenRouter, xAI/Grok, DeepSeek, Qwen, Moonshot, SiliconFlow, or another compatible/self-hosted service; these are examples, not a hardcoded model allowlist.
- Cloud body processing requires explicit extracted-body transmission consent. Raw PDFs and local paths are never sent. Official OpenAI Responses requests use `store: false`; retention by Anthropic, Gemini, and compatible gateways follows the selected provider's policy.
- PACER credentials: encrypted placeholders and fee guards exist, but PACER login and paid download adapters are not implemented in this version.

All editable ordinary Settings controls are persisted locally and used by the runtime after saving; scheduler changes take effect immediately. The document and cache paths shown in diagnostics are app-managed, read-only locations, not directory pickers. The PACER budget is informational until the official adapter exists.

Protocol support does not mean equal output quality. Translation fidelity, legal reasoning, long-document coverage, citation stability, latency, and cost depend on the selected model's capability and context window, reasoning mode, provider implementation, and account limits. Smaller models or incomplete gateways may omit text, mistranslate legal terms, or produce unstable citations. The app validates structured output, approved evidence IDs, and page citations before caching, but AI output remains research assistance rather than legal advice.

No source combination proves that every related matter or filing has been collected. PACER remains the docket of record. Sealed, restricted, removed, unknown-name, and not-yet-mirrored material can remain unavailable. AI output is research assistance, not legal advice.

## Security And Transparency

The source tree contains no telemetry SDK, analytics SDK, remote database, hidden updater, or arbitrary URL-fetch endpoint. The local API binds to loopback, Electron uses renderer isolation and sandboxing, outbound destinations are enforced by a source-controlled allowlist, and secrets use operating-system encrypted storage on macOS and Windows.

An absolute negative such as “software can never contain a backdoor” cannot be established by a slogan. This project provides verifiable controls instead: open source, a documented network allowlist, dependency lockfile, CI, static security checks, corpus and seed-cache hashes, installer checksums, and reproducible code checks. The current audit found no known backdoor or hidden data-collection path. Review [SECURITY.md](SECURITY.md), [OPEN_SOURCE_AUDIT.md](OPEN_SOURCE_AUDIT.md), and [NETWORK.md](NETWORK.md).

## Source Development

Node.js 24 LTS is recommended.

```bash
nvm use
npm ci
npm run dev:all
```

Required checks:

```bash
npm run lint
npm run build
npm run test:zero-key
npm run test:search:fixture
npm run security:check
```

Full release data and installers are prepared only at the final release stage:

```bash
npm run release:prepare-data
npm run release:verify-data
npm run desktop:dmg
npm run desktop:exe
```

See [RELEASING.md](RELEASING.md), [SIGNING.md](SIGNING.md), [CODE_SIGNING_POLICY.md](CODE_SIGNING_POLICY.md), and [GITHUB_OPERATIONS.md](GITHUB_OPERATIONS.md) for formal fail-closed signing, explicitly unsigned zero-cost community builds, GitHub asset naming, and the complete-data acceptance checklist.
