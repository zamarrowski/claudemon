import { readFileSync, writeFileSync } from 'node:fs'
import { writeAtomic } from './files.mjs'
import { QUEUE_FILE } from './paths.mjs'
import { trainerClass } from '../trainer.mjs'
import {
  transformRequestWriteEncounter,
  transformResponseEncounter,
} from '../transformers.mjs'

const parseLines = (contents) => {
  const entries = []

  for (const line of contents.split('\n')) {
    const trimmed = line.trim()

    if (trimmed === '') continue

    try {
      const entry = transformResponseEncounter(JSON.parse(trimmed))

      if (entry) entries.push(entry)
    } catch {}
  }

  return entries
}

export const peekQueue = () => {
  try {
    return parseLines(readFileSync(QUEUE_FILE, 'utf8'))
  } catch {
    return []
  }
}

const stampOf = (entry) => {
  const at = Date.parse(entry.at)

  if (Number.isNaN(at)) return null

  return at
}

const isLive = (entry, ttlMs, now) => {
  const at = stampOf(entry)

  return at != null && now - at < ttlMs
}

export const encounterExpiresAt = (entry, ttlMs) => {
  const at = stampOf(entry)

  if (at == null) return null

  return at + ttlMs
}

const isUsable = (entry) => {
  if (entry.kind === 'trainer') {
    if (!trainerClass(entry.trainer.class)) return false

    return entry.trainer.team.length > 0
  }

  return entry.species != null && entry.name != null
}

export const readEncounter = (ttlMs, now = Date.now()) => {
  const live = peekQueue().filter(
    (entry) => isLive(entry, ttlMs, now) && isUsable(entry),
  )

  if (live.length === 0) return null

  return live[live.length - 1]
}

export const writeEncounter = (entry) => {
  const stamped = transformRequestWriteEncounter({
    v: entry.v,
    kind: entry.kind,
    species: entry.species,
    name: entry.name,
    level: entry.level,
    trainer: entry.trainer,
    seed: entry.seed,
    shiny: entry.shiny,
    session: entry.session,
    at: entry.at ?? new Date().toISOString(),
  })

  writeAtomic(QUEUE_FILE, `${JSON.stringify(stamped)}\n`)

  return stamped
}

export const offerEncounter = (entry, ttlMs, now = Date.now()) => {
  if (readEncounter(ttlMs, now)) return false

  writeEncounter(entry)

  return true
}

export const clearEncounter = () => {
  try {
    writeFileSync(QUEUE_FILE, '')
  } catch {}
}
