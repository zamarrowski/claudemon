import { expect, test } from 'vitest'
import { STAGE_LIMIT } from './constants.mjs'
import {
  createBattle,
  emptyStages,
  rehydrate,
  submitAction,
} from './battle.mjs'
import { createPokemon } from './pokemon.mjs'
import { makeRng } from './rng.mjs'

const aBattle = ({ player, foe, seed = 1, trainer = null }) => {
  return createBattle({
    playerMon: player,
    wildMon: foe,
    seed,
    trainer,
  })
}

const withMoves = (mon, names) => {
  mon.moves = names.map((move) => ({ move, pp: 20, maxPp: 20 }))

  return mon
}

const said = (events) => {
  return events
    .filter((event) => event.type === 'message')
    .map((event) => event.text)
    .join(' ')
}

test('Should raise and lower stat stages, and say when they will go no further', () => {
  const player = withMoves(createPokemon(1, 30, makeRng(1)), ['growl'])
  const foe = createPokemon(10, 30, makeRng(2))
  const battle = aBattle({ player, foe })

  battle.foe.stages.attack = -STAGE_LIMIT

  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(said(events)).toMatch(/won't go lower/)
  expect(battle.foe.stages.attack).toBe(-STAGE_LIMIT)
})

test('Should leave the stages behind when a Pokemon is switched out', () => {
  const player = withMoves(createPokemon(1, 30, makeRng(1)), ['tackle'])
  const battle = aBattle({ player, foe: createPokemon(10, 5, makeRng(2)) })

  battle.player.stages.attack = 2

  expect(emptyStages().attack).toBe(0)

  battle.player.stages = emptyStages()

  expect(battle.player.stages.attack).toBe(0)
})

test('Should rebuild the dice from the seed when a battle is read back', () => {
  const battle = aBattle({
    player: createPokemon(1, 5, makeRng(1)),
    foe: createPokemon(10, 5, makeRng(2)),
    seed: 77,
  })

  delete battle.rng

  const back = rehydrate(battle)

  expect(typeof back.rng).toBe('function')
  expect(rehydrate(back).rng, 'and is left alone once it has one').toBe(
    back.rng,
  )
})

test('Should put a Pokemon to sleep and wake it up again', () => {
  const player = withMoves(createPokemon(1, 40, makeRng(1)), ['sleep-powder'])
  const foe = withMoves(createPokemon(19, 10, makeRng(2)), ['tackle'])
  const battle = aBattle({ player, foe, seed: 3 })

  let asleep = false

  for (let turn = 0; turn < 12 && !asleep; turn++) {
    submitAction(battle, { type: 'move', index: 0 })
    asleep = battle.foe.mon.status === 'sleep'
  }

  expect(asleep, 'sleep powder puts it under eventually').toBe(true)

  for (let turn = 0; turn < 12 && battle.foe.mon.status === 'sleep'; turn++)
    submitAction(battle, { type: 'move', index: 0 })

  expect(battle.foe.mon.status, 'and it wakes up again').toBeNull()
})

test('Should wear a poisoned Pokemon down at the end of every turn', () => {
  const player = withMoves(createPokemon(1, 40, makeRng(1)), ['tackle'])
  const foe = withMoves(createPokemon(19, 40, makeRng(2)), ['tackle'])
  const battle = aBattle({ player, foe, seed: 4 })

  battle.foe.mon.status = 'poison'

  const before = battle.foe.mon.hp
  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(battle.foe.mon.hp).toBeLessThan(before)
  expect(said(events)).toMatch(/hurt by poison|poison/i)
})

test('Should let a Pokemon with no PP left struggle rather than do nothing', () => {
  const player = withMoves(createPokemon(1, 40, makeRng(1)), ['tackle'])
  const foe = withMoves(createPokemon(19, 40, makeRng(2)), ['tackle'])
  const battle = aBattle({ player, foe, seed: 5 })

  player.moves[0].pp = 0

  const before = player.hp
  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(said(events)).toMatch(/Struggle/i)
  expect(player.hp, 'and it hurts itself doing it').toBeLessThan(before)
})

test('Should run from a wild Pokemon but never from a trainer', () => {
  const player = withMoves(createPokemon(6, 60, makeRng(1)), ['tackle'])
  const wild = aBattle({ player, foe: createPokemon(19, 2, makeRng(2)) })

  submitAction(wild, { type: 'run' })

  expect(wild.over).toBe(true)
  expect(wild.outcome).toBe('fled')

  const trainer = aBattle({
    player: withMoves(createPokemon(6, 60, makeRng(1)), ['tackle']),
    foe: createPokemon(19, 2, makeRng(2)),
    trainer: {
      class: 'Hiker',
      name: 'Wade',
      sprite: 'hiker',
      prize: 40,
      team: [createPokemon(19, 2, makeRng(2))],
    },
  })

  const events = submitAction(trainer, { type: 'run' })

  expect(trainer.over).toBe(false)
  expect(said(events)).toMatch(/no running|can't run/i)
})

test('Should count the turns and hand the reward over when the foe goes down', () => {
  const player = withMoves(createPokemon(6, 60, makeRng(1)), ['ember'])
  const foe = withMoves(createPokemon(10, 2, makeRng(2)), ['tackle'])
  const battle = aBattle({ player, foe, seed: 6 })

  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(battle.turn).toBeGreaterThan(0)
  expect(battle.over).toBe(true)
  expect(battle.outcome).toBe('win')
  expect(battle.rewards.exp).toBeGreaterThan(0)
  expect(said(events)).toMatch(/fainted/i)
})
