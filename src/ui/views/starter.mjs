import { STARTERS, STAT_NAMES } from '../../constants.mjs'
import { species } from '../../data.mjs'
import { statsAtLevel } from '../../stats.mjs'
import { spriteFile } from '../../paths.mjs'
import { bold, brightYellow, dim, gray } from '../ansi.mjs'
import { fitCanvasCols, loadSprite, placeSprite } from '../sprite.mjs'
import { centre, hintLine, typeBadge, wrap } from '../widgets.mjs'
import {
  APP_TITLE,
  AVERAGE_IV,
  MAX_NAME,
  NO_SPRITE_MESSAGE,
  PREVIEW_LEVEL,
  STARTER_HINTS,
  STARTER_PROMPTS,
  STARTER_SPRITE_RESERVED_ROWS,
} from './constants.mjs'

export const draw = (ctx, size) => {
  const { cols, rows } = size
  const lines = []
  const overlays = []

  lines.push('')
  lines.push(centre(`${brightYellow('◓')} ${bold(APP_TITLE)}`, cols))
  lines.push('')

  if (ctx.setup.step === 'name') {
    lines.push('')
    lines.push(centre(STARTER_PROMPTS.intro, cols))
    lines.push('')
    lines.push(centre(STARTER_PROMPTS.askName, cols))
    lines.push('')

    const cursor = ctx.setup.blink ? '█' : ' '

    lines.push(centre(`${bold(ctx.setup.name)}${cursor}`, cols))
    lines.push('')
    lines.push(
      centre(
        hintLine(
          `${STARTER_HINTS.confirm} ${MAX_NAME} ${STARTER_HINTS.characters}`,
        ),
        cols,
      ),
    )

    return { lines, overlays }
  }

  const chosenId = STARTERS[ctx.setup.selection]
  const chosen = species(chosenId)

  lines.push(centre(STARTER_PROMPTS.choose, cols))
  lines.push('')

  const sprite = loadSprite(spriteFile('front', chosenId, 'png'), {
    cols: fitCanvasCols(size, STARTER_SPRITE_RESERVED_ROWS, ctx.spriteScale),
  })

  if (sprite)
    placeSprite(
      lines,
      sprite,
      Math.max(1, Math.floor((cols - sprite.cols) / 2)),
    )
  else lines.push(centre(gray(NO_SPRITE_MESSAGE), cols))

  lines.push('')
  lines.push(centre(bold(chosen.name.toUpperCase()), cols))
  lines.push(centre(chosen.types.map(typeBadge).join(' '), cols))
  lines.push('')

  const stats = statsAtLevel(
    chosenId,
    PREVIEW_LEVEL,
    Object.fromEntries(STAT_NAMES.map((key) => [key, AVERAGE_IV])),
  )

  lines.push(
    centre(
      dim(
        `at level ${PREVIEW_LEVEL} — HP ${stats.hp} · Atk ${stats.attack} · Def ${stats.defense} · Spd ${stats.speed}`,
      ),
      cols,
    ),
  )

  lines.push('')

  const picker = STARTERS.map((id, index) => {
    const name = species(id).name.toUpperCase()

    return index === ctx.setup.selection
      ? `${brightYellow('▶')} ${bold(name)}`
      : dim(name)
  }).join('    ')

  lines.push(centre(picker, cols))

  while (lines.length < rows - 2) lines.push('')

  lines.push(centre(hintLine(STARTER_HINTS.pick), cols))

  return { lines, overlays }
}

export const onKey = (ctx, key) => {
  if (ctx.setup.step === 'name') {
    if (key.name === 'enter') {
      const trimmed = ctx.setup.name.trim()

      if (trimmed.length > 0) ctx.setup.step = 'starter'

      return
    }

    if (key.name === 'backspace') {
      ctx.setup.name = ctx.setup.name.slice(0, -1)

      return
    }

    if (
      key.char &&
      key.char.length === 1 &&
      key.char >= ' ' &&
      ctx.setup.name.length < MAX_NAME
    ) {
      ctx.setup.name += key.char
    }
    return
  }

  if (key.name === 'left') {
    ctx.setup.selection = wrap(ctx.setup.selection - 1, STARTERS.length)
  } else if (key.name === 'right') {
    ctx.setup.selection = wrap(ctx.setup.selection + 1, STARTERS.length)
  } else if (key.name === 'enter' || key.name === 'space') {
    ctx.finishSetup(STARTERS[ctx.setup.selection])
  }
}
