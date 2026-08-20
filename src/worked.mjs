import { readFileSync } from 'node:fs'
import { writeFileAtomic } from './atomicWrite.mjs'
import { EMPTY_WORKED, HOUR_MS } from './constants.mjs'
import { logError } from './log.mjs'
import { WORKED_FILE } from './paths.mjs'
import {
  transformRequestWriteWorked,
  transformResponseWorked,
} from './transformers.mjs'

const readWorkedFile = () => {
  try {
    return JSON.parse(readFileSync(WORKED_FILE, 'utf8'))
  } catch {
    return null
  }
}

export const readWorked = () => {
  const worked = transformResponseWorked(readWorkedFile())

  if (!worked) return { ...EMPTY_WORKED }

  return worked
}

const writeWorked = (worked) => {
  try {
    writeFileAtomic(
      WORKED_FILE,
      JSON.stringify(transformRequestWriteWorked(worked)),
    )
  } catch (error) {
    logError('worked', error)
  }

  return worked
}

export const workedHours = (worked) => Math.floor(worked.totalMs / HOUR_MS)

export const accrueWorked = (interval) => {
  const worked = readWorked()

  if (!interval) return worked

  const gained = interval.to - Math.max(interval.from, worked.creditedTo)

  if (gained <= 0) return worked

  return writeWorked({
    totalMs: worked.totalMs + gained,
    creditedTo: interval.to,
    updatedAt: new Date(interval.to).toISOString(),
  })
}
