import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const HOME = process.env.CLAUDEMON_HOME || join(homedir(), '.claudemon')

export const DATA_DIR = join(HOME, 'data')
export const SPRITES_DIR = join(DATA_DIR, 'sprites')
export const TRAINER_SPRITES_DIR = join(SPRITES_DIR, 'trainers')

export const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export const BUNDLED_DATA_DIR = join(APP_DIR, 'data')

export const BUNDLED_ASSETS_DIR = join(APP_DIR, 'assets')

export const WEB_DIR = join(APP_DIR, 'web')

export const ENGINE_DIR = join(APP_DIR, 'src')

export const SAVE_FILE = join(HOME, 'save.json')

export const QUEUE_FILE = join(HOME, 'queue.jsonl')

export const STATUS_FILE = join(HOME, 'status.json')

export const WORKED_FILE = join(HOME, 'worked.json')

export const CARD_FILE = join(HOME, 'card.png')

export const TRADE_FILE = join(HOME, 'trade.txt')

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

export const shinySpriteFile = (side, id, ext) => {
  return join(SPRITES_DIR, side, 'shiny', `${id}.${ext}`)
}

export const eggSpriteFile = () => spriteFile('front', 'egg', 'png')

export const monSpriteFile = (side, id, shiny) => {
  if (!shiny) return spriteFile(side, id, 'png')

  const rare = shinySpriteFile(side, id, 'png')

  if (existsSync(rare)) return rare

  return spriteFile(side, id, 'png')
}

export const trainerSpriteFile = (name) => {
  return join(TRAINER_SPRITES_DIR, `${name}.png`)
}
