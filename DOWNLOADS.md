# 下载与校验 / Downloads And Verification

[中文](#中文) | [English](#english)

## 中文

### 下载位置

1. 打开 [GitHub 最新版本页面](../../releases/latest)。
2. 在 `Assets` 区域选择系统对应的安装包：
   - Apple 芯片 Mac：`Docket-Observatory-0.1.0-macOS-arm64-unsigned.dmg`
   - Intel Mac：`Docket-Observatory-0.1.0-macOS-x64-unsigned.dmg`
   - Windows 10/11 x64：`Docket-Observatory-0.1.0-Windows-x64-unsigned.exe`
   - `v0.1.0` 是明确标注的零成本未签名社区构建，不会冒充正式签名版本。
3. 同时下载 `SHA256SUMS.txt`，核对安装包是否与发布者生成的文件完全一致。

macOS 终端校验：

```bash
shasum -a 256 Docket-Observatory-*.dmg
```

Windows PowerShell 校验：

```powershell
Get-FileHash .\Docket-Observatory-*.exe -Algorithm SHA256
```

将输出值与 `SHA256SUMS.txt` 对照。任何一个字符不一致都不要安装，应重新下载并在 GitHub Issue 中报告。

### 为什么安装包很大

完整版不是空资料库。发布基线包含 1,578 份有效法院/机构/历史公开 PDF（约 1.3 GB）、完整性记录，以及约 0.5 GB 的当前正文提取、现有译文/阅读辅助、文件解读、案件整体解读、关系审计和全文索引。Electron、OCR 语言模型和运行依赖还会增加体积。安装后程序还需要把可更新的研究缓存放入用户数据目录，因此建议至少预留 5 GB 空间。首次启动会按内置清单逐文件校验研究种子；校验失败时程序会停止并提示重新下载，不会退回空资料库或重新生成历史基线。

### 系统安全提示

- 当前 `v0.1.0` 是明确标注 `-unsigned` 的零成本社区构建，可以安装使用，但首次打开可能需要使用 macOS 的“打开/仍要打开”或 Windows SmartScreen 的“更多信息/仍要运行”。不要关闭系统安全功能。
- 如果未来提供正式签名发行层级，DMG 将使用 Apple Developer ID 签名并完成 notarization，EXE 将使用可信代码签名证书和时间戳；该层级与当前社区构建使用不同文件名和验证规则。
- 如果系统显示“未知发布者”或签名与 Release 说明不一致，不要绕过警告安装。
- 只从本项目 GitHub Releases 下载，不要从来源不明的网盘、聊天附件或二次打包网站获取。
- 详见 [代码签名政策](CODE_SIGNING_POLICY.md)。

## English

### Where To Download

1. Open the [latest GitHub Release](../../releases/latest).
2. Under `Assets`, choose the installer for your system:
   - Apple silicon Mac: `Docket-Observatory-0.1.0-macOS-arm64-unsigned.dmg`
   - Intel Mac: `Docket-Observatory-0.1.0-macOS-x64-unsigned.dmg`
   - Windows 10/11 x64: `Docket-Observatory-0.1.0-Windows-x64-unsigned.exe`
   - `v0.1.0` is an explicitly labeled zero-cost unsigned community build and never impersonates a formally signed release.
3. Download `SHA256SUMS.txt` and verify the installer.

macOS:

```bash
shasum -a 256 Docket-Observatory-*.dmg
```

Windows PowerShell:

```powershell
Get-FileHash .\Docket-Observatory-*.exe -Algorithm SHA256
```

Compare the result with `SHA256SUMS.txt`. Do not install a file whose hash differs by even one character.

### Why The Installer Is Large

The complete edition is not an empty library. Its release baseline contains 1,578 valid public court/agency/archive PDFs (about 1.3 GB), integrity records, and about 0.5 GB of current extracted text, existing translation/reading data, document reads, case reads, relationship audits, and search data. Electron, OCR language models, and runtime dependencies add more. The application also creates a writable per-user research cache, so keep at least 5 GB free. First launch verifies every research-seed file against the bundled manifest. Verification failure stops startup and asks for a clean download; it does not rebuild an empty historical library.

### Platform Warnings

- The current `v0.1.0` artifacts are explicitly labeled `-unsigned` zero-cost community builds. They are installable, but first launch can require macOS Open/Open Anyway or Windows SmartScreen More info/Run anyway confirmation. Do not disable system security controls.
- If a formally signed distribution tier is offered later, its DMGs will use Apple Developer ID signing and notarization, and its EXE will use trusted timestamped Authenticode. That tier will use distinct filenames and verification rules.
- Do not bypass an unexpected publisher or signature warning.
- Download only from this project's GitHub Releases, not from repackaged third-party mirrors.
- See the [Code Signing Policy](CODE_SIGNING_POLICY.md).
