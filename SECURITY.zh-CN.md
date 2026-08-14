# 安全政策

[中文](SECURITY.zh-CN.md) | [English](SECURITY.md) | [外联白名单](NETWORK.md) | [开源审计](OPEN_SOURCE_AUDIT.md)

案卷观察台是本地运行的 macOS/Windows 法律研究工具。当前源码审计未发现已知后门、遥测、广告分析、远程数据库或隐藏自动更新通道。绝对的“永远不可能有后门”无法仅靠文字保证，因此项目提供可以复核的技术证据。

## 可复核的安全边界

- React/Electron 界面与 Express API 均在本机运行，API 只绑定 `127.0.0.1`。
- Electron 开启 `contextIsolation`、关闭 `nodeIntegration`、启用 renderer sandbox，并使用临时本地会话令牌保护 API。
- 外联域名由 `server/network-policy.cjs` 白名单限制，并在 `NETWORK.md` 逐项说明。
- 没有任意 URL 抓取接口、任意本地文件读取接口或 Shell 命令执行入口。
- PDF、OCR 页面和本地路径不会上传。OpenAI 只在用户配置 Key、选择 OpenAI 并满足正文授权条件时接收提取文本，所有 Responses API 请求使用 `store:false`。
- macOS 将 OpenAI、CourtListener 和 PACER 凭证保存到 AES-256-GCM 加密库，随机密钥由原生钥匙串模块读取，并通过 `LAContext.interactionNotAllowed = true` 明确禁止系统认证弹窗；Windows 使用 Electron 异步 `safeStorage` 背后的 DPAPI。界面只返回掩码状态。
- macOS 同时把 Chromium 内部 OSCrypt 切换到 `use-mock-keychain`，彻底阻止 Chromium 访问 `Electron Safe Storage`。程序没有登录 Cookie、远程用户会话或账户认证状态；API Key/PACER 凭证不会使用该测试后端，仍由上一条原生无弹窗钥匙串和 AES-256-GCM 保护。
- PACER 自动付费下载被服务端强制关闭，当前版本也没有实现 PACER 登录/下载适配器。
- 设置中可编辑的普通参数只保存在本机，保存后由运行时读取；文件目录和缓存目录是应用管理的只读诊断信息，不是可迁移资料库的输入框。这样可避免约 1.8 GB 完整基线发生不完整迁移，并把路径变更排除在 renderer 信任边界之外。
- 除健康检查外，所有本地 API 都必须带程序专用请求头；正式 Electron 版还必须通过每次启动随机生成的临时会话令牌，并使用恒定时间比较。Electron 会等待本进程创建的监听器成功启动，端口被占用时直接停止，不会把其他本地进程误认为本程序 API。
- Electron 默认拒绝不需要的浏览器权限请求，并通过 Fuses 关闭 `ELECTRON_RUN_AS_NODE`、`NODE_OPTIONS`、调试器启动参数、非 ASAR 应用代码回退和额外 `file://` 权限。全文索引改用受限 Worker 线程，不需要把 Electron 可执行文件当作通用 Node 运行时。

## 完整版资料安全

完整版 DMG/EXE 包含法院 PDF 和预计算研究缓存，但不会直接打包开发机原始缓存。发布脚本会排除设置、密钥、诊断、自动化历史、日志和开发机路径，只保留经过清理的正文提取、现有译文/阅读辅助、法律解读、案件总览、审计和检索数据。发布版首次启动会逐文件核对研究种子的大小和 SHA-256；校验失败会停止启动，不会静默退回空资料库或低层级历史重建。

发布前生成：

- `release-metadata/corpus-manifest.json`：资料来源、文件坐标、大小和 SHA-256。
- `release-metadata/seed-cache-manifest.json`：解读/翻译/索引种子文件清单和 SHA-256。
- `SHA256SUMS.txt`：最终 DMG/EXE 哈希。

## GitHub 与安装包可信度

公开源码本身不能证明任意一个 DMG/EXE 一定由该源码构建。正式发布必须使用受保护的版本标签，macOS 包需要签名、公证和 stapling，Windows 包需要代码签名，并同时发布 `SHA256SUMS.txt`、`SBOM.cdx.json` 和 `BUILD-PROVENANCE.json`。Release 发布后，GitHub Actions 会重新核对哈希并给 DMG/EXE 生成 GitHub artifact attestation。用户应只从项目官方 GitHub Release 下载，核对签名和哈希，不应信任来源不明的二次打包或未经审查的分叉版本。

GitHub Actions 已固定到完整提交 SHA，并配置 Dependabot、CodeQL、依赖变更审查、锁文件和 `npm audit`。仓库启用后还应设置维护者双重验证、分支保护、合并审查、私密漏洞报告和最小权限发布密钥。

当前源码可以进入公开前审计阶段，但签名安装包仍有两项发布机门槛：macOS 签名成品的无认证界面 Keychain 测试，以及 Windows 正式机器上的 DPAPI、安装/升级和代码签名验证。不能把“源码检查通过”等同于“安装包已经完成最终安全验收”。

## 仍然存在的风险

任何审计都不能保证永久或绝对安全。剩余风险包括依赖或构建环境被入侵、恶意分叉/二次打包、操作系统账户已经被恶意软件控制、恶意或异常复杂 PDF 触发解析器缺陷或资源耗尽、环境变量中的凭证被同账户进程读取，以及用户主动开启云端 AI 正文传输。自动访问公开来源时，对方网站会像普通 HTTPS 访问一样看到用户的公网 IP 和请求时间。

## 发布前检查

```bash
npm run lint
npm run build
npm run test:zero-key
npm run test:settings
npm run test:safe-storage
npm run test:keychain:no-ui
npm run test:credential-vault
npm run test:electron-worker
npm run release:test-seed-install
npm run test:search:fixture
npm run security:check
npm run release:prepare-data
npm run release:verify-data
```

发现安全问题时，不要公开粘贴 API Key、PACER 凭证、私有路径或受密封/限制材料。应先通过维护者指定的私密渠道报告；在尚未建立私密渠道前，不要把可利用细节发布到公共 Issue。
