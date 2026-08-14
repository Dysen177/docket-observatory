# Docket Observatory

A local legal-research workbench for macOS and Windows. It brings public court records, agency materials, case timelines, full-text PDF search, bilingual reading, source verification, and cross-case relationships into one desktop application.

The application is source-neutral. Court rulings, government allegations, party positions, trustee filings, regulatory records, public mirrors, and media material are labeled separately. A party's allegation is never silently presented as a judicial finding.

## Screenshots

These images are captured from the current running application.

### Case overview

![Case overview](docs/screenshots/home.png)

### Case portfolio and case-level reading

![Case portfolio](docs/screenshots/cases.png)

### Evidence library and full-text search

![Evidence library](docs/screenshots/documents.png)

### People, entities, and case relationships

![Case relationship graph](docs/screenshots/entities.png)

### Local settings and credential management

![Local settings](docs/screenshots/settings.png)

## Download The Complete Edition

### The simple download path

1. Open the [latest GitHub Release](https://github.com/Dysen177/docket-observatory/releases/latest).
2. Scroll to **Assets**. Do not download the automatically generated source archives if you need the application: source archives do not contain the bundled legal corpus.
3. Choose one installer:
   - Apple-silicon Mac (M1, M2, M3, or M4): download the `.dmg` containing `macOS-arm64`.
   - Intel Mac: download the `.dmg` containing `macOS-x64`.
   - 64-bit Windows: download the `.exe` containing `Windows-x64`.
4. Download the matching `SHA256SUMS.txt` and follow [Download, install, and verify](DOWNLOADS.md).
5. Open the installer. On macOS, drag the application to **Applications**. On Windows, follow the installer wizard.

If the latest Release page says that no release has been published, installers are not available yet. The source repository cannot provide the complete application by itself. Check the [all releases page](https://github.com/Dysen177/docket-observatory/releases) or run from source using the instructions below. The project does not present an empty shell as a complete edition.

### Why the package is large

This is a complete-data release, not a small client that downloads the historical library after first launch. The package includes the reviewed baseline available on the release date:

- 1,605 material records;
- 1,578 valid local PDFs, approximately 1.3 GB;
- SHA-256 file manifests and the integrity history chain;
- extracted text, full-text search indexes, and available Chinese and English reading aids;
- document-level legal readings, case-level dossiers, relationship data, and source-verification data;
- the Electron runtime and bundled English and Simplified Chinese OCR models.

The installer and installed application therefore require substantially more space than an ordinary notes or search tool. Keep at least 5 GB free before installing; the exact size is shown on the Release page. On first launch, the app verifies the bundled seed hashes. A failed verification stops startup and asks for a fresh download instead of silently falling back to an empty or lower-quality corpus.

## What Works Without A Key

The first launch needs no account, API key, or paid PACER credential. With no configuration, users can:

- read the complete bundled baseline, existing translations, document readings, and case-level dossiers;
- search docket numbers, document numbers, people, companies, cases, and keywords inside indexed PDF text;
- while online, read public updates from CourtListener/RECAP, the U.S. Department of Justice, the Securities and Exchange Commission, the Federal Register, archived public pages, and other allowlisted public sources;
- download only new or changed public files, retaining source URLs, source posture, dates, and local hashes;
- extract text, run local OCR, build indexes, and create deterministic preliminary organization for new files;
- keep the bundled release-baseline analysis intact instead of regenerating weaker output when no key is configured.

The no-key mode does not create cloud AI charges. Local preliminary output for new files is labeled as preliminary reading assistance; it is not generative AI and is not legal advice.

## What Keys Add

Settings supports official APIs and OpenAI-compatible protocols. Users control their own configuration and can enter, replace, delete, and test their own credentials. The project does not ship a developer key and never commits credentials to the repository:

- OpenAI Responses API;
- Anthropic Messages API;
- Google Gemini `generateContent`;
- any OpenAI-compatible gateway with a user-selected Base URL, including services such as OpenRouter, xAI, DeepSeek, Qwen, Moonshot, SiliconFlow, or a self-hosted endpoint;
- local Ollama for generative translation and analysis without sending document text to a cloud provider;
- a CourtListener/RECAP token for broader public docket pagination and discovery;
- PACER fields reserved for a future official, fee-aware adapter. The current version does not log in, charge, or bypass PACER.

Translation and legal analysis can use separate providers and model IDs. Protocol compatibility does not make model quality equivalent: fidelity, legal terminology, long-document coverage, citation stability, speed, and cost depend on the selected model, context window, reasoning settings, provider implementation, and account limits. Stronger models generally provide more complete translations and more stable document- and case-level analysis, but every AI result must be checked against the source filing and is not formal legal advice.

Cloud body transmission is opt-in in Settings. PDFs, local developer paths, and secrets are not uploaded to AI providers by default. Ollama is restricted to the configured loopback address.

## Sources And Evidence Posture

| Source | Role in the application |
| --- | --- |
| PACER | Official federal court docket of record; paid login and automatic retrieval are not implemented in this version |
| CourtListener/RECAP | Free public docket and PDF mirror; anonymous public updates work without a token, while a token expands pagination |
| DOJ, SEC, and Federal Register | Official agency announcements, complaints, orders, and policy material |
| Historical Himalaya Restoration pages and web archives | Public historical context and document leads; not the official docket of record |
| NFSC | Backup public mirror; never treated as the docket of record and never preferred over official or RECAP evidence |

Each item exposes an external link, filing date, docket number, document number, source type, confidence, and verification note. A public mirror does not become a judicial finding merely because it is available. PACER, sealed or restricted filings, removed files, and records outside anonymous search results can create coverage gaps, so the application does not claim absolute completeness.

## Case Scope

The current baseline covers Guo-related criminal, civil, appellate, securities, GTV/Fair Fund, bankruptcy-estate, forfeiture, related-person, entity, company, fund, and policy-monitoring tracks. The relationship graph records associations found in public materials and distinguishes verified public relationships, probable relationships, and items needing manual verification. It does not infer ownership, control, conspiracy, or liability.

## Run From Source

Source development requires Node.js 22.12 or newer; Node.js 24 is recommended and recorded in `.nvmrc`. Packaged users do not need Node.js.

```bash
nvm use
npm install
npm run dev:all
```

Open `http://127.0.0.1:5173`.

Useful commands:

```bash
npm run dev:web                 # frontend only
npm run dev:api                 # local API only
npm run dev:all                 # frontend and local API
npm run lint                    # source linting
npm run build                   # production build
npm run security:check          # security and dependency checks
npm run test:zero-key           # no-key defaults
npm run test:search:fixture     # search fixture
```

## Privacy And Security

This is a local-first open-source desktop application. It has no user-account system, advertising SDK, analytics SDK, telemetry SDK, remote database, or hidden update channel. Electron uses context isolation, sandboxing, strict external-link validation, loopback API allowlisting, ASAR integrity, and Electron Fuses hardening. macOS credentials use a Keychain-protected encrypted vault; Windows credentials use DPAPI-backed `safeStorage`. The UI receives masked status only.

The source, lockfile, network allowlist, corpus manifest, cache hashes, and release verification files are public for inspection. Open source does not prove that a third-party repackaged binary is trustworthy: download binaries only from this project's GitHub Releases and verify the signature and `SHA256SUMS.txt`. See [security policy](SECURITY.md), [privacy notice](PRIVACY.md), [network allowlist](NETWORK.md), and [open-source audit](OPEN_SOURCE_AUDIT.md).

The current audit found no known backdoor or hidden collection path. That is not an absolute guarantee against future dependencies, a compromised operating system, a compromised build environment, or malicious third-party distribution. Report security issues according to [SECURITY.md]; never paste API keys, PACER passwords, private files, or local paths into public issues.

## License

MIT License. Browse the [GitHub repository](https://github.com/Dysen177/docket-observatory). The Chinese documentation is [README.md](README.md).
