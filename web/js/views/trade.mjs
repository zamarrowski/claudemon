import { displayName, levelOf } from '../../../src/pokemon.mjs'
import { html } from '../dom.mjs'
import { hints, notes, screenHead } from './chrome.mjs'
import {
  TRADE_CODE_HINTS,
  TRADE_CONFIRM_HINTS,
  TRADE_PROMPTS,
  TRADE_RECEIVE_HINTS,
  TRADE_TITLE,
  TRADE_WARNING,
  TRADE_WARNING_TITLE,
} from './constants.mjs'
import { monSprite, noteRows } from './helpers.mjs'

const confirmStep = (ctx) => {
  const mon = ctx.tradeGiving.mon

  return html`<section class="split">
    <div class="stack">
      <p class="field__headline">
        ${TRADE_PROMPTS.ask} ${displayName(mon).toUpperCase()}
        ${TRADE_PROMPTS.away}
      </p>
      <section class="panel">
        <h2 class="panel__title">${TRADE_WARNING_TITLE}</h2>
        <p><b>${displayName(mon).toUpperCase()}</b> ${TRADE_WARNING.leaves}</p>
        <p class="hint">${TRADE_WARNING.noWayBack}</p>
        <p class="hint">${TRADE_WARNING.exact} ${TRADE_WARNING.andAll}</p>
      </section>
      <button class="menu__item" type="button" data-key="enter">
        ${TRADE_PROMPTS.ask} ${displayName(mon).toUpperCase()}
      </button>
    </div>
    <aside class="panel detail">
      ${monSprite(mon, 'lg')}
      <p class="name">${displayName(mon).toUpperCase()}</p>
      <p class="level">Lv${levelOf(mon)}</p>
    </aside>
  </section>`
}

const codeStep = (ctx) => {
  return html`<section class="stack">
    <p class="field__headline">
      ${displayName(ctx.tradeGone).toUpperCase()} ${TRADE_PROMPTS.onItsWay}
    </p>
    <p class="code">${ctx.tradeCode ?? '…'}</p>
    <div class="row">
      <button class="menu__item" type="button" data-key="c">
        ${TRADE_PROMPTS.copy}
      </button>
      <span class="hint"
        >${ctx.tradeCopied ? TRADE_PROMPTS.copied : TRADE_PROMPTS.notCopied}</span
      >
    </div>
    ${
      ctx.tradePath
        ? html`<p class="hint">${TRADE_PROMPTS.writtenTo} ${ctx.tradePath}</p>`
        : ''
    }
    <p class="hint">${TRADE_PROMPTS.gone}</p>
  </section>`
}

const receiveStep = (ctx) => {
  return html`<section class="stack">
    <p class="field__headline">${TRADE_PROMPTS.paste}</p>
    <p class="code">${ctx.tradeInput}<span class="caret">▮</span></p>
    <p class="hint">${TRADE_PROMPTS.onceOnly}</p>
  </section>`
}

const stepFor = (ctx) => {
  if (ctx.tradeStep === 'code') return codeStep(ctx)
  if (ctx.tradeStep === 'receive') return receiveStep(ctx)

  return confirmStep(ctx)
}

const hintFor = (ctx) => {
  if (ctx.tradeStep === 'code') return TRADE_CODE_HINTS
  if (ctx.tradeStep === 'receive') return TRADE_RECEIVE_HINTS

  return TRADE_CONFIRM_HINTS
}

export const draw = (ctx) => {
  return html`<div class="screen">
    ${screenHead(TRADE_TITLE)} ${stepFor(ctx)}
    ${notes(noteRows(ctx.tradeMessage))} ${hints(hintFor(ctx), ctx.version)}
  </div>`
}

const onConfirmKey = (ctx, key) => {
  if (key.name === 'enter' || key.name === 'space') {
    ctx.giveSelectedAway()
    return
  }

  if (key.name === 'esc' || key.name === 'q') ctx.closeTrade()
}

const onCodeKey = (ctx, key) => {
  if (key.name === 'c') {
    ctx.copyCode(ctx.tradeCode)
    return
  }

  if (key.name === 'esc' || key.name === 'enter' || key.name === 'q')
    ctx.closeTrade()
}

const onReceiveKey = (ctx, key) => {
  if (key.name === 'esc') {
    ctx.closeTrade()
    return
  }

  if (key.name === 'enter') {
    ctx.takeInCode()
    return
  }

  if (key.name === 'backspace') {
    ctx.tradeInput = ctx.tradeInput.slice(0, -1)
    return
  }

  if (key.name.length === 1) {
    ctx.tradeInput += key.shift ? key.name.toUpperCase() : key.name
  }
}

export const onPaste = (ctx, text) => {
  if (ctx.tradeStep !== 'receive') return

  ctx.tradeInput = text.trim()
}

export const onKey = (ctx, key) => {
  if (ctx.tradeStep === 'code') return onCodeKey(ctx, key)
  if (ctx.tradeStep === 'receive') return onReceiveKey(ctx, key)

  return onConfirmKey(ctx, key)
}
