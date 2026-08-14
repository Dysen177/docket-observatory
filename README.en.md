<p align="right"><a href="./README.md">中文</a> | <strong>English</strong></p>

<p align="center">
  <img src="./src/assets/brand-logo.png" width="112" alt="Docket Observatory logo">
</p>

# Docket Observatory

<p align="center"><strong>案卷观察台</strong></p>

<p align="center">
  A local-first legal research workbench purpose-built to research and track U.S. court cases and regulatory matters involving Guo Wengui (Miles Guo / Ho Wan Kwok), including criminal, civil, appellate, securities, GTV / Fair Fund, bankruptcy-estate, forfeiture, and related-person, company, fund, and entity matters.
</p>

<p align="center">
  <a href="https://github.com/Dysen177/docket-observatory/releases/latest"><img src="https://img.shields.io/github/v/release/Dysen177/docket-observatory?label=latest%20release" alt="latest release"></a>
  <a href="https://github.com/Dysen177/docket-observatory/actions/workflows/ci.yml"><img src="https://github.com/Dysen177/docket-observatory/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status"></a>
  <a href="https://github.com/Dysen177/docket-observatory/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-1f8a70.svg" alt="MIT License"></a>
  <a href="https://github.com/Dysen177/docket-observatory"><img src="https://img.shields.io/badge/mode-local--first-4d7cff.svg" alt="local-first"></a>
</p>

<p align="center">
  <a href="#quick-download"><strong>Download v0.1.0</strong></a> &middot;
  <a href="./DOWNLOADS.md"><strong>Illustrated Chinese/English install guide</strong></a> &middot;
  <a href="#core-capabilities">Capabilities</a> &middot;
  <a href="#evidence-sources-and-boundaries">Evidence boundaries</a> &middot;
  <a href="#local-first-and-security">Security</a> &middot;
  <a href="#run-from-source">Run from source</a>
</p>

> **Neutrality statement:** Court rulings, government or prosecution allegations, party positions, trustee filings, regulatory material, public mirrors, and policy context are labeled separately. No party's position is silently written as a judicial finding. AI output is research assistance, not attorney representation or formal legal advice.

## Quick Download

`v0.1.0` is the complete community edition. It bundles the release-baseline legal corpus, search indexes, and existing bilingual research assistance. It is not a small client that downloads the historical library after first launch.

| Computer | Download | Size |
| --- | --- | ---: |
| Apple-silicon Mac (M1, M2, M3, or M4) | [Download macOS arm64 DMG](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/Docket-Observatory-0.1.0-macOS-arm64-unsigned.dmg) | about 1.58 GB |
| Intel Mac | [Download macOS x64 DMG](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/Docket-Observatory-0.1.0-macOS-x64-unsigned.dmg) | about 1.58 GB |
| Windows 10/11 64-bit | [Download Windows x64 EXE](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/Docket-Observatory-0.1.0-Windows-x64-unsigned.exe) | about 1.47 GB |

1. If you are unsure which Mac installer to use, open **About This Mac** and check whether the chip is Apple or Intel.
2. Optional but recommended: download the matching [`SHA256SUMS.txt`](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/SHA256SUMS.txt) and follow [Download, install, and verify](DOWNLOADS.md) to compare file fingerprints.
3. Download only from the [latest GitHub Release](https://github.com/Dysen177/docket-observatory/releases/latest) or the direct links above. GitHub's automatically generated source archives are not the complete application.

> **Why compare SHA-256?** `SHA256SUMS.txt` is not an installation component and the application never reads it. It is a plain-text list of the expected 64-character hexadecimal "digital fingerprint" for each installer in this Release. Comparing the fingerprint calculated on your computer with the line for the same filename detects incomplete downloads, corruption, stale installers, or changed bytes. An exact match means the downloaded file is byte-for-byte identical to the file published by this project; do not install it if even one character differs. This check alone does not prove that software is malware-free, so also consider the official source, open code, signing status, SBOM, and security audits. You may delete `SHA256SUMS.txt` after the comparison.

> **Before installing:** All three installers are explicitly labeled free unsigned builds. macOS may require **Open Anyway** in Privacy & Security; Windows may require **More info** in SmartScreen. Do not disable operating-system security controls. Confirm the filename and SHA-256 first.

> **First installation:** Follow the [step-by-step Chinese and English illustrated guide](DOWNLOADS.md) from downloading the DMG/EXE through successful launch. It covers macOS Privacy & Security, Touch ID/password authorization, Windows SmartScreen, and UAC. The guide images contain no real user's desktop, account name, or files.

## Core Capabilities

| Workflow | What it provides |
| --- | --- |
| Docket monitoring | Refreshes allowlisted public feeds while online, discovers new or changed public material, and preserves source URLs, filing dates, and local hashes. |
| PDF library | Bundles 1,578 valid PDFs and supports full-text search for docket numbers, document numbers, people, companies, and keywords. |
| Bilingual reading | Places the source filing, available Chinese and English reading assistance, source links, and evidence posture in one document view. |
| Plain-language and professional reads | Explains what happened, why it matters, and what remains uncertain while preserving court, docket, document, filing-date, source, and limitation details for professional research. |
| Case and relationship analysis | Organizes timelines and relationships across cases, parties, people, companies, funds, and bankruptcy-estate material. It separates public-record relationships from items requiring verification. |
| Local-first operation | No account, forced cloud service, advertising, telemetry, or hidden update channel. User credentials are encrypted locally. |

## Two Reading Layers

The same filing serves both general readers and legal or investigative professionals:

| General readers | Legal and investigative professionals |
| --- | --- |
| Start with what happened, why it matters, and what is uncertain. Complex procedure is explained in ordinary language, while analogies remain clearly explanatory rather than evidentiary. | Return directly to the original PDF, filing date, docket number, document number, source URL, and hash. Court findings, allegations, party claims, and mirrors remain distinct. |

## Interface Preview

These screenshots are from the current application build.

<table>
  <tr>
    <td width="50%" valign="top"><strong>Case overview</strong><br><img src="./docs/screenshots/home.png" alt="Case overview" width="100%"></td>
    <td width="50%" valign="top"><strong>Evidence library and full-text search</strong><br><img src="./docs/screenshots/documents.png" alt="Evidence library" width="100%"></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><strong>Case portfolio and case-level reading</strong><br><img src="./docs/screenshots/cases.png" alt="Case portfolio" width="100%"></td>
    <td width="50%" valign="top"><strong>People, companies, and case relationships</strong><br><img src="./docs/screenshots/entities.png" alt="Case relationships" width="100%"></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><strong>Local settings and credential management</strong><br><img src="./docs/screenshots/settings.png" alt="Local settings" width="100%"></td>
    <td width="50%" valign="top"><br></td>
  </tr>
</table>

## Complete Data Baseline

`v0.1.0` includes:

- 1,605 material records;
- 1,578 valid PDFs totaling 1,345,988,147 bytes;
- 1,559 unique PDF content hashes and full-text index coverage;
- 12,259 research-seed files totaling 500,592,021 bytes;
- 1,559 bilingual document-level legal readings and 58 bilingual case-level dossiers.

All 213 publication-review-flagged files remain included. None was hidden, redacted, replaced, or excluded. The review rechecked each file's PDF structure, byte size, SHA-256, managed path, public HTTPS source, and source posture. It does not claim that the development heuristic was a page-by-page manual legal review. See the [publication review](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/corpus-publication-review.md) and [per-file decisions](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/corpus-review-decisions.json).

## No Key And Custom Keys

| Capability | No key configured | User-provided key or Ollama |
| --- | --- | --- |
| Bundled corpus, search, and existing readings | Immediately available offline, including full-text search and case dossiers. | Remains available; adding a key never overwrites the bundled baseline. |
| New source refresh and downloads | Uses limited public feeds and search without a token; it cannot replace PACER. | A CourtListener/RECAP token can expand public docket pagination and PDF discovery. |
| Text extraction, OCR, and indexing | Runs locally with no cloud charge. | Still runs locally; new files can optionally be sent to the selected model after consent. |
| Generative translation and AI reads for new files | No-key mode does not pretend to be cloud AI; it uses local assistive output. | Use a local Ollama model or an approved cloud model. Quality depends on the selected model. |
| Official PACER docket | Login, paid retrieval, and automatic charges are not implemented in this version. | PACER fields are reserved in Settings; the application does not initiate paid requests. |

### AI Support And Quality Boundaries

Settings supports OpenAI Responses, Anthropic Messages, Google Gemini, Ollama, and an OpenAI-compatible gateway at a user-selected HTTPS Origin. Translation and legal analysis can use separate providers and model IDs. Protocol compatibility does not make model quality equivalent: legal terminology, long-document coverage, citation stability, speed, and cost depend on the selected model, context window, reasoning settings, provider implementation, and account limits.

Cloud body transmission is off by default and must be enabled explicitly in Settings. Original PDFs, local paths, and keys are not uploaded by default. Ollama connects only to the user's configured local loopback address.

## Automatic Updates And Processing

1. When online, the app refreshes allowlisted public sources on the configured schedule. Automatic refresh is enabled by default and can be disabled or rescheduled in Settings.
2. It downloads only new or changed public files, validates the PDF signature, records the source URL, filing date, and SHA-256, and does not overwrite the published baseline.
3. With no key, it performs local extraction, OCR, indexing, and deterministic preliminary organization. Generative translation and AI reads for new files require Ollama or the user's cloud configuration.
4. Background processing can target priority files or all public files and can produce Chinese, English, or bilingual output. Full mode may take longer and use more API quota.

## Evidence Sources And Boundaries

| Source | Role in the application | How to interpret it |
| --- | --- | --- |
| PACER | Official federal court docket of record. | The record of docket; paid login and automatic retrieval are not implemented in this version. |
| CourtListener / RECAP | Primary no-fee public substitute when a filing is mirrored. | Public dockets and PDFs synchronized by PACER users; a filing may be absent if nobody has contributed it. |
| DOJ, SEC, and Federal Register | Official agency and policy material. | Useful for releases, complaints, orders, and policy context; not necessarily a court docket. |
| Historical Himalaya Restoration pages and web archives | Historical public context and document leads. | Public pages or mirrors, not the official docket of record. |
| NFSC | Backup public mirror. | Not the record of docket; important material should be compared with PACER or RECAP. |

Each item should expose an external link, filing date, docket number, document number, source type, and verification note. A mirror does not become a judicial finding merely because it is available. PACER, sealed or restricted filings, removed files, unmirrored PDFs, and records outside anonymous search windows can create coverage gaps, so the app makes no claim of absolute completeness.

## Case Scope

This is not a general-purpose docket browser. It is a focused legal-research workbench built around Guo Wengui (Miles Guo / Ho Wan Kwok) and the related litigation network. The current baseline covers criminal, civil, appellate, securities, GTV / Fair Fund, bankruptcy-estate, forfeiture, related-person, entity, company, fund, and policy-monitoring tracks. The relationship graph records associations found in public material and distinguishes verified public relationships, probable relationships, and items requiring human verification. It does not infer ownership, control, conspiracy, or liability.

## Local-First And Security

- No user-account system, advertising SDK, analytics SDK, telemetry SDK, remote database, or hidden update channel.
- Electron context isolation, sandboxing, external-link validation, loopback API allowlisting, ASAR integrity, and Electron Fuses hardening.
- macOS credentials use a Keychain-protected encrypted vault; Windows credentials use DPAPI-backed `safeStorage`. Full secrets are never returned to the UI.
- Source code, lockfile, network allowlist, corpus manifests, SBOM, build provenance, checksums, and publication-review evidence are public.

The current audit found no known backdoor or hidden collection path. That is not an absolute guarantee against future dependencies, a compromised operating system, a compromised build environment, or malicious third-party repackaging. See [open-source audit notes](OPEN_SOURCE_AUDIT.md), [security policy](SECURITY.md), [privacy notice](PRIVACY.md), [network manifest](NETWORK.md), and [download verification](DOWNLOADS.md).

## Run From Source

Packaged users do not need Node.js. Source development requires Node.js 22.12 or newer; Node.js 24 is recommended.

```bash
nvm use
npm install
npm run dev:all
```

Open `http://127.0.0.1:5173`. Useful checks:

```bash
npm run lint
npm run build
npm run security:check
npm run test:zero-key
npm run test:search
```

## Documentation And Release Evidence

- [Download, install, and SHA-256 verification](DOWNLOADS.md)
- [Open-source audit notes](OPEN_SOURCE_AUDIT.md)
- [Security policy](SECURITY.md), [privacy notice](PRIVACY.md), and [network manifest](NETWORK.md)
- [Code-signing policy](CODE_SIGNING_POLICY.md) and [GitHub operations](GITHUB_OPERATIONS.md)
- [v0.1.0 release notes](release-notes/v0.1.0.md) and [GitHub Release assets and evidence](https://github.com/Dysen177/docket-observatory/releases/tag/v0.1.0)

## License

MIT License. Contributions, audits, and issue reports are welcome. The Chinese documentation is [README.md](README.md).
