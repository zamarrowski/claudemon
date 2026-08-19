import { AILMENT_IMMUNE_TYPES, SHINY_ODDS } from './constants.mjs'
import { move as moveData, species } from './data.mjs'
import { expForLevel, levelFromExp } from './exp.mjs'
import { movesAtLevel } from './learnset.mjs'
import { chance } from './rng.mjs'
import { rollIvs, statsAtLevel } from './stats.mjs'

export const makeMoveSlot = (name) => {
  const data = moveData(name)

  return { move: name, pp: data.pp, maxPp: data.pp }
}

export const rollShiny = (rng) => chance(rng, SHINY_ODDS)

export const createPokemon = (speciesId, level, rng, shiny = false) => {
  const ivs = rollIvs(rng)
  const stats = statsAtLevel(speciesId, level, ivs)

  return {
    species: speciesId,
    nickname: null,
    exp: expForLevel(speciesId, level),
    ivs,
    stats,
    hp: stats.hp,
    moves: movesAtLevel(speciesId, level).map(makeMoveSlot),
    status: null,
    statusTurns: 0,
    shiny,
  }
}

export const speciesName = (id) => species(id).name.replace(/-[fm]$/, '')

export const displayName = (mon) => mon.nickname ?? speciesName(mon.species)

export const genderOf = (mon) => {
  const rate = species(mon.species).genderRate

  if (!Number.isInteger(rate) || rate < 0) return null
  if (!Number.isInteger(mon.ivs?.attack)) return null

  return mon.ivs.attack < rate * 4 ? 'female' : 'male'
}

export const speciesGender = (id) => {
  const rate = species(id).genderRate

  if (rate === 0) return 'male'
  if (rate === 8) return 'female'

  return null
}

export const levelOf = (mon) => levelFromExp(mon.species, mon.exp)

export const isFainted = (mon) => mon.hp <= 0

export const hpFraction = (mon, denominator) => {
  return Math.max(1, Math.floor(mon.stats.hp / denominator))
}

export const isImmuneToAilment = (mon, ailment) => {
  const immune = AILMENT_IMMUNE_TYPES[ailment]

  if (!immune) return false

  return species(mon.species).types.some((type) => immune.includes(type))
}

export const refreshStats = (mon) => {
  const previousMax = mon.stats.hp

  mon.stats = statsAtLevel(mon.species, levelOf(mon), mon.ivs)

  const gained = mon.stats.hp - previousMax

  if (gained > 0 && mon.hp > 0) mon.hp = Math.min(mon.stats.hp, mon.hp + gained)

  return mon
}

export const reorderMoves = (mon, from, to) => {
  const slots = [...mon.moves]
  const [carried] = slots.splice(from, 1)

  slots.splice(to, 0, carried)

  mon.moves = slots

  return mon
}

export const healFully = (mon) => {
  mon.hp = mon.stats.hp
  mon.status = null
  mon.statusTurns = 0

  for (const slot of mon.moves) slot.pp = slot.maxPp

  return mon
}

export const pendingEvolution = (mon, level = levelOf(mon)) => {
  for (const evolution of species(mon.species).evolutions) {
    if (evolution.trigger !== 'level-up') continue
    if (evolution.level !== null && level >= evolution.level)
      return evolution.to
  }

  return null
}

export const stoneEvolution = (mon, item) => {
  for (const evolution of species(mon.species).evolutions) {
    if (evolution.trigger === 'use-item' && evolution.item === item)
      return evolution.to
  }

  return null
}

export const canEvolveByStone = (mon) => {
  return species(mon.species).evolutions.some(
    (evolution) => evolution.trigger === 'use-item',
  )
}

export const levelUpEvolution = (mon) => {
  const evolution = species(mon.species).evolutions.find(
    (candidate) => candidate.trigger === 'level-up' && candidate.level != null,
  )

  return evolution ?? null
}

export const evolveInto = (mon, speciesId) => {
  const fraction = mon.stats.hp > 0 ? mon.hp / mon.stats.hp : 1

  mon.species = speciesId
  mon.stats = statsAtLevel(speciesId, levelOf(mon), mon.ivs)
  mon.hp = Math.max(1, Math.round(mon.stats.hp * fraction))

  return mon
}
