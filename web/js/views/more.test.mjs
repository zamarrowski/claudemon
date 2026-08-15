import { expect, test, vi } from 'vitest'
import { DAYCARE_LIMIT, DEFAULT_CONFIG } from '../../../src/constants.mjs'
import { createPokemon } from '../../../src/pokemon.mjs'
import { makeRng } from '../../../src/rng.mjs'
import { createSave } from '../../../src/state.mjs'
import { markupOf } from '../dom.mjs'
import { createStore } from '../store.mjs'
import { menuLength } from './battle.mjs'
import { closingLines } from './update.mjs'
import { activeView } from './router.mjs'

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

const aGame = (over) => {
  return createStore({
    bootstrap: {
      version: '2.0.0',
      save: createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) }),
      config: { ...DEFAULT_CONFIG },
      worked: { totalMs: 0, updatedAt: null },
      activity: { state: 'idle', tool: null, since: null, sessions: 1 },
      encounter: null,
      notice: null,
      ...over,
    },
    api: stubApi(),
    sound: { play: vi.fn(), startMusic: vi.fn(), stopMusic: vi.fn() },
    onChange: vi.fn(),
    closeWindow: vi.fn(),
  })
}

const aWild = () => {
  return {
    kind: 'wild',
    species: 10,
    name: 'caterpie',
    level: 3,
    trainer: null,
    seed: 5,
    shiny: false,
    expiresAt: Date.now() + 30_000,
  }
}

const press = (ctx, ...names) => {
  for (const name of names) activeView(ctx).onKey(ctx, { name, shift: false })
}

const screen = (ctx) => markupOf(activeView(ctx).draw(ctx)).replace(/\s+/g, ' ')

test('Should walk the move list sideways and back out to the main menu', () => {
  const ctx = aGame({ encounter: aWild() })

  ctx.startNextBattle()

  while (ctx.battle.message) ctx.advanceMessage()

  press(ctx, 'enter')

  expect(ctx.battle.menu).toBe('fight')

  press(ctx, 'right')

  expect(ctx.battle.selection).toBe(1)

  press(ctx, 'left', 'up')

  expect(ctx.battle.selection).toBeGreaterThanOrEqual(0)

  press(ctx, 'esc')

  expect(ctx.battle.menu).toBe('main')
  expect(menuLength({ battle: { menu: 'nothing-like-that' } })).toBe(0)
})

test('Should keep the last Pokemon out of the box as well as out of a trade', () => {
  const ctx = aGame()

  ctx.setMode('team')
  press(ctx, 'd')

  expect(ctx.save.party).toHaveLength(1)
  expect(ctx.boxMessage).toMatch(/last/i)

  activeView(ctx).select(ctx, 0)

  expect(ctx.boxMessage, 'moving the cursor clears what it said').toBeNull()
})

test('Should turn a third Pokemon away from the day care', () => {
  const ctx = aGame()

  for (let extra = 0; extra < 3; extra++)
    ctx.save.party.push(createPokemon(16, 5, makeRng(extra)))

  ctx.openDaycare('home')

  for (let slot = 0; slot < DAYCARE_LIMIT; slot++)
    ctx.leaveAtDaycare('party', 1)

  expect(ctx.save.daycare.slots).toHaveLength(DAYCARE_LIMIT)

  ctx.leaveAtDaycare('party', 1)

  expect(ctx.save.daycare.slots).toHaveLength(DAYCARE_LIMIT)
  expect(ctx.daycareMessage).toMatch(/both|full|taken/i)
})

test('Should type a trade code in and rub it out again', () => {
  const ctx = aGame()

  ctx.openTradeReceive('team')

  press(ctx, 'c', 'm', 'o', 'n')

  expect(ctx.tradeInput).toBe('cmon')

  press(ctx, 'backspace')

  expect(ctx.tradeInput).toBe('cmo')

  activeView(ctx).onKey(ctx, { name: '1', shift: true })

  expect(ctx.tradeInput).toBe('cmo1')

  ctx.tradeStep = 'confirm'
  activeView(ctx).onPaste(ctx, 'CMON1-x')

  expect(ctx.tradeInput, 'a paste only lands on the receive step').toBe('cmo1')
})

test('Should say the update changed nothing when it was already the newest', () => {
  expect(
    closingLines({ state: 'done', from: '2.0.0', to: '2.0.0' }).join(' '),
  ).toMatch(/newest/)
  expect(
    closingLines({ state: 'done', from: '2.0.0', to: null }).join(' '),
  ).toMatch(/newest/)
  expect(closingLines({ state: 'running', from: '2.0.0', to: null })).toEqual(
    [],
  )
})

test('Should hold the gym run until it is walked out of twice', () => {
  const ctx = aGame()

  ctx.startGymRun('pewter')

  const money = ctx.save.money

  ctx.save.money = 0

  press(ctx, 'esc')

  expect(ctx.gymLeaving).toBe(true)

  press(ctx, 'down')

  expect(ctx.gymLeaving, 'any other key stays in').toBe(false)

  press(ctx, 'esc', 'esc')

  expect(ctx.mode).toBe('gyms')
  expect(ctx.save.money, 'the whole run is undone').toBe(money)
})

test('Should say nothing is in the bag inside a gym with an empty one', () => {
  const ctx = aGame()

  ctx.save.bag = {}
  ctx.startGymRun('pewter')

  press(ctx, 'i')

  expect(ctx.bagSelection).toBeNull()
  expect(ctx.bagMessage).toMatch(/empty/i)
  expect(screen(ctx)).toContain('empty')
})

test('Should say how long ago Claude last did something, however it is reported', async () => {
  const { activityLabel } = await import('./home.mjs')
  const now = Date.now()

  expect(activityLabel(null)).toBeNull()
  expect(
    activityLabel({ state: 'idle', tool: null, since: null, sessions: 1 }).age,
  ).toBeNull()
  expect(
    activityLabel(
      { state: 'waiting', tool: 'Bash', since: now, sessions: 1 },
      now,
    ).tool,
    'only work names a tool',
  ).toBeNull()
})

test('Should mark the achievements that have been earned', async () => {
  const ctx = aGame()

  ctx.save.achievements = [
    { id: 'first-catch', earnedAt: '2026-01-01T00:00:00.000Z' },
  ]
  ctx.openHomeSelection('trainer')

  const markup = screen(ctx)

  expect(markup).toContain('●')
  expect(markup).toContain('○')
})

test('Should draw a Pokemon with no gender and one that has one', async () => {
  const ctx = aGame()

  ctx.save.party.push(createPokemon(132, 10, makeRng(2)))
  ctx.setMode('team')
  ctx.teamSelection = 1

  expect(screen(ctx)).toContain('—')

  ctx.teamSelection = 0

  expect(screen(ctx)).toMatch(/BULBASAUR/)
})
