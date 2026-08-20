import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, expect, test } from 'vitest'

process.env.CLAUDEMON_HOME = mkdtempSync(join(tmpdir(), 'claudemon-worked-'))

const { LOG_FILE, WORKED_FILE } = await import('./paths.mjs')
const { accrueWorked, readWorked, workedHours } = await import('./worked.mjs')

beforeEach(() => {
  writeFileSync(
    WORKED_FILE,
    JSON.stringify({ totalMs: 0, creditedTo: 0, updatedAt: null }),
  )
})

test('Should report nothing worked before any hook has run', () => {
  writeFileSync(WORKED_FILE, 'not json at all')

  expect(readWorked()).toEqual({ totalMs: 0, creditedTo: 0, updatedAt: null })
  expect(workedHours({ totalMs: 5_400_000 })).toBe(1)
})

test('Should bank a stretch of work and remember how far it has credited', () => {
  const now = Date.now()
  const worked = accrueWorked({ from: now - 60_000, to: now })

  expect(worked.totalMs).toBe(60_000)
  expect(worked.creditedTo).toBe(now)
  expect(worked.updatedAt).toBe(new Date(now).toISOString())
  expect(readWorked()).toEqual(worked)
})

test('Should bank nothing when there is no working stretch to bank', () => {
  const now = Date.now()

  accrueWorked({ from: now - 60_000, to: now })

  expect(accrueWorked(null), 'an idle session hands over no interval').toEqual({
    totalMs: 60_000,
    creditedTo: now,
    updatedAt: new Date(now).toISOString(),
  })
})

test('Should credit two sessions working at once with wall clock, not with the sum', () => {
  const now = Date.now()

  accrueWorked({ from: now - 60_000, to: now })
  const worked = accrueWorked({ from: now - 60_000, to: now })

  expect(
    worked.totalMs,
    'the same minute worked twice over is still one minute',
  ).toBe(60_000)

  const later = accrueWorked({ from: now - 30_000, to: now + 30_000 })

  expect(
    later.totalMs,
    'and the half minute past the watermark is the only part that counts',
  ).toBe(90_000)
})

test('Should keep the total when a stretch is already covered by an earlier one', () => {
  const now = Date.now()

  accrueWorked({ from: now - 60_000, to: now })

  expect(accrueWorked({ from: now - 90_000, to: now - 30_000 }).totalMs).toBe(
    60_000,
  )
})

test('Should write down a total it could not save rather than lose it in silence', () => {
  const now = Date.now()

  rmSync(WORKED_FILE, { force: true })
  rmSync(LOG_FILE, { force: true })
  mkdirSync(WORKED_FILE)

  expect(() => accrueWorked({ from: now - 60_000, to: now })).not.toThrow()
  expect(readFileSync(LOG_FILE, 'utf8')).toMatch(/worked/)

  rmSync(WORKED_FILE, { recursive: true, force: true })
})
