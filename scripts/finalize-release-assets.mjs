import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const releaseDirectory = path.resolve(process.argv[2] ?? path.join(root, 'release'))
const artifactPattern = /\.(?:dmg|exe|zip|tar\.gz)$/i
const publicEvidenceNames = [
  'corpus-manifest.json',
  'corpus-publication-review.md',
  'corpus-review-decisions.json',
  'seed-cache-manifest.json',
]

function parseArtifactSourceCommits(value) {
  if (!value) return {}
  let parsed
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('RELEASE_ARTIFACT_SOURCE_COMMITS must be a JSON object keyed by artifact filename.')
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('RELEASE_ARTIFACT_SOURCE_COMMITS must be a JSON object keyed by artifact filename.')
  }
  for (const [name, commit] of Object.entries(parsed)) {
    if (!artifactPattern.test(name) || typeof commit !== 'string' || !/^[0-9a-f]{7,40}$/i.test(commit)) {
      throw new Error(`Invalid artifact source-commit entry for ${name}.`)
    }
  }
  return parsed
}

async function sha256(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}

const entries = await readdir(releaseDirectory, { withFileTypes: true }).catch(() => [])
const artifactNames = entries.filter((entry) => entry.isFile() && artifactPattern.test(entry.name)).map((entry) => entry.name).sort()
const publicEvidence = publicEvidenceNames.filter((name) => entries.some((entry) => entry.isFile() && entry.name === name))
if (!artifactNames.some((name) => name.endsWith('.dmg')) || !artifactNames.some((name) => name.endsWith('.exe'))) {
  throw new Error('Final release assets must include at least one DMG and one EXE before metadata is generated.')
}

const installerNames = artifactNames.filter((name) => /\.(?:dmg|exe)$/i.test(name))
const unsignedInstallers = installerNames.filter((name) => name.includes('-unsigned.'))
if (unsignedInstallers.length > 0 && unsignedInstallers.length !== installerNames.length) {
  throw new Error('Do not mix signed and explicitly unsigned installers in one release set.')
}
const releaseMode = unsignedInstallers.length === installerNames.length ? 'community_unsigned' : 'platform_signed'

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
const defaultSourceCommit = process.env.RELEASE_SOURCE_COMMIT || process.env.GITHUB_SHA || null
const artifactSourceCommitOverrides = parseArtifactSourceCommits(process.env.RELEASE_ARTIFACT_SOURCE_COMMITS)
for (const name of Object.keys(artifactSourceCommitOverrides)) {
  if (!artifactNames.includes(name)) throw new Error(`Artifact source-commit entry does not match a release file: ${name}`)
}
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
  artifacts.push({
    name,
    bytes: info.size,
    sha256: await sha256(filePath),
    sourceCommit: artifactSourceCommitOverrides[name] || defaultSourceCommit,
  })
}

const artifactSourceCommits = Object.fromEntries(artifacts.map(({ name, sourceCommit }) => [name, sourceCommit]))
const distinctSourceCommits = [...new Set(Object.values(artifactSourceCommits).filter(Boolean))]

const provenancePath = path.join(releaseDirectory, 'BUILD-PROVENANCE.json')
await writeFile(provenancePath, `${JSON.stringify({
  schemaVersion: 1,
  statementType: 'Docket Observatory local release build record; not a SLSA attestation',
  generatedAt: new Date().toISOString(),
  application: packageJson.productName ?? packageJson.build?.productName ?? 'Docket Observatory',
  version: packageJson.version,
  releaseMode,
  signingStatus: releaseMode === 'community_unsigned'
    ? 'Installers have no trusted publisher identity and are not notarized. macOS app bundles use identity-free ad-hoc signatures for structural integrity. Verify SHA-256 and follow the operating-system confirmation flow.'
    : 'Installers are expected to carry platform-trusted signatures verified by the formal release pipeline.',
  sourceCommit: distinctSourceCommits.length === 1 ? distinctSourceCommits[0] : null,
  artifactSourceCommits,
  sourceReference: process.env.GITHUB_REF || null,
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  evidence,
  artifacts,
}, null, 2)}\n`, { mode: 0o600 })

const checksumNames = [...artifactNames, ...publicEvidence, path.basename(sbomPath), path.basename(provenancePath)].sort()
const checksumLines = []
for (const name of checksumNames) checksumLines.push(`${await sha256(path.join(releaseDirectory, name))}  ${name}`)
await writeFile(path.join(releaseDirectory, 'SHA256SUMS.txt'), `${checksumLines.join('\n')}\n`, { mode: 0o600 })

console.log(`Finalized ${artifactNames.length} ${releaseMode} release assets with SBOM, provenance record, and SHA-256 checksums.`)
