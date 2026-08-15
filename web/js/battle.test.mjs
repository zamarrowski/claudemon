import { expect, test, vi } from 'vitest'
import {
  DEFAULT_CONFIG,
  FRAMES_PER_DAYCARE_STEP,
} from '../../src/constants.mjs'
import { createPokemon, levelOf } from '../../src/pokemon.mjs'
import { makeRng } from '../../src/rng.mjs'
import { countOf } from '../../src/shop.mjs'
import { createSave } from '../../src/state.mjs'
import { createStore } from './store.mjs'
import { activeView } from './views/router.mjs'

const stubApi = () => {
  return {
    putSave: vi.fn(),
    putConfig: vi.fn(),
    dropEncounter: vi.fn(),
    askForCard: vi.fn(),
    askForTradeCode: vi.fn(),
    readTradeCode: vi.fn(),
    startUpdate: vi.fn(),
    quitGame: vi.fn(),
  }
}

const aGame = ({ activity, encounter } = {}) => {
  const save = createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) })

  return createStore({
    bootstrap: {
      version: '2.0.0',
      save,
      config: { ...DEFAULT_CONFIG },
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
    api: stubApi(),
    sound: { play: vi.fn(), startMusic: vi.fn(), stopMusic: vi.fn() },
    onChange: vi.fn(),
    closeWindow: vi.fn(),
  })
}

const aWeakEncounter = () => {
  return {
    kind: 'wild',
    species: 10,
    name: 'caterpie',
    level: 2,
    trainer: null,
    seed: 5,
    shiny: false,
    expiresAt: Date.now() + 30_000,
  }
}

const press = (ctx, ...names) => {
  for (const name of names) activeView(ctx).onKey(ctx, { name, shift: false })
}

const settle = (ctx) => {
  for (let guard = 0; guard < 400; guard++) {
    if (!ctx.battle) return
    if (ctx.battle.message) {
      ctx.advanceMessage()
      continue
    }
    if (ctx.battle.postSteps) {
      ctx.advanceMessage()
      continue
    }

    return
  }
}

const attackUntilOver = (ctx) => {
  for (let turn = 0; turn < 30 && ctx.mode === 'battle'; turn++) {
    settle(ctx)

    if (ctx.mode !== 'battle') return

    press(ctx, 'enter')
    press(ctx, 'enter')
    settle(ctx)
  }
}

test('Should fight a wild Pokemon down, take the EXP and walk back home', () => {
  const ctx = aGame({ encounter: aWeakEncounter() })

  ctx.save.party[0] = createPokemon(6, 40, makeRng(9))
  ctx.startNextBattle()

  const before = ctx.save.party[0].exp

  attackUntilOver(ctx)

  expect(ctx.mode, 'the battle is over').toBe('home')
  expect(ctx.save.party[0].exp).toBeGreaterThan(before)
  expect(ctx.save.stats.wins).toBe(1)
  expect(ctx.save.party[0].hp).toBeGreaterThan(0)
})

test('Should throw a ball from the bag and keep what it catches', () => {
  const ctx = aGame({ encounter: aWeakEncounter() })

  ctx.save.party[0] = createPokemon(6, 40, makeRng(9))
  ctx.save.bag['master-ball'] = 1
  ctx.startNextBattle()
  settle(ctx)

  press(ctx, 'down')

  expect(ctx.battle.selection).toBe(1)

  press(ctx, 'enter')

  expect(ctx.battle.menu).toBe('bag')

  const master = ctx.battle.bagItems.indexOf('master-ball')

  ctx.battle.selection = master

  press(ctx, 'enter')
  settle(ctx)

  for (let guard = 0; guard < 60 && ctx.mode === 'battle'; guard++) {
    ctx.tickBattle()
    settle(ctx)
  }

  expect(countOf(ctx.save, 'master-ball')).toBe(0)
  expect(ctx.save.dex.caught, 'the dex fills in').toContain(10)
  expect(
    [...ctx.save.party, ...ctx.save.box].some((mon) => mon.species === 10),
  ).toBe(true)
})

test('Should record the loss and rest the team when the battle is lost', () => {
  const ctx = aGame({
    encounter: { ...aWeakEncounter(), species: 150, level: 60 },
  })

  ctx.startNextBattle()
  attackUntilOver(ctx)

  expect(ctx.mode).toBe('home')
  expect(ctx.save.stats.losses).toBe(1)
  expect(ctx.save.party[0].hp, 'idle time is a rest').toBe(
    ctx.save.party[0].stats.hp,
  )
})

test('Should leave the team down when it blacks out while Claude is working', () => {
  const ctx = aGame({
    activity: { state: 'working', tool: 'Bash', since: 1, sessions: 1 },
    encounter: { ...aWeakEncounter(), species: 150, level: 60 },
  })

  ctx.startNextBattle()
  attackUntilOver(ctx)

  expect(ctx.save.stats.losses).toBe(1)
  expect(ctx.save.party[0].hp, 'no rest while Claude works').toBe(0)
})

test('Should win a badge by clearing every trainer in the gym', () => {
  const ctx = aGame()

  ctx.save.party[0] = createPokemon(6, 60, makeRng(9))

  ctx.startGymRun('pewter')

  expect(ctx.mode).toBe('gym')

  for (let battle = 0; battle < 4 && ctx.mode !== 'gyms'; battle++) {
    ctx.startGymBattle()
    attackUntilOver(ctx)
  }

  expect(ctx.save.badges).toContain('pewter')
  expect(ctx.gymMessage).toMatch(/Boulder Badge/)
  expect(ctx.gym, 'the run is over').toBeNull()
})

test('Should raise what waits in the day care only while Claude is working', () => {
  const ctx = aGame({
    activity: { state: 'working', tool: 'Bash', since: 1, sessions: 1 },
  })

  ctx.save.party.push(createPokemon(25, 5, makeRng(3)))
  ctx.leaveAtDaycare('party', 1)

  const waiting = ctx.save.daycare.slots[0]
  const before = waiting.exp

  for (let frame = 0; frame < FRAMES_PER_DAYCARE_STEP * 2; frame++)
    ctx.tickDaycare()

  expect(waiting.exp).toBeGreaterThan(before)

  ctx.receiveActivity({ state: 'idle', tool: null, since: 2, sessions: 1 })

  const resting = waiting.exp

  for (let frame = 0; frame < FRAMES_PER_DAYCARE_STEP * 2; frame++)
    ctx.tickDaycare()

  expect(waiting.exp, 'it rests when Claude rests').toBe(resting)
})

test('Should level a Pokemon up out of a battle and keep it in the party', () => {
  const ctx = aGame({ encounter: aWeakEncounter() })

  ctx.save.party[0] = createPokemon(1, 4, makeRng(9))

  const before = levelOf(ctx.save.party[0])

  ctx.startNextBattle()
  attackUntilOver(ctx)

  expect(levelOf(ctx.save.party[0])).toBeGreaterThanOrEqual(before)
  expect(ctx.save.party).toHaveLength(1)
})

test('Should send out the next Pokemon when the one in front faints', () => {
  const ctx = aGame({
    encounter: { ...aWeakEncounter(), species: 150, level: 60 },
  })

  ctx.save.party.push(createPokemon(25, 30, makeRng(4)))
  ctx.startNextBattle()

  const said = []

  for (let guard = 0; guard < 400 && ctx.mode === 'battle'; guard++) {
    if (ctx.battle.message) {
      said.push(ctx.battle.message)
      ctx.advanceMessage()
      continue
    }

    press(ctx, 'enter', 'enter')
  }

  expect(said.join(' ')).toMatch(/Go, PIKACHU/i)
  expect(said.join(' ')).toMatch(/fainted/i)
})

test('Should keep the party in order when a battle is won without a faint', () => {
  const ctx = aGame({ encounter: aWeakEncounter() })

  ctx.save.party[0] = createPokemon(6, 45, makeRng(9))
  ctx.save.party.push(createPokemon(25, 5, makeRng(4)))

  const lead = ctx.save.party[0]

  attackUntilOver(ctx)
  ctx.startNextBattle()
  attackUntilOver(ctx)

  expect(ctx.save.party[0]).toBe(lead)
})
