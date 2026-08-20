import { expect, test } from 'vitest'
import { hexColour } from './helpers.mjs'

test('Should write a colour the way a canvas fill style wants it', () => {
  expect(hexColour([0, 128, 255])).toBe('#0080ff')
})

test('Should pad a channel that needs two digits to keep the six', () => {
  expect(hexColour([1, 2, 3])).toBe('#010203')
})
