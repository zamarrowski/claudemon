import {
  DAYCARE_EXP_PER_STEP,
  DAYCARE_LIMIT,
  DAYCARE_MESSAGES,
  DITTO_ID,
  EGG_LEVEL,
  EGG_SHINY_ODDS,
  EGG_STEPS,
  MAX_LEVEL,
  PAIRED_EGG_LINES,
} from './constants.mjs'
import { species } from './data.mjs'
import { canSpare, pokemonList } from './helpers.mjs'
import { createPokemon, genderOf, levelOf, refreshStats } from './pokemon.mjs'
import { learnMovesUnattended } from './progression.mjs'
import { chance } from './rng.mjs'
import { stow } from './state.mjs'

const baseFormOf = (speciesId) => {
  const from = species(speciesId).evolvesFrom

  if (from === null) return speciesId

  return baseFormOf(from)
}

const isDitto = (mon) => mon.species === DITTO_ID

const canBreedAtAll = (mon) => !species(mon.species).legendary

const sharesLine = (left, right) => {
  const line = baseFormOf(left.species)
  const other = baseFormOf(right.species)

  return line === other || PAIRED_EGG_LINES[line] === other
}

const areOppositeGenders = (left, right) => {
  const one = genderOf(left)
  const other = genderOf(right)

  if (one === null || other === null) return false

  return one !== other
}

export const areCompatible = (left, right) => {
  if (!canBreedAtAll(left) || !canBreedAtAll(right)) return false
  if (isDitto(left) && isDitto(right)) return false
  if (isDitto(left) || isDitto(right)) return true

  return sharesLine(left, right) && areOppositeGenders(left, right)
}

export const pairIsCompatible = (save) => {
  if (save.daycare.slots.length < DAYCARE_LIMIT) return false

  const [left, right] = save.daycare.slots

  return areCompatible(left, right)
}

const motherOf = (left, right) => {
  if (isDitto(left)) return right
  if (isDitto(right)) return left
  if (genderOf(left) === 'female') return left

  return right
}

const eggSpeciesFor = (left, right) => {
  return baseFormOf(motherOf(left, right).species)
}

export const eggFromPair = (save, rng) => {
  if (save.daycare.egg) return null
  if (!pairIsCompatible(save)) return null

  const [left, right] = save.daycare.slots

  save.daycare.egg = {
    species: eggSpeciesFor(left, right),
    steps: 0,
    shiny: chance(rng, EGG_SHINY_ODDS),
  }

  return save.daycare.egg
}

const movesLearnedWhileWaiting = (mon, from, to) => {
  const steps = []

  for (let level = from; level <= to; level++)
    steps.push(...learnMovesUnattended(mon, level))

  return steps
}

const raiseOne = (mon) => {
  const before = levelOf(mon)

  mon.exp += DAYCARE_EXP_PER_STEP

  const after = levelOf(mon)

  if (after === before) return []

  refreshStats(mon)

  return movesLearnedWhileWaiting(mon, before + 1, after)
}

export const raiseDaycare = (save) => {
  const steps = []

  for (const mon of save.daycare.slots) {
    if (levelOf(mon) >= MAX_LEVEL) continue

    steps.push(...raiseOne(mon))
  }

  return steps
}

export const walkEgg = (egg) => {
  egg.steps = Math.min(EGG_STEPS, egg.steps + 1)

  return egg
}

export const eggIsReady = (egg) => egg.steps >= EGG_STEPS

export const eggProgress = (egg) => egg.steps / EGG_STEPS

export const hatchEgg = (egg, rng) => {
  return createPokemon(egg.species, EGG_LEVEL, rng, egg.shiny)
}

export const daycareCandidates = (save) => {
  return [
    ...save.party.map((mon, index) => ({ mon, source: 'party', index })),
    ...save.box.map((mon, index) => ({ mon, source: 'box', index })),
  ]
}

export const leaveAtDaycare = (save, source, index) => {
  if (save.daycare.slots.length >= DAYCARE_LIMIT) {
    return { ok: false, reason: DAYCARE_MESSAGES.bothTaken }
  }

  if (!canSpare(save, source)) {
    return { ok: false, reason: DAYCARE_MESSAGES.lastOne }
  }

  const [mon] = pokemonList(save, source).splice(index, 1)

  save.daycare.slots.push(mon)

  return { ok: true, mon }
}

export const takeBackFromDaycare = (save, slot) => {
  const [mon] = save.daycare.slots.splice(slot, 1)

  return { mon, where: stow(save, mon) }
}
