import { readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { writeFileAtomic } from './atomicWrite.mjs'
import {
  ACTIVITY_PRIORITY,
  ACTIVITY_STATES,
  ACTIVITY_VERSION,
  PRUNE_MS,
  STALE_MS,
  WAITING_MESSAGE_LIMIT,
  WORKING_STALE_MS,
} from './constants.mjs'
import { logError } from './log.mjs'
import { SESSIONS_DIR, sessionFile } from './paths.mjs'
import {
  transformRequestWriteActivity,
  transformResponseActivity,
} from './transformers.mjs'

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
    writeFileAtomic(
      sessionFile(entry.session),
      JSON.stringify(transformRequestWriteActivity(entry)),
    )
  } catch (error) {
    logError('activity', error)
  }

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

const emptyCounts = () => {
  return { working: 0, waiting: 0, idle: 0 }
}

const unknownActivity = () => {
  return {
    state: 'unknown',
    tool: null,
    since: null,
    counts: emptyCounts(),
  }
}

const sinceOf = (entry, fallback) => {
  if (typeof entry.since === 'number') return entry.since

  return fallback
}

const settledState = (entry, now) => {
  if (entry.state !== 'working') return entry.state
  if (now - entry.at < WORKING_STALE_MS) return 'working'

  return 'idle'
}

const countStates = (live, now) => {
  const counts = emptyCounts()

  for (const entry of live) {
    const state = settledState(entry, now)

    if (ACTIVITY_STATES.includes(state)) counts[state]++
  }

  return counts
}

const leaderOf = (live, state, now) => {
  const matching = live.filter((entry) => settledState(entry, now) === state)

  return matching.reduce((best, entry) => (entry.at > best.at ? entry : best))
}

export const summariseActivity = (sessions, now = Date.now()) => {
  const live = sessions.filter((entry) => now - entry.at < STALE_MS)

  if (live.length === 0) return unknownActivity()

  const counts = countStates(live, now)

  for (const state of ACTIVITY_PRIORITY) {
    if (counts[state] === 0) continue

    const leader = leaderOf(live, state, now)

    return {
      state,
      tool: leader.tool ?? null,
      since: sinceOf(leader, leader.at),
      counts,
    }
  }

  return unknownActivity()
}

export const isWorking = (activity) => activity?.counts?.working > 0

export const workingInterval = (entry, now) => {
  if (entry?.state !== 'working') return null

  const elapsed = now - entry.at

  if (elapsed <= 0 || elapsed >= WORKING_STALE_MS) return null

  return { from: entry.at, to: now }
}

const resolveCwd = (cwd, previous) => cwd ?? previous?.cwd ?? null

const resolveSince = (previous, continuing, at) => {
  if (!continuing) return at

  return sinceOf(previous, at)
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
    pendingSteps,
  })
}

export const noteTool = (sessionId, cwd, tool, { pendingSteps } = {}) => {
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
    pendingSteps: previous?.pendingSteps ?? 0,
    message: truncateMessage(message),
  })
}

export const endTurn = (sessionId, cwd, { pendingSteps } = {}) => {
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
    pendingSteps: pendingSteps ?? 0,
  })
}

export const endSession = (sessionId) => clearActivity(sessionId)
