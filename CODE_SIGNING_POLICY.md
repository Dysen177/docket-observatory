# 代码签名政策 / Code Signing Policy

[中文](#中文) | [English](#english)

## 中文

### 当前零成本发行

本项目允许发布明确标注为 `unsigned` 的零成本社区构建。社区构建不会伪造、自签名或冒充受信任发布者，也不会关闭用户操作系统的安全功能。安装包继续包含与正式构建相同的应用硬化、完整资料载荷、哈希清单和构建来源记录；区别仅是没有平台商业身份签名与公证。

- macOS 文件名包含 `-unsigned.dmg`。首次打开时由用户通过 macOS 提供的“打开”或“仍要打开”流程确认。
- Windows 文件名包含 `-unsigned.exe`。首次运行时可能由用户通过 SmartScreen 的“更多信息”与“仍要运行”流程确认。
- 用户不应关闭 Gatekeeper、SmartScreen、防病毒软件或系统安全策略。
- 每个安装包必须从项目官方 GitHub Release 下载，并使用同一 Release 的 `SHA256SUMS.txt` 校验。

### 免费可信签名路线

Windows 项目公开发布并符合资格后，将申请 SignPath Foundation 的免费开源代码签名。只有申请获批且工作流验证通过后，Release 才能标注为 SignPath 签名。届时使用的声明为：Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org).

Apple 没有面向普通个人开源项目的免费 Developer ID。Apple 的免年费资格只适用于符合条件的非营利法人、受认可教育机构或政府实体，不适用于个人、个体经营者或单人企业。未取得 Apple Developer ID 时，项目只发布明确标注的未签名 macOS 社区构建，不声称完成 Apple 公证。

### 角色与控制

- 提交者与维护者：有权向受保护分支提交代码的项目维护者。
- 审查者：审查发布标签、依赖锁、构建脚本、网络白名单和安全变更的维护者。
- 批准者：有权批准 GitHub Release 或外部签名请求的仓库管理员。

签名凭据、令牌和私钥不得进入仓库、构建日志或发布载荷。正式签名和免费社区构建使用不同的文件名与工作流，不能互相冒充。项目隐私边界见 [PRIVACY.zh-CN.md](PRIVACY.zh-CN.md)，安全报告流程见 [SECURITY.zh-CN.md](SECURITY.zh-CN.md)。

## English

### Current zero-cost distribution

The project may publish zero-cost community builds that are explicitly labeled `unsigned`. These builds do not use fake or self-signed publisher identities and do not disable operating-system security controls. They retain the same Electron hardening, complete-data payload, checksums, and build-provenance records as formal builds; only platform identity signing and notarization are absent.

- macOS artifacts include `-unsigned.dmg`. The user confirms first launch through the macOS-provided Open or Open Anyway flow.
- Windows artifacts include `-unsigned.exe`. The user may need to use SmartScreen's More info and Run anyway flow.
- Users should not disable Gatekeeper, SmartScreen, antivirus software, or system security policy.
- Installers must be downloaded from the official GitHub Release and verified against that Release's `SHA256SUMS.txt`.

### Free trusted-signing route

After the public project is released and eligible, the project will apply for free open-source signing from SignPath Foundation. A Release may claim SignPath signing only after approval and successful workflow verification. The required acknowledgement will be: Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org).

Apple does not offer free Developer ID certificates to ordinary individual open-source developers. Apple's membership fee waiver is limited to qualifying nonprofit legal entities, accredited educational institutions, and government entities; individuals, sole proprietors, and single-person businesses are ineligible. Until a Developer ID is available, macOS community builds remain explicitly unsigned and do not claim Apple notarization.

### Roles and controls

- Committers and maintainers: project maintainers allowed to change protected branches.
- Reviewers: maintainers who review release tags, dependency locks, build scripts, network policy, and security changes.
- Approvers: repository administrators authorized to approve GitHub Releases or external signing requests.

Signing credentials, tokens, and private keys must never enter the repository, build logs, or release payload. Formally signed and free community builds use distinct artifact names and workflows and must never impersonate each other. See [PRIVACY.md](PRIVACY.md) for the privacy boundary and [SECURITY.md](SECURITY.md) for security reporting.
