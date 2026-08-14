# 案卷观察台 vX.Y.Z / Docket Observatory vX.Y.Z

## 中文

### 下载

- macOS Apple 芯片：`Docket-Observatory-X.Y.Z-macOS-arm64.dmg`
- macOS Intel：`Docket-Observatory-X.Y.Z-macOS-x64.dmg`
- Windows x64：`Docket-Observatory-X.Y.Z-Windows-x64.exe`
- 完整性：`SHA256SUMS.txt`

### 完整版资料基线

- 基线日期：`YYYY-MM-DD`
- 资料记录：`...`
- 有效 PDF：`...`
- CourtListener/RECAP：`...`
- 官方机构：`...`
- 历史公开来源：`...`
- 备用镜像：`...`
- 未解决来源缺口：`...`

本版本内置历史 PDF、正文提取、可用辅助译文、逐文件法律解读、案件整体解读、关系审计和全文索引，因此安装包体积较大。建议预留至少 5 GB 空间。

### 自动更新与 AI

- 无 Key：直接使用内置完整基线；联网后只抓取公开增量文件。新增文件的初步本地辅助分层保存，不覆盖内置译文或解读。
- CourtListener Token：增强 RECAP 案卷条目分页和公开 PDF 发现。
- Ollama：本机生成式翻译和解读。
- 云端 AI：支持 OpenAI、Anthropic、Gemini 和用户配置的 OpenAI-compatible 中转/自托管服务；分析与翻译可分别填写提供商和模型 ID。质量取决于模型能力、上下文、推理模式和服务兼容性。
- PACER：当前仍未实现登录和付费下载适配器。

### 安全与透明

当前源码和发布资料审计未发现已知后门、遥测、远程数据库或隐藏更新通道。请通过源码、`NETWORK.md`、`OPEN_SOURCE_AUDIT.md`、corpus/seed manifests 和 `SHA256SUMS.txt` 独立复核。AI 输出仅作研究辅助，不是法律意见；PACER 仍是正式案卷，不能承诺资料绝对完整。

## English

### Downloads

- macOS Apple silicon: `Docket-Observatory-X.Y.Z-macOS-arm64.dmg`
- macOS Intel: `Docket-Observatory-X.Y.Z-macOS-x64.dmg`
- Windows x64: `Docket-Observatory-X.Y.Z-Windows-x64.exe`
- Integrity file: `SHA256SUMS.txt`

### Complete Data Baseline

- Baseline date: `YYYY-MM-DD`
- Collected records: `...`
- Valid PDFs: `...`
- CourtListener/RECAP: `...`
- Official agencies: `...`
- Historical public sources: `...`
- Backup mirrors: `...`
- Unresolved source gaps: `...`

This complete edition includes historical PDFs, extracted text, available assistive translation, per-document legal reads, case-level reads, relationship audits, and full-text search. Keep at least 5 GB free.

### Updates And AI

No-key users start with the complete bundled baseline and receive incrementally processed public updates. Preliminary local assistance for new files is stored separately and never overwrites the bundled translation or legal-read baseline. A CourtListener token improves RECAP coverage. Ollama adds local generative work. OpenAI, Anthropic, Gemini, and user-configured OpenAI-compatible gateways can provide cloud generative translation and analysis after provider/model selection and the required body-transmission consent. Output quality depends on model capability, context, reasoning mode, and provider compatibility. PACER login and paid retrieval remain unimplemented.

### Security And Transparency

The current source and release-data audit found no known backdoor, telemetry, remote database, or hidden updater. Independently review the source, network allowlist, open-source audit, corpus/seed manifests, and installer checksums. AI output is research assistance, not legal advice, and PACER remains the docket of record.
