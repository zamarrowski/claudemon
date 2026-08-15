import { HOUR_MS, STALE_MS } from './constants.mjs'

export const workedHours = (worked) => Math.floor(worked.totalMs / HOUR_MS)

export const workedSince = (previous, now) => {
  if (previous?.state !== 'working') return 0

  const elapsed = now - previous.at

  if (elapsed <= 0 || elapsed >= STALE_MS) return 0

  return elapsed
}
