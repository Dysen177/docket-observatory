import { readFile } from 'node:fs/promises'
import path from 'node:path'

const outputRoot = path.resolve('output')
const pidState = await readJson(path.join(outputRoot, 'public-record-translation.pid.json'))
const progress = await readJson(path.join(outputRoot, 'public-record-translation-progress.json'))
const running = Boolean(pidState?.pid && processIsAlive(pidState.pid))

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ running, process: pidState, progress }, null, 2))
  process.exit(0)
}

if (!progress) {
  console.log(running ? '翻译进程已启动，正在初始化进度。' : '当前没有运行中的全量翻译任务。')
  process.exit(0)
}

const statusLabels = {
  running: '正在翻译',
  pass_complete: '本轮完成',
  pass_complete_with_failures: '本轮完成，正在准备重试失败记录',
  complete: '全部完成',
}
console.log(`运行状态：${running ? '后台运行中' : '当前未运行'} / ${statusLabels[progress.status] ?? progress.status}`)
console.log(`模型：${progress.model ?? pidState?.model ?? '未知'}`)
console.log(`记录进度：${formatNumber(progress.completedRecords)} / ${formatNumber(progress.totalRecords)}（剩余 ${formatNumber(progress.remainingRecords)}）`)
console.log(`字符进度：${formatNumber(progress.completedSourceCharacters)} / ${formatNumber(progress.totalSourceCharacters)}（${Number(progress.progressPercent ?? 0).toFixed(2)}%）`)
console.log(`当前记录：${progress.currentRecordId ?? '等待下一项'}`)
if (progress.currentBatch && progress.currentBatchCount) {
  console.log(`当前记录批次：${progress.currentBatch} / ${progress.currentBatchCount}（${progress.currentBatchState ?? '处理中'}）`)
}
if (progress.currentGeneratedCharacters) console.log(`当前已生成：${formatNumber(progress.currentGeneratedCharacters)} 个英文字符`)
console.log(`本轮失败：${formatNumber(progress.failedRecordsThisPass)}`)
console.log(`实测速度：${progress.sourceCharactersPerHour ? `${formatNumber(progress.sourceCharactersPerHour)} 个源字符/小时` : '样本不足，尚未计算'}`)
console.log(`预计剩余：${formatDuration(progress.estimatedRemainingSeconds)}`)
console.log(`最后更新：${formatDate(progress.updatedAt)}`)
if (progress.lastError) console.log(`最近错误：${progress.lastError}`)

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value ?? 0))
}

function formatDuration(value) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return '样本不足，尚未计算'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor(seconds % 86400 / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  return [days ? `${days} 天` : '', hours ? `${hours} 小时` : '', minutes ? `${minutes} 分钟` : ''].filter(Boolean).join(' ') || '不足 1 分钟'
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value ?? '') : date.toLocaleString('zh-CN', { hour12: false })
}

function processIsAlive(pid) {
  try {
    process.kill(Number(pid), 0)
    return true
  } catch {
    return false
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}
