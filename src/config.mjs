import { DEFAULT_CONFIG } from './constants.mjs'

export const withDefaults = (stored) => {
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
    wrappedStatusLine:
      stored.wrappedStatusLine ?? DEFAULT_CONFIG.wrappedStatusLine,
    probeRows: stored.probeRows ?? DEFAULT_CONFIG.probeRows,
  }
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
