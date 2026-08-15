import { expect, test, vi } from 'vitest'
import { DEFAULT_CONFIG } from '../../../src/constants.mjs'
import { makeRng } from '../../../src/rng.mjs'
import { createSave } from '../../../src/state.mjs'
import { markupOf } from '../dom.mjs'
import { createStore } from '../store.mjs'
import {
  ballPosition,
  currentBallStep,
  draw,
  menuLength,
  onKey,
} from './battle.mjs'

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

const inBattle = () => {
  const ctx = createStore({
    bootstrap: {
      version: '2.0.0',
      save: createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) }),
      config: { ...DEFAULT_CONFIG, sound: false },
      worked: { totalMs: 0, updatedAt: null },
      activity: { state: 'idle', tool: null, since: null, sessions: 1 },
      encounter: {
        kind: 'wild',
        species: 16,
        name: 'pidgey',
        level: 5,
        trainer: null,
        seed: 7,
        shiny: false,
        expiresAt: Date.now() + 30_000,
      },
      notice: null,
    },
    api: stubApi(),
    sound: { play: vi.fn(), startMusic: vi.fn(), stopMusic: vi.fn() },
    onChange: vi.fn(),
  })

  ctx.startNextBattle()

  return ctx
}

const clearMessages = (ctx) => {
  while (ctx.battle.message) ctx.advanceMessage()
}

test('Should open on the intro, then hand the player the four battle options', () => {
  const ctx = inBattle()

  expect(markupOf(draw(ctx))).toContain('A wild PIDGEY appeared!')

  clearMessages(ctx)

  const markup = markupOf(draw(ctx))

  expect(markup).toContain('What will BULBASAUR do?')
  expect(markup).toContain('FIGHT')
  expect(markup).toContain('RUN')
  expect(menuLength(ctx)).toBe(4)
})

test('Should list the moves with their PP once FIGHT is chosen', () => {
  const ctx = inBattle()

  clearMessages(ctx)
  onKey(ctx, { name: 'enter' })

  const markup = markupOf(draw(ctx))

  expect(ctx.battle.menu).toBe('fight')
  expect(markup).toContain('Tackle')
  expect(markup).toContain('PP')
  expect(menuLength(ctx)).toBe(ctx.battle.state.player.mon.moves.length)

  onKey(ctx, { name: 'esc' })

  expect(ctx.battle.menu, 'and escape goes back').toBe('main')
})

test('Should show both sides with their HP and the sprites facing each other', () => {
  const ctx = inBattle()

  clearMessages(ctx)

  const markup = markupOf(draw(ctx))

  expect(markup).toContain('PIDGEY')
  expect(markup).toContain('BULBASAUR')
  expect(markup).toContain('/sprites/front/16.png')
  expect(markup).toContain('/sprites/back/1.png')
  expect(markup).toContain('class="hp__fill"')
})

test('Should throw the ball across the field and hold it over the foe once it lands', () => {
  expect(ballPosition({ kind: 'throw', t: 0 }).left).toBe(18)
  expect(ballPosition({ kind: 'throw', t: 1 }).left).toBe(72)
  expect(
    ballPosition({ kind: 'throw', t: 0.5 }).top,
    'and arcs over the middle',
  ).toBeLessThan(ballPosition({ kind: 'throw', t: 0 }).top)
  expect(ballPosition({ kind: 'shake' })).toEqual({ left: 72, top: 28 })
  expect(currentBallStep({ ball: null })).toBeNull()
})

test('Should hide the foe while it is inside the ball', () => {
  const ctx = inBattle()

  clearMessages(ctx)

  ctx.battle.ball = { frame: 9, shakes: 3, caught: false }

  const step = currentBallStep(ctx.battle)

  expect(step.hideFoe).toBe(true)
  expect(markupOf(draw(ctx))).toContain('data-hidden="true"')
})
