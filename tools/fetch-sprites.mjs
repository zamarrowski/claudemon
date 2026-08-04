// Downloads the Gen 5 sprites for the original 151 into ~/.claudemon/data.
//
// Run once at install time. Sprites are not committed to the repository: they are
// Nintendo's, and fetching them here keeps the repo clear of assets we have no
// right to redistribute.
//
// Usage:
//   node tools/fetch-sprites.mjs            all 151
//   node tools/fetch-sprites.mjs 1 4 7 25   just these

import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { SPRITES_DIR, spriteFile } from '../src/paths.mjs'
import { pool, progress } from './lib.mjs'

/**
 * The one thing here that comes from a repository nobody in this project controls,
 * so it is named by commit rather than by branch.
 *
 * `master` meant the bytes this installs were whatever that branch pointed at on the
 * day it ran — 302 files, written to disk and then handed to the decoder in
 * src/png.mjs, which is hand-rolled. A commit cannot be moved under us, so what an
 * install fetches today is what it fetched when it was last looked at.
 *
 * Bumping it is deliberate: pick a commit from PokeAPI/sprites, put it here, and the
 * next install picks up the new artwork.
 */
const SPRITES_COMMIT = '8dfa3d97e953caaafaafd4963eff7621811af08e'

const BASE =
  `https://raw.githubusercontent.com/PokeAPI/sprites/${SPRITES_COMMIT}/sprites/pokemon/versions/generation-v/black-white`

const CONCURRENCY = 8
const KANTO = 151

/** back sprites are what your own Pokemon shows in battle. */
const SIDES = [
  { name: 'front', url: (id) => `${BASE}/${id}.png` },
  { name: 'back', url: (id) => `${BASE}/back/${id}.png` },
]

async function download(url, destination) {
  // Already there and non-empty: leave it alone so reruns are cheap.
  if (existsSync(destination) && statSync(destination).size > 0) return 'cached'

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 404) return 'missing'
        throw new Error(`HTTP ${response.status}`)
      }
      writeFileSync(destination, Buffer.from(await response.arrayBuffer()))
      return 'fetched'
    } catch (error) {
      if (attempt === 3) throw error
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
    }
  }
}

async function main() {
  const requested = process.argv.slice(2).map(Number).filter(Number.isInteger)
  const ids = requested.length > 0 ? requested : Array.from({ length: KANTO }, (_, i) => i + 1)

  for (const side of SIDES) mkdirSync(join(SPRITES_DIR, side.name), { recursive: true })

  const jobs = ids.flatMap((id) =>
    SIDES.map((side) => ({ id, side: side.name, url: side.url(id) })),
  )

  const counts = { fetched: 0, cached: 0, missing: 0 }
  let done = 0

  await pool(jobs, async (job) => {
    try {
      counts[await download(job.url, spriteFile(job.side, job.id, 'png'))]++
    } catch (error) {
      process.stderr.write(`\n  ${job.side}/${job.id}.png failed: ${error.message}\n`)
    }
    progress('sprites', ++done, jobs.length)
  }, CONCURRENCY)

  console.log(
    `  ${counts.fetched} downloaded, ${counts.cached} already present, ${counts.missing} not available`,
  )
  console.log(`  into ${SPRITES_DIR}`)
}

await main()
