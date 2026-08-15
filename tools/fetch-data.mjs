import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import {
  BUNDLED_DATA_DIR,
  DATA_DIR,
  bundledDataFile,
} from '../src/node/paths.mjs'
import { loadPokedex } from '../src/data.mjs'
import { datasetIsReady } from '../src/node/dataset.mjs'
import { bold, brightGreen, dim } from '../src/node/ansi.mjs'
import { pass as runPass } from './progress.mjs'
import {
  transformRequestWriteGrowth,
  transformRequestWriteMoves,
  transformRequestWritePokedex,
  transformRequestWriteTypes,
  transformResponseEvolutionChain,
  transformResponseGrowthRate,
  transformResponseMove,
  transformResponsePokemon,
  transformResponseSpecies,
  transformResponseType,
} from './transformers.mjs'
import {
  CONCURRENCY,
  DATASET_BUILDING_HEADING,
  DATASET_READY_HEADING,
  KANTO,
  LABEL_WIDTH,
  MAX_ATTEMPTS,
  MIN_REQUEST_INTERVAL_MS,
  OUTPUTS,
  POKEAPI_URL,
  RETRY_BACKOFF_MS,
  STAT_KEYS,
  THROTTLE_BACKOFF_MS,
  VERSION_GROUP,
} from './constants.mjs'

const CACHE_DIR = join(DATA_DIR, '.cache')

const useCache = !process.argv.includes('--no-cache')
const force = process.argv.includes('--force') || !useCache

let requests = 0
let cacheHits = 0
let throttled = 0

const datasetPresent = () => datasetIsReady() && loadPokedex().length === KANTO

const cachePath = (url) => {
  return join(CACHE_DIR, `${createHash('sha1').update(url).digest('hex')}.json`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let nextSlot = 0
let cooldownUntil = 0

const waitForSlot = async () => {
  const slot = Math.max(Date.now(), nextSlot, cooldownUntil)
  nextSlot = slot + MIN_REQUEST_INTERVAL_MS

  for (
    let delay = slot - Date.now();
    delay > 0;
    delay = cooldownUntil - Date.now()
  ) {
    await sleep(delay)
  }
}

const getJson = async (url, transform) => {
  const cached = cachePath(url)

  if (useCache && existsSync(cached)) {
    cacheHits++

    return transform(JSON.parse(readFileSync(cached, 'utf8')))
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await waitForSlot()

      const response = await fetch(url)

      if (response.status === 429 || response.status === 503) {
        const after = Number(response.headers.get('retry-after'))
        const pause =
          Number.isFinite(after) && after > 0
            ? after * 1000
            : THROTTLE_BACKOFF_MS * attempt ** 2
        cooldownUntil = Math.max(cooldownUntil, Date.now() + pause)
        throttled++
        throw new Error(
          `HTTP ${response.status}, waiting ${Math.round(pause / 1000)}s`,
        )
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const body = await response.json()

      requests++
      writeFileSync(cached, JSON.stringify(body))

      return transform(body)
    } catch (error) {
      if (attempt === MAX_ATTEMPTS)
        throw new Error(`${url}: ${error.message}`, { cause: error })

      await sleep(RETRY_BACKOFF_MS * attempt ** 2)
    }
  }

  throw new Error(`${url}: gave up after ${MAX_ATTEMPTS} attempts`)
}

const pass = (label, items, worker) => {
  return runPass(label, items, worker, CONCURRENCY)
}

const getPokemonOrSpecies = (url, index, pokemonCount) => {
  if (index < pokemonCount) return getJson(url, transformResponsePokemon)

  return getJson(url, transformResponseSpecies)
}

const readStats = (entry) => {
  const stats = {}

  for (const item of entry.stats) {
    const key = STAT_KEYS[item.stat.name]

    if (key) stats[key] = item.base_stat
  }

  return stats
}

const readLearnset = (entry) => {
  const learnset = []

  for (const item of entry.moves) {
    for (const detail of item.version_group_details) {
      if (detail.version_group.name !== VERSION_GROUP) continue
      if (detail.move_learn_method.name !== 'level-up') continue

      learnset.push({ level: detail.level_learned_at, move: item.move.name })
    }
  }

  learnset.sort((a, b) => a.level - b.level || a.move.localeCompare(b.move))

  return learnset
}

const idFromUrl = (url) => {
  const match = /\/(\d+)\/?$/.exec(url)

  return match ? Number(match[1]) : null
}

const readEvolutions = (chain, out) => {
  const fromId = idFromUrl(chain.species.url)

  for (const next of chain.evolves_to) {
    const toId = idFromUrl(next.species.url)
    const [detail] = next.evolution_details

    const evolution = {
      to: toId,
      trigger: detail?.trigger?.name ?? 'level-up',
      level: detail?.min_level ?? null,
      item: detail?.item?.name ?? null,
    }

    if (!out.has(fromId)) out.set(fromId, [])

    out.get(fromId).push(evolution)
    readEvolutions(next, out)
  }

  return out
}

const stageOf = (id, evolvesFrom) => {
  let stage = 0
  let cursor = id

  while (evolvesFrom.has(cursor) && stage < 2) {
    cursor = evolvesFrom.get(cursor)
    stage++
  }

  return stage
}

const moveAilment = (move) => {
  const name = move.meta?.ailment?.name

  if (!name) return null
  if (name === 'none') return null

  return name
}

const main = async () => {
  if (!force && datasetPresent()) {
    console.log(bold(DATASET_READY_HEADING))

    for (const name of OUTPUTS) console.log(`  ${brightGreen('✔')} ${name}`)

    console.log(dim(`\n  ${BUNDLED_DATA_DIR}`))
    console.log(
      `\n  Rebuild it with ${bold('--force')}, or refetch from PokeAPI with ${bold('--no-cache')}.\n`,
    )

    return
  }

  mkdirSync(CACHE_DIR, { recursive: true })
  mkdirSync(BUNDLED_DATA_DIR, { recursive: true })

  console.log(bold(DATASET_BUILDING_HEADING))

  const ids = Array.from({ length: KANTO }, (_, i) => i + 1)

  const both = await pass(
    'pokemon',
    [
      ...ids.map((id) => `${POKEAPI_URL}/pokemon/${id}`),
      ...ids.map((id) => `${POKEAPI_URL}/pokemon-species/${id}`),
    ],
    (url, index) => getPokemonOrSpecies(url, index, ids.length),
  )

  const pokemon = both.slice(0, ids.length)
  const species = both.slice(ids.length)

  const chainUrls = [
    ...new Set(species.map((entry) => entry.evolution_chain.url)),
  ]

  const chains = await pass('evolutions', chainUrls, (url) =>
    getJson(url, transformResponseEvolutionChain),
  )

  const fullEvolutions = new Map()

  for (const chain of chains) readEvolutions(chain.chain, fullEvolutions)

  const evolutions = new Map()

  for (const [fromId, list] of fullEvolutions) {
    if (fromId > KANTO) continue

    const withinKanto = list.filter((evolution) => evolution.to <= KANTO)

    if (withinKanto.length > 0) evolutions.set(fromId, withinKanto)
  }

  const learnsets = pokemon.map(readLearnset)

  const moveNames = [
    ...new Set(learnsets.flat().map((item) => item.move)),
  ].sort()

  const moveData = await pass('moves', moveNames, (name) =>
    getJson(`${POKEAPI_URL}/move/${name}`, transformResponseMove),
  )

  const typeNames = [
    ...new Set([
      ...pokemon.flatMap((entry) => entry.types.map((item) => item.type.name)),
      ...moveData.map((move) => move.type.name),
    ]),
  ].sort()

  const typeData = await pass('types', typeNames, (name) =>
    getJson(`${POKEAPI_URL}/type/${name}`, transformResponseType),
  )

  const growthNames = [
    ...new Set(species.map((entry) => entry.growth_rate.name)),
  ].sort()

  const growthData = await pass('exp curves', growthNames, (name) =>
    getJson(`${POKEAPI_URL}/growth-rate/${name}`, transformResponseGrowthRate),
  )

  const evolvesFrom = new Map()

  for (const [fromId, list] of evolutions) {
    for (const evolution of list) evolvesFrom.set(evolution.to, fromId)
  }

  const pokedex = pokemon.map((entry, index) => {
    const speciesEntry = species[index]

    return {
      id: entry.id,
      name: speciesEntry.name.replace(/^./, (c) => c.toUpperCase()),
      types: entry.types
        .sort((a, b) => a.slot - b.slot)
        .map((item) => item.type.name),
      stats: readStats(entry),
      base_experience: entry.base_experience,
      capture_rate: speciesEntry.capture_rate,
      growth_rate: speciesEntry.growth_rate.name,
      gender_rate: speciesEntry.gender_rate,
      stage: stageOf(entry.id, evolvesFrom),
      evolvesFrom: evolvesFrom.get(entry.id) ?? null,
      evolutions: evolutions.get(entry.id) ?? [],
      legendary: speciesEntry.is_legendary || speciesEntry.is_mythical,
      learnset: learnsets[index],
    }
  })

  const moves = {}

  for (const move of moveData) {
    moves[move.name] = {
      name: move.names.find((n) => n.language.name === 'en')?.name ?? move.name,
      type: move.type.name,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      priority: move.priority,
      damage_class: move.damage_class.name,
      ailment: moveAilment(move),
      ailment_chance: move.meta?.ailment_chance || null,
      stat_chance: move.meta?.stat_chance || null,
      stat_changes: move.stat_changes.map((change) => ({
        stat: STAT_KEYS[change.stat.name] ?? change.stat.name,
        change: change.change,
      })),
      target: move.target.name,
      min_hits: move.meta?.min_hits ?? null,
      max_hits: move.meta?.max_hits ?? null,
      drain: move.meta?.drain || null,
      healing: move.meta?.healing || null,
      flinch_chance: move.meta?.flinch_chance || null,
      crit_rate: move.meta?.crit_rate || 0,
    }
  }

  const types = {}

  for (const type of typeData) {
    const relations = type.damage_relations

    types[type.name] = {
      double_damage_to: relations.double_damage_to.map((t) => t.name),
      half_damage_to: relations.half_damage_to.map((t) => t.name),
      no_damage_to: relations.no_damage_to.map((t) => t.name),
    }
  }

  const growth = {}

  for (const curve of growthData) {
    const table = new Array(101).fill(0)

    for (const step of curve.levels) table[step.level] = step.experience

    growth[curve.name] = table
  }

  const outputs = [
    ['pokedex.json', transformRequestWritePokedex(pokedex)],
    ['moves.json', transformRequestWriteMoves(moves)],
    ['types.json', transformRequestWriteTypes(types)],
    ['growth.json', transformRequestWriteGrowth(growth)],
  ]

  console.log()

  for (const [name, value] of outputs) {
    writeFileSync(bundledDataFile(name), JSON.stringify(value))

    const kb = (Buffer.byteLength(JSON.stringify(value)) / 1024).toFixed(0)

    console.log(
      `  ${brightGreen('✔')} ${name.padEnd(LABEL_WIDTH)} ${dim(`${kb} KB`)}`,
    )
  }

  console.log(
    `\n  ${requests} requests, ${cacheHits} served from cache` +
      (throttled > 0 ? `, ${throttled} asked to slow down` : ''),
    dim(`\n  ${BUNDLED_DATA_DIR}\n`),
  )
}

await main()
