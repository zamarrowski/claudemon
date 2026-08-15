import { expect, test } from 'vitest'

import { decideOrder, pickFoeMove } from './foeAi.mjs'
import { emptyVolatile } from './volatile.mjs'

test('Should pick the foe move that scores best against the player types', () => {
  const battle = {
    player: { mon: { species: 4, stats: { speed: 50 }, status: null } },
    foe: {
      mon: {
        moves: [
          { move: 'tackle', pp: 35, maxPp: 35 },
          { move: 'water-gun', pp: 25, maxPp: 25 },
          { move: 'growl', pp: 40, maxPp: 40 },
        ],
      },
      volatile: emptyVolatile(),
    },
  }

  expect(pickFoeMove(battle)).toBe(1)
})

test('Should skip the slots the foe has no PP left for', () => {
  const battle = {
    player: { mon: { species: 4, stats: { speed: 50 }, status: null } },
    foe: {
      mon: {
        moves: [
          { move: 'tackle', pp: 35, maxPp: 35 },
          { move: 'water-gun', pp: 0, maxPp: 25 },
          { move: 'growl', pp: 40, maxPp: 40 },
        ],
      },
      volatile: emptyVolatile(),
    },
  }

  expect(pickFoeMove(battle)).toBe(0)
})

test('Should skip a disabled slot even when it scores best', () => {
  const battle = {
    player: { mon: { species: 4, stats: { speed: 50 }, status: null } },
    foe: {
      mon: {
        moves: [
          { move: 'tackle', pp: 35, maxPp: 35 },
          { move: 'water-gun', pp: 25, maxPp: 25 },
          { move: 'growl', pp: 40, maxPp: 40 },
        ],
      },
      volatile: { ...emptyVolatile(), disable: { index: 1, turns: 3 } },
    },
  }

  expect(pickFoeMove(battle)).toBe(0)
})

test('Should hold Self-Destruct back until the foe is worn down', () => {
  const battle = {
    player: { mon: { species: 4, stats: { speed: 50 }, status: null } },
    foe: {
      mon: {
        hp: 40,
        stats: { hp: 40 },
        moves: [
          { move: 'screech', pp: 40, maxPp: 40 },
          { move: 'self-destruct', pp: 5, maxPp: 5 },
        ],
      },
      volatile: emptyVolatile(),
    },
  }

  expect(pickFoeMove(battle), 'untouched, it screeches instead').toBe(0)

  battle.foe.mon.hp = 5

  expect(pickFoeMove(battle), 'on its last legs, it blows up').toBe(1)
})

test('Should let priority beat speed when deciding who moves first', () => {
  const battle = {
    rng: () => 0.2,
    player: {
      mon: {
        stats: { speed: 10 },
        status: null,
        moves: [{ move: 'quick-attack', pp: 30, maxPp: 30 }],
      },
      stages: { speed: 0 },
    },
    foe: {
      mon: {
        stats: { speed: 200 },
        status: null,
        moves: [{ move: 'tackle', pp: 35, maxPp: 35 }],
      },
      stages: { speed: 0 },
    },
  }

  expect(decideOrder(battle, 0, 0)).toBe(true)
})

test('Should fall back to effective speed when the priorities match', () => {
  const battle = {
    rng: () => 0.2,
    player: {
      mon: {
        stats: { speed: 100 },
        status: null,
        moves: [{ move: 'scratch', pp: 35, maxPp: 35 }],
      },
      stages: { speed: 0 },
    },
    foe: {
      mon: {
        stats: { speed: 200 },
        status: null,
        moves: [{ move: 'tackle', pp: 35, maxPp: 35 }],
      },
      stages: { speed: 0 },
    },
  }

  expect(decideOrder(battle, 0, 0)).toBe(false)

  battle.foe.mon.status = 'paralysis'

  expect(decideOrder(battle, 0, 0)).toBe(true)
})

test('Should break a dead heat with a coin flip', () => {
  const battle = {
    rng: () => 0.2,
    player: {
      mon: {
        stats: { speed: 100 },
        status: null,
        moves: [{ move: 'scratch', pp: 35, maxPp: 35 }],
      },
      stages: { speed: 0 },
    },
    foe: {
      mon: {
        stats: { speed: 100 },
        status: null,
        moves: [{ move: 'tackle', pp: 35, maxPp: 35 }],
      },
      stages: { speed: 0 },
    },
  }

  expect(decideOrder(battle, 0, 0)).toBe(true)

  battle.rng = () => 0.8

  expect(decideOrder(battle, 0, 0)).toBe(false)
})

test('Should treat a spent slot as having no priority at all', () => {
  const battle = {
    rng: () => 0.2,
    player: {
      mon: {
        stats: { speed: 10 },
        status: null,
        moves: [{ move: 'quick-attack', pp: 0, maxPp: 30 }],
      },
      stages: { speed: 0 },
    },
    foe: {
      mon: {
        stats: { speed: 200 },
        status: null,
        moves: [{ move: 'tackle', pp: 35, maxPp: 35 }],
      },
      stages: { speed: 0 },
    },
  }

  expect(decideOrder(battle, 0, 0)).toBe(false)
})
