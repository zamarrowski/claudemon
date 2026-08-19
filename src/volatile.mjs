import { applyDamage, applyHeal, label, other, say } from './battleEvents.mjs'
import {
  CONFUSION_SELF_HIT_CHANCE,
  CONFUSION_SELF_HIT_POWER,
  CONFUSION_TURNS,
  DISABLE_TURNS,
  LEECH_SEED_FRACTION,
  TRAP_FRACTION,
  TRAP_TURNS,
  TURN_MESSAGES,
  VOLATILE_MESSAGES,
} from './constants.mjs'
import { baseDamage } from './damage.mjs'
import { move as moveData } from './data.mjs'
import {
  hpFraction,
  isFainted,
  isImmuneToAilment,
  levelOf,
} from './pokemon.mjs'
import { chance, pick, randInt } from './rng.mjs'

export const emptyVolatile = () => {
  return {
    confusion: 0,
    confusionTurn: null,
    statusTurn: null,
    flinchTurn: null,
    trap: null,
    leechSeed: false,
    disable: null,
    locked: null,
  }
}

export const statusLandedThisTurn = (actor, turn) => {
  return actor.volatile.statusTurn === turn
}

const moveNameOf = (mon, index) => moveData(mon.moves[index].move).name

const announce = (events, side, effect, text) => {
  events.push({ type: 'volatile', side, effect })

  say(events, text)
}

const startConfusion = (battle, side, move, events) => {
  const volatileState = battle[side].volatile

  if (volatileState.confusion > 0) return

  volatileState.confusion = randInt(
    battle.rng,
    CONFUSION_TURNS.min,
    CONFUSION_TURNS.max,
  )
  volatileState.confusionTurn = battle.turn

  announce(
    events,
    side,
    'confusion',
    `${label(battle, side)} ${VOLATILE_MESSAGES.confused}`,
  )
}

const startTrap = (battle, side, move, events) => {
  const volatileState = battle[side].volatile

  if (volatileState.trap) return

  volatileState.trap = {
    move: move.name,
    turns: randInt(battle.rng, TRAP_TURNS.min, TRAP_TURNS.max),
  }

  announce(
    events,
    side,
    'trap',
    `${label(battle, side)} ${VOLATILE_MESSAGES.trappedBy} ${move.name}!`,
  )
}

const startLeechSeed = (battle, side, move, events) => {
  const volatileState = battle[side].volatile

  if (volatileState.leechSeed) return

  if (isImmuneToAilment(battle[side].mon, 'leech-seed')) {
    say(events, TURN_MESSAGES.failed)
    return
  }

  volatileState.leechSeed = true

  announce(
    events,
    side,
    'leech-seed',
    `${label(battle, side)} ${VOLATILE_MESSAGES.seeded}`,
  )
}

const startDisable = (battle, side, move, events) => {
  const volatileState = battle[side].volatile
  const mon = battle[side].mon

  if (volatileState.disable) return

  const choices = mon.moves
    .map((slot, index) => (slot.pp > 0 ? index : null))
    .filter((index) => index !== null)

  if (!choices.length) {
    say(events, TURN_MESSAGES.failed)
    return
  }

  const index = pick(battle.rng, choices)

  volatileState.disable = {
    index,
    turn: battle.turn,
    turns: randInt(battle.rng, DISABLE_TURNS.min, DISABLE_TURNS.max),
  }

  announce(
    events,
    side,
    'disable',
    `${label(battle, side)}'s ${moveNameOf(mon, index)} ${VOLATILE_MESSAGES.wasDisabled}`,
  )
}

const VOLATILE_STARTERS = {
  confusion: startConfusion,
  trap: startTrap,
  'leech-seed': startLeechSeed,
  disable: startDisable,
}

export const isVolatileAilment = (ailment) => ailment in VOLATILE_STARTERS

export const applyVolatileAilment = (battle, side, move, events) => {
  VOLATILE_STARTERS[move.ailment](battle, side, move, events)
}

export const applyFlinch = (battle, side, move) => {
  if (!move.flinchChance) return
  if (!chance(battle.rng, move.flinchChance / 100)) return

  battle[side].volatile.flinchTurn = battle.turn
}

export const isMoveDisabled = (actor, index) => {
  return actor.volatile.disable?.index === index
}

export const isTrapped = (actor) => actor.volatile.trap != null

const confusionDamage = (mon) => {
  return baseDamage({
    level: levelOf(mon),
    power: CONFUSION_SELF_HIT_POWER,
    attack: mon.stats.attack,
    defense: mon.stats.defense,
  })
}

const blockedByConfusion = (battle, side, events) => {
  const volatileState = battle[side].volatile

  if (volatileState.confusion <= 0) return false
  if (volatileState.confusionTurn === battle.turn) return false

  volatileState.confusion--

  say(events, `${label(battle, side)} ${VOLATILE_MESSAGES.stillConfused}`)

  const hitsItself = chance(battle.rng, CONFUSION_SELF_HIT_CHANCE)

  if (hitsItself) {
    applyDamage(battle, side, confusionDamage(battle[side].mon), events)
    say(events, VOLATILE_MESSAGES.hurtItself)
  }

  if (volatileState.confusion <= 0)
    say(events, `${label(battle, side)} ${VOLATILE_MESSAGES.snappedOut}`)

  return hitsItself
}

export const blockedByVolatile = (battle, side, events) => {
  if (battle[side].volatile.flinchTurn === battle.turn) {
    say(events, `${label(battle, side)} ${VOLATILE_MESSAGES.flinched}`)

    return true
  }

  return blockedByConfusion(battle, side, events)
}

const tickTrap = (battle, side, events) => {
  const volatileState = battle[side].volatile
  const trap = volatileState.trap

  if (!trap) return

  if (trap.turns <= 0) {
    volatileState.trap = null

    say(
      events,
      `${label(battle, side)} ${VOLATILE_MESSAGES.freedFrom} ${trap.move}!`,
    )

    return
  }

  trap.turns--

  applyDamage(battle, side, hpFraction(battle[side].mon, TRAP_FRACTION), events)
  say(
    events,
    `${label(battle, side)} ${VOLATILE_MESSAGES.hurtBy} ${trap.move}!`,
  )
}

const drainLeechSeed = (battle, side, events) => {
  if (!battle[side].volatile.leechSeed) return

  const sapped = applyDamage(
    battle,
    side,
    hpFraction(battle[side].mon, LEECH_SEED_FRACTION),
    events,
  )

  say(events, `${label(battle, side)}${VOLATILE_MESSAGES.sapped}`)

  applyHeal(battle, other(side), sapped, events)
}

const tickDisable = (battle, side, events) => {
  const volatileState = battle[side].volatile
  const disable = volatileState.disable

  if (!disable) return
  if (disable.turn === battle.turn) return

  disable.turns--

  if (disable.turns > 0) return

  const name = moveNameOf(battle[side].mon, disable.index)

  volatileState.disable = null

  say(
    events,
    `${label(battle, side)}'s ${name} ${VOLATILE_MESSAGES.noLongerDisabled}`,
  )
}

const END_OF_TURN_TICKS = [tickTrap, drainLeechSeed, tickDisable]

export const endOfTurnVolatile = (battle, side, events) => {
  for (const tick of END_OF_TURN_TICKS) {
    if (isFainted(battle[side].mon)) return

    tick(battle, side, events)
  }
}
