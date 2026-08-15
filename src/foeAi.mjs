import { effectiveSpeed, moveSlotOf } from './battleActor.mjs'
import {
  FOE_AI_SCORES,
  FOE_AI_SELF_KO_HP_RATIO,
  SELF_KO_MOVES,
} from './constants.mjs'
import { move as moveData, species } from './data.mjs'
import { chance } from './rng.mjs'
import { effectiveness } from './typechart.mjs'
import { isMoveDisabled } from './volatile.mjs'

const wastesSelfKo = (mon, key) => {
  if (!SELF_KO_MOVES.has(key)) return false

  return mon.hp > mon.stats.hp * FOE_AI_SELF_KO_HP_RATIO
}

const scoreFoeMove = (slot, mon, playerTypes) => {
  const move = moveData(slot.move)

  if (wastesSelfKo(mon, slot.move)) return FOE_AI_SCORES.selfKo
  if (move.damageClass === 'status') return FOE_AI_SCORES.status

  const power = move.power ?? FOE_AI_SCORES.defaultPower
  const accuracy = move.accuracy ?? 100

  return (power * effectiveness(move.type, playerTypes) * accuracy) / 100
}

export const pickFoeMove = (battle) => {
  const playerTypes = species(battle.player.mon.species).types
  const mon = battle.foe.mon

  let bestIndex = 0
  let bestScore = -1

  mon.moves.forEach((slot, index) => {
    if (slot.pp <= 0) return
    if (isMoveDisabled(battle.foe, index)) return

    const score = scoreFoeMove(slot, mon, playerTypes)

    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  return bestIndex
}

export const decideOrder = (battle, playerMoveIndex, foeMoveIndex) => {
  const playerSlot = moveSlotOf(battle.player, playerMoveIndex)
  const foeSlot = moveSlotOf(battle.foe, foeMoveIndex)

  const playerPriority = playerSlot ? moveData(playerSlot.move).priority : 0
  const foePriority = foeSlot ? moveData(foeSlot.move).priority : 0

  if (playerPriority !== foePriority) return playerPriority > foePriority

  const playerSpeed = effectiveSpeed(battle.player)
  const foeSpeed = effectiveSpeed(battle.foe)

  if (playerSpeed !== foeSpeed) return playerSpeed > foeSpeed

  return chance(battle.rng, 0.5)
}
