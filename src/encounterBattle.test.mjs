import { expect, test } from 'vitest'

import { BATTLE_MESSAGES } from './constants.mjs'
import { openingBattle, trainerBattle } from './encounterBattle.mjs'
import { createPokemon, levelOf } from './pokemon.mjs'
import { makeRng } from './rng.mjs'
import { createSave } from './state.mjs'
import { trainerClass } from './trainer.mjs'

const aSave = () =>
  createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) })

const aWildEncounter = (over) => {
  return {
    kind: 'wild',
    species: 16,
    name: 'Pidgey',
    level: 5,
    seed: 42,
    shiny: false,
    ...over,
  }
}

const aTrainerEncounter = () => {
  return {
    kind: 'trainer',
    seed: 21,
    trainer: {
      class: 'Hiker',
      name: 'Wade',
      sprite: 'hiker',
      team: [
        { species: 74, level: 8 },
        { species: 95, level: 9 },
      ],
    },
  }
}

test('Should open a wild battle on what the grass turned up and note it in the dex', () => {
  const save = aSave()
  const lead = save.party[0]
  const { state, intro } = openingBattle(save, aWildEncounter(), lead)

  expect(state.foe.mon.species).toBe(16)
  expect(levelOf(state.foe.mon)).toBe(5)
  expect(state.player.mon).toBe(lead)
  expect(state.seed).toBe(42)
  expect(state.trainer, 'nobody owns a wild Pokémon').toBeNull()
  expect(intro).toEqual(['A wild PIDGEY appeared!'])
  expect(save.dex.seen).toContain(16)
  expect(save.dex.faced[16]).toBe(1)
  expect(save.dex.caught, 'facing one is not catching it').not.toContain(16)
})

test('Should roll the same wild Pokémon every time from the seed of the encounter', () => {
  const encounter = aWildEncounter()
  const first = openingBattle(
    aSave(),
    encounter,
    createPokemon(1, 5, makeRng(2)),
  )
  const second = openingBattle(
    aSave(),
    encounter,
    createPokemon(1, 5, makeRng(2)),
  )

  expect(second.state.foe.mon.ivs).toEqual(first.state.foe.mon.ivs)
  expect(second.state.foe.mon.stats).toEqual(first.state.foe.mon.stats)
})

test('Should say a shiny wild Pokémon sparkles before anything else happens', () => {
  const save = aSave()
  const { intro } = openingBattle(
    save,
    aWildEncounter({ shiny: true }),
    save.party[0],
  )

  expect(intro).toEqual(['A wild PIDGEY appeared!', BATTLE_MESSAGES.shiny])
})

test('Should send a trainer out with their whole team, priced by their class, in two lines', () => {
  const save = aSave()
  const { state, intro } = openingBattle(
    save,
    aTrainerEncounter(),
    save.party[0],
  )

  expect(state.trainer.name).toBe('Wade')
  expect(state.trainer.sprite).toBe('hiker')
  expect(state.trainer.prize).toBe(trainerClass('Hiker').prize)
  expect(state.trainer.team.map((mon) => mon.species)).toEqual([74, 95])
  expect(state.trainer.team.map(levelOf)).toEqual([8, 9])
  expect(state.foe.mon, 'the first one is the one out').toBe(
    state.trainer.team[0],
  )
  expect(intro).toEqual([
    'HIKER WADE wants to battle!',
    'HIKER WADE sent out Geodude!',
  ])
  expect(save.dex.faced[74], 'only the one that came out was faced').toBe(1)
  expect(save.dex.faced[95]).toBeUndefined()
})

test('Should keep the prize a gym opponent already carries instead of the class rate', () => {
  const save = aSave()
  const brock = {
    class: 'Leader',
    name: 'Brock',
    sprite: 'brock',
    prize: 90,
    team: [{ species: 95, level: 14 }],
  }
  const { state, intro } = trainerBattle(save, brock, 7, save.party[0])

  expect(state.trainer.prize).toBe(90)
  expect(state.seed).toBe(7)
  expect(intro[1]).toBe('LEADER BROCK sent out Onix!')
})
