import { expect, test } from 'vitest'

import { monSpriteFile } from '../paths.mjs'
import {
  MIN_CANVAS_COLS,
  NATIVE_CANVAS_COLS,
  CANVAS_WIDTH_SLACK,
} from './constants.mjs'
import {
  canvasCols,
  fitCanvasCols,
  fitSpriteInBox,
  spriteHeight,
} from './sprite.mjs'

const SPECIES = [4, 25, 94, 130, 143]

test('Should spend the room it is given and stop at the native canvas', () => {
  expect(canvasCols({ cols: 96, rows: 10 })).toBe(20)
  expect(canvasCols({ cols: 30, rows: 40 })).toBe(30)
  expect(canvasCols({ cols: 200, rows: 200 })).toBe(NATIVE_CANVAS_COLS)
  expect(canvasCols({ cols: 1, rows: 1 })).toBe(MIN_CANVAS_COLS)
})

test('Should halve the canvas when the sprite size setting is halved', () => {
  expect(canvasCols({ cols: 96, rows: 48 }, 0.5)).toBe(NATIVE_CANVAS_COLS / 2)
})

test('Should read a whole terminal as the room left after its chrome', () => {
  expect(fitCanvasCols({ cols: 100, rows: 34 }, 18)).toBe(32)
  expect(fitCanvasCols({ cols: 40, rows: 60 }, 4)).toBe(40 - CANVAS_WIDTH_SLACK)
})

test('Should draw a sprite no bigger than the box it was handed', () => {
  for (const species of SPECIES)
    for (const cols of [12, 20, 32, 48, 64])
      for (const rows of [4, 8, 16, 24, 40]) {
        const sprite = fitSpriteInBox(monSpriteFile('front', species), {
          cols,
          rows,
        })

        expect(sprite, `${species} in ${cols}x${rows}`).not.toBe(null)
        expect(sprite.cols, `${species} wide in ${cols}`).toBeLessThanOrEqual(
          Math.max(cols, MIN_CANVAS_COLS),
        )
        expect(
          spriteHeight(sprite),
          `${species} tall in ${rows}`,
        ).toBeLessThanOrEqual(Math.max(rows, MIN_CANVAS_COLS / 2))
      }
})

test('Should grow the sprite as the box grows, up to the art it has', () => {
  const small = fitSpriteInBox(monSpriteFile('front', 4), {
    cols: 20,
    rows: 10,
  })
  const large = fitSpriteInBox(monSpriteFile('front', 4), {
    cols: 60,
    rows: 30,
  })
  const huge = fitSpriteInBox(monSpriteFile('front', 4), {
    cols: 200,
    rows: 200,
  })

  expect(spriteHeight(large)).toBeGreaterThan(spriteHeight(small))
  expect(spriteHeight(huge)).toBeGreaterThanOrEqual(spriteHeight(large))
  expect(huge.cols).toBeLessThanOrEqual(NATIVE_CANVAS_COLS)
})

test('Should hand back nothing when the sprite was never installed', () => {
  expect(
    fitSpriteInBox(monSpriteFile('front', 9999), { cols: 40, rows: 20 }),
  ).toBe(null)
})
