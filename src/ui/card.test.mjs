import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { useSandboxHome } from '../../test/sandboxHome.mjs'

const sandbox = useSandboxHome('claudemon-card-')

const { GYMS } = await import('../constants.mjs')
const { isDataReady } = await import('../data.mjs')
const { decodePng } = await import('../png.mjs')
const { createPokemon } = await import('../pokemon.mjs')
const { makeRng } = await import('../rng.mjs')
const { CARD_HEIGHT, CARD_PALETTE, CARD_WIDTH, TYPE_COLORS } =
  await import('./constants.mjs')
const { drawCard, writeCard } = await import('./card.mjs')

if (!isDataReady()) {
  throw new Error('dataset missing — run: node tools/fetch-data.mjs')
}

const aSave = (party, badges) => {
  return {
    trainer: { name: 'TESTER', startedAt: '2026-07-01T00:00:00.000Z' },
    party,
    box: [],
    bag: {},
    money: 12400,
    badges,
    dex: { seen: [1], caught: [1], faced: {} },
    stats: {
      battles: 148,
      wins: 131,
      losses: 12,
      caught: 1,
      runs: 0,
      streak: 6,
      lastPlayedAt: null,
    },
  }
}

const aMon = (speciesId, level, hpFraction) => {
  const mon = createPokemon(speciesId, level, makeRng(speciesId))

  mon.hp = Math.max(1, Math.round(mon.stats.hp * hpFraction))

  return mon
}

const shows = (canvas, [r, g, b]) => {
  for (let at = 0; at < canvas.pixels.length; at += 4) {
    if (
      canvas.pixels[at] === r &&
      canvas.pixels[at + 1] === g &&
      canvas.pixels[at + 2] === b
    ) {
      return true
    }
  }

  return false
}

test('Should write a card the whole team fits on as a PNG anything can open', () => {
  const save = aSave(
    [
      aMon(6, 42, 1),
      aMon(18, 38, 1),
      aMon(3, 40, 1),
      aMon(94, 35, 1),
      aMon(131, 44, 1),
      aMon(143, 31, 1),
    ],
    ['pewter'],
  )
  const path = join(sandbox, 'card.png')

  expect(writeCard(save, path), 'it hands back where it wrote').toBe(path)

  const written = decodePng(readFileSync(path))

  expect(written.width).toBe(CARD_WIDTH)
  expect(written.height).toBe(CARD_HEIGHT)
})

test('Should mark each Pokemon on the card with the colour of its type and nobody else on it', () => {
  const canvas = drawCard(aSave([aMon(6, 42, 1), aMon(94, 35, 1)], []))

  expect(shows(canvas, TYPE_COLORS.fire), 'Charizard leads on fire').toBe(true)
  expect(shows(canvas, TYPE_COLORS.ghost), 'and Gengar on ghost').toBe(true)
  expect(shows(canvas, TYPE_COLORS.water), 'nothing on the team is water').toBe(
    false,
  )
  expect(shows(canvas, TYPE_COLORS.grass)).toBe(false)
})

test('Should light up the badge you won in its gym colour and leave the rest dark', () => {
  const cerulean = GYMS.find((gym) => gym.id === 'cerulean')
  const won = drawCard(aSave([aMon(25, 20, 1)], [cerulean.id]))
  const none = drawCard(aSave([aMon(25, 20, 1)], []))

  expect(shows(won, TYPE_COLORS[cerulean.type])).toBe(true)
  expect(
    shows(none, TYPE_COLORS[cerulean.type]),
    'nothing won, nothing lit',
  ).toBe(false)
})

test('Should still hand back a card when the save cannot say when it started', () => {
  const save = aSave([aMon(25, 20, 1)], [])

  save.trainer.startedAt = 'the other day'

  const canvas = drawCard(save)

  expect(canvas.width).toBe(CARD_WIDTH)
  expect(shows(canvas, TYPE_COLORS.electric), 'the team is still on it').toBe(
    true,
  )
})

test('Should turn the health bar red for a Pokemon that is nearly down', () => {
  const hurt = drawCard(aSave([aMon(25, 20, 0.05)], []))
  const healthy = drawCard(aSave([aMon(25, 20, 1)], []))

  expect(shows(hurt, CARD_PALETTE.red)).toBe(true)
  expect(shows(healthy, CARD_PALETTE.red), 'a full team shows none of it').toBe(
    false,
  )
  expect(shows(healthy, CARD_PALETTE.green)).toBe(true)
})
