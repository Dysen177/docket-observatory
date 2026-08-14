import { createRequire } from 'node:module'
import process from 'node:process'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')
const communityBuild = require('../electron-builder.community.cjs')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(packageJson.build?.forceCodeSigning === true, 'Formal release configuration must remain fail-closed for signing.')
assert(communityBuild.forceCodeSigning === false, 'Community build must explicitly allow unsigned packaging.')
assert(communityBuild.mac?.identity === '-', 'Community macOS build must use an ad-hoc signature to seal the application bundle.')
assert(communityBuild.mac?.notarize === false, 'Community macOS build must explicitly disable notarization.')
assert(communityBuild.win?.signAndEditExecutable === false, 'Community Windows build must explicitly disable executable signing.')
assert(communityBuild.mac?.artifactName?.includes('-unsigned.'), 'Community macOS artifact name must disclose unsigned status.')
assert(communityBuild.win?.artifactName?.includes('-unsigned.'), 'Community Windows artifact name must disclose unsigned status.')
assert(communityBuild.electronFuses?.runAsNode === false, 'Community build must preserve production Electron fuse hardening.')
assert(communityBuild.electronFuses?.onlyLoadAppFromAsar === true, 'Community build must preserve ASAR-only loading.')
assert(communityBuild.extraResources?.length === packageJson.build.extraResources?.length, 'Community build must preserve the complete-data payload.')

console.log(`Community build configuration passed on ${process.platform}: publisher signing remains absent, macOS bundle sealing is explicit, and production hardening/data payload are preserved.`)
