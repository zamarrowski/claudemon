import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { CARD_HEIGHT, CARD_WIDTH } from '../src/ui/constants.mjs'
import {
  CAPTURE_CARD_SCALE,
  CAPTURE_CELL_HEIGHT,
  CAPTURE_CELL_WIDTH,
  CAPTURE_SHOTS,
  SHOT_KINDS,
} from '../tools/constants.mjs'

const DOCS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')

const IHDR_AT = 16

const sizeOf = (file) => {
  const png = readFileSync(join(DOCS_DIR, file))

  return {
    width: png.readUInt32BE(IHDR_AT),
    height: png.readUInt32BE(IHDR_AT + 4),
  }
}

const landingPage = () => readFileSync(join(DOCS_DIR, 'index.html'), 'utf8')

const columnWidth = () => {
  const [, max, padding] = landingPage().match(
    /\.wrap \{[^}]*max-width: ([\d.]+)rem;[^}]*padding: 0 ([\d.]+)rem/,
  )

  return (Number(max) - Number(padding) * 2) * 16
}

const declaredSizes = () => {
  const page = landingPage()
  const tags = page.matchAll(
    /<img src="([^"]+\.png)" width="(\d+)" height="(\d+)"/g,
  )

  return [...tags].map(([, file, width, height]) => ({
    file,
    width: Number(width),
    height: Number(height),
  }))
}

const expectedSize = (shot) => {
  if (shot.kind === SHOT_KINDS.card)
    return {
      width: CARD_WIDTH * CAPTURE_CARD_SCALE,
      height: CARD_HEIGHT * CAPTURE_CARD_SCALE,
    }

  return {
    width: shot.cols * CAPTURE_CELL_WIDTH,
    height: (shot.rows - 1) * CAPTURE_CELL_HEIGHT,
  }
}

test('Should ship every capture at the size the recipe asks for', () => {
  for (const shot of CAPTURE_SHOTS)
    expect(sizeOf(shot.file), shot.file).toEqual(expectedSize(shot))
})

test('Should give every landing image the width and height of the file it points at', () => {
  const declared = declaredSizes()

  expect(declared.length).toBeGreaterThan(CAPTURE_SHOTS.length)

  for (const entry of declared)
    expect(sizeOf(entry.file), entry.file).toEqual({
      width: entry.width,
      height: entry.height,
    })
})

test('Should give the column of the landing exactly twice the pixels it shows', () => {
  const captures = CAPTURE_SHOTS.filter((shot) => shot.kind !== SHOT_KINDS.card)

  for (const shot of captures)
    expect(shot.cols * CAPTURE_CELL_WIDTH, shot.file).toBe(columnWidth() * 2)
})
