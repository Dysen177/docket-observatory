import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export const githubReleaseFileLimitBytes = 2 * 1024 * 1024 * 1024
export const releaseSafetyMarginBytes = 32 * 1024 * 1024
export const maximumReleaseAssetBytes = githubReleaseFileLimitBytes - releaseSafetyMarginBytes

const releaseAssetPattern = /\.(?:dmg|exe)$/iu

export async function inspectReleaseAssetSizes(releaseDirectory, { requireAssets = true } = {}) {
  const directory = path.resolve(releaseDirectory)
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const names = entries
    .filter((entry) => entry.isFile() && releaseAssetPattern.test(entry.name))
    .map((entry) => entry.name)
    .sort()

  if (requireAssets && names.length === 0) {
    throw new Error(`No DMG or EXE installer was found in ${directory}.`)
  }

  const assets = await Promise.all(names.map(async (name) => {
    const info = await stat(path.join(directory, name))
    return {
      name,
      bytes: info.size,
      gibibytes: info.size / (1024 ** 3),
      remainingBytes: maximumReleaseAssetBytes - info.size,
    }
  }))

  const oversized = assets.filter((asset) => asset.bytes >= maximumReleaseAssetBytes)
  if (oversized.length) {
    const details = oversized
      .map((asset) => `${asset.name}: ${formatBytes(asset.bytes)} (${formatBytes(-asset.remainingBytes)} over the project safety cap)`)
      .join('\n')
    throw new Error(
      `Release asset size check failed. GitHub requires every release file to be under 2 GiB; `
      + `this project reserves a 32 MiB upload margin.\n${details}`,
    )
  }

  return assets
}

export function formatBytes(bytes) {
  const value = Math.abs(Number(bytes) || 0)
  if (value >= 1024 ** 3) return `${(value / (1024 ** 3)).toFixed(3)} GiB`
  if (value >= 1024 ** 2) return `${(value / (1024 ** 2)).toFixed(1)} MiB`
  return `${value.toLocaleString('en-US')} bytes`
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const releaseDirectory = process.argv[2] ?? path.join(process.cwd(), 'release')
  const assets = await inspectReleaseAssetSizes(releaseDirectory)
  for (const asset of assets) {
    console.log(`${asset.name}: ${formatBytes(asset.bytes)}; ${formatBytes(asset.remainingBytes)} below the project cap.`)
  }
  console.log(`Checked ${assets.length} installer(s). Per-file project cap: ${formatBytes(maximumReleaseAssetBytes)}.`)
}
