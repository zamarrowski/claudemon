import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { beforeEach, expect, test } from 'vitest'

const sandbox = mkdtempSync(join(tmpdir(), 'claudemon-steps-'))

process.env.CLAUDEMON_HOME = sandbox

const { STEP_POOL_LIMIT } = await import('./constants.mjs')
const { LOG_FILE, STEPS_FILE, STEPS_LOCK_FILE } = await import('./paths.mjs')
const { drawSteps, earnSteps, readSteps } = await import('./steps.mjs')

const CONFIG = { workStepSeconds: 20, maxSteps: 4 }

const run = promisify(execFile)

const moduleUrl = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), 'steps.mjs'),
).href

const bankInAnotherProcess = (steps) => {
  return run(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `const { earnSteps } = await import(${JSON.stringify(moduleUrl)})
       earnSteps({
         interval: null,
         pending: ${steps},
         config: ${JSON.stringify(CONFIG)},
       })`,
    ],
    { env: { ...process.env, CLAUDEMON_HOME: sandbox } },
  )
}

beforeEach(() => {
  rmSync(STEPS_FILE, { force: true })
  rmSync(STEPS_LOCK_FILE, { force: true })
  rmSync(LOG_FILE, { force: true })
})

test('Should hold no steps before any session has walked', () => {
  expect(readSteps()).toEqual({ steps: 0, carriedMs: 0, creditedTo: 0 })
})

test('Should bank a step for every interval a working session reports', () => {
  const now = Date.now()
  const pool = earnSteps({
    interval: { from: now - 60_000, to: now },
    pending: 0,
    config: CONFIG,
  })

  expect(pool.steps, 'a minute of work at twenty seconds a step').toBe(3)
  expect(readSteps().steps).toBe(3)
})

test('Should walk two sessions working the same minute one minute, not two', () => {
  const now = Date.now()
  const interval = { from: now - 60_000, to: now }

  earnSteps({ interval, pending: 0, config: CONFIG })

  expect(
    earnSteps({ interval, pending: 0, config: CONFIG }).steps,
    'the second session covers ground the first already walked',
  ).toBe(3)
  expect(
    earnSteps({
      interval: { from: now - 60_000, to: now + 20_000 },
      pending: 0,
      config: CONFIG,
    }).steps,
    'and only the stretch past the step clock is new ground',
  ).toBe(4)
  expect(readSteps().creditedTo).toBe(now + 20_000)
})

test('Should leave the part of an interval that is not a whole step yet on the clock', () => {
  const now = Date.now()

  expect(
    earnSteps({
      interval: { from: now - 50_000, to: now },
      pending: 0,
      config: CONFIG,
    }).steps,
  ).toBe(2)
  expect(
    earnSteps({
      interval: { from: now, to: now + 10_000 },
      pending: 0,
      config: CONFIG,
    }).steps,
    'the leftover ten seconds finish a step',
  ).toBe(3)
})

test('Should bank the steps a prompt bought into the same pool', () => {
  expect(earnSteps({ interval: null, pending: 2, config: CONFIG }).steps).toBe(
    2,
  )
  expect(
    earnSteps({ interval: null, pending: 0, config: CONFIG }).steps,
    'and nothing to bank leaves the pool alone',
  ).toBe(2)
})

test('Should stop banking once the pool is as full as it gets', () => {
  const now = Date.now()

  earnSteps({
    interval: { from: now - 24 * 60 * 60_000, to: now },
    pending: 0,
    config: CONFIG,
  })

  expect(readSteps().steps).toBe(STEP_POOL_LIMIT)
})

test('Should hand out no more steps than it was asked for, or than it holds', () => {
  earnSteps({ interval: null, pending: 6, config: CONFIG })

  expect(drawSteps(4)).toBe(4)
  expect(readSteps().steps, 'the rest stays banked').toBe(2)
  expect(drawSteps(4), 'and what is left is all it can give').toBe(2)
  expect(drawSteps(4), 'an empty pool hands out nothing').toBe(0)
})

test('Should lose no steps when several sessions bank at the same moment', async () => {
  const bankers = []

  for (let session = 0; session < 8; session++)
    bankers.push(bankInAnotherProcess(3))

  await Promise.all(bankers)

  expect(readSteps().steps, 'eight hooks at once, every step banked').toBe(24)
})

test('Should hand the steps back and write it down when the pool stays locked', () => {
  earnSteps({ interval: null, pending: 5, config: CONFIG })

  writeFileSync(STEPS_LOCK_FILE, '999999')

  expect(
    earnSteps({ interval: null, pending: 3, config: CONFIG }),
    'the caller keeps the steps to bank next time',
  ).toBeNull()
  expect(drawSteps(4), 'and nothing comes out of a pool it cannot open').toBe(0)
  expect(readSteps().steps, 'the pool is untouched').toBe(5)
  expect(
    readFileSync(LOG_FILE, 'utf8'),
    'a lost write is written down, not swallowed',
  ).toMatch(/busy lock/)
})
