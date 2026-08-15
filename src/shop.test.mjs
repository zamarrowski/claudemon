import { expect, test } from 'vitest'
import { ITEM_MESSAGES, ITEMS } from './constants.mjs'
import { createPokemon } from './pokemon.mjs'
import { makeRng } from './rng.mjs'
import {
  SHOP_STOCK,
  addItem,
  ballsInBag,
  buy,
  countOf,
  countOfKind,
  itemsInBag,
  removeItem,
  usableOnParty,
  useItem,
} from './shop.mjs'
import { createSave } from './state.mjs'

const aSave = () =>
  createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) })

test('Should stock every item that carries a price and nothing else', () => {
  expect(SHOP_STOCK.length).toBeGreaterThan(0)

  for (const key of SHOP_STOCK) expect(ITEMS[key].price).toBeGreaterThan(0)
})

test('Should take the money for what is bought and add it to the bag', () => {
  const save = aSave()
  const before = countOf(save, 'poke-ball')

  const result = buy(save, 'poke-ball', 3)

  expect(result.ok).toBe(true)
  expect(countOf(save, 'poke-ball')).toBe(before + 3)
  expect(save.money).toBe(3000 - ITEMS['poke-ball'].price * 3)
})

test('Should refuse a purchase there is no money for and change nothing', () => {
  const save = aSave()

  save.money = 10

  const result = buy(save, 'poke-ball', 1)

  expect(result.ok).toBe(false)
  expect(result.reason).toBe(ITEM_MESSAGES.cannotAfford)
  expect(save.money).toBe(10)
  expect(countOf(save, 'poke-ball')).toBe(5)
})

test('Should count what is in the bag by kind and forget what runs out', () => {
  const save = aSave()

  addItem(save, 'potion', 2)

  expect(countOfKind(save, 'ball')).toBe(countOf(save, 'poke-ball'))
  expect(countOfKind(save, 'heal')).toBe(5)

  removeItem(save, 'potion', 5)

  expect(save.bag.potion, 'an empty stack leaves the bag').toBeUndefined()
  expect(countOf(save, 'potion')).toBe(0)
})

test('Should list the balls apart from everything else the bag holds', () => {
  const save = aSave()

  addItem(save, 'potion', 1)

  expect(ballsInBag(save)).toContain('poke-ball')
  expect(ballsInBag(save)).not.toContain('potion')
  expect(itemsInBag(save)).toEqual(
    expect.arrayContaining(['poke-ball', 'potion']),
  )
})

test('Should know which items a Pokemon can be given outside a battle', () => {
  expect(usableOnParty('potion')).toBe(true)
  expect(usableOnParty('poke-ball')).toBe(false)
})

test('Should use up an item only when it did something', () => {
  const save = aSave()
  const mon = createPokemon(1, 10, makeRng(2))

  const held = countOf(save, 'potion')

  mon.hp = 1

  expect(useItem(save, 'potion', mon).ok).toBe(true)
  expect(mon.hp).toBeGreaterThan(1)
  expect(countOf(save, 'potion')).toBe(held - 1)

  mon.hp = mon.stats.hp

  const refused = useItem(save, 'potion', mon)

  expect(refused.ok).toBe(false)
  expect(countOf(save, 'potion'), 'and stays in the bag').toBe(held - 1)
})

test('Should bring a fainted Pokemon back with a revive and refuse it otherwise', () => {
  const save = aSave()
  const mon = createPokemon(1, 10, makeRng(3))

  addItem(save, 'revive', 2)
  mon.hp = 0
  mon.status = 'poison'

  const revived = useItem(save, 'revive', mon)

  expect(revived.ok).toBe(true)
  expect(mon.hp).toBeGreaterThan(0)
  expect(mon.status).toBeNull()
  expect(countOf(save, 'revive')).toBe(1)

  expect(useItem(save, 'revive', mon).ok, 'not on one still up').toBe(false)
})

test('Should cure a status and say nothing happened when there is none', () => {
  const save = aSave()
  const mon = createPokemon(1, 10, makeRng(3))

  addItem(save, 'full-heal', 2)

  expect(useItem(save, 'full-heal', mon).ok).toBe(false)

  mon.status = 'poison'

  const cured = useItem(save, 'full-heal', mon)

  expect(cured.ok).toBe(true)
  expect(mon.status).toBeNull()
  expect(countOf(save, 'full-heal')).toBe(1)
})

test('Should evolve a Pokemon with the stone it answers to, and no other', () => {
  const save = aSave()
  const eevee = createPokemon(133, 20, makeRng(4))

  addItem(save, 'fire-stone', 1)
  addItem(save, 'leaf-stone', 1)

  expect(useItem(save, 'leaf-stone', eevee).ok, 'not that one').toBe(false)

  const evolved = useItem(save, 'fire-stone', eevee)

  expect(evolved.ok).toBe(true)
  expect(evolved.evolvedInto).toBe(136)
  expect(eevee.species).toBe(136)
})

test('Should say nothing happened for an item there is none of', () => {
  const save = aSave()
  const mon = createPokemon(1, 10, makeRng(3))

  expect(useItem(save, 'revive', mon).ok).toBe(false)
  expect(useItem(save, 'revive', mon).message).toMatch(/no Revive/i)
})
