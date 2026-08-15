import { expect, test, vi } from 'vitest'
import {
  DEFAULT_CONFIG,
  EGG_STEPS,
  FRAMES_PER_DAYCARE_STEP,
  PARTY_LIMIT,
} from '../../src/constants.mjs'
import { createPokemon } from '../../src/pokemon.mjs'
import { makeRng } from '../../src/rng.mjs'
import { createSave } from '../../src/state.mjs'
import { createStore } from './store.mjs'

const stubApi = (over) => {
  return {
    putSave: vi.fn(),
    putConfig: vi.fn((patch) =>
      Promise.resolve({ ...DEFAULT_CONFIG, ...patch }),
    ),
    dropEncounter: vi.fn(),
    askForCard: vi.fn(() => Promise.resolve({ path: '/tmp/card.png' })),
    askForTradeCode: vi.fn(() =>
      Promise.resolve({ code: 'CMON1-abc', path: '/tmp/trade.txt' }),
    ),
    readTradeCode: vi.fn(() => Promise.resolve({ ok: false, reason: 'nope' })),
    startUpdate: vi.fn(() =>
      Promise.resolve({
        kind: 'plugin',
        state: 'running',
        from: '1',
        to: null,
        steps: [],
      }),
    ),
    quitGame: vi.fn(),
    ...over,
  }
}

const aGame = ({ api, config, activity, encounter, sound } = {}) => {
  return createStore({
    bootstrap: {
      version: '2.0.0',
      save: createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) }),
      config: { ...DEFAULT_CONFIG, ...config },
      worked: { totalMs: 0, updatedAt: null },
      activity: activity ?? {
        state: 'idle',
        tool: null,
        since: null,
        sessions: 1,
      },
      encounter: encounter ?? null,
      notice: null,
    },
    api: api ?? stubApi(),
    sound: sound ?? { play: vi.fn(), startMusic: vi.fn(), stopMusic: vi.fn() },
    onChange: vi.fn(),
    closeWindow: vi.fn(),
  })
}

const aTrainerEncounter = () => {
  return {
    kind: 'trainer',
    species: null,
    name: null,
    level: null,
    trainer: {
      class: 'Hiker',
      name: 'Wade',
      sprite: 'hiker',
      team: [
        { species: 74, level: 8 },
        { species: 95, level: 9 },
      ],
    },
    seed: 21,
    shiny: false,
    expiresAt: Date.now() + 30_000,
  }
}

test('Should send a trainer out with their whole team and say who they are', () => {
  const ctx = aGame({ encounter: aTrainerEncounter() })

  ctx.startNextBattle()

  expect(ctx.mode).toBe('battle')
  expect(ctx.battle.state.trainer.name).toBe('Wade')
  expect(ctx.battle.state.trainer.team).toHaveLength(2)
  expect(ctx.battle.state.foe.mon.species).toBe(74)
  expect(ctx.battle.trainerIntro, 'the trainer is shown first').toBe(true)
  expect(ctx.battle.message).toMatch(/WADE/i)
})

test('Should say a wild Pokemon is shiny when it is', () => {
  const ctx = aGame({
    encounter: {
      kind: 'wild',
      species: 10,
      name: 'caterpie',
      level: 3,
      trainer: null,
      seed: 1,
      shiny: true,
      expiresAt: Date.now() + 30_000,
    },
  })

  ctx.startNextBattle()

  const said = [ctx.battle.message, ...ctx.battle.events.map((e) => e.text)]

  expect(said.join(' ')).toMatch(/sparkles/i)
})

test('Should hatch the egg the day care laid and put it in the team', () => {
  const ctx = aGame({
    activity: { state: 'working', tool: null, since: 1, sessions: 1 },
  })

  ctx.save.daycare.egg = { species: 25, steps: EGG_STEPS - 1, shiny: false }

  for (let frame = 0; frame < FRAMES_PER_DAYCARE_STEP; frame++)
    ctx.tickDaycare()

  expect(ctx.save.daycare.egg).toBeNull()
  expect(ctx.save.party.some((mon) => mon.species === 25)).toBe(true)
  expect(ctx.notice).toMatch(/hatched/i)
})

test('Should take a Pokemon back out of the day care', () => {
  const ctx = aGame()

  ctx.save.party.push(createPokemon(25, 9, makeRng(3)))
  ctx.leaveAtDaycare('party', 1)

  expect(ctx.save.daycare.slots).toHaveLength(1)

  ctx.takeBackFromDaycare(0)

  expect(ctx.save.daycare.slots).toHaveLength(0)
  expect(ctx.save.party).toHaveLength(2)
  expect(ctx.daycareMessage.join(' ')).toMatch(/came back/i)

  ctx.closeDaycare()

  expect(ctx.mode).toBe('home')
})

test('Should heal one Pokemon with a potion and put the bag away', () => {
  const ctx = aGame()

  ctx.save.bag.potion = 1
  ctx.save.party[0].hp = 1

  ctx.setMode('team')
  ctx.openBag()
  ctx.useFromBag('potion', 0)

  expect(ctx.save.party[0].hp).toBeGreaterThan(1)
  expect(ctx.save.bag.potion).toBeUndefined()
  expect(ctx.bagSelection, 'the bag closes once it is used').toBeNull()
})

test('Should take a Pokemon in from a code that reads', async () => {
  const trade = {
    v: 1,
    id: 'abc',
    from: { name: 'MISTY', at: '2020-01-01T00:00:00.000Z' },
    mon: {
      species: 7,
      nickname: null,
      exp: 400,
      ivs: {
        hp: 5,
        attack: 5,
        defense: 5,
        spAttack: 5,
        spDefense: 5,
        speed: 5,
      },
      hp: 20,
      moves: [{ move: 'tackle', pp: 30, maxPp: 35 }],
      status: null,
      statusTurns: 0,
      shiny: false,
    },
  }
  const api = stubApi({
    readTradeCode: vi.fn(() => Promise.resolve({ ok: true, trade })),
  })
  const ctx = aGame({ api })

  ctx.openTradeReceive('team')
  ctx.tradeInput = 'CMON1-whatever'

  await ctx.takeInCode()

  expect(ctx.save.party.some((mon) => mon.species === 7)).toBe(true)
  expect(ctx.boxMessage).toMatch(/MISTY/)
  expect(ctx.mode, 'and it goes back where it came from').toBe('team')
})

test('Should say so when the config cannot be written', async () => {
  const api = stubApi({
    putConfig: vi.fn(() => Promise.reject(new Error('EACCES'))),
  })
  const ctx = aGame({ api })

  await ctx.applyConfig({ sound: false })

  expect(ctx.optionsMessage).toMatch(/EACCES/)
})

test('Should say so when the card cannot be drawn', async () => {
  const api = stubApi({
    askForCard: vi.fn(() => Promise.reject(new Error('nope'))),
  })
  const ctx = aGame({ api })

  await ctx.exportCard()

  expect(ctx.notice).toMatch(/card/i)
})

test('Should follow what another tab did to the save, the config and the version', () => {
  const ctx = aGame()
  const other = createSave({ trainer: 'MISTY', starterId: 7, rng: makeRng(4) })

  ctx.receiveSave(other)
  ctx.receiveConfig({ ...DEFAULT_CONFIG, bell: false })
  ctx.receiveNotice({ kind: 'available', version: '9.9.9' })

  expect(ctx.save.trainer.name).toBe('MISTY')
  expect(ctx.config.bell).toBe(false)
  expect(ctx.updateNotice.version).toBe('9.9.9')
})

test('Should run an update and come back out of it', async () => {
  const ctx = aGame()

  await ctx.startUpdate()

  expect(ctx.mode).toBe('update')
  expect(ctx.update.state).toBe('running')

  ctx.receiveUpdateRun({
    kind: 'plugin',
    state: 'done',
    from: '2.0.0',
    to: '2.1.0',
    steps: [],
  })

  expect(ctx.updateNotice).toEqual({ kind: 'stale', version: '2.1.0' })

  ctx.finishUpdate()

  expect(ctx.mode).toBe('home')
  expect(ctx.update).toBeNull()
})

test('Should stay silent when the sound is switched off', () => {
  const sound = { play: vi.fn(), startMusic: vi.fn(), stopMusic: vi.fn() }
  const ctx = aGame({ config: { sound: false }, sound })

  ctx.playSound('select')
  ctx.playMusic('battle')

  expect(sound.play).not.toHaveBeenCalled()
  expect(sound.startMusic).not.toHaveBeenCalled()

  ctx.stopMusic()

  expect(sound.stopMusic, 'stopping still works').toHaveBeenCalledTimes(1)
})

test('Should keep the last Pokemon in the team and refuse a seventh', () => {
  const ctx = aGame()

  ctx.depositToBox(0)

  expect(ctx.boxMessage).toMatch(/last/i)
  expect(ctx.save.party).toHaveLength(1)

  while (ctx.save.party.length < PARTY_LIMIT)
    ctx.save.party.push(createPokemon(16, 5, makeRng(ctx.save.party.length)))

  ctx.save.box.push(createPokemon(19, 5, makeRng(9)))
  ctx.withdrawFromBox(0)

  expect(ctx.boxMessage).toMatch(/full/i)
  expect(ctx.save.party).toHaveLength(PARTY_LIMIT)
})

test('Should let the grass go quiet again when the encounter times out', () => {
  const ctx = aGame({
    encounter: {
      kind: 'wild',
      species: 10,
      name: 'caterpie',
      level: 3,
      trainer: null,
      seed: 1,
      shiny: false,
      expiresAt: Date.now() + 1000,
    },
  })

  ctx.homeSelection = 1
  ctx.receiveEncounter(null)

  expect(ctx.encounter).toBeNull()
  expect(ctx.homeSelection, 'the cursor slides off FIGHT').toBe(0)
})

test('Should hold the whole game still while a gym run is going', () => {
  const ctx = aGame()

  ctx.startGymRun('pewter')
  ctx.persist()
  ctx.receiveEncounter({
    kind: 'wild',
    species: 10,
    name: 'caterpie',
    level: 3,
    trainer: null,
    seed: 1,
    shiny: false,
    expiresAt: Date.now() + 1000,
  })

  expect(ctx.encounter, 'nothing turns up mid-gauntlet').toBeNull()
  expect(ctx.tickDaycare()).toBe(false)
})

test('Should tick every clock the screen runs on in one go', () => {
  const ctx = aGame({
    activity: { state: 'working', tool: null, since: 1, sessions: 1 },
  })

  ctx.scene.frames = 1

  expect(ctx.tickFrame()).toBe(true)
})
