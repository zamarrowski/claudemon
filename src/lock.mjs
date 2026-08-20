import { mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  LOCK_ATTEMPTS,
  LOCK_BACKOFF_MS,
  LOCK_BUSY_MESSAGE,
  LOCK_STALE_MS,
} from './constants.mjs'
import { sleep } from './sleep.mjs'

const take = (path) => {
  try {
    writeFileSync(path, String(process.pid), { flag: 'wx' })

    return true
  } catch {
    return false
  }
}

const release = (path) => {
  try {
    unlinkSync(path)
  } catch {}
}

const heldFor = (path, now) => {
  try {
    return now - statSync(path).mtimeMs
  } catch {
    return 0
  }
}

const dropWhenStale = (path, now) => {
  if (heldFor(path, now) < LOCK_STALE_MS) return

  release(path)
}

export const withLock = (path, work) => {
  mkdirSync(dirname(path), { recursive: true })

  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt++) {
    if (take(path)) {
      try {
        return work()
      } finally {
        release(path)
      }
    }

    dropWhenStale(path, Date.now())
    sleep(LOCK_BACKOFF_MS)
  }

  throw new Error(`${LOCK_BUSY_MESSAGE} ${path}`)
}
