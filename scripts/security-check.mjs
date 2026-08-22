import { readFile, readdir, stat } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'release', 'release-data', 'downloads', 'output', '.playwright-cli', 'server/cache'])
const codeExtensions = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx', '.html'])
const findings = []

const riskPatterns = [
  { id: 'raw-html', severity: 'high', pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML|document\.write/g },
  { id: 'dynamic-code', severity: 'critical', pattern: /eval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*["'`]|setInterval\s*\(\s*["'`]/g },
  { id: 'subprocess', severity: 'critical', pattern: /node:child_process|require\(["']child_process["']\)|from\s+["']child_process["']/g },
  { id: 'credentialed-fetch', severity: 'medium', pattern: /credentials\s*:\s*["']include["']|withCredentials\s*:\s*true/g },
  { id: 'token-storage', severity: 'high', pattern: /localStorage\.(?:setItem|getItem)\([^)]*(?:token|jwt|secret|password)/gi },
  { id: 'hardcoded-secret', severity: 'critical', pattern: /(?:sk-[A-Za-z0-9_-]{20,}|OPENAI_API_KEY\s*=\s*["'][^"']+|PACER_PASSWORD\s*=\s*["'][^"']+)/g },
]

function relativePath(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/')
}

function addFinding(id, severity, file, message, line = null) {
  findings.push({ id, severity, file: relativePath(file), line, message })
}

function isIgnored(filePath) {
  const relative = relativePath(filePath)
  if (!relative || relative.startsWith('..')) return true
  return [...ignoredDirectories].some((entry) => relative === entry || relative.startsWith(`${entry}/`))
}

async function walk(directory) {
  const entries = await readdir(directory)
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(directory, entry)
    if (isIgnored(fullPath)) continue
    const info = await stat(fullPath)
    if (info.isDirectory()) {
      files.push(...(await walk(fullPath)))
    } else if (codeExtensions.has(path.extname(fullPath)) && relativePath(fullPath) !== 'scripts/security-check.mjs') {
      files.push(fullPath)
    }
  }
  return files
}

function lineForOffset(content, offset) {
  return content.slice(0, offset).split('\n').length
}

async function scanRiskPatterns(files) {
  for (const file of files) {
    const content = await readFile(file, 'utf8')
    for (const rule of riskPatterns) {
      const matches = content.matchAll(rule.pattern)
      for (const match of matches) {
        if (approvedRiskPattern(rule.id, file, content)) continue
        addFinding(rule.id, rule.severity, file, `Matched risky code pattern: ${match[0]}`, lineForOffset(content, match.index ?? 0))
      }
    }
  }
}

function approvedRiskPattern(ruleId, file, content) {
  if (ruleId !== 'subprocess') return false
  const relative = relativePath(file)
  const translationToolControls = {
    'scripts/repair-public-record-translation-glossary.mjs': {
      spawnCount: 1,
      required: [
        'const workerResult = await run(process.execPath, [',
        "path.join(projectRoot, 'scripts/translate-public-record-transcripts-fast.mjs')",
        "path.join(projectRoot, 'scripts/translate-public-record-transcripts-en.mjs')",
      ],
    },
    'scripts/retry-failed-public-record-translations.mjs': {
      spawnCount: 1,
      required: [
        'await run(process.execPath, [',
        "'scripts/translate-public-record-transcripts-fast.mjs'",
      ],
    },
    'scripts/run-local-transcript-translation-to-completion.mjs': {
      spawnCount: 1,
      required: [
        'await run(process.execPath, [',
        "await run('npm', ['run', 'test:public-record-transcripts'])",
        "if (removeModelOnSuccess) await run('ollama', ['rm', model])",
      ],
    },
    'scripts/start-fast-transcript-translation.mjs': {
      spawnCount: 1,
      required: [
        "const child = spawn('caffeinate', [",
        "'nice',",
        "'scripts/translate-public-record-transcripts-fast.mjs'",
      ],
    },
    'scripts/start-local-transcript-translation.mjs': {
      spawnCount: 1,
      required: [
        "const child = spawn('caffeinate', [",
        "'scripts/run-local-transcript-translation-to-completion.mjs'",
        "'--removeModelOnSuccess'",
      ],
    },
    'scripts/start-public-record-translation-retry.mjs': {
      spawnCount: 1,
      required: [
        'const child = spawn(process.execPath, [',
        "'scripts/retry-failed-public-record-translations.mjs'",
      ],
    },
    'scripts/translate-public-record-transcripts-fast.mjs': {
      spawnCount: 1,
      required: [
        'const workerExitCode = await run(pythonPath, pythonArgs, {',
        'const compileExitCode = await run(process.execPath, [',
        "'scripts/translate-public-record-transcripts-en.mjs'",
      ],
    },
    'scripts/wait-and-run-local-transcript-translation.mjs': {
      spawnCount: 2,
      required: [
        "while (!(await commandSucceeds('ollama', ['show', model])))",
        "await run('npm', [",
        "await commandSucceeds('launchctl', ['unsetenv', variable])",
        "await commandSucceeds('brew', ['services', 'restart', 'ollama'])",
      ],
    },
  }
  const translationTool = translationToolControls[relative]
  if (translationTool) {
    const packageFilesExcludeScripts = !JSON.stringify(packageJson.build?.files ?? []).includes('scripts')
    return packageFilesExcludeScripts
      && content.includes("import { spawn } from 'node:child_process'")
      && translationTool.required.every((control) => content.includes(control))
      && (content.match(/\bspawn\s*\(/g) ?? []).length === translationTool.spawnCount
      && !content.includes('shell: true')
      && !content.includes('exec(')
  }
  if (relative === 'server/document-search.js') {
    return false
  }
  if (relative === 'scripts/settings-persistence-check.mjs') {
    return content.includes("import { spawnSync } from 'node:child_process'")
      && content.includes("spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--verify', temporaryRoot], {")
      && content.includes("env: { GUO_INTEL_CACHE_DIR: temporaryRoot }")
      && (content.match(/\bspawnSync\s*\(/g) ?? []).length === 1
      && !content.includes('shell: true')
      && !content.includes('...process.env')
  }
  if (relative === 'scripts/build-macos-keychain-addon.mjs') {
    return content.includes("import { execFileSync } from 'node:child_process'")
      && content.includes("execFileSync('xcrun', [")
      && (content.match(/\bexecFileSync\s*\(/g) ?? []).length === 1
      && !content.includes('shell: true')
      && !content.includes('...process.env')
  }
  if (relative === 'scripts/import-public-record-transcripts.mjs') {
    const gitCalls = content.match(/execFileAsync\('git',\s*\[[\s\S]*?\]\s*(?:,\s*\{[\s\S]*?\})?\)/g) ?? []
    const allowedGitOperations = /\[\s*(?:'clone'|'-C',\s*[^,]+,\s*(?:'sparse-checkout'|'checkout'|'rev-parse'))/u
    return content.includes("import { execFile } from 'node:child_process'")
      && content.includes('const execFileAsync = promisify(execFile)')
      && gitCalls.length === 10
      && gitCalls.every((call) => allowedGitOperations.test(call))
      && (content.match(/\bexecFileAsync\s*\(/g) ?? []).length === gitCalls.length
      && !content.includes('shell: true')
      && !content.includes('...process.env')
  }
  if (relative === 'scripts/release-signing-preflight.mjs') {
    return content.includes("import { spawnSync } from 'node:child_process'")
      && content.includes('function run(command, args, timeout = 120000)')
      && content.includes("run('/usr/bin/security', ['find-identity', '-v', '-p', 'codesigning']")
      && content.includes("run('/usr/bin/xcrun', args)")
      && content.includes("run('powershell.exe', [")
      && (content.match(/\bspawnSync\s*\(/g) ?? []).length === 1
      && !content.includes('shell: true')
      && !content.includes('...process.env')
  }
  if (relative === 'scripts/release-environment-preflight.mjs') {
    return content.includes("import { spawnSync } from 'node:child_process'")
      && content.includes("const gitCommand = process.platform === 'win32' ? 'git.exe' : '/usr/bin/git'")
      && content.includes('spawnSync(gitCommand, args, {')
      && (content.match(/\bspawnSync\s*\(/g) ?? []).length === 1
      && !content.includes('shell: true')
      && !content.includes('process.argv')
      && !content.includes('...process.env')
  }
  if (relative === 'scripts/finalize-release-assets.mjs') {
    return content.includes("import { spawnSync } from 'node:child_process'")
      && content.includes("spawnSync(npmCommand, ['sbom', '--omit=dev', '--sbom-format=cyclonedx']")
      && (content.match(/\bspawnSync\s*\(/g) ?? []).length === 1
      && !content.includes('shell: true')
      && !content.includes('...process.env')
  }
  if (relative === 'scripts/verify-macos-release.mjs') {
    return content.includes("import { spawnSync } from 'node:child_process'")
      && content.includes('spawnSync(command, args,')
      && !content.includes('shell: true')
      && !content.includes('...process.env')
  }
  if (relative === 'scripts/verify-macos-community-release.mjs') {
    return content.includes("import { spawn, spawnSync } from 'node:child_process'")
      && content.includes("run('/usr/bin/hdiutil', ['verify', filePath]")
      && content.includes("run('/usr/bin/hdiutil', ['attach', filePath, '-nobrowse', '-readonly', '-mountpoint', mountDirectory]")
      && content.includes("run('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=4', installedAppPath]")
      && content.includes("run('/usr/bin/codesign', ['-dvvv', appPath]")
      && content.includes('const child = spawn(launchCommand, launchArgs')
      && content.includes("spawnSync('/usr/bin/hdiutil', ['detach', mountDirectory, '-force']")
      && (content.match(/\bspawnSync\s*\(/g) ?? []).length === 2
      && (content.match(/\bspawn\s*\(/g) ?? []).length === 1
      && !content.includes('shell: true')
      && !content.includes('...process.env')
  }
  return false
}

async function assertProjectControls() {
  const requiredFiles = ['LICENSE', 'package-lock.json', 'server/network-policy.cjs', 'SECURITY.md', 'PRIVACY.md', 'OPEN_SOURCE_AUDIT.md', 'SIGNING.md', 'security_best_practices_report.md']
  for (const file of requiredFiles) {
    try {
      await stat(path.join(root, file))
    } catch {
      addFinding('missing-control-file', 'medium', path.join(root, file), 'Expected security/open-source control file is missing.')
    }
  }

  const gitignore = await readFile(path.join(root, '.gitignore'), 'utf8')
  for (const entry of ['downloads', 'server/cache', '*.local', '.npmrc', '.env', '*.p12', '*.pfx', '*.pem', '*.key', '*.p8', 'release-signing']) {
    if (!gitignore.includes(entry)) addFinding('gitignore-gap', 'medium', path.join(root, '.gitignore'), `Expected ignored entry is missing: ${entry}`)
  }

  const license = await readFile(path.join(root, 'LICENSE'), 'utf8')
  if (!license.includes('MIT License')) {
    addFinding('license-gap', 'medium', path.join(root, 'LICENSE'), 'Expected an auditable MIT license file.')
  }

  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const allDependencies = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) }
  for (const dependency of ['electron-updater', '@sentry/electron', '@sentry/react', 'posthog-js', 'mixpanel-browser', 'analytics']) {
    if (allDependencies[dependency]) addFinding('unexpected-network-sdk', 'high', path.join(root, 'package.json'), `Unexpected telemetry/update dependency is installed: ${dependency}`)
  }

  const workflowDirectory = path.join(root, '.github', 'workflows')
  const workflowEntries = await readdir(workflowDirectory, { withFileTypes: true }).catch(() => [])
  for (const entry of workflowEntries) {
    if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue
    const workflowPath = path.join(workflowDirectory, entry.name)
    const workflow = await readFile(workflowPath, 'utf8')
    for (const match of workflow.matchAll(/uses:\s*([^\s#]+)/g)) {
      if (!/@[a-f0-9]{40}$/i.test(match[1])) {
        addFinding('unpinned-github-action', 'high', workflowPath, `GitHub Action is not pinned to a full commit SHA: ${match[1]}`, lineForOffset(workflow, match.index ?? 0))
      }
    }
  }

  const server = await readFile(path.join(root, 'server', 'index.js'), 'utf8')
  if (server.includes('normalizeDocketNumber(event.filingNumber)')
    && !server.includes("import { compareDocketNumbers, normalizeDocketNumber } from './docket-number.js'")) {
    addFinding('event-dedupe-import', 'high', path.join(root, 'server', 'index.js'), 'CourtListener event de-duplication references normalizeDocketNumber without importing it.')
  }
  if (!server.includes("app.disable('x-powered-by')")) {
    addFinding('express-fingerprint', 'low', path.join(root, 'server', 'index.js'), 'Express x-powered-by header is not disabled.')
  }
  if (server.includes("Access-Control-Allow-Origin', '*'") || server.includes('Access-Control-Allow-Origin", "*"')) {
    addFinding('cors-wildcard', 'medium', path.join(root, 'server', 'index.js'), 'Wildcard CORS origin detected.')
  }
  if (!server.includes('Content-Security-Policy')) {
    addFinding('missing-csp', 'medium', path.join(root, 'server', 'index.js'), 'Content-Security-Policy header is not visible in API/static server.')
  }
  if (!server.includes("app.use('/api', dynamicApiCacheHeaders)")
    || !server.includes("request.path !== '/document-file'")
    || !server.includes("response.setHeader('Cache-Control', 'no-store, max-age=0')")) {
    addFinding('dynamic-api-cache-policy', 'high', path.join(root, 'server', 'index.js'), 'Dynamic local API responses must be no-store so stale docket state cannot survive a source refresh; only the verified PDF stream may use private caching.')
  }
  if (!server.includes('scalarQuery(query.q)') || !server.includes('scalarQuery(request.query.limit)')) {
    addFinding('query-scalar-validation', 'medium', path.join(root, 'server', 'index.js'), 'Filtering and pagination query parameters must reject implicit array/object coercion.')
  }
  if (!server.includes('"script-src \'self\'"') || server.includes("script-src 'self' 'unsafe-inline'") || server.includes("script-src 'self' 'unsafe-eval'")) {
    addFinding('weak-script-csp', 'high', path.join(root, 'server', 'index.js'), 'The packaged renderer CSP must keep scripts self-only without unsafe-inline or unsafe-eval.')
  }
  if (!server.includes('isAllowedLocalhostOrigin')) {
    addFinding('cors-allowlist', 'medium', path.join(root, 'server', 'index.js'), 'Localhost CORS allowlist is not visible.')
  }
  if (!server.includes('protectLocalRequests')
    || !server.includes("request.path === '/api/health'")
    || !server.includes('X-Docket-Observatory-Request')) {
    addFinding('local-request-boundary', 'high', path.join(root, 'server', 'index.js'), 'All non-health local API routes must require the application request header so cross-origin GET requests cannot trigger file reads, cloud calls, or expensive processing.')
  }
  if (!server.includes('protectDesktopSession') || !server.includes('GUO_INTEL_LOCAL_API_TOKEN') || !server.includes('timingSafeEqual')) {
    addFinding('desktop-session-boundary', 'high', path.join(root, 'server', 'index.js'), 'The packaged local API must authenticate Electron requests with an ephemeral session token.')
  }
  if (!server.includes('limitExpensiveRequests')) {
    addFinding('local-resource-limit', 'medium', path.join(root, 'server', 'index.js'), 'Expensive local API routes need a bounded request rate.')
  }
  if (!server.includes("app.listen(port, '127.0.0.1'")) {
    addFinding('api-bind-address', 'high', path.join(root, 'server', 'index.js'), 'Local API is not visibly bound to the loopback interface.')
  }
  if (!server.includes('export const apiServerReady') || !server.includes("server.once('error', reject)")) {
    addFinding('api-ready-boundary', 'high', path.join(root, 'server', 'index.js'), 'The API startup promise must reject on a bind error so Electron cannot accept a different process occupying the configured loopback port.')
  }

  const documentSearch = await readFile(path.join(root, 'server', 'document-search.js'), 'utf8')
  const workerControls = [
    "import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads'",
    "workerData: { task: 'build-document-search-index', manifest, signature }",
    'env: searchIndexWorkerEnvironment()',
    'void worker.terminate()',
    'The document search index worker exceeded 15 minutes.',
    "workerData?.task === 'build-document-search-index'",
  ]
  if (workerControls.some((control) => !documentSearch.includes(control))
    || (documentSearch.match(/new Worker\s*\(/g) ?? []).length !== 1
    || documentSearch.includes('node:child_process')
    || documentSearch.includes('...process.env')) {
    addFinding('search-index-worker-boundary', 'critical', path.join(root, 'server', 'document-search.js'), 'Search indexing must use one fixed worker-thread entry point with structured worker data, a minimal environment, and a bounded lifetime; the packaged app must not require ELECTRON_RUN_AS_NODE.')
  }

  for (const file of ['server/analysis.js', 'server/document-analysis.js', 'server/automation-runner.js', 'server/index.js', 'server/cloud-ai.js']) {
    const content = await readFile(path.join(root, file), 'utf8')
    if (content.includes('api.openai.com/v1/responses') && !content.includes('store: false')) {
      addFinding('openai-storage-boundary', 'high', path.join(root, file), 'OpenAI Responses call is missing the store:false privacy boundary.')
    }
  }

  const electron = await readFile(path.join(root, 'electron', 'main.cjs'), 'utf8')
  const macSecretStore = await readFile(path.join(root, 'electron', 'macos-secret-store.cjs'), 'utf8')
  const macKeychain = await readFile(path.join(root, 'native', 'macos-keychain-no-ui.mm'), 'utf8')
  const seedInstaller = await readFile(path.join(root, 'electron', 'seed-installer.cjs'), 'utf8')
  if (!electron.includes('nodeIntegration: false') || !electron.includes('contextIsolation: true') || !electron.includes('sandbox: true')) {
    addFinding('electron-webpreferences', 'high', path.join(root, 'electron', 'main.cjs'), 'Electron renderer hardening settings are missing.')
  }
  if (!electron.includes('isAllowedShellTarget')) {
    addFinding('electron-openexternal', 'high', path.join(root, 'electron', 'main.cjs'), 'shell.openExternal is not guarded by a URL allowlist helper.')
  }
  if (!electron.includes('createMacSecretStore({')
    || !macSecretStore.includes("createCipheriv('aes-256-gcm'")
    || !macSecretStore.includes("createDecipheriv('aes-256-gcm'")
    || !macKeychain.includes('context.interactionNotAllowed = YES')
    || !macKeychain.includes('kSecUseAuthenticationContext')) {
    addFinding('macos-secret-storage', 'high', path.join(root, 'electron', 'main.cjs'), 'macOS credentials must use an authenticated AES-GCM vault whose Keychain key access explicitly disables authentication UI.')
  }
  if (!electron.includes("if (process.platform === 'darwin') app.commandLine.appendSwitch('use-mock-keychain')")) {
    addFinding('macos-electron-keychain-ui', 'high', path.join(root, 'electron', 'main.cjs'), 'macOS must keep Chromium internal storage off the interactive Electron Safe Storage Keychain path; application credentials use the separate non-interactive native vault.')
  }
  if (!electron.includes('function createWindowsSecretStore()')
    || !electron.includes('safeStorage.isAsyncEncryptionAvailable')
    || !electron.includes('safeStorage.encryptStringAsync')
    || !electron.includes('safeStorage.decryptStringAsync')) {
    addFinding('windows-secret-storage', 'high', path.join(root, 'electron', 'main.cjs'), 'Windows credentials must use the asynchronous DPAPI-backed Electron safeStorage API.')
  }
  if (!electron.includes("randomBytes(32).toString('base64url')") || !electron.includes("details.requestHeaders['X-Docket-Observatory-Session']")) {
    addFinding('electron-api-session', 'high', path.join(root, 'electron', 'main.cjs'), 'Electron must generate and inject an ephemeral local API session token.')
  }
  if (!electron.includes('await serverModule.apiServerReady')) {
    addFinding('electron-api-startup-verification', 'high', path.join(root, 'electron', 'main.cjs'), 'Electron must await the API listener owned by this process before loading the application URL.')
  }
  if (!electron.includes('findAvailableLoopbackPort()') || !electron.includes("probe.listen(0, '127.0.0.1'")) {
    addFinding('electron-api-port-allocation', 'medium', path.join(root, 'electron', 'main.cjs'), 'Packaged Electron startup must allocate an available loopback port instead of assuming a fixed port is free.')
  }
  if (/^const .*require\(['"]\.\.\/server\/network-policy\.cjs['"]\)/mu.test(electron)) {
    addFinding('electron-api-port-policy-order', 'high', path.join(root, 'electron', 'main.cjs'), 'Electron must not cache the localhost network policy before its runtime API port has been selected.')
  }
  if (!electron.includes('app.requestSingleInstanceLock()') || !electron.includes("app.on('second-instance'")) {
    addFinding('electron-single-instance', 'medium', path.join(root, 'electron', 'main.cjs'), 'Electron must prevent a second process from competing for the local API and user-data files.')
  }
  if (!electron.includes('setPermissionCheckHandler(() => false)')
    || !electron.includes('setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))')) {
    addFinding('electron-permission-default', 'high', path.join(root, 'electron', 'main.cjs'), 'Electron must deny unneeded browser permission checks and requests by default.')
  }
  if (electron.includes("url.protocol === 'file:'")) {
    addFinding('electron-file-external', 'high', path.join(root, 'electron', 'main.cjs'), 'Managed PDFs must stay in the in-app reader; shell.openExternal must not accept file URLs.')
  }
  if (electron.includes('autoUpdater') || electron.includes('electron-updater')) {
    addFinding('unexpected-auto-update', 'high', path.join(root, 'electron', 'main.cjs'), 'An automatic update mechanism is present but the privacy model says none is used.')
  }
  if (!electron.includes('installBundledSeedCache') || !seedInstaller.includes("path.join(resourcesRoot, 'seed-cache')")) {
    addFinding('release-seed-installation', 'high', path.join(root, 'electron', 'main.cjs'), 'Complete desktop releases must install the sanitized precomputed research seed into writable per-user storage.')
  }
  if (!seedInstaller.includes('verifySeedCache') || !seedInstaller.includes("path.join(resourcesRoot, 'seed-cache-manifest.json')") || !seedInstaller.includes('sha256File(filePath)')) {
    addFinding('release-seed-verification', 'high', path.join(root, 'electron', 'main.cjs'), 'Complete desktop releases must verify each bundled research-seed file before installing it.')
  }
  if (`${electron}\n${seedInstaller}`.includes('local processing will rebuild it')) {
    addFinding('release-seed-silent-downgrade', 'high', path.join(root, 'electron', 'main.cjs'), 'A failed complete research baseline must stop startup rather than silently downgrade to a local rebuild.')
  }

  const extraResources = packageJson.build?.extraResources ?? []
  const releaseTargets = new Set(extraResources.map((entry) => entry.to))
  for (const target of ['court-files', 'court-files/manifest.json', 'seed-cache', 'seed-cache-manifest.json']) {
    if (!releaseTargets.has(target)) addFinding('complete-release-resource', 'high', path.join(root, 'package.json'), `Complete release resource is missing: ${target}`)
  }
  if (!packageJson.build?.win?.target) {
    addFinding('windows-release-target', 'medium', path.join(root, 'package.json'), 'The public release configuration is missing the requested Windows installer target.')
  }
  if (packageJson.build?.forceCodeSigning !== true || packageJson.build?.mac?.notarize !== true) {
    addFinding('release-signing-required', 'high', path.join(root, 'package.json'), 'Desktop release packaging must fail closed when code signing or macOS notarization is unavailable.')
  }
  const macResources = packageJson.build?.mac?.extraResources ?? []
  if (!macResources.some((entry) => entry.to === 'native/docket-observatory-keychain.node')) {
    addFinding('macos-keychain-addon-resource', 'high', path.join(root, 'package.json'), 'macOS packages must include the architecture-specific non-interactive Keychain addon.')
  }
  const fuses = packageJson.build?.electronFuses ?? {}
  for (const [name, expected] of Object.entries({
    runAsNode: false,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
    grantFileProtocolExtraPrivileges: false,
  })) {
    if (fuses[name] !== expected) addFinding('electron-fuse-gap', 'high', path.join(root, 'package.json'), `Electron fuse ${name} must be ${expected}.`)
  }

  const networkPolicy = await readFile(path.join(root, 'server', 'network-policy.cjs'), 'utf8')
  const networkManifest = await readFile(path.join(root, 'NETWORK.md'), 'utf8')
  for (const host of ['nfsc.press', 'www.justice.gov', 'www.sec.gov', 'www.courtlistener.com', 'storage.courtlistener.com', 'www.federalregister.gov']) {
    if (!networkPolicy.includes(host)) addFinding('network-policy-gap', 'medium', path.join(root, 'server', 'network-policy.cjs'), `Expected outbound host is missing: ${host}`)
    if (!networkManifest.includes(host)) addFinding('network-manifest-gap', 'medium', path.join(root, 'NETWORK.md'), `Expected outbound host is undocumented: ${host}`)
  }

  const safeFetch = await readFile(path.join(root, 'server', 'safe-fetch.js'), 'utf8')
  if (!safeFetch.includes("redirect: 'manual'") || !safeFetch.includes('assertAllowedOutboundUrl(nextUrl')) {
    addFinding('unsafe-redirect-chain', 'high', path.join(root, 'server', 'safe-fetch.js'), 'Outbound redirects must be manual and each target must be allowlisted.')
  }
  if (!safeFetch.includes('sensitiveHeaders') || !safeFetch.includes("headers.delete(name)")) {
    addFinding('redirect-credential-leak', 'high', path.join(root, 'server', 'safe-fetch.js'), 'Sensitive headers must be removed across redirect origins.')
  }

  for (const relative of ['server/adapters.js', 'server/recap-client.js', 'server/download-documents.js', 'server/analysis.js', 'server/document-analysis.js', 'server/automation-runner.js', 'server/index.js', 'server/local-legal-ai.js', 'server/research-chat.js']) {
    const content = await readFile(path.join(root, relative), 'utf8')
    if (/\bfetch\s*\(/.test(content)) addFinding('direct-outbound-fetch', 'high', path.join(root, relative), 'Outbound calls must use safeFetch so redirect and timeout policy cannot be bypassed.')
  }
  const localAi = await readFile(path.join(root, 'server', 'local-legal-ai.js'), 'utf8')
  if (!localAi.includes('maxRedirects: 0') || !localAi.includes('allowedOrigins: [origin]')) {
    addFinding('local-ai-redirect-policy', 'high', path.join(root, 'server', 'local-legal-ai.js'), 'Loopback AI requests must reject redirects and remain restricted to the validated local origin.')
  }

  const downloader = await readFile(path.join(root, 'server', 'download-documents.js'), 'utf8')
  if (!downloader.includes('maximumDownloadBytes') || !downloader.includes('streamPdfResponse')) {
    addFinding('download-size-limit', 'high', path.join(root, 'server', 'download-documents.js'), 'PDF downloads need declared and streamed byte limits.')
  }
  if (!downloader.includes('integrity-history.jsonl') || !downloader.includes('appendIntegrityHistory')) {
    addFinding('integrity-ledger', 'high', path.join(root, 'server', 'download-documents.js'), 'Court-file hashes need an append-only history ledger.')
  }
  if (!downloader.includes('verifyIntegrityHistory(priorHistory)') || !downloader.includes('refusing to append')) {
    addFinding('integrity-ledger-preappend-check', 'high', path.join(root, 'server', 'download-documents.js'), 'The prior integrity chain and manifest head must be verified before new entries are appended.')
  }
  if (!downloader.includes('isAllowedOutboundUrl(absoluteUrl')) {
    addFinding('download-link-allowlist', 'high', path.join(root, 'server', 'download-documents.js'), 'Scraped document links must be checked against the outbound network allowlist before download.')
  }
  if (!downloader.includes('secureWritableLibraryPermissions(root)') || !downloader.includes('await chmod(target, 0o600)') || !downloader.includes('await chmod(directory, 0o700)')) {
    addFinding('private-document-library-permissions', 'high', path.join(root, 'server', 'download-documents.js'), 'The writable court-file library must migrate files and directories to owner-only permissions.')
  }

  const adapters = await readFile(path.join(root, 'server', 'adapters.js'), 'utf8')
  if (!adapters.includes('isAllowedOutboundUrl(value')) {
    addFinding('event-link-allowlist', 'high', path.join(root, 'server', 'adapters.js'), 'Scraped event source links must be checked against the outbound network allowlist.')
  }

  const extraction = await readFile(path.join(root, 'server', 'pdf-extraction.js'), 'utf8')
  if (!extraction.includes("runtimeSetting('pdfMaxFileMb')") || !extraction.includes('maximumConcurrentExtractions')) {
    addFinding('pdf-resource-limit', 'high', path.join(root, 'server', 'pdf-extraction.js'), 'PDF parsing needs file-size and concurrency limits.')
  }
  if (!extraction.includes('await parser.destroy()') || !extraction.includes('await worker.terminate()')) {
    addFinding('pdf-resource-cleanup', 'high', path.join(root, 'server', 'pdf-extraction.js'), 'PDF and OCR resources must be destroyed after processing.')
  }
  if (!extraction.includes('verifiedExtractionPath') || !extraction.includes('outside_managed_library') || !extraction.includes('await realpath(')) {
    addFinding('pdf-managed-path-boundary', 'high', path.join(root, 'server', 'pdf-extraction.js'), 'PDF extraction must resolve real paths and reject files outside managed court-file roots.')
  }
  if (!extraction.includes("status: 'integrity_mismatch'") || !extraction.includes('manifestSha256') || !extraction.includes('contentSha256')) {
    addFinding('pdf-extraction-integrity', 'high', path.join(root, 'server', 'pdf-extraction.js'), 'PDF extraction must verify current file bytes against the manifest SHA-256 before using or caching body text.')
  }
  if (!extraction.includes('shouldUseLocalOcr') || !extraction.includes('materially sparse')) {
    addFinding('pdf-sparse-text-ocr', 'high', path.join(root, 'server', 'pdf-extraction.js'), 'PDF extraction must use local OCR when a scanned filing exposes only a sparse ECF header text layer.')
  }

  if (!server.includes('verifiedManagedPdfPath(file.path, file.sha256)') || !server.includes('failed the manifest SHA-256 integrity check')) {
    addFinding('pdf-reader-integrity', 'high', path.join(root, 'server', 'index.js'), 'The in-app PDF reader must verify current file bytes against the manifest SHA-256 before streaming.')
  }
  if (!server.includes('safePublicSourceUrl(page?.url)') || !server.includes('source: safePublicSourceUrl(item.source) || null')) {
    addFinding('manifest-top-level-link-policy', 'high', path.join(root, 'server', 'index.js'), 'Manifest source-page and credential-gap links must be filtered through the same outbound allowlist as document URLs.')
  }
  if (!server.includes("status: 'stale'") || !server.includes('lastAttempt: current')) {
    addFinding('source-refresh-state', 'medium', path.join(root, 'server', 'index.js'), 'A transient refresh failure must remain visible without erasing the previous usable source observation.')
  }
  if (!server.includes("status.retryable === true") || !server.includes("status.lastAttempt?.retryable === true")) {
    addFinding('automatic-partial-source-retry', 'medium', path.join(root, 'server', 'index.js'), 'Automatic refresh must retry a failed or parser-degraded public source even when other sources remain healthy.')
  }

  const aiBoundary = await readFile(path.join(root, 'server', 'ai-data-boundary.js'), 'utf8')
  if (!aiBoundary.includes("label: 'EMAIL'") || !aiBoundary.includes("label: 'SSN'") || !aiBoundary.includes('[REDACTED_${rule.label}]')) {
    addFinding('ai-pii-redaction', 'medium', path.join(root, 'server', 'ai-data-boundary.js'), 'AI body transmission needs default sensitive-data redaction.')
  }

  const settingsStore = await readFile(path.join(root, 'server', 'settings-store.js'), 'utf8')
  if (!settingsStore.includes('secureExistingCachePermissions') || !settingsStore.includes('await chmod(target, 0o600)') || !settingsStore.includes('await chmod(directory, 0o700)')) {
    addFinding('private-cache-permissions', 'high', path.join(root, 'server', 'settings-store.js'), 'Existing extracted-text and AI caches must be migrated to owner-only file permissions.')
  }
  const cloudAi = await readFile(path.join(root, 'server', 'cloud-ai.js'), 'utf8')
  if (!cloudAi.includes("export const cloudProviderIds = ['openai', 'anthropic', 'gemini', 'openai_compatible']")
    || !cloudAi.includes('allowedOrigins: [new URL(endpoint).origin]')
    || !cloudAi.includes("requires a Base URL in Settings.")
    || !settingsStore.includes("compatibleAiBaseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL || ''")
    || !settingsStore.includes("url.protocol !== 'https:' && !(url.protocol === 'http:' && local)")) {
    addFinding('cloud-ai-provider-boundary', 'high', path.join(root, 'server', 'cloud-ai.js'), 'Cloud AI must use reviewed official protocols, require an explicit compatible Base URL, fail closed on invalid remote URLs, and keep compatible requests on the exact configured Origin.')
  }

  const automationRunner = await readFile(path.join(root, 'server', 'automation-runner.js'), 'utf8')
  if (!automationRunner.includes('redacted: preparedText !== sourceText')
    || !automationRunner.includes("pageTranslations.some((page) => page.contentIntegrity === 'redacted')")
    || !automationRunner.includes('redactedTranslated')) {
    addFinding('translation-redaction-accounting', 'high', path.join(root, 'server', 'automation-runner.js'), 'Redacted body translations must not be counted as complete source-faithful translations.')
  }
  if (!automationRunner.includes("step.result = 'attention'") || !automationRunner.includes('Automation run finished with capability gaps.')) {
    addFinding('automation-gap-state', 'medium', path.join(root, 'server', 'automation-runner.js'), 'Blocked translation or AI work must remain visible as a capability gap instead of a fully successful run.')
  }
  if (!automationRunner.includes("['downloaded', 'downloaded_new_version'].includes(right.file.status)")) {
    addFinding('automation-fresh-file-priority', 'high', path.join(root, 'server', 'automation-runner.js'), 'Bounded automatic processing must prioritize files downloaded or updated in the current run so new filings cannot starve behind older high-priority records.')
  }
  if (!automationRunner.includes("run.requested.processingScope === 'all'\n    ? await buildProcessingGapIndex(files, run)\n    : new Map()")
    || !automationRunner.includes(".filter((item) => ['downloaded', 'downloaded_new_version'].includes(item.file.status))")) {
    addFinding('automation-incremental-only', 'high', path.join(root, 'server', 'automation-runner.js'), 'Scheduled priority processing must avoid scanning or rotating through the historical corpus and process only files downloaded or changed in the current run.')
  }
  if (!automationRunner.includes("if (processingScope === 'all') return records.slice(0, limit)")
    || !automationRunner.includes('processingGapWeight(right.processingGap) - processingGapWeight(left.processingGap)')) {
    addFinding('automation-explicit-full-rebuild', 'high', path.join(root, 'server', 'automation-runner.js'), 'Explicit full processing must retain historical rebuild behavior and prioritize documents with missing extraction, translation, or legal-read caches.')
  }
  if (!automationRunner.includes('caseDossierSchema') || !automationRunner.includes('validateCaseDossierAnalysis')) {
    addFinding('case-ai-schema-validation', 'high', path.join(root, 'server', 'automation-runner.js'), 'Case-level AI must use Structured Outputs and validate evidence ids and page citations before caching.')
  }
  const documentAnalysis = await readFile(path.join(root, 'server', 'document-analysis.js'), 'utf8')
  if (!automationRunner.includes("const translationCacheVersion = 'translation-v7'")
    || !automationRunner.includes('schemaVersion: translationCacheVersion')
    || !documentAnalysis.includes("const translationCacheVersion = 'translation-v7'")
    || !documentAnalysis.includes('value?.schemaVersion === translationCacheVersion')) {
    addFinding('translation-cache-version', 'high', path.join(root, 'server', 'automation-runner.js'), 'Translation cache records must carry and enforce an explicit schema version so legacy partial results are not counted or displayed as current output.')
  }
  if (!documentAnalysis.includes("sourceStatusById.get(sourceId)?.status !== 'ok'")) {
    addFinding('case-source-gap-regression', 'high', path.join(root, 'server', 'document-analysis.js'), 'Case source gaps must reflect current source status rather than count configured source types.')
  }
  if (/function buildDocumentCatalog[\s\S]{0,900}\.filter\(\(file\) => file\.status !== 'error'\)/.test(documentAnalysis)) {
    addFinding('failed-document-search-regression', 'medium', path.join(root, 'server', 'document-analysis.js'), 'Collected files with download errors must remain searchable for source recovery and diagnosis.')
  }
  if (!documentAnalysis.includes('englishLocalFilename') || !server.includes('statusCode === 503')) {
    addFinding('localized-path-and-safe-503', 'medium', path.join(root, 'server', 'index.js'), 'English responses must sanitize localized filenames, and known secure-storage 503 errors should remain actionable without exposing stack traces.')
  }
  if (!documentAnalysis.includes('validateDocumentAiAnalysis')
    || !documentAnalysis.includes('aiFindings: ai.findings')
    || !documentAnalysis.includes('Cloud document analysis cited an unavailable extracted page.')) {
    addFinding('document-ai-citation-validation', 'high', path.join(root, 'server', 'document-analysis.js'), 'Document AI must retain cited findings and reject page citations outside the extracted evidence packet.')
  }

  const mainEntry = await readFile(path.join(root, 'src', 'main.tsx'), 'utf8')
  if (!mainEntry.includes('AppErrorBoundary') || !mainEntry.includes('getDerivedStateFromError')) {
    addFinding('renderer-error-boundary', 'medium', path.join(root, 'src', 'main.tsx'), 'The renderer needs an application-level error boundary so one render failure does not leave a blank window.')
  }
  const appSource = await readFile(path.join(root, 'src', 'App.tsx'), 'utf8')
  if (!appSource.includes("function apiFetch(input: RequestInfo | URL, init: RequestInit = {})")
    || !appSource.includes("cache: 'no-store'")
    || !appSource.includes("headers.set('X-Docket-Observatory-Request', '1')")
    || /await fetch\(`\/api\//.test(appSource)) {
    addFinding('renderer-api-cache-policy', 'high', path.join(root, 'src', 'App.tsx'), 'Renderer API calls must use the no-store wrapper so source refreshes and settings changes are visible immediately.')
  }
  if (!appSource.includes('function safeExternalHref')
    || !appSource.includes("url.protocol === 'https:'")
    || /href=\{(?:record|file|item|source|document|candidate|docket|evidence|citation|alternative|target|selectedEvent|selectedAction)[^}]*\.sourceUrl\}/.test(appSource)) {
    addFinding('renderer-external-url-policy', 'high', path.join(root, 'src', 'App.tsx'), 'Dynamic external links must pass through a scheme allowlist before reaching an anchor href.')
  }

  await assertDocumentIntegrity()
  await assertLegalClassification()
}

async function assertLegalClassification() {
  const { classifyDocketAssertionType, entityIdsForText, hasSecReference, parseDocketFilingDate, parseNfscTimelineEvents } = await import(pathToFileURL(path.join(root, 'server', 'adapters.js')).href)
  const fixtures = [
    ['Appeal', 'Doc 850, May 28, 2026, A pro se petitioner asks the Second Circuit to order the district court to docket her filing.', 'Third-party or pro se filing'],
    ['Mandamus', 'Doc 849, May 15, 2026, The Second Circuit denies multiple pro se mandamus petitions.', 'Court order or judgment'],
    ['Sentencing', 'Doc 853, June 25, 2026, Defense counsel moves to adjourn sentencing. Government opposes.', 'Party filing'],
    ['Discovery', 'Doc 854, June 25, 2026, Court denies Guo\u2019s motion to compel subpoena compliance.', 'Court order or judgment'],
    ['Appeal', 'Doc 862, July 2, 2026, Miles Guo filed a Notice of Appeal to the Second Circuit.', 'Party filing'],
  ]
  for (const [category, title, expected] of fixtures) {
    const actual = classifyDocketAssertionType(category, title)
    if (actual !== expected) {
      addFinding('legal-classification-regression', 'high', path.join(root, 'server', 'adapters.js'), `Expected ${expected} but received ${actual} for: ${title}`)
    }
  }

  const dateFixtures = [
    ['Doc 868, August 6, 2026 — Second Circuit mandate denying the petitions.', '2026-08-06'],
    ['Doc 813, Mar 11,2026, A third party asks the Second Circuit to docket a filing.', '2026-03-11'],
    ['Doc 681 NOTICE OF ATTORNEY APPEARANCE (Entered: 04/08/2025)', '2025-04-08'],
    ['Doc 81-5 Exhibit Exhibit B — Summons and Verified Complaint dated August 8, 2019', null],
    ['Doc 81-21 Exhibit Exhibit C — Verified Amended Complaint dated August 26, 2019', null],
    ['Doc 120-4 Exhibit D (Jan. 20, 2022 email)', null],
    ['Doc 857, June 26, 2026, A pro se petitioner petitions the Second Circuit.', '2026-06-26'],
  ]
  for (const [title, expected] of dateFixtures) {
    const actual = parseDocketFilingDate(title)
    if (actual !== expected) {
      addFinding('docket-filing-date-regression', 'high', path.join(root, 'server', 'adapters.js'), `Expected ${expected ?? 'null'} but received ${actual ?? 'null'} for: ${title}`)
    }
  }

  for (const [text, expected] of [
    ['Notice of appeal to the Second Circuit', false],
    ['SEC disgorgement credit and Fair Fund distribution', true],
    ['Securities and Exchange Commission complaint', true],
  ]) {
    if (hasSecReference(text) !== expected) {
      addFinding('sec-reference-regression', 'high', path.join(root, 'server', 'adapters.js'), `SEC reference classification was incorrect for: ${text}`)
    }
  }

  for (const [text, expected] of [
    ['The government asks the court to reject his objections.', false],
    ['Kin Ming Je and William Je are named.', true],
  ]) {
    if (entityIdsForText(text).includes('kin-ming-je') !== expected) {
      addFinding('kin-ming-je-entity-regression', 'high', path.join(root, 'server', 'adapters.js'), `Kin Ming Je entity classification was incorrect for: ${text}`)
    }
  }

  const { normalizeDocketNumber, compareDocketNumbers } = await import(pathToFileURL(path.join(root, 'server', 'docket-number.js')).href)
  for (const [input, expected] of [['Doc 81-21 Exhibit C', '81-21'], ['81-1', '81-1'], ['Doc 836', '836']]) {
    const actual = normalizeDocketNumber(input)
    if (actual !== expected) {
      addFinding('docket-number-regression', 'high', path.join(root, 'server', 'docket-number.js'), `Expected ${expected} but received ${actual} for: ${input}`)
    }
  }
  if (compareDocketNumbers('81', '81-1') >= 0 || compareDocketNumbers('81-21', '81-3') <= 0) {
    addFinding('docket-number-order-regression', 'high', path.join(root, 'server', 'docket-number.js'), 'Attachment docket numbers are not ordered after their parent and numerically within the attachment group.')
  }
  const nfscFixtureSource = {
    id: 'nfsc-criminal-mirror',
    shortName: 'NFSC mirror',
    type: 'Mirror',
    confidence: 'medium',
    url: 'https://nfsc.press/2024/08/25/criminal-court-case-documents-123-cr-00118-at/',
  }
  if (parseNfscTimelineEvents('<html><body><a href="/wp-content/uploads/2024/08/862.pdf">Doc 862, July 2, 2026 - Notice of Appeal</a></body></html>', nfscFixtureSource).length !== 1
    || parseNfscTimelineEvents('<html><body><main>Challenge page</main></body></html>', nfscFixtureSource).length !== 0) {
    addFinding('nfsc-parser-health-regression', 'high', path.join(root, 'server', 'adapters.js'), 'The NFSC adapter must distinguish a parsed dated docket row from an empty or interstitial response.')
  }

  const { parsePublicRecapFeed, publicRecapStorageCandidate, recapTargets } = await import(pathToFileURL(path.join(root, 'server', 'recap-client.js')).href)
  const recapTarget = recapTargets.find((target) => target.courtListenerDocketId === 67011674)
  const publicFeedFixture = `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <updated>2025-02-01T12:34:56-05:00</updated>
      <entry><title>SEC v. Kwok</title><link href="https://www.courtlistener.com/docket/67011674/69/1/securities-and-exchange-commission-v-kwok/" rel="alternate"/><published>2025-01-06T00:00:00-05:00</published><summary type="html">&lt;p&gt;Document 69-1 notice of appearance.&lt;/p&gt;</summary></entry>
      <entry><title>Wrong docket</title><link href="https://www.courtlistener.com/docket/99999999/69/wrong-docket/" rel="alternate"/><published>2025-01-06T00:00:00-05:00</published></entry>
      <entry><title>Empty result</title><link href="https://www.courtlistener.com" rel="alternate"/><published>2025-01-06T00:00:00-05:00</published></entry>
      <entry><title>Foreign host</title><link href="https://example.com/docket/67011674/70/foreign/" rel="alternate"/><published>2025-01-07T00:00:00-05:00</published></entry>
    </feed>`
  const recapFixtureEvents = parsePublicRecapFeed(publicFeedFixture, recapTarget)
  if (recapFixtureEvents.length !== 1
    || recapFixtureEvents[0].date !== '2025-01-06'
    || recapFixtureEvents[0].dateBasis !== 'court_filed'
    || recapFixtureEvents[0].dateConfidence !== 'high'
    || recapFixtureEvents[0].filingNumber !== '69-1'
    || recapFixtureEvents[0].sourceUrl !== 'https://www.courtlistener.com/docket/67011674/69/1/securities-and-exchange-commission-v-kwok/'
    || recapFixtureEvents[0].assertionType !== 'Public RECAP feed metadata'
    || recapFixtureEvents[0].id !== 'recap-feed-sdny-23-cv-2200-67011674-69-1') {
    addFinding('public-recap-feed-boundary', 'high', path.join(root, 'server', 'recap-client.js'), 'The public RECAP feed parser must accept only the configured docket id, use the court filing date instead of feed update time, preserve attachment numbers, and reject root or foreign URLs.')
  }
  const recapStorageCandidate = publicRecapStorageCandidate(recapFixtureEvents[0], [{
    sourceId: 'courtlistener-recap',
    courtListenerDocketId: 67011674,
    url: 'https://storage.courtlistener.com/recap/gov.uscourts.nysd.595310/gov.uscourts.nysd.595310.68.0.pdf',
  }])
  if (recapStorageCandidate?.docNumber !== '69-1'
    || recapStorageCandidate?.url !== 'https://storage.courtlistener.com/recap/gov.uscourts.nysd.595310/gov.uscourts.nysd.595310.69.1.pdf'
    || recapStorageCandidate?.discoveryMethod !== 'courtlistener_public_feed_storage_probe') {
    addFinding('public-recap-storage-probe-regression', 'high', path.join(root, 'server', 'recap-client.js'), 'Public feed storage probing must derive only the configured docket storage path while preserving entry and attachment numbers.')
  }

  const adapterSource = await readFile(path.join(root, 'server', 'adapters.js'), 'utf8')
  if (!adapterSource.includes('scanPublicRecapFeeds()')
    || !adapterSource.includes('scanPublicRecapSearch({ pageLimit: 1 })')
    || !adapterSource.includes("? 'limited' : 'error'")) {
    addFinding('public-recap-no-token-fallback', 'high', path.join(root, 'server', 'adapters.js'), 'CourtListener must use public fixed-docket feeds plus bounded structured search as a limited no-token fallback.')
  }

  const {
    caseDossierEvidenceIndex,
    splitTextContinuously,
    validateCaseDossierAnalysis,
  } = await import(pathToFileURL(path.join(root, 'server', 'case-ai-schema.js')).href)
  const continuousFixture = Array.from({ length: 137 }, (_, index) => String.fromCharCode(33 + (index % 80))).join('')
  if (splitTextContinuously(continuousFixture, 17).join('') !== continuousFixture) {
    addFinding('translation-chunk-continuity', 'high', path.join(root, 'server', 'case-ai-schema.js'), 'Translation chunks do not reconstruct the source text continuously.')
  }
  const evidence = {
    caseMetadata: { id: 'case:test', label: 'Test case' },
    events: [{ id: 'event:test', label: 'Test event' }],
    documents: [{ id: 'doc:test', docNumber: '1', extraction: { pages: [{ pageNumber: 2 }] } }],
  }
  const validDossier = {
    mode: 'fixture',
    confidence: 'medium',
    bottomLine: [{ text: 'Supported conclusion.', confidence: 'medium', citations: [{ evidenceId: 'doc:test', pageNumber: 2 }] }],
    proceduralPosture: [],
    courtConfirmedMaterial: [],
    contestedPositions: [],
    crossCaseConnections: [],
    evidenceGaps: [],
    watchNext: [],
    limitations: 'Fixture only.',
  }
  const evidenceIndex = caseDossierEvidenceIndex(evidence)
  try {
    validateCaseDossierAnalysis(validDossier, evidenceIndex)
  } catch (error) {
    addFinding('case-ai-valid-fixture', 'high', path.join(root, 'server', 'case-ai-schema.js'), `Valid case AI fixture was rejected: ${error instanceof Error ? error.message : String(error)}`)
  }
  try {
    validateCaseDossierAnalysis({
      ...validDossier,
      bottomLine: [{ text: 'Invented page.', confidence: 'low', citations: [{ evidenceId: 'doc:test', pageNumber: 99 }] }],
    }, evidenceIndex)
    addFinding('case-ai-page-validation', 'high', path.join(root, 'server', 'case-ai-schema.js'), 'Case AI validation accepted a page number that was not supplied in the evidence packet.')
  } catch {
    // Expected rejection.
  }

  const { shouldUseLocalOcr } = await import(pathToFileURL(path.join(root, 'server', 'pdf-extraction.js')).href)
  if (!shouldUseLocalOcr('Case 1:23-cr-00118-AT Document 862 Filed 07/02/26 Page 1 of 1', [{ pageNumber: 1 }])) {
    addFinding('pdf-sparse-header-fixture', 'high', path.join(root, 'server', 'pdf-extraction.js'), 'A scanned filing with only an ECF header text layer must trigger local OCR.')
  }
  if (shouldUseLocalOcr('ORDER: The motion is denied. The Clerk shall terminate docket entry 100. The parties shall file a joint status letter by September 1, 2026.', [{ pageNumber: 1 }])) {
    addFinding('pdf-substantive-text-fixture', 'high', path.join(root, 'server', 'pdf-extraction.js'), 'A substantive short order should not be treated as an ECF-header-only OCR candidate.')
  }

  const { createSeedState } = await import(pathToFileURL(path.join(root, 'server', 'seed.js')).href)
  const { buildLitigationPositions } = await import(pathToFileURL(path.join(root, 'server', 'litigation-positions.js')).href)
  const seed = createSeedState()
  const mixedFixture = {
    id: 'security-fixture-doc-836',
    date: '2026-04-22',
    title: 'Doc 836: The defense requests, and the Court orders, that Mr. Guo be allowed to wear non-prison clothing during his sentencing.',
    summary: 'The defense requests, and the Court orders, that Mr. Guo be allowed to wear non-prison clothing during his sentencing.',
    impact: 'The filing records both the defense request and the resulting court order.',
    caseId: 'sdny-23-cr-118',
    relatedCaseIds: ['sdny-23-cr-118'],
    court: 'S.D.N.Y.',
    docketNumber: '1:23-cr-00118-AT',
    filingNumber: '836',
    category: 'Sentencing',
    severity: 'medium',
    sourceId: 'nfsc-criminal-mirror',
    sourceLabel: 'NFSC mirror of court filing',
    sourceType: 'Mirror',
    sourceUrl: 'https://nfsc.press/wp-content/uploads/2024/08/836.pdf',
    confidence: 'medium',
    assertionType: 'Mirror summary of court filing',
    entities: ['ho-wan-kwok'],
    tags: ['sentencing'],
  }
  const fixtureState = { ...seed, events: [...seed.events, mixedFixture] }
  const localized = {
    cases: fixtureState.cases,
    events: fixtureState.events,
    sources: fixtureState.sources,
  }
  const doc836 = buildLitigationPositions(fixtureState, localized, 'en').actions.find((action) => action.eventId === mixedFixture.id)
  if (!doc836 || doc836.roleKey !== 'defense' || doc836.statusKey !== 'requested' || doc836.courtDispositionKey !== 'ordered') {
    addFinding('mixed-party-court-regression', 'high', path.join(root, 'server', 'litigation-positions.js'), 'Doc 836 must preserve the defense request and separately record the court order.')
  }
}

async function assertDocumentIntegrity() {
  const documentRoot = path.join(root, 'downloads', 'court-files-complete')
  let manifest
  try {
    manifest = JSON.parse(await readFile(path.join(documentRoot, 'manifest.json'), 'utf8'))
  } catch {
    return
  }
  const available = (manifest.files ?? []).filter((file) => file.status !== 'error')
  for (const file of available) {
    if (!file.sha256 || !file.verifiedAt || !Number.isFinite(Number(file.mtimeMs))) {
      addFinding('manifest-integrity-gap', 'high', path.join(documentRoot, 'manifest.json'), 'An available court file is missing SHA-256, verification time, or mtime.')
      break
    }
  }

  const [{ isPredominantlyCjk, localDocumentAnalysis, validateDocumentAiAnalysis }, { createSeedState }] = await Promise.all([
    import(pathToFileURL(path.join(root, 'server', 'document-analysis.js')).href),
    import(pathToFileURL(path.join(root, 'server', 'seed.js')).href),
  ])
  const documentIds = (manifest.files ?? []).map((file) => localDocumentAnalysis(file, createSeedState(), 'en').id)
  if (new Set(documentIds).size !== documentIds.length) {
    addFinding('document-identity-collision', 'high', path.join(root, 'server', 'document-analysis.js'), 'Every manifest source URL must produce a unique document identity for UI pagination, citations, and AI evidence.')
  }
  if (isPredominantlyCjk('民口 Case 1:23-cr-00118 Document 862 Filed 07/02/26 Page 1 of 1')) {
    addFinding('ocr-language-noise-regression', 'high', path.join(root, 'server', 'document-analysis.js'), 'A few OCR noise characters must not hide an otherwise English filing from the English API.')
  }
  if (!isPredominantlyCjk('这是中文法院文件正文，内容需要在英文模式下翻译后显示。')) {
    addFinding('cjk-language-detection-regression', 'high', path.join(root, 'server', 'document-analysis.js'), 'Predominantly Chinese body text must remain behind the English translation boundary.')
  }
  const doc862Files = (manifest.files ?? []).filter((file) => file.docNumber === '862')
  const doc862Variants = doc862Files.map((file) => localDocumentAnalysis(file, createSeedState(), 'en'))
  const sourceOriginal = doc862Variants.find((record) => record.variantKey === 'source')
  const referenceTranslation = doc862Variants.find((record) => record.variantKey === 'chinese_reference_translation')
  if (!sourceOriginal || !referenceTranslation
    || sourceOriginal.variantLabel !== 'Source-language original'
    || referenceTranslation.variantLabel !== 'Chinese reference translation') {
    addFinding('document-variant-regression', 'high', path.join(root, 'server', 'document-analysis.js'), 'A source filing and its Chinese reference translation must remain visibly distinguishable even when they share a docket number.')
  }

  const validDocumentAi = {
    mode: 'fixture',
    confidence: 'medium',
    summary: 'Supported summary.',
    plainEnglish: 'Supported plain-language reading.',
    legalReading: ['Supported legal reading.'],
    caseConnections: [],
    whyItMatters: [],
    sourcePosture: 'Mirror metadata; verify against the docket of record.',
    verificationTasks: [],
    riskFlags: [],
    relatedTopics: [],
    findings: [
      { section: 'summary', text: 'Supported summary.', confidence: 'medium', citations: [{ kind: 'source_metadata', pageNumber: null }] },
      { section: 'plainEnglish', text: 'Supported plain-language reading.', confidence: 'medium', citations: [{ kind: 'extracted_page', pageNumber: 1 }] },
      { section: 'legalReading', text: 'Supported legal reading.', confidence: 'medium', citations: [{ kind: 'extracted_page', pageNumber: 1 }] },
      { section: 'sourcePosture', text: 'Mirror metadata; verify against the docket of record.', confidence: 'high', citations: [{ kind: 'source_metadata', pageNumber: null }] },
    ],
  }
  const documentExtraction = { pageSnippets: [{ pageNumber: 1, text: 'Fixture page.' }] }
  try {
    validateDocumentAiAnalysis(validDocumentAi, documentExtraction, true)
  } catch (error) {
    addFinding('document-ai-valid-citations', 'high', path.join(root, 'server', 'document-analysis.js'), `Valid metadata and extracted-page citations were rejected: ${error instanceof Error ? error.message : String(error)}`)
  }
  try {
    validateDocumentAiAnalysis({
      ...validDocumentAi,
      findings: validDocumentAi.findings.map((finding) => finding.section === 'plainEnglish'
        ? { ...finding, citations: [{ kind: 'extracted_page', pageNumber: 99 }] }
        : finding),
    }, documentExtraction, true)
    addFinding('document-ai-page-validation', 'high', path.join(root, 'server', 'document-analysis.js'), 'Document AI validation accepted a page number that was not supplied in the extracted evidence packet.')
  } catch {
    // Expected rejection.
  }
  try {
    validateDocumentAiAnalysis({
      ...validDocumentAi,
      findings: validDocumentAi.findings.filter((finding) => finding.section !== 'summary'),
    }, documentExtraction, true)
    addFinding('document-ai-required-finding', 'high', path.join(root, 'server', 'document-analysis.js'), 'Document AI validation accepted an uncited summary.')
  } catch {
    // Expected rejection.
  }

  const { resolveAutomationOutputLanguages } = await import(pathToFileURL(path.join(root, 'server', 'automation-runner.js')).href)
  const languageFixtures = [
    ['en', 'zh', ['en']],
    ['zh', 'en', ['zh']],
    ['both', 'zh', ['zh', 'en']],
    ['invalid', 'en', ['en']],
  ]
  for (const [requested, fallback, expected] of languageFixtures) {
    const actual = resolveAutomationOutputLanguages(requested, fallback)
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      addFinding('automation-output-language-regression', 'high', path.join(root, 'server', 'automation-runner.js'), `Requested ${requested} with ${fallback} UI should process ${expected.join(', ')}, received ${actual.join(', ')}.`)
    }
  }

  try {
    const lines = (await readFile(path.join(documentRoot, 'integrity-history.jsonl'), 'utf8')).split('\n').filter(Boolean)
    let previousEntryHash = null
    for (const [index, line] of lines.entries()) {
      const entry = JSON.parse(line)
      const expected = { ...entry }
      delete expected.entryHash
      const digest = createHash('sha256').update(JSON.stringify(expected)).digest('hex')
      if (entry.entryHash !== digest || entry.previousEntryHash !== previousEntryHash) {
        addFinding('integrity-chain-invalid', 'high', path.join(documentRoot, 'integrity-history.jsonl'), `Integrity history chain failed at entry ${index + 1}.`)
        break
      }
      previousEntryHash = entry.entryHash
    }
  } catch {
    addFinding('integrity-chain-missing', 'high', path.join(documentRoot, 'integrity-history.jsonl'), 'Court-file integrity history is missing or invalid.')
  }
}

await scanRiskPatterns(await walk(root))
await assertProjectControls()

if (findings.length) {
  console.error('Security check failed:')
  for (const finding of findings) {
    console.error(`[${finding.severity}] ${finding.id} ${finding.file}${finding.line ? `:${finding.line}` : ''} - ${finding.message}`)
  }
  process.exit(1)
}

console.log('Security check passed: no high-risk code patterns or missing project controls detected.')
