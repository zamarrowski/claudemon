import { expect, test, vi } from 'vitest'
import { DEFAULT_CONFIG } from '../../../src/constants.mjs'
import { createPokemon } from '../../../src/pokemon.mjs'
import { makeRng } from '../../../src/rng.mjs'
import { createSave } from '../../../src/state.mjs'
import { markupOf } from '../dom.mjs'
import { createStore } from '../store.mjs'
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

const screen = (ctx) => markupOf(activeView(ctx).draw(ctx)).replace(/\s+/g, ' ')

test('Should say the team is empty when everything is in the box', () => {
  const ctx = aGame()

  ctx.save.box.push(ctx.save.party.pop())
  ctx.setMode('team')

  expect(screen(ctx)).toContain('You have no Pokémon.')

  activeView(ctx).onKey(ctx, { name: 'down' })

  expect(ctx.teamSelection, 'and there is nothing to move onto').toBe(0)
})

test('Should keep the fight off the menu when the whole team is down', () => {
  const ctx = aGame({
    encounter: {
      kind: 'wild',
      species: 16,
      name: 'pidgey',
      level: 5,
      trainer: null,
      seed: 1,
      shiny: false,
      expiresAt: Date.now() + 5000,
    },
  })

  ctx.save.party[0].hp = 0

  expect(screen(ctx), 'the fight is offered but greyed out').toContain(
    'disabled',
  )

  activeView(ctx).onKey(ctx, { name: 'enter' })

  expect(ctx.mode, 'there is nobody to send out').toBe('home')
  expect(ctx.battle).toBeNull()

  ctx.startNextBattle()

  expect(ctx.notice, 'and it says why').toMatch(/fainted/i)
})

test('Should show what the game just said under the menu', () => {
  const ctx = aGame()

  ctx.notice = 'Your team and box are back to full health.'

  expect(screen(ctx)).toContain('back to full health')
})

test('Should mark the foe as one already in the dex, and flash it when it is hit', () => {
  const ctx = aGame({
    encounter: {
      kind: 'wild',
      species: 1,
      name: 'bulbasaur',
      level: 3,
      trainer: null,
      seed: 2,
      shiny: false,
      expiresAt: Date.now() + 5000,
    },
  })

  ctx.startNextBattle()

  while (ctx.battle.message) ctx.advanceMessage()

  expect(screen(ctx), 'the dex mark is on the nameplate').toContain('◓')

  ctx.battle.effect = { side: 'foe', frame: 0 }

  expect(screen(ctx)).toContain('data-hit="true"')

  ctx.battle.state.foe.mon.status = 'poison'

  expect(screen(ctx)).toContain('tag--status')
})

test('Should point at the next message when there are more to come', () => {
  const ctx = aGame({
    encounter: {
      kind: 'wild',
      species: 1,
      name: 'bulbasaur',
      level: 3,
      trainer: null,
      seed: 2,
      shiny: true,
      expiresAt: Date.now() + 5000,
    },
  })

  ctx.startNextBattle()

  expect(ctx.battle.events.length).toBeGreaterThan(0)
  expect(screen(ctx)).toContain('press any key')
})

test('Should open every screen the home menu offers', () => {
  const ctx = aGame()

  for (const [id, mode] of [
    ['dex', 'dex'],
    ['team', 'team'],
    ['daycare', 'daycare'],
    ['gyms', 'gyms'],
    ['shop', 'shop'],
    ['options', 'options'],
    ['trainer', 'trainer'],
  ]) {
    ctx.openHomeSelection(id)

    expect(ctx.mode, `${id} opens`).toBe(mode)

    ctx.setMode('home')
  }

  ctx.openHomeSelection('nothing-like-that')

  expect(ctx.mode, 'and an unknown one changes nothing').toBe('home')
})

test('Should show the gym roster with the one that comes next marked', () => {
  const ctx = aGame()

  ctx.save.party.push(createPokemon(6, 40, makeRng(9)))
  ctx.startGymRun('pewter')

  const markup = screen(ctx)

  expect(markup).toContain('▶')
  expect(markup).toContain('·')
  expect(markup).toContain('In your bag')
})
