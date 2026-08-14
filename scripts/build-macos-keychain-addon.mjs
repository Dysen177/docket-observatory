import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

if (process.platform !== 'darwin') {
  console.log('macOS keychain addon build skipped on non-macOS platform.')
  process.exit(0)
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'native', 'macos-keychain-no-ui.mm')
const nodeInclude = path.resolve(path.dirname(process.execPath), '..', 'include', 'node')
const architectures = ['arm64', 'x64']

for (const arch of architectures) {
  const outputDirectory = path.join(root, 'build', 'native', arch)
  const output = path.join(outputDirectory, 'docket-observatory-keychain.node')
  mkdirSync(outputDirectory, { recursive: true })
  execFileSync('xcrun', [
    'clang++',
    '-std=c++20',
    '-dynamiclib',
    '-undefined',
    'dynamic_lookup',
    '-fobjc-arc',
    '-fvisibility=hidden',
    '-mmacosx-version-min=13.0',
    '-arch',
    arch === 'x64' ? 'x86_64' : 'arm64',
    `-I${nodeInclude}`,
    '-framework',
    'Security',
    '-framework',
    'CoreFoundation',
    '-framework',
    'LocalAuthentication',
    source,
    '-o',
    output,
  ], { stdio: 'inherit' })
}

console.log('Built non-interactive macOS keychain addons for arm64 and x64.')
