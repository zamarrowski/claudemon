import { expect, test } from 'vitest'

import { GYMS } from './constants.mjs'
import { species } from './data.mjs'
import {
  advanceGymRun,
  createGymRun,
  currentOpponent,
  gymBattleSeed,
  gymById,
  gymIndex,
  gymLevelRange,
  gymRoster,
  isGymCleared,
  isLeaderNext,
  opponentLevelRange,
  opponentStatus,
  rollbackGymRun,
} from './gym.mjs'

test('Should give every gym a real leader, a roster that ends on them and a type its leader actually uses', () => {
  const ids = new Set()

  for (const gym of GYMS) {
    expect(ids.has(gym.id), `${gym.id} is listed twice`).toBe(false)
    ids.add(gym.id)

    const roster = gymRoster(gym)

    expect(roster.length, `${gym.id} needs somebody before the leader`).toBe(
      gym.trainers.length + 1,
    )
    expect(roster[roster.length - 1]).toBe(gym.leader)
    expect(gym.leader.class).toBe('Leader')
    expect(gym.badge).toBeTruthy()

    for (const opponent of roster) {
      expect(
        opponent.team.length,
        `${opponent.name} fights alone`,
      ).toBeGreaterThan(0)
      expect(opponent.prize, `${opponent.name} pays nothing`).toBeGreaterThan(0)
      expect(opponent.sprite).toBeTruthy()

      for (const entry of opponent.team) {
        expect(species(entry.species).name).toBeTruthy()
        expect(entry.level).toBeGreaterThan(0)
      }
    }

    expect(
      gym.leader.team.some((entry) =>
        species(entry.species).types.includes(gym.type),
      ),
      `${gym.id} is a ${gym.type} gym whose leader owns no ${gym.type} type`,
    ).toBe(true)
  }
})

test('Should climb in difficulty from the first gym to the last', () => {
  const ranges = GYMS.map(gymLevelRange)

  for (let index = 1; index < ranges.length; index++) {
    expect(
      ranges[index].min,
      `${GYMS[index].id} should not be easier than ${GYMS[index - 1].id}`,
    ).toBeGreaterThan(ranges[index - 1].min)
  }

  expect(gymLevelRange(gymById('pewter'))).toEqual({ min: 10, max: 14 })
})

test('Should read a level range off a whole gym and off a single trainer', () => {
  const brock = gymById('pewter').leader

  expect(opponentLevelRange(brock)).toEqual({ min: 12, max: 14 })
  expect(
    opponentLevelRange({ team: [{ species: 25, level: 9 }] }),
    'one Pokémon is a range of one',
  ).toEqual({ min: 9, max: 9 })
})

test('Should find a gym by id, its place in the list, and nothing at all for a made up one', () => {
  expect(gymById('cerulean').city).toBe('Cerulean')
  expect(gymIndex('cerulean')).toBe(1)
  expect(gymById('atlantis')).toBeUndefined()
  expect(gymIndex('atlantis')).toBe(-1)
})

test('Should walk the roster one opponent at a time and only call it cleared once the leader is down', () => {
  const gym = gymById('pewter')
  const run = createGymRun({ gym, seed: 42, save: { money: 1 } })

  expect(run.id).toBe('pewter')
  expect(currentOpponent(run).name).toBe('Liam')
  expect(isLeaderNext(run)).toBe(false)
  expect(isGymCleared(run)).toBe(false)
  expect([0, 1, 2].map((index) => opponentStatus(run, index))).toEqual([
    'next',
    'pending',
    'pending',
  ])

  advanceGymRun(run)

  expect(currentOpponent(run).name).toBe('Wade')
  expect(isLeaderNext(run)).toBe(false)
  expect([0, 1, 2].map((index) => opponentStatus(run, index))).toEqual([
    'beaten',
    'next',
    'pending',
  ])

  advanceGymRun(run)

  expect(currentOpponent(run).name).toBe('Brock')
  expect(isLeaderNext(run), 'the leader is the last one standing').toBe(true)
  expect(isGymCleared(run)).toBe(false)

  advanceGymRun(run)

  expect(isGymCleared(run)).toBe(true)
})

test('Should carry a copy of the save into the run and hand the untouched one back', () => {
  const save = { money: 1, bag: { potion: 2 } }
  const run = createGymRun({ gym: gymById('pewter'), seed: 42, save })

  save.money = 999
  save.bag.potion = 0

  const restored = rollbackGymRun(run)

  expect(restored, 'the run holds its own copy, not a reference').toEqual({
    money: 1,
    bag: { potion: 2 },
  })
})

test('Should hand every battle of a run its own seed, and repeat it for the same run', () => {
  const gym = gymById('pewter')
  const run = createGymRun({ gym, seed: 1000, save: null })
  const seeds = []

  while (!isGymCleared(run)) {
    seeds.push(gymBattleSeed(run))
    advanceGymRun(run)
  }

  expect(new Set(seeds).size, 'three battles, three seeds').toBe(3)
  expect(
    gymBattleSeed(createGymRun({ gym, seed: 1000, save: null })),
    'the same run opens the same way twice',
  ).toBe(seeds[0])
})
