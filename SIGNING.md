# 正式签名与原生构建 / Formal Signing And Native Builds

[中文](#中文) | [English](#english)

## 中文

### 零成本社区构建

如果当前目标只是让用户在零预算下安装使用，可以构建明确标注的未签名社区包，同时保留本文件后续章节的正式签名配置：

```bash
npm run desktop:dmg:community
# 必须在 Windows 上执行
npm run desktop:exe:community
```

社区配置位于 `electron-builder.community.cjs`。它只关闭平台身份签名和 Apple 公证，不关闭 Electron fuses、ASAR 完整性、完整资料载荷或发布数据校验。产物名称固定包含 `-unsigned`，避免用户把它误认为可信发布者签名版本。macOS 用户首次运行时使用系统提供的“打开”或“仍要打开”；Windows 用户可能需要使用 SmartScreen 的“更多信息”与“仍要运行”。不得指导用户关闭 Gatekeeper、SmartScreen 或防病毒软件。

Apple 不向普通个人开源项目免费提供 Developer ID。开源本身不符合免年费条件；Apple 官方免年费仅面向符合条件的非营利法人、受认可教育机构和政府实体。Windows 在项目公开发布并达到资格后可申请 SignPath Foundation 免费开源签名，但批准权属于 SignPath，不能在获批前承诺。详见 [CODE_SIGNING_POLICY.md](CODE_SIGNING_POLICY.md)。

正式签名发行通道不允许使用临时签名、ad-hoc 签名或未签名安装包。该通道的 `forceCodeSigning`、发布预检和安装包验证均采用失败即停止策略；它与前述文件名包含 `-unsigned` 的社区发行通道相互独立。

### macOS Developer ID 与公证

发布者必须加入 Apple Developer Program，并在 Apple Developer 后台申请 `Developer ID Application` 证书。推荐使用“钥匙串访问”的证书助理生成 CSR，使私钥直接留在发布 Mac 的登录钥匙串中；下载 Apple 返回的证书后双击导入同一钥匙串。

确认身份：

```bash
security find-identity -v -p codesigning
```

输出必须包含有效的 `Developer ID Application:`。仅有 `Apple Development`、`Mac Developer` 或 ad-hoc 身份不符合公开 DMG 要求。

公证推荐使用 `notarytool` 钥匙串配置。配置名称示例为 `DocketObservatoryNotary`，实际 Apple ID、Team ID 和 App 专用密码只输入本机 `notarytool`，不得写入项目、shell 脚本或 GitHub 仓库。完成后为发布 shell 或自托管 runner 设置：

```bash
export APPLE_KEYCHAIN_PROFILE=DocketObservatoryNotary
```

也可以使用 App Store Connect API Key，设置 `APPLE_API_KEY` 指向本机 `.p8` 文件，并同时设置 `APPLE_API_KEY_ID` 与 `APPLE_API_ISSUER`。`.p8` 已被 `.gitignore` 阻止提交。

发布预检会实际调用 `notarytool history` 验证凭据，不只检查环境变量是否存在。构建完成后，`release:verify:mac` 会检查 stapling、Gatekeeper 和应用代码签名。

### Windows Authenticode

Windows 正式 EXE 必须在 Windows 上生成。推荐从可信代码签名服务商取得组织或个人代码签名证书，并将 PFX 和密码分别配置为 GitHub Actions Secrets：

- `WINDOWS_CSC_LINK`: PFX 的 Base64 内容，或 Electron Builder 支持的安全证书位置。
- `WINDOWS_CSC_KEY_PASSWORD`: PFX 密码。

工作流把它们映射为 `WIN_CSC_LINK` 与 `WIN_CSC_KEY_PASSWORD`，仅在临时 Windows runner 中使用。项目强制 SHA-256 和 RFC 3161 时间戳；`release:verify:win` 要求安装包的 Authenticode 状态为 `Valid`，同时必须存在签名证书和时间戳证书。

有效签名会显著降低系统拦截风险，但 Windows SmartScreen 还会结合证书信誉、下载量和文件信誉判断。任何程序都不能诚实保证新证书发布的首个版本绝不会出现 SmartScreen 提示；不得通过关闭 SmartScreen、篡改安全策略或诱导用户忽略警告来处理。

### 完整版跨平台工作流

`.github/workflows/signed-complete-release.yml` 使用同一份经哈希绑定的完整资料载荷：

1. 本地发布项目使用 Node 24 执行 `npm run release:stage-data`。
2. 自托管 Apple silicon Mac runner 从 `DOCKET_OBSERVATORY_RELEASE_SOURCE_ROOT` 读取已准备的完整资料；该变量只配置在 runner 服务环境，不提交到仓库。
3. Mac runner 使用本机 Developer ID 和 `APPLE_KEYCHAIN_PROFILE` 构建、验证 DMG，并上传临时完整资料载荷。
4. GitHub 托管的 `windows-latest` runner 下载同一载荷，在 Windows 上签名构建并验证 EXE。
5. 最终 job 流式计算大型安装包哈希，生成 SBOM、构建来源记录和 `SHA256SUMS.txt`。

Mac runner 需要自定义标签 `docket-observatory-release`。发布证书、私钥、PFX、密码、`.p8` 和 Apple 凭据均不得进入 Git 历史或 Actions artifact。

## English

### Zero-cost community builds

When the immediate requirement is installability at zero budget, build explicitly unsigned community artifacts while preserving the formal signing path below:

```bash
npm run desktop:dmg:community
# Run on Windows
npm run desktop:exe:community
```

`electron-builder.community.cjs` disables only platform identity signing and Apple notarization. It preserves Electron fuses, ASAR integrity, the complete-data payload, and release-data verification. Artifact names always contain `-unsigned`. macOS users confirm first launch through Open or Open Anyway; Windows users may need SmartScreen's More info and Run anyway flow. Never instruct users to disable Gatekeeper, SmartScreen, or antivirus protection.

Apple does not provide free Developer ID certificates to ordinary individual open-source developers. Open-source status alone does not qualify for Apple's fee waiver. After a public release and eligibility review, the Windows build can apply for free SignPath Foundation open-source signing, but approval cannot be promised in advance. See [CODE_SIGNING_POLICY.md](CODE_SIGNING_POLICY.md).

The formally signed distribution path never uses ad-hoc or unsigned installers. Its `forceCodeSigning`, release preflights, and post-build verification fail closed; it is separate from the explicitly `-unsigned` community distribution path described above.

For macOS, join the Apple Developer Program, create a `Developer ID Application` certificate, keep its private key in the release Mac login Keychain, and configure notarization through a `notarytool` Keychain profile or an App Store Connect API key. The preflight authenticates the credentials with `notarytool history`; post-build verification checks stapling, Gatekeeper, and code signatures.

For Windows, obtain a trusted Authenticode certificate and configure `WINDOWS_CSC_LINK` and `WINDOWS_CSC_KEY_PASSWORD` as GitHub Actions secrets. The Windows-native job maps them to Electron Builder's `WIN_CSC_*` variables, signs with SHA-256 and an RFC 3161 timestamp, and requires a valid signer and timestamp certificate. A valid signature reduces warnings but cannot guarantee immediate SmartScreen reputation for a new certificate or new binary.

The signed complete-release workflow stages reviewed data from a dedicated self-hosted Apple silicon Mac runner, builds and notarizes both DMGs there, transfers the same hashed data payload to a GitHub-hosted Windows runner, and then produces checksums, an SBOM, and build provenance. Keep every certificate and credential outside the repository and build artifacts.
