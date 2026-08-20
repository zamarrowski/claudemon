import { SGR_CODES, WIDE_CODEPOINT_RANGE } from '../src/ui/constants.mjs'
import { hexColour } from './helpers.mjs'
import {
  CAPTURE_DIM_FACTOR,
  CAPTURE_PALETTE,
  SGR_PATTERN,
  SGR_RESET,
  SGR_TRUECOLOUR,
  SGR_TRUECOLOUR_BG,
  SGR_TRUECOLOUR_FG,
} from './constants.mjs'

const COLOUR_BY_CODE = new Map(
  Object.entries(CAPTURE_PALETTE.colours).map(([name, colour]) => [
    SGR_CODES[name],
    colour,
  ]),
)

const isWide = (character) => {
  const code = character.codePointAt(0)

  return code >= WIDE_CODEPOINT_RANGE.min && code <= WIDE_CODEPOINT_RANGE.max
}

const dimmed = (colour) => {
  return colour.map((channel) => Math.round(channel * CAPTURE_DIM_FACTOR))
}

const blankState = () => ({ fg: null, bg: null, bold: false, dim: false })

const applyCode = (state, code) => {
  if (code === SGR_RESET) return Object.assign(state, blankState())

  if (code === SGR_CODES.bold) state.bold = true
  if (code === SGR_CODES.dim) state.dim = true
  if (COLOUR_BY_CODE.has(code)) state.fg = COLOUR_BY_CODE.get(code)

  return state
}

const applyTruecolour = (state, params, at) => {
  const colour = [params[at + 2], params[at + 3], params[at + 4]]

  if (params[at] === SGR_TRUECOLOUR_FG) state.fg = colour
  if (params[at] === SGR_TRUECOLOUR_BG) state.bg = colour

  return state
}

const isTruecolour = (params, at) => {
  const code = params[at]
  const mode = params[at + 1]

  if (code !== SGR_TRUECOLOUR_FG && code !== SGR_TRUECOLOUR_BG) return false

  return mode === SGR_TRUECOLOUR
}

const applyParams = (state, params) => {
  let at = 0

  while (at < params.length) {
    if (isTruecolour(params, at)) {
      applyTruecolour(state, params, at)
      at += 5
      continue
    }

    applyCode(state, params[at])
    at += 1
  }

  return state
}

const parseParams = (body) => {
  if (body === '') return [SGR_RESET]

  return body.split(';').map((part) => Number(part))
}

const paintedCell = (character, state) => {
  const colour = state.fg ?? CAPTURE_PALETTE.foreground

  return {
    char: character,
    fg: hexColour(state.dim ? dimmed(colour) : colour),
    bg: state.bg ? hexColour(state.bg) : null,
    bold: state.bold,
    wide: isWide(character),
  }
}

const blankCell = () => ({
  char: ' ',
  fg: hexColour(CAPTURE_PALETTE.foreground),
  bg: null,
  bold: false,
  wide: false,
})

const blankRows = (cols, rows) => {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, blankCell),
  )
}

const writeRun = (rowsOfCells, text, row, startCol) => {
  const cells = rowsOfCells[row]

  if (!cells) return rowsOfCells

  const state = blankState()
  let col = startCol
  let at = 0

  while (at < text.length) {
    if (text[at] === '\x1b') {
      const match = SGR_PATTERN.exec(text.slice(at))

      if (match) {
        applyParams(state, parseParams(match[1]))
        at += match[0].length
        continue
      }
    }

    const character = String.fromCodePoint(text.codePointAt(at))

    at += character.length

    if (col >= cells.length) continue

    cells[col] = paintedCell(character, state)
    col += 1

    if (isWide(character) && col < cells.length) {
      cells[col] = paintedCell('', state)
      col += 1
    }
  }

  return rowsOfCells
}

export const toCellGrid = ({ lines, overlays, cols, rows }) => {
  const rowsOfCells = blankRows(cols, rows)

  lines.forEach((line, row) => writeRun(rowsOfCells, line, row, 0))

  for (const overlay of overlays)
    writeRun(rowsOfCells, overlay.sequence, overlay.row - 1, overlay.col - 1)

  return { cols, rows, cells: rowsOfCells }
}
