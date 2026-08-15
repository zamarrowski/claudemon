import { HEARTBEAT_STALE_MS } from './constants.mjs'
import { displayName, levelOf } from '../pokemon.mjs'
import { activePokemon, totalBalls } from '../state.mjs'
import {
  transformRequestWriteStatus,
  transformResponseStatus,
} from '../transformers.mjs'
import { readJson, writeJson } from './files.mjs'
import { STATUS_FILE } from './paths.mjs'

export const readStatus = () => transformResponseStatus(readJson(STATUS_FILE))

export const writeStatus = ({ lead, balls, money, caught }) => {
  try {
    writeJson(
      STATUS_FILE,
      transformRequestWriteStatus({
        lead,
        balls,
        money,
        caught,
        heartbeat: Date.now(),
      }),
    )
  } catch {}
}

const getLead = (save) => {
  if (!save.party.length) return null

  return activePokemon(save) ?? save.party[0]
}

const describeLead = (lead) => {
  if (!lead) return null

  return { name: displayName(lead), level: levelOf(lead) }
}

export const publishStatus = (save) => {
  writeStatus({
    lead: describeLead(getLead(save)),
    balls: totalBalls(save),
    money: save.money,
    caught: save.dex.caught.length,
  })
}

export const companionIsLive = (status) => {
  if (!status?.heartbeat) return false

  return Date.now() - status.heartbeat < HEARTBEAT_STALE_MS
}
