import { expect, test } from 'vitest'
import { pageSize, terminalData, terminalPage } from './terminalPage.mjs'

const grid = { cols: 2, rows: 3, cells: [[{ char: 'a' }]] }

test('Should measure the page as one cell per column and per row', () => {
  expect(pageSize(grid)).toEqual({ width: 40, height: 120 })
})

test('Should hand the renderer the grid and the metrics it draws with', () => {
  const data = terminalData(grid)

  expect(data.cols).toBe(2)
  expect(data.rows).toBe(3)
  expect(data.cells).toBe(grid.cells)
  expect(data.cellWidth * data.cols).toBe(pageSize(grid).width)
  expect(data.background).toBe('#000000')
  expect(data.blocks['█']).toEqual([[0, 0, 1, 1]])
  expect(data.boxes['│']).toEqual([['v', 0, 1]])
  expect(data.shades).toContain('░')
})

test('Should write a page that carries the renderer and the cells it draws', () => {
  const html = terminalPage(grid)

  expect(html).toContain('<canvas id="terminal">')
  expect(html).toContain('export const drawTerminal')
  expect(html).toContain("drawTerminal(document.getElementById('terminal')")
  expect(html).toContain(JSON.stringify(terminalData(grid)))
})

test('Should paint the page itself the terminal background so no seam shows', () => {
  expect(terminalPage(grid)).toContain('background: #000000')
})
