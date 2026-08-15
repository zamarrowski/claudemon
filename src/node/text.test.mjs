import { expect, test } from 'vitest'

import { stripAnsi, truncate, visibleLength } from './text.mjs'

const ESC = '\x1b'
const RED = `${ESC}[31m`
const RESET = `${ESC}[0m`

test('Should leave the letters and strip every escape code', () => {
  expect(stripAnsi(`${RED}red${RESET}`)).toBe('red')
  expect(stripAnsi(`${ESC}[38;2;1;2;3mrgb${RESET}`)).toBe('rgb')
  expect(stripAnsi(`${ESC}[2J${ESC}[Hcleared`)).toBe('cleared')
  expect(stripAnsi('plain')).toBe('plain')
})

test('Should strip an operating system escape ended either way', () => {
  expect(stripAnsi(`${ESC}]0;a title\x07after`)).toBe('after')
  expect(stripAnsi(`${ESC}]8;;http://x${ESC}\\after`)).toBe('after')
})

test('Should count cells, not characters, and charge nothing for colour', () => {
  expect(visibleLength('hello')).toBe(5)
  expect(visibleLength(`${RED}hello${RESET}`)).toBe(5)
  expect(visibleLength('')).toBe(0)
  expect(visibleLength('🌱')).toBe(2)
  expect(visibleLength('★')).toBe(1)
  expect(visibleLength('🌱x')).toBe(3)
})

test('Should return text that already fits untouched', () => {
  expect(truncate('hello', 5)).toBe('hello')
  expect(truncate('hello', 10)).toBe('hello')
  expect(truncate('', 4)).toBe('')
})

test('Should cut text that does not fit and mark it', () => {
  expect(truncate('hello world', 5)).toBe(`hello${RESET}…`)
  expect(visibleLength(truncate('hello world', 5))).toBe(6)
})

test('Should keep the colour a cut lands in the middle of', () => {
  const cut = truncate(`${RED}hello world${RESET}`, 5)

  expect(cut.startsWith(RED)).toBe(true)
  expect(stripAnsi(cut)).toBe('hello…')
  expect(cut.endsWith(`${RESET}…`)).toBe(true)
})

test('Should charge no width for an escape, so colour never shortens text', () => {
  const plain = truncate('abcdefghij', 4)
  const painted = truncate(`${RED}a${RESET}${RED}bcdefghij${RESET}`, 4)

  expect(stripAnsi(plain)).toBe(stripAnsi(painted))
})

test('Should never cut a wide character in half', () => {
  const cut = truncate('🌱🌱🌱', 5)

  expect(stripAnsi(cut)).toBe('🌱🌱…')
  expect(visibleLength(cut)).toBe(5)
})

test('Should yield just the mark when even one wide character does not fit', () => {
  expect(stripAnsi(truncate('🌱🌱', 1))).toBe('…')
})

test('Should not stall the cut on a lone escape with nothing after it', () => {
  const cut = truncate(`abc${ESC}defghij`, 4)

  expect(visibleLength(cut)).toBeLessThanOrEqual(5)
  expect(cut.endsWith('…')).toBe(true)
})
