import { DAYCARE_LIMIT } from '../../../src/constants.mjs'
import {
  daycareCandidates,
  eggProgress,
  pairIsCompatible,
} from '../../../src/daycare.mjs'
import { displayName, levelOf } from '../../../src/pokemon.mjs'
import { html } from '../dom.mjs'
import { eggSpriteUrl } from '../sprites.mjs'
import { hints, notes, screenHead } from './chrome.mjs'
import {
  DAYCARE_HINTS,
  DAYCARE_NOTES,
  DAYCARE_PICK_HINTS,
  DAYCARE_TITLE,
  EMPTY_SLOT_LABEL,
  FROM_BOX_TAG,
} from './constants.mjs'
import { clampSelection, wrap } from './helpers.mjs'

const slotRows = (ctx) => {
  const slots = ctx.save.daycare.slots
  const selection = clampSelection(ctx.daycareSelection, DAYCARE_LIMIT)

  return html`<div class="list">
    ${Array.from({ length: DAYCARE_LIMIT }, (unused, index) => {
      const mon = slots[index]

      return html`<button
        class="list__row"
        type="button"
        aria-selected="${index === selection}"
        data-index="${index}"
        data-key="enter"
      >
        <span class="name"
          >${mon ? displayName(mon).toUpperCase() : EMPTY_SLOT_LABEL}</span
        >
        <span class="level">${mon ? `Lv${levelOf(mon)}` : ''}</span>
        <span class="hint"></span>
      </button>`
    })}
  </div>`
}

const pairNote = (save) => {
  if (save.daycare.slots.length < DAYCARE_LIMIT) return DAYCARE_NOTES.needTwo

  return pairIsCompatible(save) ? DAYCARE_NOTES.getAlong : DAYCARE_NOTES.noSpark
}

const eggPanel = (save) => {
  const egg = save.daycare.egg

  if (!egg) {
    return html`<aside class="panel detail">
      <p class="hint">${DAYCARE_NOTES.noEgg}</p>
      <p class="hint">${pairNote(save)}</p>
    </aside>`
  }

  return html`<aside class="panel detail">
    <img class="sprite sprite--lg" src="${eggSpriteUrl()}" alt="" />
    <p class="name">${DAYCARE_NOTES.inside}</p>
    <div class="exp__track">
      <div class="exp__fill" style="width:${eggProgress(egg) * 100}%"></div>
    </div>
    <p class="hint">${egg.steps} ${DAYCARE_NOTES.steps}</p>
    <p class="hint">${DAYCARE_NOTES.onlyWhileOpen}</p>
  </aside>`
}

const pickRows = (ctx) => {
  const candidates = daycareCandidates(ctx.save)
  const selection = clampSelection(ctx.daycarePickSelection, candidates.length)

  return html`<div class="list">
    ${candidates.map(
      (entry, index) =>
        html`<button
          class="list__row"
          type="button"
          aria-selected="${index === selection}"
          data-index="${index}"
          data-key="enter"
        >
          <span class="name">${displayName(entry.mon).toUpperCase()}</span>
          <span class="level">Lv${levelOf(entry.mon)}</span>
          <span class="hint"
            >${entry.source === 'box' ? FROM_BOX_TAG : ''}</span
          >
        </button>`,
    )}
  </div>`
}

export const draw = (ctx) => {
  const picking = ctx.daycareStep === 'pick'

  return html`<div class="screen">
    ${screenHead(DAYCARE_TITLE, DAYCARE_NOTES.raising)}
    <div class="split">
      <div class="stack">
        ${
          picking
            ? html`<p class="field__headline">${DAYCARE_NOTES.pick}</p>
                ${pickRows(ctx)}`
            : slotRows(ctx)
        }
        ${notes(ctx.daycareMessage)}
      </div>
      ${eggPanel(ctx.save)}
    </div>
    ${hints(picking ? DAYCARE_PICK_HINTS : DAYCARE_HINTS, ctx.version)}
  </div>`
}

export const select = (ctx, index) => {
  if (ctx.daycareStep === 'pick') {
    ctx.daycarePickSelection = index
    return
  }

  ctx.daycareSelection = index
}

const onPickKey = (ctx, key) => {
  if (key.name === 'esc' || key.name === 'q') {
    ctx.closeDaycarePick()
    return
  }

  const candidates = daycareCandidates(ctx.save)

  if (key.name === 'up' || key.name === 'k') {
    ctx.daycarePickSelection = wrap(
      ctx.daycarePickSelection - 1,
      candidates.length,
    )
    ctx.daycareMessage = null
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.daycarePickSelection = wrap(
      ctx.daycarePickSelection + 1,
      candidates.length,
    )
    ctx.daycareMessage = null
  } else if (key.name === 'enter' || key.name === 'space') {
    const entry =
      candidates[clampSelection(ctx.daycarePickSelection, candidates.length)]

    ctx.leaveAtDaycare(entry.source, entry.index)
  }
}

const onSlotsKey = (ctx, key) => {
  if (key.name === 'esc' || key.name === 'q') {
    ctx.closeDaycare()
    return
  }

  if (key.name === 'up' || key.name === 'k') {
    ctx.daycareSelection = wrap(ctx.daycareSelection - 1, DAYCARE_LIMIT)
    ctx.daycareMessage = null
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.daycareSelection = wrap(ctx.daycareSelection + 1, DAYCARE_LIMIT)
    ctx.daycareMessage = null
  } else if (key.name === 'enter' || key.name === 'space') {
    if (ctx.save.daycare.slots[ctx.daycareSelection]) {
      ctx.takeBackFromDaycare(ctx.daycareSelection)
      return
    }

    ctx.openDaycarePick()
  }
}

export const onKey = (ctx, key) => {
  if (ctx.daycareStep === 'pick') return onPickKey(ctx, key)

  return onSlotsKey(ctx, key)
}
