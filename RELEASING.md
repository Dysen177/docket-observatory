# 完整版发布指南 / Complete Release Guide

[中文](#中文发布流程) | [English](#english-release-process) | [签名说明 / Signing](SIGNING.md) | [下载说明 / Downloads](DOWNLOADS.md)

## 中文发布流程

### 发布内容

每个正式版本应提供：

- `Docket-Observatory-<版本>-macOS-arm64.dmg`
- `Docket-Observatory-<版本>-macOS-x64.dmg`
- `Docket-Observatory-<版本>-Windows-x64.exe`
- `SHA256SUMS.txt`
- GitHub 自动生成的 Source code (`zip` / `tar.gz`)
- 中英文 Release Notes，写明资料基线日期、文件数、来源覆盖、已知缺口和安全变更

程序采用完整版发行：内置经审计的法院 PDF 基线和当前有效研究缓存。源代码仓库继续忽略 `downloads/`、`server/cache/` 和 `release-data/`，避免把开发机原始数据、日志或设置直接推送到 GitHub。

### 数据准备

`npm run release:prepare-data` 会：

1. 从 `downloads/court-files-complete/manifest.json` 生成去除本机路径的公开 corpus manifest。
2. 按当前全文索引挑选现行 PDF 正文、译文和文件解读缓存，不携带旧版本重复缓存。
3. 为每个案件保留中英文最新版整体解读。
4. 保留完整性/关系审计、来源状态和全文索引。
5. 排除 `app-settings.json`、密钥、诊断、自动化历史、日志和开发机路径。
6. 生成 `release-metadata/corpus-manifest.json`、`seed-cache-manifest.json` 和内部 `release-seed.json`。

数据准备完成后必须运行 `npm run release:verify-data`。该检查会重新验证 1,578 份有效 PDF 的头尾结构、字节数和 SHA-256，并核对每个种子缓存文件的 SHA-256；任何不一致都会阻止打包。

### 代码检查

使用 Node.js 24 LTS：

```bash
nvm use
npm ci
npm run release:preflight:environment
npm run lint
npm run build
npm run test:zero-key
npm run test:settings
npm run test:keychain:no-ui
npm run test:credential-vault
npm run test:electron-worker
npm run release:test-seed-install
npm run test:search:fixture
npm run test:search:corpus
npm run security:check
npm run release:audit-research
npm run release:audit-corpus-risk
npm run release:verify-corpus-review
npm run release:prepare-data
npm run release:verify-data
npm run release:create-input-manifest
npm sbom --omit=dev --sbom-format=cyclonedx > SBOM.cdx.json
```

`release:audit-research` 会把人工深度研究、本地规则解读、正文提取、翻译层级和未解决缺口写入 `output/research-audit/`。发布说明必须使用这份结果区分“已收录”“已有双语解读”“完整生成式全文翻译”和“人工律师级深度研究”，不能把这些层级合并成同一个完成度承诺。`SBOM.cdx.json` 应作为 Release 资产发布，便于外部复核生产依赖。

`release:audit-corpus-risk` 会扫描现行全文索引中的密封/限制措辞、可能未遮蔽的身份或账户信息、未成年人/医疗记录提示和批量 HID 标识，只输出风险类别与文件坐标，不复制命中正文。人工复核结果必须写入 `release-metadata/corpus-review-decisions.json`；`release:verify-corpus-review` 要求每个命中项都有审核人、时间、法律依据、理由和 `approved_public` / `exclude` / `redacted_public` 决定，否则禁止打包。

`npm run test:keychain:no-ui` 验证 macOS 原生钥匙串调用明确禁用认证界面；`npm run test:credential-vault` 继续验证 AES-256-GCM 写入、磁盘无明文和重新加载解密。`npm run test:safe-storage` 使用隔离后端验证 Electron API；Windows 正式 EXE 仍需在 Windows 发布机或签名 CI 中复核原生 DPAPI、安装目录和升级行为。macOS 不得运行 `test:safe-storage:native`，因为正式应用不再使用 Electron 的可交互 Keychain 后端。

### 打包

最终开发完成后再执行：

```bash
npm run desktop:dmg
npm run desktop:exe
npm run release:verify:mac
npm run release:verify:win
npm run release:finalize
```

`desktop:dmg` 和 `desktop:exe` 会先运行签名预检；没有 Developer ID/公证凭据或 Windows 代码签名配置时，在处理完整数据前直接失败。DMG 需要 Apple Developer ID Application 签名、notarization 和 stapling。EXE 需要可信 Windows 代码签名证书和时间戳。`release:verify:mac` 会复核 Gatekeeper、codesign 和 stapling，`release:verify:win` 会复核 Authenticode 和时间戳；`release:finalize` 只有在 DMG 和 EXE 同时存在时才生成 `SBOM.cdx.json`、`BUILD-PROVENANCE.json` 和 `SHA256SUMS.txt`。签名证书、私钥、Apple issuer/key id 和时间戳服务凭证只能放在发布者的安全密钥库或 CI Secrets 中，不能提交到仓库。

正式跨平台构建使用 `.github/workflows/signed-complete-release.yml`。Mac 自托管 runner 必须持有 Developer ID 私钥、`APPLE_KEYCHAIN_PROFILE` 和本机完整资料源；Windows 安装包由 GitHub 的 `windows-latest` 原生 runner 使用 `WINDOWS_CSC_LINK` / `WINDOWS_CSC_KEY_PASSWORD` Secrets 构建。详见 [SIGNING.md](SIGNING.md)。

当前完整资料和研究种子原始体积约 1.8 GB，压缩后的单个 GitHub Release 资产必须低于 GitHub 的单文件限制。若超限，应清理未被现行索引引用的历史重复缓存，不能删除当前有效 PDF、现行解读或完整性清单，也不能把用户引导到来源不明的二次打包下载。

### 全新安装验收

1. 在没有旧应用数据的新 macOS 用户和 Windows 用户环境安装。
2. 断网启动，确认立即显示内置资料库、已有解读、案件整体解读和搜索结果。
3. 确认设置页没有预填任何 Key，PACER 明确显示“尚未实现”。
4. 联网后确认自动刷新只增量写入用户数据目录，不修改签名应用包。
5. 确认无 Key 用户直接获得内置历史基线；新增文件的初步本地辅助必须单独标注、分层保存，不得覆盖内置译文或解读，也不得冒充生成式 AI。
6. 分别测试 CourtListener Token、Ollama、OpenAI、Anthropic、Gemini 和 OpenAI-compatible 元数据模式，并至少对一个云端提供商测试正文授权模式。
7. 确认原始 PDF、本地路径和 OCR 图像未发送到任何 AI 提供商；OpenAI 官方 Responses 请求必须带 `store:false`。
8. 验证外部链接、内置 PDF 阅读、中文/英文切换、深色/浅色模式和 1080 最小窗口。
9. 重启程序，确认种子缓存不会重复复制，自动任务不会在配置间隔内重复立即运行。
10. 在 GitHub Release 上传后重新下载 DMG/EXE，并用公开 `SHA256SUMS.txt` 复核。

### 发布说明必须包含

- “完整版内置历史资料和研究缓存，因此体积较大”。
- 当前资料记录数、有效 PDF 数、RECAP/官方/历史/镜像分布和基线日期。
- 无 Key、CourtListener、Ollama、官方/兼容云端 AI、PACER 各自真实能力，并明确协议兼容不代表模型质量相同。
- PACER 仍是正式案卷，不能承诺绝对完整。
- 无遥测、无远程数据库、无隐藏更新通道；当前审计未发现已知后门。
- 源码、网络白名单、依赖锁、资料哈希、种子哈希和安装包哈希的复核位置。

## English Release Process

### Release Assets

Each public release should provide both macOS DMGs, the Windows x64 EXE, `SHA256SUMS.txt`, `SBOM.cdx.json`, GitHub source archives, and bilingual release notes. This is a complete-data release: it includes the audited PDF baseline and active research seed rather than an empty first-run library.

The Git repository continues to ignore raw `downloads/`, `server/cache/`, and `release-data/`. `release:prepare-data` generates sanitized manifests and a package seed, removes developer paths and runtime-private files, keeps only cache files referenced by the current search index, and selects the newest bilingual case dossier for each case/provider.

Run the complete check sequence shown above with Node.js 24 LTS. `release:verify-data` must re-hash every valid PDF and every seed file before packaging.

Build only after development is complete:

```bash
npm run desktop:dmg
npm run desktop:exe
```

Sign and notarize the DMGs with Apple Developer ID. Sign the EXE with a trusted Windows code-signing certificate. Never commit signing material or provider credentials.

### Acceptance And Disclosure

Test offline first launch on clean macOS and Windows accounts, then test online incremental updates and each optional provider. The release notes must disclose the baseline date and counts, capability limits, PACER incompleteness boundary, package-size reason, security architecture, and checksum locations. State that the current audit found no known backdoor or hidden collection path; do not replace verifiable controls with an unprovable absolute guarantee.
