import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname } from 'node:path'

export const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

export const writeAtomic = (path, contents) => {
  mkdirSync(dirname(path), { recursive: true })

  const tmp = `${path}.${process.pid}.tmp`

  try {
    writeFileSync(tmp, contents)
    renameSync(tmp, path)
  } catch (error) {
    try {
      unlinkSync(tmp)
    } catch {}

    throw error
  }

  return path
}

export const writeJson = (path, payload) => {
  return writeAtomic(path, JSON.stringify(payload))
}
