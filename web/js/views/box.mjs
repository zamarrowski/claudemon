import { displayName, levelOf } from '../../../src/pokemon.mjs'
import { html } from '../dom.mjs'
import { hints, notes, screenHead } from './chrome.mjs'
import {
  BOX_HINTS,
  BOX_NOTES,
  BOX_SORT_LABELS,
  BOX_TITLE,
} from './constants.mjs'
import {
  clampSelection,
  hpBar,
  nextPartySort,
  noteRows,
  partyEntryAt,
  partySelectionAfterSort,
  sortedPartyEntries,
  wrap,
} from './helpers.mjs'
import { monDetail } from './team.mjs'

export const draw = (ctx) => {
  if (!ctx.save.box.length) {
    return html`<div class="screen">
      ${screenHead(BOX_TITLE)}
      <p class="notice">${BOX_NOTES.empty}</p>
      <p class="hint">${BOX_NOTES.waitingHere}</p>
      ${notes(noteRows(ctx.boxMessage))} ${hints(BOX_HINTS, ctx.version)}
    </div>`
  }

  const entries = sortedPartyEntries(ctx.save.box, ctx.boxSort)
  const selection = clampSelection(ctx.boxSelection, entries.length)
  const entry = partyEntryAt(ctx.save.box, ctx.boxSelection, ctx.boxSort)

  return html`<div class="screen">
    ${screenHead(BOX_TITLE, BOX_SORT_LABELS[ctx.boxSort])}
    <div class="split">
      <div class="stack">
        <div class="list">
          ${entries.map(
            (row, index) =>
              html`<button
                class="list__row"
                type="button"
                aria-selected="${index === selection}"
                data-index="${index}"
              >
                <span class="name">${displayName(row.mon).toUpperCase()}</span>
                <span class="level">Lv${levelOf(row.mon)}</span>
                ${hpBar(row.mon.hp, row.mon.stats.hp)}
              </button>`,
          )}
        </div>
        ${notes(noteRows(ctx.boxMessage))}
      </div>
      ${monDetail(entry.mon)}
    </div>
    ${hints(BOX_HINTS, ctx.version)}
  </div>`
}

export const select = (ctx, index) => {
  ctx.boxSelection = index
  ctx.boxMessage = null
}

export const onKey = (ctx, key) => {
  if (key.name === 'esc' || key.name === 'q') {
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
  } else if (key.name === 'enter' || key.name === 'space') {
    ctx.withdrawFromBox(partyEntryAt(box, ctx.boxSelection, sort).index)
  }
}
