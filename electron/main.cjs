const { app, BrowserWindow, ipcMain, safeStorage, session, shell } = require('electron')
const { randomBytes } = require('node:crypto')
const { appendFile, chmod, mkdir, readFile, stat, writeFile } = require('node:fs/promises')
const { createServer } = require('node:net')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { APPLICATION_NAME } = require('./app-identity.cjs')
const { createMacSecretStore } = require('./macos-secret-store.cjs')
const { installBundledSeedCache } = require('./seed-installer.cjs')

app.setName(APPLICATION_NAME)
if (process.platform === 'darwin') app.commandLine.appendSwitch('use-mock-keychain')
if (process.platform === 'win32') app.disableHardwareAcceleration()

const devUrl = process.env.GUO_INTEL_ELECTRON_DEV_URL
let apiPort = process.env.GUO_INTEL_API_PORT || (devUrl ? '4177' : '')
let downloadsRoot = null
let secretVaultPath = null
const localApiToken = randomBytes(32).toString('base64url')

let mainWindow = null
let startupWindow = null
let startupFailureShown = false

function diagnosticPath() {
  return path.join(app.getPath('userData'), 'startup.log')
}

function recordDiagnostic(message, error = null) {
  const detail = error instanceof Error ? `${message}: ${error.stack || error.message}` : `${message}: ${String(error ?? '')}`
  console.error(detail)
  void appendFile(diagnosticPath(), `[${new Date().toISOString()}] ${detail}\n`).catch(() => undefined)
}

function findAvailableLoopbackPort() {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.unref()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const selectedPort = typeof address === 'object' && address ? address.port : 0
      probe.close((error) => {
        if (error) reject(error)
        else if (selectedPort > 0) resolve(String(selectedPort))
        else reject(new Error('The operating system did not allocate a loopback port.'))
      })
    })
  })
}

async function waitForLocalApi(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/api/health`, {
        headers: { 'X-Docket-Observatory-Session': localApiToken },
      })
      if (response.ok) return
    } catch {
      // The local server initializes caches and source state before it starts listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Local API did not become ready on 127.0.0.1:${apiPort}.`)
}

async function startLocalServer() {
  if (!apiPort) apiPort = await findAvailableLoopbackPort()
  secretVaultPath = path.join(app.getPath('userData'), process.platform === 'darwin' ? 'secret-vault-v2.bin' : 'secret-vault.bin')
  downloadsRoot = path.resolve(
    process.env.GUO_INTEL_DOWNLOAD_DIR
      || (app.isPackaged
        ? path.join(app.getPath('userData'), 'court-files')
        : path.join(__dirname, '..', 'downloads', 'court-files-complete')),
  )
  globalThis.guoIntelSecretStore = createSecretStore()
  if (!devUrl) process.env.GUO_INTEL_SERVE_STATIC = '1'
  process.env.GUO_INTEL_API_PORT = apiPort
  process.env.GUO_INTEL_LOCAL_API_TOKEN = localApiToken
  process.env.GUO_INTEL_CACHE_DIR = process.env.GUO_INTEL_CACHE_DIR || path.join(app.getPath('userData'), 'cache')
  process.env.GUO_INTEL_AUDIT_OUTPUT_DIR = process.env.GUO_INTEL_AUDIT_OUTPUT_DIR || path.join(app.getPath('userData'), 'audit')
  process.env.GUO_INTEL_DOWNLOAD_DIR = downloadsRoot
  if (app.isPackaged) {
    process.env.GUO_INTEL_BUNDLED_DOWNLOAD_DIR = path.join(process.resourcesPath, 'court-files')
    await installBundledSeedCache({
      resourcesRoot: process.resourcesPath,
      targetRoot: process.env.GUO_INTEL_CACHE_DIR,
    })
  }
  const serverEntry = path.join(__dirname, '..', 'server', 'index.js')
  const serverModule = await import(pathToFileURL(serverEntry).href)
  await serverModule.apiServerReady
  await waitForLocalApi()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    title: '案卷观察台',
    backgroundColor: '#0c0d0e',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    if (isLocalAppRequest(details.url)) {
      details.requestHeaders['X-Docket-Observatory-Session'] = localApiToken
    }
    callback({ requestHeaders: details.requestHeaders })
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedShellTarget(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const targetUrl = devUrl || `http://127.0.0.1:${apiPort}`
    if (!isSameAppNavigation(url, targetUrl)) {
      event.preventDefault()
      if (isAllowedShellTarget(url)) shell.openExternal(url)
    }
  })

  const targetUrl = devUrl || `http://127.0.0.1:${apiPort}`
  let mainFrameFailure = null
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return
    mainFrameFailure = new Error(`Renderer failed to load (${errorCode}): ${errorDescription} [${validatedURL}]`)
    recordDiagnostic('Renderer main-frame load failed', mainFrameFailure)
  })
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    const error = new Error(`Renderer process exited (${details.reason || 'unknown'}${details.exitCode != null ? `, code ${details.exitCode}` : ''}).`)
    recordDiagnostic('Renderer process exited', error)
    void showStartupError(error)
  })
  mainWindow.webContents.on('console-message', (details) => {
    if (!['warning', 'error'].includes(details.level)) return
    recordDiagnostic(`Renderer console ${details.level} at ${details.sourceId}:${details.lineNumber}`, details.message)
  })
  return mainWindow.loadURL(targetUrl).then(async () => {
    if (mainFrameFailure) throw mainFrameFailure
    await waitForRenderer(mainWindow)
    const transcriptCorpus = await verifyBundledTranscriptCorpus()
    await writeFile(path.join(app.getPath('userData'), 'startup-ready.json'), `${JSON.stringify({
      readyAt: new Date().toISOString(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      transcriptCorpus,
    }, null, 2)}\n`, { mode: 0o600 }).catch((error) => recordDiagnostic('Startup-ready marker could not be written', error))
    startupWindow?.close()
    startupWindow = null
    mainWindow?.show()
  }).catch((error) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy()
    throw error
  })
}

async function verifyBundledTranscriptCorpus() {
  const corpusRoot = path.join(__dirname, '..', 'server', 'public-record-transcripts')
  const [sourceManifest, englishManifest] = await Promise.all([
    readJsonFile(path.join(corpusRoot, 'manifest.json')),
    readJsonFile(path.join(corpusRoot, 'en', 'manifest.json')),
  ])
  const shardFiles = [
    ...(sourceManifest.shards ?? []).flatMap((shard) => [
      path.join(corpusRoot, shard.dataFilename),
      path.join(corpusRoot, shard.searchFilename),
    ]),
    ...(englishManifest.shards ?? []).flatMap((shard) => [
      path.join(corpusRoot, 'en', shard.dataFilename),
      path.join(corpusRoot, 'en', shard.searchFilename),
    ]),
  ]
  if (!shardFiles.length) throw new Error('Bundled transcript corpus contains no data or search shards.')
  for (const shardPath of shardFiles) {
    const info = await stat(shardPath)
    if (!info.isFile() || info.size <= 0) throw new Error(`Bundled transcript shard is empty: ${path.basename(shardPath)}`)
  }
  const inventory = {
    catalogRecords: Number(sourceManifest.coverage?.importedRecords ?? sourceManifest.records?.length ?? 0),
    searchableTranscripts: Number(sourceManifest.coverage?.availableTranscripts ?? 0),
    englishRecords: Number(englishManifest.coverage?.translatedRecords ?? 0),
    englishMissingRecords: Number(englishManifest.coverage?.missingRecords ?? -1),
    englishComplete: englishManifest.coverage?.complete === true,
    shardFiles: shardFiles.length,
  }
  if (inventory.searchableTranscripts <= 0
    || inventory.englishRecords !== inventory.searchableTranscripts
    || inventory.englishMissingRecords !== 0
    || !inventory.englishComplete) {
    throw new Error(`Bundled transcript corpus is incomplete: ${JSON.stringify(inventory)}`)
  }
  return inventory
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function waitForRenderer(window, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!window || window.isDestroyed()) throw new Error('The main window was destroyed before the workspace rendered.')
    try {
      const rendered = await window.webContents.executeJavaScript(
        "Boolean(document.querySelector('#root')?.childElementCount)",
        true,
      )
      if (rendered) return
    } catch {
      // The renderer may still be initializing. The timeout below turns this into a visible diagnostic.
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error('The local workspace loaded without rendering its React root. Check startup.log for renderer details.')
}

function createStartupWindow() {
  startupWindow = new BrowserWindow({
    width: 460,
    height: 260,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0c0d0e',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  })
  startupWindow.once('ready-to-show', () => startupWindow?.show())
  void startupWindow.loadFile(startupAssetPath('startup.html'))
}

function startupAssetPath(fileName) {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'startup', fileName)
    : path.join(__dirname, fileName)
}

async function showStartupError(error) {
  const detail = error instanceof Error ? error.message : String(error)
  recordDiagnostic('Application startup failed', error)
  if (startupFailureShown) return
  startupFailureShown = true
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy()
  if (!startupWindow || startupWindow.isDestroyed()) createStartupWindow()
  if (!startupWindow || startupWindow.isDestroyed()) {
    app.quit()
    return
  }
  startupWindow.once('closed', () => app.quit())
  await startupWindow.loadFile(startupAssetPath('startup-error.html'), {
    query: { detail: detail.slice(0, 700) },
  }).catch((loadError) => recordDiagnostic('Startup error page failed to load', loadError))
  startupWindow.show()
}

function isLocalAppRequest(value) {
  try {
    const url = new URL(String(value))
    if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) return false
    if (url.port === String(apiPort)) return true
    if (!devUrl || !url.pathname.startsWith('/api/')) return false
    return url.origin === new URL(devUrl).origin
  } catch {
    return false
  }
}

function isSameAppNavigation(value, target) {
  try {
    const url = new URL(String(value))
    const appUrl = new URL(String(target))
    return url.origin === appUrl.origin && url.pathname === appUrl.pathname && url.search === appUrl.search
  } catch {
    return false
  }
}

function createSecretStore() {
  if (process.platform === 'darwin') {
    return createMacSecretStore({
      vaultPath: secretVaultPath,
      addonPath: app.isPackaged
        ? path.join(process.resourcesPath, 'native', 'docket-observatory-keychain.node')
        : path.join(__dirname, '..', 'build', 'native', process.arch, 'docket-observatory-keychain.node'),
      service: app.isPackaged
        ? 'org.docketobservatory.app.credentials.v2'
        : `org.docketobservatory.app.dev.${process.arch}.credentials.v2`,
    })
  }
  if (process.platform === 'win32') return createWindowsSecretStore()
  return {
    available: false,
    status: 'unsupported',
    async read() { return {} },
    async write() { throw secureStorageUnavailableError() },
  }
}

function secureStorageUnavailableError() {
  const error = new Error('Operating-system encrypted storage is unavailable. No credential was saved.')
  error.code = 'SECURE_STORAGE_UNAVAILABLE'
  return error
}

function secureStorageCorruptError() {
  const error = new Error('The encrypted credential vault could not be read. Existing credentials were not changed.')
  error.code = 'SECURE_STORAGE_CORRUPT'
  return error
}

function createWindowsSecretStore() {
  const asyncApiSupported = [
    safeStorage.isAsyncEncryptionAvailable,
    safeStorage.encryptStringAsync,
    safeStorage.decryptStringAsync,
  ].every((method) => typeof method === 'function')
  let status = asyncApiSupported ? 'available' : 'unsupported'

  function unavailableError() {
    return secureStorageUnavailableError()
  }

  async function requireEncryption() {
    if (status !== 'available') throw unavailableError()
    try {
      if (!await safeStorage.isAsyncEncryptionAvailable()) {
        status = 'unavailable'
        throw unavailableError()
      }
    } catch (error) {
      status = 'denied_or_unavailable'
      if (error?.code === 'SECURE_STORAGE_UNAVAILABLE') throw error
      throw unavailableError()
    }
  }

  async function persistEncrypted(value) {
    await requireEncryption()
    try {
      const encrypted = await safeStorage.encryptStringAsync(JSON.stringify(value))
      await mkdir(path.dirname(secretVaultPath), { recursive: true, mode: 0o700 })
      await writeFile(secretVaultPath, encrypted, { mode: 0o600 })
      await chmod(secretVaultPath, 0o600).catch(() => undefined)
    } catch {
      status = 'denied_or_unavailable'
      throw unavailableError()
    }
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
        encrypted = await readFile(secretVaultPath)
      } catch (error) {
        if (error?.code === 'ENOENT') return {}
        throw error
      }

      await requireEncryption()
      let decrypted
      try {
        decrypted = await safeStorage.decryptStringAsync(encrypted)
      } catch {
        status = 'denied_or_unavailable'
        throw unavailableError()
      }

      try {
        const value = JSON.parse(decrypted.result)
        if (decrypted.shouldReEncrypt) await persistEncrypted(value)
        return value
      } catch (error) {
        if (error?.code === 'SECURE_STORAGE_UNAVAILABLE') throw error
        status = 'corrupt'
        throw secureStorageCorruptError()
      }
    },
    async write(value) {
      await persistEncrypted(value)
    },
  }
}

function isAllowedShellTarget(value) {
  try {
    const { isAllowedExternalUrl } = require('../server/network-policy.cjs')
    const url = new URL(String(value))
    return isAllowedExternalUrl(url.toString())
  } catch {
    return false
  }
}

function configureSessionSecurity() {
  const defaultSession = session.defaultSession
  defaultSession.setPermissionCheckHandler(() => false)
  defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  defaultSession.setDevicePermissionHandler?.(() => false)
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : startupWindow
    if (!window || window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  })

  app.whenReady().then(async () => {
    configureSessionSecurity()
    createStartupWindow()
    ipcMain.handle('guo-intel-secure-storage-status', () => ({
      available: Boolean(globalThis.guoIntelSecretStore?.available),
      status: globalThis.guoIntelSecretStore?.status ?? 'uninitialized',
      applicationName: APPLICATION_NAME,
    }))
    try {
      await startLocalServer()
      await createWindow()
    } catch (error) {
      await showStartupError(error)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow().catch((error) => showStartupError(error))
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
