import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import {
  DEFAULT_CONFIG,
  DEFAULT_STAR_PROMPT,
  SPRITE_SCALE_MAX,
  SPRITE_SCALE_MIN,
} from './constants.mjs'
import { CONFIG_FILE, HOME } from './paths.mjs'
import {
  transformRequestWriteConfig,
  transformResponseConfig,
} from './transformers.mjs'

const readConfigFile = () => {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
  } catch {
    return null
  }
}

const withStored = (stored, patch) => {
  if (!stored) return patch

  return { ...stored, ...patch }
}

const withStarPrompt = (stored) => {
  return {
    askedAt: stored?.askedAt ?? DEFAULT_STAR_PROMPT.askedAt,
    asks: stored?.asks ?? DEFAULT_STAR_PROMPT.asks,
    answered: stored?.answered ?? DEFAULT_STAR_PROMPT.answered,
  }
}

const withDefaults = (stored) => {
  return {
    encounterChance: stored.encounterChance ?? DEFAULT_CONFIG.encounterChance,
    trainerChance: stored.trainerChance ?? DEFAULT_CONFIG.trainerChance,
    charsPerStep: stored.charsPerStep ?? DEFAULT_CONFIG.charsPerStep,
    maxSteps: stored.maxSteps ?? DEFAULT_CONFIG.maxSteps,
    workStepSeconds: stored.workStepSeconds ?? DEFAULT_CONFIG.workStepSeconds,
    sound: stored.sound ?? DEFAULT_CONFIG.sound,
    bell: stored.bell ?? DEFAULT_CONFIG.bell,
    updateCheck: stored.updateCheck ?? DEFAULT_CONFIG.updateCheck,
    encounterTtlSeconds:
      stored.encounterTtlSeconds ?? DEFAULT_CONFIG.encounterTtlSeconds,
    spriteScale: stored.spriteScale ?? DEFAULT_CONFIG.spriteScale,
    wrappedStatusLine:
      stored.wrappedStatusLine ?? DEFAULT_CONFIG.wrappedStatusLine,
    probeRows: stored.probeRows ?? DEFAULT_CONFIG.probeRows,
    starPrompt: withStarPrompt(stored.starPrompt),
  }
}

export const loadConfig = () => {
  const stored = transformResponseConfig(readConfigFile())

  if (!stored) return withDefaults(DEFAULT_CONFIG)

  return withDefaults(stored)
}

export const saveConfig = (patch) => {
  const merged = withStored(transformResponseConfig(readConfigFile()), patch)

  mkdirSync(HOME, { recursive: true })

  const tmp = `${CONFIG_FILE}.${process.pid}.tmp`
  const payload = JSON.stringify(transformRequestWriteConfig(merged), null, 2)

  try {
    writeFileSync(tmp, `${payload}\n`)
    renameSync(tmp, CONFIG_FILE)
  } catch (error) {
    try {
      unlinkSync(tmp)
    } catch {}

    throw error
  }

  return withDefaults(merged)
}

export const spriteScale = (config) => {
  const scale = Number(config.spriteScale)

  if (!Number.isFinite(scale)) return DEFAULT_CONFIG.spriteScale

  return Math.min(SPRITE_SCALE_MAX, Math.max(SPRITE_SCALE_MIN, scale))
}

export const updateCheckMode = (config = DEFAULT_CONFIG) => {
  const value = config.updateCheck

  if (value === false) return 'off'
  if (value === 'launch') return 'launch'

  return 'daily'
}

export const encounterTtlMs = (config) => {
  const seconds = Number(config.encounterTtlSeconds)

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return DEFAULT_CONFIG.encounterTtlSeconds * 1000
  }

  return seconds * 1000
}
