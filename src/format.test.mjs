import { expect, test } from 'vitest'
import { DEFAULT_TYPE_COLOR, TYPE_COLORS } from './constants.mjs'
import { elapsed, money, typeColor } from './format.mjs'

test('Should write money with thousands split and the currency after it', () => {
  expect(money(0)).toBe('0₽')
  expect(money(3000)).toBe('3,000₽')
  expect(money(1234567)).toBe('1,234,567₽')
})

test('Should count seconds, then minutes, then hours', () => {
  expect(elapsed(0)).toBe('0s')
  expect(elapsed(45_000)).toBe('45s')
  expect(elapsed(74_000)).toBe('1m14s')
  expect(elapsed(3_600_000)).toBe('1h00m')
  expect(elapsed(5_460_000)).toBe('1h31m')
  expect(elapsed(-5), 'never a negative age').toBe('0s')
})

test('Should colour a type, and fall back for one it has no colour for', () => {
  expect(typeColor('water')).toEqual(TYPE_COLORS.water)
  expect(typeColor('nothing-like-that')).toEqual(DEFAULT_TYPE_COLOR)
})
