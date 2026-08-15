import { EMPTY_WORKED, UNKNOWN_ACTIVITY } from '../../src/constants.mjs'

const mapActivity = (activity) => {
  if (!activity) return { ...UNKNOWN_ACTIVITY }

  return {
    state: activity.state,
    tool: activity.tool,
    since: activity.since,
    sessions: activity.sessions,
  }
}

const mapTrainer = (trainer) => {
  return {
    class: trainer.class,
    name: trainer.name,
    sprite: trainer.sprite,
    team: trainer.team,
  }
}

export const transformResponseEncounter = (encounter) => {
  if (!encounter) return null

  return {
    kind: encounter.kind,
    species: encounter.species,
    name: encounter.name,
    level: encounter.level,
    trainer: encounter.trainer ? mapTrainer(encounter.trainer) : null,
    seed: encounter.seed,
    shiny: encounter.shiny,
    at: encounter.at,
    expiresAt: encounter.expiresAt,
  }
}

export const transformResponseActivity = (activity) => mapActivity(activity)

export const transformResponseWorked = (worked) => {
  if (!worked) return { ...EMPTY_WORKED }

  return { totalMs: worked.totalMs, updatedAt: worked.updatedAt }
}

export const transformResponseNotice = (notice) => {
  if (!notice) return null

  return { kind: notice.kind, version: notice.version }
}

export const transformResponseBootstrap = (payload) => {
  return {
    version: payload.version,
    save: payload.save,
    config: payload.config,
    activity: mapActivity(payload.activity),
    encounter: transformResponseEncounter(payload.encounter),
    worked: transformResponseWorked(payload.worked),
    notice: transformResponseNotice(payload.notice),
  }
}

export const transformResponseTradeRead = (payload) => {
  if (!payload.ok) return { ok: false, reason: payload.reason }

  return { ok: true, trade: payload.trade }
}

export const transformRequestGift = (mon, trainer) => {
  return {
    mon,
    trainer: { name: trainer.name, startedAt: trainer.startedAt },
  }
}
