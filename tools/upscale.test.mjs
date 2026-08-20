import { expect, test } from 'vitest'
import { upscaleImage } from './upscale.mjs'

const image = {
  width: 2,
  height: 1,
  pixels: new Uint8Array([1, 2, 3, 255, 4, 5, 6, 128]),
}

test('Should grow the image by the factor on both axes', () => {
  const scaled = upscaleImage(image, 3)

  expect(scaled.width).toBe(6)
  expect(scaled.height).toBe(3)
  expect(scaled.pixels).toHaveLength(6 * 3 * 4)
})

test('Should repeat each pixel whole so pixel art keeps its edges', () => {
  const { pixels } = upscaleImage(image, 2)

  expect([...pixels.subarray(0, 16)]).toEqual([
    1, 2, 3, 255, 1, 2, 3, 255, 4, 5, 6, 128, 4, 5, 6, 128,
  ])
  expect([...pixels.subarray(16, 32)]).toEqual([...pixels.subarray(0, 16)])
})

test('Should hand back the same pixels at a factor of one', () => {
  expect([...upscaleImage(image, 1).pixels]).toEqual([...image.pixels])
})
