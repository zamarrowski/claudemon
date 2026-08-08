import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const HOME = process.env.CLAUDEMON_HOME || join(homedir(), '.claudemon')

export const DATA_DIR = join(HOME, 'data')
export const SPRITES_DIR = join(DATA_DIR, 'sprites')
export const TRAINER_SPRITES_DIR = join(SPRITES_DIR, 'trainers')

export const BUNDLED_DATA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
)

export const BUNDLED_ASSETS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'assets',
)

export const SAVE_FILE = join(HOME, 'save.json')

export const QUEUE_FILE = join(HOME, 'queue.jsonl')

export const STATUS_FILE = join(HOME, 'status.json')

export const WORKED_FILE = join(HOME, 'worked.json')

export const CARD_FILE = join(HOME, 'card.png')

export const SESSIONS_DIR = join(HOME, 'sessions')

export const CONFIG_FILE = join(HOME, 'config.json')

export const UPDATE_FILE = join(HOME, 'update.json')

export const LOG_FILE = join(HOME, 'claudemon.log')

export const SOUNDS_DIR = join(HOME, 'sounds')

export const PLUGIN_CACHE = join(
  homedir(),
  '.claude',
  'plugins',
  'cache',
  'claudemon',
  'claudemon',
)

export const dataFile = (name) => {
  const local = join(DATA_DIR, name)

  if (existsSync(local)) return local

  return join(BUNDLED_DATA_DIR, name)
}

export const bundledDataFile = (name) => join(BUNDLED_DATA_DIR, name)

export const assetFile = (name) => join(BUNDLED_ASSETS_DIR, name)

export const sessionFile = (id) => {
  return join(
    SESSIONS_DIR,
    `${String(id)
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .slice(0, 64)}.json`,
  )
}

export const spriteFile = (side, id, ext) => {
  return join(SPRITES_DIR, side, `${id}.${ext}`)
}

export const trainerSpriteFile = (name) => {
  return join(TRAINER_SPRITES_DIR, `${name}.png`)
}
