import { DATA_NOT_LOADED } from './constants.mjs'

let dataset = null

const indexById = (pokedex) => new Map(pokedex.map((mon) => [mon.id, mon]))

export const initData = ({ pokedex, moves, types, growth }) => {
  dataset = { pokedex, byId: indexById(pokedex), moves, types, growth }

  return dataset
}

export const loadData = () => {
  if (!dataset) throw new Error(DATA_NOT_LOADED)

  return dataset
}

export const isDataReady = () => dataset != null

export const loadPokedex = () => loadData().pokedex

export const species = (id) => {
  const mon = loadData().byId.get(id)

  if (!mon) throw new Error(`no Pokemon with id ${id}`)

  return mon
}

export const hasSpecies = (id) => loadData().byId.has(id)

export const hasMove = (name) => Boolean(loadData().moves[name])

export const move = (name) => {
  const found = loadData().moves[name]

  if (!found) throw new Error(`no move named ${name}`)

  return found
}
