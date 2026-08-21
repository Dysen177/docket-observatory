<p align="right"><strong>中文</strong> | <a href="./README.en.md">English</a></p>

<p align="center">
  <img src="./src/assets/brand-logo.png" width="112" alt="案卷观察台 Logo">
</p>

# 案卷观察台

<p align="center"><strong>Docket Observatory</strong></p>

<p align="center">
  面向郭文贵（Guo Wengui / Miles Guo / Ho Wan Kwok）相关美国法院案件、监管事项和历史公开资料的本地优先研究工具。
</p>

<p align="center">
  <a href="https://github.com/Dysen177/docket-observatory/releases/latest"><img src="https://img.shields.io/github/v/release/Dysen177/docket-observatory?label=release" alt="最新版本"></a>
  <a href="https://github.com/Dysen177/docket-observatory/actions/workflows/ci.yml"><img src="https://github.com/Dysen177/docket-observatory/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI 状态"></a>
  <a href="https://github.com/Dysen177/docket-observatory/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-1f8a70.svg" alt="MIT License"></a>
  <a href="https://github.com/Dysen177/docket-observatory"><img src="https://img.shields.io/badge/mode-local--first-4d7cff.svg" alt="本地优先"></a>
</p>

<p align="center">
  <a href="#下载"><strong>下载 v0.1.2</strong></a> ·
  <a href="./DOWNLOADS.md"><strong>安装教程</strong></a> ·
  <a href="./AI_SETUP.md"><strong>Ollama / API Key 图文教程</strong></a> ·
  <a href="#主要功能">主要功能</a> ·
  <a href="#界面预览">界面预览</a> ·
  <a href="#从源码运行">从源码运行</a>
</p>

> 程序会区分法院裁判、政府或检方指控、当事人主张和公开言论。AI 输出仅用于研究辅助，不是正式法律意见。

## 下载

`v0.1.2` 提供 macOS 和 Windows 桌面安装包，内置当前公开资料、搜索索引和 5,098 份中英文可检索直播文字。

| 电脑 | 安装包 | 大小 |
| --- | --- | ---: |
| Apple 芯片 Mac | [macOS arm64 DMG](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.2/Docket-Observatory-0.1.2-macOS-arm64-unsigned.dmg) | 1.99 GB |
| Intel Mac | [macOS x64 DMG](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.2/Docket-Observatory-0.1.2-macOS-x64-unsigned.dmg) | 1.99 GB |
| Windows 10/11 64 位 | [Windows x64 EXE](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.2/Docket-Observatory-0.1.2-Windows-x64-unsigned.exe) | 1.92 GB |

- 不确定 Mac 芯片类型时，请在“关于本机”中查看“芯片”。
- 安装包未购买商业代码签名。首次打开方法和 SHA-256 校验见[中英文图文安装教程](DOWNLOADS.md)及 [v0.1.2 发布说明](release-notes/v0.1.2.md)。

## 主要功能

| 功能 | 说明 |
| --- | --- |
| 证据文件库 | 搜索案号、Doc 文件号、人物、公司和 PDF 正文；刑事主案按文件号从大到小排列。 |
| 案卷更新 | 联网发现新增或变更的公开文件，保存来源、提交日期和更新状态。 |
| 双语文件阅读 | 同屏查看原文、中文阅读辅助、通俗解读、专业信息、来源和质量标签。 |
| 历史公开言论 | 检索 2017-2023 年直播、视频、公开帖文及对应中英文文字。 |
| GHOT 文字档案 | 检索中英文法庭文件摘要、名词解释、宣言、报告和公开指南。 |
| 全库研究 / AI Chat | 无模型时检索本地资料；接入 Ollama 或云端模型后进行跨来源整合、多轮对话和带证据编号的回答。 |
| 案件与关系 | 按案件、人物、公司、基金和破产财产查看时间线及公开关联。 |

## 界面预览

<table>
  <tr>
    <td width="50%" valign="top"><strong>案件总览</strong><br><img src="./docs/screenshots/home.png" alt="案件总览" width="100%"></td>
    <td width="50%" valign="top"><strong>证据文件库</strong><br><img src="./docs/screenshots/documents.png" alt="证据文件库" width="100%"></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><strong>案件组合</strong><br><img src="./docs/screenshots/cases.png" alt="案件组合" width="100%"></td>
    <td width="50%" valign="top"><strong>人物与实体关系</strong><br><img src="./docs/screenshots/entities.png" alt="案件关系" width="100%"></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><strong>历史直播与公开言论</strong><br><img src="./docs/screenshots/public-records.png" alt="历史直播与公开言论" width="100%"></td>
    <td width="50%" valign="top"><strong>全库研究 / AI Chat</strong><br><img src="./docs/screenshots/ai-chat.png" alt="全库研究" width="100%"></td>
  </tr>
  <tr>
    <td colspan="2" valign="top"><strong>AI 与 Key 设置</strong><br><img src="./docs/screenshots/settings.png" alt="本地设置" width="100%"></td>
  </tr>
</table>

## AI 使用方式

| 无模型 / 无 Key | 配置 Ollama 或自己的 API Key |
| --- | --- |
| 本地全文搜索、档案检索、既有翻译和文件解读可直接使用。 | 在本地检索结果上增加总结、联想、跨文件整合和多轮对话。 |
| 新文件可在本地完成正文提取、OCR、索引和规则化初读。 | 可为新文件生成更深入的翻译和解读，质量取决于所选模型。 |
| 不生成跨来源推理结论。 | 支持 OpenAI、Claude、Gemini、Ollama 和 OpenAI 兼容 HTTPS 网关。 |

设置步骤见 [Ollama 与大模型 API Key 中英文图文教程](AI_SETUP.md)。云端正文发送默认关闭；程序不会把原始 PDF 或本机路径发送给模型服务。

## 内置资料

- 1,924 条法律资料记录、1,897 份有效 PDF、1,846 份按内容去重的 PDF 正文；
- 5,152 条历史直播、视频和公开帖文记录，其中 5,098 条有可检索文字和英文语料；
- 375 条 GHOT 公开文字档案，包括 365 条法庭文件摘要和 7 条概念/名词资料；
- 132 个案件的中英文整体案情，以及文件翻译、解读、关系和搜索索引。

详细统计、质量分级和验证结果见 [v0.1.2 发布说明](release-notes/v0.1.2.md)。原始 PDF、专业复核、本地规则初读和模型生成内容会分别标注。

## 更新与证据边界

- 自动更新仅处理公开来源中新下载或发生变化的文件，并同步更新排序、搜索和 AI 检索范围。
- PACER 是联邦法院正式案卷来源；CourtListener / RECAP 是主要免费公开来源，可能存在未同步文件。
- GHOT、NFSC、网络档案和第三方视频平台属于辅助或二级来源，重要结论应回到原始 PDF 与正式案卷核验。
- 本项目不声称包含密封、受限、撤下、未同步或尚未公开的文件。

来源说明和发布审查见 [网络白名单](NETWORK.md)、[风险审计摘要](release-metadata/corpus-risk-audit.md)与[逐文件决定](release-metadata/corpus-review-decisions.json)。

## 本地优先与安全

- 无用户账号、广告、遥测、远程数据库或隐藏更新通道；
- API Key 使用 macOS Keychain 或 Windows DPAPI 支持的本机加密存储；
- 云端模型只在用户明确开启后接收允许发送的提取文本；
- 应用版本更新由用户从 GitHub Release 下载，不会后台静默安装。

详见[开源审计说明](OPEN_SOURCE_AUDIT.md)、[安全政策](SECURITY.zh-CN.md)和[隐私说明](PRIVACY.zh-CN.md)。

## 从源码运行

需要 Node.js 22.12 或更新版本，推荐 Node.js 24。

```bash
nvm use
npm ci
npm run dev:all
```

常用检查：

```bash
npm run lint
npm run build
npm run security:check
npm run test:zero-key
npm run test:search
npm run test:research-chat
```

## 反馈与文档

- 程序问题：[Bug Report](https://github.com/Dysen177/docket-observatory/issues/new?template=bug-report.yml)
- 缺失资料：[Source Gap](https://github.com/Dysen177/docket-observatory/issues/new?template=source-gap.yml)
- 安全漏洞：[GitHub 私密漏洞报告](https://github.com/Dysen177/docket-observatory/security/advisories/new)
- 其他联系：[poison127@protonmail.com](mailto:poison127@protonmail.com) · X [@Dysen1777](https://x.com/Dysen1777)

本项目源代码使用 [MIT License](LICENSE)。法院文件和第三方资料仍遵守其原始来源的公开状态、版权与再分发规则。
