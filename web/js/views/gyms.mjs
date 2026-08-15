import { GYMS } from '../../../src/constants.mjs'
import { gymLevelRange, gymRoster } from '../../../src/gym.mjs'
import { hasBadge } from '../../../src/state.mjs'
import { html } from '../dom.mjs'
import { hints, notes, screenHead } from './chrome.mjs'
import { GYMS_HINTS, GYMS_TITLE, GYM_NOTES } from './constants.mjs'
import {
  badgeStrip,
  clampSelection,
  cursorDelta,
  levelRangeLabel,
  selector,
  typeBadge,
  wrap,
} from './helpers.mjs'

export const draw = (ctx) => {
  const selection = clampSelection(ctx.gymSelection, GYMS.length)
  const earned = GYMS.filter((gym) => hasBadge(ctx.save, gym.id)).length

  return html`<div class="screen">
    ${screenHead(GYMS_TITLE, `${earned}/${GYMS.length} ${GYM_NOTES.badges}`)}
    ${badgeStrip(ctx.save)}
    <div class="gyms">
      ${GYMS.map((gym, index) => {
        const cleared = hasBadge(ctx.save, gym.id)

        return html`<button
          class="gym-card"
          type="button"
          aria-selected="${index === selection}"
          data-cleared="${cleared}"
          data-index="${index}"
          data-key="enter"
        >
          <span class="name">${gym.city}</span>
          <span class="row">
            ${typeBadge(gym.type)}
            <span class="level">${levelRangeLabel(gymLevelRange(gym))}</span>
          </span>
          <span class="hint">${gym.leader.name} · ${gym.badge}</span>
          <span class="hint"
            >${gymRoster(gym).length - 1} ${GYM_NOTES.trainers}</span
          >
          <span class="hint"
            >${cleared ? GYM_NOTES.alreadyWon : GYM_NOTES.noBadgeYet}</span
          >
        </button>`
      })}
    </div>
    ${notes(ctx.gymMessage)} ${hints(GYMS_HINTS, ctx.version)}
  </div>`
}

export const select = selector('gymSelection', 'gymMessage')

export const onKey = (ctx, key) => {
  const delta = cursorDelta(ctx, key)

  if (delta) {
    ctx.gymSelection = wrap(ctx.gymSelection + delta, GYMS.length)
    ctx.gymMessage = null
  } else if (key.name === 'enter' || key.name === 'space') {
    ctx.startGymRun(GYMS[ctx.gymSelection].id)
  } else if (key.name === 'esc' || key.name === 'q') {
    ctx.gymMessage = null
    ctx.goHome()
  }
}
