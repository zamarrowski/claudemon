import { summariseActivity } from '../src/activity.mjs'
import { encounterTtlMs } from '../src/config.mjs'
import { loadConfig, saveConfig } from '../src/node/config.mjs'
import {
  clearEncounter,
  encounterExpiresAt,
  readEncounter,
} from '../src/node/queue.mjs'
import { loadSave, saveGame } from '../src/node/save.mjs'
import { readSessions } from '../src/node/sessions.mjs'
import { publishStatus } from '../src/node/status.mjs'
import { currentNotice } from '../src/node/update.mjs'
import { VERSION } from '../src/node/version.mjs'
import { readWorked } from '../src/node/worked.mjs'
import { recordPlayday } from '../src/state.mjs'
import { transformRequestBootstrap } from './transformers.mjs'

const withExpiry = (encounter, config) => {
  if (!encounter) return null

  return {
    ...encounter,
    expiresAt: encounterExpiresAt(encounter, encounterTtlMs(config)),
  }
}

export const createGame = () => {
  let save = loadSave()
  let config = loadConfig()

  const readActivity = () => summariseActivity(readSessions())

  const readCurrentEncounter = () => {
    return withExpiry(readEncounter(encounterTtlMs(config)), config)
  }

  const snapshot = () => {
    return transformRequestBootstrap({
      version: VERSION,
      save,
      config,
      activity: readActivity(),
      encounter: readCurrentEncounter(),
      worked: readWorked(),
      notice: currentNotice(),
    })
  }

  const persist = (next) => {
    save = next

    saveGame(save)

    return save
  }

  const applyConfig = (patch) => {
    config = saveConfig(patch)

    return config
  }

  const heartbeat = () => {
    if (!save) return false

    if (recordPlayday(save)) {
      persist(save)

      return true
    }

    publishStatus(save)

    return false
  }

  return {
    snapshot,
    persist,
    applyConfig,
    heartbeat,
    clearEncounter,
    readActivity,
    readCurrentEncounter,
    currentSave: () => save,
    currentConfig: () => config,
  }
}
