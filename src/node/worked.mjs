import { EMPTY_WORKED } from '../constants.mjs'
import {
  transformRequestWriteWorked,
  transformResponseWorked,
} from '../transformers.mjs'
import { readJson, writeJson } from './files.mjs'
import { WORKED_FILE } from './paths.mjs'

export const readWorked = () => {
  const worked = transformResponseWorked(readJson(WORKED_FILE))

  if (!worked) return { ...EMPTY_WORKED }

  return worked
}

const writeWorked = (worked) => {
  try {
    writeJson(WORKED_FILE, transformRequestWriteWorked(worked))
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
