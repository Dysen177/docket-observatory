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
  <a href="https://github.com/Dysen177/docket-observatory/releases/latest"><img src="https://img.shields.io/github/v/release/Dysen177/docket-observatory?label=最新版本" alt="最新版本"></a>
  <a href="https://github.com/Dysen177/docket-observatory/actions/workflows/ci.yml"><img src="https://github.com/Dysen177/docket-observatory/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI 状态"></a>
  <a href="https://github.com/Dysen177/docket-observatory/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-1f8a70.svg" alt="MIT License"></a>
  <a href="https://github.com/Dysen177/docket-observatory"><img src="https://img.shields.io/badge/mode-local--first-4d7cff.svg" alt="本地优先"></a>
</p>

<p align="center">
  <a href="#快速下载"><strong>下载 v0.1.0</strong></a> ·
  <a href="./DOWNLOADS.md"><strong>中英文图文安装教程</strong></a> ·
  <a href="#核心能力">核心能力</a> ·
  <a href="#证据来源与边界">证据边界</a> ·
  <a href="#本地优先与安全">安全</a> ·
  <a href="#从源码运行">从源码运行</a>
</p>

> **中立性声明：** 程序分开标注法院裁判、政府或检方指控、当事人主张、受托人申请、监管文件、公开镜像和政策背景。任何一方的说法都不会被默认写成法院已经认定的事实。 AI 输出是研究辅助，不是律师代理或正式法律意见。

## 快速下载

`v0.1.0` 是完整社区版：安装包内置发布基线的全部法律资料、搜索索引和既有双语研究辅助。不是首次启动后再慢慢下载历史资料的轻量客户端。

| 电脑 | 下载文件 | 大小 |
| --- | --- | ---: |
| Apple 芯片 Mac（M1、M2、M3、M4） | [下载 macOS arm64 DMG](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/Docket-Observatory-0.1.0-macOS-arm64-unsigned.dmg) | 约 1.58 GB |
| Intel Mac | [下载 macOS x64 DMG](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/Docket-Observatory-0.1.0-macOS-x64-unsigned.dmg) | 约 1.58 GB |
| Windows 10/11 64 位 | [下载 Windows x64 EXE](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/Docket-Observatory-0.1.0-Windows-x64-unsigned.exe) | 约 1.47 GB |

1. 不确定 Mac 芯片：打开“关于本机”，看“芯片”是 Apple 还是 Intel。
2. 下载同一个版本的 [`SHA256SUMS.txt`](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/SHA256SUMS.txt)，按 [下载、安装与校验说明](DOWNLOADS.md) 核对。
3. 只从 [GitHub 最新版本页面](https://github.com/Dysen177/docket-observatory/releases/latest) 或上述直达链接下载，不要把 GitHub 自动生成的源代码压缩包当成完整应用。

> **安装前知道：** 三个安装包都明确标注为免费未签名版。首次打开时，macOS 可能需要在“隐私与安全性”中点击“仍要打开”，Windows 可能需要在 SmartScreen 中选择“更多信息”。不要关闭系统安全机制；先确认文件名和 SHA-256。

> **第一次安装请看：** [从下载 DMG/EXE 到成功打开的中英文逐步图文教程](DOWNLOADS.md)，包括 Mac 的“隐私与安全性”、Touch ID/密码授权和 Windows SmartScreen/UAC。教程图不包含真实用户的桌面、账户名或文件。

## 核心能力

| 工作 | 你能得到什么 |
| --- | --- |
| 案卷监测 | 联网后按来源策略刷新公开 Feed、发现新增或变更的公开材料，保留原始外部链接、法院提交日和本地哈希。 |
| PDF 文件库 | 内置 1,578 份有效 PDF，支持案号、Doc 文件号、人物、公司和 PDF 正文全文搜索。 |
| 双语阅读 | 将原文、既有中英文阅读辅助、来源链接和证据姿态放在同一个文件视图中。 |
| 通俗与专业解读 | 面向普通读者提供结论、背景和影响；为专业研究保留法院、案号、文件号、提交日、原始文件和限制说明。 |
| 案件整体与关联 | 按案件、诉讼方、人物、公司、基金和破产财产组织时间线与关系，并将“公开资料显示的关联”与“待核验推定”分开。 |
| 本地优先 | 无账号、无强制云端服务、无广告、无遥测、无隐藏更新通道；密钥只在本机加密保存。 |

## 两层阅读

同一份文件同时服务两类读者：

| 普通读者 | 法律与调查专业人员 |
| --- | --- |
| 先看“发生了什么、为什么重要、还有什么不确定”。复杂程序用日常语言说明，但不把比喻当成证据。 | 直接回到原始 PDF、法院提交日、Doc 文件号、原始来源和哈希。明确区分法院裁判、指控、当事人主张与公开镜像。 |

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
    <td width="50%" valign="top"><strong>本地设置与 Key 管理</strong><br><img src="./docs/screenshots/settings.png" alt="本地设置" width="100%"></td>
    <td width="50%" valign="top"> </td>
  </tr>
</table>

## 完整资料基线

`v0.1.0` 包含：

- 1,605 条资料记录；
- 1,578 份有效 PDF，共 1,345,988,147 字节；
- 1,559 个唯一 PDF 内容哈希和全文索引；
- 12,259 个研究种子文件，共 500,592,021 字节；
- 1,559 份中英文逐文件法律阅读，58 份中英文案件整体案情。

213 份发布审查标记文件全部保留，没有隐藏、删减、替换或排除。审查重新核验了每份文件的 PDF 结构、字节数、SHA-256、受管路径、公开 HTTPS 来源和来源姿态，但没有把启发式检查写成逐页人工法律审阅。详细证据见 [审查报告](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/corpus-publication-review.md) 与 [逐文件决定](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/corpus-review-decisions.json)。

## 无 Key 与自定义 Key

| 能力 | 不输入 Key | 配置自己的 Key 或 Ollama |
| --- | --- | --- |
| 内置资料、搜索、既有阅读 | 立即可用，包括离线阅读、全文搜索和案件整体案情 | 可继续使用，不会因为填写 Key 而覆盖原有基线 |
| 新来源刷新与文件下载 | 使用无 Token 公开来源的有限 Feed 和搜索；无法代替 PACER | CourtListener/RECAP Token 可增加公开案卷分页与 PDF 发现范围 |
| 正文提取、OCR、索引 | 本地执行，无云端费用 | 仍在本地执行，可将新文件交给指定模型处理 |
| 新文件的生成式翻译与 AI 解读 | 无 Key 时不会冒充云端 AI；使用本地辅助结果 | 可选 Ollama 本地模型，或在明确允许后使用云端模型；质量取决于模型 |
| PACER 正式案卷 | 当前版本未实现登录、收费下载或自动购买 | 设置中预留字段，不会自动发起付费请求 |

### AI 支持与质量边界

Settings 支持 OpenAI Responses、Anthropic Messages、Google Gemini、Ollama 以及用户自定义 HTTPS Origin 的 OpenAI 兼容网关，可分别为翻译和法律分析选择服务商与模型 ID。兼容协议不代表质量相同：法律术语、长文覆盖、引用稳定性、速度与费用取决于用户选择的模型、上下文长度、推理设置、服务商实现和账户限额。

云端正文发送默认关闭，必须在设置中明确开启。原始 PDF、本机路径和 Key 不会默认上传；Ollama 仅连接用户配置的本机回环地址。

## 自动更新如何工作

1. 联网后按设置的周期刷新已列入白名单的公开来源；默认开启，可在设置关闭或修改周期。
2. 只下载新增或发生变化的公开文件，核验 PDF 标记、记录来源 URL、法院提交日和 SHA-256，不覆盖已发布基线。
3. 无 Key 时执行本地正文提取、OCR、索引和规则化初步整理；新文件的生成式翻译与 AI 解读需 Ollama 或用户的云端配置。
4. 后台可选“优先文件”或“全部公开文件”，并选择中文、英文或双语输出。全量模式可能耗时较长并使用更多 API 配额。

## 证据来源与边界

| 来源 | 在程序中的地位 | 必须怎么理解 |
| --- | --- | --- |
| PACER | 美国联邦法院正式案卷记录 | 是案卷 record of docket；本版未实现付费登录与自动下载。 |
| CourtListener / RECAP | 主要免费公开替代来源 | 由 PACER 用户同步的公开案卷与 PDF；可能不包含尚未被同步的文件。 |
| DOJ、SEC、Federal Register | 官方机构文件与政策资料 | 可用于官方公告、诉状、命令和政策背景，不一定是法院案卷。 |
| Himalaya Restoration 历史网页与网络档案 | 历史公开页面和文件线索 | 是公开上下文或镜像，不等同于法院正式案卷。 |
| NFSC | 备用公共镜像 | 不是案卷 record of docket；重要文件应回到 PACER或 RECAP 核对。 |

每条信息都应显示外部链接、文件日期、案号、Doc 文件号、来源类型和核验提示。程序不会把镜像可访问误写成法院认定。密封、受限、已撤下、未被同步或匿名搜索无法返回的记录可能导致覆盖缺口，因此本程序不作“所有相关案卷绝对齐全”的承诺。

## 案件范围

本程序不是通用法院案卷浏览器，而是围绕郭文贵（Guo Wengui / Miles Guo / Ho Wan Kwok）及其相关诉讼网络建设的专题法律研究工作台。当前资料基线覆盖刑事、民事、上诉、证券监管、GTV / Fair Fund、破产财产、没收，以及关联人物、实体、公司、基金和政策观察主线。案件关系图只表示公开材料中出现的关联，区分“已核实公开关系”、“较可能关系”与“待人工核验”，不自动推定所有权、控制、共谋或责任。

## 本地优先与安全

- 没有用户账号系统、广告 SDK、分析 SDK、遥测 SDK、远程数据库或隐藏更新通道。
- Electron 使用上下文隔离、沙箱、外链接校验、回环 API 白名单、ASAR 完整性和 Electron Fuses 硬化。
- macOS 密钥使用本机 Keychain 保护的加密保险库；Windows 使用 DPAPI 支持的 `safeStorage`。界面不返回完整 Secret。
- 公开源码、依赖锁文件、网络白名单、资料清单、SBOM、构建来源、校验和发布审查证据都公开。

当前审计没有发现已知后门或隐藏信息收集路径，但这不是对未来依赖、操作系统、构建环境或第三方重新打包的绝对保证。请参阅 [开源审计说明](OPEN_SOURCE_AUDIT.md)、[安全政策](SECURITY.zh-CN.md)、[隐私说明](PRIVACY.zh-CN.md)、[网络白名单](NETWORK.md) 和 [下载与校验](DOWNLOADS.md)。

## 从源码运行

安装包用户不需要 Node.js。从源码开发需要 Node.js 22.12 或更新版本，推荐 Node.js 24。

```bash
nvm use
npm install
npm run dev:all
```

然后打开 `http://127.0.0.1:5173`。常用检查命令：

```bash
npm run lint
npm run build
npm run security:check
npm run test:zero-key
npm run test:search
```

## 文档与发布证据

- [下载、安装与 SHA-256 校验](DOWNLOADS.md)
- [开源审计说明](OPEN_SOURCE_AUDIT.md)
- [安全政策](SECURITY.zh-CN.md)、[隐私说明](PRIVACY.zh-CN.md)、[网络白名单](NETWORK.md)
- [代码签名政策](CODE_SIGNING_POLICY.md)、[GitHub 运营说明](GITHUB_OPERATIONS.md)
- [v0.1.0 发布说明](release-notes/v0.1.0.md)、[GitHub Release 附件与校验证据](https://github.com/Dysen177/docket-observatory/releases/tag/v0.1.0)

## 开源许可证

本项目使用 MIT License。欢迎查看、审计、修改和提交改进建议。英文说明见 [README.en.md](README.en.md)。
