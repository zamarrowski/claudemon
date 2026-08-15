import { isWorking } from '../../../src/activity.mjs'
import { TRAINER_MESSAGES } from '../../../src/constants.mjs'
import { encounterSpecies } from '../../../src/encounter.mjs'
import { elapsed } from '../../../src/format.mjs'
import { displayName, isFainted, levelOf } from '../../../src/pokemon.mjs'
import {
  activePokemon,
  partyIsWipedOut,
  partyNeedsHealing,
} from '../../../src/state.mjs'
import { trainerLabel } from '../../../src/trainer.mjs'
import { html } from '../dom.mjs'
import { trainerSpriteUrl } from '../sprites.mjs'
import { hints, topbar } from './chrome.mjs'
import {
  ACTIVITY_MESSAGES,
  BASE_MENU,
  ENCOUNTER_MESSAGES,
  FIGHT_MENU_LABEL,
  GRASS_BLADE,
  GRASS_BLADES,
  GRASS_MESSAGES,
  HOME_HINTS,
  HOME_TEAM_PANEL_TITLE,
  REST_MESSAGES,
  UPDATE_NOTICES,
  WALK_HINTS,
} from './constants.mjs'
import { clampSelection, hpBar, speciesSprite, wrap } from './helpers.mjs'

export const menuItems = (ctx) => {
  const base = isWorking(ctx.activity)
    ? BASE_MENU.map((item) =>
        item.id === 'heal' ? { ...item, disabled: true } : item,
      )
    : BASE_MENU

  if (!ctx.encounter) return base

  const fight = {
    id: 'fight',
    label: FIGHT_MENU_LABEL,
    disabled: !activePokemon(ctx.save),
  }

  return [fight, ...base]
}

export const secondsLeft = (encounter, now = Date.now()) => {
  return Math.max(0, Math.ceil((encounter.expiresAt - now) / 1000))
}

export const activityLabel = (activity, now = Date.now()) => {
  if (activity.state === 'unknown') return null

  const age =
    typeof activity.since === 'number' ? elapsed(now - activity.since) : null
  const others = activity.sessions > 1 ? `+${activity.sessions - 1}` : null

  return {
    state: activity.state,
    text: ACTIVITY_MESSAGES[activity.state],
    tool: activity.state === 'working' ? activity.tool : null,
    others,
    age,
  }
}

export const restNote = (ctx) => {
  if (!isWorking(ctx.activity)) return null
  if (partyIsWipedOut(ctx.save)) return REST_MESSAGES.wipedOut
  if (!partyNeedsHealing(ctx.save)) return null

  return REST_MESSAGES.needsHealing
}

const activityRow = (activity) => {
  const label = activityLabel(activity)

  if (!label) return ''

  return html`<div class="activity" data-state="${label.state}">
    <span class="activity__dot"></span>
    <span>${label.text}</span>
    ${label.others ? html`<span class="pill">${label.others}</span>` : ''}
    ${label.tool ? html`<span class="pill">${label.tool}</span>` : ''}
    ${label.age ? html`<span class="hint">${label.age}</span>` : ''}
  </div>`
}

const updateRow = (notice) => {
  if (!notice) return ''

  if (notice.kind === 'stale') {
    return html`<div class="notice">
      <strong>v${notice.version}</strong> ${UPDATE_NOTICES.installed} ·
      ${UPDATE_NOTICES.quitAndRun}
    </div>`
  }

  return html`<button class="notice" data-key="u" type="button">
    <strong>v${notice.version}</strong> ${UPDATE_NOTICES.available} · [u]
    ${UPDATE_NOTICES.update}
  </button>`
}

const encounterSprite = (encounter) => {
  if (encounter.kind === 'trainer' && encounter.trainer.sprite) {
    return html`<img
      class="sprite sprite--lg"
      src="${trainerSpriteUrl(encounter.trainer.sprite)}"
      alt=""
    />`
  }

  return html`${speciesSprite(encounterSpecies(encounter), {
    size: 'lg',
    shiny: encounter.shiny,
  })}`
}

const encounterHeadline = (encounter) => {
  if (encounter.kind === 'trainer') {
    return html`✦
      <strong>${trainerLabel(encounter.trainer)}</strong>
      ${TRAINER_MESSAGES.wantsToBattle}`
  }

  return html`✦ ${ENCOUNTER_MESSAGES.wild}
    <strong>${encounter.name.toUpperCase()}</strong>
    ${encounter.shiny ? html`<span class="tag tag--shiny">shiny</span>` : ''}
    ${ENCOUNTER_MESSAGES.appeared}`
}

const grass = (walking) => {
  const blades = Array.from(
    { length: GRASS_BLADES },
    () => html`<span>${GRASS_BLADE}</span>`,
  )

  return html`<div class="field__grass" data-walking="${walking}">
    ${blades}
  </div>`
}

const encounterField = (encounter) => {
  return html`<section class="field">
    <p class="field__headline">${encounterHeadline(encounter)}</p>
    <p class="countdown">
      ${ENCOUNTER_MESSAGES.slipsBackIn} ${secondsLeft(encounter)}s
    </p>
    ${encounterSprite(encounter)} ${grass(false)}
  </section>`
}

const quietField = (working) => {
  return html`<section class="field">
    <p class="field__headline">
      ${working ? GRASS_MESSAGES.rustling : GRASS_MESSAGES.quiet}
    </p>
    ${grass(working)}
    <p class="hint">${working ? WALK_HINTS.working : WALK_HINTS.idle}</p>
  </section>`
}

const teamPanel = (save) => {
  if (!save.party.length) return ''

  return html`<section class="panel">
    <h2 class="panel__title">${HOME_TEAM_PANEL_TITLE}</h2>
    <div class="list">
      ${save.party.map(
        (mon) =>
          html`<div
            class="list__row ${isFainted(mon) ? 'list__row--fainted' : ''}"
          >
            <span class="name">${displayName(mon).toUpperCase()}</span>
            <span class="level">Lv${levelOf(mon)}</span>
            ${hpBar(mon.hp, mon.stats.hp)}
          </div>`,
      )}
    </div>
  </section>`
}

export const draw = (ctx) => {
  const items = menuItems(ctx)
  const selection = clampSelection(ctx.homeSelection, items.length)
  const rest = restNote(ctx)
  const working = ctx.activity.state === 'working'

  return html`<div class="screen">
    ${topbar(ctx.save)} ${activityRow(ctx.activity)}
    ${updateRow(ctx.updateNotice)}
    ${ctx.encounter ? encounterField(ctx.encounter) : quietField(working)}
    ${teamPanel(ctx.save)} ${rest ? html`<p class="hint">${rest}</p>` : ''}
    ${ctx.notice ? html`<p class="notice">${ctx.notice}</p>` : ''}
    <nav class="menu">
      ${items.map(
        (item, index) =>
          html`<button
            class="menu__item"
            type="button"
            aria-selected="${index === selection}"
            data-index="${index}"
            data-key="enter"
            ${item.disabled ? 'disabled' : ''}
          >
            ${item.label}
          </button>`,
      )}
    </nav>
    ${hints(HOME_HINTS, ctx.version)}
  </div>`
}

export const select = (ctx, index) => {
  ctx.homeSelection = index
}

export const onKey = (ctx, key) => {
  if (key.name === 'u' && ctx.updateNotice?.kind === 'available') {
    ctx.startUpdate()
    return
  }

  const items = menuItems(ctx)

  ctx.homeSelection = clampSelection(ctx.homeSelection, items.length)

  if (key.name === 'left' || key.name === 'right') {
    ctx.homeSelection = wrap(
      ctx.homeSelection + (key.name === 'left' ? -1 : 1),
      items.length,
    )
    ctx.playSound('cursor')
  } else if (key.name === 'enter' || key.name === 'space') {
    const item = items[ctx.homeSelection]

    if (item.disabled) {
      ctx.playSound('back')
      return
    }

    ctx.playSound('select')
    ctx.openHomeSelection(item.id)
  } else if (key.name === 'q') {
    ctx.quit()
  }
}
