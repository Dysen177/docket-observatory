import { gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { readFile, readdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const gunzipAsync = promisify(gunzip)
const sourceRoot = path.resolve('server/public-record-transcripts')
const cacheRoot = path.resolve('server/cache/public-record-translations/en')
const sourceById = new Map()
const manifest = JSON.parse(await readFile(path.join(sourceRoot, 'manifest.json'), 'utf8'))
for (const shard of manifest.shards ?? []) {
  const records = JSON.parse((await gunzipAsync(await readFile(path.join(sourceRoot, shard.dataFilename)))).toString('utf8'))
  for (const record of records) sourceById.set(record.id, record)
}

const corrections = [
  ['王岐山', [['wang zhushan', 'Wang Qishan'], ['wang qishan', 'Wang Qishan']]],
  ['杨洁篪', [['yang jiechi', 'Yang Jiechi']]],
  ['范冰冰', [['fan bingbing', 'Fan Bingbing']]],
  ['傅政华', [['fu zhenghua', 'Fu Zhenghua']]],
]
let files = 0
let replacements = 0
for (const year of ['2017', '2018', '2019', '2020', '2021', '2022', '2023']) {
  for (const file of await readdir(path.join(cacheRoot, year))) {
    if (!file.endsWith('.json')) continue
    const cachePath = path.join(cacheRoot, year, file)
    const record = JSON.parse(await readFile(cachePath, 'utf8'))
    const source = sourceById.get(record.id)
    if (!source) continue
    const sourceText = `${source.title ?? ''}\n${source.segments?.map((segment) => segment.text).join('\n') ?? ''}`
    const active = corrections.filter(([sourceTerm]) => sourceText.includes(sourceTerm))
    if (!active.length) continue
    let changed = false
    const replace = (value) => {
      let result = String(value ?? '')
      for (const [, rules] of active) {
        for (const [from, to] of rules) {
          const pattern = new RegExp(`(?<![A-Za-z])${escapeRegExp(from)}(?![A-Za-z])`, 'giu')
          result = result.replace(pattern, () => { replacements += 1; changed = true; return to })
        }
      }
      return result
    }
    const title = replace(record.title)
    const segments = record.segments.map((segment) => ({ ...segment, text: replace(segment.text) }))
    if (!changed) continue
    const body = segments.map((segment) => segment.text ?? '').join('\n')
    await writeJsonAtomic(cachePath, {
      ...record,
      title,
      segments,
      charCount: body.length,
      contentSha256: sha256(`${title}\n${body}`),
      translatedAt: new Date().toISOString(),
    })
    files += 1
  }
}
console.log(JSON.stringify({ files, replacements }, null, 2))

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, file)
}
