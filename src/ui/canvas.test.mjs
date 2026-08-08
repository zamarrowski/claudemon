import { expect, test } from 'vitest'
import {
  createCanvas,
  drawArt,
  drawDiamond,
  drawSprite,
  drawText,
  fillRect,
  textHeight,
  textWidth,
} from './canvas.mjs'
import { GLYPH_HEIGHT, GLYPH_WIDTH } from './constants.mjs'

const pixelAt = (canvas, x, y) => {
  const at = (y * canvas.width + x) * 4

  return [...canvas.pixels.subarray(at, at + 4)]
}

test('Should fill a new canvas with the colour it was opened in', () => {
  const canvas = createCanvas(3, 2, [10, 20, 30])

  expect(canvas.width).toBe(3)
  expect(canvas.height).toBe(2)
  expect(pixelAt(canvas, 0, 0)).toEqual([10, 20, 30, 255])
  expect(pixelAt(canvas, 2, 1)).toEqual([10, 20, 30, 255])
})

test('Should paint only inside the rectangle it was given', () => {
  const canvas = createCanvas(4, 4, [0, 0, 0])

  fillRect(canvas, 1, 1, 2, 2, [255, 255, 255])

  expect(pixelAt(canvas, 1, 1)).toEqual([255, 255, 255, 255])
  expect(pixelAt(canvas, 2, 2)).toEqual([255, 255, 255, 255])
  expect(pixelAt(canvas, 0, 0), 'outside stays as it was').toEqual([
    0, 0, 0, 255,
  ])
  expect(pixelAt(canvas, 3, 3)).toEqual([0, 0, 0, 255])
})

test('Should keep what is underneath where a rectangle falls off the canvas', () => {
  const canvas = createCanvas(2, 2, [7, 7, 7])

  fillRect(canvas, -5, -5, 3, 3, [255, 0, 0])

  expect(pixelAt(canvas, 0, 0), 'only the overlap is painted').toEqual([
    7, 7, 7, 255,
  ])
})

test('Should blow a sprite up by whole pixels and let a transparent one through', () => {
  const canvas = createCanvas(4, 4, [0, 0, 0])
  const sprite = {
    width: 2,
    height: 1,
    pixels: new Uint8Array([200, 100, 50, 255, 0, 0, 0, 0]),
  }

  drawSprite(canvas, sprite, 0, 0, 2)

  expect(pixelAt(canvas, 0, 0)).toEqual([200, 100, 50, 255])
  expect(pixelAt(canvas, 1, 1), 'each pixel becomes a 2x2 block').toEqual([
    200, 100, 50, 255,
  ])
  expect(pixelAt(canvas, 2, 0), 'the clear half is left alone').toEqual([
    0, 0, 0, 255,
  ])
})

test('Should mix a half-transparent sprite pixel with the background under it', () => {
  const canvas = createCanvas(1, 1, [0, 0, 0])

  drawSprite(
    canvas,
    { width: 1, height: 1, pixels: new Uint8Array([255, 255, 255, 128]) },
    0,
    0,
    1,
  )

  expect(pixelAt(canvas, 0, 0)).toEqual([128, 128, 128, 255])
})

test('Should paint art through its palette and skip the keys mapped to nothing', () => {
  const canvas = createCanvas(3, 2, [0, 0, 0])

  drawArt(canvas, ['.#.', '###'], { '.': null, '#': [1, 2, 3] }, 0, 0, 1)

  expect(pixelAt(canvas, 0, 0)).toEqual([0, 0, 0, 255])
  expect(pixelAt(canvas, 1, 0)).toEqual([1, 2, 3, 255])
  expect(pixelAt(canvas, 0, 1)).toEqual([1, 2, 3, 255])
})

test('Should measure text as the glyphs plus a gap between them', () => {
  expect(textWidth('', 1)).toBe(0)
  expect(textWidth('A', 1)).toBe(GLYPH_WIDTH)
  expect(textWidth('AB', 1)).toBe(GLYPH_WIDTH * 2 + 1)
  expect(textWidth('AB', 3)).toBe((GLYPH_WIDTH * 2 + 1) * 3)
  expect(textHeight(2)).toBe(GLYPH_HEIGHT * 2)
})

test('Should draw text in the colour asked for, lowercase included', () => {
  const canvas = createCanvas(textWidth('l', 1), GLYPH_HEIGHT, [0, 0, 0])

  drawText(canvas, 'l', 0, 0, [255, 0, 0], 1)

  expect(pixelAt(canvas, 0, 0), 'the stem of an uppercase L').toEqual([
    255, 0, 0, 255,
  ])
  expect(pixelAt(canvas, 4, 6), 'and its foot').toEqual([255, 0, 0, 255])
})

test('Should fall back to a box for a character the font has no glyph for', () => {
  const canvas = createCanvas(GLYPH_WIDTH, GLYPH_HEIGHT, [0, 0, 0])

  drawText(canvas, '☃', 0, 0, [9, 9, 9], 1)

  expect(pixelAt(canvas, 0, 0)).toEqual([9, 9, 9, 255])
  expect(pixelAt(canvas, 2, 3), 'hollow in the middle').toEqual([0, 0, 0, 255])
})

test('Should draw a diamond that is widest through its middle', () => {
  const canvas = createCanvas(7, 7, [0, 0, 0])

  drawDiamond(canvas, 3, 3, 3, [5, 5, 5])

  expect(pixelAt(canvas, 0, 3), 'the widest row spans the canvas').toEqual([
    5, 5, 5, 255,
  ])
  expect(pixelAt(canvas, 3, 0), 'the top is a single pixel').toEqual([
    5, 5, 5, 255,
  ])
  expect(pixelAt(canvas, 0, 0), 'and the corners are empty').toEqual([
    0, 0, 0, 255,
  ])
})
