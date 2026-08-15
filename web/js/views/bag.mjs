import { ITEMS } from '../../../src/constants.mjs'
import { itemsInBag } from '../../../src/shop.mjs'
import { html } from '../dom.mjs'
import { hints, notes, screenHead } from './chrome.mjs'
import { BAG_TITLE, TEAM_BAG_HINTS } from './constants.mjs'
import { clampSelection, noteRows, partyEntryAt, wrap } from './helpers.mjs'
import { monDetail, partyRows } from './team.mjs'

export const draw = (ctx) => {
  const bag = itemsInBag(ctx.save)
  const selection = clampSelection(ctx.bagSelection, bag.length)
  const entry = partyEntryAt(ctx.save.party, ctx.teamSelection, ctx.teamSort)

  return html`<div class="screen">
    ${screenHead(BAG_TITLE)}
    <div class="split">
      <div class="stack">
        ${partyRows(ctx)}
        <section class="panel">
          <h2 class="panel__title">${BAG_TITLE}</h2>
          <div class="list">
            ${bag.map(
              (key, index) =>
                html`<button
                  class="list__row"
                  type="button"
                  aria-selected="${index === selection}"
                  data-index="${index}"
                  data-key="enter"
                >
                  <span class="name">${ITEMS[key].name}</span>
                  <span class="level">×${ctx.save.bag[key]}</span>
                  <span class="hint">${ITEMS[key].kind}</span>
                </button>`,
            )}
          </div>
        </section>
        ${notes(noteRows(ctx.bagMessage))}
      </div>
      ${monDetail(entry.mon)}
    </div>
    ${hints(TEAM_BAG_HINTS, ctx.version)}
  </div>`
}

export const select = (ctx, index) => {
  ctx.bagSelection = index
  ctx.bagMessage = null
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
  } else if (key.name === 'esc' || key.name === 'q' || key.name === 'i') {
    ctx.closeBag()
  }
}
