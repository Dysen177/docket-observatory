# Security Policy

[中文安全说明](SECURITY.zh-CN.md) | [English](SECURITY.md) | [Network allowlist](NETWORK.md) | [Open-source audit](OPEN_SOURCE_AUDIT.md)

Docket Observatory is a local macOS and Windows research workbench. It is designed to be auditable from source and must not hide background network behavior.

## Security Model

- The app runs a local Express API and a React/Electron desktop UI.
- There is no user account system, session cookie, analytics SDK, telemetry SDK, or remote database.
- Secrets stay outside the React bundle. On macOS, API keys and PACER credentials are stored in an AES-256-GCM vault whose random key is retrieved through a native Keychain module with `LAContext.interactionNotAllowed = true`; the app therefore never enables a Keychain authentication dialog. On Windows, the vault uses Electron's asynchronous DPAPI-backed `safeStorage`. The renderer receives only masked status. Environment variables remain a supported development/CI fallback.
- Downloaded court files and mutable caches are ignored by git, but complete DMG/EXE releases include a separately staged, sanitized, read-only court-file baseline and a precomputed research seed. `release:prepare-data` excludes settings, diagnostics, automation history, logs, and developer-local paths. Public corpus and seed-cache hash manifests are generated under `release-metadata/`. The packaged app verifies every seed file before installing it into writable per-user storage; failure stops startup rather than silently rebuilding an empty or lower-quality historical baseline.
- PDF text extraction runs locally with `pdf-parse`; extracted snippets are cached under `server/cache/pdf-text`.
- AI analysis is optional. Raw PDFs and local paths are never sent. Extracted body text is sent only when the explicit Settings switch is enabled; all Responses API requests set `store: false`.
- No-token RECAP access is limited to public Atom feeds for fixed tracked docket IDs and returns metadata only. Token-enhanced RECAP downloads are limited to those tracked dockets and `storage.courtlistener.com` PDF paths returned by the API; downloaded PDFs receive a local SHA-256 digest.
- Both Vite development UI and Express API bind to `127.0.0.1`, and state-changing requests enforce a localhost-origin allowlist.
- Every non-health API route requires the application request header. Packaged Electron requests additionally require a random per-launch session token, compared in constant time. Electron waits for the listener created by its own process, so an occupied loopback port stops startup instead of accepting another process's health response.

## Required Checks

Run these before packaging or publishing source:

```bash
npm run lint
npm run build
npm run test:electron-worker
npm run security:check
```

`npm run security:check` scans application source for high-risk patterns, verifies local CORS hardening, Electron external-link guarding, network policy presence, and dependency advisories at high severity or above.

## Network Boundary

Outbound network access should remain explicit and reviewable. The allowlist is implemented in:

```text
server/network-policy.cjs
```

Human-readable details are in:

```text
NETWORK.md
```

Do not add arbitrary URL fetch endpoints. New source adapters should call the shared network policy before fetching.

PACER integration must remain fee-aware and credential-gated. Do not add browser automation or scraping intended to bypass PACER authentication or charges. Prefer CourtListener/RECAP for no-fee public docket/PDF mirrors when available.

## Electron Boundary

The renderer runs with:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- browser permission checks and requests denied by default
- Electron Fuses disabling `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`, inspector arguments, non-ASAR app loading, and extra `file://` privileges

External links are opened only after scheme/host checks. The renderer does not navigate to local `file://` URLs. The in-app PDF reader requests a source URL from the loopback API, which resolves it only through the managed manifest, verifies the resolved path is inside the bundled or writable document root, and checks the PDF header before streaming it.

Search-index rebuilding uses a bounded Node Worker thread instead of launching the Electron executable as a Node subprocess. This permits the packaged app to disable the `RunAsNode` fuse without losing background indexing.

The packaged static server uses a CSP with self-only scripts and no `unsafe-eval` or inline scripts. `style-src-attr 'unsafe-inline'` is narrowly retained because React data visualizations use element style attributes for measured bar heights, progress widths, and chart colors.

## Settings and Secret Handling

The standalone Settings view writes ordinary parameters to `server/cache/app-settings.json` (or the configured cache directory) with mode `0600`. It never writes secret values to that file, `localStorage`, the React bundle, or run logs.

The Electron main process creates an encrypted secret vault at the app's operating-system user-data path and exposes only a minimal `contextBridge` surface. The API returns `configured`, a masked suffix, and the storage source, never the credential body. The development web server deliberately refuses secret writes when Electron secure storage is unavailable.

The macOS backend does not call Electron's interactive Keychain `safeStorage` implementation. Keychain operations receive a non-interactive `LAContext`; if macOS cannot complete the operation silently, the call fails closed, no credential is written, and no system password dialog is shown. The native module runs inside the signed Electron process rather than as an executable helper, so another local process cannot use a bundled helper as a credential-decryption proxy.

On macOS, Chromium's separate internal OSCrypt path is started with `use-mock-keychain` so Chromium cannot request access to an `Electron Safe Storage` item. This application has no login cookie, remote user session, or account authentication state. API keys and PACER credentials never use that mock backend; they remain in the native no-authentication-UI Keychain/AES-GCM vault described above.

The credential set is intentionally limited to reviewed destinations in the network policy:

- `OpenAI API key`: optional document/event/case analysis and full-text translation.
- `Anthropic API key`: optional Claude analysis and translation through the official Messages API.
- `Google Gemini API key`: optional Gemini analysis and translation through the official `generateContent` API.
- `Compatible gateway API key`: optional user-selected OpenAI-compatible `/chat/completions` service. Its exact HTTPS origin is derived from the saved Base URL and enforced on every redirect.
- `CourtListener / RECAP token`: optional enhancement for REST pagination, entry descriptions, and discovery of PDFs already in RECAP. Fixed-docket public Atom updates work without it.
- `PACER username/password` and optional `PACER client code`: reserved for a future fee-aware official docket adapter. The client code is billing metadata, not an access bypass.

PACER automatic paid downloading is hard-disabled in settings and server-side normalization. A budget field is informational until a PACER adapter with explicit per-request cost confirmation is implemented.

Document and cache paths shown in Settings are app-managed diagnostics, not writable configuration fields. This avoids unsafe partial migration of the complete bundled baseline and keeps path changes out of the renderer trust boundary.

Connection diagnostics persist only status, timestamp, latency, item count, and a bounded message. They never persist authorization headers or full credential values. Every cloud-provider test uses a fixed metadata-only prompt.

## Publication And Binary Trust

Publishing source code does not prove that an arbitrary DMG/EXE was built from that source. The current zero-cost community release is explicitly labeled `unsigned` and is accompanied by `SHA256SUMS.txt`, `SBOM.cdx.json`, `BUILD-PROVENANCE.json`, corpus manifests, and release verification evidence. A future formally signed tier additionally requires Apple Developer ID signing and notarization for macOS and trusted timestamped Authenticode for Windows. GitHub Actions are pinned to full commit SHAs; Dependabot, CodeQL, dependency review, the lockfile, and `npm audit` reduce supply-chain risk but cannot eliminate it.

Users should download binaries only from the official GitHub Release, verify the checksum, verify a platform signature only when an artifact claims to be signed, and avoid unreviewed forks or third-party repackaging. The repository owner should require two-factor authentication, branch protection, reviewed pull requests, private vulnerability reporting, and least-privilege release secrets.

The macOS no-authentication-UI Keychain tests, Windows native DPAPI tests, and installer tests remain release gates. Platform signing and notarization tests are additional gates for a future signed tier; the current community artifacts do not claim signed-installer status.

## Residual Risk

No review can guarantee permanent or absolute security. Remaining risks include compromised dependencies or build infrastructure, malicious forks, an already-compromised operating-system account, parser defects in untrusted PDFs, denial of service from unusually complex files, exposed environment-variable credentials, and user-authorized cloud AI transmission. Public source refreshes also reveal the user's public IP address and request timing to the contacted source, as ordinary HTTPS requests do.

## Reporting Issues

For a private local build, record suspected security issues in `OPEN_SOURCE_AUDIT.md` or your issue tracker before publishing or packaging.
