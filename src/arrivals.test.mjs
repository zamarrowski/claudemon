import { expect, test } from 'vitest'

import { arrivalMessage, arrivalWording, hatchLines } from './arrivals.mjs'
import { BATTLE_MESSAGES } from './constants.mjs'
import { createPokemon } from './pokemon.mjs'
import { makeRng } from './rng.mjs'

const aPikachu = (over) => {
  return { ...createPokemon(25, 5, makeRng(1)), ...over }
}

test('Should say where a Pokémon landed, the team or the box', () => {
  expect(arrivalWording('party')).toBe(BATTLE_MESSAGES.joinedTeam)
  expect(arrivalWording('box')).toBe(BATTLE_MESSAGES.wentToBox)
})

test('Should name a traded Pokémon, who sent it and where it went', () => {
  const taken = { mon: aPikachu({ nickname: 'Sparky' }), where: 'party' }

  expect(arrivalMessage(taken, { from: { name: 'misty' } })).toBe(
    'SPARKY arrived from MISTY. It joined your team!',
  )

  expect(
    arrivalMessage(
      { mon: aPikachu(), where: 'box' },
      { from: { name: 'ash' } },
    ),
  ).toBe('PIKACHU arrived from ASH. Your team was full, so it went to the box.')
})

test('Should announce a hatched Pokémon and where it went', () => {
  expect(hatchLines(aPikachu(), 'party')).toEqual([
    'PIKACHU hatched from the egg!',
    BATTLE_MESSAGES.joinedTeam,
  ])
})

test('Should add the sparkle to a shiny hatchling without losing where it went', () => {
  expect(hatchLines(aPikachu({ shiny: true }), 'box')).toEqual([
    `PIKACHU hatched from the egg! ${BATTLE_MESSAGES.shiny}`,
    BATTLE_MESSAGES.wentToBox,
  ])
})
