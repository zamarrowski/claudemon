import { createBattle } from './battle.mjs'
import { BATTLE_MESSAGES, TRAINER_MESSAGES } from './constants.mjs'
import { createPokemon, displayName } from './pokemon.mjs'
import { makeRng } from './rng.mjs'
import { markFaced } from './state.mjs'
import { sentOutLine, trainerClass, trainerLabel } from './trainer.mjs'

const wildIntro = (wild) => {
  const appeared = `A wild ${displayName(wild).toUpperCase()} appeared!`

  if (!wild.shiny) return [appeared]

  return [appeared, BATTLE_MESSAGES.shiny]
}

const wildBattle = (save, encounter, lead) => {
  const wild = createPokemon(
    encounter.species,
    encounter.level,
    makeRng(encounter.seed),
    encounter.shiny,
  )

  markFaced(save, encounter.species)

  return {
    state: createBattle({
      playerMon: lead,
      wildMon: wild,
      seed: encounter.seed,
    }),
    intro: wildIntro(wild),
  }
}

const encounterTrainer = (trainer) => {
  return {
    class: trainer.class,
    name: trainer.name,
    sprite: trainer.sprite,
    prize: trainerClass(trainer.class).prize,
    team: trainer.team,
  }
}

export const trainerBattle = (save, opponent, seed, lead) => {
  const team = opponent.team.map((entry, index) => {
    return createPokemon(
      entry.species,
      entry.level,
      makeRng((seed + index) >>> 0),
    )
  })

  markFaced(save, team[0].species)

  const trainer = {
    class: opponent.class,
    name: opponent.name,
    sprite: opponent.sprite,
    prize: opponent.prize,
    team,
  }

  return {
    state: createBattle({
      playerMon: lead,
      wildMon: team[0],
      seed,
      trainer,
    }),
    intro: [
      `${trainerLabel(trainer)} ${TRAINER_MESSAGES.wantsToBattle}`,
      sentOutLine(trainer, team[0]),
    ],
  }
}

export const openingBattle = (save, encounter, lead) => {
  if (encounter.kind !== 'trainer') return wildBattle(save, encounter, lead)

  return trainerBattle(
    save,
    encounterTrainer(encounter.trainer),
    encounter.seed,
    lead,
  )
}
