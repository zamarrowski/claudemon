import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import { expect, test } from 'vitest'
import {
  PARTY_LIMIT,
  TRADE_CODE_PREFIX,
  TRADE_MESSAGES,
  TRADE_VERSION,
} from '../constants.mjs'
import { canSpare } from '../helpers.mjs'
import { createPokemon, displayName, levelOf } from '../pokemon.mjs'
import { makeRng } from '../rng.mjs'
import { createSave } from '../state.mjs'
import { giveAway, newTradeId, takeIn } from '../trade.mjs'
import { decodeTrade, encodeTrade, writeTradeCode } from './trade.mjs'

const aSave = (name, starterId, seed) => {
  return createSave({ trainer: name, starterId, rng: makeRng(seed) })
}

const handOver = (save, source, index) => {
  const given = giveAway(save, source, index)

  if (!given.ok) return given

  return { ...given, code: encodeTrade(given.mon, save.trainer, newTradeId()) }
}

const codeFor = (payload) => {
  const body = deflateSync(JSON.stringify(payload)).toString('base64url')

  return `${TRADE_CODE_PREFIX}${body}`
}

const A_TRADED_MON = {
  species: 25,
  nickname: null,
  exp: 1728,
  ivs: {
    hp: 22,
    attack: 9,
    defense: 27,
    spAttack: 16,
    spDefense: 16,
    speed: 23,
  },
  hp: 30,
  moves: [{ move: 'thunder-shock', pp: 30, maxPp: 30 }],
  status: null,
  statusTurns: 0,
  shiny: false,
}

const FROM_MISTY = { name: 'MISTY', at: '2026-01-01T00:00:00.000Z' }

test('Should carry the exact Pokémon over to the other game and out of this one', () => {
  const ash = aSave('ASH', 1, 1)
  const gary = aSave('GARY', 4, 2)

  const sparky = createPokemon(25, 14, makeRng(7), true)

  sparky.nickname = 'SPARKY'
  sparky.hp = 5
  sparky.status = 'paralysis'
  sparky.moves[0].pp = 3
  ash.party.push(sparky)

  const given = handOver(ash, 'party', 1)
  const read = decodeTrade(given.code)
  const taken = takeIn(gary, read.trade)

  expect(given.code.startsWith(TRADE_CODE_PREFIX)).toBe(true)
  expect(ash.party).toHaveLength(1)
  expect(read.trade.from).toEqual({
    name: 'ASH',
    at: ash.trainer.startedAt,
  })

  expect(taken.where).toBe('party')
  expect(displayName(taken.mon)).toBe('SPARKY')
  expect(levelOf(taken.mon)).toBe(14)
  expect(taken.mon.ivs).toEqual(sparky.ivs)
  expect(taken.mon.stats).toEqual(sparky.stats)
  expect(taken.mon.hp).toBe(5)
  expect(taken.mon.status).toBe('paralysis')
  expect(taken.mon.shiny).toBe(true)
  expect(taken.mon.moves[0].pp).toBe(3)
  expect(gary.party).toHaveLength(2)
  expect(gary.dex.caught, 'a traded Pokémon fills in its dex entry').toContain(
    25,
  )
  expect(gary.dex.shiny).toContain(25)
})

test('Should keep the last Pokémon of the party where it is', () => {
  const ash = aSave('ASH', 1, 1)

  ash.box.push(createPokemon(16, 6, makeRng(3)))

  const refused = handOver(ash, 'party', 0)

  expect(refused.ok).toBe(false)
  expect(refused.reason).toBe(TRADE_MESSAGES.lastOne)
  expect(refused.code).toBeUndefined()
  expect(ash.party).toHaveLength(1)
  expect(canSpare(ash, 'party')).toBe(false)
  expect(canSpare(ash, 'box'), 'the box has no such rule').toBe(true)
})

test('Should give one away from the box and leave the party alone', () => {
  const ash = aSave('ASH', 1, 1)
  const gary = aSave('GARY', 4, 2)

  ash.box.push(createPokemon(16, 6, makeRng(3)))

  const given = handOver(ash, 'box', 0)

  expect(ash.box).toHaveLength(0)
  expect(ash.party).toHaveLength(1)

  expect(takeIn(gary, decodeTrade(given.code).trade).mon.species).toBe(16)
})

test('Should refuse a code that came out of your own game', () => {
  const ash = aSave('ASH', 1, 1)

  ash.party.push(createPokemon(25, 12, makeRng(7)))

  const given = handOver(ash, 'party', 1)
  const back = takeIn(ash, decodeTrade(given.code).trade)

  expect(back.ok).toBe(false)
  expect(back.reason).toBe(TRADE_MESSAGES.ownGame)
  expect(ash.party, 'the one you gave away stays gone').toHaveLength(1)
})

test('Should refuse the same code the second time it is pasted', () => {
  const ash = aSave('ASH', 1, 1)
  const gary = aSave('GARY', 4, 2)

  ash.party.push(createPokemon(25, 12, makeRng(7)))

  const given = handOver(ash, 'party', 1)

  takeIn(gary, decodeTrade(given.code).trade)

  const again = takeIn(gary, decodeTrade(given.code).trade)

  expect(again.ok).toBe(false)
  expect(again.reason).toBe(TRADE_MESSAGES.alreadyTaken)
  expect(gary.party, 'no second copy of it').toHaveLength(2)
})

test('Should refuse anything that is not a whole trade code', () => {
  const ash = aSave('ASH', 1, 1)

  ash.party.push(createPokemon(25, 12, makeRng(7)))

  const code = handOver(ash, 'party', 1).code

  for (const text of [
    '',
    'hello',
    'CMON1-',
    'CMON1-not-a-real-body',
    code.slice(0, 120),
    code.slice(0, code.length - 8),
  ]) {
    const read = decodeTrade(text)

    expect(read.ok, `"${text.slice(0, 20)}" should not read`).toBe(false)
    expect(read.reason).toBe(TRADE_MESSAGES.unreadable)
  }

  expect(decodeTrade(`  ${code}\n`).ok, 'stray whitespace is fine').toBe(true)
})

test('Should say so when the code comes from a newer claudemon', () => {
  const read = decodeTrade(
    codeFor({
      v: TRADE_VERSION + 1,
      id: 'abc123',
      mon: A_TRADED_MON,
      from: FROM_MISTY,
    }),
  )

  expect(read.ok).toBe(false)
  expect(read.reason).toBe(TRADE_MESSAGES.fromNewer)
})

test('Should refuse a code whose Pokémon has been tampered with', () => {
  const tampered = [
    ['a Pokémon that does not exist', { ...A_TRADED_MON, species: 999 }],
    ['experience that is not a number', { ...A_TRADED_MON, exp: 'lots' }],
    ['half a set of IVs', { ...A_TRADED_MON, ivs: { hp: 22 } }],
    ['no HP at all', { ...A_TRADED_MON, hp: null }],
    [
      'a move nobody knows',
      { ...A_TRADED_MON, moves: [{ move: 'hyper-nuke', pp: 5, maxPp: 5 }] },
    ],
  ]

  for (const [what, mon] of tampered) {
    const read = decodeTrade(
      codeFor({ v: TRADE_VERSION, id: 'abc123', mon, from: FROM_MISTY }),
    )

    expect(read.reason, what).toBe(TRADE_MESSAGES.unreadable)
  }

  const broken = [
    [
      'no id of its own',
      { v: TRADE_VERSION, id: null, mon: A_TRADED_MON, from: FROM_MISTY },
    ],
    [
      'no version at all',
      { id: 'abc123', mon: A_TRADED_MON, from: FROM_MISTY },
    ],
    [
      'nobody to have come from',
      { v: TRADE_VERSION, id: 'abc123', mon: A_TRADED_MON, from: {} },
    ],
  ]

  for (const [what, payload] of broken) {
    expect(decodeTrade(codeFor(payload)).reason, what).toBe(
      TRADE_MESSAGES.unreadable,
    )
  }

  expect(
    decodeTrade(
      codeFor({
        v: TRADE_VERSION,
        id: 'abc123',
        mon: A_TRADED_MON,
        from: FROM_MISTY,
      }),
    ).ok,
    'and read the honest one either way',
  ).toBe(true)
})

test('Should rebuild the stats rather than trust what the code claims', () => {
  const ash = aSave('ASH', 1, 1)
  const gary = aSave('GARY', 4, 2)
  const mon = createPokemon(25, 12, makeRng(7))

  const honest = mon.stats

  mon.hp = 9999
  mon.stats = { hp: 9999, attack: 9999 }
  mon.moves[0].pp = 9999
  ash.party.push(mon)

  const taken = takeIn(gary, decodeTrade(handOver(ash, 'party', 1).code).trade)

  expect(taken.mon.stats).toEqual(honest)
  expect(taken.mon.hp).toBe(honest.hp)
  expect(taken.mon.moves[0].pp).toBe(taken.mon.moves[0].maxPp)
})

test('Should send an arrival to the box when the team is already full', () => {
  const ash = aSave('ASH', 1, 1)
  const gary = aSave('GARY', 4, 2)

  ash.party.push(createPokemon(25, 12, makeRng(7)))

  while (gary.party.length < PARTY_LIMIT)
    gary.party.push(createPokemon(16, 5, makeRng(gary.party.length)))

  const taken = takeIn(gary, decodeTrade(handOver(ash, 'party', 1).code).trade)

  expect(taken.where).toBe('box')
  expect(gary.party).toHaveLength(PARTY_LIMIT)
  expect(gary.box).toHaveLength(1)
  expect(gary.dex.caught).toContain(25)
})

test('Should write the code out to a file of its own', () => {
  const path = join(tmpdir(), `claudemon-trade-${process.pid}.txt`)
  const ash = aSave('ASH', 1, 1)

  ash.party.push(createPokemon(25, 12, makeRng(7)))

  const code = handOver(ash, 'party', 1).code

  expect(writeTradeCode(code, path)).toBe(path)
  expect(readFileSync(path, 'utf8')).toBe(`${code}\n`)
})
