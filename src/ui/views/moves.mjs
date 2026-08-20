import { move as moveData } from '../../data.mjs'
import { displayName } from '../../pokemon.mjs'
import { bold, brightYellow, dim } from '../ansi.mjs'
import {
  hintLine,
  menuList,
  padRight,
  typeBadge,
  withFooter,
  wrap,
} from '../widgets.mjs'
import {
  HELD_MARK,
  LIST_HEIGHT_FLOOR,
  LIST_WIDTH,
  MOVE_NAME_WIDTH,
  MOVES_BACK_HINTS,
  MOVES_HELD_HINTS,
  MOVES_HINTS,
  MOVES_MESSAGES,
  MOVES_TITLE,
} from './constants.mjs'
import {
  clampSelection,
  columnRows,
  detailBox,
  monColumn,
  partyEntryAt,
  pushNote,
  rowsLeftFor,
} from './helpers.mjs'

const moveRow = (slot, held) => {
  const data = moveData(slot.move)
  const mark = held ? brightYellow(HELD_MARK) : ' '

  return `${mark} ${padRight(data.name, MOVE_NAME_WIDTH)} ${typeBadge(data.type)}`
}

const movesNote = (mon) => {
  if (mon.moves.length < 2) return [dim(MOVES_MESSAGES.onlyOne)]

  return [dim(MOVES_MESSAGES.fightMenu), dim(MOVES_MESSAGES.daycare)]
}

const movesFooter = (mon, held) => {
  if (mon.moves.length < 2) return [hintLine(MOVES_BACK_HINTS)]
  if (held) return [hintLine(MOVES_HELD_HINTS)]

  return [hintLine(MOVES_HINTS)]
}

const selectedMon = (ctx) => {
  return partyEntryAt(ctx.save.party, ctx.teamSelection, ctx.teamSort).mon
}

export const draw = (ctx, size) => {
  const { rows } = size
  const lines = []
  const overlays = []

  const mon = selectedMon(ctx)
  const selection = clampSelection(ctx.moveSelection, mon.moves.length)

  lines.push(
    ` ${brightYellow('◓')} ${bold(MOVES_TITLE)}   ${dim(
      displayName(mon).toUpperCase(),
    )}`,
  )
  lines.push('')

  const entries = mon.moves.map((slot, index) => {
    return moveRow(slot, ctx.moveHeld && index === selection)
  })

  const list = menuList(entries, selection, {
    height: Math.max(LIST_HEIGHT_FLOOR, entries.length),
    width: LIST_WIDTH,
  })

  const note = movesNote(mon)
  const footer = movesFooter(mon, ctx.moveHeld)
  const budget = rowsLeftFor(rows, lines, footer, note)
  const right = monColumn(
    mon,
    detailBox(size, LIST_WIDTH, budget),
    ctx.spriteScale,
  )

  for (const row of columnRows(list, right, LIST_WIDTH).slice(0, budget))
    lines.push(row)

  pushNote(lines, note)

  return {
    lines: withFooter(lines, footer, rows),
    overlays,
  }
}

const step = (ctx, mon, direction) => {
  const next = wrap(ctx.moveSelection + direction, mon.moves.length)

  if (ctx.moveHeld) {
    ctx.carryMove(mon, next)
    return
  }

  ctx.moveSelection = next
}

export const onKey = (ctx, key) => {
  if (key.name === 'escape' || key.name === 'q' || key.name === 'm') {
    ctx.closeMoves()
    return
  }

  const mon = selectedMon(ctx)

  if (key.name === 'up' || key.name === 'k') step(ctx, mon, -1)
  else if (key.name === 'down' || key.name === 'j') step(ctx, mon, 1)
  else if (key.name === 'enter' || key.name === 'space')
    ctx.moveHeld = !ctx.moveHeld
}
