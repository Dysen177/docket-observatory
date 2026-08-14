import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const releaseDirectory = path.resolve(process.argv[2] ?? path.join(root, 'release'))
const artifactPattern = /\.(?:dmg|exe|zip|tar\.gz)$/i

async function sha256(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}

const entries = await readdir(releaseDirectory, { withFileTypes: true }).catch(() => [])
const artifactNames = entries.filter((entry) => entry.isFile() && artifactPattern.test(entry.name)).map((entry) => entry.name).sort()
if (!artifactNames.some((name) => name.endsWith('.dmg')) || !artifactNames.some((name) => name.endsWith('.exe'))) {
  throw new Error('Final release assets must include at least one signed DMG and one signed EXE before metadata is generated.')
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const sbomResult = spawnSync(npmCommand, ['sbom', '--omit=dev', '--sbom-format=cyclonedx'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 120000,
})
if (sbomResult.status !== 0 || !sbomResult.stdout.trim()) {
  throw new Error(`SBOM generation failed: ${(sbomResult.stderr || 'unknown error').trim()}`)
}
const sbomPath = path.join(releaseDirectory, 'SBOM.cdx.json')
await writeFile(sbomPath, `${sbomResult.stdout.trim()}\n`, { mode: 0o600 })

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const evidenceFiles = [
  'package-lock.json',
  'release-metadata/corpus-manifest.json',
  'release-metadata/seed-cache-manifest.json',
]
const evidence = {}
for (const relative of evidenceFiles) {
  evidence[relative] = await sha256(path.join(root, relative))
}

const artifacts = []
for (const name of artifactNames) {
  const filePath = path.join(releaseDirectory, name)
  const info = await stat(filePath)
  artifacts.push({ name, bytes: info.size, sha256: await sha256(filePath) })
}

const provenancePath = path.join(releaseDirectory, 'BUILD-PROVENANCE.json')
await writeFile(provenancePath, `${JSON.stringify({
  schemaVersion: 1,
  statementType: 'Docket Observatory local release build record; not a SLSA attestation',
  generatedAt: new Date().toISOString(),
  application: packageJson.productName ?? packageJson.build?.productName ?? 'Docket Observatory',
  version: packageJson.version,
  sourceCommit: process.env.RELEASE_SOURCE_COMMIT || process.env.GITHUB_SHA || null,
  sourceReference: process.env.GITHUB_REF || null,
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  evidence,
  artifacts,
}, null, 2)}\n`, { mode: 0o600 })

const checksumNames = [...artifactNames, path.basename(sbomPath), path.basename(provenancePath)].sort()
const checksumLines = []
for (const name of checksumNames) checksumLines.push(`${await sha256(path.join(releaseDirectory, name))}  ${name}`)
await writeFile(path.join(releaseDirectory, 'SHA256SUMS.txt'), `${checksumLines.join('\n')}\n`, { mode: 0o600 })

console.log(`Finalized ${artifactNames.length} signed release assets with SBOM, provenance record, and SHA-256 checksums.`)
