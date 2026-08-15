import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

process.env.CLAUDEMON_HOME = mkdtempSync(join(tmpdir(), 'claudemon-paths-'))

const {
  DATA_DIR,
  SPRITES_DIR,
  bundledDataFile,
  dataFile,
  monSpriteFile,
  shinySpriteFile,
  spriteFile,
} = await import('../src/node/paths.mjs')

test('Should let a data file in the home win, and fall back to the bundled one when it is not there', () => {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(join(DATA_DIR, 'local-only.json'), '{}')

  expect(
    dataFile('local-only.json'),
    'a copy in the home takes precedence',
  ).toBe(join(DATA_DIR, 'local-only.json'))
  expect(
    dataFile('not-here.json'),
    'and without one it falls back to what ships',
  ).toBe(bundledDataFile('not-here.json'))
})

test('Should draw a shiny from its own sprite, and from the ordinary one when it was never downloaded', () => {
  mkdirSync(join(SPRITES_DIR, 'front', 'shiny'), { recursive: true })
  writeFileSync(shinySpriteFile('front', 25, 'png'), '')

  expect(monSpriteFile('front', 25, true)).toBe(
    shinySpriteFile('front', 25, 'png'),
  )
  expect(monSpriteFile('front', 25, false)).toBe(spriteFile('front', 25, 'png'))
  expect(
    monSpriteFile('front', 26, true),
    'a missing shiny sprite is still a Pokemon on screen',
  ).toBe(spriteFile('front', 26, 'png'))
})
