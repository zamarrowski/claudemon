import { PARTY_SORT } from './constants.mjs'
import { levelOf } from './pokemon.mjs'
import { randInt } from './rng.mjs'

export const allPokemon = (save) => {
  return [...save.party, ...save.box, ...save.daycare.slots]
}

export const pokemonList = (save, source) => {
  if (source === 'box') return save.box

  return save.party
}

export const canSpare = (save, source) => {
  if (source === 'box') return true

  return save.party.length > 1
}

export const pickLevel = (rng, leadLevel, spread) => {
  if (!leadLevel) return randInt(rng, spread.min, spread.fallbackMax)

  const min = Math.max(spread.min, leadLevel - spread.below)
  const max = Math.min(spread.ceiling, Math.max(min, leadLevel + spread.above))

  return randInt(rng, min, max)
}

const byLevelThenIndex = (a, b) => {
  const byLevel = levelOf(b.mon) - levelOf(a.mon)

  if (byLevel !== 0) return byLevel

  return a.index - b.index
}

export const sortedPartyEntries = (party, sort) => {
  const entries = party.map((mon, index) => ({ mon, index }))

  if (sort === PARTY_SORT.level) return entries.sort(byLevelThenIndex)

  return entries
}
