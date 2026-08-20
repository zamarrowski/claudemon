import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCaptureHome } from './captureHome.mjs'
import { toCellGrid } from './cellGrid.mjs'
import { pageSize, terminalPage } from './terminalPage.mjs'
import { upscaleImage } from './upscale.mjs'
import {
  CAPTURE_CARD_SCALE,
  CAPTURE_SHOTS,
  CHROME_ARGS,
  CHROME_PATH,
  SHOT_KINDS,
  SHOT_MESSAGES,
} from './constants.mjs'

const DOCS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')

prepareCaptureHome()

const { buildScene, drawScene } = await import('./scenes.mjs')
const { decodePng, encodeSmallestPng } = await import('../src/png.mjs')
const { drawCard } = await import('../src/ui/card.mjs')

const chromePath = () => process.env.CLAUDEMON_CHROME || CHROME_PATH

const gridOf = (shot) => {
  const size = { cols: shot.cols, rows: shot.rows }
  const rows = shot.rows - 1
  const { lines, overlays } = drawScene(buildScene(shot.scene, size))

  return toCellGrid({
    lines: lines.slice(0, rows),
    overlays,
    cols: shot.cols,
    rows,
  })
}

const shoot = (html, size, out) => {
  const workspace = mkdtempSync(join(tmpdir(), 'claudemon-shot-'))
  const page = join(workspace, 'shot.html')

  writeFileSync(page, html)

  const chrome = spawnSync(
    chromePath(),
    [
      ...CHROME_ARGS,
      `--window-size=${size.width},${size.height}`,
      `--screenshot=${out}`,
      `file://${page}`,
    ],
    { encoding: 'utf8' },
  )

  if (chrome.error) throw chrome.error
  if (chrome.status !== 0)
    throw new Error(chrome.stderr || SHOT_MESSAGES.failed)
}

const shrink = (out) => {
  const written = readFileSync(out)
  const repacked = encodeSmallestPng(decodePng(written))

  if (repacked.length < written.length) writeFileSync(out, repacked)

  return out
}

const captureTerminal = (shot, out) => {
  const grid = gridOf(shot)
  const size = pageSize(grid)

  shoot(terminalPage(grid), size, out)
  shrink(out)

  return size
}

const captureCard = (shot, out) => {
  const app = buildScene(shot.scene, { cols: shot.cols, rows: shot.rows })
  const card = upscaleImage(drawCard(app.save), CAPTURE_CARD_SCALE)

  writeFileSync(out, encodeSmallestPng(card))

  return { width: card.width, height: card.height }
}

const capture = (shot) => {
  const out = join(DOCS_DIR, shot.file)
  const size =
    shot.kind === SHOT_KINDS.card
      ? captureCard(shot, out)
      : captureTerminal(shot, out)

  return { file: shot.file, size, bytes: readFileSync(out).length }
}

const report = ({ file, size, bytes }) => {
  const weight = `${(bytes / 1024).toFixed(0)}kb`

  process.stdout.write(`${file}  ${size.width}×${size.height}  ${weight}\n`)
}

const requested = process.argv.slice(2)
const wanted = requested.length
  ? CAPTURE_SHOTS.filter((shot) => requested.includes(shot.file))
  : CAPTURE_SHOTS

if (!wanted.length) {
  process.stderr.write(
    `${SHOT_MESSAGES.unknown} ${CAPTURE_SHOTS.map((shot) => shot.file).join(', ')}\n`,
  )
  process.exit(1)
}

for (const shot of wanted) report(capture(shot))
