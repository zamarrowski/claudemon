import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { LOG_FILE } from './paths.mjs'

const append = (line) => {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true })
    appendFileSync(LOG_FILE, `${new Date().toISOString()} ${line}\n`)
  } catch {}
}

const describeError = (error) => {
  if (error?.stack) return error.stack

  return String(error)
}

export const logError = (where, error) => {
  append(`${where} ${describeError(error)}`)
}

export const logNote = (where, message) => append(`${where} ${message}`)
