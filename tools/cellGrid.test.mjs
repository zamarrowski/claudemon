import { expect, test } from 'vitest'
import { bg, bold, dim, fg, gray, RESET } from '../src/ui/ansi.mjs'
import { toCellGrid } from './cellGrid.mjs'

const grid = (lines, cols, rows, overlays = []) => {
  return toCellGrid({ lines, overlays, cols, rows })
}

test('Should lay every character of a line out one cell at a time', () => {
  const { cells, cols, rows } = grid(['ab'], 4, 1)

  expect(cols).toBe(4)
  expect(rows).toBe(1)
  expect(cells[0].map((cell) => cell.char)).toEqual(['a', 'b', ' ', ' '])
})

test('Should fill the rows a screen did not draw with blanks', () => {
  const { cells } = grid(['top'], 3, 3)

  expect(cells).toHaveLength(3)
  expect(cells[2].every((cell) => cell.char === ' ')).toBe(true)
  expect(cells[2][0].bg).toBe(null)
})

test('Should drop the characters that run past the last column', () => {
  const { cells } = grid(['abcdef'], 3, 1)

  expect(cells[0].map((cell) => cell.char).join('')).toBe('abc')
})

test('Should paint the default foreground until a colour says otherwise', () => {
  const { cells } = grid([`a${gray('b')}c`], 3, 1)

  expect(cells[0][0].fg).toBe('#cccccc')
  expect(cells[0][1].fg).toBe('#707070')
  expect(cells[0][2].fg).toBe('#cccccc')
})

test('Should halve the foreground of dim text and keep the bold flag', () => {
  const { cells } = grid([`${dim('a')}${bold('b')}`], 2, 1)

  expect(cells[0][0].fg).toBe('#666666')
  expect(cells[0][0].bold).toBe(false)
  expect(cells[0][1].fg).toBe('#cccccc')
  expect(cells[0][1].bold).toBe(true)
})

test('Should read the truecolour a sprite cell asks for on both layers', () => {
  const { cells } = grid([`${fg(1, 2, 3)}${bg(250, 251, 252)}▀${RESET} `], 2, 1)

  expect(cells[0][0].char).toBe('▀')
  expect(cells[0][0].fg).toBe('#010203')
  expect(cells[0][0].bg).toBe('#fafbfc')
  expect(cells[0][1].bg).toBe(null)
})

test('Should hold a wide glyph in two cells so the row stays in step', () => {
  const { cells } = grid(['a💥b'], 4, 1)

  expect(cells[0].map((cell) => cell.char)).toEqual(['a', '💥', '', 'b'])
  expect(cells[0].map((cell) => cell.wide)).toEqual([false, true, false, false])
})

test('Should stamp an overlay over the line already under it', () => {
  const { cells } = grid(['abcd'], 4, 2, [
    { row: 1, col: 2, sequence: bold('XY'), rows: 1 },
  ])

  expect(cells[0].map((cell) => cell.char).join('')).toBe('aXYd')
  expect(cells[0][1].bold).toBe(true)
  expect(cells[0][0].bold).toBe(false)
})

test('Should ignore an overlay aimed at a row the capture does not cover', () => {
  const { cells } = grid(['abcd'], 4, 1, [
    { row: 9, col: 1, sequence: 'X', rows: 1 },
  ])

  expect(cells[0].map((cell) => cell.char).join('')).toBe('abcd')
})
