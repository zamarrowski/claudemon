import { expect, test } from 'vitest'

import { FIXED_DAMAGE, baseDamage } from './damage.mjs'
import { makeRng } from './rng.mjs'

test('Should scale with the level, the power and the attack-to-defense ratio', () => {
  expect(baseDamage({ level: 50, power: 40, attack: 100, defense: 100 })).toBe(
    19,
  )

  expect(baseDamage({ level: 100, power: 40, attack: 100, defense: 100 })).toBe(
    35,
  )

  expect(baseDamage({ level: 50, power: 80, attack: 100, defense: 100 })).toBe(
    37,
  )

  expect(baseDamage({ level: 50, power: 40, attack: 200, defense: 100 })).toBe(
    37,
  )

  expect(baseDamage({ level: 50, power: 40, attack: 100, defense: 200 })).toBe(
    10,
  )
})

test('Should never drop below the flat bonus, however lopsided the stats', () => {
  expect(baseDamage({ level: 1, power: 1, attack: 1, defense: 999 })).toBe(2)
})

test('Should deal the damage the fixed-damage moves promise, whatever the stats', () => {
  const defender = { hp: 63 }

  expect(FIXED_DAMAGE['dragon-rage']({})).toBe(40)
  expect(FIXED_DAMAGE['sonic-boom']({})).toBe(20)
  expect(FIXED_DAMAGE['seismic-toss']({ attackerLevel: 27 })).toBe(27)
  expect(FIXED_DAMAGE['night-shade']({ attackerLevel: 27 })).toBe(27)
  expect(FIXED_DAMAGE['super-fang']({ defender })).toBe(31)
  expect(FIXED_DAMAGE['super-fang']({ defender: { hp: 1 } })).toBe(1)

  const wave = FIXED_DAMAGE.psywave({ attackerLevel: 20, rng: makeRng(3) })

  expect(wave).toBeGreaterThanOrEqual(1)
  expect(wave).toBeLessThanOrEqual(30)
})
