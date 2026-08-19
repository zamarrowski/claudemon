import { TRADE_CODE_PATTERN } from '../../constants.mjs'
import { monSpriteFile } from '../../paths.mjs'
import { displayName, levelOf } from '../../pokemon.mjs'
import { bold, brightGreen, brightYellow, dim } from '../ansi.mjs'
import { fitCanvasCols, loadSprite, placeSprite } from '../sprite.mjs'
import { chunk } from '../text.mjs'
import { hintLine, panel, shinyTag, withFooter } from '../widgets.mjs'
import {
  MAX_TRADE_WIDTH,
  TRADE_CODE_HINTS,
  TRADE_CODE_ROWS,
  TRADE_CONFIRM_HINTS,
  TRADE_INPUT_ROWS,
  TRADE_PROMPT_MARK,
  TRADE_PROMPTS,
  TRADE_RECEIVE_HINTS,
  TRADE_SPRITE_RESERVED_ROWS,
  TRADE_TITLE,
  TRADE_WARNING,
  TRADE_WARNING_TITLE,
} from './constants.mjs'

const headerRow = () => ` ${brightYellow('◓')} ${bold(TRADE_TITLE)}`

const warningRows = (name) => {
  return [
    `${bold(name)} ${TRADE_WARNING.leaves}`,
    TRADE_WARNING.noWayBack,
    '',
    TRADE_WARNING.exact,
    TRADE_WARNING.andAll,
  ]
}

const codeRows = (code, width, limit) => {
  const rows = chunk(code, width)

  if (rows.length <= limit) return rows

  const shown = rows.slice(0, limit - 1)
  const hidden = code.length - shown.join('').length

  return [...shown, dim(`… +${hidden} more`)]
}

const drawConfirm = (ctx, size) => {
  const { cols, rows } = size
  const width = Math.min(cols - 4, MAX_TRADE_WIDTH)
  const mon = ctx.tradeGiving.mon
  const name = displayName(mon).toUpperCase()

  const lines = [headerRow(), '']

  lines.push(
    ` ${TRADE_PROMPTS.ask} ${bold(name)}${shinyTag(mon.shiny)} ${dim(
      `Lv${levelOf(mon)}`,
    )} ${TRADE_PROMPTS.away}`,
  )
  lines.push('')

  for (const row of panel(warningRows(name), width, {
    title: TRADE_WARNING_TITLE,
  }))
    lines.push(` ${row}`)

  const sprite = loadSprite(monSpriteFile('front', mon.species, mon.shiny), {
    cols: fitCanvasCols(size, TRADE_SPRITE_RESERVED_ROWS, ctx.spriteScale),
  })

  lines.push('')

  if (sprite)
    placeSprite(
      lines,
      sprite,
      Math.max(1, Math.floor((width - sprite.cols) / 2)),
    )

  return {
    lines: withFooter(lines, hintLine(TRADE_CONFIRM_HINTS), rows),
    overlays: [],
  }
}

const drawCode = (ctx, size) => {
  const { cols, rows } = size
  const width = Math.min(cols - 4, MAX_TRADE_WIDTH)
  const name = displayName(ctx.tradeGone).toUpperCase()

  const lines = [headerRow(), '']

  lines.push(` ${bold(name)} ${TRADE_PROMPTS.onItsWay}`)
  lines.push('')

  for (const row of codeRows(ctx.tradeCode, width, TRADE_CODE_ROWS))
    lines.push(` ${brightGreen(row)}`)

  lines.push('')
  lines.push(
    ` ${dim(ctx.tradeCopied ? TRADE_PROMPTS.copied : TRADE_PROMPTS.notCopied)}`,
  )
  lines.push(
    ` ${dim(
      ctx.tradePath
        ? `${TRADE_PROMPTS.writtenTo} ${ctx.tradePath}`
        : TRADE_PROMPTS.notWritten,
    )}`,
  )
  lines.push('')
  lines.push(` ${dim(TRADE_PROMPTS.gone)}`)

  return {
    lines: withFooter(lines, hintLine(TRADE_CODE_HINTS), rows),
    overlays: [],
  }
}

const drawReceive = (ctx, size) => {
  const { cols, rows } = size
  const width = Math.min(cols - 4, MAX_TRADE_WIDTH)

  const lines = [headerRow(), '']

  lines.push(` ${TRADE_PROMPTS.paste}`)
  lines.push('')

  const typed = codeRows(ctx.tradeInput, width - 2, TRADE_INPUT_ROWS)

  lines.push(` ${dim(TRADE_PROMPT_MARK)} ${typed[0] ?? ''}█`)

  for (const row of typed.slice(1)) lines.push(`   ${row}`)

  lines.push('')
  lines.push(` ${dim(TRADE_PROMPTS.onceOnly)}`)

  if (ctx.tradeMessage) {
    lines.push('')
    lines.push(` ${ctx.tradeMessage}`)
  }

  return {
    lines: withFooter(lines, hintLine(TRADE_RECEIVE_HINTS), rows),
    overlays: [],
  }
}

export const draw = (ctx, size) => {
  if (ctx.tradeStep === 'code') return drawCode(ctx, size)
  if (ctx.tradeStep === 'receive') return drawReceive(ctx, size)

  return drawConfirm(ctx, size)
}

const typeInto = (current, text) => {
  return `${current}${text.replace(TRADE_CODE_PATTERN, '')}`
}

const onConfirmKey = (ctx, key) => {
  if (key.name === 'enter' || key.name === 'space') {
    ctx.giveSelectedAway()
    return
  }

  if (key.name === 'escape' || key.name === 'q') ctx.closeTrade()
}

const onCodeKey = (ctx, key) => {
  if (key.name === 'escape' || key.name === 'enter' || key.name === 'q')
    ctx.closeTrade()
}

const onReceiveKey = (ctx, key) => {
  if (key.name === 'escape') {
    ctx.closeTrade()
    return
  }

  if (key.name === 'enter') {
    ctx.takeInCode()
    return
  }

  if (key.name === 'backspace') {
    ctx.tradeInput = ctx.tradeInput.slice(0, -1)
    return
  }

  if (key.char) ctx.tradeInput = typeInto(ctx.tradeInput, key.char)
}

export const onKey = (ctx, key) => {
  if (ctx.tradeStep === 'code') return onCodeKey(ctx, key)
  if (ctx.tradeStep === 'receive') return onReceiveKey(ctx, key)

  return onConfirmKey(ctx, key)
}
