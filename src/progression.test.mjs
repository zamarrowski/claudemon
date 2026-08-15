import { expect, test } from 'vitest'
import { MAX_LEVEL, MOVE_LIMIT } from './constants.mjs'
import { createPokemon, displayName, levelOf } from './pokemon.mjs'
import {
  applyVictory,
  describeStep,
  learnEvolutionMoves,
  learnMove,
} from './progression.mjs'
import { makeRng } from './rng.mjs'
import { createSave } from './state.mjs'
import { expForLevel } from './exp.mjs'
import { species } from './data.mjs'
import { movesLearnedAt } from './learnset.mjs'

const aSave = () =>
  createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) })

const kindsOf = (steps) => steps.map((step) => step.kind)

test('Should hand out the prize money once and the EXP to everyone still standing', () => {
  const save = aSave()
  const standing = createPokemon(1, 5, makeRng(2))
  const fainted = createPokemon(4, 5, makeRng(3))

  fainted.hp = 0

  const steps = applyVictory(save, [standing, fainted], {
    exp: 40,
    money: 120,
  })

  expect(save.money).toBe(3120)
  expect(kindsOf(steps).filter((kind) => kind === 'money')).toHaveLength(1)
  expect(kindsOf(steps).filter((kind) => kind === 'exp')).toHaveLength(1)
  expect(standing.exp).toBe(expForLevel(1, 5) + 40)
  expect(fainted.exp, 'the fainted one gets nothing').toBe(expForLevel(4, 5))
})

test('Should say nothing about money when a wild Pokemon carried none', () => {
  const save = aSave()
  const steps = applyVictory(save, [createPokemon(1, 5, makeRng(2))], {
    exp: 10,
    money: 0,
  })

  expect(kindsOf(steps)).not.toContain('money')
  expect(save.money).toBe(3000)
})

test('Should level a Pokemon up, teach it what it learns and evolve it on the way', () => {
  const save = aSave()
  const mon = createPokemon(1, 15, makeRng(4))
  const steps = applyVictory(save, [mon], {
    exp: expForLevel(1, 18) - mon.exp,
    money: 0,
  })

  expect(levelOf(mon)).toBe(18)
  expect(kindsOf(steps)).toContain('level')
  expect(kindsOf(steps)).toContain('evolve')
  expect(mon.species, 'Bulbasaur became Ivysaur').toBe(2)
  expect(save.dex.caught, 'and the dex knows it').toContain(2)
})

test('Should ask which move to forget when a Pokemon already knows four', () => {
  const save = aSave()
  const mon = createPokemon(25, 12, makeRng(5))

  while (mon.moves.length < MOVE_LIMIT)
    mon.moves.push({ move: 'tackle', pp: 35, maxPp: 35 })

  const steps = applyVictory(save, [mon], {
    exp: expForLevel(25, 20) - mon.exp,
    money: 0,
  })
  const choice = steps.find((step) => step.kind === 'learn-choice')

  expect(choice, 'it stops to ask').toBeTruthy()
  expect(mon.moves).toHaveLength(MOVE_LIMIT)

  const replaced = mon.moves[0].move
  const { learned, forgot } = learnMove(mon, choice.move, 0)

  expect(learned).toBe(true)
  expect(forgot).toBe(replaced)
  expect(mon.moves[0].move).toBe(choice.move)
})

test('Should keep every move it had when the choice is turned down', () => {
  const mon = createPokemon(25, 12, makeRng(5))
  const before = mon.moves.map((slot) => slot.move)

  expect(learnMove(mon, 'thunder', null)).toEqual({
    learned: false,
    forgot: null,
  })
  expect(mon.moves.map((slot) => slot.move)).toEqual(before)
})

test('Should say a Pokemon is maxed out once it can go no further', () => {
  const save = aSave()
  const mon = createPokemon(25, MAX_LEVEL - 1, makeRng(6))
  const steps = applyVictory(save, [mon], { exp: 2_000_000, money: 0 })

  expect(levelOf(mon)).toBe(MAX_LEVEL)
  expect(kindsOf(steps)).toContain('maxed')
})

test('Should teach an evolved Pokemon what its new form already knew', () => {
  const level = species(2).learnset.find((entry) => entry.level > 1).level
  const mon = createPokemon(2, level, makeRng(7))

  mon.moves = []

  const steps = learnEvolutionMoves(mon)

  expect(mon.moves.map((slot) => slot.move)).toEqual(movesLearnedAt(2, level))
  expect(kindsOf(steps).every((kind) => kind === 'learn')).toBe(true)
})

test('Should put every step of a victory into words for the message box', () => {
  const mon = createPokemon(1, 5, makeRng(8))
  const name = displayName(mon)

  expect(describeStep({ kind: 'money', amount: 120 })[0]).toMatch(/120₽/)
  expect(describeStep({ kind: 'exp', amount: 40, name })[0]).toMatch(/40 EXP/)
  expect(describeStep({ kind: 'level', level: 6, name, mon })[0]).toMatch(/6/)
  expect(describeStep({ kind: 'learn', move: 'vine-whip', name })[0]).toMatch(
    /vine/i,
  )
  expect(
    describeStep({ kind: 'evolve', from: 1, to: 2, name: 'Ivysaur', mon })[0],
  ).toMatch(/Ivysaur/)
  expect(describeStep({ kind: 'maxed', name, mon })[0]).toMatch(/\w/)
  expect(describeStep({ kind: 'nothing-like-that' })).toEqual([])
})
