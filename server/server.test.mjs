import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, expect, test } from 'vitest'
import { useSandboxHome } from '../test/sandboxHome.mjs'

const sandbox = useSandboxHome('claudemon-server-')

const { makeRng } = await import('../src/rng.mjs')
const { createPokemon } = await import('../src/pokemon.mjs')
const { createSave } = await import('../src/state.mjs')
const { saveGame } = await import('../src/node/save.mjs')
const { writeEncounter } = await import('../src/node/queue.mjs')
const { createGame } = await import('./game.mjs')
const { createServer } = await import('./server.mjs')

const aSave = () => {
  return createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) })
}

const boot = async () => {
  const game = createGame()
  const server = createServer({ game })
  const url = await server.listen(0)

  return { server, url, game }
}

const running = []

const bootOnce = async () => {
  const started = await boot()

  running.push(started.server)

  return started
}

afterAll(() => {
  for (const server of running) server.close()
})

test('Should hand the browser everything it needs to start playing', async () => {
  saveGame(aSave())

  const { url } = await bootOnce()
  const bootstrap = await (await fetch(`${url}/api/bootstrap`)).json()

  expect(bootstrap.save.trainer.name).toBe('ASH')
  expect(bootstrap.save.party).toHaveLength(1)
  expect(bootstrap.config.encounterChance).toBeGreaterThan(0)
  expect(bootstrap.activity.state).toBe('unknown')
  expect(bootstrap.encounter).toBeNull()
  expect(bootstrap.worked).toEqual({ totalMs: 0, updatedAt: null })
})

test('Should write the save the browser sends to disk and tell the other tabs', async () => {
  saveGame(aSave())

  const { url } = await bootOnce()
  const events = await fetch(`${url}/api/events`, {
    headers: { 'x-claudemon-client': 'listener' },
  })
  const reader = events.body.getReader()

  await reader.read()

  const save = aSave()

  save.money = 4242
  save.party.push(createPokemon(25, 9, makeRng(3)))

  const response = await fetch(`${url}/api/save`, {
    method: 'PUT',
    headers: { 'x-claudemon-client': 'writer' },
    body: JSON.stringify(save),
  })

  expect(response.status).toBe(204)

  const onDisk = JSON.parse(readFileSync(join(sandbox, 'save.json'), 'utf8'))

  expect(onDisk.money).toBe(4242)
  expect(onDisk.party).toHaveLength(2)

  const pushed = new TextDecoder().decode((await reader.read()).value)

  expect(pushed).toContain('event: save')
  expect(pushed).toContain('4242')

  await reader.cancel()
})

test('Should refuse a save it cannot read rather than write rubbish over the file', async () => {
  saveGame(aSave())

  const { url } = await bootOnce()
  const response = await fetch(`${url}/api/save`, {
    method: 'PUT',
    body: JSON.stringify({ nothing: 'useful' }),
  })

  expect(response.status).toBe(400)

  const onDisk = JSON.parse(readFileSync(join(sandbox, 'save.json'), 'utf8'))

  expect(onDisk.trainer.name, 'the save on disk is untouched').toBe('ASH')
})

test('Should serve the encounter the hooks left in the queue, and let the game clear it', async () => {
  saveGame(aSave())
  writeEncounter({
    v: 1,
    kind: 'wild',
    species: 25,
    name: 'pikachu',
    level: 7,
    seed: 99,
    shiny: false,
    session: 'test',
  })

  const { url } = await bootOnce()
  const bootstrap = await (await fetch(`${url}/api/bootstrap`)).json()

  expect(bootstrap.encounter.species).toBe(25)
  expect(bootstrap.encounter.expiresAt).toBeGreaterThan(Date.now())

  await fetch(`${url}/api/encounter`, { method: 'DELETE' })

  const after = await (await fetch(`${url}/api/bootstrap`)).json()

  expect(after.encounter).toBeNull()
})

test('Should keep the config the options screen sends', async () => {
  saveGame(aSave())

  const { url } = await bootOnce()
  const response = await fetch(`${url}/api/config`, {
    method: 'PUT',
    body: JSON.stringify({ sound: false }),
  })
  const config = await response.json()

  expect(config.sound).toBe(false)
  expect(config.encounterChance, 'the rest keeps its default').toBe(0.12)

  const onDisk = JSON.parse(readFileSync(join(sandbox, 'config.json'), 'utf8'))

  expect(onDisk.sound).toBe(false)
})

test('Should turn a Pokemon into a trade code and read it back', async () => {
  saveGame(aSave())

  const { url } = await bootOnce()
  const mon = createPokemon(25, 12, makeRng(7))
  const made = await (
    await fetch(`${url}/api/trade/code`, {
      method: 'POST',
      body: JSON.stringify({
        mon,
        trainer: { name: 'MISTY', startedAt: '2026-01-01T00:00:00.000Z' },
      }),
    })
  ).json()

  expect(made.code.startsWith('CMON1-')).toBe(true)
  expect(readFileSync(made.path, 'utf8')).toBe(`${made.code}\n`)

  const read = await (
    await fetch(`${url}/api/trade/read`, {
      method: 'POST',
      body: JSON.stringify({ text: made.code }),
    })
  ).json()

  expect(read.ok).toBe(true)
  expect(read.trade.mon.species).toBe(25)
  expect(read.trade.from.name).toBe('MISTY')
})

test('Should serve the page, the dataset and a sprite, and nothing outside them', async () => {
  const { url } = await bootOnce()

  const page = await fetch(`${url}/`)

  expect(page.status).toBe(200)
  expect(page.headers.get('content-type')).toContain('text/html')

  const pokedex = await fetch(`${url}/data/pokedex.json`)

  expect(pokedex.status).toBe(200)
  expect((await pokedex.json()).length).toBeGreaterThan(100)

  const escaping = await fetch(`${url}/sprites/..%2f..%2fsave.json`)

  expect(escaping.status, 'no climbing out of the sprite folder').toBe(404)

  const missing = await fetch(`${url}/nope.js`)

  expect(missing.status).toBe(404)
})

test('Should push the encounter to the browser as soon as one turns up', async () => {
  saveGame(aSave())
  writeFileSync(join(sandbox, 'queue.jsonl'), '')

  const { url, server } = await bootOnce()
  const events = await fetch(`${url}/api/events`)
  const reader = events.body.getReader()

  await reader.read()

  writeEncounter({
    v: 1,
    kind: 'wild',
    species: 16,
    name: 'pidgey',
    level: 4,
    seed: 5,
    shiny: false,
    session: 'test',
  })

  server.hub.broadcast('encounter', { species: 16 })

  const pushed = new TextDecoder().decode((await reader.read()).value)

  expect(pushed).toContain('event: encounter')
  expect(pushed).toContain('16')

  await reader.cancel()
})
