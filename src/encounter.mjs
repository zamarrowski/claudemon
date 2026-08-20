import {
  DEFAULT_CAPTURE_RATE,
  ENCOUNTER_VERSION,
  FALLBACK_SPECIES,
  LEGENDARY_LEVEL_GATE,
  STAGE_LEVEL_GATES,
  WILD_LEVEL_SPREAD,
} from './constants.mjs'
import { loadPokedex } from './data.mjs'
import { pickLevel } from './helpers.mjs'
import { rollShiny } from './pokemon.mjs'
import { chance, randInt, weightedPick } from './rng.mjs'
import { rollTrainer } from './trainer.mjs'

export const speciesTableFromDex = (dex, leadLevel = 5) => {
  const table = []

  for (const mon of dex) {
    const stageGate = STAGE_LEVEL_GATES[mon.stage ?? 0]

    if (stageGate && leadLevel < stageGate) continue
    if (mon.legendary && leadLevel < LEGENDARY_LEVEL_GATE) continue

    table.push({
      id: mon.id,
      name: mon.name,
      weight: Math.max(
        1,
        Math.round(Math.sqrt(mon.captureRate ?? DEFAULT_CAPTURE_RATE) * 2),
      ),
    })
  }

  if (table.length === 0) return FALLBACK_SPECIES

  return table
}

export const loadSpeciesTable = (leadLevel = 5) => {
  try {
    return speciesTableFromDex(loadPokedex(), leadLevel)
  } catch {
    return FALLBACK_SPECIES
  }
}

export const encounterSpecies = (encounter) => {
  if (encounter.kind === 'trainer') return encounter.trainer.team[0].species

  return encounter.species
}

export const stepsFromPrompt = (promptLength, config) => {
  return Math.min(
    config.maxSteps,
    Math.max(1, Math.ceil(promptLength / config.charsPerStep)),
  )
}

export const stepsWhileWorking = (elapsedMs, config) => {
  const stepMs = (config.workStepSeconds ?? 0) * 1000

  if (stepMs <= 0 || !(elapsedMs > 0)) return { steps: 0, leftoverMs: 0 }

  const steps = Math.floor(elapsedMs / stepMs)

  return { steps, leftoverMs: elapsedMs - steps * stepMs }
}

const rollWild = (rng, leadLevel, species) => {
  const chosen = weightedPick(rng, species, (entry) => entry.weight)

  return {
    v: ENCOUNTER_VERSION,
    kind: 'wild',
    species: chosen.id,
    name: chosen.name,
    level: pickLevel(rng, leadLevel, WILD_LEVEL_SPREAD),
    seed: randInt(rng, 0, 0xffffffff),
    shiny: rollShiny(rng),
  }
}

const rollTrainerEncounter = (rng, leadLevel, species) => {
  return {
    v: ENCOUNTER_VERSION,
    kind: 'trainer',
    trainer: rollTrainer({ rng, leadLevel, species }),
    seed: randInt(rng, 0, 0xffffffff),
  }
}

export const rollEncounters = ({ steps, leadLevel, rng, config, species }) => {
  const encounters = []

  for (let step = 0; step < steps; step++) {
    if (!chance(rng, config.encounterChance)) continue

    if (chance(rng, config.trainerChance)) {
      encounters.push(rollTrainerEncounter(rng, leadLevel, species))
      continue
    }

    encounters.push(rollWild(rng, leadLevel, species))
  }

  return encounters
}
