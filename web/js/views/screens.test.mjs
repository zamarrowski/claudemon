import { expect, test, vi } from 'vitest'
import { DEFAULT_CONFIG, GYMS, STARTERS } from '../../../src/constants.mjs'
import { createPokemon } from '../../../src/pokemon.mjs'
import { makeRng } from '../../../src/rng.mjs'
import { createSave } from '../../../src/state.mjs'
import { markupOf } from '../dom.mjs'
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

const aGame = (save = null) => {
  return createStore({
    bootstrap: {
      version: '2.0.0',
      save:
        save ?? createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) }),
      config: { ...DEFAULT_CONFIG },
      worked: { totalMs: 7_200_000, updatedAt: null },
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

const screen = (ctx) => markupOf(activeView(ctx).draw(ctx))

const press = (ctx, ...names) => {
  for (const name of names) activeView(ctx).onKey(ctx, { name, shift: false })
}

test('Should ask for a name first and only then offer the three starters', () => {
  const ctx = aGame()

  ctx.save = null
  ctx.mode = 'starter'

  expect(screen(ctx)).toContain('What should people call you?')

  press(ctx, 'enter')

  expect(ctx.setup.step, 'a blank name gets you nowhere').toBe('name')

  press(ctx, 'a', 'b', 'enter')

  const choices = screen(ctx)

  expect(ctx.setup.step).toBe('starter')

  for (const id of STARTERS)
    expect(choices).toContain(`/sprites/front/${id}.png`)
})

test('Should hide the name of a Pokemon nobody has seen and fill it in once caught', () => {
  const ctx = aGame()

  ctx.setMode('dex')

  const markup = screen(ctx)

  expect(markup).toContain('Bulbasaur')
  expect(markup).toContain('-----')
  expect(markup).toContain('data-state="unseen"')
  expect(markup).toContain('data-state="caught"')
})

test('Should jump a page down the dex and back to the top', () => {
  const ctx = aGame()

  ctx.setMode('dex')
  press(ctx, 'pagedown')

  expect(ctx.dexSelection).toBe(12)

  press(ctx, 'pageup', 'pageup')

  expect(ctx.dexSelection).toBe(0)

  press(ctx, 's')

  expect(ctx.dexSort, 'and sorts by name').toBe('name')
  expect(screen(ctx)).toContain('A–Z')
})

test('Should mark the lead of the team and show what the cursor is on', () => {
  const ctx = aGame()

  ctx.save.party.push(createPokemon(25, 30, makeRng(3)))
  ctx.setMode('team')

  const markup = screen(ctx)

  expect(markup).toContain('★ BULBASAUR')
  expect(markup, 'the detail panel follows the cursor').toContain(
    '/sprites/front/1.png',
  )

  press(ctx, 'down', 'enter')

  expect(ctx.save.party[0].species, 'enter makes it the lead').toBe(25)
})

test('Should say the box is empty before anything has been sent to it', () => {
  const ctx = aGame()

  ctx.openBox()

  expect(screen(ctx)).toContain('The box is empty.')
})

test('Should list the bag and refuse an item the party cannot use', () => {
  const ctx = aGame()

  ctx.setMode('team')
  ctx.openBag(0)

  expect(screen(ctx)).toContain('Poké Ball')

  press(ctx, 'enter')

  expect(ctx.bagMessage).toMatch(/Save the Poké Ball/)
})

test('Should keep the day care empty until a Pokemon is left there', () => {
  const ctx = aGame()

  ctx.save.party.push(createPokemon(25, 9, makeRng(3)))
  ctx.openDaycare('home')

  expect(screen(ctx)).toContain('— nobody here —')
  expect(screen(ctx)).toContain('No egg yet.')

  press(ctx, 'enter')

  expect(ctx.daycareStep).toBe('pick')

  press(ctx, 'down', 'enter')

  expect(ctx.save.daycare.slots).toHaveLength(1)
  expect(screen(ctx)).toContain('PIKACHU')
})

test('Should price the shop and buy five at once', () => {
  const ctx = aGame()

  ctx.openHomeSelection('shop')

  expect(screen(ctx)).toContain('Poké Ball')
  expect(screen(ctx)).toContain('200₽')

  const before = ctx.save.money

  press(ctx, '5')

  expect(ctx.save.money).toBe(before - 1000)
  expect(ctx.shopMessage).toMatch(/Bought 5/)
})

test('Should say a purchase is off when there is not enough money', () => {
  const ctx = aGame()

  ctx.save.money = 0
  ctx.openHomeSelection('shop')
  press(ctx, 'enter')

  expect(ctx.shopMessage).toMatch(/afford/i)
  expect(ctx.save.bag['poke-ball']).toBe(5)
})

test('Should list every gym with its badge and what is still to win', () => {
  const ctx = aGame()

  ctx.setMode('gyms')

  const markup = screen(ctx)

  for (const gym of GYMS) expect(markup).toContain(gym.city)

  expect(markup).toContain('Not yet won.')
  expect(markup).toContain(`0/${GYMS.length} badges`)
})

test('Should walk into a gym and hold the run until the first battle', () => {
  const ctx = aGame()

  ctx.setMode('gyms')
  press(ctx, 'enter')

  expect(ctx.mode).toBe('gym')
  expect(screen(ctx)).toContain('Gauntlet')
  expect(screen(ctx)).toContain('Boulder Badge')

  press(ctx, 'esc')

  expect(screen(ctx), 'and asks twice before giving up').toContain(
    'Walk out and none of it counted.',
  )

  press(ctx, 'esc')

  expect(ctx.mode).toBe('gyms')
  expect(ctx.gym).toBeNull()
})

test('Should warn that a trade is one way before making the code', () => {
  const ctx = aGame()

  ctx.save.party.push(createPokemon(25, 9, makeRng(3)))
  ctx.askToGiveAway({
    from: 'team',
    source: 'party',
    index: 1,
    mon: ctx.save.party[1],
  })

  const markup = screen(ctx)

  expect(markup).toContain('One way')
  expect(markup).toContain('leaves your game the moment the code exists.')
  expect(markup).toContain('PIKACHU')
})

test('Should say why a pasted code will not read', async () => {
  const ctx = aGame()

  ctx.openTradeReceive('team')

  expect(screen(ctx)).toContain('Paste the code you were given.')

  press(ctx, 'x', 'y')

  expect(ctx.tradeInput).toBe('xy')

  activeView(ctx).onPaste(ctx, '  CMON1-nope  ')

  expect(ctx.tradeInput).toBe('CMON1-nope')

  await ctx.takeInCode()

  expect(ctx.tradeMessage).toBe('nope')
})

test('Should count the record and the achievements on the trainer card', () => {
  const ctx = aGame()

  ctx.openHomeSelection('trainer')

  const markup = screen(ctx)

  expect(markup).toContain('ASH')
  expect(markup).toContain('Caught')
  expect(markup).toContain('1/151')
  expect(markup).toContain('2h')
  expect(markup).toContain('First catch')
})

test('Should ask the server for a card and say where it landed', async () => {
  const ctx = aGame()

  ctx.openHomeSelection('trainer')

  await ctx.exportCard()

  expect(ctx.notice).toContain('/tmp/card.png')
})

test('Should turn the sound off from the options and keep the rest as it was', async () => {
  const ctx = aGame()

  ctx.openHomeSelection('options')

  expect(screen(ctx)).toContain('SOUND')

  press(ctx, 'right')

  await vi.waitFor(() => expect(ctx.config.sound).toBe(false))

  expect(ctx.config.bell, 'the bell is its own switch').toBe(true)
  expect(screen(ctx)).toContain('OFF')
})

test('Should walk the update screen from running to what is left to do by hand', () => {
  const ctx = aGame()

  ctx.setMode('update')
  ctx.receiveUpdateRun({
    kind: 'plugin',
    state: 'running',
    from: '1.0.0',
    to: null,
    steps: [
      {
        id: 'pull',
        label: 'Pulling',
        done: 'Pulled',
        status: 'running',
        detail: null,
      },
    ],
  })

  expect(screen(ctx)).toContain('Pulling')
  expect(screen(ctx)).toContain('cannot be interrupted')

  press(ctx, 'esc')

  expect(ctx.mode, 'a running update cannot be walked out of').toBe('update')

  ctx.receiveUpdateRun({
    kind: 'plugin',
    state: 'done',
    from: '1.0.0',
    to: '2.0.0',
    steps: [
      {
        id: 'pull',
        label: 'Pulling',
        done: 'Pulled',
        status: 'ok',
        detail: null,
      },
    ],
  })

  expect(screen(ctx)).toContain('Restart Claude Code')

  press(ctx, 'esc')

  expect(ctx.mode).toBe('home')
})

test('Should say the update failed without pretending anything was half-installed', () => {
  const ctx = aGame()

  ctx.setMode('update')
  ctx.receiveUpdateRun({
    kind: 'clone',
    state: 'failed',
    from: '1.0.0',
    to: null,
    steps: [
      {
        id: 'pull',
        label: 'Pulling',
        done: 'Pulled',
        status: 'failed',
        detail: 'no git here',
      },
    ],
  })

  const markup = screen(ctx)

  expect(markup).toContain('no git here')
  expect(markup).toContain('still works.')
  expect(markup).toContain('every step here is one that can be run again')
})
