const assert = require('node:assert/strict')
const { mkdtemp, readFile, rm } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { app } = require('electron')

void app.whenReady().then(async () => {
  const cacheRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-electron-worker-'))
  process.env.GUO_INTEL_CACHE_DIR = cacheRoot
  try {
    const moduleUrl = pathToFileURL(path.join(__dirname, '..', 'server', 'document-search.js')).href
    const { refreshDocumentSearchIndex } = await import(moduleUrl)
    const result = await refreshDocumentSearchIndex({ generatedAt: '2026-08-14T00:00:00.000Z', files: [] })
    assert.equal(result.coverage.uniquePdfContents, 0)
    const persisted = JSON.parse(await readFile(path.join(cacheRoot, 'document-search-index.json'), 'utf8'))
    assert.equal(persisted.coverage.uniquePdfContents, 0)
    console.log('Electron search-index Worker passed without ELECTRON_RUN_AS_NODE.')
  } finally {
    await rm(cacheRoot, { recursive: true, force: true })
    app.quit()
  }
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
