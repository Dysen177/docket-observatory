import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { humanDocumentTranslation, humanTranslationCacheFilename, humanTranslationRecords } from '../server/human-translations.js'

const root = process.cwd()
const manifest = JSON.parse(await readFile(path.join(root, 'downloads', 'court-files-complete', 'manifest.json'), 'utf8'))
const outputDir = path.join(root, 'server', 'cache', 'translations')
const filesByHash = new Map((manifest.files ?? []).filter((file) => file.sha256).map((file) => [file.sha256, file]))
let written = 0

await mkdir(outputDir, { recursive: true, mode: 0o700 })
for (const record of humanTranslationRecords()) {
  const file = filesByHash.get(record.sourceSha256)
  if (!file) throw new Error(`Version-locked translation source is absent from the manifest: ${record.sourceSha256}`)
  const payload = humanDocumentTranslation(file, { textHash: record.sourceTextHash, coverage: 'complete' }, 'zh')
  if (!payload) throw new Error(`Version-locked translation failed validation: ${record.sourceSha256}`)
  const filename = humanTranslationCacheFilename(record.sourceSha256, record.sourceTextHash, 'zh')
  await writeFile(path.join(outputDir, filename), `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 })
  written += 1
}

console.log(`Materialized ${written} version-locked translation cache file(s).`)
