# GitHub 运营说明 / GitHub Operations

[中文](#中文) | [English](#english)

## 中文

### 凭据边界

本项目不会创建或提交任何 GitHub Token、SSH 私钥、GPG 私钥或包含凭据的“API 文件夹”。当前开发机使用 GitHub CLI 的 OAuth 登录，凭据由 macOS 钥匙串保存；项目目录、Git 历史、GitHub Actions artifact 和公开 Release 都不保存 Token。

这样做不是限制项目控制，而是避免公开仓库最常见的密钥泄漏路径：`.gitignore` 不能保护已经被提交的文件，备份、压缩包、日志和误上传也可能暴露密钥。专用公益账号可以承担项目运营，但凭据仍应使用操作系统安全存储。

### 当前管理方式

- Git 推送使用 GitHub CLI 管理的 HTTPS OAuth 凭据。
- 创建仓库、修改仓库设置、管理 Issues、查看 Actions 和创建 Release 使用 `gh` API/CLI。
- SSH Key 不是必需品；只有希望用 SSH 地址推送时才需要。
- GPG Key 不是 API 权限；它只用于签名 Git commit，可以以后单独配置。
- `repo` 和 `workflow` 权限用于仓库与 Actions；`user` 仅用于修改账号公开资料。不要额外申请删除仓库、组织管理或付款权限，除非有明确任务需要。

### 已核对的仓库设置

- 仓库为公开仓库，默认分支为 `main`，Issues 和 Pull Requests 已开启。
- Dependabot 安全更新、Secret Scanning、Secret Scanning Push Protection 和私密漏洞报告已开启。
- GitHub Actions 的默认工作流权限为只读；工作流按文件声明最小权限。
- `main` 要求至少 1 个 Pull Request 审查，过期审查会失效，必须解决审查对话；禁止强制推送和删除分支。
- 管理员不被强制要求走 Pull Request，以便项目维护者在构建、发布或紧急修复时仍能直接维护；外部贡献者仍需经过审查。
- 合并 Pull Request 后自动删除主题分支，减少长期遗留分支。

GitHub 账户级的两步验证状态、恢复代码、恢复邮箱和付款设置不会通过当前仓库 API 暴露，也不应由项目脚本代管。账号所有者应在 GitHub **Settings → Password and authentication** 中自行确认两步验证已开启，并离线保存恢复代码。

### 账号控制与撤销

账号密码、两步验证、恢复邮箱、恢复代码和付款信息应由账号所有者保管。当前机器上的授权可以随时撤销：

```bash
gh auth logout --hostname github.com
```

也可以在 GitHub 的 **Settings → Applications** 中撤销 GitHub CLI 的授权。撤销后，代码仍在 GitHub 仓库中，但本机不能继续执行推送、Release 或设置修改。

### 公开前检查

每次推送前应运行：

```bash
npm run lint
npm run build
npm run security:check
git grep -nE '(github_pat_|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)' || true
git status --short
```

## English

### Credential boundary

This project never creates or commits a GitHub token, SSH private key, GPG private key, or credential-bearing "API folder." The development machine uses GitHub CLI OAuth, with credentials stored by the macOS Keychain. No token is stored in the project directory, Git history, GitHub Actions artifacts, or public Releases.

This is not a limitation on project operations. It prevents common public-repository secret leaks: `.gitignore` cannot protect a file that was already committed, and backups, archives, logs, or accidental uploads can expose credentials. A dedicated nonprofit project account can still be operated normally while credentials remain in the operating-system secure store.

### Current operating model

- Git pushes use HTTPS OAuth credentials managed by GitHub CLI.
- Repository creation and settings, Issues, Actions inspection, and Releases use the `gh` API/CLI.
- An SSH key is optional and is only needed when using SSH Git URLs.
- A GPG key is not an API credential; it only signs Git commits and can be configured separately.
- `repo` and `workflow` support repository and Actions operations; `user` is only for public profile changes. Do not request delete-repository, organization-administration, or billing permissions without a concrete task.

### Verified repository settings

- The repository is public, uses `main` as its default branch, and has Issues and Pull Requests enabled.
- Dependabot security updates, Secret Scanning, Secret Scanning Push Protection, and private vulnerability reporting are enabled.
- GitHub Actions defaults to read-only workflow permissions; workflows declare their own minimum permissions.
- `main` requires at least one Pull Request approval, dismisses stale approvals, and requires review conversations to be resolved. Force pushes and branch deletion are disabled.
- Administrators are not required to use a Pull Request, so the project owner can still maintain release and emergency fixes directly; external contributions remain review-gated.
- Head branches are deleted automatically after a Pull Request is merged.

Account-level two-factor-authentication status, recovery codes, recovery email, and billing settings are not exposed through the repository API and should not be managed by project scripts. The account owner should confirm two-factor authentication under GitHub **Settings → Password and authentication** and keep recovery codes offline.

### Account control and revocation

The account owner should retain the password, two-factor authentication, recovery email, recovery codes, and billing information. Revoke this machine's authorization at any time:

```bash
gh auth logout --hostname github.com
```

The authorization can also be revoked under GitHub **Settings → Applications**. After revocation, the repository remains on GitHub, but this machine can no longer push, create Releases, or change settings.

### Pre-push checks

Run the following before every public push:

```bash
npm run lint
npm run build
npm run security:check
git grep -nE '(github_pat_|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)' || true
git status --short
```
