# 案卷观察台

[中文说明](README.md) | [English](README.en.md) | [下载与校验 / Downloads](DOWNLOADS.md) | [代码签名政策 / Code signing](CODE_SIGNING_POLICY.md) | [安全说明 / Security](SECURITY.md) | [隐私说明 / Privacy](PRIVACY.md)

面向 macOS 与 Windows 的本地法律情报工作台，用于跟踪郭文贵相关刑事、民事、SEC/Fair Fund、破产、上诉、G 系列实体、资产和政策主线。程序保持中立，区分法院裁判、政府指控、当事人主张、第三方申请和公共镜像。

## 下载完整版

- [下载最新版本 / Download the latest release](../../releases/latest)
- [查看全部历史版本 / View all releases](../../releases)
- macOS：选择 `Docket-Observatory-<版本>-macOS-arm64.dmg`（Apple 芯片）或 `...-x64.dmg`（Intel）。
- Windows：选择 `Docket-Observatory-<版本>-Windows-x64.exe`。
- 每个 Release 应同时提供 `SHA256SUMS.txt`。下载后按 [DOWNLOADS.md](DOWNLOADS.md) 校验安装包哈希。

这是**完整版发行方案**，不是首次启动后再慢慢补齐的空壳。安装包包含截至发布基线日已审计的 1,605 条资料记录、1,578 份有效本地 PDF（约 1.3 GB）、SHA-256 完整性链，以及约 0.5 GB 的当前正文提取、现有译文/阅读辅助、逐文件法律解读、案件整体解读、关系/完整性审计和全文检索种子数据。加上 Electron、OCR 模型和运行依赖后，安装包和安装占用会明显大于普通工具；最终下载大小以 Release 页面为准，建议至少预留 5 GB 可用空间。发布版首次启动会校验内置研究种子的逐文件 SHA-256；校验失败时会停止启动并要求重新下载，不会降级成空资料库。

源代码仓库不直接提交这些大体积 PDF 和缓存，避免超过 GitHub 单文件/仓库限制。它们进入 DMG/EXE 前会由 `release:prepare-data` 清除开发机路径、设置、诊断和日志，并生成公开的 [资料库清单](release-metadata/corpus-manifest.json) 与 [解读缓存清单](release-metadata/seed-cache-manifest.json)。

## 能力边界 / Capability Matrix

首次启动不需要任何 API Key，用户立即获得与发布者完成时相同的资料基线、缓存解读和搜索能力。程序不会重新爬取、重新翻译或用较低层级输出覆盖这套历史基线。程序保持运行且联网时，默认每 30 分钟刷新公开来源并只处理增量变化；macOS 关闭窗口后按系统惯例仍可继续运行，Windows 关闭主窗口后退出。退出程序或关闭电脑后，后台任务停止。

| 模式 / Mode | 自动抓取与文件 / Discovery and files | 翻译 / Translation | 法律解读 / Legal reads |
| --- | --- | --- | --- |
| 无配置 / No configuration | 直接使用内置完整资料基线；联网后自动读取公开 CourtListener/RECAP、DOJ、SEC、Federal Register、Himalaya/Wayback 和 NFSC 备用来源并只做增量更新 / Uses the complete bundled baseline immediately, then discovers and downloads only public updates | 直接使用内置现有译文；新增文件可生成明确标注的初步阅读辅助，并与发布基线分层保存 / Uses bundled translation data; new files may receive clearly labeled preliminary reading aids stored separately from the release baseline | 直接使用内置逐文件和案件整体解读；新增文件可形成结构化初读，但不会覆盖或降级内置解读 / Uses bundled document and case reads; new filings may receive a preliminary structured read without overwriting the baseline |
| CourtListener Token | 增加 RECAP 完整案卷条目分页和已公开 PDF 的发现范围 / Adds full RECAP docket-entry pagination and broader discovery of public PDFs | 不改变 / No change | 不改变 / No change |
| 本机 Ollama / Local Ollama | 不改变来源覆盖 / No source-coverage change | 无付费云端 Key 的生成式全文翻译；质量取决于所选模型和硬件 / Generative full-text translation without a paid cloud key; quality depends on model and hardware | 本机生成式文件级、案件级解读 / Local generative document and case reads |
| 云端 AI / Cloud AI | 不改变来源覆盖 / No source-coverage change | 可选 OpenAI、Anthropic、Gemini，或配置 OpenAI-compatible 中转站/自托管服务；需明确授权发送提取正文 / Select an official provider or compatible gateway and explicitly allow extracted-body transmission | 分析与翻译可使用不同提供商和模型 ID；质量取决于模型能力、上下文和服务兼容性 / Analysis and translation may use different providers and model IDs; quality depends on model and service capability |
| PACER 凭证 / PACER credentials | **当前版本尚未实现 PACER 登录或付费下载适配器** / **PACER login and paid download are not implemented in this version** | 不改变 / No change | 不改变 / No change |

输入 CourtListener Token 只会改善 RECAP 覆盖。云端 AI 需要在设置中选择对应协议、填写 Key 和模型 ID；OpenAI-compatible 模式还需填写服务商的 Base URL。需要基于正文的完整翻译/解读时，还要明确授权发送提取正文。也可配置本机 Ollama，在不把正文发送到云端的情况下增强生成式翻译和解读。程序支持协议和自定义模型 ID，但不保证所有模型质量相同；小模型或不完整中转可能遗漏内容、误译法律术语或产生不稳定引用。任何模式都不能证明所有相关案件或文件已经收齐；PACER 仍是正式案卷。AI 输出仅作研究辅助，不是正式法律意见。

## Run Locally

Source development requires Node.js 22.12 or newer; Node 24 LTS is the recommended baseline and is recorded in `.nvmrc`. Packaged macOS and Windows users do not need Node.js.

```bash
nvm use
npm install
npm run dev:all
```

Open:

```text
http://127.0.0.1:5173
```

The local API runs on:

```text
http://127.0.0.1:4177
```

For isolated development or a second local API instance, set `GUO_INTEL_VITE_API_URL` before starting Vite. When Vite uses a port other than `5173`, add that port to `GUO_INTEL_ALLOWED_APP_PORTS`; only valid loopback ports are accepted by the API origin allowlist.

```bash
GUO_INTEL_ALLOWED_APP_PORTS=5187 GUO_INTEL_VITE_API_URL=http://127.0.0.1:4187 npm run dev -- --port 5187
```

## Key Commands

```bash
npm run dev:web       # Vite frontend only
npm run dev:api       # Local Express API only
npm run dev:all       # Frontend + API
npm run lint
npm run build
npm run security:check
npm run test:zero-key
npm run test:search:fixture
npm run download:docs # Download public linked PDFs into downloads/court-files-complete
npm run release:prepare-data # Sanitize and stage the full bundled research baseline
npm run release:verify-data  # Verify every bundled PDF and seed-cache hash
npm run desktop:dmg   # Build complete macOS arm64/x64 DMGs at the final packaging step
npm run desktop:exe   # Build complete Windows x64 EXE at the final packaging step
```

## Data Boundaries

The app separates source posture:

- Official court sources: PACER is the docket of record, but the current build does not yet implement PACER login or paid document retrieval.
- CourtListener/RECAP: without a token, the app reads public Atom feeds and anonymous structured search for 26 fixed tracked dockets, discovers the currently surfaced public RECAP PDFs, and downloads them. A `COURTLISTENER_TOKEN` is optional and enables full docket-entry pagination. PACER remains the docket of record.
- Official agencies: DOJ, SEC, Federal Register.
- Claims agents: GTV Fair Fund, Epiq.
- Historical project sources: the current Himalaya Restoration public site, archived `himalayarestoration.com` pages, and their previously public court-file links. These sources preserve publication history and party/project context; they are not treated as the official docket.
- Public mirrors: NFSC PDF mirror, treated as a mirror and not a docket of record.

Do not treat third-party filings, pro se petitions, agency allegations, media claims, or mirror summaries as court findings.

The application is intentionally neutral. Personal theories or political views are not encoded as analysis defaults.

## Settings

The fixed Settings control in the left rail opens a standalone bilingual screen with section navigation, encrypted credential input, official setup links, connection diagnostics, AI privacy controls, automation, processing limits, PACER fee guards, and local data paths:

- OpenAI Responses API, Anthropic Messages API, Google Gemini `generateContent`, and OpenAI-compatible `/chat/completions` gateways for optional document, event, case-level analysis, and full-text translation.
- Analysis and translation have independent provider and model-ID controls. Compatible gateways also expose a user-controlled Base URL for services such as OpenRouter, xAI/Grok, DeepSeek, Qwen, Moonshot, SiliconFlow, or a self-hosted compatible endpoint; names are examples, not a hardcoded model allowlist.
- Ollama for optional local generative document/case analysis and full-text translation without a paid cloud API key. The app connects only to the configured loopback address and does not install or download a model automatically.
- CourtListener/RECAP public Atom feeds and anonymous structured search for no-key fixed-docket updates and currently surfaced public PDF discovery, with an optional token for full docket-entry pagination.
- PACER username/password plus an optional billing client code as encrypted placeholders for a future fee-aware official adapter.
- Legal-analysis reasoning effort (`medium`, `high`, `xhigh`, or `max`) for supported GPT-5.6 models. This applies to event, document, and case reads, not translation or connection tests.
- Refresh cadence, short network-failure retry, automatic public-file processing scope, bilingual background output, local OCR fallback and limits, PDF extraction limits, translation chunk size, download concurrency, timeout, retries, and an informational PACER monthly budget.

Automatic processing is enabled by default for the highest-priority 120 incremental files per run. This limit bounds newly downloaded files and processing work; additional discoveries are retained in the manifest and resumed on later runs. Existing bundled files remain integrity-checked and their release-baseline translation/read caches are reused rather than regenerated. Files downloaded or updated in the current run are processed before older priority records so new filings cannot starve behind the existing corpus. A private local cursor rotates the remaining maintenance capacity without replacing the bundled baseline. Routine no-token portfolio search reads one result page, while an explicit full run reads up to five pages and removes the new-download limit. No-key runs can download, validate, hash, extract, OCR, index, and create clearly labeled preliminary reading assistance for new material. Cloud AI always requires an explicit credential and selected provider, so a fresh open-source install cannot create provider charges. Complete cross-language body translation and body-based generative analysis require either a working local Ollama model or an explicitly configured cloud provider.

In the Electron desktop build, macOS secrets use an AES-256-GCM vault with a Keychain key requested through a native no-authentication-UI context; Windows uses asynchronous DPAPI-backed `safeStorage`. The UI displays only masked status. The development web mode intentionally rejects secret writes without desktop encrypted storage. PACER automatic paid downloads are disabled by design.

All editable ordinary controls are persisted locally and are read by the runtime after saving; scheduler-related changes are applied immediately. The document and cache paths shown under diagnostics are app-managed, read-only locations rather than directory pickers. Moving the complete baseline would require a restart-safe migration and rollback workflow and is intentionally not exposed in this release. The PACER budget is also informational until the official adapter exists.

Connection status is intentionally distinct from credential status. PACER credentials can be stored, but the UI remains `Not implemented`. RECAP reports `Limited` without a token because public feeds and structured search work but do not provide full historical pagination; it can report `Available` after the token-enhanced REST path succeeds. Each cloud AI protocol has its own metadata-only connection test. Public DOJ, SEC, Federal Register, public RECAP discovery/downloads, and local PDF extraction require no user API key.

## Language

The UI supports Chinese and English. The backend accepts:

```text
/api/dashboard?lang=zh
/api/dashboard?lang=en
/api/documents?lang=zh
/api/documents?lang=en
/api/document-analysis?lang=zh
/api/document-analysis?lang=en
/api/monitoring-profile?lang=zh
/api/monitoring-profile?lang=en
/api/calendar?lang=zh
/api/calendar?lang=en
```

Chinese mode uses curated interface/event translations and preserves proper names, docket numbers, statutes, and established legal terms where clarity is better than over-translation. In the zero-key local mode, English PDF bodies receive a clearly labeled legal-glossary reading aid, not a complete translation. A complete generative body translation requires Ollama or a configured cloud protocol.

English API responses do not return untranslated Chinese PDF body text, page excerpts, titles, or raw local paths. The local source text remains in the PDF/extraction cache; the English response returns cached English translation when available, otherwise it retains page/hash/source metadata and marks translation as pending.

## AI Analysis

The app always has local rule-based event, document, and case analysis. It extracts cached local PDF text with `pdf-parse`; scanned pages without a text layer can fall back to bundled English and Simplified Chinese Tesseract.js models. OCR runs locally and does not upload page images. For optional no-paid-key generative analysis, install Ollama separately, pull a model, and select Ollama in Settings. Cloud protocols can also be configured through the UI or environment variables:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-sol
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_BASE_URL=https://provider.example/v1
TRANSLATION_MODEL=provider-specific-translation-model-id
```

The analysis prompt is source-posture aware: it separates court orders, agency allegations, party claims, public mirrors, and policy context. Document AI does not accept arbitrary local file paths from API requests; it uses the managed document manifest as its boundary. No provider receives raw PDF files or local paths. The Settings body-transmission switch governs every cloud provider and compatible gateway; extracted text is sent for full translation and document reads only after explicit opt-in. Loopback Ollama may process locally extracted text without enabling cloud transmission. Official OpenAI Requests use the Responses API with `store: false`; Anthropic, Gemini, and gateway retention follows the selected service policy. Reasoning effort is applied only where supported. On-demand document AI responses are cached locally under `server/cache/document-ai`.

Protocol compatibility is not a quality guarantee. Translation fidelity, legal reasoning, long-context coverage, citation stability, latency, and cost vary by model capability, context window, reasoning mode, provider implementation, and account limits. The application validates output structure, approved evidence IDs, and page citations before caching, but users should still verify material conclusions against the linked filing.

The no-key local analysis available for newly discovered files is preliminary deterministic research assistance, not generative AI and not legal advice. It is stored separately and does not replace the bundled release-baseline document or case reads. A fresh installation defaults to local processing and local/source-language behavior. Existing saved settings are preserved during upgrades, so the Settings screen may still show a cloud provider as selected even when its key is not configured; runtime capability labels and diagnostics remain authoritative.

## Documents

Downloaded public files live under:

```text
downloads/court-files-complete
```

That path is used during development. Complete DMG/EXE releases embed a sanitized read-only baseline under the application resources. Newly discovered or changed files are written to the user's writable application-data directory, while the release cache is copied into private per-user storage on first launch so future processing can update it. The default priority run processes at most 120 newly discovered files at a time, records the remaining discoveries, and resumes them on later runs.

Manifest:

```text
downloads/court-files-complete/manifest.json
```

Credential-gated sources are recorded in the manifest instead of being represented as downloaded. PACER remains the official docket of record and requires credentials plus fee controls. CourtListener/RECAP is the recommended no-fee substitute when PACER users have already mirrored the relevant docket or PDF. NFSC files are retained only as backup convenience copies.

The checked local corpus is not a complete universe of every Guo-related case or filing. As of the 2026-08-14 audit, the manifest contains 1,605 records and 1,578 valid local PDFs: 208 CourtListener/RECAP court-record files, 2 official SEC files, 34 original Himalaya Restoration Wayback PDF captures, and 1,334 NFSC backup-mirror files. The 27 retained error records describe unavailable source URLs, not 27 necessarily missing document contents: 22 historical project links have no archived PDF payload, 4 Wayback responses were truncated and rejected, and the NFSC `Doc 81-21` mirror URL returns HTTP 404. Every one of the 26 Himalaya source-path errors has a local RECAP or same-docket substitute; `Doc 81-21` remains the one unresolved mirror attachment, and no public RECAP payload was observed at its expected docket coordinate during this audit.

The Himalaya historical-site inventory covers 23 public pages, 29 dated page captures, and 60 distinct court-file links. Internet Archive reports PDF snapshots for 38 links; 34 are complete local PDFs and 4 are rejected as truncated. Fifty-six links have a separately downloaded CourtListener/RECAP counterpart: 48 map to the same docket document or attachment, while 8 project-site Chinese translations map to the official English docket filing and remain explicitly distinct variants. Hash comparison establishes only 3 byte-identical Wayback/RECAP pairs; matching docket coordinates with different bytes are not labeled byte-identical. The current project site contributes 14 searchable public-page records but currently exposes no direct PDF link.

The latest no-token CourtListener structured-search request was rate-limited with HTTP 429, so these counts cannot prove that no other public RECAP PDF exists. PACER, sealed or restricted filings, removed files, older results outside anonymous search windows, and unknown-name matters prevent any absolute completeness claim. PACER remains the official docket of record. The previously added `24-05249 Doc 192` remains hashed in the manifest and integrity history.

Downloader controls:

```bash
DOWNLOAD_CONCURRENCY=4
DOWNLOAD_TIMEOUT_MS=30000
DOWNLOAD_RETRIES=3
```

The downloader writes via temporary `.part` files, validates the `%PDF-` header, records file size, modification time, a SHA-256 digest, and verification time, retries transient failures with backoff, and records failures in the manifest. The default integrity mode reuses the prior digest after header, size, and modification-time checks; new or changed files are hashed in full. Settings also offers a slower mode that recomputes every file hash on every refresh. The UI reports both newly downloaded and already-present local files as local document availability.

The file-analysis pipeline translates and classifies every manifest item. It also performs local PDF snippet extraction for high-priority queue items and for individual documents analyzed on demand:

```bash
GUO_INTEL_PDF_TEXT_PAGE_LIMIT=3
GUO_INTEL_PDF_TEXT_CHAR_LIMIT=12000
GUO_INTEL_PDF_TEXT_BATCH_LIMIT=18
GUO_INTEL_FULL_TEXT_PAGE_LIMIT=80
GUO_INTEL_FULL_TEXT_CHAR_LIMIT=240000
GUO_INTEL_TRANSLATION_CHUNK_CHARS=12000
GUO_INTEL_AUTO_AI_DOCUMENTS=0
```

Snippet and long-text caches are stored under `server/cache/pdf-text` and are versioned and invalidated when file size, modification time, page limit, character limit, or extraction schema changes. Page snippets retain page numbers, character offsets, and hashes. Full translations are cached by page with source and translation hashes so reader citations can show the matching translation. Translation caches also carry an explicit schema version. In local-only mode, Chinese glossary output is stored as `assistive_only` and is never counted as a complete or partial body translation; English translation of Chinese source material remains blocked until a generative provider is available. The 2026-08-14 cache audit reports zero generated complete cross-language body translations. Bodies already written in the selected target language are tracked separately and must not be presented as generated translations.

Local OCR is enabled by default with a separate maximum page limit. Both OCR language models ship as npm dependencies; no language data is fetched from a CDN at runtime. The Tesseract worker is terminated and the PDF parser is destroyed after every extraction. Case-level AI uses a bounded evidence packet: high-value documents first, page citations where available, and a total body-text budget so scheduled runs remain predictable.

Automation runner:

```text
GET  /api/automation?lang=zh|en
POST /api/automation/start?lang=zh|en
```

Start payload:

```json
{
  "mode": "deep",
  "limit": 120,
  "includeAi": true,
  "includeTranslation": true
}
```

Use `"mode": "full"` and `"limit": "all"` only when you want a long-running pass over every public file. PACER remains credential- and fee-gated; the automation runner does not bypass PACER authentication or charge controls.

The scheduled desktop task can maintain Chinese, English, or both language caches from one source-refresh/download/extraction pass. The default is bilingual, with incremental priority-file processing selected unless the user explicitly chooses all files. It prevents overlapping runs, reuses the bundled historical cache, reschedules when Settings change, and uses the configured short retry delay when every public network source fails. Local extraction, OCR, indexing, and preliminary new-file reading assistance require no credential. Ollama generative work requires a reachable local model; cloud generative work requires the corresponding key, provider/model selection, and explicit permission before extracted body text is sent.

## Open Source and Security

Review these files before publishing or packaging:

```text
SECURITY.md
PRIVACY.md
OPEN_SOURCE_AUDIT.md
NETWORK.md
server/network-policy.cjs
scripts/security-check.mjs
```

The project has no telemetry, analytics SDK, remote database, auto-update service, or hidden background destination in the source tree. Outbound hosts are listed in `NETWORK.md` and enforced by `server/network-policy.cjs`.

## API Surface

```text
GET  /api/health
GET  /api/dashboard?lang=zh|en
GET  /api/events?lang=zh|en
GET  /api/sources?lang=zh|en
GET  /api/cases?lang=zh|en
GET  /api/entities?lang=zh|en
GET  /api/documents?lang=zh|en
GET  /api/document-analysis?lang=zh|en&catalog=compact|full&includeSnippets=0|1
GET  /api/document-catalog?lang=zh|en&q=&priority=all|critical|high|medium|low&offset=0&limit=12
GET  /api/monitoring-profile?lang=zh|en
GET  /api/calendar?lang=zh|en
GET  /api/automation?lang=zh|en
GET  /api/settings
POST /api/analyze?lang=zh|en
POST /api/analyze-document?lang=zh|en
POST /api/automation/start?lang=zh|en
POST /api/refresh?lang=zh|en
POST /api/settings/test-source
POST /api/settings/test-ai?lang=zh|en
PUT  /api/settings
```

## Final Packaging

See [RELEASING.md](RELEASING.md) and [SIGNING.md](SIGNING.md) for the bilingual full-release, signing, notarization, Windows-native code-signing, data-sanitization, and clean-build checklist. Do not package the raw developer cache; always stage the reviewed release baseline first.

Build a formally signed DMG only after all changes are done and Apple credentials are available:

```bash
npm run desktop:dmg
```

Packaging fails closed unless a valid Apple Developer ID identity and authenticated notarization credentials are available. The project does not produce an unsigned public DMG fallback.

For a zero-cost community build that users can still install with the operating system's explicit first-run confirmation:

```bash
npm run desktop:dmg:community
```

Windows community EXEs must be built on Windows with `npm run desktop:exe:community`. Community artifact names contain `-unsigned`; they never claim Apple notarization or a trusted Windows publisher. See [CODE_SIGNING_POLICY.md](CODE_SIGNING_POLICY.md) for the exact installation and verification boundary.
