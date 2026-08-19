import { expect, test } from 'vitest'
import {
  DAYCARE_EXP_PER_STEP,
  DAYCARE_MESSAGES,
  EGG_LEVEL,
  EGG_STEPS,
  IV_MAX,
} from './constants.mjs'
import {
  areCompatible,
  daycareCandidates,
  eggFromPair,
  eggIsReady,
  eggProgress,
  hatchEgg,
  leaveAtDaycare,
  pairIsCompatible,
  raiseDaycare,
  takeBackFromDaycare,
  walkEgg,
} from './daycare.mjs'
import { expForLevel } from './exp.mjs'
import { createPokemon, levelOf } from './pokemon.mjs'
import { makeRng } from './rng.mjs'

const DITTO = 132
const MAGNEMITE = 81
const PORYGON = 137
const TAUROS = 128
const CHANSEY = 113
const MEWTWO = 150
const NIDORAN_F = 29
const NIDORINO = 33
const BULBASAUR = 1
const MAGIKARP = 129
const IVYSAUR = 2
const PIKACHU = 25
const RATTATA = 19

const aMon = (speciesId, gender = null, level = 10) => {
  const mon = createPokemon(speciesId, level, makeRng(7))

  if (gender === 'female') mon.ivs.attack = 0
  if (gender === 'male') mon.ivs.attack = IV_MAX

  return mon
}

const aSave = ({
  party = [aMon(PIKACHU)],
  box = [],
  slots = [],
  egg = null,
}) => {
  return { party, box, daycare: { slots, egg } }
}

test('Should give Ditto an egg with anything that can breed at all, whatever its gender', () => {
  expect(
    areCompatible(aMon(DITTO), aMon(MAGNEMITE)),
    'a genderless one has no other partner',
  ).toBe(true)
  expect(
    areCompatible(aMon(DITTO), aMon(TAUROS)),
    'an always-male one has no other partner',
  ).toBe(true)
  expect(
    areCompatible(aMon(CHANSEY), aMon(DITTO)),
    'an always-female one has no other partner, either way round',
  ).toBe(true)
  expect(areCompatible(aMon(DITTO), aMon(PIKACHU, 'male'))).toBe(true)
})

test('Should refuse two Dittos, and refuse a legendary even with a Ditto', () => {
  expect(areCompatible(aMon(DITTO), aMon(DITTO))).toBe(false)
  expect(areCompatible(aMon(DITTO), aMon(MEWTWO))).toBe(false)
  expect(areCompatible(aMon(MEWTWO), aMon(MEWTWO))).toBe(false)
})

test('Should give one evolution line an egg only when the two are opposite genders', () => {
  expect(
    areCompatible(aMon(BULBASAUR, 'female'), aMon(IVYSAUR, 'male')),
    'the same line at different stages still counts as the same line',
  ).toBe(true)
  expect(areCompatible(aMon(BULBASAUR, 'male'), aMon(IVYSAUR, 'male'))).toBe(
    false,
  )
  expect(
    areCompatible(aMon(MAGNEMITE), aMon(MAGNEMITE)),
    'two genderless ones of one line have no gender to pair off',
  ).toBe(false)
})

test('Should pair the two Nidoran lines with each other despite their separate entries', () => {
  expect(areCompatible(aMon(NIDORAN_F), aMon(NIDORINO))).toBe(true)
})

test('Should refuse two unrelated lines even when their genders are opposite', () => {
  expect(areCompatible(aMon(PIKACHU, 'female'), aMon(RATTATA, 'male'))).toBe(
    false,
  )
  expect(areCompatible(aMon(MAGNEMITE), aMon(PORYGON))).toBe(false)
})

test('Should hold off on an egg until both slots are filled', () => {
  const save = aSave({ slots: [aMon(DITTO)] })

  expect(pairIsCompatible(save)).toBe(false)
  expect(eggFromPair(save, makeRng(1))).toBeNull()

  save.daycare.slots.push(aMon(PIKACHU))

  expect(pairIsCompatible(save)).toBe(true)
  expect(eggFromPair(save, makeRng(1))).not.toBeNull()
})

test('Should lay the egg as the mother base form, and as the other parent when Ditto is one', () => {
  const withDitto = aSave({ slots: [aMon(DITTO), aMon(IVYSAUR, 'male')] })
  const sameLine = aSave({
    slots: [aMon(IVYSAUR, 'female'), aMon(BULBASAUR, 'male')],
  })
  const nidoran = aSave({ slots: [aMon(NIDORINO), aMon(NIDORAN_F)] })

  expect(
    eggFromPair(withDitto, makeRng(1)).species,
    'a male paired with Ditto still fills the egg',
  ).toBe(BULBASAUR)
  expect(
    eggFromPair(sameLine, makeRng(1)).species,
    'an evolved mother lays her base form',
  ).toBe(BULBASAUR)
  expect(
    eggFromPair(nidoran, makeRng(1)).species,
    'the mother decides, so the female line wins',
  ).toBe(NIDORAN_F)
})

test('Should keep the one egg it has rather than laying another on top of it', () => {
  const save = aSave({ slots: [aMon(DITTO), aMon(PIKACHU)] })
  const first = eggFromPair(save, makeRng(1))

  expect(eggFromPair(save, makeRng(2))).toBeNull()
  expect(save.daycare.egg).toBe(first)
})

test('Should hatch the egg only once it has come the whole way', () => {
  const save = aSave({ slots: [aMon(DITTO), aMon(PIKACHU)] })
  const egg = eggFromPair(save, makeRng(1))

  expect(eggIsReady(egg)).toBe(false)
  expect(eggProgress(egg)).toBe(0)

  for (let step = 0; step < EGG_STEPS - 1; step++) walkEgg(egg)

  expect(eggIsReady(egg), 'one step short is still an egg').toBe(false)

  walkEgg(egg)

  expect(eggIsReady(egg)).toBe(true)
  expect(eggProgress(egg)).toBe(1)

  walkEgg(egg)

  expect(egg.steps, 'and it never counts past the end').toBe(EGG_STEPS)
})

test('Should hatch what the egg was carrying, shiny and all, at the level an egg hatches', () => {
  const shinyEgg = { species: PIKACHU, steps: EGG_STEPS, shiny: true }
  const hatched = hatchEgg(shinyEgg, makeRng(3))

  expect(hatched.species).toBe(PIKACHU)
  expect(levelOf(hatched)).toBe(EGG_LEVEL)
  expect(hatched.shiny).toBe(true)
  expect(hatched.hp).toBe(hatched.stats.hp)
  expect(
    hatched.moves.length,
    'it knows what it would know at that level',
  ).toBeGreaterThan(0)
})

test('Should roll the egg shiny on a seed that comes up short of the odds', () => {
  const save = aSave({ slots: [aMon(DITTO), aMon(PIKACHU)] })
  const egg = eggFromPair(save, () => 0)

  expect(egg.shiny).toBe(true)
})

test('Should leave the egg alone on a roll above the odds', () => {
  const save = aSave({ slots: [aMon(DITTO), aMon(PIKACHU)] })

  expect(eggFromPair(save, () => 0.5).shiny).toBe(false)
})

test('Should raise whoever waits, and restat them on the level they reach', () => {
  const mon = aMon(PIKACHU, 'male', 5)
  const save = aSave({ slots: [mon] })
  const before = { exp: mon.exp, level: levelOf(mon), attack: mon.stats.attack }

  raiseDaycare(save)

  expect(mon.exp).toBe(before.exp + DAYCARE_EXP_PER_STEP)

  let steps = 1

  while (levelOf(mon) === before.level && steps++ < 5000) raiseDaycare(save)

  expect(levelOf(mon), 'it grew where it stood').toBe(before.level + 1)
  expect(
    mon.stats.attack,
    'and the new level shows in the stats',
  ).toBeGreaterThan(before.attack)
})

test('Should teach whoever waits the move that comes with the level it reaches', () => {
  const mon = aMon(MAGIKARP, null, 14)

  mon.exp = expForLevel(MAGIKARP, 15) - 1

  const save = aSave({ slots: [mon] })
  const steps = raiseDaycare(save)

  expect(levelOf(mon)).toBe(15)
  expect(steps).toMatchObject([
    { kind: 'learn', move: 'tackle', forgot: null, name: 'Magikarp' },
  ])
  expect(mon.moves.map((slot) => slot.move)).toEqual(['splash', 'tackle'])
})

test('Should drop the oldest move of one that waits with all four slots taken', () => {
  const mon = aMon(BULBASAUR, null, 19)

  mon.exp = expForLevel(BULBASAUR, 20) - 1

  const save = aSave({ slots: [mon] })

  expect(mon.moves.map((slot) => slot.move)).toEqual([
    'tackle',
    'growl',
    'leech-seed',
    'vine-whip',
  ])

  const steps = raiseDaycare(save)

  expect(steps).toMatchObject([
    { kind: 'learn', move: 'poison-powder', forgot: 'tackle' },
  ])
  expect(
    mon.moves.map((slot) => slot.move),
    'nobody was there to be asked, so the one it has known longest goes',
  ).toEqual(['growl', 'leech-seed', 'vine-whip', 'poison-powder'])
})

test('Should stop feeding EXP to one that is already at the highest level', () => {
  const mon = aMon(PIKACHU, 'male', 100)
  const save = aSave({ slots: [mon] })
  const before = mon.exp

  raiseDaycare(save)

  expect(mon.exp).toBe(before)
})

test('Should take one out of the team or the box and put it in a slot', () => {
  const box = [aMon(RATTATA), aMon(MAGNEMITE)]
  const save = aSave({ party: [aMon(PIKACHU), aMon(BULBASAUR)], box })

  expect(daycareCandidates(save).map((entry) => entry.source)).toEqual([
    'party',
    'party',
    'box',
    'box',
  ])

  const fromBox = leaveAtDaycare(save, 'box', 1)

  expect(fromBox.ok).toBe(true)
  expect(fromBox.mon.species).toBe(MAGNEMITE)
  expect(save.box.map((mon) => mon.species)).toEqual([RATTATA])

  const fromParty = leaveAtDaycare(save, 'party', 0)

  expect(fromParty.ok).toBe(true)
  expect(save.party.map((mon) => mon.species)).toEqual([BULBASAUR])
  expect(save.daycare.slots.map((mon) => mon.species)).toEqual([
    MAGNEMITE,
    PIKACHU,
  ])
})

test('Should keep the last Pokemon of the team out of the day care, and stop at two', () => {
  const save = aSave({ party: [aMon(PIKACHU)], box: [aMon(RATTATA)] })

  expect(leaveAtDaycare(save, 'party', 0)).toEqual({
    ok: false,
    reason: DAYCARE_MESSAGES.lastOne,
  })
  expect(save.daycare.slots).toEqual([])

  save.daycare.slots = [aMon(DITTO), aMon(BULBASAUR)]

  expect(leaveAtDaycare(save, 'box', 0)).toEqual({
    ok: false,
    reason: DAYCARE_MESSAGES.bothTaken,
  })
  expect(save.box).toHaveLength(1)
})

test('Should take one back into the team, or into the box when the team is full', () => {
  const roomy = aSave({ slots: [aMon(DITTO), aMon(PIKACHU)] })

  expect(takeBackFromDaycare(roomy, 0)).toMatchObject({ where: 'party' })
  expect(roomy.party.map((mon) => mon.species)).toEqual([PIKACHU, DITTO])
  expect(roomy.daycare.slots.map((mon) => mon.species)).toEqual([PIKACHU])

  const full = aSave({
    party: Array.from({ length: 6 }, () => aMon(RATTATA)),
    slots: [aMon(DITTO)],
  })
  const back = takeBackFromDaycare(full, 0)

  expect(back.where).toBe('box')
  expect(full.box.map((mon) => mon.species)).toEqual([DITTO])
})

test('Should keep the egg when a parent is taken back out', () => {
  const save = aSave({ slots: [aMon(DITTO), aMon(PIKACHU)] })
  const egg = eggFromPair(save, makeRng(1))

  takeBackFromDaycare(save, 0)

  expect(save.daycare.egg).toBe(egg)
  expect(pairIsCompatible(save), 'but there is no pair to lay another').toBe(
    false,
  )
})
