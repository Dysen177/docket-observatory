import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const gitCommand = process.platform === 'win32' ? 'git.exe' : '/usr/bin/git'

function fail(message) {
  console.error(`Release environment preflight failed: ${message}`)
  process.exit(1)
}

function runGit(args) {
  return spawnSync(gitCommand, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
  })
}

const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor !== 24) fail(`Node.js 24 LTS is required; current runtime is ${process.version}. Run "nvm use" first.`)

const nvmrc = (await readFile(path.join(root, '.nvmrc'), 'utf8')).trim()
if (nvmrc !== '24') fail(`.nvmrc must pin Node 24, found ${JSON.stringify(nvmrc)}.`)

const npmAgent = process.env.npm_config_user_agent ?? ''
const npmMajor = Number(npmAgent.match(/\bnpm\/(\d+)/)?.[1] ?? 0)
if (npmMajor < 10) fail(`npm 10 or newer is required; detected user agent ${JSON.stringify(npmAgent || 'unknown')}.`)

const inside = runGit(['rev-parse', '--is-inside-work-tree'])
if (inside.status !== 0 || inside.stdout.trim() !== 'true') fail('the project is not an initialized Git worktree.')

const head = runGit(['rev-parse', '--verify', 'HEAD'])
if (head.status !== 0) fail('the Git repository has no committed HEAD. Create and review the initial commit before release packaging.')

const status = runGit(['status', '--porcelain=v1', '--untracked-files=all'])
if (status.status !== 0) fail('Git worktree status could not be read.')
if (status.stdout.trim()) fail('the Git worktree is not clean. Commit or intentionally remove pending source changes before packaging.')

for (const candidate of ['downloads', 'server/cache', 'release-data', 'release', '.env']) {
  const ignored = runGit(['check-ignore', '-q', candidate])
  if (ignored.status !== 0) fail(`release-private path is not protected by .gitignore: ${candidate}`)
}

console.log(`Release environment preflight passed on ${process.platform}/${process.arch} with ${process.version} and clean commit ${head.stdout.trim().slice(0, 12)}.`)
