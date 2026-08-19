import {
  STAR_ANSWERS,
  STAR_ASK_COOLDOWN_MS,
  STAR_ASK_LIMIT,
  STAR_ASK_MIN_BADGES,
  STAR_ASK_MIN_CAUGHT,
} from './constants.mjs'

export const starAskAllowed = (config) => !config.starPrompt.answered

export const hasEarnedTheAsk = (save) => {
  return (
    save.badges.length >= STAR_ASK_MIN_BADGES ||
    save.dex.caught.length >= STAR_ASK_MIN_CAUGHT
  )
}

const pastCooldown = (askedAt, now) => {
  const last = Date.parse(askedAt)

  if (!Number.isFinite(last)) return true
  if (last > now) return true

  return now - last >= STAR_ASK_COOLDOWN_MS
}

export const starAskDue = ({ save, config, now = Date.now() }) => {
  const { askedAt, asks } = config.starPrompt

  if (!starAskAllowed(config)) return false
  if (asks >= STAR_ASK_LIMIT) return false
  if (!hasEarnedTheAsk(save)) return false

  return pastCooldown(askedAt, now)
}

export const starAnswer = (config, answered, now = Date.now()) => {
  return {
    starPrompt: {
      askedAt: new Date(now).toISOString(),
      asks: config.starPrompt.asks + 1,
      answered,
    },
  }
}

export const starAskPatch = (config, allowed) => {
  return {
    starPrompt: {
      askedAt: config.starPrompt.askedAt,
      asks: config.starPrompt.asks,
      answered: allowed ? null : STAR_ANSWERS.never,
    },
  }
}
