import { ITEMS } from '../../constants.mjs'
import { displayName, speciesName, stoneEvolution } from '../../pokemon.mjs'
import { countOf, itemsInBag, usableOnParty } from '../../shop.mjs'
import { bold, brightYellow, dim, gray } from '../ansi.mjs'
import { EVOLVES_MARK } from '../constants.mjs'
import { hintLine, menuList, padRight, withFooter, wrap } from '../widgets.mjs'
import {
  BAG_ITEM_NAME_WIDTH,
  BAG_TITLE,
  COLUMN_DIVIDER,
  EMPTY_BAG_MESSAGE,
  LIST_HEIGHT_FLOOR,
  LIST_WIDTH,
  TEAM_BAG_HINTS,
  TEAM_MESSAGES,
} from './constants.mjs'
import {
  clampSelection,
  detailBox,
  monColumn,
  noteRows,
  partyEntryAt,
  zipColumns,
} from './helpers.mjs'

const bagNote = (ctx, bag, index, mon) => {
  if (ctx.bagMessage) return ctx.bagMessage

  const key = bag[index]

  if (!key) return gray(EMPTY_BAG_MESSAGE)

  const target = stoneEvolution(mon, key)

  if (target) {
    return `${brightYellow(EVOLVES_MARK)} ${displayName(mon).toUpperCase()} ${TEAM_MESSAGES.wouldBecome} ${speciesName(
      target,
    ).toUpperCase()}.`
  }

  return dim(
    usableOnParty(key) ? ITEMS[key].description : TEAM_MESSAGES.notForParty,
  )
}

const itemRow = (ctx, key, selected) => {
  const name = usableOnParty(key) ? ITEMS[key].name : gray(ITEMS[key].name)
  const mark = stoneEvolution(selected, key) ? brightYellow(EVOLVES_MARK) : ' '

  return `${mark} ${padRight(name, BAG_ITEM_NAME_WIDTH)} ${dim(`x${countOf(ctx.save, key)}`)}`
}

export const draw = (ctx, size) => {
  const { rows } = size
  const lines = []
  const overlays = []

  const party = ctx.save.party
  const bag = itemsInBag(ctx.save)
  const selected = partyEntryAt(party, ctx.teamSelection, ctx.teamSort).mon
  const index = clampSelection(ctx.bagSelection, bag.length)

  lines.push(
    ` ${brightYellow('◓')} ${bold(BAG_TITLE)}    ${dim(`on ${displayName(selected).toUpperCase()}`)}`,
  )
  lines.push('')

  const entries = bag.map((key) => itemRow(ctx, key, selected))

  const list = menuList(entries, index, {
    height: Math.max(LIST_HEIGHT_FLOOR, entries.length),
    width: LIST_WIDTH,
  })

  const note = noteRows(bagNote(ctx, bag, index, selected))
  const noteHeight = note.length > 0 ? note.length + 1 : 0

  const budget = Math.max(1, rows - 2 - lines.length - noteHeight)
  const right = monColumn(
    selected,
    detailBox(size, LIST_WIDTH, budget),
    ctx.spriteScale,
  )

  for (const [listRow, detailRow] of zipColumns(list, right).slice(0, budget)) {
    lines.push(
      ` ${padRight(listRow, LIST_WIDTH)}  ${dim(COLUMN_DIVIDER)}  ${detailRow}`,
    )
  }

  if (note.length > 0) {
    lines.push('')
    for (const row of note) lines.push(` ${row}`)
  }

  return {
    lines: withFooter(lines, hintLine(TEAM_BAG_HINTS), rows),
    overlays,
  }
}

export const onKey = (ctx, key) => {
  const bag = itemsInBag(ctx.save)
  const index = clampSelection(ctx.bagSelection, bag.length)

  if (key.name === 'up' || key.name === 'k') {
    ctx.bagSelection = wrap(index - 1, bag.length)
    ctx.bagMessage = null
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.bagSelection = wrap(index + 1, bag.length)
    ctx.bagMessage = null
  } else if (key.name === 'enter' || key.name === 'space') {
    const entry = partyEntryAt(ctx.save.party, ctx.teamSelection, ctx.teamSort)

    ctx.useFromBag(bag[index], entry.index)
  } else if (key.name === 'escape' || key.name === 'q' || key.name === 'i') {
    ctx.closeBag()
  }
}
