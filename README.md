# 案卷观察台

一个面向 macOS 和 Windows 的本地法律资料研究工作台。它把公开法院案卷、机构文件、案件时间线、文件全文检索、双语阅读、来源核验和案件关系放在同一个桌面程序里。

程序保持资料中立：法院裁判、检方指控、辩方主张、受托人申请、监管文件、公共镜像和媒体信息会分别标注，程序不会把任何一方的说法自动写成法院已经认定的事实。

## 先看效果

以下截图来自当前版本的实际运行页面。

### 案件总览

![案件总览](docs/screenshots/home.png)

### 案件组合与整体解读

![案件组合](docs/screenshots/cases.png)

### 证据文件库与全文检索

![证据文件库](docs/screenshots/documents.png)

### 人物、公司与案件关系

![案件关系图](docs/screenshots/entities.png)

### 本地设置与密钥管理

![本地设置](docs/screenshots/settings.png)

## 下载完整版

> **当前发布状态（2026 年 8 月 14 日）：** `v0.1.0` 完整社区版已发布。三个安装包都明确标注为免费未签名版，内置完整资料基线；213 份审查标记文件全部保留，没有隐藏、删减、替换或排除。

### 最简单的下载方法

1. 根据电脑直接下载一个安装包：
   - Apple 芯片 Mac（M1、M2、M3、M4）：[DMG 直接下载](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/Docket-Observatory-0.1.0-macOS-arm64-unsigned.dmg)。
   - Intel Mac：[DMG 直接下载](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/Docket-Observatory-0.1.0-macOS-x64-unsigned.dmg)。
   - Windows 10/11 64 位：[EXE 直接下载](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/Docket-Observatory-0.1.0-Windows-x64-unsigned.exe)。
2. 同时下载 [`SHA256SUMS.txt`](https://github.com/Dysen177/docket-observatory/releases/download/v0.1.0/SHA256SUMS.txt)，按照 [下载、安装与校验说明](DOWNLOADS.md) 检查文件完整性。
3. 只从 [GitHub 最新版本页面](https://github.com/Dysen177/docket-observatory/releases/latest) 或上述直达链接下载。不要下载页面自动生成的源代码压缩包；它们不包含完整法院资料库。
4. 双击安装包：Mac 将程序拖入“应用程序”文件夹；Windows 按安装向导操作。

### 为什么文件这么大

这是完整版发行，不是首次启动后再慢慢下载的轻量版。安装包会内置发布基线日期以前已经整理的资料和本地研究缓存，包括：

- 1,605 条资料记录；
- 1,578 份有效本地 PDF，约 1.3 GB；
- PDF 的 SHA-256 完整性清单和完整性历史链；
- 当前正文提取、全文搜索索引、已有中英文阅读辅助；
- 逐文件法律阅读、案件整体解读、案件关系和来源核验数据；
- Electron 桌面运行环境与中文、英文 OCR 模型。

连同程序运行依赖后，下载大小和安装占用会明显高于普通记事或搜索工具。建议安装前预留至少 5 GB 可用空间，最终大小以 GitHub 版本页面显示为准。首次启动会校验内置资料的哈希；校验失败会停止启动并提示重新下载，不会悄悄退化为空资料库。

## 不输入 Key 也能做什么

首次启动不需要账号、API Key 或 PACER 付费凭证。无配置时可以：

- 直接阅读安装包内的完整资料基线、已有翻译、逐文件解读和案件整体解读；
- 搜索案号、文件号、人物、公司、案件和 PDF 正文中的关键词；
- 在联网后读取公开的 CourtListener/RECAP、司法部、证券交易委员会、联邦公报、历史网页和其他已列入白名单的公共来源；
- 只下载新增或发生变化的公开文件，保留原始来源链接、来源类型、文件日期和本地哈希；
- 在没有云端 Key 时进行本地正文提取、OCR、索引和规则化的初步整理；
- 使用已内置的发布基线解读，不会因为没有 Key 而重新生成低质量内容覆盖原有解读。

默认无 Key 模式不会产生云端 AI 费用。新文件的本地初步结果会标记为“初步阅读辅助”，不能冒充生成式 AI 或正式法律意见。

## 输入 Key 后能增强什么

设置页面支持官方 API 和 OpenAI 兼容协议。用户可以自行填写、替换、删除和测试自己的配置，程序不内置开发者 Key，也不把 Key 写入仓库：

- OpenAI Responses API；
- Anthropic Messages API；
- Google Gemini `generateContent`；
- 任意已知地址的 OpenAI 兼容网关，例如 OpenRouter、xAI、DeepSeek、Qwen、Moonshot、SiliconFlow 或自托管服务；
- 本机 Ollama，用于不把正文发送到云端的本地生成式翻译和解读；
- CourtListener/RECAP Token，用于扩大公开案卷分页和文件发现范围；
- PACER 账号字段仅作为未来正式、计费可控适配器的预留配置，当前版本不会自动登录、扣费或绕过 PACER。

可以为翻译和法律分析分别选择服务商与模型 ID。协议兼容不代表质量相同：译文忠实度、法律术语、长文档覆盖、引用稳定性、速度和费用取决于具体模型、上下文长度、推理设置、服务商实现和账户额度。更强模型通常能提供更完整的翻译和更稳定的文件级、案件级分析，但所有 AI 输出仍必须回到原始文件核对，不是律师代理或正式法律意见。

云端正文发送必须在设置中明确打开。默认不发送 PDF 正文；原始 PDF、开发机路径和密钥不会上传给 AI 服务。Ollama 仅连接用户配置的本机回环地址。

## 数据来源与可信度

来源按证据层级显示，方便普通读者和专业研究者判断：

| 来源 | 程序中的作用 |
| --- | --- |
| PACER | 美国联邦法院正式案卷记录；当前版本没有实现付费登录和自动下载 |
| CourtListener/RECAP | 免费公开案卷和 PDF 镜像；无 Token 也能读取有限公开更新，Token 可扩大分页范围 |
| 美国司法部、证券交易委员会、联邦公报 | 官方机构发布的公告、诉状、命令或政策材料 |
| Himalaya Restoration 历史网页与网络档案 | 保存历史公开页面和项目文件线索，不等同于正式法院案卷 |
| NFSC | 备用公共镜像；不是案卷记录，不覆盖官方或 RECAP 的来源判断 |

每条信息都会显示外部链接、文件日期、案号、文件号、来源类型、可信度和核验提示。程序不会因为一个公共镜像存在，就把镜像内容标记成法院已经确认的事实。PACER、密封或受限文件、被撤下的文件、匿名搜索未返回的旧文件都可能造成覆盖缺口，因此程序不会作出“所有相关案卷绝对齐全”的不实承诺。

## 案件范围

当前资料基线覆盖郭文贵相关刑事、民事、上诉、证券监管、GTV/Fair Fund、破产财产、没收、关联人物、实体、公司、基金和政策观察主线。案件关系图只表示公开资料中出现的关联，区分“已核实公开关系”“较可能关系”和“待人工核验”，不自动推定所有权、控制、共谋或责任。

## 本地运行

源码开发需要 Node.js 22.12 或更新版本，推荐 Node.js 24；已在 `.nvmrc` 中记录。安装包用户不需要 Node.js。

```bash
nvm use
npm install
npm run dev:all
```

然后打开：`http://127.0.0.1:5173`

常用命令：

```bash
npm run dev:web                 # 只启动前端
npm run dev:api                 # 只启动本地 API
npm run dev:all                 # 启动前端和本地 API
npm run lint                    # 代码检查
npm run build                   # 生产构建
npm run security:check          # 安全检查和依赖审计
npm run test:zero-key           # 无 Key 默认能力检查
npm run test:search:fixture     # 搜索功能检查
```

## 隐私与安全

这是本地优先的开源桌面程序：没有用户账号系统、广告 SDK、分析 SDK、遥测 SDK、远程数据库或隐藏更新通道。Electron 使用上下文隔离、沙箱、严格外链校验、回环地址 API 白名单、ASAR 完整性和 Electron Fuses 硬化。macOS 密钥使用本机钥匙串保护的加密保险库，Windows 使用 DPAPI 支持的 `safeStorage`；界面只显示脱敏状态。

源代码、依赖锁文件、网络白名单、资料清单、缓存哈希和发布校验文件都公开，便于自行审计。公开源代码本身不能证明某个第三方重新打包的安装包可信，因此只从本项目的 GitHub 版本页下载，确认文件名明确标注 `-unsigned`，并核对 `SHA256SUMS.txt`。完整安全边界见 [安全政策](SECURITY.zh-CN.md)、[隐私说明](PRIVACY.zh-CN.md)、[网络白名单](NETWORK.md)、[开源审计说明](OPEN_SOURCE_AUDIT.md) 和 [GitHub 运营说明](GITHUB_OPERATIONS.md)。

当前审计没有发现已知后门或隐藏信息收集路径；这不是对未来依赖、操作系统、构建环境或恶意第三方分发的绝对保证。安全问题请按 [安全政策](SECURITY.zh-CN.md) 提交，不要在公开 Issue 中粘贴 API Key、PACER 密码、私密文件或本机路径。

## 开源许可证

本项目采用 MIT License。源代码和发布材料可在 [GitHub 仓库](https://github.com/Dysen177/docket-observatory) 查看。英文说明见 [README.en.md](README.en.md)。
