import {
  DAY_MS,
  EMPTY_STATS,
  PARTY_LIMIT,
  SAVE_VERSION,
  STARTER_CAUGHT_COUNT,
  STARTER_LEVEL,
  STARTING_BAG,
  STARTING_MONEY,
} from './constants.mjs'
import { allPokemon, pokemonList } from './helpers.mjs'
import { createPokemon, healFully, isFainted, rollShiny } from './pokemon.mjs'
import { countOfKind } from './shop.mjs'
import { advanceStreak } from './streak.mjs'

export const isSaveShaped = (save) => {
  if (typeof save?.trainer?.name !== 'string') return false
  if (!Array.isArray(save.party) || !Array.isArray(save.box)) return false

  return Boolean(save.dex && save.bag && save.stats)
}

export const recordPlayday = (save, now = Date.now()) => {
  const next = advanceStreak(save.stats, now)

  if (next.lastPlayedAt === save.stats.lastPlayedAt) return false

  save.stats.streak = next.streak
  save.stats.lastPlayedAt = next.lastPlayedAt

  return true
}

export const createSave = ({ trainer, starterId, rng }) => {
  const starter = createPokemon(starterId, STARTER_LEVEL, rng, rollShiny(rng))
  const save = {
    version: SAVE_VERSION,
    trainer: { name: trainer, startedAt: new Date().toISOString() },
    party: [starter],
    box: [],
    daycare: { slots: [], egg: null },
    bag: { ...STARTING_BAG },
    money: STARTING_MONEY,
    badges: [],
    dex: {
      seen: [starterId],
      caught: [starterId],
      shiny: starter.shiny ? [starterId] : [],
      faced: {},
    },
    stats: { ...EMPTY_STATS, caught: STARTER_CAUGHT_COUNT },
    achievements: [],
    trades: { received: [] },
  }

  recordPlayday(save)

  return save
}

export const daysOnTheRoad = (save, now = Date.now()) => {
  const started = Date.parse(save.trainer.startedAt)

  if (Number.isNaN(started)) return 1

  return Math.max(1, Math.floor((now - started) / DAY_MS) + 1)
}

export const hasBadge = (save, gymId) => save.badges.includes(gymId)

export const awardBadge = (save, gymId) => {
  if (!hasBadge(save, gymId)) save.badges.push(gymId)

  return save
}

export const markSeen = (save, speciesId) => {
  if (!save.dex.seen.includes(speciesId)) save.dex.seen.push(speciesId)

  return save
}

export const timesFaced = (save, speciesId) => {
  return save.dex.faced[speciesId] ?? 0
}

export const markFaced = (save, speciesId) => {
  markSeen(save, speciesId)

  save.dex.faced[speciesId] = timesFaced(save, speciesId) + 1

  return save
}

export const markCaught = (save, speciesId) => {
  markSeen(save, speciesId)

  if (!save.dex.caught.includes(speciesId)) save.dex.caught.push(speciesId)

  return save
}

export const markShiny = (save, speciesId) => {
  markCaught(save, speciesId)

  if (!save.dex.shiny.includes(speciesId)) save.dex.shiny.push(speciesId)

  return save
}

export const recordInDex = (save, mon) => {
  if (mon.shiny) return markShiny(save, mon.species)

  return markCaught(save, mon.species)
}

export const activePokemon = (save) => {
  return save.party.find((mon) => !isFainted(mon)) ?? null
}

export const partyIsWipedOut = (save) => {
  return save.party.length > 0 && save.party.every(isFainted)
}

export const healParty = (save) => {
  for (const mon of allPokemon(save)) healFully(mon)

  return save
}

export const partyNeedsHealing = (save) => {
  return save.party.some(
    (mon) =>
      mon.hp < mon.stats.hp ||
      mon.status != null ||
      mon.moves.some((slot) => slot.pp < slot.maxPp),
  )
}

export const totalBalls = (save) => countOfKind(save, 'ball')

export const stow = (save, mon) => {
  const where = save.party.length < PARTY_LIMIT ? 'party' : 'box'

  pokemonList(save, where).push(mon)

  return where
}

export const addPokemon = (save, mon) => {
  recordInDex(save, mon)
  save.stats.caught++

  return stow(save, mon)
}

export const withdrawPokemon = (save, index) => {
  if (index < 0 || index >= save.box.length) return false
  if (save.party.length >= PARTY_LIMIT) return false

  const [mon] = save.box.splice(index, 1)

  save.party.push(mon)

  return true
}

export const depositPokemon = (save, index) => {
  if (index < 0 || index >= save.party.length) return false
  if (save.party.length <= 1) return false

  const [mon] = save.party.splice(index, 1)

  save.box.push(mon)

  return true
}

export const setLead = (save, index) => {
  if (index <= 0 || index >= save.party.length) return save

  const [mon] = save.party.splice(index, 1)

  save.party.unshift(mon)

  return save
}
