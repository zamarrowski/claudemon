import { ACTIVITY_PRIORITY, STALE_MS, UNKNOWN_ACTIVITY } from './constants.mjs'

const unknownActivity = () => ({ ...UNKNOWN_ACTIVITY })

export const sinceOf = (entry, fallback) => {
  if (typeof entry.since === 'number') return entry.since

  return fallback
}

export const summariseActivity = (sessions, now = Date.now()) => {
  const live = sessions.filter((entry) => now - entry.at < STALE_MS)

  if (live.length === 0) return unknownActivity()

  for (const state of ACTIVITY_PRIORITY) {
    const matching = live.filter((entry) => entry.state === state)

    if (matching.length === 0) continue

    const leader = matching.reduce((best, entry) =>
      entry.at > best.at ? entry : best,
    )

    return {
      state,
      tool: leader.tool ?? null,
      since: sinceOf(leader, leader.at),
      sessions: matching.length,
    }
  }

  return unknownActivity()
}

export const isWorking = (activity) => activity?.state === 'working'
