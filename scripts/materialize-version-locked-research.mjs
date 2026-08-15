import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { analyzeDocumentBySourceUrl } from '../server/document-analysis.js'
import { humanDocumentResearch } from '../server/human-legal-research.js'
import { createSeedState } from '../server/seed.js'

const root = process.cwd()
const manifest = JSON.parse(await readFile(path.join(root, 'downloads', 'court-files-complete', 'manifest.json'), 'utf8'))
const cachedState = await readFile(path.join(root, 'server', 'cache', 'state.json'), 'utf8').catch(() => '')
const state = cachedState ? JSON.parse(cachedState) : createSeedState()
const files = (manifest.files ?? []).filter((file) => file.url && humanDocumentResearch(file, 'zh'))
const work = [...new Map(files.map((file) => [file.url, file])).values()]
let written = 0

for (const file of work) {
  for (const language of ['en', 'zh']) {
    const result = await analyzeDocumentBySourceUrl(file.url, manifest, state, language)
    if (result?.aiStatus?.provider !== 'human_research' || result?.sourceSha256 !== file.sha256) {
      throw new Error(`Version-locked research failed validation: ${file.caseId} Doc ${file.docNumber ?? 'source'} (${language})`)
    }
    written += 1
  }
}

console.log(JSON.stringify({
  sourceRecords: work.length,
  cacheFilesWritten: written,
  languages: ['en', 'zh'],
}, null, 2))
