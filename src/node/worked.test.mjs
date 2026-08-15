import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, expect, test } from 'vitest'

process.env.CLAUDEMON_HOME = mkdtempSync(join(tmpdir(), 'claudemon-worked-'))

const { STALE_MS } = await import('../constants.mjs')
const { WORKED_FILE } = await import('./paths.mjs')
const { workedSince } = await import('../worked.mjs')
const { accrueWorked, readWorked } = await import('./worked.mjs')

beforeEach(() => {
  writeFileSync(WORKED_FILE, JSON.stringify({ totalMs: 0, updatedAt: null }))
})

test('Should report nothing worked before any hook has run', () => {
  writeFileSync(WORKED_FILE, 'not json at all')

  expect(readWorked()).toEqual({ totalMs: 0, updatedAt: null })
})

test('Should count the time since the last event while Claude was working', () => {
  const now = Date.now()

  expect(workedSince({ state: 'working', at: now - 4000 }, now)).toBe(4000)
})

test('Should count nothing while Claude was idle, waiting or unheard of', () => {
  const now = Date.now()

  expect(workedSince({ state: 'idle', at: now - 4000 }, now)).toBe(0)
  expect(workedSince({ state: 'waiting', at: now - 4000 }, now)).toBe(0)
  expect(workedSince(null, now)).toBe(0)
})

test('Should count nothing across a gap longer than a session stays live', () => {
  const now = Date.now()

  expect(workedSince({ state: 'working', at: now - STALE_MS }, now)).toBe(0)
})

test('Should add each stretch of work to the running total', () => {
  const now = Date.now()

  accrueWorked(4000, now)
  const worked = accrueWorked(6000, now + 6000)

  expect(worked.totalMs).toBe(10_000)
  expect(worked.updatedAt).toBe(new Date(now + 6000).toISOString())
  expect(readWorked()).toEqual(worked)
})

test('Should leave the total untouched when no time was worked', () => {
  const now = Date.now()

  accrueWorked(4000, now)

  expect(accrueWorked(0, now + 1000)).toEqual({
    totalMs: 4000,
    updatedAt: new Date(now).toISOString(),
  })
})
