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
    askForTradeCode: vi.fn(() =>
      Promise.resolve({ code: 'CMON1-abc', path: '/tmp/trade.txt' }),
    ),
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

test('Should point at the update on the home screen, and say to relaunch for one already on the disk', () => {
  const available = aGame({ notice: { kind: 'available', version: '9.9.9' } })

  expect(screen(available)).toContain('[u] update')

  const stale = aGame({ notice: { kind: 'stale', version: '9.9.9' } })
  const markup = screen(stale)

  expect(markup).toContain('is installed')
  expect(markup, 'there is nothing left to fetch').not.toContain('[u] update')
})

test('Should grey out a fainted Pokemon in the team and mark a shiny one', () => {
  const ctx = aGame()

  ctx.save.party[0].hp = 0
  ctx.save.party.push(createPokemon(25, 9, makeRng(3), true))
  ctx.setMode('team')
  ctx.teamSelection = 1

  const markup = screen(ctx)

  expect(markup).toContain('list__row--fainted')
  expect(markup).toContain('tag--shiny')
})

test('Should show what waits in the box next to the one the cursor is on', () => {
  const ctx = aGame()

  ctx.save.box.push(createPokemon(16, 12, makeRng(4)))
  ctx.openBox()

  const markup = screen(ctx)

  expect(markup).toContain('PIDGEY')
  expect(markup).toContain('/sprites/front/16.png')
  expect(markup).not.toContain('The box is empty.')
})

test('Should hand the code over once the trade has gone through', async () => {
  const ctx = aGame()

  ctx.save.party.push(createPokemon(25, 9, makeRng(3)))
  ctx.askToGiveAway({
    from: 'team',
    source: 'party',
    index: 1,
    mon: ctx.save.party[1],
  })

  await ctx.giveSelectedAway()

  const markup = screen(ctx)

  expect(markup).toContain('CMON1-abc')
  expect(markup).toContain('/tmp/trade.txt')
  expect(markup).toContain('is on its way')
})

test('Should copy the code again when asked, and close the screen on escape', async () => {
  const ctx = aGame()
  const writeText = vi.fn(() => Promise.resolve())

  vi.stubGlobal('navigator', { clipboard: { writeText } })

  ctx.save.party.push(createPokemon(25, 9, makeRng(3)))
  ctx.askToGiveAway({
    from: 'team',
    source: 'party',
    index: 1,
    mon: ctx.save.party[1],
  })

  await ctx.giveSelectedAway()

  expect(
    writeText,
    'it copies as soon as the code exists',
  ).toHaveBeenCalledWith('CMON1-abc')

  activeView(ctx).onKey(ctx, { name: 'c' })

  expect(writeText).toHaveBeenCalledTimes(2)

  activeView(ctx).onKey(ctx, { name: 'esc' })

  expect(ctx.mode).toBe('team')

  vi.unstubAllGlobals()
})

test('Should say a Pokemon has been seen but not caught in the dex', () => {
  const ctx = aGame()

  ctx.save.dex.seen.push(16)
  ctx.setMode('dex')
  ctx.dexSelection = 15

  const markup = screen(ctx)

  expect(markup).toContain('Seen, but not yet caught.')
  expect(markup).toContain('Catch one to fill in its entry.')
})

test('Should tell the day care that a pair might get on, and that one alone will not', () => {
  const ctx = aGame()

  ctx.save.party.push(createPokemon(25, 9, makeRng(3)))
  ctx.save.party.push(createPokemon(26, 9, makeRng(4)))
  ctx.openDaycare('home')

  expect(screen(ctx)).toContain('Leave two here and they might get on.')

  ctx.leaveAtDaycare('party', 1)
  ctx.leaveAtDaycare('party', 1)

  expect(screen(ctx)).toMatch(/get on|prefer to play/)
})

test('Should draw the egg with how far along it is', () => {
  const ctx = aGame()

  ctx.save.daycare.egg = { species: 25, steps: 40, shiny: false }
  ctx.openDaycare('home')

  const markup = screen(ctx)

  expect(markup).toContain('/sprites/front/egg.png')
  expect(markup).toContain('Something is moving inside.')
  expect(markup).toContain('40 steps')
})
