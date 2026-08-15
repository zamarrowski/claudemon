import { expect, test } from 'vitest'
import { DATA_NOT_LOADED } from './constants.mjs'
import {
  hasMove,
  hasSpecies,
  initData,
  isDataReady,
  loadData,
  loadPokedex,
  move,
  species,
} from './data.mjs'

const dataset = loadData()

test('Should answer for the species and the moves it was given', () => {
  expect(isDataReady()).toBe(true)
  expect(loadPokedex().length).toBeGreaterThan(0)
  expect(species(1).name).toBe('Bulbasaur')
  expect(hasSpecies(1)).toBe(true)
  expect(hasSpecies(9999)).toBe(false)
  expect(move('tackle').power).toBeGreaterThan(0)
  expect(hasMove('tackle')).toBe(true)
  expect(hasMove('hyper-nuke')).toBe(false)
})

test('Should refuse to make up a species or a move it was never given', () => {
  expect(() => species(9999)).toThrow(/9999/)
  expect(() => move('hyper-nuke')).toThrow(/hyper-nuke/)
})

test('Should say the dataset is missing rather than answer from nothing', () => {
  initData({ pokedex: [], moves: {}, types: {}, growth: {} })

  expect(loadPokedex()).toEqual([])
  expect(hasSpecies(1)).toBe(false)

  initData(dataset)

  expect(DATA_NOT_LOADED).toMatch(/dataset/)
  expect(species(1).name, 'and reads again once it is back').toBe('Bulbasaur')
})
