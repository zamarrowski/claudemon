import { mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  REPLACE_ATTEMPTS,
  REPLACE_BACKOFF_MS,
  REPLACE_RETRY_CODES,
} from './constants.mjs'
import { sleep } from './sleep.mjs'

const discard = (path) => {
  try {
    unlinkSync(path)
  } catch {}
}

const replaceFile = (tmp, path) => {
  for (let attempt = 1; attempt < REPLACE_ATTEMPTS; attempt++) {
    try {
      renameSync(tmp, path)

      return
    } catch (error) {
      if (!REPLACE_RETRY_CODES.includes(error.code)) throw error

      sleep(REPLACE_BACKOFF_MS)
    }
  }

  renameSync(tmp, path)
}

export const writeFileAtomic = (path, contents) => {
  mkdirSync(dirname(path), { recursive: true })

  const tmp = `${path}.${process.pid}.tmp`

  try {
    writeFileSync(tmp, contents)
    replaceFile(tmp, path)
  } catch (error) {
    discard(tmp)

    throw error
  }
}
