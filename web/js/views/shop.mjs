import { ITEMS } from '../../../src/constants.mjs'
import { money } from '../../../src/format.mjs'
import { SHOP_STOCK, countOf } from '../../../src/shop.mjs'
import { html } from '../dom.mjs'
import { hints, notes, screenHead } from './chrome.mjs'
import {
  BULK_QUANTITY,
  SHOP_HINTS,
  SHOP_MONEY_LABEL,
  SHOP_OWNED_LABEL,
  SHOP_TITLE,
} from './constants.mjs'
import { clampSelection, noteRows, wrap } from './helpers.mjs'

export const draw = (ctx) => {
  const selection = clampSelection(ctx.shopSelection, SHOP_STOCK.length)

  return html`<div class="screen">
    ${screenHead(SHOP_TITLE, `${SHOP_MONEY_LABEL} ${money(ctx.save.money)}`)}
    <section class="panel">
      <div class="shop">
        ${SHOP_STOCK.map(
          (key, index) =>
            html`<button
              class="shop__row"
              type="button"
              aria-selected="${index === selection}"
              data-index="${index}"
              data-key="enter"
            >
              <span>
                <span class="name">${ITEMS[key].name}</span>
                <span class="hint"> ${ITEMS[key].description}</span>
              </span>
              <span class="hint"
                >${SHOP_OWNED_LABEL} ${countOf(ctx.save, key)}</span
              >
              <span class="shop__price">${money(ITEMS[key].price)}</span>
            </button>`,
        )}
      </div>
    </section>
    ${notes(noteRows(ctx.shopMessage))} ${hints(SHOP_HINTS, ctx.version)}
  </div>`
}

export const select = (ctx, index) => {
  ctx.shopSelection = index
  ctx.shopMessage = null
}

export const onKey = (ctx, key) => {
  const total = SHOP_STOCK.length

  if (key.name === 'up' || key.name === 'k') {
    ctx.shopSelection = wrap(ctx.shopSelection - 1, total)
    ctx.shopMessage = null
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.shopSelection = wrap(ctx.shopSelection + 1, total)
    ctx.shopMessage = null
  } else if (key.name === 'enter' || key.name === 'space') {
    ctx.buyItem(SHOP_STOCK[ctx.shopSelection], 1)
  } else if (key.name === '5') {
    ctx.buyItem(SHOP_STOCK[ctx.shopSelection], BULK_QUANTITY)
  } else if (key.name === 'esc' || key.name === 'q') {
    ctx.shopMessage = null
    ctx.setMode('home')
  }
}
