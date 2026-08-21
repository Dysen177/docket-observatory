<p align="right"><strong>中文</strong> | <a href="./README.en.md">English</a></p>

<p align="center">
  <img src="./src/assets/brand-logo.png" width="112" alt="案卷观察台 Logo">
</p>

# 案卷观察台

<p align="center"><strong>Docket Observatory</strong></p>

<p align="center">
  专门用于研究和追踪郭文贵（Guo Wengui / Miles Guo / Ho Wan Kwok）相关美国法院案件与监管事项的本地优先法律研究工作台，覆盖刑事、民事、上诉、证券监管、GTV / Fair Fund、破产财产、没收，以及关联人物、公司、基金和其他实体。
</p>

<p align="center">
  <a href="https://github.com/Dysen177/docket-observatory/releases/latest"><img src="https://img.shields.io/github/v/release/Dysen177/docket-observatory?label=release" alt="最新版本"></a>
  <a href="https://github.com/Dysen177/docket-observatory/actions/workflows/ci.yml"><img src="https://github.com/Dysen177/docket-observatory/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI 状态"></a>
  <a href="https://github.com/Dysen177/docket-observatory/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-1f8a70.svg" alt="MIT License"></a>
  <a href="https://github.com/Dysen177/docket-observatory"><img src="https://img.shields.io/badge/mode-local--first-4d7cff.svg" alt="本地优先"></a>
</p>

<p align="center">
  <a href="#快速下载"><strong>下载 v0.1.2</strong></a> ·
  <a href="./DOWNLOADS.md"><strong>中英文图文安装教程</strong></a> ·
  <a href="./AI_SETUP.md"><strong>AI 图文接入教程</strong></a> ·
  <a href="#核心能力">核心能力</a> ·
  <a href="#证据来源与边界">证据边界</a> ·
  <a href="#本地优先与安全">安全</a> ·
  <a href="#问题反馈与联系">反馈与联系</a> ·
  <a href="#从源码运行">从源码运行</a>
</p>

> **中立性声明：** 程序分开标注法院裁判、政府或检方指控、当事人主张、受托人申请、监管文件、公开镜像和政策背景。任何一方的说法都不会被默认写成法院已经认定的事实。 AI 输出是研究辅助，不是律师代理或正式法律意见。

> **版本状态：** `v0.1.2` 完整社区版提供三个桌面安装包，完整携带本页列出的公开资料、双语直播文字、搜索索引和阅读辅助。项目仅提供 macOS 与 Windows 桌面版，不提供手机或平板版本。

## 快速下载

`v0.1.2` 是完整社区版：安装包完整携带当前公开发布基线、搜索索引、既有双语研究辅助，以及 5,098 份可检索直播文字的中英文资料，不是首次启动后再慢慢下载历史资料的轻量客户端。“完整”指完整携带该版本的公开发布基线，不表示已经取得 PACER 中的密封、受限、撤下或尚未公开材料。当前只提供 macOS 和 Windows 桌面版：macOS arm64、macOS x64 和 Windows x64，不提供 iPhone、iPad 或 Android 版本。

| 电脑 | 下载文件 | 大小 |
| --- | --- | ---: |
| Apple 芯片 Mac（Apple silicon） | [下载 macOS arm64 DMG](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.2/Docket-Observatory-0.1.2-macOS-arm64-unsigned.dmg) | 1.99 GB |
| Intel Mac | [下载 macOS x64 DMG](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.2/Docket-Observatory-0.1.2-macOS-x64-unsigned.dmg) | 1.99 GB |
| Windows 10/11 64 位 | [下载 Windows x64 EXE](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.2/Docket-Observatory-0.1.2-Windows-x64-unsigned.exe) | 1.92 GB |

1. 不确定 Mac 芯片：打开“关于本机”，看“芯片”是 Apple 还是 Intel。
2. 只从 [GitHub 最新版本页面](https://github.com/Dysen177/docket-observatory/releases/latest) 或上述直达链接下载。公开 Release 上传的附件只有三个安装包；GitHub 自动生成的 Source code 压缩包是源码归档，不是完整应用。

> **安装前知道：** 三个安装包都明确标注为免费未签名版。首次打开时，macOS 可能需要在“隐私与安全性”中点击“仍要打开”，Windows 可能需要在 SmartScreen 中选择“更多信息”。不要关闭系统安全机制，并确认安装包来自本项目官方 GitHub Release。

> **第一次安装请看：** [从下载 DMG/EXE 到成功打开的中英文逐步图文教程](DOWNLOADS.md)，包括 Mac 的“隐私与安全性”、Touch ID/密码授权和 Windows SmartScreen/UAC。教程图不包含真实用户的桌面、账户名或文件。

### 发布验证

免费未签名表示没有购买 Apple Developer ID 或 Windows 商业发布者证书，不表示安装包未经测试。`v0.1.2` 的两份 DMG 已通过映像完整性、只读挂载、ad-hoc 资源签名、目标架构和 PDF 原生依赖检查；Apple silicon 版还完成了从 DMG 复制安装、真实启动和内置资料数量核验。Windows EXE 已通过 PE/NSIS 结构和体积检查，上传后由项目的 Windows Release 工作流继续执行原生安装、完整资料核对、界面启动、覆盖升级和卸载。源码构建、搜索、密钥加密和无 Key 默认流程均已通过。

- [v0.1.2 发布说明、SHA-256 与验证状态](release-notes/v0.1.2.md)
- [GitHub Release 验证工作流](https://github.com/Dysen177/docket-observatory/actions/workflows/community-release-validation.yml)

## 核心能力

| 工作 | 你能得到什么 |
| --- | --- |
| 案卷监测 | 联网后按来源策略刷新公开 Feed、发现新增或变更的公开材料，保留原始外部链接、法院提交日和更新状态。 |
| 证据文件库 | 当前版本包含 1,897 份有效 PDF、1,846 份按文件内容去重的正文，支持案号、Doc 文件号、人物、公司和 PDF 正文全文搜索。刑事主案按文件号从大到小显示（例如 870 到 1），其他案件类型排在后面；排序不再按更新时间决定。元数据记录即使没有本地 PDF 也可以被搜索。 |
| 历史公开言论 | 独立索引 2017 年 1 月 26 日至 2023 年 3 月 14 日的 5,152 条直播、视频和公开帖文目录记录，其中 5,098 条有可检索文字；英文检索语料覆盖 5,098 条记录。选中条目后，右侧直接显示本地文字和时间点；长时直播、片段、短视频、公开帖文、人工整理稿和不完整副本分开标注。 |
| GHOT 文字档案与内部名词库 | 随包提供中英文 GHOT 公开文字档案，当前包含 375 条记录，其中 365 条法庭文件摘要和 7 条名词/概念资料，并补充宣言、报告和公开指南。用户搜索“新中国联邦”“蓝金黄/BGY”等名词时，可以先得到详细档案摘要和内部术语解释；GHOT 属于二级公开档案，争议性主张和法律结论仍必须回到原始 PDF 或官方案卷核验。 |
| 全库研究 / AI Chat | 左侧独立工作区先检索法院 PDF、翻译与法律解读、直播文字、GHOT 档案、案件时间线、实体和政策资料。没有 Ollama、API Key 或其他模型时，仍可使用本地检索和档案模式，但不会假装具备生成式整合与推理；接入模型后才增加跨来源整合、多轮对话、联想和推理，回答附证据编号。 |
| 双语阅读 | 将原文、既有中英文阅读辅助、来源链接、来源类型和核验状态放在同一个文件视图中。 |
| 通俗与专业解读 | 无模型时通过本地确定性规则生成文件类型、程序位置、通俗背景、争议点、风险提示和页码引用等初读；有模型时可生成更深的翻译和法律解读。所有结果保留法院、案号、文件号、提交日、原始文件和限制说明，并明确区分初读、生成结果和专业复核。 |
| 案件整体与关联 | 按案件、诉讼方、人物、公司、基金和破产财产组织时间线与关系，并将“公开资料显示的关联”与“待核验推定”分开。 |
| 本地优先 | 无账号、无强制云端服务、无广告、无遥测、无隐藏更新通道；密钥在本机加密保存，仅在用户调用所选 API 时作为 HTTPS 认证信息发送给该服务。 |

## 两层阅读

同一份文件同时服务两类读者：

| 普通读者 | 法律与调查专业人员 |
| --- | --- |
| 先看“发生了什么、为什么重要、还有什么不确定”。复杂程序用日常语言说明，但不把比喻当成证据。 | 直接回到原始 PDF、法院提交日、Doc 文件号和原始来源。明确区分法院裁判、指控、当事人主张与公开镜像。 |

## 界面预览

以下截图来自当前版本的实际运行页面。

<table>
  <tr>
    <td width="50%" valign="top"><strong>案件总览</strong><br><img src="./docs/screenshots/home.png" alt="案件总览" width="100%"></td>
    <td width="50%" valign="top"><strong>证据文件库与全文检索</strong><br><img src="./docs/screenshots/documents.png" alt="证据文件库" width="100%"></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><strong>案件组合与整体解读</strong><br><img src="./docs/screenshots/cases.png" alt="案件组合" width="100%"></td>
    <td width="50%" valign="top"><strong>人物、公司与案件关系</strong><br><img src="./docs/screenshots/entities.png" alt="案件关系" width="100%"></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><strong>历史直播与公开言论</strong><br><img src="./docs/screenshots/public-records.png" alt="历史直播与公开言论" width="100%"></td>
    <td width="50%" valign="top"><strong>全库研究：无模型检索 / 有模型整合</strong><br><img src="./docs/screenshots/ai-chat.png" alt="全库研究" width="100%"></td>
  </tr>
  <tr>
    <td colspan="2" valign="top"><strong>本地设置、AI 与 Key 管理</strong><br><img src="./docs/screenshots/settings.png" alt="本地设置" width="100%"></td>
  </tr>
</table>

## 完整资料基线

`v0.1.2` 完整社区版包含以下已在本地检查过的基线：

- 1,924 条法律资料清单记录、1,897 份有效 PDF、1,846 份按 PDF 内容去重的唯一正文；
- 1,846 份唯一 PDF 均有中英文文件阅读记录；在 1,417 个逻辑文件中，当前质量审计显示 1,343 份正文完整、70 份正文部分提取、4 份只有元数据。99 份完成版本锁定的专业复核，其他主要是本地规则初读、未审阅生成结果或人工研究记录；
- 5,152 条历史直播、视频和公开帖文目录记录，5,098 条可检索文字，英文语料 5,098 条，其中 5,069 条已翻译、29 条因原文已是英文而无需翻译，共 145,768,820 个英文译文字符；
- 375 条 GHOT 公开文字档案记录，其中 365 条法庭文件摘要、7 条概念/名词资料，并保留中英文详情和二级档案证据边界；
- 132 个案件的中英文整体案情，共 264 个语言版本；
- 中文阅读层中，72 份达到审阅级完整翻译，1,731 份标记为辅助性不完整译文，43 份保留中文原文；这些数字不等同于律师逐页复核数量；
- 1,417 个逻辑文件中，102 个有人工研究记录，1,295 个主要依赖本地规则初读，20 个记录来自 Ollama；
- 17,272 个发布种子缓存文件，共 769,186,724 字节，包含正文提取、翻译、文件解读、案件关系、直播文字和搜索索引；GHOT 文字档案作为独立的服务器资源随源码和安装包提供。

“本地规则初读”用于离线检索、程序性归类和通俗理解，不是生成式 AI，也不等同于逐页律师人工审阅。AI Chat 在无模型时可以返回检索证据和内部档案摘要，但不会做跨来源生成式结论；接入模型后，程序还会校验引用编号和证据类别，拒绝明显无效引用或把当事人/检方主张冒充法院认定的回答。界面始终区分本地初读、模型生成结果和专业复核；原始 PDF、来源、提交日和限制说明保留为核验依据。

自动发布风险审计标记了 245 份可能含隐私、密封字样、受限内容或账号/证件号码的文件；245/245 均已有发布者决定，本轮未解决项为 0，`v0.1.2` 发布门禁已通过。决定记录的是来源、完整性和收录政策，不表示密封、保密、隐私或删节字样失去法律效力，也不等同于逐页人工法律审阅。详细报告见 [风险审计摘要](release-metadata/corpus-risk-audit.md)、[审查报告](release-metadata/corpus-publication-review.md) 与 [逐文件决定](release-metadata/corpus-review-decisions.json)。

## 无 Key 与自定义 Key

| 能力 | 不输入 Key | 配置自己的 Key 或 Ollama |
| --- | --- | --- |
| 内置资料、搜索、既有阅读 | 立即可用，包括离线阅读、全文搜索和案件整体案情 | 可继续使用，不会因为填写 Key 而覆盖原有基线 |
| 新来源刷新与文件下载 | 使用无 Token 公开来源的有限 Feed 和搜索；无法代替 PACER | CourtListener/RECAP Token 可增加公开案卷分页与 PDF 发现范围 |
| 正文提取、OCR、索引 | 本地执行，无云端费用 | 仍在本地执行，可将新文件交给指定模型处理 |
| 新文件的生成式翻译与 AI 解读 | 无 Key 时不会冒充云端 AI；提供本地规则化整理和辅助结果 | 可选 Ollama 本地模型，或在明确允许后使用云端模型；质量取决于模型 |
| AI 全库研究对话 | 可使用本地检索模式搜索法院文件、案卷记录、直播文字、GHOT 名词档案和关联资料；不能进行生成式整合、联想和推理 | 配置 Ollama、OpenAI、Claude、Gemini 或兼容网关后，增加跨来源整合、多轮对话、联想和推理；回答分开法院认定、诉讼主张、公开言论和政策背景，并附原始证据 |
| PACER 正式案卷 | 当前版本未实现登录、收费下载或自动购买 | 设置中预留字段，不会自动发起付费请求 |

### AI 支持与质量边界

设置页支持 OpenAI Responses、Anthropic Messages、Google Gemini、Ollama，以及用户自定义 HTTPS 地址的 OpenAI 兼容网关（包括兼容协议的中转站）。翻译、单份文件解读和 AI Chat 可以分别选择服务商与模型 ID。没有模型时，系统退化为可引用的本地检索/档案模式；模型越强，通常越能处理跨文件整合、长上下文、复杂推理和自然语言表达，但程序仍不把模型输出当成法律意见。兼容协议不代表质量相同：法律术语、长文覆盖、引用稳定性、速度与费用取决于用户选择的模型、上下文长度、推理设置、服务商实现和账户限额。

云端正文发送默认关闭，必须在设置中明确开启。程序只在用户同意后把待处理的提取文本发送给所选服务，原始 PDF 和本机路径不会发送。调用云端模型时，所选服务商会收到用于 HTTPS 认证的 API Key 以及用户允许发送的提取文本；程序不会把 Key 混入正文，也不会把这些内容另行上传到本项目自己的服务器。Ollama 仅连接用户配置的本机回环地址。

## 自动更新如何工作

1. 联网后按设置的周期刷新已列入白名单的公开来源；默认开启，可在设置关闭或修改周期。
2. 对提供可用公开下载地址的来源，只下载新增或发生变化的文件，确认 PDF 结构有效，记录来源 URL 和法院提交日，不覆盖已发布基线。
3. 无 Key 时执行本地正文提取、OCR、索引和规则化初步整理；新文件的生成式翻译与 AI 解读需 Ollama 或用户的云端配置。
4. 下载或发现新文件后，程序更新文件清单、哈希去重、全文索引、文件号排序和 AI Chat 检索范围；有模型时再按选择自动生成翻译和解读，无模型时保留本地规则初读和辅助结果。
5. 后台可选“优先文件”或“全部公开文件”，并选择中文、英文或双语输出。默认优先处理本轮新增或变更文件，不再每 30 分钟轮换重处理全部历史文件；全量模式仍可手动启动，可能耗时较长并使用更多 API 配额。

自动更新只处理公开案卷和研究资料，不会在后台替换程序本体、静默安装新版本或执行未知代码。应用版本更新需要用户自行从官方 GitHub Release 下载并安装。

## 证据来源与边界

| 来源 | 在程序中的地位 | 必须怎么理解 |
| --- | --- | --- |
| PACER | 美国联邦法院正式案卷记录 | 是联邦法院案卷记录的正式来源；本版未实现付费登录与自动下载。 |
| CourtListener / RECAP | 主要免费公开替代来源 | 由 PACER 用户同步的公开案卷与 PDF；可能不包含尚未被同步的文件。 |
| DOJ、SEC、Federal Register | 官方机构文件与政策资料 | 可用于官方公告、诉状、命令和政策背景，不一定是法院案卷。 |
| Himalaya Restoration 历史网页与网络档案 | 历史公开页面和文件线索 | 是公开上下文或镜像，不等同于法院正式案卷。 |
| NFSC | 备用公共镜像 | 不是正式案卷记录；重要文件应回到 PACER 或 RECAP 核对。 |
| GHOT 公开文字档案 | 中英文名词解释、宣言、报告和法庭文件二级摘要 | 用于发现背景和辅助理解；不是法院正式案卷，也不是独立事实证明。法庭文件摘要必须回到 PDF 和官方案卷核验。 |
| YouTube、GETTR、Rumble、Odysee | 历史公开言论的可访问转载副本 | 只证明相关公开内容仍可访问；不证明转载者是原始发布者，也不证明视频中陈述属实。安装包不保存第三方视频、音频、图片或缩略图。 |

每条信息都应显示外部链接、文件日期、案号、Doc 文件号、来源类型和核验提示。程序不会把镜像可访问误写成法院认定。密封、受限、已撤下、未被同步或匿名搜索无法返回的记录可能导致覆盖缺口，因此本程序不作“所有相关案卷绝对齐全”的承诺。

## 案件范围

本程序不是通用法院案卷浏览器，而是围绕郭文贵（Guo Wengui / Miles Guo / Ho Wan Kwok）及其相关诉讼网络建设的专题法律研究工作台。当前资料基线覆盖刑事、民事、上诉、最高法院公开案卷、证券监管、GTV / Fair Fund、破产财产、没收、直播文字、GHOT 名词与法庭文件档案，以及关联人物、实体、公司、基金和政策观察主线。案件关系图只表示公开材料中出现的关联，区分“已核实公开关系”、“较可能关系”与“待人工核验”，不自动推定所有权、控制、共谋或责任。

## 本地优先与安全

- 没有用户账号系统、广告 SDK、分析 SDK、遥测 SDK、远程数据库或隐藏更新通道。
- Electron 使用上下文隔离、沙箱、外链接校验、回环 API 白名单、ASAR 完整性和 Electron Fuses 硬化。
- macOS 密钥使用本机 Keychain 保护的加密保险库；Windows 使用 DPAPI 支持的 `safeStorage`。界面不返回完整 Secret；只有用户实际调用所选外部 API 时，该服务才会收到认证所必需的 Key。
- 公开源码、依赖锁文件、网络白名单、资料清单、发布审查证据和完整构建流程均可在仓库中查看。

当前审计没有发现已知后门或隐藏信息收集路径，但这不是对未来依赖、操作系统、构建环境或第三方重新打包的绝对保证。请参阅 [开源审计说明](OPEN_SOURCE_AUDIT.md)、[安全政策](SECURITY.zh-CN.md)、[隐私说明](PRIVACY.zh-CN.md)、[网络白名单](NETWORK.md) 和 [下载安装说明](DOWNLOADS.md)。

## 问题反馈与联系

为了让问题可追踪、可复现并能看到修复进度，请按问题类型选择渠道：

| 问题类型 | 推荐渠道 |
| --- | --- |
| 程序错误、崩溃、安装或界面问题 | [提交 Bug Report](https://github.com/Dysen177/docket-observatory/issues/new?template=bug-report.yml)，请注明版本、系统、复现步骤和已经隐去敏感信息的日志。 |
| 缺失案件、案卷或法院文件 | [提交 Source Gap](https://github.com/Dysen177/docket-observatory/issues/new?template=source-gap.yml)，请尽量附上法院、案号、Doc 文件号和公开来源链接。 |
| 可被利用的安全漏洞 | 不要公开提交 Issue。请使用 [GitHub 私密漏洞报告](https://github.com/Dysen177/docket-observatory/security/advisories/new)；无法使用时发送邮件。 |
| 不适合公开讨论的其他事项 | 邮件：[poison127@protonmail.com](mailto:poison127@protonmail.com)，建议主题写明 `[Docket Observatory] Bug / Security / Source`。 |
| 项目动态与公开联系 | X：[@Dysen1777](https://x.com/Dysen1777)；[项目发布帖](https://x.com/Dysen1777/status/2088677729109717489?s=20)。 |

请勿通过 GitHub Issue、邮件或 X 发送 API Key、PACER 密码、私有本机路径、密封或受限材料，以及包含凭据的未清理日志。普通 Bug 优先使用 GitHub Issue，便于其他用户检索同类问题并跟踪处理状态。

## 从源码运行

安装包用户不需要 Node.js。从源码开发需要 Node.js 22.12 或更新版本，推荐 Node.js 24。

```bash
nvm use
npm ci
npm run dev:all
```

然后打开 `http://127.0.0.1:5173`。常用检查命令：

```bash
npm run lint
npm run build
npm run security:check
npm run test:zero-key
npm run test:search
npm run test:offline-document-read
npm run test:public-record-transcripts
npm run test:research-chat
npm run release:verify-data
```

## 安全与项目文档

- [中英文下载安装教程](DOWNLOADS.md)
- [开源审计说明](OPEN_SOURCE_AUDIT.md)
- [安全政策](SECURITY.zh-CN.md)、[隐私说明](PRIVACY.zh-CN.md)、[网络白名单](NETWORK.md)
- [代码签名政策](CODE_SIGNING_POLICY.md)、[GitHub 运营说明](GITHUB_OPERATIONS.md)
- [Ollama 与云端大模型 Key 中英文图文教程](AI_SETUP.md)
- [v0.1.1 发布说明](release-notes/v0.1.1.md)、[v0.1.2 发布说明](release-notes/v0.1.2.md)、[GitHub Release 安装包](https://github.com/Dysen177/docket-observatory/releases/tag/v0.1.2)

## 开源许可证

本项目源代码使用 MIT License。法院 PDF、政府文件、第三方网页和其他研究资料不因本许可证自动获得新的版权授权，仍应遵守其原始来源的公开状态、版权和再分发规则。欢迎查看、审计、修改和提交改进建议。英文说明见 [README.en.md](README.en.md)。
