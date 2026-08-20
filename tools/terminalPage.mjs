import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hexColour } from './helpers.mjs'
import {
  CAPTURE_BLOCK_RECTS,
  CAPTURE_BOX_SEGMENTS,
  CAPTURE_CELL_HEIGHT,
  CAPTURE_CELL_WIDTH,
  CAPTURE_FONT,
  CAPTURE_FONT_ADVANCE_SAMPLE,
  CAPTURE_PALETTE,
  CAPTURE_SHADE_GLYPHS,
  CAPTURE_SHADE_PERIOD,
  CAPTURE_STROKE_DIVISOR,
  CAPTURE_SYMBOL_FIT,
} from './constants.mjs'

const RENDERER_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  'terminalCanvas.mjs',
)

export const terminalData = ({ cols, rows, cells }) => {
  return {
    cols,
    rows,
    cells,
    cellWidth: CAPTURE_CELL_WIDTH,
    cellHeight: CAPTURE_CELL_HEIGHT,
    background: hexColour(CAPTURE_PALETTE.background),
    font: CAPTURE_FONT,
    advanceSample: CAPTURE_FONT_ADVANCE_SAMPLE,
    strokeDivisor: CAPTURE_STROKE_DIVISOR,
    shadePeriod: CAPTURE_SHADE_PERIOD,
    symbolFit: CAPTURE_SYMBOL_FIT,
    blocks: CAPTURE_BLOCK_RECTS,
    boxes: CAPTURE_BOX_SEGMENTS,
    shades: CAPTURE_SHADE_GLYPHS,
  }
}

export const terminalPage = (grid) => {
  const data = terminalData(grid)
  const renderer = readFileSync(RENDERER_FILE, 'utf8')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
html, body { margin: 0; padding: 0; background: ${data.background}; }
canvas { display: block; }
</style></head>
<body><canvas id="terminal"></canvas>
<script type="module">
${renderer}
drawTerminal(document.getElementById('terminal'), ${JSON.stringify(data)})
</script>
</body>
</html>
`
}

export const pageSize = (grid) => {
  return {
    width: grid.cols * CAPTURE_CELL_WIDTH,
    height: grid.rows * CAPTURE_CELL_HEIGHT,
  }
}
