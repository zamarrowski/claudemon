import { expect, test } from 'vitest'

import { createPokemon } from '../pokemon.mjs'
import { makeRng } from '../rng.mjs'
import { brightYellow, dim } from './ansi.mjs'
import { EVOLVES_MARK, LEVEL_EVO_PREFIX, SHINY_MARK } from './constants.mjs'
import { stripAnsi, visibleLength } from './text.mjs'
import { evolutionTag, hintLine, panel, shinyTag } from './widgets.mjs'

test('Should tag a stone evolution with a star and a level evolution with its level', () => {
  const rng = makeRng(7)

  expect(stripAnsi(evolutionTag(createPokemon(25, 12, rng)))).toBe(
    ` ${EVOLVES_MARK}`,
  )
  expect(stripAnsi(evolutionTag(createPokemon(4, 10, rng)))).toBe(
    ` ${LEVEL_EVO_PREFIX}16`,
  )
  expect(evolutionTag(createPokemon(6, 40, rng))).toBe('')
})

test('Should tag a shiny with a star and leave an ordinary one unmarked', () => {
  expect(stripAnsi(shinyTag(true))).toBe(` ${SHINY_MARK}`)
  expect(shinyTag(false)).toBe('')
})

test('Should brighten the level tag once the Pokemon is old enough to evolve', () => {
  const rng = makeRng(7)

  const waiting = evolutionTag(createPokemon(4, 10, rng))
  const ready = evolutionTag(createPokemon(4, 16, rng))

  expect(stripAnsi(waiting)).toBe(stripAnsi(ready))
  expect(waiting).not.toBe(ready)
})

test('Should keep a panel border square when its content is wider than the frame', () => {
  const rows = panel(
    ['short', 'a line far longer than the frame it is being drawn inside'],
    20,
  )
  const widths = new Set(rows.map((row) => visibleLength(stripAnsi(row))))

  expect(widths, 'every row of the box is the same width').toHaveProperty(
    'size',
    1,
  )
  expect(stripAnsi(rows[2]), 'the overflow is cut, not spilled').toContain('…')
})

test('Should paint the keys of a hint line bright and leave the words dim', () => {
  const line = hintLine(
    ' ↑ ↓ browse · [PgUp/PgDn] jump · [s] sort · [esc] back',
  )

  expect(stripAnsi(line), 'the words the player reads do not move').toBe(
    ' ↑ ↓ browse · [PgUp/PgDn] jump · [s] sort · [esc] back',
  )
  expect(line, 'the arrows are keys too').toContain(brightYellow('↑'))
  expect(line, 'a multi-key shortcut counts as one').toContain(
    brightYellow('[PgUp/PgDn]'),
  )
  expect(line, 'brackets and all').toContain(brightYellow('[esc]'))
  expect(line, 'what a key does stays dim').toContain(dim(' sort · '))
})

test('Should leave a hint line with nothing to press entirely dim', () => {
  expect(hintLine('press on')).toBe(dim('press on'))
})
