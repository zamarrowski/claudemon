import { ballSteps } from '../../../src/ballThrow.mjs'
import { moveIsBlocked } from '../../../src/battleFlow.mjs'
import { ITEMS } from '../../../src/constants.mjs'
import { move as moveData } from '../../../src/data.mjs'
import { expProgress } from '../../../src/exp.mjs'
import { displayName, isFainted, levelOf } from '../../../src/pokemon.mjs'
import { monsLeft, trainerLabel } from '../../../src/trainer.mjs'
import { html } from '../dom.mjs'
import { trainerSpriteUrl } from '../sprites.mjs'
import {
  BALL_ARC,
  BALL_HOME,
  BALL_TARGET,
  BATTLE_MAIN_MENU,
  BATTLE_PROMPTS,
  CAUGHT_GLYPH,
  EMPTY_BAG_MESSAGE,
  FAINTED_TAG,
} from './constants.mjs'
import {
  clampSelection,
  hpBar,
  monSprite,
  typeBadge,
  wrap,
} from './helpers.mjs'

export const ballPosition = (step) => {
  if (!step || step.kind !== 'throw') return BALL_TARGET

  const t = step.t
  const left = BALL_HOME.left + (BALL_TARGET.left - BALL_HOME.left) * t
  const top =
    BALL_HOME.top +
    (BALL_TARGET.top - BALL_HOME.top) * t -
    Math.sin(t * Math.PI) * BALL_ARC

  return { left, top }
}

export const currentBallStep = (battle) => {
  if (!battle.ball) return null

  return ballSteps(battle.ball)[battle.ball.frame] ?? null
}

export const menuLength = (ctx) => {
  const battle = ctx.battle

  switch (battle.menu) {
    case 'main':
      return BATTLE_MAIN_MENU.length
    case 'fight':
      return battle.state.player.mon.moves.length
    case 'bag':
      return battle.bagItems.length
    case 'target':
    case 'party':
      return ctx.save.party.length
    case 'learn':
      return battle.learnStep.mon.moves.length + 1
    default:
      return 0
  }
}

const statusTag = (mon) => {
  if (!mon.status) return ''

  return html`<span class="tag tag--status">${mon.status.slice(0, 3)}</span>`
}

const nameplate = (mon, hp, caught) => {
  return html`<div class="gb__nameplate">
    <div class="row">
      <span class="name">${displayName(mon).toUpperCase()}</span>
      <span class="level">Lv${levelOf(mon)}</span>
      ${caught ? html`<span title="caught">${CAUGHT_GLYPH}</span>` : ''}
      ${statusTag(mon)}
    </div>
    ${hpBar(hp, mon.stats.hp)}
  </div>`
}

const tray = (trainer) => {
  if (!trainer) return ''

  const left = monsLeft(trainer)

  return html`<div class="gb__tray">
    ${trainer.team.map(
      (mon, index) => html`<span data-left="${index < left}"></span>`,
    )}
  </div>`
}

const foeSide = (ctx, battle) => {
  if (battle.trainerIntro) {
    return html`<div class="gb__side gb__side--foe">
      <div class="gb__nameplate">
        <span class="name">${trainerLabel(battle.state.trainer)}</span>
      </div>
      ${tray(battle.state.trainer)}
    </div>`
  }

  const caught = ctx.save.dex.caught.includes(battle.foeMon.species)

  return html`<div class="gb__side gb__side--foe">
    ${nameplate(battle.foeMon, battle.hp.foe, caught)}
    ${tray(battle.state.trainer)}
  </div>`
}

const playerSide = (battle) => {
  const mon = battle.state.player.mon
  const progress = expProgress(mon.species, mon.exp)

  return html`<div class="gb__side gb__side--player">
    ${nameplate(mon, battle.hp.player, false)}
    <div class="exp__track" style="width:160px">
      <div class="exp__fill" style="width:${progress.fraction * 100}%"></div>
    </div>
  </div>`
}

const foeSprite = (battle, step) => {
  if (battle.trainerIntro) {
    return html`<div class="gb__trainer">
      <img src="${trainerSpriteUrl(battle.state.trainer.sprite)}" alt="" />
    </div>`
  }

  const mon = battle.foeMon

  return html`<div
    class="gb__mon gb__mon--foe"
    data-hit="${battle.effect?.side === 'foe'}"
    data-hidden="${step?.hideFoe === true}"
  >
    ${monSprite(mon, 'battle')}
  </div>`
}

const playerSprite = (battle) => {
  const mon = battle.state.player.mon

  return html`<div
    class="gb__mon gb__mon--player"
    data-hit="${battle.effect?.side === 'player'}"
  >
    ${monSprite(mon, 'battle', 'back')}
  </div>`
}

const ball = (step) => {
  if (!step) return ''

  const { left, top } = ballPosition(step)

  return html`<span
    class="gb__ball"
    data-kind="${step.kind}"
    data-lit="${step.lit === true}"
    style="left:${left}%;top:${top}%;--tilt:${step.tilt ?? 0}"
  ></span>`
}

const moveRows = (battle) => {
  const actor = battle.state.player
  const selected = clampSelection(battle.selection, actor.mon.moves.length)

  return html`<div class="battle-menu battle-menu--moves">
    ${actor.mon.moves.map((slot, index) => {
      const data = moveData(slot.move)
      const blocked = moveIsBlocked(actor, index)

      return html`<button
        class="move"
        type="button"
        aria-selected="${index === selected}"
        data-index="${index}"
        data-key="enter"
        ${blocked ? 'disabled' : ''}
      >
        <span class="name">${data.name}</span>
        <span class="move__meta">
          ${typeBadge(data.type)}
          <span>${slot.pp}/${slot.maxPp} PP</span>
          <span
            >${data.power ? `Power ${data.power}` : BATTLE_PROMPTS.statusMove}
          </span>
        </span>
      </button>`
    })}
  </div>`
}

const optionRows = (labels, selection) => {
  return html`<div class="battle-menu">
    ${labels.map(
      (label, index) =>
        html`<button
          class="menu__item"
          type="button"
          aria-selected="${index === clampSelection(selection, labels.length)}"
          data-index="${index}"
          data-key="enter"
        >
          ${label}
        </button>`,
    )}
  </div>`
}

const partyLabels = (save) => {
  return save.party.map((mon) => {
    const fainted = isFainted(mon) ? ` ${FAINTED_TAG}` : ''

    return `${displayName(mon).toUpperCase()} Lv${levelOf(mon)} ${mon.hp}/${mon.stats.hp}${fainted}`
  })
}

const prompt = (ctx) => {
  const battle = ctx.battle

  if (battle.message) {
    return html`<div class="dialog">
      <span>${battle.message}</span>
      ${
        battle.events.length > 0
          ? html`<span class="dialog__more">▾ ${BATTLE_PROMPTS.more}</span>`
          : ''
      }
    </div>`
  }

  const player = battle.state.player.mon

  switch (battle.menu) {
    case 'main':
      return html`<div class="dialog">
          What will ${displayName(player).toUpperCase()} do?
        </div>
        ${optionRows(BATTLE_MAIN_MENU, battle.selection)}`
    case 'fight':
      return moveRows(battle)
    case 'bag': {
      if (battle.bagItems.length === 0) {
        return html`<div class="dialog">
          ${EMPTY_BAG_MESSAGE} ${BATTLE_PROMPTS.back}
        </div>`
      }

      const labels = battle.bagItems.map(
        (key) => `${ITEMS[key].name} ×${ctx.save.bag[key]}`,
      )

      return html`<div class="dialog">${BATTLE_PROMPTS.useItem}</div>
        ${optionRows(labels, battle.selection)}`
    }
    case 'party':
      return html`<div class="dialog">${BATTLE_PROMPTS.switchTo}</div>
        ${optionRows(partyLabels(ctx.save), battle.selection)}`
    case 'target':
      return html`<div class="dialog">
          Use the ${ITEMS[battle.bagItem].name} on which Pokémon?
        </div>
        ${optionRows(partyLabels(ctx.save), battle.selection)}`
    case 'learn': {
      const step = battle.learnStep
      const labels = step.mon.moves.map((slot) => moveData(slot.move).name)

      return html`<div class="dialog">
          Which move should ${displayName(step.mon).toUpperCase()} forget to
          learn ${moveData(step.move).name}?
        </div>
        ${optionRows(
          [...labels, BATTLE_PROMPTS.declineMove],
          battle.selection,
        )}`
    }
    default:
      return html`<div class="dialog"></div>`
  }
}

export const draw = (ctx) => {
  const battle = ctx.battle
  const step = currentBallStep(battle)

  return html`<div class="screen">
    <section class="gb">
      <div class="gb__field">
        ${foeSide(ctx, battle)} ${foeSprite(battle, step)}
        ${playerSprite(battle)} ${playerSide(battle)} ${ball(step)}
      </div>
      ${prompt(ctx)}
    </section>
  </div>`
}

export const select = (ctx, index) => {
  ctx.battle.selection = index
}

export const onKey = (ctx, key) => {
  const battle = ctx.battle

  if (battle.message) {
    ctx.advanceMessage()
    return
  }

  const options = menuLength(ctx)

  if (key.name === 'up') battle.selection = wrap(battle.selection - 1, options)
  else if (key.name === 'down')
    battle.selection = wrap(battle.selection + 1, options)
  else if (key.name === 'left')
    battle.selection = wrap(battle.selection - 1, options)
  else if (key.name === 'right')
    battle.selection = wrap(battle.selection + 1, options)
  else if (key.name === 'enter' || key.name === 'space')
    ctx.chooseBattleOption()
  else if (key.name === 'esc') ctx.backOutOfBattleMenu()
}
