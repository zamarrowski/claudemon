import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { SAVE_VERSION } from '../constants.mjs'
import { recordAchievements } from '../achievements.mjs'
import { allPokemon } from '../helpers.mjs'
import { refreshStats } from '../pokemon.mjs'
import { isSaveShaped, recordInDex } from '../state.mjs'
import {
  transformRequestSaveGame,
  transformResponseSave,
} from '../transformers.mjs'
import { HOME, SAVE_FILE } from './paths.mjs'
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

const readSaveFile = () => {
  try {
    return JSON.parse(readFileSync(SAVE_FILE, 'utf8'))
  } catch {
    return null
  }
}

export const loadSave = () => {
  const save = transformResponseSave(readSaveFile())

  if (!isSaveShaped(save)) return null

  return migrate(save)
}

export const saveGame = (save) => {
  mkdirSync(HOME, { recursive: true })

  const tmp = `${SAVE_FILE}.${process.pid}.tmp`

  try {
    writeFileSync(tmp, JSON.stringify(transformRequestSaveGame(save)))
    renameSync(tmp, SAVE_FILE)
  } catch (error) {
    try {
      unlinkSync(tmp)
    } catch {}

    throw error
  }

  try {
    publishStatus(save)
  } catch {}

  return save
}
