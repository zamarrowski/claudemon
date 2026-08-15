import { STAT_NAMES, TRADE_ID_RADIX, TRADE_MESSAGES } from './constants.mjs'
import { hasMove, hasSpecies, move as moveData } from './data.mjs'
import { canSpare, pokemonList } from './helpers.mjs'
import { levelOf } from './pokemon.mjs'
import { randomSeed } from './rng.mjs'
import { recordInDex, stow } from './state.mjs'
import { statsAtLevel } from './stats.mjs'

export const newTradeId = () => {
  return `${randomSeed().toString(TRADE_ID_RADIX)}${randomSeed().toString(
    TRADE_ID_RADIX,
  )}`
}

const isReadableMon = (mon) => {
  if (!hasSpecies(mon.species)) return false
  if (!Number.isFinite(mon.exp)) return false
  if (!Number.isFinite(mon.hp)) return false
  if (!STAT_NAMES.every((stat) => Number.isInteger(mon.ivs?.[stat])))
    return false

  return mon.moves.every(
    (slot) => hasMove(slot.move) && Number.isInteger(slot.pp),
  )
}

export const isReadableTrade = (trade) => {
  if (!Number.isInteger(trade.v)) return false
  if (typeof trade.id !== 'string' || trade.id === '') return false
  if (typeof trade.from.name !== 'string') return false

  return isReadableMon(trade.mon)
}

export const giveAway = (save, source, index) => {
  if (!canSpare(save, source)) {
    return { ok: false, reason: TRADE_MESSAGES.lastOne }
  }

  const [mon] = pokemonList(save, source).splice(index, 1)

  return { ok: true, mon }
}

const arrivingMove = (slot) => {
  const maxPp = moveData(slot.move).pp

  return { move: slot.move, pp: Math.max(0, Math.min(maxPp, slot.pp)), maxPp }
}

const arrivingMon = (mon) => {
  const stats = statsAtLevel(mon.species, levelOf(mon), mon.ivs)

  return {
    species: mon.species,
    nickname: mon.nickname,
    exp: mon.exp,
    ivs: mon.ivs,
    stats,
    hp: Math.max(0, Math.min(stats.hp, Math.round(mon.hp))),
    moves: mon.moves.map(arrivingMove),
    status: mon.status,
    statusTurns: mon.statusTurns,
    shiny: mon.shiny,
  }
}

const isOwnGame = (save, trade) => {
  return (
    trade.from.name === save.trainer.name &&
    trade.from.at === save.trainer.startedAt
  )
}

export const takeIn = (save, trade) => {
  if (isOwnGame(save, trade)) {
    return { ok: false, reason: TRADE_MESSAGES.ownGame }
  }

  if (save.trades.received.includes(trade.id)) {
    return { ok: false, reason: TRADE_MESSAGES.alreadyTaken }
  }

  const mon = arrivingMon(trade.mon)
  const where = stow(save, mon)

  save.trades.received.push(trade.id)
  recordInDex(save, mon)

  return { ok: true, mon, where }
}
