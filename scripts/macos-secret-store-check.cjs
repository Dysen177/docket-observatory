const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
const { mkdtemp, readFile, rm } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { app } = require('electron')
const { APPLICATION_NAME } = require('../electron/app-identity.cjs')
const { createMacSecretStore } = require('../electron/macos-secret-store.cjs')

app.setName(APPLICATION_NAME)

app.whenReady().then(async () => {
  if (process.platform !== 'darwin') {
    console.log('macOS encrypted credential-vault test skipped on this platform.')
    app.quit()
    return
  }

  const addonPath = path.join(__dirname, '..', 'build', 'native', process.arch, 'docket-observatory-keychain.node')
  const keychain = require(addonPath)
  const service = `org.docketobservatory.vault-test.${randomBytes(16).toString('hex')}`
  const account = 'temporary-vault-key'
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-vault-'))
  const vaultPath = path.join(temporaryRoot, 'secret-vault-v2.bin')
  const secret = `test-secret-${randomBytes(32).toString('hex')}`

  try {
    const writer = createMacSecretStore({ vaultPath, addonPath, service, account })
    await writer.write({ openaiApiKey: secret })
    const encrypted = await readFile(vaultPath)
    assert.equal(encrypted.subarray(0, 4).toString('ascii'), 'DOV2')
    assert.equal(encrypted.includes(Buffer.from(secret)), false)

    const reader = createMacSecretStore({ vaultPath, addonPath, service, account })
    assert.deepEqual(await reader.read(), { openaiApiKey: secret })
    console.log('macOS credential vault encrypted write and fresh-instance read passed without authentication UI.')
  } finally {
    keychain.deleteKey(service, account)
    await rm(temporaryRoot, { recursive: true, force: true })
  }
  app.quit()
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
