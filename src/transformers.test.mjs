import { expect, test } from 'vitest'
import {
  transformRequestSaveGame,
  transformRequestTrade,
  transformRequestWriteActivity,
  transformRequestWriteConfig,
  transformRequestWriteEncounter,
  transformRequestWriteStatus,
  transformRequestWriteUpdateState,
  transformRequestWriteWorked,
  transformResponseActivity,
  transformResponseConfig,
  transformResponseEncounter,
  transformResponseManifest,
  transformResponseSave,
  transformResponseStatus,
  transformResponseTrade,
  transformResponseUpdateState,
  transformResponseWorked,
} from './transformers.mjs'

const rawSave = {
  version: 1,
  trainer: { name: 'ASH', startedAt: '2026-01-01T00:00:00.000Z' },
  party: [
    {
      species: 4,
      nickname: 'Sparky',
      exp: 135,
      ivs: { hp: 20, attack: 3 },
      stats: { hp: 21, attack: 11 },
      hp: 18,
      moves: [{ move: 'ember', pp: 24, maxPp: 25, learnedAt: 9 }],
      status: 'burn',
      statusTurns: 2,
      shiny: true,
      level: 7,
    },
  ],
  box: [
    {
      species: 19,
      nickname: null,
      exp: 100,
      ivs: { hp: 1 },
      stats: { hp: 15 },
      hp: 15,
      moves: [],
      status: null,
      statusTurns: 0,
    },
  ],
  bag: { 'poke-ball': 5 },
  money: 3000,
  badges: ['pewter', 'cerulean'],
  dex: { seen: [4, 19], caught: [4], shiny: [4], faced: { 19: 2 } },
  stats: {
    battles: 3,
    wins: 2,
    losses: 1,
    caught: 1,
    runs: 0,
    streak: 6,
    lastPlayedAt: '2026-08-08T09:00:00.000Z',
  },
  achievements: [
    {
      id: 'first-catch',
      earnedAt: '2026-08-02T09:00:00.000Z',
      label: 'First catch',
    },
  ],
  cheatMode: true,
}

test('Should map every field of a save on the way in and drop the rest', () => {
  const save = transformResponseSave(rawSave)

  expect(Object.keys(save).sort()).toEqual([
    'achievements',
    'badges',
    'bag',
    'box',
    'daycare',
    'dex',
    'money',
    'party',
    'stats',
    'trades',
    'trainer',
    'version',
  ])
  expect(save.trainer).toEqual(rawSave.trainer)
  expect(save.badges).toEqual(['pewter', 'cerulean'])
  expect(save.dex).toEqual({
    seen: [4, 19],
    caught: [4],
    shiny: [4],
    faced: { 19: 2 },
  })
  expect(save.stats).toEqual({
    battles: 3,
    wins: 2,
    losses: 1,
    caught: 1,
    runs: 0,
    streak: 6,
    lastPlayedAt: '2026-08-08T09:00:00.000Z',
  })
  expect(
    save.achievements,
    'an achievement keeps its id and its date, and nothing else',
  ).toEqual([{ id: 'first-catch', earnedAt: '2026-08-02T09:00:00.000Z' }])
})

test('Should map a Pokemon to the ten stored fields and its slots to three', () => {
  const [mon] = transformResponseSave(rawSave).party

  expect(Object.keys(mon).sort()).toEqual([
    'exp',
    'hp',
    'ivs',
    'moves',
    'nickname',
    'shiny',
    'species',
    'stats',
    'status',
    'statusTurns',
  ])
  expect(mon.level).toBeUndefined()
  expect(mon.shiny).toBe(true)
  expect(mon.moves).toEqual([{ move: 'ember', pp: 24, maxPp: 25 }])
})

test('Should give a save written before a field existed an empty one instead', () => {
  const save = transformResponseSave({ version: 1, party: [{ species: 4 }] })

  expect(save.party[0].moves).toEqual([])
  expect(save.party[0].shiny, 'a save from before shinies has none').toBe(false)
  expect(save.box).toEqual([])
  expect(save.bag).toEqual({})
  expect(save.money).toBe(0)
  expect(save.badges).toEqual([])
  expect(save.dex).toEqual({ seen: [], caught: [], shiny: [], faced: {} })
  expect(save.stats).toEqual({
    battles: 0,
    wins: 0,
    losses: 0,
    caught: 0,
    runs: 0,
    streak: 0,
    lastPlayedAt: null,
  })
  expect(
    save.achievements,
    'a save from before achievements has earned none',
  ).toEqual([])

  expect(transformResponseSave({ version: 1 }).party).toEqual([])

  const written = transformRequestSaveGame({ version: 1 })

  expect(written.party).toEqual([])
  expect(written.box).toEqual([])
})

test('Should read no save at all as nothing rather than an empty one', () => {
  expect(transformResponseSave(null)).toBeNull()
})

test('Should write back the same fields a save was read with, trainer included', () => {
  const save = transformResponseSave(rawSave)
  const written = transformRequestSaveGame(save)

  expect(written).toEqual(save)
  expect(written.trainer.name).toBe('ASH')
})

test('Should keep a field the game attached during play out of the save file', () => {
  const written = transformRequestSaveGame({
    version: 1,
    trainer: { name: 'ASH' },
    party: [
      {
        species: 4,
        nickname: null,
        exp: 1,
        ivs: {},
        stats: { hp: 1 },
        hp: 1,
        moves: [],
        status: null,
        statusTurns: 0,
        flashing: true,
      },
    ],
    box: [],
    bag: {},
    money: 0,
    dex: { seen: [], caught: [], shiny: [], faced: {} },
    stats: { battles: 0, wins: 0, losses: 0, caught: 0, runs: 0 },
    battle: { turn: 3 },
  })

  expect(written.battle).toBeUndefined()
  expect(written.party[0].flashing).toBeUndefined()
})

test('Should map the worked ledger to the total and when it last moved', () => {
  const worked = transformResponseWorked({
    totalMs: 1_800_000,
    updatedAt: '2026-08-08T09:00:00.000Z',
    session: 'abc',
  })

  expect(worked).toEqual({
    totalMs: 1_800_000,
    updatedAt: '2026-08-08T09:00:00.000Z',
  })
  expect(worked.session).toBeUndefined()
})

test('Should read a ledger written before a field existed as an empty total', () => {
  expect(transformResponseWorked({})).toEqual({
    totalMs: 0,
    updatedAt: null,
  })
  expect(transformResponseWorked(null)).toBeNull()
})

test('Should write the worked ledger with the same two fields', () => {
  const written = transformRequestWriteWorked({
    totalMs: 60_000,
    updatedAt: '2026-08-08T09:00:00.000Z',
    session: 'abc',
  })

  expect(Object.keys(written).sort()).toEqual(['totalMs', 'updatedAt'])
})

test('Should map a status to the lead, the counters and the heartbeat', () => {
  const status = transformResponseStatus({
    lead: { name: 'Charmander', level: 7, hp: 18 },
    balls: 5,
    money: 3000,
    caught: 2,
    heartbeat: 1234,
    session: 'abc',
  })

  expect(status).toEqual({
    lead: { name: 'Charmander', level: 7 },
    balls: 5,
    money: 3000,
    caught: 2,
    heartbeat: 1234,
  })
})

test('Should read a status with no lead as no lead, in both directions', () => {
  expect(transformResponseStatus({ balls: 0 }).lead).toBeNull()
  expect(
    transformRequestWriteStatus({ lead: null, heartbeat: 1 }).lead,
  ).toBeNull()
  expect(transformResponseStatus(null)).toBeNull()
})

test('Should write a status with only the five fields the status line reads', () => {
  const written = transformRequestWriteStatus({
    lead: { name: 'Pikachu', level: 5 },
    balls: 1,
    money: 10,
    caught: 1,
    heartbeat: 99,
    state: 'working',
  })

  expect(Object.keys(written).sort()).toEqual([
    'balls',
    'caught',
    'heartbeat',
    'lead',
    'money',
  ])
  expect(written.state).toBeUndefined()
})

test('Should map a session entry to the ten fields the hooks and the game read', () => {
  const entry = transformResponseActivity({
    v: 1,
    session: 'abc',
    cwd: '/work',
    at: 1000,
    state: 'working',
    tool: 'Bash',
    since: 900,
    lastStepAt: 950,
    pendingSteps: 2,
    message: 'needs permission',
    transcript_path: '/tmp/t.jsonl',
  })

  expect(entry).toEqual({
    v: 1,
    session: 'abc',
    cwd: '/work',
    at: 1000,
    state: 'working',
    tool: 'Bash',
    since: 900,
    lastStepAt: 950,
    pendingSteps: 2,
    message: 'needs permission',
  })
})

test('Should leave a missing step clock missing rather than calling it zero', () => {
  const entry = transformResponseActivity({ session: 'abc', at: 1000 })

  expect(entry.lastStepAt).toBeUndefined()
  expect(entry.since).toBeUndefined()
  expect(entry.pendingSteps).toBeUndefined()
  expect(transformResponseActivity(null)).toBeNull()
})

test('Should write a session entry with the same fields it is read with', () => {
  const written = transformRequestWriteActivity({
    v: 1,
    session: 'abc',
    cwd: null,
    at: 1000,
    state: 'idle',
    tool: null,
    since: 1000,
    lastStepAt: 1000,
    pendingSteps: 0,
    hookEventName: 'Stop',
  })

  expect(Object.keys(written).sort()).toEqual([
    'at',
    'cwd',
    'lastStepAt',
    'message',
    'pendingSteps',
    'session',
    'since',
    'state',
    'tool',
    'v',
  ])
  expect(written.hookEventName).toBeUndefined()
})

test('Should map the ten config keys the game reads and drop anything else', () => {
  const config = transformResponseConfig({
    encounterChance: 0.5,
    charsPerStep: 10,
    maxSteps: 2,
    workStepSeconds: 5,
    sound: false,
    bell: false,
    updateCheck: 'launch',
    encounterTtlSeconds: 60,
    wrappedStatusLine: 'echo hi',
    probeRows: 3,
    theme: 'dark',
  })

  expect(config).toEqual({
    encounterChance: 0.5,
    charsPerStep: 10,
    maxSteps: 2,
    workStepSeconds: 5,
    sound: false,
    bell: false,
    updateCheck: 'launch',
    encounterTtlSeconds: 60,
    wrappedStatusLine: 'echo hi',
    probeRows: 3,
  })
  expect(transformResponseConfig(null)).toBeNull()
})

test('Should write only the config keys that are actually set', () => {
  const written = transformRequestWriteConfig({ sound: false, theme: 'dark' })

  expect(JSON.parse(JSON.stringify(written))).toEqual({ sound: false })
})

test('Should map an encounter to the fields the queue file carries, and call one with no kind a wild one', () => {
  const entry = transformResponseEncounter({
    v: 1,
    species: 16,
    name: 'Pidgey',
    level: 4,
    seed: 777,
    shiny: true,
    session: 'abc',
    at: '2026-01-01T00:00:00.000Z',
    weight: 20,
  })

  expect(entry).toEqual({
    v: 1,
    kind: 'wild',
    species: 16,
    name: 'Pidgey',
    level: 4,
    seed: 777,
    shiny: true,
    session: 'abc',
    at: '2026-01-01T00:00:00.000Z',
  })
  expect(transformResponseEncounter(null)).toBeNull()
})

test('Should map a trainer encounter to its roster and drop the wild fields', () => {
  const entry = transformResponseEncounter({
    v: 1,
    kind: 'trainer',
    species: 16,
    level: 4,
    trainer: {
      class: 'Bug Catcher',
      name: 'Joey',
      sprite: 'bugcatcher',
      team: [
        { species: 13, name: 'Weedle', level: 7, weight: 20 },
        { species: 10, name: 'Caterpie', level: 8 },
      ],
    },
    seed: 777,
    session: 'abc',
    at: '2026-01-01T00:00:00.000Z',
  })

  expect(entry).toEqual({
    v: 1,
    kind: 'trainer',
    trainer: {
      class: 'Bug Catcher',
      name: 'Joey',
      sprite: 'bugcatcher',
      team: [
        { species: 13, name: 'Weedle', level: 7 },
        { species: 10, name: 'Caterpie', level: 8 },
      ],
    },
    seed: 777,
    session: 'abc',
    at: '2026-01-01T00:00:00.000Z',
  })
})

test('Should give a trainer with no roster, or no trainer at all, an empty team rather than throwing', () => {
  const noRoster = transformResponseEncounter({
    v: 1,
    kind: 'trainer',
    trainer: { class: 'Lass', name: 'Iris' },
    seed: 1,
    at: '2026-01-01T00:00:00.000Z',
  })

  expect(noRoster.trainer.team).toEqual([])

  const truncated = transformResponseEncounter({
    v: 1,
    kind: 'trainer',
    seed: 1,
    at: '2026-01-01T00:00:00.000Z',
  })

  expect(
    truncated.trainer,
    'a half-written line maps, and reads as unusable',
  ).toEqual({ class: null, name: null, sprite: null, team: [] })
})

test('Should write an encounter with the same fields and nothing more', () => {
  const written = transformRequestWriteEncounter({
    v: 1,
    species: 16,
    name: 'Pidgey',
    level: 4,
    seed: 777,
    session: 'abc',
    at: '2026-01-01T00:00:00.000Z',
    expiresAt: 123,
  })

  expect(Object.keys(written).sort()).toEqual([
    'at',
    'kind',
    'level',
    'name',
    'seed',
    'session',
    'shiny',
    'species',
    'v',
  ])
  expect(written.expiresAt).toBeUndefined()

  const trainer = transformRequestWriteEncounter({
    v: 1,
    kind: 'trainer',
    species: 16,
    name: 'Pidgey',
    level: 4,
    trainer: { class: 'Lass', name: 'Iris', team: [] },
    seed: 777,
    at: '2026-01-01T00:00:00.000Z',
  })

  expect(Object.keys(trainer).sort(), 'no wild fields tag along').toEqual([
    'at',
    'kind',
    'seed',
    'session',
    'trainer',
    'v',
  ])
})

test('Should take only the version out of a plugin manifest', () => {
  expect(
    transformResponseManifest({
      name: 'claudemon',
      version: '0.6.0',
      description: 'a game',
    }),
  ).toEqual({ version: '0.6.0' })
  expect(transformResponseManifest({ name: 'claudemon' })).toEqual({
    version: undefined,
  })
  expect(transformResponseManifest(null)).toBeNull()
})

test('Should map the update state to when it checked, what it found and why not', () => {
  const state = transformResponseUpdateState({
    checkedAt: '2026-03-01T12:00:00.000Z',
    latest: '9.9.9',
    error: 'ECONNREFUSED',
    notice: { kind: 'available' },
  })

  expect(state).toEqual({
    checkedAt: '2026-03-01T12:00:00.000Z',
    latest: '9.9.9',
    error: 'ECONNREFUSED',
  })
  expect(state.notice).toBeUndefined()
})

test('Should read a missing update file as nothing so the first check is due', () => {
  expect(transformResponseUpdateState(null)).toBeNull()
})

test('Should write the update state with the same three fields', () => {
  const written = transformRequestWriteUpdateState({
    checkedAt: '2026-03-01T12:00:00.000Z',
    latest: '9.9.9',
    error: null,
    force: true,
  })

  expect(Object.keys(written).sort()).toEqual(['checkedAt', 'error', 'latest'])
  expect(written.force).toBeUndefined()
})

test('Should carry a save with no trades yet as an empty list of them', () => {
  expect(transformResponseSave(rawSave).trades).toEqual({ received: [] })
})

test('Should carry a save written before the day care existed as an empty one', () => {
  expect(transformResponseSave(rawSave).daycare).toEqual({
    slots: [],
    egg: null,
  })
})

test('Should map the day care through the same Pokemon shape and keep only the egg it needs', () => {
  const { daycare } = transformResponseSave({
    ...rawSave,
    daycare: {
      slots: [rawSave.party[0]],
      egg: { species: 4, steps: 120, shiny: true, mother: 132 },
    },
  })

  expect(daycare.slots).toHaveLength(1)
  expect(
    Object.keys(daycare.slots[0]).sort(),
    'a deposited Pokemon is mapped like any other',
  ).toEqual(Object.keys(transformResponseSave(rawSave).party[0]).sort())
  expect(daycare.egg).toEqual({ species: 4, steps: 120, shiny: true })
})

test('Should write the day care back out with the egg it is holding', () => {
  const written = transformRequestSaveGame({
    ...rawSave,
    daycare: { slots: [], egg: { species: 25, steps: 0 } },
  })

  expect(written.daycare.egg).toEqual({
    species: 25,
    steps: 0,
    shiny: false,
  })
})

test('Should map only the fields a trade code carries', () => {
  const trade = transformResponseTrade({
    v: 1,
    id: 'abc123',
    mon: {
      species: 25,
      nickname: 'SPARKY',
      exp: 1728,
      ivs: { hp: 22, attack: 9 },
      stats: { hp: 33, attack: 19 },
      hp: 30,
      moves: [{ move: 'thunder-shock', pp: 28, maxPp: 30, learnedAt: 1 }],
      status: 'paralysis',
      statusTurns: 1,
      shiny: true,
      level: 14,
    },
    from: { name: 'ASH', at: '2026-01-01T00:00:00.000Z', save: '/home/ash' },
    cheatMode: true,
  })

  expect(Object.keys(trade).sort()).toEqual(['from', 'id', 'mon', 'v'])
  expect(trade.from).toEqual({ name: 'ASH', at: '2026-01-01T00:00:00.000Z' })
  expect(trade.mon.moves).toEqual([
    { move: 'thunder-shock', pp: 28, maxPp: 30 },
  ])
  expect(trade.mon.stats, 'stats are rebuilt on arrival').toBeUndefined()
  expect(trade.mon.level).toBeUndefined()
  expect(trade.cheatMode).toBeUndefined()
})

test('Should read a code with nothing in it as nothing', () => {
  expect(transformResponseTrade(null)).toBeNull()
})

test('Should write a trade with the same fields it reads', () => {
  const written = transformRequestTrade({
    v: 1,
    id: 'abc123',
    mon: {
      species: 25,
      nickname: null,
      exp: 1728,
      ivs: { hp: 22 },
      stats: { hp: 33 },
      hp: 30,
      moves: [],
      status: null,
      statusTurns: 0,
    },
    from: { name: 'ASH', at: '2026-01-01T00:00:00.000Z' },
  })

  expect(Object.keys(written).sort()).toEqual(['from', 'id', 'mon', 'v'])
  expect(written.mon.shiny, 'an older save has no shiny flag').toBe(false)
  expect(written.mon.stats).toBeUndefined()
})
