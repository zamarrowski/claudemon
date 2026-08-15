const mapMoveSlot = (slot) => {
  return {
    move: slot.move,
    pp: slot.pp,
    maxPp: slot.maxPp,
  }
}

const mapPokemon = (mon) => {
  return {
    species: mon.species,
    nickname: mon.nickname,
    exp: mon.exp,
    ivs: mon.ivs,
    stats: mon.stats,
    hp: mon.hp,
    moves: mon.moves ? mon.moves.map(mapMoveSlot) : [],
    status: mon.status,
    statusTurns: mon.statusTurns,
    shiny: mon.shiny ?? false,
  }
}

const mapDex = (dex) => {
  return {
    seen: dex?.seen ?? [],
    caught: dex?.caught ?? [],
    shiny: dex?.shiny ?? [],
    faced: dex?.faced ?? {},
  }
}

const mapStats = (stats) => {
  return {
    battles: stats?.battles ?? 0,
    wins: stats?.wins ?? 0,
    losses: stats?.losses ?? 0,
    caught: stats?.caught ?? 0,
    runs: stats?.runs ?? 0,
    streak: stats?.streak ?? 0,
    lastPlayedAt: stats?.lastPlayedAt ?? null,
  }
}

const mapAchievement = (achievement) => {
  return {
    id: achievement.id,
    earnedAt: achievement.earnedAt,
  }
}

const mapTrades = (trades) => {
  return {
    received: trades?.received ?? [],
  }
}

const mapEgg = (egg) => {
  if (!egg) return null

  return {
    species: egg.species,
    steps: egg.steps,
    shiny: egg.shiny ?? false,
  }
}

const mapDaycare = (daycare) => {
  return {
    slots: daycare?.slots ? daycare.slots.map(mapPokemon) : [],
    egg: mapEgg(daycare?.egg),
  }
}

const mapSave = (save) => {
  return {
    version: save.version,
    trainer: save.trainer,
    party: save.party ? save.party.map(mapPokemon) : [],
    box: save.box ? save.box.map(mapPokemon) : [],
    daycare: mapDaycare(save.daycare),
    bag: save.bag ?? {},
    money: save.money ?? 0,
    badges: save.badges ?? [],
    dex: mapDex(save.dex),
    stats: mapStats(save.stats),
    achievements: save.achievements
      ? save.achievements.map(mapAchievement)
      : [],
    trades: mapTrades(save.trades),
  }
}

export const transformResponseSave = (save) => {
  if (!save) return null

  return mapSave(save)
}

export const transformRequestSaveGame = (save) => mapSave(save)

const mapStatusLead = (lead) => {
  if (!lead) return null

  return {
    name: lead.name,
    level: lead.level,
  }
}

const mapStatus = (status) => {
  return {
    lead: mapStatusLead(status.lead),
    balls: status.balls,
    money: status.money,
    caught: status.caught,
    heartbeat: status.heartbeat,
  }
}

export const transformResponseStatus = (status) => {
  if (!status) return null

  return mapStatus(status)
}

export const transformRequestWriteStatus = (status) => mapStatus(status)

const mapWorked = (worked) => {
  return {
    totalMs: worked.totalMs ?? 0,
    updatedAt: worked.updatedAt ?? null,
  }
}

export const transformResponseWorked = (worked) => {
  if (!worked) return null

  return mapWorked(worked)
}

export const transformRequestWriteWorked = (worked) => mapWorked(worked)

const mapActivity = (entry) => {
  return {
    v: entry.v,
    session: entry.session,
    cwd: entry.cwd,
    at: entry.at,
    state: entry.state,
    tool: entry.tool,
    since: entry.since,
    lastStepAt: entry.lastStepAt,
    pendingSteps: entry.pendingSteps,
    message: entry.message,
  }
}

export const transformResponseActivity = (entry) => {
  if (!entry) return null

  return mapActivity(entry)
}

export const transformRequestWriteActivity = (entry) => mapActivity(entry)

const mapConfig = (config) => {
  return {
    encounterChance: config.encounterChance,
    trainerChance: config.trainerChance,
    charsPerStep: config.charsPerStep,
    maxSteps: config.maxSteps,
    workStepSeconds: config.workStepSeconds,
    sound: config.sound,
    bell: config.bell,
    updateCheck: config.updateCheck,
    encounterTtlSeconds: config.encounterTtlSeconds,
    wrappedStatusLine: config.wrappedStatusLine,
    probeRows: config.probeRows,
  }
}

export const transformResponseConfig = (config) => {
  if (!config) return null

  return mapConfig(config)
}

export const transformRequestWriteConfig = (config) => mapConfig(config)

const mapTrainerMon = (mon) => {
  return {
    species: mon.species,
    name: mon.name,
    level: mon.level,
  }
}

const mapTrainer = (trainer) => {
  if (!trainer) return { class: null, name: null, sprite: null, team: [] }

  return {
    class: trainer.class,
    name: trainer.name,
    sprite: trainer.sprite,
    team: trainer.team ? trainer.team.map(mapTrainerMon) : [],
  }
}

const mapTrainerEncounter = (entry) => {
  return {
    v: entry.v,
    kind: 'trainer',
    trainer: mapTrainer(entry.trainer),
    seed: entry.seed,
    session: entry.session,
    at: entry.at,
  }
}

const mapWildEncounter = (entry) => {
  return {
    v: entry.v,
    kind: 'wild',
    species: entry.species,
    name: entry.name,
    level: entry.level,
    seed: entry.seed,
    shiny: entry.shiny ?? false,
    session: entry.session,
    at: entry.at,
  }
}

const mapEncounter = (entry) => {
  if (entry.kind === 'trainer') return mapTrainerEncounter(entry)

  return mapWildEncounter(entry)
}

export const transformResponseEncounter = (entry) => {
  if (!entry) return null

  return mapEncounter(entry)
}

export const transformRequestWriteEncounter = (entry) => mapEncounter(entry)

export const transformResponseManifest = (manifest) => {
  if (!manifest) return null

  return {
    version: manifest.version,
  }
}

const mapUpdateState = (state) => {
  return {
    checkedAt: state.checkedAt,
    latest: state.latest,
    error: state.error,
  }
}

export const transformResponseUpdateState = (state) => {
  if (!state) return null

  return mapUpdateState(state)
}

export const transformRequestWriteUpdateState = (state) => mapUpdateState(state)

const mapUpdateStep = (step) => {
  return {
    id: step.id,
    label: step.label,
    done: step.done,
    status: step.status,
    detail: step.detail,
  }
}

export const transformResponseUpdateRun = (run) => {
  if (!run) return null

  return {
    kind: run.kind,
    state: run.state,
    from: run.from,
    to: run.to,
    steps: run.steps.map(mapUpdateStep),
  }
}

const mapTradeMon = (mon) => {
  return {
    species: mon.species,
    nickname: mon.nickname,
    exp: mon.exp,
    ivs: mon.ivs,
    hp: mon.hp,
    moves: mon.moves.map(mapMoveSlot),
    status: mon.status,
    statusTurns: mon.statusTurns,
    shiny: mon.shiny ?? false,
  }
}

const mapTradeOrigin = (from) => {
  return {
    name: from.name,
    at: from.at,
  }
}

const mapTrade = (trade) => {
  return {
    v: trade.v,
    id: trade.id,
    mon: mapTradeMon(trade.mon),
    from: mapTradeOrigin(trade.from),
  }
}

export const transformResponseTrade = (trade) => {
  if (!trade) return null

  return mapTrade(trade)
}

export const transformRequestTrade = (trade) => mapTrade(trade)
