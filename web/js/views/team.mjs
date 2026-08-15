import { html } from '../dom.mjs'
import { hints, monDetail, notes, partyRows, screenHead } from './chrome.mjs'
import {
  TEAM_BAG_HINTS,
  TEAM_HINTS,
  TEAM_KEY_HINTS,
  TEAM_MESSAGES,
  TEAM_SORT_LABELS,
  TEAM_TITLE,
} from './constants.mjs'
import {
  nextPartySort,
  partyEntryAt,
  partySelectionAfterSort,
  wrap,
} from './helpers.mjs'

export const draw = (ctx) => {
  if (!ctx.save.party.length) {
    return html`<div class="screen">
      ${screenHead(TEAM_TITLE)}
      <p class="notice">${TEAM_MESSAGES.noPokemon}</p>
      ${hints('[esc] back', ctx.version)}
    </div>`
  }

  const entry = partyEntryAt(ctx.save.party, ctx.teamSelection, ctx.teamSort)

  return html`<div class="screen">
    ${screenHead(TEAM_TITLE, TEAM_SORT_LABELS[ctx.teamSort])}
    <div class="split">
      <div class="stack">
        ${partyRows(ctx)} ${notes(ctx.boxMessage)} ${notes(ctx.bagMessage)}
        <p class="hint">${TEAM_KEY_HINTS}</p>
      </div>
      ${monDetail(entry.mon)}
    </div>
    ${hints(ctx.bagSelection === null ? TEAM_HINTS : TEAM_BAG_HINTS, ctx.version)}
  </div>`
}

export const select = (ctx, index) => {
  ctx.teamSelection = index
  ctx.clearTeamMessages()
}

export const onKey = (ctx, key) => {
  if (key.name === 'esc' || key.name === 'q') {
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
  } else if (key.name === 'enter' || key.name === 'space') {
    ctx.makeLead(selected.index)
  } else if (key.name === 's') {
    const nextSort = nextPartySort(sort)

    ctx.teamSelection = partySelectionAfterSort(
      party,
      ctx.teamSelection,
      sort,
      nextSort,
    )
    ctx.teamSort = nextSort
    ctx.clearTeamMessages()
  } else if (key.name === 'i') ctx.openBag(selected.index)
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
