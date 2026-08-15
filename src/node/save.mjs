import { SAVE_VERSION } from '../constants.mjs'
import { recordAchievements } from '../achievements.mjs'
import { allPokemon } from '../helpers.mjs'
import { refreshStats } from '../pokemon.mjs'
import { isSaveShaped, recordInDex } from '../state.mjs'
import {
  transformRequestSaveGame,
  transformResponseSave,
} from '../transformers.mjs'
import { readJson, writeJson } from './files.mjs'
import { SAVE_FILE } from './paths.mjs'
import { publishStatus } from './status.mjs'
import { readWorked } from './worked.mjs'

const migrate = (save) => {
  for (const mon of allPokemon(save)) {
    recordInDex(save, mon)
    refreshStats(mon)
  }

  recordAchievements(save, readWorked())

  save.version = SAVE_VERSION

  return save
}

export const loadSave = () => {
  const save = transformResponseSave(readJson(SAVE_FILE))

  if (!isSaveShaped(save)) return null

  return migrate(save)
}

export const saveGame = (save) => {
  writeJson(SAVE_FILE, transformRequestSaveGame(save))

  try {
    publishStatus(save)
  } catch {}

  return save
}
