const assert = require('node:assert/strict')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { app } = require('electron')
const { APPLICATION_NAME } = require('../electron/app-identity.cjs')

app.setName(APPLICATION_NAME)

app.whenReady().then(() => {
  if (process.platform !== 'darwin') {
    console.log('macOS non-interactive keychain test skipped on this platform.')
    app.quit()
    return
  }
  const addonPath = path.join(__dirname, '..', 'build', 'native', process.arch, 'docket-observatory-keychain.node')
  const addon = require(addonPath)
  const service = `org.docketobservatory.test.${randomBytes(16).toString('hex')}`
  const account = 'temporary-test-key'
  const first = addon.getOrCreateKey(service, account)
  const second = addon.getOrCreateKey(service, account)
  assert.equal(Buffer.isBuffer(first), true)
  assert.equal(first.length, 32)
  assert.deepEqual(second, first)
  assert.equal(addon.deleteKey(service, account), true)
  console.log('Non-interactive macOS Keychain round-trip passed without enabling authentication UI.')
  app.quit()
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
