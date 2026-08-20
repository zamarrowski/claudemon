import { expect, test } from 'vitest'

import {
  chance,
  makeRng,
  pick,
  randInt,
  randomSeed,
  weightedPick,
} from '../src/rng.mjs'
import {
  rollEncounters,
  speciesTableFromDex,
  stepsFromPrompt,
  stepsWhileWorking,
} from '../src/encounter.mjs'

const CONFIG = {
  encounterChance: 0.12,
  trainerChance: 0,
  charsPerStep: 40,
  maxSteps: 4,
  workStepSeconds: 20,
}

const ALWAYS = {
  encounterChance: 1,
  trainerChance: 0,
  charsPerStep: 40,
  maxSteps: 4,
  workStepSeconds: 20,
}

const NEVER = {
  encounterChance: 0,
  trainerChance: 0,
  charsPerStep: 40,
  maxSteps: 4,
  workStepSeconds: 20,
}

const TRAINERS = {
  encounterChance: 1,
  trainerChance: 1,
  charsPerStep: 40,
  maxSteps: 4,
  workStepSeconds: 20,
}

const DEX = [
  { id: 16, name: 'Pidgey', stage: 0, captureRate: 255 },
  { id: 17, name: 'Pidgeotto', stage: 1, captureRate: 120 },
  { id: 18, name: 'Pidgeot', stage: 2, captureRate: 45 },
  { id: 144, name: 'Articuno', stage: 0, captureRate: 3, legendary: true },
]

const PIDGEY_LINE = [
  { id: 16, name: 'Pidgey', weight: 10 },
  { id: 17, name: 'Pidgeotto', weight: 10 },
  { id: 18, name: 'Pidgeot', weight: 10 },
  { id: 144, name: 'Articuno', weight: 10 },
]

const PIKACHU_ONLY = [{ id: 25, name: 'Pikachu', weight: 1 }]

const exhausted = () => 1
const lowest = () => 0

const draws = (rng, count, fn) => {
  const out = []

  for (let i = 0; i < count; i++) out.push(fn(rng))

  return out
}

const namesOf = (table) => {
  return table.map((entry) => entry.name).sort()
}

const weightOf = (table, name) => {
  return table.find((entry) => entry.name === name).weight
}

test('Should replay the same numbers for the same seed, and different ones for another', () => {
  const a = draws(makeRng(1234), 20, (rng) => rng())
  const b = draws(makeRng(1234), 20, (rng) => rng())
  const c = draws(makeRng(1235), 20, (rng) => rng())

  expect(a, 'a seed is a promise about the whole sequence').toEqual(b)
  expect(a).not.toEqual(c)
})

test('Should give every number as a fraction below one', () => {
  for (const value of draws(makeRng(7), 500, (rng) => rng())) {
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
  }
})

test('Should make a fresh seed a plain unsigned 32-bit number', () => {
  for (let i = 0; i < 50; i++) {
    const seed = randomSeed()

    expect(Number.isInteger(seed), `${seed} is not whole`).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThanOrEqual(0xffffffff)
  }
})

test('Should cover both ends of a range and never leave it', () => {
  const rolled = new Set(draws(makeRng(3), 500, (rng) => randInt(rng, 1, 6)))

  expect([...rolled].sort(), 'a die needs all six faces').toEqual([
    1, 2, 3, 4, 5, 6,
  ])
})

test('Should make a range of one no choice at all', () => {
  const rng = makeRng(11)

  for (let i = 0; i < 20; i++) expect(randInt(rng, 4, 4)).toBe(4)
})

test('Should honour both a certainty and an impossibility', () => {
  const rng = makeRng(5)

  for (let i = 0; i < 100; i++) {
    expect(chance(rng, 1)).toBe(true)
    expect(chance(rng, 0)).toBe(false)
  }
})

test('Should always come back with something from the bag', () => {
  const items = ['a', 'b', 'c']

  for (const got of draws(makeRng(9), 200, (rng) => pick(rng, items))) {
    expect(items).toContain(got)
  }
})

test('Should let weight decide how often, and a weight of zero mean never', () => {
  const items = [
    { name: 'common', weight: 90 },
    { name: 'rare', weight: 10 },
    { name: 'impossible', weight: 0 },
  ]
  const counts = { common: 0, rare: 0, impossible: 0 }
  const rng = makeRng(42)

  for (let i = 0; i < 2000; i++) {
    counts[weightedPick(rng, items, (item) => item.weight).name]++
  }

  expect(counts.impossible, 'no weight, no appearances').toBe(0)
  expect(counts.common).toBeGreaterThan(counts.rare * 4)
  expect(counts.common + counts.rare).toBe(2000)
})

test('Should fall back on a plain uniform pick when nothing has weight', () => {
  const items = [{ w: 0 }, { w: 0 }, { w: 0 }]
  const seen = new Set()
  const rng = makeRng(13)

  for (let i = 0; i < 200; i++) {
    seen.add(items.indexOf(weightedPick(rng, items, (item) => item.w)))
  }

  expect(
    [...seen].sort(),
    'all three should still turn up as real members',
  ).toEqual([0, 1, 2])
})

test('Should fall back on the last item when a roll lands past the end', () => {
  const items = [{ w: 1 }, { w: 1 }, { w: 1 }]

  expect(weightedPick(exhausted, items, (item) => item.w)).toBe(items[2])
})

test('Should skip a weightless item even on a roll of exactly nothing', () => {
  const items = [
    { name: 'weightless', w: 0 },
    { name: 'real', w: 1 },
  ]

  expect(
    weightedPick(lowest, items, (item) => item.w).name,
    'landing on its edge is not landing on it',
  ).toBe('real')
})

test('Should walk a prompt at least one step and never more than the cap', () => {
  expect(stepsFromPrompt(0, CONFIG), 'even nothing is worth a step').toBe(1)
  expect(stepsFromPrompt(1, CONFIG)).toBe(1)
  expect(stepsFromPrompt(40, CONFIG)).toBe(1)
  expect(stepsFromPrompt(41, CONFIG), 'one character over is a step over').toBe(
    2,
  )
  expect(stepsFromPrompt(160, CONFIG)).toBe(4)
  expect(stepsFromPrompt(100000, CONFIG), 'the cap holds').toBe(CONFIG.maxSteps)
})

test('Should walk a step per interval while working and leave the rest on the clock', () => {
  expect(stepsWhileWorking(0, CONFIG)).toEqual({ steps: 0, leftoverMs: 0 })
  expect(stepsWhileWorking(19_999, CONFIG)).toEqual({
    steps: 0,
    leftoverMs: 19_999,
  })
  expect(stepsWhileWorking(20_000, CONFIG)).toEqual({
    steps: 1,
    leftoverMs: 0,
  })
  expect(
    stepsWhileWorking(50_000, CONFIG),
    'the leftover ten seconds stay on the clock',
  ).toEqual({ steps: 2, leftoverMs: 10_000 })
  expect(
    stepsWhileWorking(200_000, CONFIG).steps,
    'a long stretch walks every step of it, the pool caps the total',
  ).toBe(10)
})

test('Should never walk a session with no step interval', () => {
  expect(
    stepsWhileWorking(999_999, {
      encounterChance: 0.12,
      charsPerStep: 40,
      maxSteps: 4,
      workStepSeconds: 0,
    }),
  ).toEqual({ steps: 0, leftoverMs: 0 })
  expect(stepsWhileWorking(999_999, { maxSteps: 4 })).toEqual({
    steps: 0,
    leftoverMs: 0,
  })
})

test('Should fill the grass one gate at a time as the lead grows, and not a level sooner', () => {
  expect(
    namesOf(speciesTableFromDex(DEX, 5)),
    'a rookie meets only first stages',
  ).toEqual(['Pidgey'])
  expect(namesOf(speciesTableFromDex(DEX, 15))).toEqual(['Pidgey'])
  expect(
    namesOf(speciesTableFromDex(DEX, 16)),
    'sixteen opens the middles',
  ).toEqual(['Pidgeotto', 'Pidgey'])
  expect(namesOf(speciesTableFromDex(DEX, 31))).toEqual(['Pidgeotto', 'Pidgey'])
  expect(namesOf(speciesTableFromDex(DEX, 32))).toEqual([
    'Pidgeot',
    'Pidgeotto',
    'Pidgey',
  ])
  expect(
    namesOf(speciesTableFromDex(DEX, 39)),
    'the legendary waits for forty',
  ).toEqual(['Pidgeot', 'Pidgeotto', 'Pidgey'])
  expect(namesOf(speciesTableFromDex(DEX, 40))).toEqual([
    'Articuno',
    'Pidgeot',
    'Pidgeotto',
    'Pidgey',
  ])
})

test('Should show up more often the easier one is to catch', () => {
  const table = speciesTableFromDex(DEX, 40)

  expect(weightOf(table, 'Pidgey'), 'sqrt(255) doubled and rounded').toBe(32)
  expect(weightOf(table, 'Pidgeotto')).toBe(22)
  expect(weightOf(table, 'Pidgeot')).toBe(13)
  expect(weightOf(table, 'Articuno')).toBe(3)
})

test('Should treat a species with no catch rate as an ordinary one', () => {
  const [entry] = speciesTableFromDex(
    [{ id: 1, name: 'Nameless', stage: 0 }],
    5,
  )

  expect(entry.weight, 'the same weight a captureRate of 45 would give').toBe(
    13,
  )
})

test('Should never leave the grass empty when no stage has opened yet', () => {
  const table = speciesTableFromDex([{ id: 18, name: 'Pidgeot', stage: 2 }], 5)

  expect(
    namesOf(table),
    'an empty table would mean nothing ever appears, so it falls back on the built-in list',
  ).toContain('Rattata')
})

test('Should walk the grass empty when there is no chance of an encounter', () => {
  const found = rollEncounters({
    steps: 100,
    leadLevel: 10,
    rng: makeRng(1),
    config: NEVER,
    species: PIDGEY_LINE,
  })

  expect(found).toEqual([])
})

test('Should walk into a trainer rather than a lone Pokemon when the trainer roll lands', () => {
  const found = rollEncounters({
    steps: 3,
    leadLevel: 30,
    rng: makeRng(21),
    config: TRAINERS,
    species: PIKACHU_ONLY,
  })

  expect(found).toHaveLength(3)

  for (const one of found) {
    expect(one.kind).toBe('trainer')
    expect(one.species, 'a trainer is not a species').toBeUndefined()
    expect(one.trainer.class).toBeTruthy()
    expect(one.trainer.name).toBeTruthy()
    expect(one.trainer.team.length).toBeGreaterThanOrEqual(1)
    expect(one.trainer.team.length).toBeLessThanOrEqual(3)

    for (const mon of one.trainer.team) expect(mon.species).toBe(25)
  }
})

test('Should meet a certain encounter once per step, and have it look like one', () => {
  const found = rollEncounters({
    steps: 3,
    leadLevel: 10,
    rng: makeRng(2),
    config: ALWAYS,
    species: PIKACHU_ONLY,
  })

  expect(found).toHaveLength(3)

  for (const one of found) {
    expect(one.v).toBe(1)
    expect(one.kind).toBe('wild')
    expect(one.species).toBe(25)
    expect(one.name).toBe('Pikachu')
    expect(Number.isInteger(one.seed), `${one.seed} is not a whole seed`).toBe(
      true,
    )
    expect(one.seed).toBeGreaterThanOrEqual(0)
    expect(one.seed).toBeLessThanOrEqual(0xffffffff)
    expect(one.shiny, 'an ordinary walk turns up ordinary colours').toBe(false)
  }
})

test('Should hand the encounter its shiny colours when the rare draw lands', () => {
  const [one] = rollEncounters({
    steps: 1,
    leadLevel: 10,
    rng: lowest,
    config: ALWAYS,
    species: PIKACHU_ONLY,
  })

  expect(one.shiny, 'the lowest draw there is clears any odds').toBe(true)
})

test('Should send out of the grass something worth fighting at your level', () => {
  const found = rollEncounters({
    steps: 200,
    leadLevel: 20,
    rng: makeRng(4),
    config: ALWAYS,
    species: PIKACHU_ONLY,
  })

  for (const one of found) {
    expect(
      one.level,
      `level ${one.level} is off the band`,
    ).toBeGreaterThanOrEqual(17)
    expect(one.level).toBeLessThanOrEqual(22)
  }
})

test('Should never ask for a level below two nor above a hundred', () => {
  const rookie = rollEncounters({
    steps: 200,
    leadLevel: 1,
    rng: makeRng(6),
    config: ALWAYS,
    species: PIKACHU_ONLY,
  })
  const champion = rollEncounters({
    steps: 200,
    leadLevel: 100,
    rng: makeRng(6),
    config: ALWAYS,
    species: PIKACHU_ONLY,
  })

  for (const one of rookie) {
    expect(one.level).toBeGreaterThanOrEqual(2)
    expect(one.level).toBeLessThanOrEqual(3)
  }

  for (const one of champion) {
    expect(one.level).toBeGreaterThanOrEqual(97)
    expect(one.level).toBeLessThanOrEqual(100)
  }
})

test('Should keep to the starter range with no lead at all', () => {
  const found = rollEncounters({
    steps: 200,
    leadLevel: 0,
    rng: makeRng(8),
    config: ALWAYS,
    species: PIKACHU_ONLY,
  })

  for (const one of found) {
    expect(one.level).toBeGreaterThanOrEqual(2)
    expect(one.level).toBeLessThanOrEqual(5)
  }
})

test('Should walk the same grass for the same seed, and another one for a different seed', () => {
  const walk = rollEncounters({
    steps: 50,
    leadLevel: 12,
    rng: makeRng(99),
    config: CONFIG,
    species: PIDGEY_LINE,
  })
  const replay = rollEncounters({
    steps: 50,
    leadLevel: 12,
    rng: makeRng(99),
    config: CONFIG,
    species: PIDGEY_LINE,
  })
  const elsewhere = rollEncounters({
    steps: 50,
    leadLevel: 12,
    rng: makeRng(100),
    config: CONFIG,
    species: PIDGEY_LINE,
  })

  expect(walk, 'a replay is the same walk').toEqual(replay)
  expect(walk).not.toEqual(elsewhere)
})
