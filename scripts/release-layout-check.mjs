import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export async function verifyReleaseInstallerLayout(releaseDirectory, { requireAssets = true } = {}) {
  const packageJson = JSON.parse(await readFile(path.join(process.cwd(), 'package.json'), 'utf8'))
  const entries = await readdir(path.resolve(releaseDirectory), { withFileTypes: true }).catch(() => [])
  const artifactNames = entries
    .filter((entry) => entry.isFile() && /\.(?:dmg|exe|zip|tar\.gz)$/iu.test(entry.name))
    .map((entry) => entry.name)
    .sort()
  const installerNames = artifactNames.filter((name) => /\.(?:dmg|exe)$/iu.test(name))
  if (requireAssets && installerNames.length === 0) throw new Error(`No DMG or EXE installer was found in ${releaseDirectory}.`)

  const unsignedInstallers = installerNames.filter((name) => name.includes('-unsigned.'))
  if (unsignedInstallers.length > 0 && unsignedInstallers.length !== installerNames.length) {
    throw new Error('Do not mix signed and explicitly unsigned installers in one release set.')
  }
  const releaseMode = unsignedInstallers.length === installerNames.length ? 'community_unsigned' : 'platform_signed'
  const unsignedSuffix = releaseMode === 'community_unsigned' ? '-unsigned' : ''
  const expectedInstallers = [
    `Docket-Observatory-${packageJson.version}-Windows-x64${unsignedSuffix}.exe`,
    `Docket-Observatory-${packageJson.version}-macOS-arm64${unsignedSuffix}.dmg`,
    `Docket-Observatory-${packageJson.version}-macOS-x64${unsignedSuffix}.dmg`,
  ].sort()
  const unexpectedInstallers = installerNames.filter((name) => !expectedInstallers.includes(name))
  const missingInstallers = expectedInstallers.filter((name) => !installerNames.includes(name))
  if (unexpectedInstallers.length || missingInstallers.length) {
    throw new Error([
      `Final release must contain exactly the three installers for version ${packageJson.version}.`,
      unexpectedInstallers.length ? `Unexpected or stale: ${unexpectedInstallers.join(', ')}` : '',
      missingInstallers.length ? `Missing: ${missingInstallers.join(', ')}` : '',
    ].filter(Boolean).join('\n'))
  }

  const unexpectedArchives = artifactNames.filter((name) => /\.(?:zip|tar\.gz)$/iu.test(name))
  if (unexpectedArchives.length) {
    throw new Error(`The public release set must contain installers only; remove archive artifacts: ${unexpectedArchives.join(', ')}`)
  }
  return { artifactNames, installerNames, releaseMode }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await verifyReleaseInstallerLayout(process.argv[2] ?? path.join(process.cwd(), 'release'))
  console.log(`Release layout passed: ${result.installerNames.join(', ')}.`)
}
