import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { STALE_MS } from '../constants.mjs'
import {
  ACTIVITY_VERSION,
  PRUNE_MS,
  WAITING_MESSAGE_LIMIT,
} from './constants.mjs'
import { sinceOf } from '../activity.mjs'
import {
  transformRequestWriteActivity,
  transformResponseActivity,
} from '../transformers.mjs'
import { SESSIONS_DIR, sessionFile } from './paths.mjs'

const parseEntryFile = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

const readEntry = (path) => {
  const entry = transformResponseActivity(parseEntryFile(path))

  if (typeof entry?.at !== 'number') return null

  return entry
}

export const readActivity = (sessionId) => readEntry(sessionFile(sessionId))

export const writeActivity = (entry) => {
  try {
    mkdirSync(SESSIONS_DIR, { recursive: true })

    const path = sessionFile(entry.session)
    const tmp = `${path}.${process.pid}.tmp`

    writeFileSync(tmp, JSON.stringify(transformRequestWriteActivity(entry)))
    renameSync(tmp, path)
  } catch {}

  return entry
}

export const clearActivity = (sessionId) => {
  try {
    unlinkSync(sessionFile(sessionId))
  } catch {}
}

export const readSessions = (now = Date.now()) => {
  let names

  try {
    names = readdirSync(SESSIONS_DIR)
  } catch {
    return []
  }

  const sessions = []

  for (const name of names) {
    if (!name.endsWith('.json')) continue

    const entry = readEntry(join(SESSIONS_DIR, name))

    if (entry && now - entry.at < STALE_MS) sessions.push(entry)
  }

  return sessions.sort((a, b) => b.at - a.at)
}

export const pruneSessions = (now = Date.now()) => {
  let names

  try {
    names = readdirSync(SESSIONS_DIR)
  } catch {
    return 0
  }

  let removed = 0

  for (const name of names) {
    if (!name.endsWith('.json')) continue

    const path = join(SESSIONS_DIR, name)
    const entry = readEntry(path)

    if (entry && now - entry.at < PRUNE_MS) continue

    try {
      unlinkSync(path)
      removed++
    } catch {}
  }

  return removed
}

const resolveCwd = (cwd, previous) => cwd ?? previous?.cwd ?? null

const resolveSince = (previous, continuing, at) => {
  if (!continuing) return at

  return sinceOf(previous, at)
}

const resolveLastStepAt = (lastStepAt, previous, continuing, at) => {
  if (lastStepAt != null) return lastStepAt
  if (!continuing) return at

  return previous.lastStepAt ?? at
}

const resolvePendingSteps = (pendingSteps, previous) => {
  if (pendingSteps != null) return pendingSteps

  return previous?.pendingSteps ?? 0
}

const truncateMessage = (message) => {
  if (typeof message !== 'string') return null

  return message.slice(0, WAITING_MESSAGE_LIMIT)
}

export const beginTurn = (sessionId, cwd, { pendingSteps = 0 } = {}) => {
  const previous = readActivity(sessionId)
  const at = Date.now()

  return writeActivity({
    v: ACTIVITY_VERSION,
    session: sessionId,
    cwd: resolveCwd(cwd, previous),
    at,
    state: 'working',
    tool: null,
    since: at,
    lastStepAt: at,
    pendingSteps,
  })
}

export const noteTool = (
  sessionId,
  cwd,
  tool,
  { lastStepAt, pendingSteps } = {},
) => {
  const previous = readActivity(sessionId)
  const at = Date.now()
  const working = previous?.state === 'working'

  return writeActivity({
    v: ACTIVITY_VERSION,
    session: sessionId,
    cwd: resolveCwd(cwd, previous),
    at,
    state: 'working',
    tool: tool ?? null,
    since: resolveSince(previous, working, at),
    lastStepAt: resolveLastStepAt(lastStepAt, previous, working, at),
    pendingSteps: resolvePendingSteps(pendingSteps, previous),
  })
}

export const noteWaiting = (sessionId, cwd, message) => {
  const previous = readActivity(sessionId)
  const at = Date.now()
  const already = previous?.state === 'waiting'

  return writeActivity({
    v: ACTIVITY_VERSION,
    session: sessionId,
    cwd: resolveCwd(cwd, previous),
    at,
    state: 'waiting',
    tool: previous?.tool ?? null,
    since: resolveSince(previous, already, at),
    lastStepAt: previous?.lastStepAt ?? at,
    pendingSteps: previous?.pendingSteps ?? 0,
    message: truncateMessage(message),
  })
}

export const endTurn = (sessionId, cwd, { lastStepAt } = {}) => {
  const previous = readActivity(sessionId)
  const at = Date.now()

  return writeActivity({
    v: ACTIVITY_VERSION,
    session: sessionId,
    cwd: resolveCwd(cwd, previous),
    at,
    state: 'idle',
    tool: null,
    since: at,
    lastStepAt: lastStepAt ?? at,
    pendingSteps: 0,
  })
}

export const endSession = (sessionId) => clearActivity(sessionId)
