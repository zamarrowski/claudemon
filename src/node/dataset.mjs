import { readFileSync } from 'node:fs'
import { DATASET_FILES } from './constants.mjs'
import { initData } from '../data.mjs'
import { dataFile } from './paths.mjs'

const read = (name) => JSON.parse(readFileSync(dataFile(name), 'utf8'))

export const readDataset = () => {
  return {
    pokedex: read(DATASET_FILES.pokedex),
    moves: read(DATASET_FILES.moves),
    types: read(DATASET_FILES.types),
    growth: read(DATASET_FILES.growth),
  }
}

export const loadDataset = () => initData(readDataset())

export const datasetIsReady = () => {
  try {
    loadDataset()

    return true
  } catch {
    return false
  }
}
