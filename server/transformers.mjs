export const transformRequestActivity = (activity) => {
  return {
    state: activity.state,
    tool: activity.tool,
    since: activity.since,
    sessions: activity.sessions,
  }
}

const mapTrainerEncounter = (trainer) => {
  return {
    class: trainer.class,
    name: trainer.name,
    sprite: trainer.sprite,
    team: trainer.team,
  }
}

export const transformRequestEncounter = (encounter) => {
  if (!encounter) return null

  return {
    kind: encounter.kind,
    species: encounter.species,
    name: encounter.name,
    level: encounter.level,
    trainer: encounter.trainer ? mapTrainerEncounter(encounter.trainer) : null,
    seed: encounter.seed,
    shiny: encounter.shiny,
    at: encounter.at,
    expiresAt: encounter.expiresAt,
  }
}

const mapNotice = (notice) => {
  if (!notice) return null

  return { kind: notice.kind, version: notice.version }
}

const mapWorked = (worked) => {
  return { totalMs: worked.totalMs, updatedAt: worked.updatedAt }
}

export const transformRequestBootstrap = ({
  version,
  save,
  config,
  activity,
  encounter,
  worked,
  notice,
}) => {
  return {
    version,
    save,
    config,
    activity: transformRequestActivity(activity),
    encounter: transformRequestEncounter(encounter),
    worked: mapWorked(worked),
    notice: mapNotice(notice),
  }
}

export const transformRequestUpdateRun = (run) => {
  if (!run) return null

  return {
    kind: run.kind,
    state: run.state,
    from: run.from,
    to: run.to,
    steps: run.steps.map((step) => ({
      id: step.id,
      label: step.label,
      done: step.done,
      status: step.status,
      detail: step.detail,
    })),
  }
}

export const transformResponseTradeText = (body) => {
  if (typeof body?.text !== 'string') return null

  return { text: body.text }
}

export const transformResponseGift = (body) => {
  if (!body?.mon || !body?.trainer) return null

  return {
    mon: body.mon,
    trainer: { name: body.trainer.name, startedAt: body.trainer.startedAt },
  }
}
