import { bold, dim } from '../src/ui/ansi.mjs'
import { PREVIEW_COLS, PREVIEW_ROWS, SHOT_MESSAGES } from './constants.mjs'
import { SCENES, buildScene, drawScene } from './scenes.mjs'

const [requested, colsArg, rowsArg] = process.argv.slice(2)
const cols = Number(colsArg) || PREVIEW_COLS
const rows = Number(rowsArg) || PREVIEW_ROWS

const rule = (title) => {
  const tail = '─'.repeat(Math.max(0, cols - title.length - 4))

  return `\n${bold(`── ${title} `)}${dim(tail)}\n`
}

const show = (title, lines, overlays) => {
  process.stdout.write(rule(title))
  process.stdout.write(lines.join('\n') + '\n')

  for (const overlay of overlays) {
    const up = lines.length - overlay.row + 1

    if (up < 1) continue

    process.stdout.write(
      `\x1b7\x1b[${up}A\r\x1b[${overlay.col - 1}C${overlay.sequence}\x1b8`,
    )
  }
}

const names = requested ? [requested] : Object.keys(SCENES)

for (const name of names) {
  const app = buildScene(name, { cols, rows })

  if (!app) {
    process.stderr.write(
      `${SHOT_MESSAGES.unknownScene} ${Object.keys(SCENES).join(', ')}\n`,
    )
    process.exit(1)
  }

  const { lines, overlays } = drawScene(app)

  show(name, lines, overlays)
}

process.stdout.write('\n')
