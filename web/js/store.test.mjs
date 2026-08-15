import { beforeEach, expect, test, vi } from 'vitest'
import { DEFAULT_CONFIG, STARTERS } from '../../src/constants.mjs'
import { createPokemon } from '../../src/pokemon.mjs'
import { makeRng } from '../../src/rng.mjs'
import { createSave } from '../../src/state.mjs'
import { createStore } from './store.mjs'
import { activeView } from './views/router.mjs'

const stubApi = () => {
  return {
    putSave: vi.fn(() => Promise.resolve()),
    putConfig: vi.fn((patch) =>
      Promise.resolve({ ...DEFAULT_CONFIG, ...patch }),
    ),
    dropEncounter: vi.fn(),
    askForCard: vi.fn(() => Promise.resolve({ path: '/tmp/card.png' })),
    askForTradeCode: vi.fn(() =>
      Promise.resolve({ code: 'CMON1-abc', path: '/tmp/trade.txt' }),
    ),
    readTradeCode: vi.fn(),
    startUpdate: vi.fn(),
    quitGame: vi.fn(),
  }
}

const stubSound = () => {
  return { play: vi.fn(), startMusic: vi.fn(), stopMusic: vi.fn() }
}

const aSave = () =>
  createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) })

const aBootstrap = (over) => {
  return {
    version: '2.0.0',
    save: aSave(),
    config: { ...DEFAULT_CONFIG },
    worked: { totalMs: 0, updatedAt: null },
    activity: { state: 'idle', tool: null, since: null, sessions: 1 },
    encounter: null,
    notice: null,
    ...over,
  }
}

const wildPidgey = () => {
  return {
    kind: 'wild',
    species: 16,
    name: 'pidgey',
    level: 5,
    trainer: null,
    seed: 42,
    shiny: false,
    at: new Date().toISOString(),
    expiresAt: Date.now() + 30_000,
  }
}

const press = (ctx, ...names) => {
  for (const name of names) activeView(ctx).onKey(ctx, { name, shift: false })
}

beforeEach(() => {
  vi.clearAllMocks()
})

test('Should start a new game on the starter screen and write the save it made', () => {
  const api = stubApi()
  const ctx = createStore({
    bootstrap: aBootstrap({ save: null }),
    api,
    sound: stubSound(),
    onChange: vi.fn(),
  })

  expect(ctx.mode).toBe('starter')

  press(ctx, 'm', 'i', 's', 't', 'y', 'enter')

  expect(ctx.setup.step).toBe('starter')

  press(ctx, 'right', 'enter')

  expect(ctx.mode).toBe('home')
  expect(ctx.save.trainer.name).toBe('misty')
  expect(ctx.save.party[0].species).toBe(STARTERS[2])
  expect(api.putSave).toHaveBeenCalledTimes(1)
  expect(api.putSave.mock.calls[0][0].party).toHaveLength(1)
})

test('Should open a battle against the encounter in the grass and let the server drop it', () => {
  const api = stubApi()
  const sound = stubSound()
  const ctx = createStore({
    bootstrap: aBootstrap({ encounter: wildPidgey() }),
    api,
    sound,
    onChange: vi.fn(),
  })

  press(ctx, 'enter')

  expect(ctx.mode).toBe('battle')
  expect(ctx.battle.state.foe.mon.species).toBe(16)
  expect(ctx.encounter, 'the grass is empty again').toBeNull()
  expect(api.dropEncounter).toHaveBeenCalledTimes(1)
  expect(sound.startMusic).toHaveBeenCalledWith('battle')
  expect(ctx.save.stats.battles).toBe(1)
})

test('Should spend the money and keep the item when something is bought', () => {
  const api = stubApi()
  const ctx = createStore({
    bootstrap: aBootstrap(),
    api,
    sound: stubSound(),
    onChange: vi.fn(),
  })

  const before = ctx.save.money

  ctx.openHomeSelection('shop')
  press(ctx, 'enter')

  expect(ctx.save.money).toBeLessThan(before)
  expect(ctx.save.bag['poke-ball']).toBeGreaterThan(0)
  expect(ctx.shopMessage).toMatch(/Bought 1/)
  expect(api.putSave).toHaveBeenCalledTimes(1)
})

test('Should refuse to heal while Claude is working, and heal once it stops', () => {
  const api = stubApi()
  const ctx = createStore({
    bootstrap: aBootstrap({
      activity: { state: 'working', tool: 'Bash', since: 1, sessions: 1 },
    }),
    api,
    sound: stubSound(),
    onChange: vi.fn(),
  })

  ctx.save.party[0].hp = 1

  ctx.openHomeSelection('heal')

  expect(ctx.notice).toMatch(/working/)
  expect(ctx.save.party[0].hp).toBe(1)
  expect(api.putSave).not.toHaveBeenCalled()

  ctx.receiveActivity({ state: 'idle', tool: null, since: 2, sessions: 1 })
  ctx.openHomeSelection('heal')

  expect(ctx.save.party[0].hp).toBe(ctx.save.party[0].stats.hp)
  expect(api.putSave).toHaveBeenCalledTimes(1)
})

test('Should note a Pokemon the hooks turned up in the dex the moment it arrives', () => {
  const api = stubApi()
  const sound = stubSound()
  const ctx = createStore({
    bootstrap: aBootstrap(),
    api,
    sound,
    onChange: vi.fn(),
  })

  ctx.receiveEncounter({ ...wildPidgey(), shiny: true })

  expect(ctx.encounter.species).toBe(16)
  expect(ctx.save.dex.seen).toContain(16)
  expect(ctx.save.dex.caught, 'seen is not caught').not.toContain(16)
  expect(sound.play).toHaveBeenCalledWith('shiny')
  expect(api.putSave).toHaveBeenCalledTimes(1)
})

test('Should send the box a Pokemon the team can spare and take it back', () => {
  const api = stubApi()
  const ctx = createStore({
    bootstrap: aBootstrap(),
    api,
    sound: stubSound(),
    onChange: vi.fn(),
  })

  ctx.save.party.push(createPokemon(25, 9, makeRng(3)))

  ctx.openHomeSelection('team')
  press(ctx, 'down', 'd')

  expect(ctx.save.party).toHaveLength(1)
  expect(ctx.save.box).toHaveLength(1)
  expect(ctx.boxMessage).toMatch(/went to the box/i)

  ctx.openBox()
  press(ctx, 'enter')

  expect(ctx.save.party).toHaveLength(2)
  expect(ctx.save.box).toHaveLength(0)
})

test('Should hand back a trade code for the Pokemon it gave away', async () => {
  const api = stubApi()
  const ctx = createStore({
    bootstrap: aBootstrap(),
    api,
    sound: stubSound(),
    onChange: vi.fn(),
  })

  ctx.save.party.push(createPokemon(25, 9, makeRng(3)))

  ctx.askToGiveAway({
    from: 'team',
    source: 'party',
    index: 1,
    mon: ctx.save.party[1],
  })

  expect(ctx.mode).toBe('trade')

  await ctx.giveSelectedAway()

  expect(ctx.save.party, 'it left the game').toHaveLength(1)
  expect(ctx.tradeStep).toBe('code')
  expect(ctx.tradeCode).toBe('CMON1-abc')
  expect(api.askForTradeCode).toHaveBeenCalledTimes(1)
  expect(api.askForTradeCode.mock.calls[0][0].species).toBe(25)
})

test('Should keep the last Pokemon of the team out of a trade', () => {
  const ctx = createStore({
    bootstrap: aBootstrap(),
    api: stubApi(),
    sound: stubSound(),
    onChange: vi.fn(),
  })

  ctx.askToGiveAway({
    from: 'team',
    source: 'party',
    index: 0,
    mon: ctx.save.party[0],
  })

  expect(ctx.mode, 'it never opens the trade screen').toBe('home')
  expect(ctx.boxMessage).toMatch(/last/i)
  expect(ctx.save.party).toHaveLength(1)
})

test('Should put the game down and tell the server on the way out', () => {
  const api = stubApi()
  const sound = stubSound()
  const closeWindow = vi.fn()
  const ctx = createStore({
    bootstrap: aBootstrap(),
    api,
    sound,
    onChange: vi.fn(),
    closeWindow,
  })

  ctx.openHomeSelection('quit')

  expect(api.putSave).toHaveBeenCalledTimes(1)
  expect(api.quitGame).toHaveBeenCalledTimes(1)
  expect(sound.stopMusic).toHaveBeenCalledTimes(1)
  expect(closeWindow).toHaveBeenCalledTimes(1)
})

test('Should repaint every time the game moves on', () => {
  const onChange = vi.fn()
  const ctx = createStore({
    bootstrap: aBootstrap(),
    api: stubApi(),
    sound: stubSound(),
    onChange,
  })

  ctx.setMode('dex')
  ctx.receiveActivity({ state: 'working', tool: 'Read', since: 1, sessions: 1 })

  expect(onChange).toHaveBeenCalledTimes(2)
  expect(onChange).toHaveBeenLastCalledWith(ctx)
})
