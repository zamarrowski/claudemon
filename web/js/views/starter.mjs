import { STARTERS } from '../../../src/constants.mjs'
import { species } from '../../../src/data.mjs'
import { statsAtLevel } from '../../../src/stats.mjs'
import { html } from '../dom.mjs'
import { monSpriteUrl } from '../sprites.mjs'
import { hints } from './chrome.mjs'
import {
  APP_TITLE,
  MAX_NAME,
  PREVIEW_LEVEL,
  STARTER_HINTS,
  STARTER_PROMPTS,
} from './constants.mjs'
import { clampSelection, typeBadge, wrap } from './helpers.mjs'

const AVERAGE_IV = 15

export const starterPreview = (id) => {
  const entry = species(id)
  const ivs = Object.fromEntries(
    Object.keys(statsAtLevel(id, PREVIEW_LEVEL, {})).map((stat) => [
      stat,
      AVERAGE_IV,
    ]),
  )

  return { entry, stats: statsAtLevel(id, PREVIEW_LEVEL, ivs) }
}

const nameStep = (ctx) => {
  return html`<section class="field">
    <p class="field__headline">${STARTER_PROMPTS.intro}</p>
    <p>${STARTER_PROMPTS.askName}</p>
    <p class="code">${ctx.setup.name}<span class="caret">▮</span></p>
    <p class="hint">
      ${STARTER_HINTS.confirm} ${MAX_NAME} ${STARTER_HINTS.characters}
    </p>
  </section>`
}

const choiceStep = (ctx) => {
  const selection = clampSelection(ctx.setup.selection, STARTERS.length)

  return html`<section class="stack">
    <p class="field__headline">${STARTER_PROMPTS.choose}</p>
    <div class="starter">
      ${STARTERS.map((id, index) => {
        const { entry } = starterPreview(id)

        return html`<button
          class="starter__choice"
          type="button"
          aria-selected="${index === selection}"
          data-index="${index}"
          data-key="enter"
        >
          <img
            class="sprite sprite--md"
            src="${monSpriteUrl('front', id, false)}"
            alt=""
          />
          <span class="name">${entry.name}</span>
          <span class="types">${entry.types.map(typeBadge)}</span>
        </button>`
      })}
    </div>
  </section>`
}

export const draw = (ctx) => {
  return html`<div class="screen">
    <header class="topbar">
      <div class="topbar__title"><span class="ball">◓</span> ${APP_TITLE}</div>
    </header>
    ${ctx.setup.step === 'name' ? nameStep(ctx) : choiceStep(ctx)}
    ${hints(
      ctx.setup.step === 'name'
        ? `${STARTER_HINTS.confirm} ${MAX_NAME} ${STARTER_HINTS.characters}`
        : STARTER_HINTS.pick,
      ctx.version,
    )}
  </div>`
}

export const select = (ctx, index) => {
  ctx.setup.selection = index
}

export const onKey = (ctx, key) => {
  if (ctx.setup.step === 'name') {
    if (key.name === 'enter') {
      if (ctx.setup.name.trim().length > 0) ctx.setup.step = 'starter'

      return
    }

    if (key.name === 'backspace') {
      ctx.setup.name = ctx.setup.name.slice(0, -1)

      return
    }

    if (key.name.length === 1 && ctx.setup.name.length < MAX_NAME) {
      ctx.setup.name += key.shift ? key.name.toUpperCase() : key.name
    }

    return
  }

  if (key.name === 'left') {
    ctx.setup.selection = wrap(ctx.setup.selection - 1, STARTERS.length)
    ctx.playSound('cursor')
  } else if (key.name === 'right') {
    ctx.setup.selection = wrap(ctx.setup.selection + 1, STARTERS.length)
    ctx.playSound('cursor')
  } else if (key.name === 'enter' || key.name === 'space') {
    ctx.playSound('select')
    ctx.finishSetup(STARTERS[ctx.setup.selection])
  }
}
