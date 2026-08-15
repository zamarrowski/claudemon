import {
  BALLS,
  CATCH_COMPLAINTS,
  CRIT_CHANCE,
  EFFECTIVENESS_MESSAGES,
  HIGH_CRIT_CHANCE,
  OHKO_MOVES,
  PARALYSIS_SKIP_CHANCE,
  POISON_FRACTIONS,
  RUN_ODDS,
  SELF_KO_MOVES,
  SLEEP_TURNS,
  SLEEP_WAKE_CHANCE,
  STAGE_LIMIT,
  STAT_LABELS,
  STATUS_LABELS,
  STRUGGLE,
  STRUGGLE_RECOIL_FRACTION,
  THAW_CHANCE,
  TRAINER_MESSAGES,
  TRAINER_REFUSALS,
  TURN_MESSAGES,
  UNSUPPORTED_MOVES,
} from './constants.mjs'
import { move as moveData, species } from './data.mjs'
import { effectiveSpeed, moveSlotOf, stageMultiplier } from './battleActor.mjs'
import { applyDamage, applyHeal, label, other, say } from './battleEvents.mjs'
import { attemptCatch } from './capture.mjs'
import { computeDamage, FIXED_DAMAGE } from './damage.mjs'
import {
  expFromDefeating,
  expFromTrainerMon,
  moneyFromDefeating,
} from './exp.mjs'
import { decideOrder, pickFoeMove } from './foeAi.mjs'
import {
  displayName,
  hpFraction,
  isFainted,
  isImmuneToAilment,
  levelOf,
} from './pokemon.mjs'
import { chance, makeRng, randInt } from './rng.mjs'
import { sentOutLine, trainerLabel, trainerPrize } from './trainer.mjs'
import { effectiveness, effectivenessMessage } from './typechart.mjs'
import {
  applyFlinch,
  applyVolatileAilment,
  blockedByVolatile,
  emptyVolatile,
  endOfTurnVolatile,
  isMoveDisabled,
  isTrapped,
  isVolatileAilment,
  statusLandedThisTurn,
} from './volatile.mjs'

export const emptyStages = () => {
  return {
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    speed: 0,
    accuracy: 0,
    evasion: 0,
  }
}

export const createBattle = ({
  playerMon,
  wildMon,
  seed,
  participants = [],
  trainer = null,
}) => {
  return {
    seed,
    rng: makeRng(seed),
    turn: 0,
    player: {
      mon: playerMon,
      stages: emptyStages(),
      volatile: emptyVolatile(),
    },
    foe: { mon: wildMon, stages: emptyStages(), volatile: emptyVolatile() },
    trainer,
    participants: [...new Set([...participants, playerMon])],
    over: false,
    outcome: null,
    rewards: { exp: 0, money: 0 },
    runAttempts: 0,
  }
}

export const switchIn = (battle, mon) => {
  battle.player.mon = mon
  battle.player.stages = emptyStages()
  battle.player.volatile = emptyVolatile()

  if (!battle.participants.includes(mon)) battle.participants.push(mon)

  return battle
}

export const sendOutAfterFaint = (battle, mon) => {
  battle.seed = (battle.seed + battle.turn + 1) >>> 0
  battle.rng = makeRng(battle.seed)
  battle.runAttempts = 0
  battle.over = false
  battle.outcome = null

  return switchIn(battle, mon)
}

export const rehydrate = (battle) => {
  if (!battle.rng) battle.rng = makeRng(battle.seed)

  return battle
}

const hasUsableMove = (actor) => {
  return actor.mon.moves.some(
    (slot, index) => slot.pp > 0 && !isMoveDisabled(actor, index),
  )
}

const blockedBySleep = (battle, side, events) => {
  const mon = battle[side].mon
  const who = label(battle, side)

  if (statusLandedThisTurn(battle[side], battle.turn)) {
    say(events, `${who} ${TURN_MESSAGES.fastAsleep}`)

    return true
  }

  if (mon.statusTurns <= 0 || chance(battle.rng, SLEEP_WAKE_CHANCE)) {
    mon.status = null
    mon.statusTurns = 0

    say(events, `${who} ${TURN_MESSAGES.wokeUp}`)

    return false
  }

  mon.statusTurns--

  say(events, `${who} ${TURN_MESSAGES.fastAsleep}`)

  return true
}

const blockedByFreeze = (battle, side, events) => {
  const mon = battle[side].mon
  const who = label(battle, side)

  if (
    !statusLandedThisTurn(battle[side], battle.turn) &&
    chance(battle.rng, THAW_CHANCE)
  ) {
    mon.status = null

    say(events, `${who} ${TURN_MESSAGES.thawedOut}`)

    return false
  }

  say(events, `${who} ${TURN_MESSAGES.frozenSolid}`)

  return true
}

const blockedByStatus = (battle, side, events) => {
  const mon = battle[side].mon

  if (mon.status === 'sleep') return blockedBySleep(battle, side, events)
  if (mon.status === 'freeze') return blockedByFreeze(battle, side, events)

  if (mon.status === 'paralysis' && chance(battle.rng, PARALYSIS_SKIP_CHANCE)) {
    say(events, `${label(battle, side)} ${TURN_MESSAGES.fullyParalysed}`)

    return true
  }

  return false
}

const landsHit = (battle, attackerSide, move) => {
  if (move.accuracy === null) return true

  const attacker = battle[attackerSide]
  const defender = battle[other(attackerSide)]
  const modifier =
    stageMultiplier(attacker.stages.accuracy) /
    stageMultiplier(defender.stages.evasion)

  return battle.rng() * 100 < move.accuracy * modifier
}

const describeStatDelta = (delta) => {
  const sharply = Math.abs(delta) > 1

  if (delta < 0) return sharply ? 'sharply fell' : 'fell'

  return sharply ? 'rose sharply' : 'rose'
}

const applyStatChanges = (battle, attackerSide, move, events) => {
  for (const change of move.statChanges) {
    const side = change.change < 0 ? other(attackerSide) : attackerSide
    const actor = battle[side]
    const current = actor.stages[change.stat]
    const next = Math.max(
      -STAGE_LIMIT,
      Math.min(STAGE_LIMIT, current + change.change),
    )
    const who = label(battle, side)
    const statName = STAT_LABELS[change.stat] ?? change.stat

    if (next === current) {
      say(
        events,
        `${who}'s ${statName} won't go ${change.change < 0 ? 'lower' : 'higher'}!`,
      )
      continue
    }

    actor.stages[change.stat] = next

    events.push({ type: 'stat', side, stat: change.stat, delta: change.change })

    say(events, `${who}'s ${statName} ${describeStatDelta(change.change)}!`)
  }
}

const getAilmentRate = (move) => {
  if (move.damageClass === 'status') return move.ailmentChance || 100

  return move.ailmentChance || 0
}

const rollsAilment = (battle, move) => {
  const rate = getAilmentRate(move)

  if (rate <= 0) return false

  return chance(battle.rng, rate / 100)
}

const applyStatusAilment = (battle, defenderSide, move, events) => {
  const defender = battle[defenderSide]

  if (defender.mon.status) return
  if (!rollsAilment(battle, move)) return
  if (isImmuneToAilment(defender.mon, move.ailment)) return

  defender.mon.status = move.ailment
  defender.mon.statusTurns =
    move.ailment === 'sleep'
      ? randInt(battle.rng, SLEEP_TURNS.min, SLEEP_TURNS.max)
      : 0
  defender.volatile.statusTurn = battle.turn

  events.push({ type: 'status', side: defenderSide, status: move.ailment })

  say(events, `${label(battle, defenderSide)} ${STATUS_LABELS[move.ailment]}!`)
}

const applyAilment = (battle, attackerSide, move, events) => {
  if (!move.ailment) return

  const defenderSide = other(attackerSide)

  if (isVolatileAilment(move.ailment)) {
    if (!rollsAilment(battle, move)) return

    applyVolatileAilment(battle, defenderSide, move, events)

    return
  }

  if (!(move.ailment in STATUS_LABELS)) return

  applyStatusAilment(battle, defenderSide, move, events)
}

const doesNotAffect = (move, defenderTypes, events) => {
  if (effectiveness(move.type, defenderTypes) !== 0) return false

  say(events, EFFECTIVENESS_MESSAGES.immune)

  return true
}

const rollHitCount = (battle, move) => {
  if (!move.maxHits) return 1

  return randInt(battle.rng, move.minHits ?? move.maxHits, move.maxHits)
}

const applyRecoil = (battle, attackerSide, amount, events) => {
  applyDamage(battle, attackerSide, amount, events)
  say(events, `${label(battle, attackerSide)} ${TURN_MESSAGES.recoil}`)
}

const applyDrain = (battle, attackerSide, drain, total, events) => {
  const amount = Math.max(1, Math.floor((total * Math.abs(drain)) / 100))

  if (drain < 0) return applyRecoil(battle, attackerSide, amount, events)

  applyHeal(battle, attackerSide, amount, events)
  say(
    events,
    `${label(battle, other(attackerSide))} ${TURN_MESSAGES.energyDrained}`,
  )
}

const resolveMove = (battle, attackerSide, move, events) => {
  const attacker = battle[attackerSide]
  const defenderSide = other(attackerSide)

  if (UNSUPPORTED_MOVES.has(move.key)) {
    say(events, TURN_MESSAGES.failed)
    return
  }

  if (!landsHit(battle, attackerSide, move)) {
    say(events, `${label(battle, attackerSide)}'s attack missed!`)
    return
  }

  if (move.damageClass === 'status') {
    applyStatChanges(battle, attackerSide, move, events)
    applyAilment(battle, attackerSide, move, events)

    if (move.healing) {
      const healed = applyHeal(
        battle,
        attackerSide,
        Math.floor((attacker.mon.stats.hp * move.healing) / 100),
        events,
      )

      if (healed > 0)
        say(events, `${label(battle, attackerSide)} regained health!`)
    }

    return
  }

  const defenderTypes = species(battle[defenderSide].mon.species).types

  if (OHKO_MOVES.has(move.key)) {
    if (doesNotAffect(move, defenderTypes, events)) return

    applyDamage(battle, defenderSide, battle[defenderSide].mon.hp, events)
    say(events, TURN_MESSAGES.oneHitKo)

    return
  }

  if (FIXED_DAMAGE[move.key]) {
    if (doesNotAffect(move, defenderTypes, events)) return

    const amount = FIXED_DAMAGE[move.key]({
      attackerLevel: levelOf(attacker.mon),
      defender: battle[defenderSide].mon,
      rng: battle.rng,
    })

    applyDamage(battle, defenderSide, amount, events)

    return
  }

  const critChance = move.critRate > 0 ? HIGH_CRIT_CHANCE : CRIT_CHANCE
  const isCrit = chance(battle.rng, critChance)
  const { damage, multiplier } = computeDamage(
    battle,
    attackerSide,
    move,
    isCrit,
  )

  if (multiplier === 0) {
    say(events, EFFECTIVENESS_MESSAGES.immune)
    return
  }

  const hits = rollHitCount(battle, move)

  let total = 0

  for (let hit = 0; hit < hits; hit++) {
    if (isFainted(battle[defenderSide].mon)) break

    total += applyDamage(battle, defenderSide, damage, events)
  }

  if (isCrit) say(events, TURN_MESSAGES.criticalHit)

  const note = effectivenessMessage(multiplier)

  if (note) say(events, note)
  if (hits > 1) say(events, `Hit ${hits} times!`)

  if (move.drain && total > 0)
    applyDrain(battle, attackerSide, move.drain, total, events)

  if (move.key === STRUGGLE.move && total > 0)
    applyRecoil(
      battle,
      attackerSide,
      Math.max(1, Math.floor(total / STRUGGLE_RECOIL_FRACTION)),
      events,
    )

  if (!isFainted(battle[defenderSide].mon)) {
    applyAilment(battle, attackerSide, move, events)
    applyStatChanges(battle, attackerSide, move, events)
    applyFlinch(battle, defenderSide, move)
  }
}

const useMove = (battle, attackerSide, moveIndex, events) => {
  const attacker = battle[attackerSide]

  if (blockedByStatus(battle, attackerSide, events)) return
  if (blockedByVolatile(battle, attackerSide, events)) return

  const slot = moveSlotOf(attacker, moveIndex)
  const disabled = slot != null && isMoveDisabled(attacker, moveIndex)

  let move

  if (slot && !disabled) {
    move = { ...moveData(slot.move), key: slot.move }
    slot.pp--
  } else if (!hasUsableMove(attacker)) {
    move = { ...STRUGGLE.data, key: STRUGGLE.move }
  } else if (disabled) {
    const who = label(battle, attackerSide)

    say(
      events,
      `${who}'s ${moveData(slot.move).name} ${TURN_MESSAGES.disabled}`,
    )

    return
  } else {
    say(events, TURN_MESSAGES.noPp)
    return
  }

  say(events, `${label(battle, attackerSide)} used ${move.name}!`)

  resolveMove(battle, attackerSide, move, events)

  if (SELF_KO_MOVES.has(move.key))
    applyDamage(battle, attackerSide, attacker.mon.hp, events)
}

const endOfTurnDamage = (battle, side, events) => {
  const mon = battle[side].mon

  if (isFainted(mon)) return

  const fraction = POISON_FRACTIONS[mon.status]

  if (!fraction) return

  applyDamage(battle, side, hpFraction(mon, fraction), events)
  say(events, `${label(battle, side)} is hurt by its ${mon.status}!`)
}

const finish = (battle, outcome, events) => {
  battle.over = true
  battle.outcome = outcome

  events.push({ type: 'end', outcome })
}

const collectFoeExp = (battle) => {
  const foe = battle.foe.mon

  battle.rewards.exp += battle.trainer
    ? expFromTrainerMon(foe.species, levelOf(foe))
    : expFromDefeating(foe.species, levelOf(foe))
}

const awardVictory = (battle, events) => {
  if (battle.trainer) {
    battle.rewards.money += trainerPrize(battle.trainer)

    say(events, `${trainerLabel(battle.trainer)} ${TRAINER_MESSAGES.defeated}`)

    return
  }

  battle.rewards.money += moneyFromDefeating(
    levelOf(battle.foe.mon),
    battle.rng,
  )
}

const nextFoe = (battle) => {
  if (!battle.trainer) return null

  return battle.trainer.team.find((mon) => !isFainted(mon)) ?? null
}

const sendNextFoe = (battle, mon, events) => {
  battle.foe = { mon, stages: emptyStages(), volatile: emptyVolatile() }

  say(events, sentOutLine(battle.trainer, mon))
  events.push({ type: 'foe-out', mon, hpAfter: mon.hp })
}

const checkFaint = (battle, events) => {
  const fainted = ['foe', 'player'].filter((side) =>
    isFainted(battle[side].mon),
  )

  if (!fainted.length) return false

  for (const side of fainted) {
    events.push({ type: 'faint', side })
    say(events, `${label(battle, side)} fainted!`)
  }

  if (!fainted.includes('foe')) {
    finish(battle, 'loss', events)

    return true
  }

  collectFoeExp(battle)

  const next = nextFoe(battle)

  if (!next) {
    awardVictory(battle, events)
    finish(battle, 'win', events)

    return true
  }

  sendNextFoe(battle, next, events)

  if (fainted.includes('player')) finish(battle, 'loss', events)

  return true
}

const runOdds = (battle) => {
  const playerSpeed = effectiveSpeed(battle.player)
  const foeSpeed = effectiveSpeed(battle.foe)

  if (playerSpeed >= foeSpeed) return 1

  return Math.min(
    RUN_ODDS.max,
    (playerSpeed / foeSpeed) * RUN_ODDS.speedFactor +
      battle.runAttempts * RUN_ODDS.perAttempt,
  )
}

const attemptRun = (battle, events) => {
  if (isTrapped(battle.player)) {
    say(events, TURN_MESSAGES.cantEscape)

    return false
  }

  battle.runAttempts++

  if (!chance(battle.rng, runOdds(battle))) {
    say(events, TURN_MESSAGES.stuck)

    return false
  }

  say(events, TURN_MESSAGES.gotAway)
  finish(battle, 'fled', events)

  return true
}

const trainerRefusal = (battle, action) => {
  if (!battle.trainer) return null

  return TRAINER_REFUSALS[action.type] ?? null
}

export const submitAction = (battle, action) => {
  const events = []

  if (battle.over) return events

  const refused = trainerRefusal(battle, action)

  if (refused) {
    say(events, refused)

    return events
  }

  rehydrate(battle)
  battle.turn++

  if (action.type === 'ball') {
    const ball = BALLS[action.key]

    say(events, `You threw a ${ball.name}!`)

    const result = attemptCatch(battle.foe.mon, action.key, battle.rng)

    events.push({ type: 'catch', shakes: result.shakes, caught: result.caught })

    if (result.caught) {
      say(events, `Gotcha! ${displayName(battle.foe.mon)} was caught!`)
      finish(battle, 'caught', events)

      return events
    }

    say(events, CATCH_COMPLAINTS[result.shakes])
  } else if (action.type === 'run') {
    if (attemptRun(battle, events)) return events
  } else if (action.type === 'move') {
    const foeMoveIndex = pickFoeMove(battle)

    if (decideOrder(battle, action.index, foeMoveIndex)) {
      useMove(battle, 'player', action.index, events)

      if (checkFaint(battle, events)) return events

      useMove(battle, 'foe', foeMoveIndex, events)
    } else {
      useMove(battle, 'foe', foeMoveIndex, events)

      if (checkFaint(battle, events)) return events

      useMove(battle, 'player', action.index, events)
    }

    if (checkFaint(battle, events)) return events
  }

  if (action.type !== 'move') {
    useMove(battle, 'foe', pickFoeMove(battle), events)

    if (checkFaint(battle, events)) return events
  }

  for (const side of ['player', 'foe']) {
    endOfTurnDamage(battle, side, events)
    endOfTurnVolatile(battle, side, events)
  }

  checkFaint(battle, events)

  return events
}
