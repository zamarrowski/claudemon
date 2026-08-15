import { KANTO_TOTAL } from '../../../src/constants.mjs'
import { species } from '../../../src/data.mjs'
import { expProgress } from '../../../src/exp.mjs'
import { money } from '../../../src/format.mjs'
import {
  displayName,
  genderOf,
  isFainted,
  levelOf,
} from '../../../src/pokemon.mjs'
import { totalBalls } from '../../../src/state.mjs'
import { html } from '../dom.mjs'
import { APP_TITLE, LEAD_MARK } from './constants.mjs'
import {
  clampSelection,
  hpBar,
  monSprite,
  sortedPartyEntries,
  typeBadge,
} from './helpers.mjs'

export const topbar = (save) => {
  return html`<header class="topbar">
    <div class="topbar__title"><span class="ball">◓</span> ${APP_TITLE}</div>
    <div class="topbar__stats">
      <span>${save.dex.caught.length}/${KANTO_TOTAL} caught</span>
      <span>${totalBalls(save)} balls</span>
      <span>${money(save.money)}</span>
    </div>
  </header>`
}

export const screenHead = (title, aside) => {
  return html`<div class="screen-head">
    <h1>${title}</h1>
    ${aside ? html`<span class="hint">${aside}</span>` : ''}
  </div>`
}

export const hints = (text, version) => {
  return html`<footer class="footer">
    <span>${text}</span>
    ${version ? html`<span>v${version}</span>` : ''}
  </footer>`
}

const rowsOf = (note) => {
  if (!note) return []
  if (Array.isArray(note)) return note

  return [note]
}

export const notes = (note) => {
  const rows = rowsOf(note)

  if (rows.length === 0) return ''

  return html`<div class="notice notice--quiet">
    ${rows.map((row) => html`<div>${row}</div>`)}
  </div>`
}

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
