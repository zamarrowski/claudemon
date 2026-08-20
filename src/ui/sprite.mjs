import { existsSync, readFileSync } from 'node:fs'
import { decodePng } from '../png.mjs'
import { bg, COLOR_ENABLED, fg, RESET } from './ansi.mjs'
import {
  ALPHA_CUTOFF,
  CANVAS_WIDTH_SLACK,
  CELL_ASPECT,
  DEFAULT_RESERVED_ROWS,
  DEFAULT_SPRITE_COLS,
  HALF_GLYPHS,
  MIN_CANVAS_COLS,
  MIN_SPRITE_COLS,
  NATIVE_CANVAS_COLS,
  QUADRANT_GLYPHS,
  RENDER_CACHE_LIMIT,
} from './constants.mjs'

const quadrantGlyph = (mask) => QUADRANT_GLYPHS[mask]

const halfGlyph = (mask) => HALF_GLYPHS[mask]

export const BLOCK_GRIDS = {
  half: { cols: 1, rows: 2, glyph: halfGlyph },
  quadrant: { cols: 2, rows: 2, glyph: quadrantGlyph },
}

const resample = ({ width, height, pixels }, targetWidth, targetHeight) => {
  const out = new Uint8Array(targetWidth * targetHeight * 4)
  const tally = new Map()

  for (let ty = 0; ty < targetHeight; ty++) {
    const y0 = Math.floor((ty * height) / targetHeight)
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * height) / targetHeight))

    for (let tx = 0; tx < targetWidth; tx++) {
      const x0 = Math.floor((tx * width) / targetWidth)
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * width) / targetWidth))

      tally.clear()

      let opaque = 0
      let total = 0
      let best = 0
      let bestCount = 0

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const source = (y * width + x) * 4

          total++

          if (pixels[source + 3] <= ALPHA_CUTOFF) continue

          opaque++

          const colour =
            (pixels[source] << 16) |
            (pixels[source + 1] << 8) |
            pixels[source + 2]
          const count = (tally.get(colour) ?? 0) + 1

          tally.set(colour, count)

          if (count > bestCount) {
            best = colour
            bestCount = count
          }
        }
      }

      const target = (ty * targetWidth + tx) * 4

      if (opaque === 0) {
        out[target + 3] = 0
      } else {
        out[target] = (best >> 16) & 0xff
        out[target + 1] = (best >> 8) & 0xff
        out[target + 2] = best & 0xff
        out[target + 3] = opaque * 2 >= total ? 255 : 0
      }
    }
  }

  return { width: targetWidth, height: targetHeight, pixels: out }
}

const colourDistance = (a, b) => {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]

  return dr * dr + dg * dg + db * db
}

const twoColours = (colours) => {
  const tally = new Map()

  for (const colour of colours) {
    const key = (colour[0] << 16) | (colour[1] << 8) | colour[2]

    tally.set(key, (tally.get(key) ?? 0) + 1)
  }

  let a = colours[0]
  let bestCount = 0

  for (const [key, count] of tally) {
    if (count > bestCount) {
      a = [(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff]
      bestCount = count
    }
  }

  let b = null

  for (const c of colours) {
    if (b === null || colourDistance(c, a) > colourDistance(b, a)) b = c
  }

  if (colourDistance(a, b) === 0)
    return { front: a, back: null, belongsToFront: colours.map(() => true) }

  const toA = colours.map((c) => colourDistance(c, a) <= colourDistance(c, b))
  const countA = toA.filter(Boolean).length

  return countA >= colours.length - countA
    ? { front: a, back: b, belongsToFront: toA }
    : { front: b, back: a, belongsToFront: toA.map((x) => !x) }
}

export const blockRows = (image, cols, grid = BLOCK_GRIDS.quadrant) => {
  const rows = Math.max(
    1,
    Math.round((cols * image.height) / (CELL_ASPECT * image.width)),
  )
  const scaled = resample(image, cols * grid.cols, rows * grid.rows)

  const lines = []

  for (let row = 0; row < rows; row++) {
    let line = ''
    let styled = false

    for (let col = 0; col < cols; col++) {
      const colours = []
      const solid = []

      for (let y = 0; y < grid.rows; y++) {
        for (let x = 0; x < grid.cols; x++) {
          const at =
            ((row * grid.rows + y) * scaled.width + col * grid.cols + x) * 4

          if (scaled.pixels[at + 3] > ALPHA_CUTOFF) {
            solid.push(true)
            colours.push([
              scaled.pixels[at],
              scaled.pixels[at + 1],
              scaled.pixels[at + 2],
            ])
          } else {
            solid.push(false)
          }
        }
      }

      if (colours.length === 0) {
        if (styled) {
          line += RESET
          styled = false
        }

        line += ' '
        continue
      }

      if (!COLOR_ENABLED) {
        let mask = 0

        solid.forEach((on, index) => {
          if (on) mask |= 1 << index
        })

        line += grid.glyph(mask)
        continue
      }

      const { front, back, belongsToFront } = twoColours(colours)

      const opaque = colours.length === solid.length
      let mask = 0
      let seen = 0

      solid.forEach((on, index) => {
        if (!on) return

        const toFront = belongsToFront[seen++]

        if (toFront || !(opaque && back)) mask |= 1 << index
      })

      if (opaque && !back) {
        line += bg(...front) + ' '
      } else if (opaque) {
        line += fg(...front) + bg(...back) + grid.glyph(mask)
      } else {
        line += RESET + fg(...front) + grid.glyph(mask)
      }

      styled = true
    }

    lines.push(styled ? line + RESET : line)
  }

  return lines
}

export const halfBlockRows = (image, cols) => {
  return blockRows(image, cols, BLOCK_GRIDS.half)
}

export const cropToContent = (image) => {
  let minX = image.width
  let minY = image.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.pixels[(y * image.width + x) * 4 + 3] <= ALPHA_CUTOFF) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0)
    return {
      width: image.width,
      height: image.height,
      pixels: image.pixels,
      canvasFraction: 1,
    }

  const width = maxX - minX + 1
  const height = maxY - minY + 1
  const pixels = new Uint8Array(width * height * 4)

  for (let y = 0; y < height; y++) {
    const from = ((minY + y) * image.width + minX) * 4

    pixels.set(image.pixels.subarray(from, from + width * 4), y * width * 4)
  }

  return { width, height, pixels, canvasFraction: width / image.width }
}

export const canvasCols = ({ cols, rows }, scale = 1) => {
  const byHeight = Math.max(MIN_CANVAS_COLS, rows * 2)
  const byWidth = Math.max(MIN_CANVAS_COLS, cols)
  const room = Math.min(NATIVE_CANVAS_COLS, byWidth, byHeight)

  return Math.max(MIN_CANVAS_COLS, Math.round(room * scale))
}

export const fitCanvasCols = (
  { cols, rows },
  reservedRows = DEFAULT_RESERVED_ROWS,
  scale = 1,
) => {
  return canvasCols(
    { cols: cols - CANVAS_WIDTH_SLACK, rows: rows - reservedRows },
    scale,
  )
}

const renderCache = new Map()

const renderSpriteUncached = (pngPath, cols) => {
  const sprite = cropToContent(decodePng(readFileSync(pngPath)))
  const targetCols = Math.max(
    MIN_SPRITE_COLS,
    Math.round(cols * sprite.canvasFraction),
  )

  return {
    rows: blockRows(sprite, targetCols),
    cols: targetCols,
  }
}

export const renderSprite = (pngPath, { cols = DEFAULT_SPRITE_COLS }) => {
  const key = `${pngPath}|${cols}`

  const hit = renderCache.get(key)

  if (hit) return hit

  const rendered = renderSpriteUncached(pngPath, cols)

  if (renderCache.size >= RENDER_CACHE_LIMIT)
    renderCache.delete(renderCache.keys().next().value)

  renderCache.set(key, rendered)

  return rendered
}

export const loadSprite = (pngPath, { cols }) => {
  if (!existsSync(pngPath)) return null

  try {
    return renderSprite(pngPath, { cols })
  } catch {
    return null
  }
}

const shrinkToBox = (pngPath, sprite, canvas, box) => {
  const over = Math.max(sprite.cols / box.cols, spriteHeight(sprite) / box.rows)

  if (over <= 1) return sprite
  if (canvas <= MIN_CANVAS_COLS) return sprite

  const smaller = Math.max(
    MIN_CANVAS_COLS,
    Math.min(canvas - 1, Math.floor(canvas / over)),
  )

  return shrinkToBox(
    pngPath,
    loadSprite(pngPath, { cols: smaller }),
    smaller,
    box,
  )
}

export const fitSpriteInBox = (pngPath, box, scale = 1) => {
  const canvas = Math.max(
    MIN_CANVAS_COLS,
    Math.round(NATIVE_CANVAS_COLS * scale),
  )
  const sprite = loadSprite(pngPath, { cols: canvas })

  if (!sprite) return null

  return shrinkToBox(pngPath, sprite, canvas, box)
}

export const placeSprite = (lines, sprite, indent) => {
  for (const row of sprite.rows) lines.push(' '.repeat(indent) + row)

  return sprite.rows.length
}

export const spriteHeight = (sprite) => sprite.rows.length
