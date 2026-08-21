import { ghotTextArchivePaths, syncGhotTextArchive } from '../server/ghot-text-archive.js'

const { bundled } = ghotTextArchivePaths()
const archive = await syncGhotTextArchive({
  outputPath: bundled,
  forceAll: true,
  refreshRecentCourtCount: 0,
  concurrency: numberArgument('concurrency', 4, 1, 8),
  requestDelayMs: numberArgument('delay-ms', 80, 0, 2000),
  languages: ['zh', 'en'],
})

console.log(JSON.stringify({
  outputPath: bundled,
  fetchedAt: archive.fetchedAt,
  counts: archive.counts,
  sync: archive.sync,
}, null, 2))

function numberArgument(name, fallback, minimum, maximum) {
  const prefix = `--${name}=`
  const parsed = Number(process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length))
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : fallback
}
