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
  <a href="#quick-download"><strong>Download v0.1.1</strong></a> &middot;
  <a href="./DOWNLOADS.md"><strong>Illustrated Chinese/English install guide</strong></a> &middot;
  <a href="#core-capabilities">Capabilities</a> &middot;
  <a href="#evidence-sources-and-boundaries">Evidence boundaries</a> &middot;
  <a href="#local-first-and-security">Security</a> &middot;
  <a href="#feedback-and-contact">Feedback and contact</a> &middot;
  <a href="#run-from-source">Run from source</a>
</p>

> **Neutrality statement:** Court rulings, government or prosecution allegations, party positions, trustee filings, regulatory material, public mirrors, and policy context are labeled separately. No party's position is silently written as a judicial finding. AI output is research assistance, not attorney representation or formal legal advice.

## Quick Download

`v0.1.1` is the complete community edition. It carries a complete copy of the public release baseline prepared through August 15, 2026, together with its search indexes and existing bilingual research assistance. It is not a small client that downloads the historical library after first launch. “Complete” means that the installer carries this public release baseline; it does not mean that sealed, restricted, removed, or not-yet-public PACER material has been obtained. It currently ships for macOS and Windows desktop; there is no iPhone, iPad, or Android edition.

| Computer | Download | Size |
| --- | --- | ---: |
| Apple-silicon Mac | [Download macOS arm64 DMG](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.1/Docket-Observatory-0.1.1-macOS-arm64-unsigned.dmg) | about 1.84 GB |
| Intel Mac | [Download macOS x64 DMG](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.1/Docket-Observatory-0.1.1-macOS-x64-unsigned.dmg) | about 1.85 GB |
| Windows 10/11 64-bit | [Download Windows x64 EXE](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.1/Docket-Observatory-0.1.1-Windows-x64-unsigned.exe) | about 1.69 GB |

1. If you are unsure which Mac installer to use, open **About This Mac** and check whether the chip is Apple or Intel.
2. Download only from the [latest GitHub Release](https://github.com/Dysen177/docket-observatory/releases/latest) or the direct links above. The public Release uploads only three installers; GitHub's automatically generated Source code archives are source downloads, not the complete application.

> **Before installing:** All three installers are explicitly labeled free unsigned builds. macOS may require **Open Anyway** in Privacy & Security; Windows may require **More info** in SmartScreen. Do not disable operating-system security controls, and confirm that the installer came from this project's official GitHub Release.

> **First installation:** Follow the [step-by-step Chinese and English illustrated guide](DOWNLOADS.md) from downloading the DMG/EXE through successful launch. It covers macOS Privacy & Security, Touch ID/password authorization, Windows SmartScreen, and UAC. The guide images contain no real user's desktop, account name, or files.

### Release Validation

Free and unsigned means that no Apple Developer ID or commercial Windows publisher certificate was purchased; it does not mean that the installers are untested. Both `v0.1.1` DMGs passed image-integrity, read-only mount, application resource-seal, target-architecture, and native PDF dependency checks. The Windows EXE completed download, NSIS validation, installation, complete-corpus verification, renderer startup, running-app upgrade, post-upgrade startup, and uninstall on a native GitHub Windows runner. Source builds, search, credential encryption, and no-key defaults also passed on macOS and Windows.

- [Native Windows installer validation](https://github.com/Dysen177/docket-observatory/actions/runs/31884932315)
- [Cross-platform macOS / Windows source validation](https://github.com/Dysen177/docket-observatory/actions/runs/31885225295)

## Core Capabilities

| Workflow | What it provides |
| --- | --- |
| Docket monitoring | Refreshes allowlisted public feeds while online, discovers new or changed public material, and preserves source URLs, filing dates, and update status. |
| PDF library | Bundles 1,838 valid PDFs and supports full-text search for docket numbers, document numbers, people, companies, and keywords. |
| Historical public record | Separately indexes 2,523 accessible livestream/video source records from January 26, 2017 through March 14, 2023, plus a bundled catalog of 3,187 historical videos and 3,063 searchable original-language transcript records. Selecting a record immediately displays all locally stored transcript text on the right without another dialog. A keyword may match many distinct broadcasts, and every matching broadcast remains independently visible. Long-form broadcasts and excerpts/short videos are labeled separately; 239 public copies with a suspicious duration, start/end gap, low coverage ratio, or unusually sparse text are marked as possibly incomplete. Another 124 records are clearly marked as having no usable body. |
| Whole-library AI research chat | A separate sidebar workspace retrieves across court PDFs, translations and legal reads, transcript text, case timelines, entities, and policy material before a user-configured OpenAI, Claude, Gemini, compatible gateway, or Ollama model produces a cited answer. If no usable model is configured, chat is disabled instead of presenting ordinary retrieval as an AI judgment. |
| Bilingual reading | Places the source filing, available Chinese and English reading assistance, source links, source type, and verification status in one document view. |
| Plain-language and professional reads | Explains what happened, why it matters, and what remains uncertain while preserving court, docket, document, filing-date, source, and limitation details for professional research. |
| Case and relationship analysis | Organizes timelines and relationships across cases, parties, people, companies, funds, and bankruptcy-estate material. It separates public-record relationships from items requiring verification. |
| Local-first operation | No account, forced cloud service, advertising, telemetry, or hidden update channel. Credentials are encrypted locally and sent to a selected API only as HTTPS authentication when the user invokes that service. |

## Two Reading Layers

The same filing serves both general readers and legal or investigative professionals:

| General readers | Legal and investigative professionals |
| --- | --- |
| Start with what happened, why it matters, and what is uncertain. Complex procedure is explained in ordinary language, while analogies remain clearly explanatory rather than evidentiary. | Return directly to the original PDF, filing date, docket number, document number, and source URL. Court findings, allegations, party claims, and mirrors remain distinct. |

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
    <td width="50%" valign="top"><strong>Historical livestreams and public statements</strong><br><img src="./docs/screenshots/public-records.png" alt="Historical livestreams and public statements" width="100%"></td>
    <td width="50%" valign="top"><strong>Local settings and credential management</strong><br><img src="./docs/screenshots/settings.png" alt="Local settings" width="100%"></td>
  </tr>
</table>

## Complete Data Baseline

The current `v0.1.2` source release candidate includes:

- 1,865 material records;
- 2,523 content-deduplicated historical livestream/public-video records covering January 26, 2017 through March 14, 2023; 2,406 have an independently checked alternate copy;
- 3,187 historical video catalog entries, 3,063 searchable transcript records, and timed segments. Locally available transcript bodies, search indexes, and external recording links ship with the complete installer; third-party images, video, and audio are not stored;
- 1,838 valid PDFs totaling 1,570,950,358 bytes;
- all 1,795 content-deduplicated PDFs indexed for full-text search, with 1,770 complete extractions and 25 partial extractions limited by scan quality or source structure;
- a bilingual legal-reading baseline for every unique PDF: 88 version-locked professional editorial reviews and 1,707 deterministic local-rule first reads;
- bilingual case-level dossiers for all 131 cases, totaling 262 language versions;
- 67 reviewed complete Chinese translations, 1,685 assistive Chinese translations, and 43 retained Chinese-source documents; 48 PDFs meet both the complete-translation and professional-review standard;
- relationship attribution audited across 154 dockets: 76 supported by verified public evidence, 20 classified as probable, 39 excluded, and 19 awaiting more public evidence; pending dockets and their files remain included and searchable;
- 16,825 release seed-cache files totaling 735,603,674 bytes, covering extraction, translation and reading, relationship data, and search indexes.

A “local-rule first read” supports offline search, procedural classification, and plain-language orientation. It is not generative AI and is not represented as page-by-page attorney review. The interface keeps it separate from “professional review” and preserves the original PDF, source, filing date, and limitations for verification.

Automated publication checks flagged 240 files for possible privacy, sealing-language, or other risk indicators. All of those public files remain included; none was hidden, redacted, replaced, or excluded. The checks revalidated file structure, byte size, managed path, public HTTPS source, and source type, but they do not constitute page-by-page manual legal review. See the repository's [publication review](release-metadata/corpus-publication-review.md) and [per-file decisions](release-metadata/corpus-review-decisions.json).

## No Key And Custom Keys

| Capability | No key configured | User-provided key or Ollama |
| --- | --- | --- |
| Bundled corpus, search, and existing readings | Immediately available offline, including full-text search and case dossiers. | Remains available; adding a key never overwrites the bundled baseline. |
| New source refresh and downloads | Uses limited public feeds and search without a token; it cannot replace PACER. | A CourtListener/RECAP token can expand public docket pagination and PDF discovery. |
| Text extraction, OCR, and indexing | Runs locally with no cloud charge. | Still runs locally; new files can optionally be sent to the selected model after consent. |
| Generative translation and AI reads for new files | No-key mode does not pretend to be cloud AI; it provides deterministic local organization and assistive output. | Use a local Ollama model or an approved cloud model. Quality depends on the selected model. |
| Whole-library AI research chat | Chat is disabled; independent full-text search for court records and transcripts remains available. | Configure any supported model for multi-turn questions across the local library. Answers keep judicial findings, litigation claims, public statements, and policy context separate and expose the underlying evidence. |
| Official PACER docket | Login, paid retrieval, and automatic charges are not implemented in this version. | PACER fields are reserved in Settings; the application does not initiate paid requests. |

### AI Support And Quality Boundaries

The Settings page supports OpenAI Responses, Anthropic Messages, Google Gemini, Ollama, and a user-selected HTTPS OpenAI-compatible gateway, including compatible relay services. Translation and legal analysis can use separate providers and model IDs. Protocol compatibility does not make model quality equivalent: legal terminology, long-document coverage, citation stability, speed, and cost depend on the selected model, context window, reasoning settings, provider implementation, and account limits.

Cloud text transmission is off by default and must be enabled explicitly in Settings. Only after consent does the app send extracted text to the selected service; original PDFs and local paths are not sent. When a cloud model is invoked, that provider necessarily receives the API key as HTTPS authentication and the extracted text the user allowed. The app does not mix the key into document content or send either item to a separate project-operated server. Ollama connects only to the user's configured local loopback address.

## Automatic Updates And Processing

1. When online, the app refreshes allowlisted public sources on the configured schedule. Automatic refresh is enabled by default and can be disabled or rescheduled in Settings.
2. Where a source provides a usable public download URL, it downloads only new or changed files, confirms that the PDF structure is valid, records the source URL and filing date, and does not overwrite the published baseline.
3. With no key, it performs local extraction, OCR, indexing, and deterministic preliminary organization. Generative translation and AI reads for new files require Ollama or the user's cloud configuration.
4. Background processing can target priority files or all public files and can produce Chinese, English, or bilingual output. Full mode may take longer and use more API quota.

Automatic updates process public court materials and research data only. They do not silently replace the application, install a new version, or execute unknown code. Users update the application by downloading and installing a release from the official GitHub page.

## Evidence Sources And Boundaries

| Source | Role in the application | How to interpret it |
| --- | --- | --- |
| PACER | Official federal court docket of record. | The authoritative federal docket source; paid login and automatic retrieval are not implemented in this version. |
| CourtListener / RECAP | Primary no-fee public substitute when a filing is mirrored. | Public dockets and PDFs synchronized by PACER users; a filing may be absent if nobody has contributed it. |
| DOJ, SEC, and Federal Register | Official agency and policy material. | Useful for releases, complaints, orders, and policy context; not necessarily a court docket. |
| Historical Himalaya Restoration pages and web archives | Historical public context and document leads. | Public pages or mirrors, not the official docket of record. |
| NFSC | Backup public mirror. | Not the official docket of record; important material should be compared with PACER or RECAP. |
| YouTube, GETTR, Rumble, and Odysee | Accessible repost copies for historical public-statement research. | Availability does not establish that the uploader is the original publisher or that statements in a video are true. Installers do not bundle third-party video, audio, images, or thumbnails. |

Each item should expose an external link, filing date, docket number, document number, source type, and verification note. A mirror does not become a judicial finding merely because it is available. PACER, sealed or restricted filings, removed files, unmirrored PDFs, and records outside anonymous search windows can create coverage gaps, so the app makes no claim of absolute completeness.

## Case Scope

This is not a general-purpose docket browser. It is a focused legal-research workbench built around Guo Wengui (Miles Guo / Ho Wan Kwok) and the related litigation network. The current baseline covers criminal, civil, appellate, securities, GTV / Fair Fund, bankruptcy-estate, forfeiture, related-person, entity, company, fund, and policy-monitoring tracks. The relationship graph records associations found in public material and distinguishes verified public relationships, probable relationships, and items requiring human verification. It does not infer ownership, control, conspiracy, or liability.

## Local-First And Security

- No user-account system, advertising SDK, analytics SDK, telemetry SDK, remote database, or hidden update channel.
- Electron context isolation, sandboxing, external-link validation, loopback API allowlisting, ASAR integrity, and Electron Fuses hardening.
- macOS credentials use a Keychain-protected encrypted vault; Windows credentials use DPAPI-backed `safeStorage`. Full secrets are never returned to the UI; a selected external API receives a key only when the user actually invokes that service and authentication requires it.
- Source code, lockfile, network allowlist, corpus manifests, publication-review evidence, and the complete build workflow are available in the repository.

The current audit found no known backdoor or hidden collection path. That is not an absolute guarantee against future dependencies, a compromised operating system, a compromised build environment, or malicious third-party repackaging. See [open-source audit notes](OPEN_SOURCE_AUDIT.md), [security policy](SECURITY.md), [privacy notice](PRIVACY.md), [network manifest](NETWORK.md), and [installation instructions](DOWNLOADS.md).

## Feedback And Contact

Use the channel that matches the issue so reports remain reproducible, trackable, and visible through resolution:

| Issue type | Preferred channel |
| --- | --- |
| Application bugs, crashes, installation, or interface problems | [Submit a Bug Report](https://github.com/Dysen177/docket-observatory/issues/new?template=bug-report.yml) with the version, operating system, reproduction steps, and sanitized logs. |
| Missing cases, dockets, or court filings | [Submit a Source Gap](https://github.com/Dysen177/docket-observatory/issues/new?template=source-gap.yml) with the court, docket number, document number, and a public source link when available. |
| Exploitable security vulnerabilities | Do not open a public Issue. Use [GitHub private vulnerability reporting](https://github.com/Dysen177/docket-observatory/security/advisories/new); use email only if that channel is unavailable. |
| Other matters that should not be discussed publicly | Email [poison127@protonmail.com](mailto:poison127@protonmail.com). Suggested subject: `[Docket Observatory] Bug / Security / Source`. |
| Project updates and public contact | X: [@Dysen1777](https://x.com/Dysen1777); [project announcement post](https://x.com/Dysen1777/status/2088677729109717489?s=20). |

Never send API keys, PACER passwords, private local paths, sealed or restricted material, or unsanitized logs containing credentials through GitHub Issues, email, or X. Use GitHub Issues for ordinary bugs so other users can find related reports and follow their status.

## Run From Source

Packaged users do not need Node.js. Source development requires Node.js 22.12 or newer; Node.js 24 is recommended.

```bash
nvm use
npm ci
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

## Security And Project Documentation

- [Illustrated Chinese and English installation guide](DOWNLOADS.md)
- [Open-source audit notes](OPEN_SOURCE_AUDIT.md)
- [Security policy](SECURITY.md), [privacy notice](PRIVACY.md), and [network manifest](NETWORK.md)
- [Code-signing policy](CODE_SIGNING_POLICY.md) and [GitHub operations](GITHUB_OPERATIONS.md)
- [v0.1.1 release notes](release-notes/v0.1.1.md) and [GitHub Release installers](https://github.com/Dysen177/docket-observatory/releases/tag/v0.1.1)

## License

The source code is released under the MIT License. Court PDFs, government records, third-party web pages, and other research materials do not automatically receive new copyright permission from this license; their original source, copyright, and redistribution terms still apply. Contributions, audits, and issue reports are welcome. The Chinese documentation is [README.md](README.md).
