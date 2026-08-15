import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

process.env.CLAUDEMON_HOME = mkdtempSync(join(tmpdir(), 'claudemon-status-'))

const { HOME, STATUS_FILE } = await import('../src/node/paths.mjs')
const { companionIsLive, readStatus, writeStatus } =
  await import('../src/node/status.mjs')

const clearStatus = () => {
  try {
    rmSync(STATUS_FILE)
  } catch {}
}

test('Should read no status file yet as nothing rather than crashing', () => {
  clearStatus()

  expect(readStatus()).toBeNull()
})

test('Should read a half-written status as nothing too', () => {
  writeFileSync(STATUS_FILE, '{"session":')

  expect(readStatus(), 'a torn file is not worth throwing over').toBeNull()
})

test('Should read back what was written, stamped with the moment it went out', () => {
  clearStatus()

  const before = Date.now()

  writeStatus({
    lead: { name: 'Charmander', level: 7 },
    balls: 5,
    money: 3000,
    caught: 2,
  })

  const after = Date.now()
  const read = readStatus()

  expect(read.lead).toEqual({ name: 'Charmander', level: 7 })
  expect(read.balls).toBe(5)
  expect(read.money).toBe(3000)
  expect(read.caught).toBe(2)
  expect(
    read.heartbeat,
    'the heartbeat is stamped on the way out, not by the caller',
  ).toBeGreaterThanOrEqual(before)
  expect(read.heartbeat).toBeLessThanOrEqual(after)
  expect(
    companionIsLive(read),
    'a status just written is live by its own reckoning',
  ).toBe(true)
})

test('Should let nothing beyond the status contract survive the write', () => {
  clearStatus()
  writeStatus({
    lead: { name: 'Pikachu', level: 5, hp: 19 },
    balls: 1,
    money: 10,
    caught: 1,
    heartbeat: 1,
    session: 'abc',
    state: 'working',
  })

  const onDisk = JSON.parse(readFileSync(STATUS_FILE, 'utf8'))

  expect(Object.keys(onDisk).sort()).toEqual([
    'balls',
    'caught',
    'heartbeat',
    'lead',
    'money',
  ])
  expect(
    onDisk.heartbeat,
    'you do not get to fake being alive',
  ).toBeGreaterThan(1)
})

test('Should replace the last write with the next, leaving one file behind', () => {
  clearStatus()
  writeStatus({ lead: { name: 'First', level: 1 } })
  writeStatus({ lead: { name: 'Second', level: 2 } })

  expect(readStatus().lead.name, 'the rename lands on the real path').toBe(
    'Second',
  )
  expect(
    readdirSync(HOME),
    'and the temporary file is not left behind',
  ).toEqual(['status.json'])
})

test('Should call a companion live only while its heartbeat is recent', () => {
  expect(companionIsLive(null), 'nobody there').toBe(false)
  expect(companionIsLive({}), 'no heartbeat at all').toBe(false)
  expect(companionIsLive({ heartbeat: 0 }), 'a zero is not a beat').toBe(false)

  expect(companionIsLive({ heartbeat: Date.now() })).toBe(true)
  expect(companionIsLive({ heartbeat: Date.now() - 14_000 })).toBe(true)
  expect(
    companionIsLive({ heartbeat: Date.now() - 16_000 }),
    'fifteen seconds of silence and it is gone',
  ).toBe(false)
})
