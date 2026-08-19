import { expect, test } from 'vitest'

import {
  beginCharge,
  beginRecharge,
  blockedByRecharge,
  cancelLock,
  isLocked,
  lockedMoveIndex,
  takeChargedMove,
} from './chargeMoves.mjs'
import { move as moveData } from './data.mjs'
import { createPokemon } from './pokemon.mjs'
import { makeRng } from './rng.mjs'
import { emptyVolatile } from './volatile.mjs'

const aBattle = () => {
  return {
    turn: 1,
    player: {
      mon: createPokemon(25, 30, makeRng(1)),
      volatile: emptyVolatile(),
    },
    foe: { mon: createPokemon(51, 30, makeRng(2)), volatile: emptyVolatile() },
  }
}

const aMove = (key) => {
  return { ...moveData(key), key }
}

const texts = (events) =>
  events.filter((event) => event.text).map((e) => e.text)

test('Should hold the user for a turn and hand the same move back on the next one', () => {
  const battle = aBattle()
  const events = []

  expect(beginCharge(battle, 'foe', aMove('dig'), 2, events)).toBe(true)
  expect(texts(events)).toEqual(['the wild Dugtrio burrowed underground!'])
  expect(isLocked(battle.foe)).toBe(true)
  expect(lockedMoveIndex(battle.foe), 'the flow replays that slot').toBe(2)

  const charged = takeChargedMove(battle.foe)

  expect(charged.name).toBe('Dig')
  expect(charged.power, 'at its full power, once').toBe(80)
  expect(isLocked(battle.foe), 'and the hole is spent').toBe(false)
  expect(
    beginCharge(battle, 'foe', charged, 2, events),
    'so it does not dig itself in again',
  ).toBe(false)
})

test('Should make the user sit out the turn after a recharge move, and only that one', () => {
  const battle = aBattle()
  const events = []

  beginRecharge(battle.foe, aMove('hyper-beam'), 1)

  expect(isLocked(battle.foe)).toBe(true)
  expect(lockedMoveIndex(battle.foe)).toBe(1)
  expect(takeChargedMove(battle.foe), 'there is nothing to fire').toBe(null)
  expect(blockedByRecharge(battle, 'foe', events)).toBe(true)
  expect(texts(events)).toEqual(['the wild Dugtrio must recharge!'])
  expect(
    blockedByRecharge(battle, 'foe', events),
    'and it is free again after it',
  ).toBe(false)
})

test('Should drop a charge that was interrupted instead of firing it later', () => {
  const battle = aBattle()

  beginCharge(battle, 'player', aMove('solar-beam'), 0, [])
  cancelLock(battle.player)

  expect(isLocked(battle.player)).toBe(false)
  expect(takeChargedMove(battle.player)).toBe(null)
})

test('Should leave a move that neither charges nor recharges alone', () => {
  const battle = aBattle()
  const events = []

  expect(beginCharge(battle, 'player', aMove('thunder-shock'), 0, events)).toBe(
    false,
  )

  beginRecharge(battle.player, aMove('thunder-shock'), 0)

  expect(isLocked(battle.player)).toBe(false)
  expect(blockedByRecharge(battle, 'player', events)).toBe(false)
  expect(events, 'and nothing is announced').toEqual([])
})
