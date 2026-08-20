import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, expect, test, vi } from 'vitest'

const replace = vi.hoisted(() => ({ failures: 0, code: 'EPERM' }))

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs')

  const renameSync = (from, to) => {
    if (replace.failures === 0) return actual.renameSync(from, to)

    replace.failures--

    const error = new Error('the file is held open elsewhere')

    error.code = replace.code

    throw error
  }

  return { ...actual, renameSync }
})

const { REPLACE_ATTEMPTS } = await import('./constants.mjs')
const { writeFileAtomic } = await import('./atomicWrite.mjs')

const sandbox = mkdtempSync(join(tmpdir(), 'claudemon-write-'))
const target = join(sandbox, 'nested', 'pool.json')

beforeEach(() => {
  replace.failures = 0
  replace.code = 'EPERM'
})

const leftovers = () => {
  return readdirSync(join(sandbox, 'nested')).filter((name) =>
    name.endsWith('.tmp'),
  )
}

test('Should write the file, making the folder it lives in, and replace it in place', () => {
  writeFileAtomic(target, '{"steps":1}')
  writeFileAtomic(target, '{"steps":2}')

  expect(readFileSync(target, 'utf8')).toBe('{"steps":2}')
  expect(leftovers(), 'and leave no temp file behind').toEqual([])
})

test('Should keep trying while another process still holds the file open', () => {
  writeFileAtomic(target, '{"steps":1}')

  replace.failures = REPLACE_ATTEMPTS - 1

  writeFileAtomic(target, '{"steps":3}')

  expect(readFileSync(target, 'utf8'), 'the write lands').toBe('{"steps":3}')
  expect(leftovers()).toEqual([])
})

test('Should surface a replace that never clears instead of losing the write quietly', () => {
  writeFileAtomic(target, '{"steps":1}')

  replace.failures = REPLACE_ATTEMPTS

  expect(() => writeFileAtomic(target, '{"steps":9}')).toThrow(/held open/)
  expect(readFileSync(target, 'utf8'), 'the old file is still there').toBe(
    '{"steps":1}',
  )
  expect(leftovers(), 'and no temp file is left to rot').toEqual([])
})

test('Should give up at once on a failure that waiting cannot fix', () => {
  writeFileSync(target, '{"steps":1}')

  replace.failures = 1
  replace.code = 'ENOENT'

  expect(() => writeFileAtomic(target, '{"steps":9}')).toThrow(/held open/)
  expect(replace.failures, 'it did not retry').toBe(0)
})
