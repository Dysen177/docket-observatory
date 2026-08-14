import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import seedInstaller from '../electron/seed-installer.cjs'

const { installBundledSeedCache } = seedInstaller
const root = await mkdtemp(path.join(os.tmpdir(), 'docket-observatory-seed-'))

try {
  const resourcesRoot = path.join(root, 'resources')
  const sourceRoot = path.join(resourcesRoot, 'seed-cache')
  const targetRoot = path.join(root, 'user-cache')
  const payloadPath = path.join(sourceRoot, 'document-ai', 'fixture.json')
  const payload = `${JSON.stringify({ analysis: 'verified fixture' })}\n`
  const statePath = path.join(sourceRoot, 'state.json')
  const statePayload = `${JSON.stringify({ events: [{ id: 'bundled', value: 'release-1' }], sourceStatuses: [], lastRefresh: '2026-01-01T00:00:00.000Z' })}\n`
  await mkdir(path.dirname(payloadPath), { recursive: true })
  await writeFile(payloadPath, payload)
  await writeFile(statePath, statePayload)

  const releaseSummary = { schemaVersion: 1, releaseId: 'fixture-release' }
  const integrityManifest = {
    ...releaseSummary,
    files: [
      {
        path: 'document-ai/fixture.json',
        bytes: Buffer.byteLength(payload),
        sha256: createHash('sha256').update(payload).digest('hex'),
      },
      {
        path: 'state.json',
        bytes: Buffer.byteLength(statePayload),
        sha256: createHash('sha256').update(statePayload).digest('hex'),
      },
    ],
  }
  await writeFile(path.join(sourceRoot, 'release-seed.json'), `${JSON.stringify(releaseSummary)}\n`)
  await writeFile(path.join(resourcesRoot, 'seed-cache-manifest.json'), `${JSON.stringify(integrityManifest)}\n`)

  await mkdir(path.join(targetRoot, 'document-ai'), { recursive: true })
  await writeFile(path.join(targetRoot, 'document-ai', 'fixture.json'), 'partial failed copy')
  const installed = await installBundledSeedCache({ resourcesRoot, targetRoot })
  assert.equal(installed.status, 'installed')
  assert.equal(await readFile(path.join(targetRoot, 'document-ai', 'fixture.json'), 'utf8'), payload)

  const repeated = await installBundledSeedCache({ resourcesRoot, targetRoot })
  assert.equal(repeated.status, 'current')

  await writeFile(path.join(targetRoot, 'user-extra.json'), '{"preserved":true}\n')
  await writeFile(path.join(targetRoot, 'state.json'), `${JSON.stringify({ events: [{ id: 'bundled', value: 'user-old' }, { id: 'user-only', value: 'preserve' }], sourceStatuses: [], lastRefresh: '2026-02-01T00:00:00.000Z' })}\n`)
  const upgradedPayload = `${JSON.stringify({ analysis: 'upgraded verified fixture' })}\n`
  const upgradedStatePayload = `${JSON.stringify({ events: [{ id: 'bundled', value: 'release-2' }, { id: 'release-only', value: 'new' }], sourceStatuses: [], lastRefresh: '2026-01-15T00:00:00.000Z' })}\n`
  await writeFile(payloadPath, upgradedPayload)
  await writeFile(statePath, upgradedStatePayload)
  const upgradedSummary = { schemaVersion: 1, releaseId: 'fixture-release-2' }
  const upgradedIntegrityManifest = {
    ...upgradedSummary,
    files: [
      {
        path: 'document-ai/fixture.json',
        bytes: Buffer.byteLength(upgradedPayload),
        sha256: createHash('sha256').update(upgradedPayload).digest('hex'),
      },
      {
        path: 'state.json',
        bytes: Buffer.byteLength(upgradedStatePayload),
        sha256: createHash('sha256').update(upgradedStatePayload).digest('hex'),
      },
    ],
  }
  await writeFile(path.join(sourceRoot, 'release-seed.json'), `${JSON.stringify(upgradedSummary)}\n`)
  await writeFile(path.join(resourcesRoot, 'seed-cache-manifest.json'), `${JSON.stringify(upgradedIntegrityManifest)}\n`)
  const upgraded = await installBundledSeedCache({ resourcesRoot, targetRoot })
  assert.equal(upgraded.status, 'upgraded')
  assert.equal(await readFile(path.join(targetRoot, 'document-ai', 'fixture.json'), 'utf8'), upgradedPayload)
  assert.equal(await readFile(path.join(targetRoot, 'user-extra.json'), 'utf8'), '{"preserved":true}\n')
  const mergedState = JSON.parse(await readFile(path.join(targetRoot, 'state.json'), 'utf8'))
  assert.equal(mergedState.events.find((event) => event.id === 'bundled')?.value, 'release-2')
  assert.equal(mergedState.events.find((event) => event.id === 'release-only')?.value, 'new')
  assert.equal(mergedState.events.find((event) => event.id === 'user-only')?.value, 'preserve')
  assert.equal(mergedState.lastRefresh, '2026-02-01T00:00:00.000Z')

  const corruptTarget = path.join(root, 'corrupt-user-cache')
  await writeFile(payloadPath, `${upgradedPayload}corrupt`)
  await assert.rejects(
    installBundledSeedCache({ resourcesRoot, targetRoot: corruptTarget }),
    /unexpected size|SHA-256 verification/,
  )
  await assert.rejects(readFile(path.join(corruptTarget, '.release-seed-installed.json')), /ENOENT/)

  console.log('Release seed installation passed: verified install, partial-copy recovery, idempotence, baseline upgrade, user-extra preservation, and corrupt-source rejection.')
} finally {
  await rm(root, { recursive: true, force: true })
}
