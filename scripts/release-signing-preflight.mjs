import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'

const target = process.argv[2]

function fail(message) {
  console.error(`Release signing preflight failed: ${message}`)
  process.exit(1)
}

function complete(message) {
  console.log(`Release signing preflight passed: ${message}`)
}

function run(command, args, timeout = 120000) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    timeout,
    windowsHide: true,
  })
}

function verifyMacNotarizationCredentials() {
  const args = ['notarytool', 'history', '--output-format', 'json']
  if (process.env.APPLE_KEYCHAIN_PROFILE) {
    args.push('--keychain-profile', process.env.APPLE_KEYCHAIN_PROFILE)
    if (process.env.APPLE_KEYCHAIN) args.push('--keychain', process.env.APPLE_KEYCHAIN)
  } else if (process.env.APPLE_API_KEY && process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER) {
    if (!existsSync(process.env.APPLE_API_KEY)) fail('APPLE_API_KEY must point to an existing App Store Connect .p8 file.')
    args.push('--key', process.env.APPLE_API_KEY, '--key-id', process.env.APPLE_API_KEY_ID, '--issuer', process.env.APPLE_API_ISSUER)
  } else if (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID) {
    args.push('--apple-id', process.env.APPLE_ID, '--password', process.env.APPLE_APP_SPECIFIC_PASSWORD, '--team-id', process.env.APPLE_TEAM_ID)
  } else {
    fail('notarization credentials are missing. Configure an App Store Connect API key, Apple ID credentials, or a notarytool keychain profile.')
  }

  const result = run('/usr/bin/xcrun', args)
  if (result.status !== 0) fail('Apple notarization credentials could not be authenticated with notarytool history.')
}

if (target === 'mac') {
  if (process.platform !== 'darwin') fail('macOS releases must be built and signed on macOS.')
  const identities = run('/usr/bin/security', ['find-identity', '-v', '-p', 'codesigning'], 10000)
  const identityOutput = `${identities.stdout ?? ''}\n${identities.stderr ?? ''}`
  if (identities.status !== 0 || !identityOutput.includes('Developer ID Application:')) {
    fail('no valid Apple Developer ID Application certificate is available in the signing keychain.')
  }
  const notarytool = run('/usr/bin/xcrun', ['notarytool', '--version'], 10000)
  if (notarytool.status !== 0) fail('Apple notarytool is unavailable. Install current Xcode Command Line Tools or Xcode.')
  verifyMacNotarizationCredentials()
  complete('Developer ID signing identity and authenticated notarization credentials are available without printing secret values.')
} else if (target === 'win') {
  if (process.platform !== 'win32') fail('Windows releases must be built, signed, and verified on Windows.')
  const certificateLink = process.env.WIN_CSC_LINK || process.env.CSC_LINK
  const certificatePassword = process.env.WIN_CSC_KEY_PASSWORD || process.env.CSC_KEY_PASSWORD
  const hasCertificateFile = Boolean(certificateLink && certificatePassword)
  const hasCertificateSelector = Boolean(process.env.CSC_NAME)
  if (!hasCertificateFile && !hasCertificateSelector) {
    fail('Windows code-signing credentials are missing. Configure WIN_CSC_LINK/WIN_CSC_KEY_PASSWORD, CSC_LINK/CSC_KEY_PASSWORD, or a reviewed CSC_NAME certificate selector.')
  }
  const powershell = run('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    "$ErrorActionPreference='Stop'; Get-Command Get-AuthenticodeSignature | Out-Null; if ($env:CSC_NAME) { $match = Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) -and $_.Subject -like ('*' + $env:CSC_NAME + '*') } | Select-Object -First 1; if (-not $match) { throw 'No matching valid private-key certificate in CurrentUser/My.' } }",
  ], 30000)
  if (powershell.status !== 0) fail('Windows Authenticode tooling or the selected certificate is unavailable.')
  complete('Windows-native Authenticode configuration is present without printing secret values.')
} else {
  fail('expected target argument "mac" or "win".')
}
