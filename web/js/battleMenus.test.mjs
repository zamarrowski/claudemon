import { expect, test, vi } from 'vitest'
import { DEFAULT_CONFIG } from '../../src/constants.mjs'
import { createPokemon, displayName } from '../../src/pokemon.mjs'
import { makeRng } from '../../src/rng.mjs'
import { createSave } from '../../src/state.mjs'
import { markupOf } from './dom.mjs'
import { createStore } from './store.mjs'
import { draw, onKey } from './views/battle.mjs'

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

const aGame = (encounter) => {
  return createStore({
    bootstrap: {
      version: '2.0.0',
      save: createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) }),
      config: { ...DEFAULT_CONFIG },
      worked: { totalMs: 0, updatedAt: null },
      activity: { state: 'idle', tool: null, since: null, sessions: 1 },
      encounter,
      notice: null,
    },
    api: stubApi(),
    sound: { play: vi.fn(), startMusic: vi.fn(), stopMusic: vi.fn() },
    onChange: vi.fn(),
    closeWindow: vi.fn(),
  })
}

const aWild = (over) => {
  return {
    kind: 'wild',
    species: 10,
    name: 'caterpie',
    level: 3,
    trainer: null,
    seed: 5,
    shiny: false,
    expiresAt: Date.now() + 30_000,
    ...over,
  }
}

const aTrainer = () => {
  return {
    kind: 'trainer',
    species: null,
    name: null,
    level: null,
    trainer: {
      class: 'Hiker',
      name: 'Wade',
      sprite: 'hiker',
      team: [{ species: 74, level: 4 }],
    },
    seed: 3,
    shiny: false,
    expiresAt: Date.now() + 30_000,
  }
}

const settle = (ctx) => {
  for (let guard = 0; guard < 200 && ctx.battle?.message; guard++)
    ctx.advanceMessage()
}

const openMenu = (ctx, index) => {
  settle(ctx)
  ctx.battle.selection = index
  onKey(ctx, { name: 'enter' })
}

test('Should switch to another Pokemon and let the foe move first', () => {
  const ctx = aGame(aWild())

  ctx.save.party.push(createPokemon(25, 20, makeRng(3)))
  ctx.startNextBattle()

  openMenu(ctx, 2)

  expect(ctx.battle.menu).toBe('party')
  expect(markupOf(draw(ctx))).toContain('Switch to which Pokémon?')

  ctx.battle.selection = 1
  onKey(ctx, { name: 'enter' })

  expect(ctx.save.party[0].species, 'the switch changes the lead').toBe(25)
  expect(ctx.battle.state.player.mon.species).toBe(25)
})

test('Should turn down a switch to the Pokemon already out', () => {
  const ctx = aGame(aWild())

  ctx.startNextBattle()
  openMenu(ctx, 2)

  ctx.battle.selection = 0
  onKey(ctx, { name: 'enter' })

  expect(ctx.battle.message).toMatch(/already out/i)
})

test('Should use a potion on the Pokemon it is chosen for', () => {
  const ctx = aGame(aWild())

  ctx.save.bag.potion = 1
  ctx.save.party[0].hp = 1
  ctx.startNextBattle()

  openMenu(ctx, 1)

  expect(ctx.battle.menu).toBe('bag')

  ctx.battle.selection = ctx.battle.bagItems.indexOf('potion')
  onKey(ctx, { name: 'enter' })

  expect(ctx.battle.menu).toBe('target')
  expect(markupOf(draw(ctx))).toContain('on which Pokémon?')

  onKey(ctx, { name: 'enter' })
  settle(ctx)

  expect(ctx.save.party[0].hp).toBeGreaterThan(1)
})

test('Should back out of the target list to the bag it came from', () => {
  const ctx = aGame(aWild())

  ctx.save.bag.potion = 1
  ctx.startNextBattle()
  openMenu(ctx, 1)

  ctx.battle.selection = ctx.battle.bagItems.indexOf('potion')
  onKey(ctx, { name: 'enter' })

  expect(ctx.battle.menu).toBe('target')

  onKey(ctx, { name: 'esc' })

  expect(ctx.battle.menu).toBe('bag')
  expect(ctx.battle.bagItem).toBeNull()
})

test('Should say the bag is empty in a battle with nothing to use', () => {
  const ctx = aGame(aTrainer())

  ctx.save.bag = {}
  ctx.startNextBattle()
  openMenu(ctx, 1)

  expect(markupOf(draw(ctx))).toContain('Your bag is empty.')
})

test('Should run from a wild Pokemon and count the run', () => {
  const ctx = aGame(aWild())

  ctx.save.party[0] = createPokemon(6, 50, makeRng(9))
  ctx.startNextBattle()
  openMenu(ctx, 3)
  settle(ctx)

  expect(ctx.mode).toBe('home')
  expect(ctx.save.stats.runs).toBe(1)
})

test('Should refuse to run from a trainer and show them holding their team', () => {
  const ctx = aGame(aTrainer())

  ctx.startNextBattle()

  expect(markupOf(draw(ctx)), 'the trainer is on screen first').toContain(
    '/sprites/trainers/hiker.png',
  )

  openMenu(ctx, 3)

  expect(ctx.mode, 'there is no running from a trainer').toBe('battle')
  expect(ctx.save.stats.runs).toBe(0)
})

test('Should show the ball tray for a trainer once their Pokemon is out', () => {
  const ctx = aGame(aTrainer())

  ctx.startNextBattle()
  settle(ctx)

  const markup = markupOf(draw(ctx))

  expect(markup).toContain('gb__tray')
  expect(markup).toContain(displayName(ctx.battle.foeMon).toUpperCase())
})

test('Should run the ball animation frame by frame until it settles', () => {
  const ctx = aGame(aWild())

  ctx.save.bag['master-ball'] = 1
  ctx.startNextBattle()
  settle(ctx)

  openMenu(ctx, 1)

  ctx.battle.selection = ctx.battle.bagItems.indexOf('master-ball')
  onKey(ctx, { name: 'enter' })

  expect(ctx.battle.ball, 'the ball is in the air').toBeTruthy()

  const frames = []

  for (let tick = 0; tick < 40 && ctx.battle?.ball; tick++) {
    frames.push(ctx.battle.ball.frame)
    ctx.tickBattle()
  }

  expect(frames.length).toBeGreaterThan(1)
  expect(Math.max(...frames)).toBeGreaterThan(0)
  expect(ctx.battle.ball.done, 'and comes to rest').toBe(true)
})

test('Should drain the HP bar towards where it really is', () => {
  const ctx = aGame(aWild())

  ctx.startNextBattle()
  settle(ctx)

  ctx.battle.hp.foe = ctx.battle.state.foe.mon.stats.hp
  ctx.battle.hpTarget.foe = 0

  const moved = ctx.tickBattle()

  expect(moved).toBe(true)
  expect(ctx.battle.hp.foe).toBeLessThan(ctx.battle.state.foe.mon.stats.hp)
})

test('Should throw the player out of a gym they lose in, and undo the run', () => {
  const ctx = aGame(null)

  ctx.save.party[0].hp = 1
  ctx.startGymRun('pewter')

  const before = ctx.save.party[0].hp

  ctx.startGymBattle()

  for (let turn = 0; turn < 40 && ctx.mode === 'battle'; turn++) {
    if (ctx.battle.message) {
      ctx.advanceMessage()
      continue
    }

    onKey(ctx, { name: 'enter' })
    onKey(ctx, { name: 'enter' })
  }

  expect(ctx.mode).toBe('gyms')
  expect(ctx.gym).toBeNull()
  expect(ctx.save.party[0].hp, 'the run is rolled back whole').toBe(before)
})
