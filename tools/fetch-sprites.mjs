import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { GYMS, TRAINER_CLASSES } from '../src/constants.mjs'
import { gymRoster } from '../src/gym.mjs'
import {
  SPRITES_DIR,
  TRAINER_SPRITES_DIR,
  eggSpriteFile,
  shinySpriteFile,
  spriteFile,
  trainerSpriteFile,
} from '../src/node/paths.mjs'
import { pool } from './pool.mjs'
import { progress } from './progress.mjs'
import {
  CONCURRENCY,
  EGG_SPRITE_NAME,
  KANTO,
  SPRITE_BASE_URL,
  SPRITE_MAX_ATTEMPTS,
  SPRITE_RETRY_BACKOFF_MS,
  TRAINER_SPRITE_BASE_URL,
} from './constants.mjs'

const SIDES = [
  { name: 'front', path: '' },
  { name: 'back', path: 'back/' },
]

const VARIANTS = [
  { shiny: false, path: '', label: '' },
  { shiny: true, path: 'shiny/', label: 'shiny/' },
]

const spriteDestination = (side, shiny, id) => {
  if (shiny) return shinySpriteFile(side, id, 'png')

  return spriteFile(side, id, 'png')
}

const spriteJob = (side, variant, id) => {
  return {
    label: `${side.name}/${variant.label}${id}.png`,
    url: `${SPRITE_BASE_URL}/${side.path}${variant.path}${id}.png`,
    destination: spriteDestination(side.name, variant.shiny, id),
  }
}

const pokemonJobs = (ids) => {
  return ids.flatMap((id) =>
    SIDES.flatMap((side) =>
      VARIANTS.map((variant) => spriteJob(side, variant, id)),
    ),
  )
}

const eggJob = () => {
  return {
    label: 'front/egg.png',
    url: `${SPRITE_BASE_URL}/${EGG_SPRITE_NAME}`,
    destination: eggSpriteFile(),
  }
}

const trainerSpriteNames = () => {
  const fromClasses = TRAINER_CLASSES.flatMap((entry) => entry.sprites)
  const fromGyms = GYMS.flatMap((gym) =>
    gymRoster(gym).map((opponent) => opponent.sprite),
  )

  return [...new Set([...fromClasses, ...fromGyms])]
}

const trainerJobs = () => {
  return trainerSpriteNames().map((name) => ({
    label: `trainers/${name}.png`,
    url: `${TRAINER_SPRITE_BASE_URL}/${name}.png`,
    destination: trainerSpriteFile(name),
  }))
}

const download = async (url, destination) => {
  if (existsSync(destination) && statSync(destination).size > 0) return 'cached'

  for (let attempt = 1; attempt <= SPRITE_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) return 'missing'

        throw new Error(`HTTP ${response.status}`)
      }

      writeFileSync(destination, Buffer.from(await response.arrayBuffer()))

      return 'fetched'
    } catch (error) {
      if (attempt === SPRITE_MAX_ATTEMPTS) throw error

      await new Promise((resolve) =>
        setTimeout(resolve, SPRITE_RETRY_BACKOFF_MS * attempt),
      )
    }
  }

  throw new Error(`${url}: gave up after ${SPRITE_MAX_ATTEMPTS} attempts`)
}

const main = async () => {
  const requested = process.argv.slice(2).map(Number).filter(Number.isInteger)
  const ids =
    requested.length > 0
      ? requested
      : Array.from({ length: KANTO }, (_, i) => i + 1)

  for (const side of SIDES)
    mkdirSync(join(SPRITES_DIR, side.name, 'shiny'), { recursive: true })

  mkdirSync(TRAINER_SPRITES_DIR, { recursive: true })

  const jobs = [...pokemonJobs(ids), eggJob(), ...trainerJobs()]

  const counts = { fetched: 0, cached: 0, missing: 0 }
  let done = 0

  await pool(
    jobs,
    async (job) => {
      try {
        counts[await download(job.url, job.destination)]++
      } catch (error) {
        process.stderr.write(`\n  ${job.label} failed: ${error.message}\n`)
      }

      progress('sprites', ++done, jobs.length)
    },
    CONCURRENCY,
  )

  console.log(
    `  ${counts.fetched} downloaded, ${counts.cached} already present, ${counts.missing} not available`,
  )
  console.log(`  into ${SPRITES_DIR}`)
}

await main()
