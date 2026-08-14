const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
const { app, safeStorage } = require('electron')
const { APPLICATION_NAME } = require('../electron/app-identity.cjs')

const requireNativeBackend = process.argv.includes('--native')
const nativeTestAcknowledged = process.env.DOCKET_OBSERVATORY_NATIVE_STORAGE_TEST === 'release-artifact'

app.setName(APPLICATION_NAME)

if (requireNativeBackend && process.platform === 'darwin') {
  console.error('Native Electron safeStorage testing is disabled on macOS because the application uses a non-interactive Keychain backend.')
  process.exit(2)
}

if (requireNativeBackend && !nativeTestAcknowledged) {
  console.error([
    'Native safeStorage testing was refused before Electron startup.',
    'Native operating-system credential tests must run only in an intentional release-validation environment.',
    'Use the signed packaged application release check instead. For an intentional Windows native test,',
    'set DOCKET_OBSERVATORY_NATIVE_STORAGE_TEST=release-artifact explicitly.',
  ].join(' '))
  process.exit(2)
}

if (!requireNativeBackend) app.commandLine.appendSwitch('use-mock-keychain')

app.whenReady().then(async () => {
  assert.equal(await safeStorage.isAsyncEncryptionAvailable(), true, 'Electron safeStorage is unavailable in this desktop session.')
  const plaintext = `docket-observatory-${randomBytes(24).toString('hex')}`
  const encrypted = await safeStorage.encryptStringAsync(plaintext)
  assert.equal(Buffer.isBuffer(encrypted), true)
  assert.notEqual(encrypted.includes(Buffer.from(plaintext)), true)
  const decrypted = await safeStorage.decryptStringAsync(encrypted)
  assert.equal(decrypted.result, plaintext)
  console.log(`Electron safeStorage ${requireNativeBackend ? 'native-backend ' : ''}round-trip passed on ${process.platform}.`)
  app.quit()
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
