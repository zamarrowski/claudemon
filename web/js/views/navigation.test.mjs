import { expect, test, vi } from 'vitest'
import { DEFAULT_CONFIG, GYMS } from '../../../src/constants.mjs'
import { createPokemon } from '../../../src/pokemon.mjs'
import { makeRng } from '../../../src/rng.mjs'
import { createSave } from '../../../src/state.mjs'
import { createStore } from '../store.mjs'
import { activeView } from './router.mjs'

const stubApi = () => {
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
    startUpdate: vi.fn(),
    quitGame: vi.fn(),
  }
}

const aGame = () => {
  return createStore({
    bootstrap: {
      version: '2.0.0',
      save: createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) }),
      config: { ...DEFAULT_CONFIG },
      worked: { totalMs: 0, updatedAt: null },
      activity: { state: 'idle', tool: null, since: null, sessions: 1 },
      encounter: null,
      notice: null,
    },
    api: stubApi(),
    sound: { play: vi.fn(), startMusic: vi.fn(), stopMusic: vi.fn() },
    onChange: vi.fn(),
    closeWindow: vi.fn(),
  })
}

const withCompany = (ctx) => {
  ctx.save.party.push(createPokemon(25, 30, makeRng(3)))
  ctx.save.box.push(createPokemon(16, 12, makeRng(4)))

  return ctx
}

const press = (ctx, ...names) => {
  for (const name of names) activeView(ctx).onKey(ctx, { name, shift: false })
}

const clicks = (ctx, index) => {
  activeView(ctx).select(ctx, index)
}

test('Should walk the home menu round and back out of the game', () => {
  const ctx = aGame()

  press(ctx, 'right', 'right')

  expect(ctx.homeSelection).toBe(2)

  press(ctx, 'left')

  expect(ctx.homeSelection).toBe(1)

  clicks(ctx, 5)

  expect(ctx.homeSelection).toBe(5)
})

test('Should step through the dex with the arrows and leave with escape', () => {
  const ctx = aGame()

  ctx.setMode('dex')
  press(ctx, 'down', 'right', 'j')

  expect(ctx.dexSelection).toBe(3)

  press(ctx, 'up', 'left', 'k')

  expect(ctx.dexSelection).toBe(0)

  clicks(ctx, 9)

  expect(ctx.dexSelection).toBe(9)

  press(ctx, 'esc')

  expect(ctx.mode).toBe('home')
})

test('Should carry the team keys through to the box, the day care and a trade', () => {
  const ctx = withCompany(aGame())

  ctx.setMode('team')
  press(ctx, 'b')

  expect(ctx.mode).toBe('box')

  press(ctx, 'esc')

  expect(ctx.mode).toBe('team')

  press(ctx, 'c')

  expect(ctx.mode).toBe('daycare')

  press(ctx, 'esc')
  press(ctx, 'r')

  expect(ctx.mode).toBe('trade')
  expect(ctx.tradeStep).toBe('receive')

  press(ctx, 'esc')

  expect(ctx.mode).toBe('team')

  press(ctx, 's')

  expect(ctx.teamSort).toBe('level')
})

test('Should sort the box, hand one over and take one back into the team', () => {
  const ctx = withCompany(aGame())

  ctx.save.box.push(createPokemon(7, 20, makeRng(5)))
  ctx.openBox()

  press(ctx, 'down')

  expect(ctx.boxSelection).toBe(1)

  press(ctx, 'up', 's')

  expect(ctx.boxSort).toBe('level')

  press(ctx, 'r')

  expect(ctx.mode).toBe('trade')

  ctx.closeTrade()
  press(ctx, 't')

  expect(ctx.mode, 'and a box Pokemon can be given away').toBe('trade')
  expect(
    ctx.tradeGiving.mon.species,
    'the cursor stayed on the one it was on before the sort',
  ).toBe(16)
})

test('Should move around the bag and put it away again', () => {
  const ctx = aGame()

  ctx.setMode('team')
  ctx.openBag(0)

  press(ctx, 'down')

  expect(ctx.bagSelection).toBe(1)

  press(ctx, 'up', 'k')

  expect(ctx.bagSelection).toBeGreaterThanOrEqual(0)

  clicks(ctx, 0)
  press(ctx, 'i')

  expect(ctx.bagSelection, 'the bag closes').toBeNull()
})

test('Should move between the day care slots and back out of the picker', () => {
  const ctx = withCompany(aGame())

  ctx.openDaycare('home')
  press(ctx, 'down')

  expect(ctx.daycareSelection).toBe(1)

  press(ctx, 'up', 'enter')

  expect(ctx.daycareStep).toBe('pick')

  press(ctx, 'down', 'up', 'j')

  expect(ctx.daycarePickSelection).toBeGreaterThan(0)

  clicks(ctx, 0)

  expect(ctx.daycarePickSelection).toBe(0)

  press(ctx, 'esc')

  expect(ctx.daycareStep).toBe('slots')

  press(ctx, 'esc')

  expect(ctx.mode).toBe('home')
})

test('Should browse the shop and leave without buying', () => {
  const ctx = aGame()

  ctx.openHomeSelection('shop')
  press(ctx, 'down', 'down')

  expect(ctx.shopSelection).toBe(2)

  press(ctx, 'up', 'k')

  expect(ctx.shopSelection).toBe(0)

  clicks(ctx, 3)

  expect(ctx.shopSelection).toBe(3)

  press(ctx, 'esc')

  expect(ctx.mode).toBe('home')
})

test('Should browse the gyms and leave the list alone', () => {
  const ctx = aGame()

  ctx.setMode('gyms')
  press(ctx, 'down', 'right')

  expect(ctx.gymSelection).toBe(2)

  press(ctx, 'up', 'left')

  expect(ctx.gymSelection).toBe(0)

  clicks(ctx, GYMS.length - 1)

  expect(ctx.gymSelection).toBe(GYMS.length - 1)

  press(ctx, 'esc')

  expect(ctx.mode).toBe('home')
})

test('Should pick a lead and open the bag from inside a gym', () => {
  const ctx = withCompany(aGame())

  ctx.startGymRun('pewter')
  press(ctx, 'down')

  expect(ctx.teamSelection).toBe(1)

  press(ctx, 'l')

  expect(ctx.save.party[0].species, 'l makes it the lead').toBe(25)

  press(ctx, 'i')

  expect(ctx.bagSelection).toBe(0)

  press(ctx, 'esc')
  press(ctx, 'up', 'k')

  expect(ctx.teamSelection).toBe(0)
})

test('Should back out of a trade rather than make the code', () => {
  const ctx = withCompany(aGame())

  ctx.askToGiveAway({
    from: 'team',
    source: 'party',
    index: 1,
    mon: ctx.save.party[1],
  })

  press(ctx, 'esc')

  expect(ctx.mode).toBe('team')
  expect(ctx.save.party, 'it stayed').toHaveLength(2)
})

test('Should type a name letter by letter and rub one out again', () => {
  const ctx = aGame()

  ctx.save = null
  ctx.mode = 'starter'

  press(ctx, 'a', 's', 'h')

  expect(ctx.setup.name).toBe('ash')

  activeView(ctx).onKey(ctx, { name: 'h', shift: true })

  expect(ctx.setup.name).toBe('ashH')

  press(ctx, 'backspace', 'backspace')

  expect(ctx.setup.name).toBe('as')

  press(ctx, 'enter', 'left')

  expect(ctx.setup.selection).toBe(0)

  clicks(ctx, 2)

  expect(ctx.setup.selection).toBe(2)
})

test('Should move down the options and back up again', () => {
  const ctx = aGame()

  ctx.openHomeSelection('options')
  press(ctx, 'down', 'down')

  expect(ctx.optionsSelection).toBe(2)

  press(ctx, 'up', 'k')

  expect(ctx.optionsSelection).toBe(0)

  clicks(ctx, 1)

  expect(ctx.optionsSelection).toBe(1)

  press(ctx, 'esc')

  expect(ctx.mode).toBe('home')
})

test('Should read down the achievements and back out to the home menu', () => {
  const ctx = aGame()

  ctx.openHomeSelection('trainer')
  press(ctx, 'down', 'down')

  expect(ctx.trainerSelection).toBe(2)

  press(ctx, 'up', 'k')

  expect(ctx.trainerSelection).toBe(0)

  clicks(ctx, 3)

  expect(ctx.trainerSelection).toBe(3)

  press(ctx, 'esc')

  expect(ctx.mode).toBe('home')
  expect(ctx.homeSelection).toBe(0)
})
