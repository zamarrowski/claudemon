import { expect, test } from 'vitest'

import { createScreen } from '../src/ui/screen.mjs'
import { ballCells, ballOverlays, ballSteps } from '../src/ui/ball.mjs'
import {
  BAND_PX,
  bandImage,
  bandRows,
  grassLines,
  walkerColumn,
} from '../src/ui/grass.mjs'
import { fitBattleSprites } from '../src/ui/battleField.mjs'
import { spriteFile } from '../src/paths.mjs'
import { draw as drawBattle } from '../src/ui/views/battle.mjs'
import { draw as drawBox } from '../src/ui/views/box.mjs'
import { draw as drawDex } from '../src/ui/views/dex.mjs'
import { draw as drawOptions } from '../src/ui/views/options.mjs'
import { draw as drawShop } from '../src/ui/views/shop.mjs'
import { draw as drawBag } from '../src/ui/views/bag.mjs'
import { draw as drawTeam } from '../src/ui/views/team.mjs'
import { draw as drawDaycare } from '../src/ui/views/daycare.mjs'
import { draw as drawGym } from '../src/ui/views/gym.mjs'
import { draw as drawGyms } from '../src/ui/views/gyms.mjs'
import { DEFAULT_CONFIG } from '../src/constants.mjs'
import { itemsInBag } from '../src/shop.mjs'
import {
  MIN_CANVAS_COLS,
  NATIVE_CANVAS_COLS,
  SHINY_MARK,
} from '../src/ui/constants.mjs'
import { DEX_MESSAGES } from '../src/ui/views/constants.mjs'
import { BLOCK_GRIDS, blockRows, fitCanvasCols } from '../src/ui/sprite.mjs'
import { genderTag, hpBar } from '../src/ui/widgets.mjs'
import { CURSOR, gray, RESET, SCREEN_CODES } from '../src/ui/ansi.mjs'
import { stripAnsi, visibleLength } from '../src/ui/text.mjs'
import { emptyVolatile } from '../src/volatile.mjs'

const fakeTerminal = ({ cols = 40, rows = 12 } = {}) => {
  const writes = []

  const output = {
    columns: cols,
    rows,
    write: (text) => writes.push(text),
    on: () => {},
    off: () => {},
  }

  const input = {
    isTTY: false,
    on: () => {},
    off: () => {},
    resume: () => {},
    pause: () => {},
    setRawMode: () => {},
  }

  return {
    screen: createScreen({ input, output }),
    frame: () => (writes.length === 0 ? '' : writes[writes.length - 1]),
    count: () => writes.length,
    since: (mark) => writes.slice(mark).join(''),
  }
}

const repainted = (frame, row) => frame.includes(CURSOR.to(row, 1))

const SPRITE = ['....', '.##.', '.##.', '....']

const WIPE = RESET + ' '.repeat(40)

const rowWrite = (frame, row) => {
  const jump = CURSOR.to(row, 1)
  const at = frame.indexOf(jump)

  if (at < 0) return null

  const rest = frame.slice(at + jump.length)
  // eslint-disable-next-line no-control-regex
  const next = rest.search(/\x1b\[\d+;\d+H/)

  return next < 0 ? rest : rest.slice(0, next)
}

const reclaimed = (frame, row, cols = 40) => {
  const write = rowWrite(frame, row)

  return (
    write != null &&
    visibleLength(write) === cols &&
    !write.includes(SCREEN_CODES.clearLine)
  )
}

test('Should not write a byte for a frame that changed nothing', () => {
  const term = fakeTerminal()

  term.screen.render(SPRITE)
  const after = term.count()

  term.screen.render(SPRITE)

  expect(term.count(), 'a second identical frame is not worth a byte').toBe(
    after,
  )
})

test('Should repaint only the row that changed', () => {
  const term = fakeTerminal()

  term.screen.render(['one', 'two', 'three'])
  term.screen.render(['one', 'CHANGED', 'three'])

  const frame = term.frame()

  expect(frame).toContain('CHANGED')
  expect(frame, 'the untouched rows stay untouched').not.toContain('one')
  expect(frame).not.toContain('three')
})

test('Should send an overlay out once and then leave it where it stands', () => {
  const term = fakeTerminal()

  term.screen.render(SPRITE, [
    { row: 2, col: 2, sequence: 'XX', rows: 1, key: 'a' },
  ])

  expect(term.frame()).toContain('XX')

  const after = term.count()

  term.screen.render(SPRITE, [
    { row: 2, col: 2, sequence: 'XX', rows: 1, key: 'a' },
  ])

  expect(term.count(), 'nothing moved, so nothing is redrawn').toBe(after)
})

test('Should put back the row a vanished overlay was covering', () => {
  const term = fakeTerminal()

  term.screen.render(SPRITE, [
    { row: 2, col: 2, sequence: 'XX', rows: 1, key: 'a' },
  ])
  term.screen.render(SPRITE)

  const frame = term.frame()

  expect(repainted(frame, 2), 'the row the overlay covered is repainted').toBe(
    true,
  )
  expect(frame, 'from what was underneath it').toContain(SPRITE[1])
  expect(frame).not.toContain('XX')
})

test('Should redraw a changed overlay over the row it restored first', () => {
  const term = fakeTerminal()

  term.screen.render(SPRITE, [
    { row: 2, col: 2, sequence: 'XX', rows: 1, key: 'a' },
  ])
  term.screen.render(SPRITE, [
    { row: 2, col: 2, sequence: 'YY', rows: 1, key: 'b' },
  ])

  const frame = term.frame()

  expect(frame, 'the sprite row goes back down first').toContain(SPRITE[1])
  expect(frame, 'and the new frame on top of it').toContain('YY')
  expect(frame.indexOf(SPRITE[1]), 'in that order').toBeLessThan(
    frame.indexOf('YY'),
  )
})

test('Should redraw an overlay when a line under it is repainted', () => {
  const term = fakeTerminal()
  const tall = { row: 2, col: 1, sequence: 'OVER', rows: 2, key: 'sprite' }

  term.screen.render(['a', '', '', 'd'], [tall])
  term.screen.render(['a', '', 'CHANGED', 'd'], [tall])

  expect(term.frame(), 'so it has to go back out').toContain('OVER')
})

test('Should leave an overlay alone when an unrelated line changes', () => {
  const term = fakeTerminal()
  const over = { row: 2, col: 1, sequence: 'OVER', rows: 1, key: 'sprite' }

  term.screen.render(['a', '', 'c'], [over])
  term.screen.render(['a', '', 'CHANGED'], [over])

  expect(term.frame(), 'nothing disturbed it').not.toContain('OVER')
})

test('Should write over the cells a vanished overlay covered, not only erase them', () => {
  const term = fakeTerminal()
  const tall = { row: 2, col: 1, sequence: 'OVER', rows: 2, key: 'sprite' }

  term.screen.render(['a', '', '', 'd'], [tall])
  term.screen.render(['a', '', '', 'd'])

  const frame = term.frame()

  expect(frame, 'the first row it covered').toContain(CURSOR.to(2, 1) + WIPE)
  expect(frame, 'and the second').toContain(CURSOR.to(3, 1) + WIPE)
  expect(frame, 'and nothing it did not cover').not.toContain(
    CURSOR.to(1, 1) + WIPE,
  )
})

test('Should wipe the rows that fall off the bottom of a shorter frame too', () => {
  const term = fakeTerminal({ rows: 8 })

  term.screen.render(['a', 'b', 'c', 'd', 'e'])
  term.screen.render(['a'])

  const frame = term.frame()

  expect(frame, 'a row nothing will be drawn into').toContain(
    CURSOR.to(3, 1) + WIPE,
  )
  expect(frame, 'and then the erase').toContain(
    CURSOR.to(2, 1) + SCREEN_CODES.clearBelow,
  )
})

test('Should wipe every row a repaint draws, since it no longer knows what was there', () => {
  const term = fakeTerminal()

  term.screen.render(
    ['a', 'b', 'c'],
    [{ row: 2, col: 1, sequence: 'OVER', rows: 1, key: 'sprite' }],
  )

  term.screen.repaint()
  term.screen.render(['a', 'b', 'c'])

  const frame = term.frame()

  for (const row of [1, 2, 3]) {
    expect(
      reclaimed(frame, row),
      `row ${row} is written over, edge to edge`,
    ).toBe(true)
  }

  for (const row of [4, 12]) {
    expect(frame, `row ${row} is wiped too`).toContain(CURSOR.to(row, 1) + WIPE)
  }
})

test('Should write a reclaimed row out to the edge, and not erase it afterwards', () => {
  const term = fakeTerminal()
  const tall = { row: 2, col: 1, sequence: 'OVER', rows: 2, key: 'sprite' }

  term.screen.render(['a', '', '', 'd'], [tall])
  term.screen.render(['a', '', 'text', 'd'])

  const frame = term.frame()

  expect(reclaimed(frame, 2), 'the blank row it covered').toBe(true)
  expect(reclaimed(frame, 3), 'and the one with text on it').toBe(true)
  expect(rowWrite(frame, 3), 'which still says what it says').toContain('text')
})

test('Should never let an erase follow the spaces that took a row back from an overlay', () => {
  const term = fakeTerminal({ rows: 8 })

  term.screen.render(
    ['a', 'b', 'c', 'd', 'e'],
    [{ row: 4, col: 1, sequence: 'OVER', rows: 2, key: 'sprite' }],
  )

  term.screen.render(['a'])

  const frame = term.frame()
  const erase = frame.indexOf(SCREEN_CODES.clearBelow)

  expect(erase, 'the erase still goes out').toBeGreaterThanOrEqual(0)
  expect(
    frame.lastIndexOf(WIPE),
    'but the spaces are the last thing those rows see',
  ).toBeGreaterThan(erase)
})

test('Should write an animating overlay away rather than clear it away', () => {
  const term = fakeTerminal()

  term.screen.start()
  term.screen.render(SPRITE, [
    { row: 2, col: 2, sequence: 'XX', rows: 1, key: 'ball:1' },
  ])

  const mark = term.count()

  term.screen.render(SPRITE, [
    { row: 2, col: 2, sequence: 'YY', rows: 1, key: 'ball:2' },
  ])

  const frame = term.since(mark)

  expect(frame, 'no clear').not.toContain(SCREEN_CODES.clear)
  expect(frame, 'just the next frame of it').toContain('YY')
})

test('Should write over the whole screen before handing the terminal back', () => {
  const term = fakeTerminal({ rows: 8 })

  term.screen.start()
  term.screen.render(
    ['a'],
    [{ row: 3, col: 1, sequence: 'OVER', rows: 2, key: 'sprite' }],
  )

  term.screen.stop()

  const frame = term.frame()

  for (let row = 1; row <= 8; row++) {
    expect(frame, `row ${row} is written over`).toContain(
      CURSOR.to(row, 1) + WIPE,
    )
  }

  expect(
    frame.indexOf(WIPE),
    'and all of it before the buffer goes away',
  ).toBeLessThan(frame.indexOf(SCREEN_CODES.exitAlt))
})

test('Should forget every overlay a repaint had drawn', () => {
  const term = fakeTerminal()

  term.screen.render(SPRITE, [
    { row: 2, col: 2, sequence: 'XX', rows: 1, key: 'a' },
  ])

  term.screen.repaint()
  term.screen.render(SPRITE, [
    { row: 2, col: 2, sequence: 'XX', rows: 1, key: 'a' },
  ])

  expect(
    term.frame(),
    'the screen is blank again, so it all goes back',
  ).toContain('XX')
})

const FIELD = {
  foe: { top: 2, rows: 10, indent: 40, cols: 20 },
  player: { top: 14, rows: 10, indent: 2, cols: 24 },
  scale: 1,
  cols: 78,
  maxRow: 26,
}

const isShake = (step) => step.kind === 'shake'

test('Should draw the ball art as a rectangle, so its pixels line up in columns', () => {
  for (const scale of [1, 2]) {
    const cells = ballCells(scale)

    expect(cells.length, 'more than one row of cells').toBeGreaterThan(1)

    for (const row of cells) {
      expect(row.length, `scale ${scale} has a ragged row`).toBe(
        cells[0].length,
      )
    }
  }
})

test('Should draw the ball as runs of blocks, never as spaces', () => {
  const steps = ballSteps({ shakes: 3, caught: false })

  for (const [frame, step] of steps.entries()) {
    const overlays = ballOverlays(step, FIELD, frame)

    expect(overlays.length, `frame ${frame} drew nothing`).toBeGreaterThan(0)

    for (const overlay of overlays) {
      const visible = stripAnsi(overlay.sequence)

      expect(
        visible,
        `frame ${frame} would punch a hole in the sprite`,
      ).not.toContain(' ')
      expect(
        visible.length,
        'and an empty run is not worth an overlay',
      ).toBeGreaterThan(0)
      expect(overlay.key, 'the frame is what tells the renderer it moved').toBe(
        `ball:${frame}`,
      )
    }
  }
})

test('Should keep the ball inside the field it was given', () => {
  const steps = ballSteps({ shakes: 3, caught: false })

  for (const [frame, step] of steps.entries()) {
    for (const overlay of ballOverlays(step, FIELD, frame)) {
      expect(overlay.row, `row ${overlay.row}`).toBeGreaterThanOrEqual(1)
      expect(overlay.row, `row ${overlay.row}`).toBeLessThanOrEqual(
        FIELD.maxRow + 1,
      )
      expect(overlay.col, `col ${overlay.col}`).toBeGreaterThanOrEqual(1)
      expect(
        overlay.col - 1 + visibleLength(overlay.sequence),
        `frame ${frame} ran off the right edge`,
      ).toBeLessThanOrEqual(FIELD.cols)
    }
  }
})

test('Should come to rest on the Pokemon the ball was thrown at', () => {
  const steps = ballSteps({ shakes: 0, caught: true })
  const frame = steps.length - 1
  const overlays = ballOverlays(steps[frame], FIELD, frame)

  const left = Math.min(...overlays.map((overlay) => overlay.col))
  const right = Math.max(
    ...overlays.map((overlay) => overlay.col + visibleLength(overlay.sequence)),
  )
  const centre = FIELD.foe.indent + Math.floor(FIELD.foe.cols / 2) + 1

  expect(
    Math.abs((left + right) / 2 - centre),
    `${left}..${right} around ${centre}`,
  ).toBeLessThanOrEqual(1)

  const rows = overlays.map((overlay) => overlay.row)

  expect(Math.min(...rows), 'below the top of it').toBeGreaterThan(
    FIELD.foe.top,
  )
  expect(Math.max(...rows), 'and standing on the ground').toBeLessThanOrEqual(
    FIELD.foe.top + FIELD.foe.rows,
  )
})

test('Should start the throw on your side of the field', () => {
  const [first] = ballOverlays(ballSteps({})[0], FIELD, 0)

  expect(first.row, 'down where your Pokemon is').toBeGreaterThan(
    FIELD.foe.top + FIELD.foe.rows,
  )
  expect(first.col, 'and over on the left').toBeLessThan(FIELD.foe.indent)
})

test('Should wobble once per shake the engine counted out, rocking both ways', () => {
  const never = ballSteps({ shakes: 0, caught: false }).filter(isShake)
  const once = ballSteps({ shakes: 1, caught: false }).filter(isShake)
  const thrice = ballSteps({ shakes: 3, caught: false }).filter(isShake)

  expect(never, 'a ball that never shook does not wobble').toHaveLength(0)
  expect(thrice).toHaveLength(once.length * 3)

  const tilts = once.map((step) => step.tilt)

  expect(Math.min(...tilts), 'and it rocks both ways').toBeLessThan(0)
  expect(Math.max(...tilts), 'and it rocks both ways').toBeGreaterThan(0)
})

test('Should keep the Pokemon off the field for exactly as long as the ball is shut', () => {
  const held = ballSteps({ shakes: 4, caught: true })

  expect(held.at(-1).hideFoe, 'a ball that held never opens again').toBe(true)

  const broke = ballSteps({ shakes: 1, caught: false })

  expect(broke.at(-1).kind).toBe('burst')
  expect(broke.at(-1).hideFoe, 'one that failed puts it back').toBe(false)

  const first = broke.findIndex((step) => step.hideFoe)
  const last = broke.findLastIndex((step) => step.hideFoe)

  expect(
    first,
    'it is still out there while the ball is in the air',
  ).toBeGreaterThan(0)
  expect(last - first + 1, 'and it goes away once rather than flickering').toBe(
    broke.filter((step) => step.hideFoe).length,
  )
})

const BAND_COLS = 64

const samePixel = (one, other, x, y) => {
  const at = (y * one.width + x) * 4

  for (let channel = 0; channel < 4; channel++) {
    if (one.pixels[at + channel] !== other.pixels[at + channel]) return false
  }

  return true
}

test('Should draw the band one pixel per pixel, at any size', () => {
  expect(BAND_PX % 2, 'a half-block row holds two pixels').toBe(0)

  for (const scale of [1, 2]) {
    const lines = grassLines({ cols: BAND_COLS, scale })

    expect(lines, `scale ${scale} is the height it claims`).toHaveLength(
      bandRows(scale),
    )
  }
})

test('Should make every row of the band exactly as wide as it was given room for', () => {
  for (const row of grassLines({ cols: BAND_COLS, step: 7, walking: true })) {
    expect(visibleLength(row)).toBe(BAND_COLS)
  }
})

test('Should leave no holes in the field', () => {
  const band = bandImage({ cols: BAND_COLS, step: 3, walking: true })

  for (let y = band.height - 3; y < band.height; y++) {
    for (let x = 0; x < band.width; x++) {
      expect(
        band.pixels[(y * band.width + x) * 4 + 3],
        `hole at ${x},${y}`,
      ).not.toBe(0)
    }
  }
})

test('Should pass the near blades in front of the walker', () => {
  const here = bandImage({ cols: BAND_COLS, step: 0, walking: true })
  const gone = bandImage({ cols: BAND_COLS, step: 24, walking: true })

  const boots = BAND_PX - 3
  let covered = 0
  let showing = 0

  for (let x = 0; x < 10; x++) {
    if (samePixel(here, gone, x, boots)) covered++
    else showing++
  }

  expect(showing, 'the boots are in the grass, not under it').toBeGreaterThan(0)
  expect(
    covered,
    'and the blades in front of them are drawn over them',
  ).toBeGreaterThan(0)
})

test('Should make walking look different from standing still', () => {
  const standing = grassLines({ cols: BAND_COLS, step: 4, walking: false })
  const walking = grassLines({ cols: BAND_COLS, step: 4, walking: true })

  expect(walking).not.toEqual(standing)
})

test('Should cross the field with the walk and come back on the other side', () => {
  const seen = new Set()

  for (let step = 0; step < 1000; step++) {
    seen.add(walkerColumn(step, BAND_COLS))
  }

  expect(
    walkerColumn(0, BAND_COLS),
    'a new session starts with a whole person',
  ).toBe(0)
  expect(Math.max(...seen), 'they reach the far side').toBeGreaterThanOrEqual(
    BAND_COLS - 10,
  )
  expect(
    Math.min(...seen),
    'and come back on clipped, rather than turning round',
  ).toBeLessThan(0)
  expect(
    walkerColumn(BAND_COLS + 10, BAND_COLS),
    'one crossing of the band and the field repeats',
  ).toBe(0)
})

test('Should grow the canvas with the window and stop at the source resolution', () => {
  const short = fitCanvasCols({ cols: 200, rows: 24 })
  const tall = fitCanvasCols({ cols: 200, rows: 44 })

  expect(tall, 'a taller tab is a sharper Pokemon').toBeGreaterThan(short)
  expect(fitCanvasCols({ cols: 400, rows: 200 }), 'and never blur').toBe(
    NATIVE_CANVAS_COLS,
  )
})

test('Should only ever scale the canvas down with SIZE, and never out of sight', () => {
  const size = { cols: 200, rows: 60 }
  const full = fitCanvasCols(size, 7, 1)

  expect(full).toBe(NATIVE_CANVAS_COLS)
  expect(fitCanvasCols(size, 7, 0.5)).toBeLessThan(full)
  expect(fitCanvasCols({ cols: 30, rows: 10 }, 7, 0.4)).toBe(MIN_CANVAS_COLS)
})

const solidImage = (width, height, colour = [200, 120, 40]) => {
  const pixels = new Uint8Array(width * height * 4)

  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = colour[0]
    pixels[i * 4 + 1] = colour[1]
    pixels[i * 4 + 2] = colour[2]
    pixels[i * 4 + 3] = 255
  }

  return { width, height, pixels }
}

test('Should give every quadrant combination its own glyph', () => {
  const seen = new Map()

  for (let mask = 0; mask < 16; mask++) {
    const glyph = BLOCK_GRIDS.quadrant.glyph(mask)

    expect(
      seen.has(glyph),
      `mask ${mask} draws the same glyph as ${seen.get(glyph)}`,
    ).toBe(false)

    seen.set(glyph, mask)
  }

  expect(seen.size).toBe(16)
})

test('Should take every quadrant glyph from Block Elements, which every font has', () => {
  for (let mask = 1; mask < 16; mask++) {
    const glyph = BLOCK_GRIDS.quadrant.glyph(mask)
    const point = glyph.codePointAt(0)

    expect(
      point,
      `mask ${mask} draws ${glyph} at U+${point.toString(16)}, outside Block Elements`,
    ).toBeGreaterThanOrEqual(0x2580)
    expect(
      point,
      `mask ${mask} draws ${glyph} at U+${point.toString(16)}, outside Block Elements`,
    ).toBeLessThanOrEqual(0x259f)
    expect(glyph.length, 'and inside the BMP, so .length and width agree').toBe(
      1,
    )
  }

  expect(BLOCK_GRIDS.quadrant.glyph(0), 'an empty cell is a space').toBe(' ')
})

test('Should lay the quadrant bits out in reading order', () => {
  expect(BLOCK_GRIDS.quadrant.glyph(1), 'bit 0 is the top left').toBe('▘')
  expect(BLOCK_GRIDS.quadrant.glyph(2), 'bit 1 is the top right').toBe('▝')
  expect(BLOCK_GRIDS.quadrant.glyph(4), 'bit 2 is the bottom left').toBe('▖')
  expect(BLOCK_GRIDS.quadrant.glyph(8), 'bit 3 is the bottom right').toBe('▗')
  expect(
    BLOCK_GRIDS.quadrant.glyph(3),
    'and the pairs agree with the halves',
  ).toBe('▀')
  expect(BLOCK_GRIDS.quadrant.glyph(12)).toBe('▄')
  expect(BLOCK_GRIDS.quadrant.glyph(5)).toBe('▌')
  expect(BLOCK_GRIDS.quadrant.glyph(10)).toBe('▐')
  expect(BLOCK_GRIDS.quadrant.glyph(15)).toBe('█')
})

test('Should charge a denser grid exactly the same rows and columns', () => {
  const image = solidImage(40, 46)

  for (const cols of [12, 20, 31, 44]) {
    const half = blockRows(image, cols, BLOCK_GRIDS.half)
    const quadrant = blockRows(image, cols, BLOCK_GRIDS.quadrant)

    expect(
      quadrant,
      `${cols} columns is the same height either way`,
    ).toHaveLength(half.length)

    for (const row of quadrant) {
      expect(
        visibleLength(row),
        `${cols} columns wide, measured in cells`,
      ).toBe(cols)
    }
  }
})

test('Should draw sprites with quadrants unless something asks for otherwise', () => {
  const image = solidImage(24, 24)

  expect(blockRows(image, 10)).toEqual(
    blockRows(image, 10, BLOCK_GRIDS.quadrant),
  )
})

test('Should keep both colours of a two-colour cell, and none behind a transparent one', () => {
  const split = solidImage(2, 4)

  for (let y = 0; y < 4; y++) {
    const at = y * 2 * 4

    split.pixels[at] = 20
    split.pixels[at + 1] = 20
    split.pixels[at + 2] = 24
  }

  expect(blockRows(split, 1)[0], 'a background colour is used').toMatch(/48;2;/)

  const holed = solidImage(2, 4)

  holed.pixels[3] = 0
  holed.pixels[(1 * 2 + 0) * 4 + 3] = 0

  const transparent = blockRows(holed, 1)[0]

  expect(
    transparent,
    'no background where something must show through',
  ).not.toMatch(/48;2;/)
  expect(stripAnsi(transparent), 'and the glyph carries the silhouette').toBe(
    '▟',
  )
})

const POKEMON = {
  species: 4,
  nickname: null,
  hp: 20,
  exp: 200,
  status: null,
  ivs: {
    hp: 15,
    attack: 15,
    defense: 15,
    spAttack: 15,
    spDefense: 15,
    speed: 15,
  },
  stats: {
    hp: 20,
    attack: 10,
    defense: 10,
    spAttack: 10,
    spDefense: 10,
    speed: 10,
  },
  moves: [
    { move: 'tackle', pp: 30, maxPp: 30 },
    { move: 'growl', pp: 40, maxPp: 40 },
  ],
}

const BATTLE_SAVE = {
  trainer: 'X',
  money: 0,
  dex: { caught: [], seen: [], shiny: [] },
  bag: { 'poke-ball': 3 },
  party: [POKEMON],
  box: [],
  stats: {},
}

const FOE = { ...POKEMON, species: 143 }

const BATTLE = {
  state: {
    foe: { mon: FOE, volatile: emptyVolatile() },
    player: { mon: POKEMON, volatile: emptyVolatile() },
    over: false,
  },
  foeMon: FOE,
  hp: { foe: 20, player: 20 },
  menu: 'main',
  message: null,
  events: [],
  effect: null,
  ball: null,
  selection: 0,
  bagItems: ['poke-ball', 'revive'],
  bagItem: null,
}

const BATTLE_CTX = { save: BATTLE_SAVE, spriteScale: 1, battle: BATTLE }

const BATTLE_MENUS = [
  { menu: null, message: 'A wild SNORLAX appeared!', bagItem: null },
  { menu: 'main', message: null, bagItem: null },
  { menu: 'fight', message: null, bagItem: null },
  { menu: 'bag', message: null, bagItem: null },
  { menu: 'party', message: null, bagItem: null },
  { menu: 'target', message: null, bagItem: 'revive' },
]

const inkSpan = (line) => {
  const plain = stripAnsi(line)
  const first = plain.search(/\S/)

  if (first < 0) return null

  return { from: first, to: plain.replace(/\s+$/, '').length - 1 }
}

const nameRow = (ctx, size) => stripAnsi(drawBattle(ctx, size).lines[0])

test('Should draw both sprites on a shared row, and neither over the other', () => {
  const size = { cols: 120, rows: 40 }
  const { lines } = drawBattle(BATTLE_CTX, size)
  const fitted = fitBattleSprites(
    size,
    spriteFile('front', 143, 'png'),
    spriteFile('back', 4, 'png'),
    1,
  )

  expect(fitted.overlap, 'this size does share rows').toBeGreaterThan(0)

  const width = Math.min(size.cols - 2, 78)
  const foeLeft = Math.max(1, width - fitted.foe.cols - 2)

  const fieldTop = 2
  const fieldHeight =
    fitted.foe.rows.length + fitted.player.rows.length - fitted.overlap
  const field = lines.slice(fieldTop, fieldTop + fieldHeight)

  const rowsWithBoth = field.filter((line) => {
    const span = inkSpan(line)

    return span && span.from < foeLeft && span.to >= foeLeft
  })

  expect(rowsWithBoth, 'exactly the shared rows hold both').toHaveLength(
    fitted.overlap,
  )

  for (const line of rowsWithBoth) {
    expect(
      stripAnsi(line).slice(foeLeft - 2, foeLeft),
      'clear air where they meet',
    ).toBe('  ')
  }
})

test('Should keep a health bar to its own width even while it still shows the HP of the one that just fell', () => {
  expect(stripAnsi(hpBar(10, 20, 20))).toHaveLength(20)
  expect(stripAnsi(hpBar(0, 20, 20))).toHaveLength(20)
  expect(
    stripAnsi(hpBar(85, 60, 20)),
    'the bar of a Pokemon the trainer already swapped out',
  ).toHaveLength(20)
})

test('Should count a trainers Pokémon beside the foe bar, the fallen ones greyed out', () => {
  const standing = { ...POKEMON, species: 143 }
  const fallen = { ...POKEMON, species: 143, hp: 0 }
  const trainer = {
    class: 'Hiker',
    name: 'Wade',
    team: [fallen, standing, { ...POKEMON, species: 143 }],
  }

  const { lines } = drawBattle(
    {
      ...BATTLE_CTX,
      battle: {
        ...BATTLE,
        state: { ...BATTLE.state, trainer },
      },
    },
    { cols: 120, rows: 40 },
  )

  expect(stripAnsi(lines[1]), 'two left of the three').toContain('●●○')
  expect(
    stripAnsi(drawBattle(BATTLE_CTX, { cols: 120, rows: 40 }).lines[1]),
    'a wild Pokémon brings no tray',
  ).not.toContain('●')
})

test('Should always fit the message box, whatever is open and however short the window', () => {
  for (const { menu, message, bagItem } of BATTLE_MENUS) {
    for (let rows = 18; rows <= 60; rows += 2) {
      const { lines } = drawBattle(
        { ...BATTLE_CTX, battle: { ...BATTLE, menu, message, bagItem } },
        { cols: 120, rows },
      )

      expect(
        lines.length,
        `${menu ?? 'a message'} at ${rows} rows built ${lines.length} lines for ${rows - 1}`,
      ).toBeLessThanOrEqual(rows - 1)
    }
  }
})

test('Should grey a disabled move on the fight menu, like one out of PP', () => {
  const grayOpen = gray('').replace(RESET, '')
  const { lines } = drawBattle(
    {
      ...BATTLE_CTX,
      battle: {
        ...BATTLE,
        menu: 'fight',
        state: {
          ...BATTLE.state,
          player: {
            mon: POKEMON,
            volatile: { ...emptyVolatile(), disable: { index: 1, turns: 3 } },
          },
        },
      },
    },
    { cols: 120, rows: 40 },
  )

  const row = lines.find((line) => stripAnsi(line).includes('Growl'))

  expect(row, 'the disabled move is greyed out').toContain(`${grayOpen}Growl`)
  expect(row, 'the usable one is not').not.toContain(`${grayOpen}Tackle`)
})

test('Should keep the bottom border of the box, which the renderer used to cut off', () => {
  const { lines } = drawBattle(
    { ...BATTLE_CTX, battle: { ...BATTLE, menu: 'fight' } },
    { cols: 120, rows: 40 },
  )

  const visible = lines.slice(0, 39)
  const last = stripAnsi(visible[visible.length - 1]).trim()

  expect(last.length, 'the last drawn row is not blank').toBeGreaterThan(0)
  expect(
    /^[└┘─╰╯]/.test(last) || /[┘─╯]$/.test(last),
    `a border, not ${JSON.stringify(last)}`,
  ).toBe(true)
})

test('Should wear a ball on a foe already in the Pokedex, and none on a new one', () => {
  const size = { cols: 120, rows: 40 }

  const fresh = nameRow(BATTLE_CTX, size)

  expect(fresh, 'the foe is named').toContain('SNORLAX')
  expect(fresh, 'one you have never caught carries no ball').not.toContain('◓')

  const owned = nameRow(
    {
      ...BATTLE_CTX,
      save: { ...BATTLE_SAVE, dex: { caught: [143], seen: [], shiny: [] } },
    },
    size,
  )

  expect(owned, 'one you have caught carries a ball after its level').toMatch(
    /SNORLAX[♂♀]? Lv\d+ ◓/,
  )

  const other = nameRow(
    {
      ...BATTLE_CTX,
      save: { ...BATTLE_SAVE, dex: { caught: [4, 25], seen: [], shiny: [] } },
    },
    size,
  )

  expect(other, 'the mark tracks the species on the field').not.toContain('◓')
})

test('Should keep the ball on the field and off the message box', () => {
  const size = { cols: 120, rows: 40 }
  const steps = ballSteps({ shakes: 3, caught: false })

  for (let frame = 0; frame < steps.length; frame++) {
    const { lines, overlays } = drawBattle(
      {
        ...BATTLE_CTX,
        battle: {
          ...BATTLE,
          menu: null,
          message: 'A wild SNORLAX appeared!',
          ball: { shakes: 3, caught: false, frame, done: false },
        },
      },
      size,
    )

    const balls = overlays.filter((overlay) =>
      String(overlay.key ?? '').startsWith('ball:'),
    )

    for (const overlay of balls) {
      expect(
        overlay.col,
        `frame ${frame} starts at column ${overlay.col}`,
      ).toBeGreaterThanOrEqual(1)
      expect(
        overlay.col - 1 + visibleLength(overlay.sequence),
        `frame ${frame} runs past the right edge`,
      ).toBeLessThanOrEqual(size.cols)
      expect(
        overlay.row,
        `frame ${frame} is on a real row`,
      ).toBeGreaterThanOrEqual(1)
      expect(
        overlay.row,
        `frame ${frame} is on a real row`,
      ).toBeLessThanOrEqual(lines.length)
    }
  }
})

const MENU_SAVE = {
  trainer: { name: 'Tester' },
  money: 3000,
  bag: { 'poke-ball': 5, potion: 2, 'thunder-stone': 1 },
  badges: ['pewter'],
  dex: { seen: [4, 25], caught: [4], shiny: [], faced: {} },
  party: [POKEMON, { ...POKEMON, species: 25 }],
  box: [{ ...POKEMON, species: 19 }],
  daycare: { slots: [], egg: null },
  stats: {},
}

const MENU_CTX = {
  save: MENU_SAVE,
  config: DEFAULT_CONFIG,
  spriteScale: 0.65,
  teamSelection: 0,
  boxSelection: 0,
  dexSelection: 0,
  shopSelection: 0,
  optionsSelection: 0,
  bagSelection: null,
  boxMessage: null,
  bagMessage: null,
  shopMessage: null,
  optionsMessage: null,
  daycareStep: 'slots',
  daycareSelection: 0,
  daycarePickSelection: 0,
  daycareMessage: null,
  gym: null,
  gymSelection: 0,
  gymMessage: null,
  gymLeaving: false,
}

const GYM_CTX = {
  ...MENU_CTX,
  gym: { id: 'pewter', index: 1, seed: 1, snapshot: null },
}

const DAYCARE_CTX = {
  ...MENU_CTX,
  save: {
    ...MENU_SAVE,
    daycare: {
      slots: [POKEMON, { ...POKEMON, species: 25 }],
      egg: { species: 25, steps: 120, shiny: false },
    },
  },
}

const DAYCARE_PICK_CTX = {
  ...DAYCARE_CTX,
  daycareStep: 'pick',
}

const MENU_SCREENS = [
  ['TEAM', drawTeam, '[b] the box', MENU_CTX],
  ['BOX', drawBox, '[enter] take it into your team', MENU_CTX],
  ['DAY CARE', drawDaycare, '[esc] back', DAYCARE_CTX],
  ['DAY CARE EMPTY', drawDaycare, '[esc] back', MENU_CTX],
  ['DAY CARE PICK', drawDaycare, '[enter] leave it here', DAYCARE_PICK_CTX],
  ['POKÉDEX', drawDex, '[PgUp/PgDn] jump', MENU_CTX],
  ['SHOP', drawShop, '[5] buy five', MENU_CTX],
  ['OPTION', drawOptions, '← → change', MENU_CTX],
  ['GYMS', drawGyms, '[enter] challenge the gym', MENU_CTX],
  ['GYM', drawGym, '[i] bag', GYM_CTX],
]

test('Should put every menu screen hint where the renderer will draw it', () => {
  for (const [name, draw, hint, ctx] of MENU_SCREENS) {
    for (const rows of [16, 24, 34, 50]) {
      const { lines, overlays } = draw(ctx, { cols: 100, rows })

      expect(
        lines.length,
        `${name} at ${rows} rows built ${lines.length} lines for ${rows - 1}`,
      ).toBeLessThanOrEqual(rows - 1)

      const term = fakeTerminal({ cols: 100, rows })

      term.screen.render(lines, overlays)

      expect(
        stripAnsi(term.since(0)),
        `${name} at ${rows} rows never drew ${JSON.stringify(hint)}`,
      ).toContain(hint)
    }
  }
})

test('Should still say how to get out of a box with nothing in it', () => {
  const { lines } = drawBox(
    { ...MENU_CTX, save: { ...MENU_SAVE, box: [] } },
    { cols: 100, rows: 34 },
  )
  const plain = lines.map(stripAnsi)

  expect(plain.join('\n'), 'it says so').toContain('The box is empty')
  expect(lines, 'and it is closed like every other screen').toHaveLength(33)
  expect(plain[plain.length - 1]).toMatch(/\[esc\]/)
})

test('Should open the bag over the team, on the Pokemon the cursor was on', () => {
  const { lines } = drawBag(
    {
      ...MENU_CTX,
      teamSelection: 1,
      bagSelection: itemsInBag(MENU_SAVE).indexOf('potion'),
    },
    { cols: 100, rows: 34 },
  )
  const plain = lines.map(stripAnsi)

  expect(plain[0], 'the header says which list you are in').toMatch(/BAG/)
  expect(plain[0], 'and who it is for').toMatch(/on PIKACHU/)
  expect(
    plain.find((line) => line.includes('Potion')),
    'the items are the list now',
  ).toMatch(/Potion\s+x2/)
  expect(plain.join('\n'), 'with what the one under the cursor does').toMatch(
    /Restores 20 HP/,
  )
  expect(plain.join('\n')).toMatch(/PIKACHU.*Lv/)
  expect(lines, 'closed like every other screen').toHaveLength(33)
  expect(plain[plain.length - 1]).toMatch(/\[enter\] use it/)
})

test('Should mark the item in the bag that would evolve the Pokemon you have chosen', () => {
  const stone = itemsInBag(MENU_SAVE).indexOf('thunder-stone')

  const stoned = drawBag(
    { ...MENU_CTX, teamSelection: 1, bagSelection: stone },
    { cols: 100, rows: 34 },
  ).lines.map(stripAnsi)

  expect(
    stoned.find((line) => /Thunder Stone/.test(line)),
    'the item that works is marked',
  ).toMatch(/✦/)
  expect(stoned.join('\n'), 'and it says so in words').toMatch(
    /PIKACHU would become RAICHU/,
  )

  const wasted = drawBag(
    { ...MENU_CTX, teamSelection: 0, bagSelection: stone },
    { cols: 100, rows: 34 },
  ).lines.map(stripAnsi)

  expect(wasted.find((line) => /Thunder Stone/.test(line))).not.toMatch(/✦/)
  expect(wasted.join('\n'), 'and promises nothing').not.toMatch(/would become/)
})

test('Should grey a ball in the bag rather than hide it', () => {
  const { lines } = drawBag(
    {
      ...MENU_CTX,
      bagSelection: itemsInBag(MENU_SAVE).indexOf('poke-ball'),
    },
    { cols: 100, rows: 34 },
  )

  expect(
    lines.find((line) => stripAnsi(line).includes('Poké Ball')),
    'it is in the bag, so it is on the list',
  ).toContain(gray('Poké Ball'))
  expect(
    lines.map(stripAnsi).join('\n'),
    'and the screen says why it is not for use here',
  ).toMatch(/Save it for something in the grass/)
})

test('Should keep both halves of what an item just did on screen, however short the window', () => {
  const ctx = {
    ...MENU_CTX,
    bagMessage: [
      'Congratulations! SHELLDER evolved into CLOYSTER!',
      'Cloyster learned Spike Cannon!',
    ],
  }

  for (const rows of [16, 20, 26, 34]) {
    const { lines, overlays } = drawTeam(ctx, { cols: 100, rows })

    expect(
      lines.length,
      `${rows} rows built ${lines.length} lines`,
    ).toBeLessThanOrEqual(rows - 1)

    const term = fakeTerminal({ cols: 100, rows })

    term.screen.render(lines, overlays)

    const drawn = stripAnsi(term.since(0))

    expect(drawn, `the evolution went missing at ${rows}`).toContain(
      'evolved into CLOYSTER',
    )
    expect(drawn, `the move went missing at ${rows}`).toContain(
      'learned Spike Cannon',
    )
  }
})

test('Should spend one cell on a gender symbol, and nothing on no gender', () => {
  expect(visibleLength(genderTag('male'))).toBe(1)
  expect(visibleLength(genderTag('female'))).toBe(1)
  expect(genderTag(null)).toBe('')
})

test('Should show a gender beside every Pokemon in the team without moving the level column', () => {
  const plain = drawTeam(MENU_CTX, { cols: 100, rows: 34 }).lines.map(stripAnsi)

  expect(plain.join('\n'), 'Charmander is male here').toMatch(/CHARMANDER♂/)
  expect(plain.join('\n'), 'Pikachu is female here').toMatch(/PIKACHU♀/)

  const levelColumns = plain
    .filter((line) => /Lv\d/.test(line) && /CHARMANDER|PIKACHU/.test(line))
    .map((line) => line.indexOf('Lv'))

  expect(levelColumns).toHaveLength(2)
  expect(levelColumns[0], 'the name column still lines up').toBe(
    levelColumns[1],
  )
})

test('Should wear their gender on both sides of a battle', () => {
  const pikachu = { ...POKEMON, species: 25 }
  const { lines } = drawBattle(
    {
      ...BATTLE_CTX,
      battle: {
        ...BATTLE,
        state: { ...BATTLE.state, foe: { mon: pikachu } },
        foeMon: pikachu,
      },
    },
    { cols: 100, rows: 34 },
  )
  const plain = lines.map(stripAnsi).join('\n')

  expect(plain).toMatch(/PIKACHU♀/)
  expect(plain).toMatch(/CHARMANDER♂/)
})

test('Should tell the two Nidoran apart in the Pokedex without their suffixes', () => {
  const { lines } = drawDex(
    {
      ...MENU_CTX,
      save: {
        ...MENU_SAVE,
        dex: { seen: [29, 32], caught: [29], shiny: [], faced: {} },
      },
    },
    { cols: 100, rows: 40 },
  )
  const plain = lines.map(stripAnsi).join('\n')

  expect(plain, 'the PokeAPI suffix is gone').not.toMatch(/Nidoran-[fm]/)
  expect(plain).toMatch(/Nidoran♀/)
  expect(plain).toMatch(/Nidoran♂/)
})

test('Should star the species you own a shiny of in the Pokedex and say so in its entry', () => {
  const plain = drawDex(
    {
      ...MENU_CTX,
      dexSelection: 3,
      save: {
        ...MENU_SAVE,
        dex: { seen: [4, 25], caught: [4], shiny: [4], faced: {} },
      },
    },
    { cols: 100, rows: 40 },
  )
    .lines.map(stripAnsi)
    .join('\n')

  expect(plain, 'the list marks it').toContain(`Charmander ${SHINY_MARK}`)
  expect(plain, 'and the entry spells it out').toContain(
    DEX_MESSAGES.shinyCaught,
  )
})

test('Should say how many of one you have faced in the Pokedex, and stay quiet at none', () => {
  const bare = drawDex(
    { ...MENU_CTX, dexSelection: 3 },
    { cols: 100, rows: 40 },
  )
    .lines.map(stripAnsi)
    .join('\n')

  expect(bare, 'a save with no tally yet says nothing').not.toMatch(/Faced/)

  const once = drawDex(
    {
      ...MENU_CTX,
      dexSelection: 3,
      save: {
        ...MENU_SAVE,
        dex: { seen: [4, 25], caught: [4], shiny: [], faced: { 4: 1 } },
      },
    },
    { cols: 100, rows: 40 },
  )
    .lines.map(stripAnsi)
    .join('\n')

  expect(once, 'and one reads as a word rather than "1 times"').toMatch(
    /Faced once/,
  )

  const many = drawDex(
    {
      ...MENU_CTX,
      dexSelection: 3,
      save: {
        ...MENU_SAVE,
        dex: { seen: [4, 25], caught: [4], shiny: [], faced: { 4: 12, 25: 3 } },
      },
    },
    { cols: 100, rows: 40 },
  )
    .lines.map(stripAnsi)
    .join('\n')

  expect(many, 'the highlighted entry, not somebody else').toMatch(
    /Faced 12 times/,
  )
})

test('Should give a Pokemon with no gender no symbol, and nor an unreadable one', () => {
  const plain = drawTeam(
    {
      ...MENU_CTX,
      save: {
        ...MENU_SAVE,
        party: [
          { ...POKEMON, species: 81 },
          { ...POKEMON, species: 25, ivs: null },
        ],
      },
    },
    { cols: 100, rows: 34 },
  ).lines.map(stripAnsi)

  expect(
    plain.find((line) => line.includes('MAGNEMITE')),
    'Magnemite stands alone',
  ).toMatch(/MAGNEMITE\s/)
  expect(
    plain.find((line) => line.includes('PIKACHU')),
    'and so does the one we cannot read',
  ).toMatch(/PIKACHU\s/)
  expect(plain.join('\n'), 'no symbol anywhere on the screen').not.toMatch(
    /[♂♀]/,
  )
})

test('Should show a gym run as a gauntlet: what is beaten, who is next and who is still waiting', () => {
  const plain = drawGym(GYM_CTX, { cols: 100, rows: 34 }).lines.map(stripAnsi)
  const roster = plain.filter((line) => line.includes('Lv1'))

  expect(plain[0], 'the gym names itself, its type and the prize').toContain(
    'PEWTER GYM',
  )
  expect(plain[0]).toContain('Boulder Badge')

  expect(roster.find((line) => line.includes('CAMPER LIAM'))).toContain('✔')
  expect(roster.find((line) => line.includes('HIKER WADE'))).toContain('▶')
  expect(roster.find((line) => line.includes('LEADER BROCK'))).toContain('·')

  expect(plain.join('\n'), 'and it says who you are about to face').toContain(
    'HIKER WADE',
  )
  expect(plain.join('\n'), 'and that the shop is behind you').toContain(
    'No shop, no rest',
  )
})

test('Should keep the gym prompt on screen at every height, so no forfeit goes unconfirmed', () => {
  const party = Array.from({ length: 6 }, (_, index) => {
    return { ...POKEMON, species: 4 + index }
  })
  const ctx = {
    ...GYM_CTX,
    save: { ...MENU_SAVE, party },
    gymLeaving: true,
  }

  for (const rows of [16, 18, 20, 24, 34]) {
    const { lines } = drawGym(ctx, { cols: 100, rows })

    expect(
      lines.length,
      `a full team at ${rows} rows built ${lines.length} lines for ${rows - 1}`,
    ).toBeLessThanOrEqual(rows - 1)
    expect(
      lines.map(stripAnsi).join('\n'),
      `the walk-out question is cut off at ${rows} rows`,
    ).toContain('[esc] again to leave')
  }
})

test('Should mark the gyms you have won and the one you are looking at', () => {
  const plain = drawGyms(MENU_CTX, { cols: 100, rows: 34 }).lines.map(stripAnsi)
  const pewter = plain.find((line) => line.includes('PEWTER'))
  const cerulean = plain.find((line) => line.includes('CERULEAN'))

  expect(plain[0], 'the strip counts the badges').toContain('1/8 badges')
  expect(pewter, 'a won gym is filled in').toContain('◆')
  expect(cerulean, 'an unwon one is not').toContain('◇')
  expect(pewter, 'and every row says the type and the levels').toContain('ROCK')
  expect(pewter).toContain('Lv10-14')

  expect(
    plain.join('\n'),
    'the detail names the badge and the leader',
  ).toContain('BOULDER BADGE')
  expect(plain.join('\n')).toContain('LEADER BROCK')
  expect(plain.join('\n'), 'and what you are walking in with').toContain(
    'Potions 2',
  )
})
