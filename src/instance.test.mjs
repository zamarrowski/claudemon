import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, expect, test } from 'vitest'

const sandbox = mkdtempSync(join(tmpdir(), 'claudemon-instance-'))

process.env.CLAUDEMON_HOME = sandbox

const { INSTANCE_STALE_MS } = await import('./constants.mjs')
const { INSTANCE_FILE, INSTANCE_LOCK_FILE, LOG_FILE } =
  await import('./paths.mjs')
const { claimInstance, readInstance, refreshInstance, releaseInstance } =
  await import('./instance.mjs')

beforeEach(() => {
  rmSync(INSTANCE_FILE, { force: true })
  rmSync(INSTANCE_LOCK_FILE, { force: true })
  rmSync(LOG_FILE, { force: true })
})

test('Should let the first window in and say who holds it', () => {
  const id = claimInstance()

  expect(id).toBeTruthy()
  expect(readInstance().id).toBe(id)
  expect(readInstance().pid).toBe(process.pid)
})

test('Should turn a second window away while the first one is still beating', () => {
  claimInstance()

  expect(claimInstance()).toBeNull()
})

test('Should let a window in once the one before it stopped beating', () => {
  const now = Date.now()

  writeFileSync(
    INSTANCE_FILE,
    JSON.stringify({
      v: 1,
      id: 'gone',
      pid: 999_999,
      at: now - INSTANCE_STALE_MS - 1,
    }),
  )

  expect(claimInstance(now), 'the window it left behind is dead').toBeTruthy()
})

test('Should keep the window it holds alive with every beat', () => {
  const now = Date.now()
  const id = claimInstance(now - INSTANCE_STALE_MS - 1)

  expect(
    claimInstance(now),
    'it went quiet long enough to lose it',
  ).toBeTruthy()

  refreshInstance(id, now)

  expect(readInstance().id).toBe(id)
  expect(claimInstance(now)).toBeNull()
})

test('Should give the window up on the way out, and only to whoever holds it', () => {
  const id = claimInstance()

  releaseInstance('someone-else')

  expect(readInstance().id, 'a stranger cannot close your window').toBe(id)

  releaseInstance(id)

  expect(readInstance()).toBeNull()
  expect(claimInstance(), 'and the next window walks in').toBeTruthy()
})

test('Should open the game anyway when the lock itself is stuck', () => {
  writeFileSync(INSTANCE_LOCK_FILE, '999999')

  expect(claimInstance(), 'a stuck lock is not a closed door').toBeTruthy()
  expect(readFileSync(LOG_FILE, 'utf8')).toMatch(/busy lock/)
})
