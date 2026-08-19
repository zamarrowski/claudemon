import { PARTY_LIMIT } from '../../constants.mjs'
import { bold, brightYellow, dim, gray } from '../ansi.mjs'
import { hintLine, menuList, withFooter, wrap } from '../widgets.mjs'
import {
  BOX_HINTS,
  BOX_MESSAGES,
  BOX_SORT_LABELS,
  BOX_TITLE,
  LIST_HEIGHT_FLOOR,
  LIST_WIDTH,
  TRADE_KEY_HINTS,
} from './constants.mjs'
import {
  columnRows,
  monColumn,
  monRow,
  nextPartySort,
  noteRows,
  partyEntryAt,
  partySelectionAfterSort,
  pushNote,
  sortedPartyEntries,
} from './helpers.mjs'

export const draw = (ctx, size) => {
  const { rows } = size
  const lines = []
  const overlays = []

  const box = ctx.save.box
  const party = ctx.save.party
  const sort = ctx.boxSort
  const sortLabel = BOX_SORT_LABELS[sort]

  lines.push(
    ` ${brightYellow('◓')} ${bold(BOX_TITLE)}   ${dim(
      `${box.length} stored · team ${party.length}/${PARTY_LIMIT} · sort ${sortLabel}`,
    )}`,
  )
  lines.push('')

  if (box.length === 0) {
    lines.push(' ' + gray(BOX_MESSAGES.empty))
    lines.push(' ' + gray(BOX_MESSAGES.waitingHere))

    return {
      lines: withFooter(lines, hintLine(BOX_MESSAGES.back), rows),
      overlays,
    }
  }

  const entries = sortedPartyEntries(box, sort)
  const selected = partyEntryAt(box, ctx.boxSelection, sort).mon

  const listEntries = entries.map((entry) => monRow(entry.mon))

  const list = menuList(listEntries, ctx.boxSelection, {
    height: Math.max(LIST_HEIGHT_FLOOR, box.length),
    width: LIST_WIDTH,
  })

  const right = monColumn(selected, size, ctx.spriteScale)

  for (const row of columnRows(list, right, LIST_WIDTH)) lines.push(row)

  pushNote(lines, noteRows(ctx.boxMessage))

  return {
    lines: withFooter(
      lines,
      [hintLine(BOX_HINTS), hintLine(TRADE_KEY_HINTS)],
      rows,
    ),
    overlays,
  }
}

export const onKey = (ctx, key) => {
  if (key.name === 'escape' || key.name === 'q') {
    ctx.boxMessage = null
    ctx.setMode('team')
    return
  }

  if (key.name === 'r') {
    ctx.openTradeReceive('box')
    return
  }

  const box = ctx.save.box

  if (box.length === 0) return

  const sort = ctx.boxSort
  const total = box.length

  if (key.name === 'up' || key.name === 'k') {
    ctx.boxSelection = wrap(ctx.boxSelection - 1, total)
    ctx.boxMessage = null
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.boxSelection = wrap(ctx.boxSelection + 1, total)
    ctx.boxMessage = null
  } else if (key.name === 's') {
    const nextSort = nextPartySort(sort)

    ctx.boxSelection = partySelectionAfterSort(
      box,
      ctx.boxSelection,
      sort,
      nextSort,
    )
    ctx.boxSort = nextSort
    ctx.boxMessage = null
  } else if (key.name === 't') {
    const entry = partyEntryAt(box, ctx.boxSelection, sort)

    ctx.askToGiveAway({
      from: 'box',
      source: 'box',
      index: entry.index,
      mon: entry.mon,
    })
  } else if (key.name === 'enter' || key.name === 'space')
    ctx.withdrawFromBox(partyEntryAt(box, ctx.boxSelection, sort).index)
}
