import { readFileSync, unlinkSync } from 'node:fs'
import { writeFileAtomic } from './atomicWrite.mjs'
import { INSTANCE_STALE_MS, INSTANCE_VERSION } from './constants.mjs'
import { withLock } from './lock.mjs'
import { logError } from './log.mjs'
import { INSTANCE_FILE, INSTANCE_LOCK_FILE } from './paths.mjs'
import {
  transformRequestWriteInstance,
  transformResponseInstance,
} from './transformers.mjs'

const readInstanceFile = () => {
  try {
    return JSON.parse(readFileSync(INSTANCE_FILE, 'utf8'))
  } catch {
    return null
  }
}

export const readInstance = () => transformResponseInstance(readInstanceFile())

export const instanceIsLive = (entry, now = Date.now()) => {
  if (typeof entry?.at !== 'number') return false

  return now - entry.at < INSTANCE_STALE_MS
}

const writeInstance = (id, now) => {
  try {
    writeFileAtomic(
      INSTANCE_FILE,
      JSON.stringify(
        transformRequestWriteInstance({
          v: INSTANCE_VERSION,
          id,
          pid: process.pid,
          at: now,
        }),
      ),
    )
  } catch (error) {
    logError('instance', error)
  }
}

const claim = (now) => {
  if (instanceIsLive(readInstance(), now)) return null

  const id = `${process.pid}-${now}`

  writeInstance(id, now)

  return id
}

export const claimInstance = (now = Date.now()) => {
  try {
    return withLock(INSTANCE_LOCK_FILE, () => claim(now))
  } catch (error) {
    logError('instance', error)

    return `${process.pid}-${now}`
  }
}

export const refreshInstance = (id, now = Date.now()) => writeInstance(id, now)

export const releaseInstance = (id) => {
  if (readInstance()?.id !== id) return

  try {
    unlinkSync(INSTANCE_FILE)
  } catch {}
}
