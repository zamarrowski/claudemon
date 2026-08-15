import { ITEMS } from '../../../src/constants.mjs'
import { itemsInBag } from '../../../src/shop.mjs'
import { html } from '../dom.mjs'
import { hints, monDetail, notes, partyRows, screenHead } from './chrome.mjs'
import { BAG_TITLE, TEAM_BAG_HINTS } from './constants.mjs'
import { clampSelection, cursorDelta, selector, wrap } from './helpers.mjs'

export const draw = (ctx) => {
  const bag = itemsInBag(ctx.save)
  const selection = clampSelection(ctx.bagSelection, bag.length)
  const mon = ctx.save.party[ctx.bagTarget]

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
        ${notes(ctx.bagMessage)}
      </div>
      ${monDetail(mon)}
    </div>
    ${hints(TEAM_BAG_HINTS, ctx.version)}
  </div>`
}

export const select = selector('bagSelection', 'bagMessage')

export const onKey = (ctx, key) => {
  const bag = itemsInBag(ctx.save)
  const index = clampSelection(ctx.bagSelection, bag.length)
  const delta = cursorDelta(ctx, key)

  if (delta) {
    ctx.bagSelection = wrap(index + delta, bag.length)
    ctx.bagMessage = null
  } else if (key.name === 'enter' || key.name === 'space') {
    ctx.useFromBag(bag[index])
  } else if (key.name === 'esc' || key.name === 'q' || key.name === 'i') {
    ctx.closeBag()
  }
}
