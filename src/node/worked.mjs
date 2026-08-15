import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { EMPTY_WORKED } from './constants.mjs'
import {
  transformRequestWriteWorked,
  transformResponseWorked,
} from '../transformers.mjs'
import { HOME, WORKED_FILE } from './paths.mjs'

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
    mkdirSync(HOME, { recursive: true })

    const tmp = `${WORKED_FILE}.${process.pid}.tmp`

    writeFileSync(tmp, JSON.stringify(transformRequestWriteWorked(worked)))
    renameSync(tmp, WORKED_FILE)
  } catch {}

  return worked
}

export const accrueWorked = (elapsedMs, now) => {
  const worked = readWorked()

  if (elapsedMs <= 0) return worked

  return writeWorked({
    totalMs: worked.totalMs + elapsedMs,
    updatedAt: new Date(now).toISOString(),
  })
}
