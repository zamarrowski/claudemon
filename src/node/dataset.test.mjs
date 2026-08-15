import { expect, test } from 'vitest'
import { KANTO_TOTAL } from '../constants.mjs'
import { species } from '../data.mjs'
import { datasetIsReady, loadDataset, readDataset } from './dataset.mjs'

test('Should read the whole dataset off the disk and hand it to the engine', () => {
  const dataset = readDataset()

  expect(dataset.pokedex).toHaveLength(KANTO_TOTAL)
  expect(dataset.moves.tackle.power).toBeGreaterThan(0)
  expect(dataset.types.fire.half).toContain('water')
  expect(Object.keys(dataset.growth).length).toBeGreaterThan(0)
})

test('Should leave the engine able to answer for a species once it is loaded', () => {
  loadDataset()

  expect(datasetIsReady()).toBe(true)
  expect(species(25).name).toBe('Pikachu')
})
