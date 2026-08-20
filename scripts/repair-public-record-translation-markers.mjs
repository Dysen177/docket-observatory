import { createHash } from 'node:crypto'
import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheRoot = path.join(projectRoot, 'server/cache/public-record-translations/en')
const markerPattern = /ZXQ[A-Z]+ZXQ/giu
const wrappedTextPattern = /\[\[zh:\s*([^\]]*?)\s*\]\]/giu
const malformedTagPattern = /\[\[?zh\s*:/iu

let files = 0
let records = 0
let markers = 0

for await (const file of jsonFiles(cacheRoot)) {
  const record = await readJson(file)
  if (!record || record.status !== 'translated' || !Array.isArray(record.segments)) continue

  let changed = false
  const clean = (value) => {
    const text = String(value ?? '')
    const markersInText = text.match(markerPattern) ?? []
    const wrappersInText = text.match(wrappedTextPattern) ?? []
    const malformedTag = malformedTagPattern.test(text)
    if (!markersInText.length && !wrappersInText.length && !malformedTag) return text
    markers += markersInText.length + wrappersInText.length + (malformedTag ? 1 : 0)
    changed = true
    let repaired = text.replace(markerPattern, ' ').replace(wrappedTextPattern, '$1')
    if (malformedTag) repaired = repaired.replace(/\[\[?zh\s*:/giu, '').replaceAll('[', '').replaceAll(']', '')
    return normalizeEnglish(repaired)
  }

  const title = clean(record.title)
  const segments = record.segments.map((segment) => ({
    ...segment,
    text: clean(segment.text),
  }))
  if (!changed) continue

  const body = segments.map((segment) => segment.text ?? '').join('\n')
  const repaired = {
    ...record,
    title,
    segments,
    contentSha256: sha256(`${title ?? ''}\n${body}`),
  }
  await writeJsonAtomic(file, repaired)
  files += 1
  records += 1
}

console.log(JSON.stringify({ files, records, markers }, null, 2))

async function* jsonFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'failures') continue
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) yield* jsonFiles(file)
    else if (entry.isFile() && entry.name.endsWith('.json')) yield file
  }
}

function normalizeEnglish(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/ +([,.;:!?])/g, '$1')
    .trim()
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, file)
}
