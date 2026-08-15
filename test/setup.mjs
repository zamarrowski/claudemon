import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DATASET_MISSING_MESSAGE } from '../src/node/constants.mjs'
import { initData } from '../src/data.mjs'

const bundled = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')

const read = (name) => JSON.parse(readFileSync(join(bundled, name), 'utf8'))

try {
  initData({
    pokedex: read('pokedex.json'),
    moves: read('moves.json'),
    types: read('types.json'),
    growth: read('growth.json'),
  })
} catch {
  throw new Error(DATASET_MISSING_MESSAGE)
}
