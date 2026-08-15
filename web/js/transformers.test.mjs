import { expect, test } from 'vitest'
import {
  transformRequestGift,
  transformResponseActivity,
  transformResponseBootstrap,
  transformResponseEncounter,
  transformResponseNotice,
  transformResponseTradeRead,
  transformResponseUpdateRun,
  transformResponseWorked,
} from './transformers.mjs'

test('Should map the bootstrap into the fields the game reads and drop the rest', () => {
  const payload = transformResponseBootstrap({
    version: '2.0.0',
    save: { trainer: { name: 'ASH' } },
    config: { sound: false },
    activity: {
      state: 'working',
      tool: 'Bash',
      since: 7,
      sessions: 2,
      cwd: '/x',
    },
    encounter: null,
    worked: { totalMs: 10, updatedAt: null, extra: 1 },
    notice: { kind: 'available', version: '2.1.0', url: 'nope' },
  })

  expect(payload.activity).toEqual({
    state: 'working',
    tool: 'Bash',
    since: 7,
    sessions: 2,
  })
  expect(payload.worked).toEqual({ totalMs: 10, updatedAt: null })
  expect(payload.notice).toEqual({ kind: 'available', version: '2.1.0' })
  expect(payload.version).toBe('2.0.0')
})

test('Should read a wild encounter and a trainer encounter the same way', () => {
  const wild = transformResponseEncounter({
    kind: 'wild',
    species: 25,
    name: 'pikachu',
    level: 7,
    trainer: null,
    seed: 3,
    shiny: true,
    at: '2026-01-01T00:00:00.000Z',
    expiresAt: 99,
    junk: true,
  })

  expect(wild).toEqual({
    kind: 'wild',
    species: 25,
    name: 'pikachu',
    level: 7,
    trainer: null,
    seed: 3,
    shiny: true,
    at: '2026-01-01T00:00:00.000Z',
    expiresAt: 99,
  })

  const trainer = transformResponseEncounter({
    kind: 'trainer',
    trainer: {
      class: 'Hiker',
      name: 'Wade',
      sprite: 'hiker',
      team: [],
      age: 9,
    },
  })

  expect(trainer.trainer).toEqual({
    class: 'Hiker',
    name: 'Wade',
    sprite: 'hiker',
    team: [],
  })
  expect(transformResponseEncounter(null)).toBeNull()
})

test('Should fall back to a quiet reading when the server says nothing', () => {
  expect(transformResponseActivity(null)).toEqual({
    state: 'unknown',
    tool: null,
    since: null,
    sessions: 0,
  })
  expect(transformResponseWorked(null)).toEqual({ totalMs: 0, updatedAt: null })
  expect(transformResponseNotice(null)).toBeNull()
  expect(transformResponseUpdateRun(null)).toBeNull()
})

test('Should map an update run down to the steps the screen draws', () => {
  const run = transformResponseUpdateRun({
    kind: 'plugin',
    state: 'running',
    from: '1.0.0',
    to: null,
    secret: 'x',
    steps: [
      {
        id: 'pull',
        label: 'Pulling',
        done: 'Pulled',
        status: 'ok',
        detail: null,
        cmd: 'git',
      },
    ],
  })

  expect(run.secret).toBeUndefined()
  expect(run.steps[0]).toEqual({
    id: 'pull',
    label: 'Pulling',
    done: 'Pulled',
    status: 'ok',
    detail: null,
  })
})

test('Should keep the reason when a trade code will not read', () => {
  expect(transformResponseTradeRead({ ok: false, reason: 'nope' })).toEqual({
    ok: false,
    reason: 'nope',
  })
  expect(
    transformResponseTradeRead({ ok: true, trade: { id: 'a' } }).trade.id,
  ).toBe('a')
})

test('Should send only the trainer identity along with the Pokemon it gives away', () => {
  const gift = transformRequestGift(
    { species: 25 },
    { name: 'ASH', startedAt: '2026-01-01T00:00:00.000Z', money: 3000 },
  )

  expect(gift.trainer).toEqual({
    name: 'ASH',
    startedAt: '2026-01-01T00:00:00.000Z',
  })
  expect(gift.mon.species).toBe(25)
})
