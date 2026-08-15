import { expect, test } from 'vitest'

import { TRAINER_CLASSES } from './constants.mjs'
import { createPokemon } from './pokemon.mjs'
import { makeRng } from './rng.mjs'
import {
  monsLeft,
  rollTrainer,
  trainerClass,
  trainerLabel,
  trainerPrize,
} from './trainer.mjs'

const PIKACHU_ONLY = [{ id: 25, name: 'Pikachu', weight: 1 }]

const rollMany = (count, leadLevel) => {
  const rng = makeRng(4321)
  const rolled = []

  for (let index = 0; index < count; index++) {
    rolled.push(rollTrainer({ rng, leadLevel, species: PIKACHU_ONLY }))
  }

  return rolled
}

const capOf = (trainer) => trainerClass(trainer.class).maxMons

test('Should name a trainer after a class on the list, dress them in one of its sprites and never leave the roster empty', () => {
  const worn = new Set()

  for (const trainer of rollMany(50, 20)) {
    expect(TRAINER_CLASSES.map((entry) => entry.name)).toContain(trainer.class)
    expect(trainer.name, 'a trainer without a name has no label').toBeTruthy()
    expect(trainerClass(trainer.class).sprites).toContain(trainer.sprite)
    expect(trainer.team.length).toBeGreaterThanOrEqual(1)

    worn.add(trainer.sprite)

    for (const mon of trainer.team) {
      expect(mon.species).toBe(25)
      expect(mon.name).toBe('Pikachu')
    }
  }

  expect(
    worn.size,
    'fifty trainers wearing one sprite is not a wardrobe',
  ).toBeGreaterThan(TRAINER_CLASSES.length)
})

test('Should grow the roster a Pokémon at a time with the lead, and never past the class cap', () => {
  for (const trainer of rollMany(50, 5)) {
    expect(trainer.team, 'a level five lead earns a one-on-one').toHaveLength(1)
  }

  const early = rollMany(80, 12).map((trainer) => trainer.team.length)

  expect(Math.max(...early), 'level twelve opens the second slot').toBe(2)

  const late = rollMany(120, 72)
  const sizes = late.map((trainer) => trainer.team.length)

  expect(
    Math.max(...sizes),
    'a veteran lead meets whole teams',
  ).toBeGreaterThan(2)
  expect(Math.min(...sizes), 'and still meets lone trainers').toBe(1)

  for (const trainer of late) {
    expect(
      trainer.team.length,
      `${trainer.class} should not carry more than ${capOf(trainer)}`,
    ).toBeLessThanOrEqual(capOf(trainer))
  }
})

test('Should keep a trainer team around the lead level, a little above the grass', () => {
  for (const trainer of rollMany(80, 20)) {
    for (const mon of trainer.team) {
      expect(mon.level).toBeGreaterThanOrEqual(19)
      expect(mon.level).toBeLessThanOrEqual(23)
    }
  }
})

test('Should keep to the starter range with no lead at all', () => {
  for (const trainer of rollMany(40, null)) {
    expect(trainer.team).toHaveLength(1)
    expect(trainer.team[0].level).toBeGreaterThanOrEqual(2)
    expect(trainer.team[0].level).toBeLessThanOrEqual(5)
  }
})

test('Should pay by the rate the trainer carries and the level of its best Pokémon', () => {
  const trainer = {
    class: 'Lass',
    name: 'Iris',
    prize: trainerClass('Lass').prize,
    team: [
      createPokemon(25, 10, makeRng(1)),
      createPokemon(25, 14, makeRng(2)),
    ],
  }

  expect(trainerPrize(trainer), 'thirty a level for the level fourteen').toBe(
    30 * 14,
  )

  const leader = {
    class: 'Leader',
    name: 'Brock',
    prize: 90,
    team: [createPokemon(95, 14, makeRng(3))],
  }

  expect(
    trainerPrize(leader),
    'a leader is priced by the gym, not by the class list',
  ).toBe(90 * 14)
})

test('Should know a class by name, and know when it does not', () => {
  expect(trainerClass('Bug Catcher').prize).toBe(22)
  expect(
    trainerClass('Rocket Grunt'),
    'a class nobody can price is not a class',
  ).toBeUndefined()
})

test('Should count only the Pokémon still standing, and read a trainer as class then name', () => {
  const standing = createPokemon(25, 10, makeRng(1))
  const down = createPokemon(25, 10, makeRng(2))

  down.hp = 0

  const trainer = { class: 'Hiker', name: 'Wade', team: [down, standing] }

  expect(monsLeft(trainer)).toBe(1)
  expect(trainerLabel(trainer)).toBe('HIKER WADE')
})
