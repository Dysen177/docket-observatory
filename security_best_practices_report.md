# 发布前安全审计报告

> **状态说明（2026-08-15）：** 本文保留的是发布前安全审计快照；其中关于尚未初始化仓库、尚未生成安装包的历史判断，应以当前源码、工作流和发布说明为准。当前公开版提供完整未签名社区安装包、资料清单、CI、CodeQL、macOS DMG 结构校验和 Windows 原生安装测试。公开 GitHub Release 只上传两个 DMG 和一个 EXE；SBOM、构建来源和安装包哈希仅作为维护者内部发布证据，不作为普通用户的下载步骤。仍未完成的是 Apple Developer ID、公证和 Windows 可信发布者签名；这些属于未来正式签名发行层级，不影响当前文件名明确标注 `-unsigned` 的零成本社区版按披露方式发布。当前状态以 [README](README.md)、[安全政策](SECURITY.zh-CN.md) 和 [代码签名政策](CODE_SIGNING_POLICY.md) 为准。

审计日期：2026-08-14
范围：React 19 / TypeScript / Vite、Express 5、本地资料处理、Electron 43、设置与密钥、外联、完整数据发行、GitHub Actions 与依赖供应链。

## 执行摘要

当前源码审计没有发现已知的故意后门、遥测 SDK、广告分析、远程用户数据库、隐藏自动更新、任意 URL 抓取、任意本地文件读取或把完整凭证返回给界面的路径。`npm audit` 当前为 0 个已知漏洞。

本轮发现的本地 API 请求边界、固定端口归属、Electron 权限/Fuses、动态外链协议和 GitHub Actions 固定版本问题已经修复。修复后，未带程序专用请求头的非健康 API 请求返回 `403`；本地端口已被占用时，本程序服务以 `EADDRINUSE` 失败退出，不会接受其他进程的健康响应。

结论必须分两层理解：

- **源码公开准备度**：在创建 Git 仓库后再次核对首个提交文件清单，即可进入 GitHub 公开和外部复核阶段。
- **DMG/EXE 正式发布准备度**：尚未完成。必须先完成 macOS/Windows 原生密钥存储测试、签名、公证、干净账户安装/升级验收、最终哈希和来源到二进制的发布证明。

不存在可以诚实承诺的“100% 永久安全”。依赖供应链、操作系统已被入侵、恶意分叉/二次打包、PDF 解析器缺陷和用户主动开启云端 AI 仍然属于剩余风险。

## 已修复问题

### SEC-001：非健康 GET API 可被无自定义头请求触发

- 严重性：High
- 状态：已修复
- 位置：`server/index.js:47-65`、`server/index.js:122-132`、`src/App.tsx:2211-2215`、`src/App.tsx:6946-6949`
- 原问题：开发 Web 模式没有 Electron 会话令牌时，跨站图片/表单类请求可能在没有可读响应的情况下触发本地 PDF 读取或昂贵 GET 处理。CORS 本身不会阻止所有请求发送。
- 修复：除 `/api/health` 外，所有 API 路由都要求 `X-Docket-Observatory-Request: 1`；React API 包装器和 PDF 阅读器统一添加该请求头。跨站页面无法通过普通图片、表单或无预检请求添加该头。
- 验证：健康检查无头返回 `200`；dashboard 无头返回 `403`；带头返回 `200`。

### SEC-002：Electron 仅凭固定端口健康检查确认本地 API

- 严重性：High
- 状态：已修复
- 位置：`server/index.js:1237-1248`、`electron/main.cjs:55-58`
- 原问题：若 `4177` 已被其他进程占用，仅轮询健康地址不能证明响应者是本程序创建的 Express 服务。
- 修复：Express 导出监听启动 Promise，并在 bind 错误时拒绝；Electron 必须先等待本进程监听器成功，再进行带临时令牌的健康检查。
- 验证：测试端口被其他进程占用时，服务返回 `EADDRINUSE` 并以非零状态退出。

### SEC-003：Electron 权限默认值与通用 Node 运行时入口未完全收紧

- 严重性：High
- 状态：已修复
- 位置：`electron/main.cjs:70-77`、`electron/main.cjs:94-109`、`electron/main.cjs:198-206`、`package.json:42-50`、`server/document-search.js:1-23`
- 原问题：浏览器权限请求没有显式默认拒绝；搜索索引通过 `ELECTRON_RUN_AS_NODE` 子进程重建，使正式包无法安全关闭 RunAsNode Fuse。
- 修复：权限检查、权限请求和设备权限默认拒绝；阻止 webview 附加；显式启用 `webSecurity` 并禁止不安全内容；搜索索引改用有固定任务、最小环境和 15 分钟上限的 Worker；安装包关闭 RunAsNode、NODE_OPTIONS 和 inspector 参数，并启用 ASAR 完整性/唯一加载与文件协议限制。

### SEC-004：远程数据中的动态 URL 直接进入 React `href`

- 严重性：Medium
- 状态：已修复
- 位置：`src/App.tsx:2217-2226`
- 原问题：虽然 Electron 外部打开逻辑已有主机白名单，但普通浏览器开发模式仍应在渲染前拒绝 `javascript:`、`data:` 等活动协议。
- 修复：所有动态外链先通过 `safeExternalHref`，只接受 `https:` 和明确的回环 `http:`；Electron 再应用更严格的主机白名单。

### SEC-005：GitHub Actions 使用可移动版本标签

- 严重性：Medium
- 状态：已修复
- 位置：`.github/workflows/ci.yml`、`release-readiness.yml`、`codeql.yml`、`dependency-review.yml`
- 原问题：`actions/checkout@v4` 等可移动标签不能提供最严格的工作流供应链锁定。
- 修复：全部 Actions 固定到完整 40 位提交 SHA；新增 CodeQL、依赖变更审查和 Dependabot；安全扫描会拒绝未固定的 Action。

## 当前关键控制

- 本地 API 只监听 `127.0.0.1`，使用严格 CSP、安全响应头、2 MB JSON 上限、来源白名单、应用请求头、Electron 临时会话令牌和昂贵请求限速。证据：`server/index.js:45-65`、`server/index.js:67-160`。
- Electron renderer 使用 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`，preload 仅暴露安全存储状态。证据：`electron/main.cjs:61-79`、`electron/preload.cjs:1-6`。
- 外联只允许精确 HTTPS 主机；重定向逐跳复核，跨来源重定向删除 Authorization/Cookie。证据：`server/network-policy.cjs:96-143`、`server/safe-fetch.js:7-47`。
- OpenAI 调用由用户 Key 和设置控制，Responses 请求使用 `store: false`；正文传输默认关闭；原始 PDF 和本地路径不上传。
- Ollama 地址被限制为 loopback。证据：`server/settings-store.js:276-342`。
- macOS 凭证写入 AES-256-GCM 加密库，密钥由明确禁止认证界面的原生 Keychain 模块保护；Windows 使用异步 DPAPI `safeStorage`。普通设置与缓存目录使用限制性权限，API 只返回配置状态和末四位掩码。证据：`electron/macos-secret-store.cjs`、`native/macos-keychain-no-ui.mm`、`electron/main.cjs`、`server/settings-store.js`。
- PACER 自动付费下载服务端强制关闭，当前没有 PACER 登录/付费抓取适配器。证据：`server/settings-store.js:312-314`。
- 发布资料通过清理脚本移除路径字段和开发机路径，并为现行种子生成逐文件 SHA-256。证据：`scripts/prepare-release-data.mjs:24-76`、`scripts/prepare-release-data.mjs:157-183`。
- `.gitignore` 排除原始下载、运行缓存、输出、临时目录、环境文件、证书和密钥容器。

## 尚未关闭的发布阻断项

### REL-001：正式安装包尚未签名、公证和建立来源证明

- 严重性：High（安装包发布阻断）
- 影响：攻击者可以传播同名篡改包；公开源码不能证明第三方 DMG/EXE 与源码一致。
- 必须完成：Apple Developer ID 签名、公证和 stapling；Windows 代码签名和可信时间戳；受保护 release tag；从官方 Release 重新下载三个安装包并完成原生安装复核。
- 建议：发布 CI 使用 GitHub Environment 审批、最小权限 secrets 和 artifact attestation/SBOM。签名私钥不得进入仓库或聊天。

### REL-002：原生安全存储与安装升级验收尚未完成

- 严重性：High（安装包发布阻断）
- 影响：源码级静默钥匙串测试通过不等于签名成品、Windows DPAPI 和升级路径已经完成实机验收。
- 必须完成：签名 macOS 成品验证无认证界面 Keychain、首次安装和覆盖升级；Windows 正式构建机验证 DPAPI、首次安装、覆盖升级、卸载保留策略和凭证不可明文恢复。

### REL-003：仓库级安全设置尚未生效

- 严重性：Medium
- 原因：当前目录尚未初始化为 Git 仓库，GitHub 仓库也尚未创建。
- 必须完成：维护者 2FA、默认分支保护、必需 CI/CodeQL/依赖审查、至少一人审查、禁止强推、私密漏洞报告、限制 Actions 权限和 release environment 审批。

## 剩余风险

### RISK-001：依赖和构建供应链

- 严重性：Medium
- 说明：锁文件、完整性哈希、固定 Actions、CodeQL 和审计只能降低风险，不能排除 npm 包、发布账号或构建机被入侵。
- 控制：只用 `npm ci`；审查 Dependabot PR；定期生成 SBOM；保护 npm/GitHub/Apple/Windows 签名账号。

### RISK-002：不可信 PDF 的解析和资源耗尽

- 严重性：Medium
- 说明：PDF 来自白名单公开来源，但来源或镜像仍可能被攻陷。复杂、损坏或恶意 PDF 可能触发 `pdf-parse`、PDF.js、OCR/WASM 缺陷或造成内存/CPU 消耗。
- 现有控制：文件大小、页数、字符数、并发、超时、PDF 头、路径和 SHA-256 检查；renderer sandbox；索引 Worker 上限。
- 后续强化：保持解析依赖及时更新；对新来源做人工审核；未来可把正文解析进一步迁移到独立 utility process 并设置操作系统资源上限。

### RISK-003：同一操作系统账户已被入侵

- 严重性：Medium
- 说明：`0600/0700`、Keychain 和 DPAPI 不能抵抗已经控制应用进程或操作系统账户的恶意软件。法院资料和解读缓存为离线检索而明文保存。

### RISK-004：用户主动开启云端 AI

- 严重性：Medium
- 说明：只有用户配置 OpenAI 并允许正文传输后，提取文本才会发送给第三方。`store:false` 不是对第三方全部处理行为的永久保证，仍受服务条款、账号和网络安全影响。

### RISK-005：完整案卷资料的隐私与再分发责任

- 严重性：Medium
- 说明：公开法庭文件仍可能包含地址、联系方式、HID、签名图像或其他个人信息。代码安全审计不能替代逐文件密封状态、法院撤回、隐私删改和再分发许可检查。
- 必须完成：正式 corpus 发布前再次确认没有 sealed/restricted 文件、错误抓取的表单提交、未删改敏感标识或依法不应继续分发的文件。

### RISK-006：没有隐藏自动更新器意味着安全更新依赖用户主动安装

- 严重性：Low/Medium
- 说明：这符合当前透明和无隐藏网络行为要求，但漏洞修复不会自动到达旧版本用户。应在应用和 Release 文档中清楚展示版本号、安全公告和官方下载入口，不应静默下载执行代码。

### RISK-007：正常网络元数据泄露

- 严重性：Low
- 说明：自动刷新时，法院、政府、CourtListener、镜像或 OpenAI 会看到用户公网 IP、请求时间和常规 HTTPS 元数据。程序不添加遥测用户 ID，但无法隐藏直接网络连接本身。

## 发布前验证清单

1. 初始化 Git 后先执行 `git status --short --ignored`，逐项确认 `downloads/`、`server/cache/`、`release-data/`、`output/`、`tmp/`、`.env*`、证书和密钥未进入首个提交。
2. 运行 `npm ci`、`npm run lint`、`npm run build`、`npm run test:settings`、`npm run test:safe-storage`、`npm run test:electron-worker`、`npm run test:zero-key`、`npm run test:search`、`npm run security:check`、`npm run release:verify-data`。
3. 生成并发布 production SBOM，例如 `npm sbom --omit=dev --sbom-format=cyclonedx`，并保留构建日志和依赖锁文件。
4. 在干净 macOS/Windows 用户账户进行离线首次启动、联网增量更新、外链、PDF、密钥保存/删除、升级和卸载验收。
5. 签名并公证 DMG；签名 EXE；从 GitHub Release 重新下载三个安装包，验证安装、启动、完整资料载荷和卸载。
6. 用户只应从官方 GitHub Release 下载；不要把 GitHub Token、签名证书、PACER 凭证或 API Key 粘贴到聊天、Issue、源码或 Release Notes。

## 本轮验证结果

- `npm run lint`：通过
- `npm run build`：通过，生产 source map 关闭
- `npm run test:search:fixture`：通过，包含索引重建/损坏恢复场景
- `npm run test:electron-worker`：通过，Electron 主进程下无需 `ELECTRON_RUN_AS_NODE` 即可完成索引 Worker
- `npm run security:check`：通过
- `npm audit`：0 个已知漏洞
- Electron Builder 配置 Schema：通过
- 本地 API 请求头行为：通过
- 本地端口占用失败行为：通过
