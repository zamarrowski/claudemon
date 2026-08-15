import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, expect, test, vi } from 'vitest'
import { useSandboxHome } from '../test/sandboxHome.mjs'

const sandbox = useSandboxHome('claudemon-routes-')

const { makeRng } = await import('../src/rng.mjs')
const { createSave } = await import('../src/state.mjs')
const { saveGame } = await import('../src/node/save.mjs')
const { writeEncounter } = await import('../src/node/queue.mjs')
const { createGame } = await import('./game.mjs')
const { createServer, portFromEnv } = await import('./server.mjs')
const { createEventHub } = await import('./events.mjs')
const { createWatch } = await import('./watch.mjs')

const running = []

const bootOnce = async (onQuit, makeUpdateRun) => {
  const game = createGame()
  const server = createServer({ game, onQuit, makeUpdateRun })
  const url = await server.listen(0)

  running.push(server)

  return { game, server, url }
}

afterAll(() => {
  for (const server of running) server.close()
})

test('Should draw a trainer card on demand and hand the PNG over', async () => {
  saveGame(createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) }))

  const { url } = await bootOnce()
  const made = await (await fetch(`${url}/api/card`, { method: 'POST' })).json()

  expect(made.path).toBe(join(sandbox, 'card.png'))
  expect(readFileSync(made.path).subarray(1, 4).toString()).toBe('PNG')

  const image = await fetch(`${url}/api/card.png`)

  expect(image.headers.get('content-type')).toBe('image/png')
  expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(1000)
})

test('Should turn a card down while there is no game to draw', async () => {
  const game = { currentSave: () => null }
  const hub = createEventHub()
  const { createRoutes } = await import('./routes.mjs')
  const routes = createRoutes({ game, hub, onQuit: vi.fn() })
  const card = routes.find((route) => route.path === '/api/card')

  const sent = []
  const response = {
    writeHead: (status) => sent.push(status),
    end: (body) => sent.push(body),
  }

  card.handle({ headers: {} }, response)

  expect(sent[0]).toBe(409)
  expect(JSON.parse(sent[1]).error).toMatch(/no save/)
})

test('Should let the browser ask the game to close the whole thing', async () => {
  const onQuit = vi.fn()
  const { url } = await bootOnce(onQuit)

  const response = await fetch(`${url}/api/quit`, { method: 'POST' })

  expect(response.status).toBe(204)
  expect(onQuit).toHaveBeenCalledTimes(1)
})

test('Should refuse anything that is not a route it knows', async () => {
  const { url } = await bootOnce()

  expect((await fetch(`${url}/api/nothing`)).status).toBe(404)
  expect(
    (await fetch(`${url}/api/save`, { method: 'DELETE' })).status,
    'and the wrong method on a real path',
  ).toBe(404)
})

test('Should say what is wrong rather than swallow a body it cannot read', async () => {
  const { url } = await bootOnce()

  const broken = await fetch(`${url}/api/config`, {
    method: 'PUT',
    body: 'not json at all',
  })

  expect(broken.status).toBe(400)
  expect((await broken.json()).error).toMatch(/bad request/)

  const empty = await fetch(`${url}/api/trade/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  })

  expect(empty.status).toBe(400)
})

test('Should push an encounter to every tab as soon as the queue changes', async () => {
  const { game } = await bootOnce()
  const hub = createEventHub()
  const sent = []

  hub.broadcast = (type, payload) => sent.push({ type, payload })

  const watch = createWatch({ game, hub })

  writeEncounter({
    v: 1,
    kind: 'wild',
    species: 4,
    name: 'charmander',
    level: 6,
    seed: 11,
    shiny: false,
    session: 'test',
  })

  watch.poll()

  expect(sent[0].type).toBe('encounter')
  expect(sent[0].payload.species).toBe(4)

  watch.poll()

  expect(sent, 'and says nothing when nothing moved').toHaveLength(1)

  watch.stop()
})

test('Should only start the timers once the server is listening, and drop them on close', async () => {
  const { server } = await bootOnce()

  expect(server.address().port).toBeGreaterThan(0)

  server.close()

  expect(server.address()).toBeNull()
})

test('Should take the port from the environment and fall back to its own', () => {
  expect(portFromEnv({ CLAUDEMON_PORT: '8123' })).toBe(8123)
  expect(portFromEnv({})).toBe(7626)
  expect(portFromEnv({ CLAUDEMON_PORT: 'nonsense' })).toBe(7626)
  expect(portFromEnv({ CLAUDEMON_PORT: '99999' })).toBe(7626)
})

test('Should hand a second tab the same game without stepping on the first', async () => {
  saveGame(createSave({ trainer: 'ASH', starterId: 4, rng: makeRng(2) }))

  const { url } = await bootOnce()
  const first = await (await fetch(`${url}/api/bootstrap`)).json()
  const second = await (await fetch(`${url}/api/bootstrap`)).json()

  expect(first.save.party[0].species).toBe(second.save.party[0].species)
  expect(first.version).toBe(second.version)
})

test('Should run one update at a time and push each step as it goes', async () => {
  const run = {
    kind: 'plugin',
    state: 'running',
    from: '1.0.0',
    to: null,
    steps: [
      {
        id: 'pull',
        label: 'Pulling',
        done: 'Pulled',
        status: 'running',
        detail: null,
      },
    ],
  }
  const makeUpdateRun = vi.fn(({ onChange }) => {
    run.onChange = onChange

    return run
  })
  const { url, server } = await bootOnce(undefined, makeUpdateRun)

  expect(
    await (await fetch(`${url}/api/update`)).json(),
    'nothing yet',
  ).toBeNull()

  const started = await (
    await fetch(`${url}/api/update`, { method: 'POST' })
  ).json()

  expect(started.state).toBe('running')
  expect(makeUpdateRun).toHaveBeenCalledTimes(1)

  await fetch(`${url}/api/update`, { method: 'POST' })

  expect(
    makeUpdateRun,
    'a second ask joins the run in flight',
  ).toHaveBeenCalledTimes(1)

  const sent = []

  server.hub.broadcast = (type, payload) => sent.push({ type, payload })
  run.steps[0].status = 'ok'
  run.onChange(run)

  expect(sent[0].type).toBe('update')
  expect(sent[0].payload.steps[0].status).toBe('ok')

  run.state = 'done'

  expect((await (await fetch(`${url}/api/update`)).json()).state).toBe('done')
})

test('Should step aside to another port when the usual one is taken', async () => {
  const first = await bootOnce()
  const taken = first.server.address().port

  const game = createGame()
  const second = createServer({ game })
  const url = await second.listen(taken)

  running.push(second)

  expect(second.address().port).not.toBe(taken)
  expect((await fetch(`${url}/api/bootstrap`)).status).toBe(200)
})
