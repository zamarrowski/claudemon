import { label, say } from './battleEvents.mjs'
import { CHARGE_MOVES, RECHARGE_MOVES, TURN_MESSAGES } from './constants.mjs'
import { move as moveData } from './data.mjs'

export const isLocked = (actor) => actor.volatile.locked != null

export const lockedMoveIndex = (actor) => actor.volatile.locked.index

export const cancelLock = (actor) => {
  actor.volatile.locked = null
}

export const blockedByRecharge = (battle, side, events) => {
  const actor = battle[side]

  if (actor.volatile.locked?.kind !== 'recharge') return false

  cancelLock(actor)

  say(events, `${label(battle, side)} ${TURN_MESSAGES.mustRecharge}`)

  return true
}

export const takeChargedMove = (actor) => {
  const locked = actor.volatile.locked

  if (locked?.kind !== 'charge') return null

  cancelLock(actor)

  return { ...moveData(locked.key), key: locked.key, charged: true }
}

export const beginCharge = (battle, side, move, moveIndex, events) => {
  const message = CHARGE_MOVES[move.key]

  if (move.charged) return false
  if (!message) return false

  battle[side].volatile.locked = {
    kind: 'charge',
    key: move.key,
    index: moveIndex,
  }

  say(events, `${label(battle, side)} ${message}`)

  return true
}

export const beginRecharge = (actor, move, moveIndex) => {
  if (!RECHARGE_MOVES.has(move.key)) return

  actor.volatile.locked = {
    kind: 'recharge',
    key: move.key,
    index: moveIndex,
  }
}
