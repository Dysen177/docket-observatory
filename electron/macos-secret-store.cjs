const { createCipheriv, createDecipheriv, randomBytes } = require('node:crypto')
const { chmod, mkdir, readFile, writeFile } = require('node:fs/promises')
const path = require('node:path')

const vaultMagic = Buffer.from('DOV2')
const vaultAad = Buffer.from('org.docketobservatory.app.credentials.v2')

function unavailableError() {
  const error = new Error('Operating-system encrypted storage is unavailable. No credential was saved.')
  error.code = 'SECURE_STORAGE_UNAVAILABLE'
  return error
}

function corruptError() {
  const error = new Error('The encrypted credential vault could not be read. Existing credentials were not changed.')
  error.code = 'SECURE_STORAGE_CORRUPT'
  return error
}

function createMacSecretStore({ vaultPath, addonPath, service, account = 'vault-key-v1' }) {
  let status = 'available'
  let cachedKey = null
  let keychain = null

  try {
    keychain = require(addonPath)
  } catch (error) {
    status = 'unavailable'
    console.error(`Non-interactive macOS keychain module failed to load: ${error instanceof Error ? error.message : String(error)}`)
  }

  function vaultKey() {
    if (status !== 'available' || !keychain) throw unavailableError()
    if (cachedKey) return cachedKey
    try {
      const key = keychain.getOrCreateKey(service, account)
      if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('Invalid key length.')
      cachedKey = Buffer.from(key)
      return cachedKey
    } catch {
      status = 'denied_or_unavailable'
      throw unavailableError()
    }
  }

  function encrypt(value) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', vaultKey(), iv)
    cipher.setAAD(vaultAad)
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
    return Buffer.concat([vaultMagic, iv, cipher.getAuthTag(), ciphertext])
  }

  function decrypt(encrypted) {
    if (encrypted.length < 32 || !encrypted.subarray(0, vaultMagic.length).equals(vaultMagic)) throw corruptError()
    const decipher = createDecipheriv('aes-256-gcm', vaultKey(), encrypted.subarray(4, 16))
    decipher.setAAD(vaultAad)
    decipher.setAuthTag(encrypted.subarray(16, 32))
    return JSON.parse(Buffer.concat([decipher.update(encrypted.subarray(32)), decipher.final()]).toString('utf8'))
  }

  return {
    get available() {
      return status === 'available'
    },
    get status() {
      return status
    },
    async read() {
      let encrypted
      try {
        encrypted = await readFile(vaultPath)
      } catch (error) {
        if (error?.code === 'ENOENT') return {}
        throw error
      }
      try {
        return decrypt(encrypted)
      } catch (error) {
        if (error?.code === 'SECURE_STORAGE_UNAVAILABLE') throw error
        status = 'corrupt'
        throw corruptError()
      }
    },
    async write(value) {
      const encrypted = encrypt(value)
      await mkdir(path.dirname(vaultPath), { recursive: true, mode: 0o700 })
      await writeFile(vaultPath, encrypted, { mode: 0o600 })
      await chmod(vaultPath, 0o600).catch(() => undefined)
    },
  }
}

module.exports = { createMacSecretStore }
