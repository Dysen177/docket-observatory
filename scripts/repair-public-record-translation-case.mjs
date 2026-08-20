import { createHash } from 'node:crypto'
import { readFile, readdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { publicRecordTranslationValidationRules } from '../server/public-record-translation-glossary.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheRoot = path.join(projectRoot, 'server/cache/public-record-translations/en')
const rules = publicRecordTranslationValidationRules()
const appendedGlossaryTerms = [...new Set(rules.flatMap((rule) => rule.acceptedEnglish))]
  .sort((left, right) => right.length - left.length)
const appendedGlossaryPattern = new RegExp(`(?:\\s*\\[(?:${appendedGlossaryTerms.map(escapeRegExp).join('|')})\\])+$`, 'iu')
const properNames = [
  ['united states', 'United States'],
  ['new york', 'New York'],
  ['chinese communist party', 'Chinese Communist Party'],
  ['chinese', 'Chinese'],
  ['china', 'China'],
  ['american', 'American'],
  ['america', 'America'],
  ['european', 'European'],
  ['europe', 'Europe'],
  ['russia', 'Russia'],
  ['ukraine', 'Ukraine'],
  ['taiwan', 'Taiwan'],
  ['hong kong', 'Hong Kong'],
  ['washington', 'Washington'],
  ['blackstone', 'Blackstone'],
  ['silvergate', 'Silvergate'],
  ['youtube', 'YouTube'],
  ['gettr', 'GETTR'],
  ['rumble', 'Rumble'],
  ['cpac', 'CPAC'],
  ['nfsc', 'NFSC'],
  ['fbi', 'FBI'],
  ['cia', 'CIA'],
  ['doj', 'DOJ'],
  ['sec', 'SEC'],
  ['svb', 'SVB'],
  ['gtv', 'GTV'],
  ['gnews', 'GNews'],
  ['h coin', 'H-Coin'],
  ['h dollar', 'H-Dollar'],
  ['yang jiechi', 'Yang Jiechi'],
  ['wang qishan', 'Wang Qishan'],
  ['winston churchill', 'Winston Churchill'],
]

let files = 0
let fields = 0
for await (const file of jsonFiles(cacheRoot)) {
  const record = await readJson(file)
  if (!record || !Array.isArray(record.segments)) continue
  const title = restoreCase(record.title)
  const segments = record.segments.map((segment) => ({ ...segment, text: restoreCase(segment.text) }))
  const body = segments.map((segment) => segment.text ?? '').join('\n')
  if (title === record.title && segments.every((segment, index) => segment.text === record.segments[index].text)) continue
  const { translationPostEdit: _translationPostEdit, ...rest } = record
  await writeJsonAtomic(file, {
    ...rest,
    title,
    segments,
    charCount: body.length,
    contentSha256: sha256(`${title}\n${body}`),
    translatedAt: new Date().toISOString(),
  })
  files += 1
}
console.log(JSON.stringify({ files, fields }, null, 2))

function restoreCase(value) {
  const original = String(value ?? '')
  let restored = original.replace(appendedGlossaryPattern, '').trim()
  restored = restored.replace(/\b[A-Za-z]*[a-z][A-Z][A-Za-z]*\b/gu, (token) => token.toLowerCase())
  for (const rule of rules) {
    const preferred = rule.acceptedEnglish[0]
    for (const accepted of rule.acceptedEnglish) restored = replaceInsensitive(restored, accepted, preferred)
  }
  for (const [source, target] of properNames) restored = replaceInsensitive(restored, source, target)
  restored = restored.replace(/(^|[.!?]\s+)([a-z])/gu, (_, prefix, character) => `${prefix}${character.toUpperCase()}`)
  restored = restored.replace(/^(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}(?:[-_ ]?\d+)?\s+)([a-z])/u, (_, prefix, character) => `${prefix}${character.toUpperCase()}`)
  if (restored !== original) fields += 1
  return restored
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function replaceInsensitive(value, source, target) {
  const escaped = String(source).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  return String(value).replace(new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'giu'), target)
}

async function* jsonFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) yield* jsonFiles(file)
    else if (entry.isFile() && entry.name.endsWith('.json') && !file.includes(`${path.sep}batches${path.sep}`)) yield file
  }
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

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}
