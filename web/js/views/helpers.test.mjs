import { expect, test, vi } from 'vitest'
import { createPokemon } from '../../../src/pokemon.mjs'
import { makeRng } from '../../../src/rng.mjs'
import { markupOf } from '../dom.mjs'
import {
  clampSelection,
  cursorDelta,
  evolutionWording,
  hpBand,
  hpBar,
  levelRangeLabel,
  nextPartySort,
  partySelectionAfterSort,
  selector,
  sortedPartyEntries,
  typeBadge,
  wrap,
} from './helpers.mjs'

const aParty = () => [
  createPokemon(1, 5, makeRng(1)),
  createPokemon(25, 30, makeRng(2)),
  createPokemon(16, 12, makeRng(3)),
]

test('Should walk a menu round in both directions and hold still on an empty one', () => {
  expect(wrap(-1, 3)).toBe(2)
  expect(wrap(3, 3)).toBe(0)
  expect(wrap(1, 0)).toBe(0)
  expect(clampSelection(9, 3)).toBe(2)
  expect(clampSelection(-2, 3)).toBe(0)
})

test('Should take a step from either the arrows or the vim keys and blip once for each', () => {
  const playSound = vi.fn()
  const ctx = { playSound }
  const step = (name) => cursorDelta(ctx, { name })

  expect(['up', 'k', 'left'].map(step)).toEqual([-1, -1, -1])
  expect(['down', 'j', 'right'].map(step)).toEqual([1, 1, 1])
  expect(step('enter'), 'nothing else is a cursor key').toBe(0)
  expect(step('s')).toBe(0)

  expect(playSound).toHaveBeenCalledTimes(6)
  expect(playSound).toHaveBeenCalledWith('cursor')
})

test('Should put the cursor where it was clicked and rub out what the screen said', () => {
  const ctx = {
    bagSelection: 0,
    bagMessage: 'Save the Poké Ball for something in the grass.',
    homeSelection: 0,
  }

  selector('bagSelection', 'bagMessage')(ctx, 3)

  expect(ctx.bagSelection).toBe(3)
  expect(ctx.bagMessage).toBeNull()

  selector('homeSelection')(ctx, 2)

  expect(ctx.homeSelection).toBe(2)
  expect(
    Object.keys(ctx),
    'a screen with nothing to say gets no stray field',
  ).toEqual(['bagSelection', 'bagMessage', 'homeSelection'])
})

test('Should colour the HP bar by how much of it is left', () => {
  expect(hpBand(1)).toBe('healthy')
  expect(hpBand(0.5)).toBe('hurt')
  expect(hpBand(0.2)).toBe('low')
  expect(hpBand(0)).toBe('low')

  const bar = markupOf(hpBar(3, 20))

  expect(bar).toContain('data-band="low"')
  expect(bar).toContain('width:15%')
  expect(bar).toContain('3/20')
})

test('Should sort the party by level and keep the cursor on the same Pokemon', () => {
  const party = aParty()
  const byLevel = sortedPartyEntries(party, 'level')

  expect(byLevel.map((entry) => entry.index)).toEqual([1, 2, 0])
  expect(
    sortedPartyEntries(party, 'order').map((entry) => entry.index),
  ).toEqual([0, 1, 2])

  expect(nextPartySort('order')).toBe('level')
  expect(partySelectionAfterSort(party, 0, 'order', 'level')).toBe(2)
})

test('Should say what it takes for a Pokemon to evolve', () => {
  expect(evolutionWording({ trigger: 'level-up', level: 16 })).toBe(
    'at level 16',
  )
  expect(evolutionWording({ trigger: 'use-item', item: 'fire-stone' })).toBe(
    'with a fire stone',
  )
  expect(evolutionWording({ trigger: 'trade' })).toBe('by trading')
})

test('Should name a level range and collapse it when there is only one level', () => {
  expect(levelRangeLabel({ min: 10, max: 12 })).toBe('Lv10-12')
  expect(levelRangeLabel({ min: 10, max: 10 })).toBe('Lv10')
})

test('Should paint a type badge in the colour of its type', () => {
  const badge = markupOf(typeBadge('fire'))

  expect(badge).toContain('rgb(240 128 48)')
  expect(badge).toContain('>fire<')
})
