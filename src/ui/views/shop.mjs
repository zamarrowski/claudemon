import { ITEMS } from '../../constants.mjs'
import { SHOP_STOCK, countOf } from '../../shop.mjs'
import { bold, brightYellow, dim, gray } from '../ansi.mjs'
import {
  hintLine,
  menuList,
  money,
  padLeft,
  padRight,
  panel,
  withFooter,
  wrap,
} from '../widgets.mjs'
import {
  BULK_QUANTITY,
  LIST_HEIGHT_FLOOR,
  MAX_SHOP_WIDTH,
  SHOP_HINTS,
  SHOP_MONEY_LABEL,
  SHOP_NAME_WIDTH,
  SHOP_OWNED_LABEL,
  SHOP_PRICE_WIDTH,
  SHOP_PROMPT,
  SHOP_ROWS_RESERVED,
  SHOP_TITLE,
} from './constants.mjs'

export const draw = (ctx, size) => {
  const { cols, rows } = size
  const lines = []
  const width = Math.min(cols - 2, MAX_SHOP_WIDTH)

  lines.push(
    ` ${brightYellow('◓')} ${bold(SHOP_TITLE)}   ${dim(SHOP_MONEY_LABEL)} ${bold(money(ctx.save.money))}`,
  )
  lines.push('')

  const entries = SHOP_STOCK.map((key) => {
    const item = ITEMS[key]
    const owned = countOf(ctx.save, key)
    const affordable = ctx.save.money >= item.price
    const price = money(item.price)
    const name = affordable ? item.name : gray(item.name)

    return `${padRight(name, SHOP_NAME_WIDTH)} ${padLeft(affordable ? price : gray(price), SHOP_PRICE_WIDTH)}  ${
      owned > 0 ? dim(`${SHOP_OWNED_LABEL} ${owned}`) : ''
    }`
  })

  const height = Math.max(LIST_HEIGHT_FLOOR, rows - SHOP_ROWS_RESERVED)

  for (const row of menuList(entries, ctx.shopSelection, {
    height,
    width: width - 2,
  })) {
    lines.push(` ${row}`)
  }

  const chosen = ITEMS[SHOP_STOCK[ctx.shopSelection]]
  const prompt = ctx.shopMessage ?? hintLine(SHOP_PROMPT)

  lines.push('')

  for (const row of panel([chosen.description, prompt], width)) {
    lines.push(` ${row}`)
  }

  return { lines: withFooter(lines, hintLine(SHOP_HINTS), rows), overlays: [] }
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
  } else if (key.name === 'escape' || key.name === 'q') {
    ctx.shopMessage = null
    ctx.setMode('home')
  }
}
