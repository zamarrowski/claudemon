import {
  GLYPH_WIDTH,
  GLYPHS,
  GLYPH_HEIGHT,
  MISSING_GLYPH,
} from './constants.mjs'

export const createCanvas = (width, height, colour) => {
  const canvas = { width, height, pixels: new Uint8Array(width * height * 4) }

  fillRect(canvas, 0, 0, width, height, colour)

  return canvas
}

const blend = (canvas, x, y, [r, g, b], alpha) => {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return
  if (alpha <= 0) return

  const target = (y * canvas.width + x) * 4
  const weight = alpha / 255
  const kept = 1 - weight

  canvas.pixels[target] = Math.round(canvas.pixels[target] * kept + r * weight)
  canvas.pixels[target + 1] = Math.round(
    canvas.pixels[target + 1] * kept + g * weight,
  )
  canvas.pixels[target + 2] = Math.round(
    canvas.pixels[target + 2] * kept + b * weight,
  )
  canvas.pixels[target + 3] = Math.max(canvas.pixels[target + 3], alpha)
}

export const fillRect = (canvas, x, y, width, height, colour) => {
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      blend(canvas, x + column, y + row, colour, 255)
    }
  }

  return canvas
}

export const drawSprite = (canvas, sprite, x, y, scale) => {
  for (let row = 0; row < sprite.height; row++) {
    for (let column = 0; column < sprite.width; column++) {
      const source = (row * sprite.width + column) * 4
      const alpha = sprite.pixels[source + 3]

      if (alpha === 0) continue

      const colour = [
        sprite.pixels[source],
        sprite.pixels[source + 1],
        sprite.pixels[source + 2],
      ]

      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          blend(
            canvas,
            x + column * scale + dx,
            y + row * scale + dy,
            colour,
            alpha,
          )
        }
      }
    }
  }

  return canvas
}

export const drawArt = (canvas, rows, palette, x, y, scale) => {
  for (let row = 0; row < rows.length; row++) {
    for (let column = 0; column < rows[row].length; column++) {
      const colour = palette[rows[row][column]]

      if (!colour) continue

      fillRect(
        canvas,
        x + column * scale,
        y + row * scale,
        scale,
        scale,
        colour,
      )
    }
  }

  return canvas
}

export const drawDiamond = (canvas, centreX, centreY, radius, colour) => {
  for (let row = -radius; row <= radius; row++) {
    const half = radius - Math.abs(row)

    fillRect(canvas, centreX - half, centreY + row, half * 2 + 1, 1, colour)
  }

  return canvas
}

const glyphOf = (character) => GLYPHS[character] ?? MISSING_GLYPH

export const textWidth = (text, scale) => {
  if (text.length === 0) return 0

  return (text.length * (GLYPH_WIDTH + 1) - 1) * scale
}

export const textHeight = (scale) => GLYPH_HEIGHT * scale

export const drawText = (canvas, text, x, y, colour, scale) => {
  for (let index = 0; index < text.length; index++) {
    drawArt(
      canvas,
      glyphOf(text[index].toUpperCase()),
      { '.': null, '#': colour },
      x + index * (GLYPH_WIDTH + 1) * scale,
      y,
      scale,
    )
  }

  return canvas
}
