import { expProgress } from '../../../src/exp.mjs'
import {
  displayName,
  genderOf,
  isFainted,
  levelOf,
} from '../../../src/pokemon.mjs'
import { html } from '../dom.mjs'
import { hints, notes, screenHead } from './chrome.mjs'
import {
  LEAD_MARK,
  TEAM_BAG_HINTS,
  TEAM_HINTS,
  TEAM_KEY_HINTS,
  TEAM_MESSAGES,
  TEAM_SORT_LABELS,
  TEAM_TITLE,
} from './constants.mjs'
import {
  clampSelection,
  hpBar,
  monSprite,
  nextPartySort,
  noteRows,
  partyEntryAt,
  partySelectionAfterSort,
  sortedPartyEntries,
  typeBadge,
  wrap,
} from './helpers.mjs'
import { species } from '../../../src/data.mjs'

export const monDetail = (mon) => {
  const entry = species(mon.species)
  const progress = expProgress(mon.species, mon.exp)

  return html`<aside class="panel detail">
    ${monSprite(mon, 'lg')}
    <p class="name">
      ${displayName(mon).toUpperCase()}
      ${mon.shiny ? html`<span class="tag tag--shiny">shiny</span>` : ''}
    </p>
    <p class="level">
      Lv${levelOf(mon)} · ${genderOf(mon) ?? '—'} · ${entry.name}
    </p>
    <div class="types">${entry.types.map(typeBadge)}</div>
    ${hpBar(mon.hp, mon.stats.hp)}
    <div class="exp__track">
      <div class="exp__fill" style="width:${progress.fraction * 100}%"></div>
    </div>
    <div class="detail__stats">
      ${Object.entries(mon.stats).map(
        ([name, value]) => html`<div>${name} <b>${value}</b></div>`,
      )}
    </div>
    <div class="list">
      ${mon.moves.map(
        (slot) =>
          html`<div class="list__row">
            <span class="name">${slot.move}</span>
            <span class="level">${slot.pp}/${slot.maxPp}</span>
          </div>`,
      )}
    </div>
  </aside>`
}

export const partyRows = (ctx) => {
  const entries = sortedPartyEntries(ctx.save.party, ctx.teamSort)
  const selection = clampSelection(ctx.teamSelection, entries.length)

  return html`<div class="list">
    ${entries.map(
      (entry, index) =>
        html`<button
          class="list__row ${isFainted(entry.mon) ? 'list__row--fainted' : ''}"
          type="button"
          aria-selected="${index === selection}"
          data-index="${index}"
        >
          <span class="name"
            >${entry.index === 0 ? `${LEAD_MARK} ` : ''}${displayName(
              entry.mon,
            ).toUpperCase()}</span
          >
          <span class="level">Lv${levelOf(entry.mon)}</span>
          ${hpBar(entry.mon.hp, entry.mon.stats.hp)}
        </button>`,
    )}
  </div>`
}

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
        ${partyRows(ctx)} ${notes(noteRows(ctx.boxMessage))}
        ${notes(noteRows(ctx.bagMessage))}
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
  } else if (key.name === 'i') ctx.openBag()
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
