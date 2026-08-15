import { expect, test } from 'vitest'
import {
  eggSpriteUrl,
  monSpriteUrl,
  swapToFallback,
  trainerSpriteUrl,
} from './sprites.mjs'

test('Should point at the sprite the server serves, shiny in its own folder', () => {
  expect(monSpriteUrl('front', 25)).toBe('/sprites/front/25.png')
  expect(monSpriteUrl('back', 25, true)).toBe('/sprites/back/shiny/25.png')
  expect(eggSpriteUrl()).toBe('/sprites/front/egg.png')
  expect(trainerSpriteUrl('hiker')).toBe('/sprites/trainers/hiker.png')
})

test('Should fall back to the ordinary sprite when the shiny one was never fetched', () => {
  const image = {
    src: 'http://localhost/sprites/front/shiny/25.png',
    dataset: { fallback: '/sprites/front/25.png' },
  }

  expect(swapToFallback(image)).toBe(true)
  expect(image.src).toBe('/sprites/front/25.png')
})

test('Should give up rather than loop when the fallback is missing too', () => {
  const missing = { src: 'x', dataset: {} }
  const already = {
    src: 'http://localhost/sprites/front/25.png',
    dataset: { fallback: '/sprites/front/25.png' },
  }

  expect(swapToFallback(missing)).toBe(false)
  expect(swapToFallback(already)).toBe(false)
})
