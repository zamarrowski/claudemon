import { expect, test } from 'vitest'
import { terminalData } from './terminalPage.mjs'
import { drawTerminal } from './terminalCanvas.mjs'

const ADVANCE = 0.6

const stubCanvas = () => {
  const calls = { rects: [], texts: [] }
  const state = { fillStyle: null, font: '' }

  return {
    calls,
    width: 0,
    height: 0,
    getContext: () => ({
      save: () => {},
      restore: () => {},
      translate: (x, y) => calls.texts.push({ move: [x, y] }),
      scale: (x) => calls.texts.push({ scale: x }),
      set fillStyle(value) {
        state.fillStyle = value
      },
      get fillStyle() {
        return state.fillStyle
      },
      set font(value) {
        state.font = value
      },
      get font() {
        return state.font
      },
      fillRect: (x, y, width, height) =>
        calls.rects.push({ x, y, width, height, colour: state.fillStyle }),
      fillText: (text) => calls.texts.push({ text, font: state.font }),
      measureText: (text) => ({
        width: text.length * ADVANCE * Number.parseFloat(state.font),
        fontBoundingBoxAscent: 0.8 * Number.parseFloat(state.font),
        fontBoundingBoxDescent: 0.2 * Number.parseFloat(state.font),
      }),
    }),
  }
}

const cell = (char, over = {}) => {
  return {
    char,
    fg: over.fg ?? '#cccccc',
    bg: over.bg ?? null,
    bold: over.bold ?? false,
    wide: over.wide ?? false,
  }
}

const paint = (cells) => {
  const canvas = stubCanvas()

  drawTerminal(canvas, terminalData({ cols: cells[0].length, rows: 1, cells }))

  return canvas
}

const cellRects = (canvas) => canvas.calls.rects.slice(1)

test('Should size the canvas to the grid and fill it with the terminal background', () => {
  const canvas = stubCanvas()

  drawTerminal(
    canvas,
    terminalData({ cols: 3, rows: 2, cells: [[cell(' ')], [cell(' ')]] }),
  )

  expect(canvas.width).toBe(60)
  expect(canvas.height).toBe(80)
  expect(canvas.calls.rects[0]).toEqual({
    x: 0,
    y: 0,
    width: 60,
    height: 80,
    colour: '#000000',
  })
})

test('Should draw nothing but the background for a blank cell', () => {
  const canvas = paint([[cell(' ')]])

  expect(cellRects(canvas)).toHaveLength(0)
  expect(canvas.calls.texts).toHaveLength(0)
})

test('Should fill a full block edge to edge so a bar reads as one solid run', () => {
  const canvas = paint([[cell('█', { fg: '#58d058' }), cell('█')]])

  expect(cellRects(canvas)[0]).toEqual({
    x: 0,
    y: 0,
    width: 20,
    height: 40,
    colour: '#58d058',
  })
  expect(cellRects(canvas)[1].x).toBe(20)
})

test('Should split a quadrant glyph into the two squares it stands for', () => {
  const canvas = paint([[cell('▚')]])

  expect(cellRects(canvas)).toEqual([
    { x: 0, y: 0, width: 10, height: 20, colour: '#cccccc' },
    { x: 10, y: 20, width: 10, height: 20, colour: '#cccccc' },
  ])
})

test('Should paint the cell background under a partly filled sprite cell', () => {
  const canvas = paint([[cell('▀', { fg: '#010203', bg: '#0a0b0c' })]])

  expect(cellRects(canvas)[0].colour).toBe('#0a0b0c')
  expect(cellRects(canvas)[0].height).toBe(40)
  expect(cellRects(canvas)[1]).toEqual({
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    colour: '#010203',
  })
})

test('Should meet a box corner in the middle of the cell so the panel joins up', () => {
  const canvas = paint([[cell('┌')]])
  const [across, down] = cellRects(canvas)

  expect(across).toEqual({
    x: 10,
    y: 19,
    width: 10,
    height: 2,
    colour: '#cccccc',
  })
  expect(down).toEqual({ x: 9, y: 20, width: 2, height: 20, colour: '#cccccc' })
})

test('Should dither a shade glyph on a grid that tiles across cells', () => {
  const canvas = paint([[cell('░'), cell('░')]])
  const dots = cellRects(canvas)

  expect(dots).toHaveLength(2 * 5 * 10)
  expect(dots[0]).toEqual({
    x: 0,
    y: 0,
    width: 2,
    height: 2,
    colour: '#cccccc',
  })
  expect(dots.every((dot) => dot.x % 4 === 0 && dot.y % 4 === 0)).toBe(true)
})

test('Should centre a glyph in its cell at a size whose advance is one cell', () => {
  const canvas = paint([[cell('a'), cell('b')]])
  const [firstMove, , first, secondMove] = canvas.calls.texts

  expect(firstMove.move).toEqual([10, 30])
  expect(first.text).toBe('a')
  expect(first.font).toBe(`${20 / ADVANCE}px Menlo`)
  expect(secondMove.move).toEqual([30, 30])
})

test('Should ask for the bold face only where the line was bold', () => {
  const canvas = paint([[cell('a', { bold: true }), cell('b')]])
  const fonts = canvas.calls.texts
    .filter((call) => call.text)
    .map((call) => call.font)

  expect(fonts).toEqual([
    `bold ${20 / ADVANCE}px Menlo`,
    `${20 / ADVANCE}px Menlo`,
  ])
})

test('Should give a wide glyph both of its cells and squeeze what overflows', () => {
  const canvas = paint([[cell('💥', { wide: true }), cell('')]])
  const [move, squeeze] = canvas.calls.texts

  expect(move.move).toEqual([20, 30])
  expect(squeeze.scale).toBe(1)
})
