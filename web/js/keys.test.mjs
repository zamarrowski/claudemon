import { expect, test } from 'vitest'
import { parseKey } from './keys.mjs'

test('Should name the keys the game steers with', () => {
  expect(parseKey({ key: 'ArrowUp' }).name).toBe('up')
  expect(parseKey({ key: 'Enter' }).name).toBe('enter')
  expect(parseKey({ key: ' ' }).name).toBe('space')
  expect(parseKey({ key: 'Escape' }).name).toBe('esc')
  expect(parseKey({ key: 'Backspace' }).name).toBe('backspace')
  expect(parseKey({ key: 'PageDown' }).name).toBe('pagedown')
})

test('Should hand a typed letter over in lower case and remember the shift', () => {
  expect(parseKey({ key: 'A', shiftKey: true })).toEqual({
    name: 'a',
    shift: true,
  })
  expect(parseKey({ key: 'q', shiftKey: false })).toEqual({
    name: 'q',
    shift: false,
  })
  expect(parseKey({ key: 'F5' }).name).toBe('f5')
})
