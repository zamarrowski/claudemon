import {
  existsSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, expect, test } from 'vitest'
import { LOCK_STALE_MS } from './constants.mjs'
import { withLock } from './lock.mjs'

const sandbox = mkdtempSync(join(tmpdir(), 'claudemon-lock-'))
const lock = join(sandbox, 'pool.lock')

beforeEach(() => {
  rmSync(lock, { force: true })
})

test('Should run the work and hand the lock back for the next caller', () => {
  expect(withLock(lock, () => 'first')).toBe('first')
  expect(withLock(lock, () => 'second')).toBe('second')
  expect(existsSync(lock), 'the lock is gone once the work is done').toBe(false)
})

test('Should hand the lock back even when the work blows up', () => {
  expect(() =>
    withLock(lock, () => {
      throw new Error('nope')
    }),
  ).toThrow(/nope/)
  expect(existsSync(lock)).toBe(false)
})

test('Should refuse to run while another process is holding the lock', () => {
  writeFileSync(lock, '999999')

  expect(() => withLock(lock, () => 'never')).toThrow(/busy lock/)
  expect(existsSync(lock), 'and it leaves the holder its lock').toBe(true)
})

test('Should break a lock left behind by a process that died holding it', () => {
  const abandoned = (Date.now() - LOCK_STALE_MS - 1000) / 1000

  writeFileSync(lock, '999999')
  utimesSync(lock, abandoned, abandoned)

  expect(withLock(lock, () => 'taken over')).toBe('taken over')
  expect(existsSync(lock)).toBe(false)
})
