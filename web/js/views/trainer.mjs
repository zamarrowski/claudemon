import { achievementEntries, earnedCount } from '../../../src/achievements.mjs'
import { ACHIEVEMENTS } from '../../../src/constants.mjs'
import { money } from '../../../src/format.mjs'
import { daysOnTheRoad } from '../../../src/state.mjs'
import { workedHours } from '../../../src/worked.mjs'
import { html } from '../dom.mjs'
import { hints, screenHead } from './chrome.mjs'
import {
  ACHIEVEMENT_MARKS,
  KANTO_TOTAL,
  TRAINER_ACHIEVEMENTS_TITLE,
  TRAINER_HINTS,
  TRAINER_NOTES,
  TRAINER_RECORD_LABELS,
  TRAINER_RECORD_TITLE,
  TRAINER_TITLE,
} from './constants.mjs'
import { badgeStrip, clampSelection, wrap } from './helpers.mjs'

export const recordRows = (ctx) => {
  const { stats, dex } = ctx.save

  return [
    [TRAINER_RECORD_LABELS.caught, `${dex.caught.length}/${KANTO_TOTAL}`],
    [TRAINER_RECORD_LABELS.shiny, String(dex.shiny.length)],
    [TRAINER_RECORD_LABELS.battles, String(stats.battles)],
    [TRAINER_RECORD_LABELS.won, String(stats.wins)],
    [TRAINER_RECORD_LABELS.lost, String(stats.losses)],
    [TRAINER_RECORD_LABELS.ran, String(stats.runs)],
    [TRAINER_RECORD_LABELS.streak, `${stats.streak}`],
    [TRAINER_RECORD_LABELS.worked, `${workedHours(ctx.worked)}h`],
    [TRAINER_RECORD_LABELS.money, money(ctx.save.money)],
  ]
}

export const draw = (ctx) => {
  const entries = achievementEntries(ctx.save, ctx.worked)
  const selection = clampSelection(ctx.trainerSelection, entries.length)
  const days = daysOnTheRoad(ctx.save)

  return html`<div class="screen">
    ${screenHead(
      TRAINER_TITLE,
      `${days} ${days === 1 ? TRAINER_NOTES.day : TRAINER_NOTES.days} ${TRAINER_NOTES.onTheRoad}`,
    )}
    <div class="split">
      <div class="stack">
        <section class="panel">
          <h2 class="panel__title">${TRAINER_RECORD_TITLE}</h2>
          <p class="name">${ctx.save.trainer.name.toUpperCase()}</p>
          <div class="detail__stats">
            ${recordRows(ctx).map(
              ([label, value]) =>
                html`<div>${label}</div>
                  <div><b>${value}</b></div>`,
            )}
          </div>
        </section>
        <section class="panel">
          <h2 class="panel__title">
            ${TRAINER_NOTES.earned} ${TRAINER_NOTES.badges}
          </h2>
          ${badgeStrip(ctx.save)}
        </section>
      </div>
      <section class="panel">
        <h2 class="panel__title">
          ${TRAINER_ACHIEVEMENTS_TITLE}
          ${earnedCount(entries)}/${ACHIEVEMENTS.length}
        </h2>
        <div class="list">
          ${entries.map(
            (entry, index) =>
              html`<button
                class="list__row"
                type="button"
                aria-selected="${index === selection}"
                data-index="${index}"
              >
                <span
                  >${
                    entry.earnedAt
                      ? ACHIEVEMENT_MARKS.earned
                      : ACHIEVEMENT_MARKS.locked
                  }</span
                >
                <span class="name">${entry.label}</span>
                <span class="hint"
                  >${entry.value}/${entry.goal} · ${entry.hint}</span
                >
              </button>`,
          )}
        </div>
      </section>
    </div>
    ${ctx.notice ? html`<p class="notice">${ctx.notice}</p>` : ''}
    ${hints(TRAINER_HINTS, ctx.version)}
  </div>`
}

export const select = (ctx, index) => {
  ctx.trainerSelection = index
}

export const onKey = (ctx, key) => {
  if (key.name === 'up' || key.name === 'k') {
    ctx.trainerSelection = wrap(ctx.trainerSelection - 1, ACHIEVEMENTS.length)
    ctx.playSound('cursor')
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.trainerSelection = wrap(ctx.trainerSelection + 1, ACHIEVEMENTS.length)
    ctx.playSound('cursor')
  } else if (key.name === 's') {
    ctx.playSound('select')
    ctx.exportCard()
  } else if (key.name === 'esc' || key.name === 'q') {
    ctx.playSound('back')
    ctx.homeSelection = 0
    ctx.setMode('home')
  }
}
