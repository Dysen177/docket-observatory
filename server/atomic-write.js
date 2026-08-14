import { chmod, mkdir, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

export async function atomicWriteJson(filePath, payload, options = {}) {
  return atomicWriteText(filePath, JSON.stringify(payload, null, 2), options)
}

export async function atomicWriteText(filePath, payload, options = {}) {
  const mode = options.mode ?? 0o600
  const directory = path.dirname(filePath)
  await mkdir(directory, { recursive: true, mode: options.directoryMode })
  if (options.directoryMode != null) {
    try {
      await chmod(directory, options.directoryMode)
    } catch {
      // Some filesystems do not implement POSIX modes.
    }
  }
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.part`
  await writeFile(temporaryPath, String(payload), { mode })
  await rename(temporaryPath, filePath)
  try {
    await chmod(filePath, mode)
  } catch {
    // Some filesystems do not implement POSIX modes.
  }
}
