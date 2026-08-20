import { PARTY_LIMIT } from '../../constants.mjs'
import { bold, brightYellow, dim, gray } from '../ansi.mjs'
import { hintLine, menuList, withFooter, wrap } from '../widgets.mjs'
import {
  LEAD_MARK,
  LIST_HEIGHT_FLOOR,
  LIST_WIDTH,
  TEAM_HINTS,
  TEAM_KEY_HINTS,
  TEAM_MESSAGES,
  TEAM_SORT_LABELS,
  TEAM_TITLE,
} from './constants.mjs'
import {
  columnRows,
  detailBox,
  monColumn,
  monRow,
  nextPartySort,
  noteRows,
  partyEntryAt,
  partySelectionAfterSort,
  pushNote,
  rowsLeftFor,
  sortedPartyEntries,
} from './helpers.mjs'

const partyRow = (mon, partyIndex) => {
  const leadMark = partyIndex === 0 ? brightYellow(LEAD_MARK) : ' '

  return `${leadMark} ${monRow(mon)}`
}

export const draw = (ctx, size) => {
  const { rows } = size
  const lines = []
  const overlays = []

  const party = ctx.save.party
  const sort = ctx.teamSort
  const sortLabel = TEAM_SORT_LABELS[sort]

  lines.push(
    ` ${brightYellow('◓')} ${bold(TEAM_TITLE)}   ${dim(
      `${party.length}/${PARTY_LIMIT} · ${ctx.save.box.length} in the box · sort ${sortLabel}`,
    )}`,
  )

  if (party.length === 0) {
    lines.push('')
    lines.push(' ' + gray(TEAM_MESSAGES.noPokemon))

    return {
      lines: withFooter(lines, [hintLine(TEAM_MESSAGES.back)], rows),
      overlays,
    }
  }

  lines.push('')

  const entries = sortedPartyEntries(party, sort)
  const selected = partyEntryAt(party, ctx.teamSelection, sort).mon
  const listEntries = entries.map((entry) => partyRow(entry.mon, entry.index))

  const list = menuList(listEntries, ctx.teamSelection, {
    height: Math.max(LIST_HEIGHT_FLOOR, listEntries.length),
    width: LIST_WIDTH,
  })

  const note = noteRows(ctx.bagMessage ?? ctx.boxMessage)
  const footer = [hintLine(TEAM_HINTS), hintLine(TEAM_KEY_HINTS)]
  const budget = rowsLeftFor(rows, lines, footer, note)
  const right = monColumn(
    selected,
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

export const onKey = (ctx, key) => {
  if (key.name === 'escape' || key.name === 'q') {
    ctx.clearTeamMessages()
    ctx.setMode('home')
    return
  }

  const party = ctx.save.party

  if (party.length === 0) return

  const sort = ctx.teamSort
  const total = party.length
  const selected = partyEntryAt(party, ctx.teamSelection, sort)

  if (key.name === 'up' || key.name === 'k') {
    ctx.teamSelection = wrap(ctx.teamSelection - 1, total)
    ctx.clearTeamMessages()
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.teamSelection = wrap(ctx.teamSelection + 1, total)
    ctx.clearTeamMessages()
  } else if (key.name === 'enter' || key.name === 'space')
    ctx.makeLead(selected.index)
  else if (key.name === 's') {
    const nextSort = nextPartySort(sort)

    ctx.teamSelection = partySelectionAfterSort(
      party,
      ctx.teamSelection,
      sort,
      nextSort,
    )
    ctx.teamSort = nextSort
    ctx.clearTeamMessages()
  } else if (key.name === 'm') ctx.openMoves()
  else if (key.name === 'i') ctx.openBag()
  else if (key.name === 'b') ctx.openBox()
  else if (key.name === 'c') ctx.openDaycare('team')
  else if (key.name === 't')
    ctx.askToGiveAway({
      from: 'team',
      source: 'party',
      index: selected.index,
      mon: selected.mon,
    })
  else if (key.name === 'r') ctx.openTradeReceive('team')
  else if (key.name === 'd') ctx.depositToBox(selected.index)
}
