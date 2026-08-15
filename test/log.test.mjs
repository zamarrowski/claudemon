import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, vi } from 'vitest'

process.env.CLAUDEMON_HOME = mkdtempSync(join(tmpdir(), 'claudemon-log-'))

const { LOG_FILE } = await import('../src/node/paths.mjs')
const { logError, logNote } = await import('../src/node/log.mjs')

const readLog = () => {
  try {
    return readFileSync(LOG_FILE, 'utf8')
  } catch {
    return ''
  }
}

test('Should write a note with the moment it happened in front of it', () => {
  logNote('somewhere', 'a thing happened')

  expect(readLog().trim()).toMatch(
    /^\d{4}-\d{2}-\d{2}T[\d:.]+Z somewhere a thing happened$/,
  )
})

test('Should write an error with its stack, not just its name', () => {
  const before = readLog().length

  logError('while doing', new Error('it broke'))

  const written = readLog().slice(before)

  expect(written).toMatch(/while doing/)
  expect(written).toMatch(/it broke/)
  expect(written, 'the stack is the point of logging an error').toMatch(/at /)
})

test('Should write down something thrown that is not an error, even when it was nothing at all', () => {
  const before = readLog().length

  logError('while doing', 'a bare string')
  logError('while doing', null)
  logError('while doing', undefined)

  const written = readLog().slice(before)

  expect(written).toMatch(/while doing a bare string/)
  expect(written, 'a thrown nothing still leaves a line').toMatch(
    /while doing null/,
  )
  expect(written).toMatch(/while doing undefined/)
})

test('Should pile lines up rather than replacing each other', () => {
  const before = readLog().split('\n').length

  logNote('a', 'one')
  logNote('b', 'two')

  expect(readLog().split('\n').length).toBe(before + 2)
})

test('Should swallow a log that cannot be written rather than throwing', async () => {
  const home = process.env.CLAUDEMON_HOME
  const blocked = join(
    mkdtempSync(join(tmpdir(), 'claudemon-log-blocked-')),
    'a-file-not-a-directory',
  )

  writeFileSync(blocked, '')
  process.env.CLAUDEMON_HOME = blocked

  vi.resetModules()

  const fresh = await import('../src/node/log.mjs')

  expect(() => fresh.logNote('somewhere', 'into a wall')).not.toThrow()
  expect(() => fresh.logError('somewhere', new Error('unheard'))).not.toThrow()
  expect(readLog(), 'and nothing reaches the real log either').not.toMatch(
    /into a wall/,
  )

  process.env.CLAUDEMON_HOME = home
})
