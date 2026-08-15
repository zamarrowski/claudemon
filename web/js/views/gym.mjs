import {
  currentOpponent,
  gymOf,
  gymRoster,
  isLeaderNext,
  opponentLevelRange,
  opponentStatus,
} from '../../../src/gym.mjs'
import { displayName, isFainted, levelOf } from '../../../src/pokemon.mjs'
import { countOfKind } from '../../../src/shop.mjs'
import { trainerLabel } from '../../../src/trainer.mjs'
import { html } from '../dom.mjs'
import { trainerSpriteUrl } from '../sprites.mjs'
import { hints, notes, screenHead } from './chrome.mjs'
import {
  GYM_HINTS,
  GYM_NOTES,
  GYM_PROMPTS,
  GYM_ROSTER_MARKS,
  GYM_ROSTER_PANEL_TITLE,
  GYM_TITLE_SUFFIX,
} from './constants.mjs'
import {
  clampSelection,
  hpBar,
  levelRangeLabel,
  noteRows,
  typeBadge,
  wrap,
} from './helpers.mjs'

const rosterRows = (run) => {
  const gym = gymOf(run)

  return html`<section class="panel">
    <h2 class="panel__title">${GYM_ROSTER_PANEL_TITLE}</h2>
    <div class="list">
      ${gymRoster(gym).map((opponent, index) => {
        const status = opponentStatus(run, index)

        return html`<div class="list__row">
          <span>${GYM_ROSTER_MARKS[status] ?? GYM_ROSTER_MARKS.pending}</span>
          <span class="name">${trainerLabel(opponent)}</span>
          <span class="level"
            >${levelRangeLabel(opponentLevelRange(opponent))}</span
          >
        </div>`
      })}
    </div>
  </section>`
}

const partyRows = (ctx) => {
  const selection = clampSelection(ctx.teamSelection, ctx.save.party.length)

  return html`<div class="list">
    ${ctx.save.party.map(
      (mon, index) =>
        html`<button
          class="list__row ${isFainted(mon) ? 'list__row--fainted' : ''}"
          type="button"
          aria-selected="${index === selection}"
          data-index="${index}"
        >
          <span class="name">${displayName(mon).toUpperCase()}</span>
          <span class="level">Lv${levelOf(mon)}</span>
          ${hpBar(mon.hp, mon.stats.hp)}
        </button>`,
    )}
  </div>`
}

export const draw = (ctx) => {
  const run = ctx.gym
  const gym = gymOf(run)
  const opponent = currentOpponent(run)

  return html`<div class="screen">
    ${screenHead(
      `${gym.city} ${GYM_TITLE_SUFFIX}`,
      `${GYM_NOTES.inYourBag}: ${countOfKind(ctx.save, 'heal')} ${GYM_NOTES.potions} · ${countOfKind(ctx.save, 'revive')} ${GYM_NOTES.revives}`,
    )}
    <div class="split">
      <div class="stack">
        <section class="field">
          <p class="field__headline">${trainerLabel(opponent)}</p>
          ${
            opponent.sprite
              ? html`<img
                  class="sprite sprite--lg"
                  src="${trainerSpriteUrl(opponent.sprite)}"
                  alt=""
                />`
              : ''
          }
          <p class="hint">
            ${isLeaderNext(run) ? GYM_PROMPTS.leader : GYM_PROMPTS.challenge}
          </p>
          <button class="menu__item" type="button" data-key="enter">
            ${GYM_PROMPTS.challenge}
          </button>
        </section>
        ${partyRows(ctx)}
        <p class="hint">${GYM_NOTES.rules} ${GYM_NOTES.rollback}</p>
        ${
          ctx.gymLeaving
            ? html`<p class="notice">${GYM_NOTES.confirmLeave}</p>`
            : ''
        }
        ${notes(noteRows(ctx.gymMessage))} ${notes(noteRows(ctx.bagMessage))}
      </div>
      <aside class="panel detail">
        <span class="row">${typeBadge(gym.type)} <b>${gym.badge}</b></span>
        ${rosterRows(run)}
      </aside>
    </div>
    ${hints(GYM_HINTS, ctx.version)}
  </div>`
}

export const select = (ctx, index) => {
  ctx.teamSelection = index
}

export const onKey = (ctx, key) => {
  const total = ctx.save.party.length

  if (key.name === 'esc') {
    ctx.confirmLeaveGym()
    return
  }

  if (ctx.gymLeaving) {
    ctx.cancelLeaveGym()
    return
  }

  ctx.gymMessage = null
  ctx.bagMessage = null

  if (key.name === 'up' || key.name === 'k')
    ctx.teamSelection = wrap(ctx.teamSelection - 1, total)
  else if (key.name === 'down' || key.name === 'j')
    ctx.teamSelection = wrap(ctx.teamSelection + 1, total)
  else if (key.name === 'enter' || key.name === 'space') ctx.startGymBattle()
  else if (key.name === 'i') ctx.openBag()
  else if (key.name === 'l') ctx.makeLead(ctx.teamSelection)
}
