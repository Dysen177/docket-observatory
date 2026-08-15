# Windows EXE Audit: Docket Observatory v0.1.1

Audit date: 2026-08-16  
Audited artifact: `Docket-Observatory-0.1.1-Windows-x64-unsigned.exe`  
Release: <https://github.com/Dysen177/docket-observatory/releases/tag/v0.1.1>

## Executive summary

No release-blocking defect, unexpected persistence mechanism, bundled credential, telemetry SDK, or application-level shell execution path was found in the audited Windows installer. The installer archive, installed payload, application source, bundled research cache, and all 1,838 physical PDFs passed the integrity checks described below.

This is an unsigned community build. It has no Windows Authenticode certificate and may therefore trigger Microsoft Defender SmartScreen or show an unknown publisher. That is a distribution-trust limitation, not evidence that the file is malicious. This audit does not claim an absolute malware-free guarantee: no local antivirus or YARA engine was available, and the 1.6 GB binary was not uploaded to an external scanning service.

## Artifact identity

- Size: `1,688,201,118` bytes
- SHA-256: `2e1796f6dd5fbebd2ba4340133e1a5cac38fa9424e216814ca30cf21a8a17b07`
- Local file hash matches the GitHub Release asset digest exactly.
- The GitHub Release contains exactly three installer assets: Apple Silicon DMG, Intel DMG, and Windows x64 EXE.
- The release EXE is explicitly named `-unsigned.exe`; no signing status is implied.

## Installer and payload integrity

- The outer file is a Unicode NSIS 3 installer. A 32-bit NSIS bootstrapper installing a 64-bit application is expected behavior.
- The outer NSIS archive test passed with `Everything is Ok`.
- The inner `app-64.7z` archive test passed with `Everything is Ok`.
- The inner application archive contains 18,750 files and expands to 2,899,940,459 bytes.
- The installer-extracted main executable, `resources/app.asar`, and Windows canvas native module match the previously validated `release/win-unpacked` payload byte for byte.
- The installed application is PE32+ x86-64. The canvas native binding is also PE32+ x86-64.
- No macOS or Windows ARM64 native canvas binding is present in this installer.

## PE security and identity

The installed x64 application enables these PE mitigations:

- high-entropy address-space randomization
- dynamic-base ASLR
- NX/DEP compatibility
- Control Flow Guard
- terminal-server awareness

The installer and installed application both have an empty PE Security Directory, confirming that this community build is not Authenticode-signed.

The installed application resources report:

- Product name: `案卷观察台`
- File description: `案卷观察台`
- Company: `Docket Observatory contributors`
- File version: `0.1.1`
- Product version: `0.1.1.0`
- One icon group containing 16, 24, 32, 48, 64, 128, and 256-pixel variants

The outer installer reports the same product identity and version. No old author name, email address, or prior project identity was found in these resources.

## Runtime supply-chain check

- The cached `electron-v43.4.0-win32-x64.zip` SHA-256 is `ef0709cfa719739acce73de6f9b684304baf38c6454376638a70d34a7cecffe0`.
- That hash matches Electron's official `v43.4.0` `SHASUMS256.txt` entry exactly.
- Excluding the branded executable and replaced default application archive, 71 packaged Electron/Chromium runtime files match the official Electron ZIP byte for byte. No runtime mismatch was found. Electron's standalone `LICENSE` and `version` files are omitted by packaging; the packaged app retains Electron and Chromium license files.
- Packaged `resources/elevate.exe` SHA-256 is `9b1fbf0c11c520ae714af8aa9af12cfd48503eedecd7398d8992ee94d1b4dc37`, exactly matching electron-builder's standard NSIS helper.
- `npm audit --audit-level=high` reported zero vulnerabilities at audit time.

## Electron application controls

The packaged application source matches the repository source for `electron/` and `server/`; electron-builder only removed development scripts and build configuration from the packaged `package.json`, as expected.

Verified controls include:

- `contextIsolation: true`
- `nodeIntegration: false`
- renderer sandbox enabled
- web security enabled and insecure content disabled
- webviews disabled and attachment attempts blocked
- all Electron permission requests denied by default
- renderer navigation restricted to the loopback application origin
- external browser links restricted by an explicit host allowlist
- a minimal preload bridge exposing only desktop identity and secure-storage status
- loopback-only API binding on `127.0.0.1`
- a random per-process API session token, constant-time token comparison, localhost-origin checks, and a required application request header
- Windows credentials stored through Electron `safeStorage`/DPAPI when available; secret writes fail closed when encrypted storage is unavailable
- strict managed-PDF path containment, PDF header checking, and manifest SHA-256 verification before a document is served
- explicit HTTPS outbound-host policy, redirect revalidation, credential-header stripping on cross-origin redirects, request timeouts, and bounded response sizes

Electron fuses read from the installed executable confirm:

- `RunAsNode`: disabled
- cookie encryption: enabled
- `NODE_OPTIONS`: disabled
- Node CLI inspect arguments: disabled
- embedded ASAR integrity validation: enabled
- only load application code from ASAR: enabled
- extra file-protocol privileges: disabled

## Process, persistence, and network review

The packaged application-owned JavaScript contains no call to `child_process`, PowerShell, `cmd.exe`, `schtasks`, registry `Run` keys, login-item APIs, protocol registration, or an updater API. No Sentry, PostHog, Mixpanel, Segment, Google Analytics, or equivalent telemetry SDK was found.

The custom NSIS macro invokes Windows `taskkill.exe` during install or upgrade to close an already-running copy. This is visible installer behavior required for native Windows and CrossOver/Wine upgrade compatibility. It does not register a scheduled task or background persistence mechanism.

The packaged Electron binary contains generic Chromium/Electron strings for registry, updater, and browser features. Those strings are part of the upstream runtime and are not invoked by this application's source. `resources/app-update.yml` contains the public GitHub repository coordinates and the historical cache-directory label `guo-intel-updater`, but no updater package or updater call is present. This is informational packaging residue only.

## Credentials and private data scan

No `.env`, `.npmrc`, `.pem`, `.key`, `.p12`, `.pfx`, or mobile-provisioning file is packaged. Targeted scans found no:

- GitHub personal access token
- OpenAI-style secret value
- Google API key value
- private-key header
- `/Users/dysen` developer path
- `Pacto2025` identity
- `bboypoison159` identity

Names such as `OPENAI_API_KEY` and `PACER_PASSWORD` occur only as configuration field or environment-variable names, not secret values.

## Court-file and cache verification

The corpus manifest contains 1,865 records:

- 1,838 records have a physical PDF in the installer.
- 27 records preserve source-side download/error gaps and do not claim to contain a PDF.
- All 1,838 expected PDFs are present; no unlisted PDF is present.
- All 1,838 files match their manifest byte size and SHA-256.
- All 1,838 begin with a PDF header and all parse successfully with Poppler `pdfinfo`.
- None is encrypted and none is marked structurally suspect by Poppler.

Three Aspose-produced appellate PDFs do not place `%%EOF` within their final 2 KiB, but all three parse successfully, report complete page counts, and are not structurally suspect. This is not treated as corruption.

Four public court PDFs contain PDF-level JavaScript. Manual extraction found only standard date/field formatting, field visibility behavior, and one Westlaw URL launch. No script contains an operating-system command, file write, PowerShell, or `cmd.exe` call. The Westlaw host is not in the application's external-link allowlist.

The bundled seed cache also passed its complete application-native integrity check:

- Release ID: `0.1.1-f1cd830a9354ea97-5b2a6f1f6b3e84c5`
- Manifested cache files: 16,825
- Manifested cache bytes: 735,603,674
- Aggregate SHA-256: `5b2a6f1f6b3e84c5c1af4f6e6f124b7b30f87bb395cd25a00ceefc1479a78231`
- Every manifested cache file exists and matches its declared size and SHA-256.
- `release-seed.json` is the expected bootstrap descriptor and is intentionally outside the 16,825 integrity-file list.

## Automated checks

The following local checks passed against commit `8aa4a9632fe8a586daadc46cbff4ff14936b5386`:

- `npm run security:check`
- `npm run lint`
- `npm run build`
- `npm run test:zero-key`
- `npm run test:settings`
- `npm run test:cloud-ai`
- `npm run test:electron-worker`
- `npm run test:search`

The search regression indexed 1,795 unique PDF contents and passed all 12 corpus queries. The lower number is deduplicated content coverage, not a missing-file count.

The earlier native Windows validation run passed silent installation, x64 architecture checks, corpus checks, renderer startup, running-app upgrade, post-upgrade startup, and uninstall:

<https://github.com/Dysen177/docket-observatory/actions/runs/31884932315>

A fresh native validation against the unchanged `v0.1.1` release asset was started during this audit:

<https://github.com/Dysen177/docket-observatory/actions/runs/31900400506>

## Findings by severity

### Critical, high, and medium

None found.

### Low and informational

1. **Unsigned executable:** Windows cannot cryptographically identify a publisher and SmartScreen may warn. Fixing this for all users requires a trusted code-signing certificate and reputation; it cannot be honestly removed by application code.
2. **Dependency source maps:** `app.asar` contains 2,465 source maps from production dependencies. No application source map, secret, or developer path was found. Removing them could reduce disclosure and size slightly, but does not materially change the current security verdict.
3. **Dormant updater metadata:** `app-update.yml` contains public repository coordinates and an old internal updater-cache label. No update code is loaded. It can be removed or renamed in a future build for packaging cleanliness.
4. **Four PDFs contain benign document JavaScript:** the scripts were manually reviewed as described above. Keeping public court documents unmodified preserves evidentiary fidelity; users should still keep the application and operating system patched because PDF parsing is a complex attack surface.

## Limitations

- No antivirus, Windows Defender, YARA, or commercial malware engine was installed locally, so no such scan is claimed.
- The 1.6 GB release asset was not uploaded to an external scanner, which avoids transferring the full court-file corpus to a third party.
- Static review and automated tests cannot prove the absence of every future dependency vulnerability or every possible malicious behavior.
- CrossOver/Wine is useful for compatibility testing but is not equivalent to native Windows. Native GitHub-hosted Windows validation and the user's physical Windows test remain the relevant runtime evidence.
- This installer audit verifies the files that are packaged. It does not prove that PACER or any public mirror contains every possible filing, sealed record, or fee-gated document.

## Verdict

The audited `v0.1.1` Windows x64 installer is internally consistent, matches its published Release digest, carries the intended complete local corpus and research cache, uses the expected upstream Electron runtime, and has no release-blocking finding in the examined application behavior. It is suitable for continued native Windows testing and unsigned community distribution, subject to the transparent SmartScreen/publisher warning and scanner limitations stated above.
