import {
  BATTLE_MESSAGES,
  DAYCARE_MESSAGES,
  TRADE_MESSAGES,
} from './constants.mjs'
import { displayName } from './pokemon.mjs'

export const arrivalWording = (where) => {
  if (where === 'box') return BATTLE_MESSAGES.wentToBox

  return BATTLE_MESSAGES.joinedTeam
}

export const arrivalMessage = (taken, trade) => {
  const name = displayName(taken.mon).toUpperCase()
  const from = trade.from.name.toUpperCase()

  return `${name} ${TRADE_MESSAGES.arrivedFrom} ${from}. ${arrivalWording(taken.where)}`
}

export const hatchLines = (mon, where) => {
  const opening = `${displayName(mon).toUpperCase()} ${DAYCARE_MESSAGES.hatched}`

  if (!mon.shiny) return [opening, arrivalWording(where)]

  return [`${opening} ${BATTLE_MESSAGES.shiny}`, arrivalWording(where)]
}
