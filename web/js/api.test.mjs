import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  askForCard,
  askForTradeCode,
  dropEncounter,
  fetchBootstrap,
  fetchDataset,
  listenForEvents,
  putConfig,
  putSave,
  quitGame,
  readTradeCode,
  startUpdate,
} from './api.mjs'

const jsonResponse = (payload, status = 200) => {
  return {
    ok: status < 400,
    status,
    json: () => Promise.resolve(payload),
  }
}

let calls

beforeEach(() => {
  calls = []
  globalThis.fetch = vi.fn((url, options) => {
    calls.push({ url, options })

    if (url === '/api/bootstrap') {
      return Promise.resolve(
        jsonResponse({
          version: '2.0.0',
          save: null,
          config: {},
          activity: null,
          encounter: null,
          worked: null,
          notice: null,
        }),
      )
    }

    if (url.startsWith('/data/')) return Promise.resolve(jsonResponse([url]))
    if (options?.method === 'PUT' && url === '/api/config')
      return Promise.resolve(jsonResponse({ sound: false }))
    if (options?.method === 'POST' && url === '/api/trade/code')
      return Promise.resolve(jsonResponse({ code: 'CMON1-x', path: '/t.txt' }))
    if (options?.method === 'POST' && url === '/api/trade/read')
      return Promise.resolve(jsonResponse({ ok: false, reason: 'nope' }))
    if (options?.method === 'POST' && url === '/api/update')
      return Promise.resolve(
        jsonResponse({
          kind: 'plugin',
          state: 'running',
          from: '1',
          to: null,
          steps: [],
        }),
      )
    if (options?.method === 'POST' && url === '/api/card')
      return Promise.resolve(jsonResponse({ path: '/card.png' }))

    return Promise.resolve({ ok: true, status: 204 })
  })
})

afterEach(() => {
  delete globalThis.fetch
  delete globalThis.EventSource
})

test('Should fetch the four dataset files the engine needs before anything is drawn', async () => {
  const dataset = await fetchDataset()

  expect(dataset.pokedex).toEqual(['/data/pokedex.json'])
  expect(dataset.moves).toEqual(['/data/moves.json'])
  expect(dataset.types).toEqual(['/data/types.json'])
  expect(dataset.growth).toEqual(['/data/growth.json'])
})

test('Should read the bootstrap through the transformer rather than raw', async () => {
  const bootstrap = await fetchBootstrap()

  expect(bootstrap.activity).toEqual({
    state: 'unknown',
    tool: null,
    since: null,
    sessions: 0,
  })
  expect(bootstrap.worked).toEqual({ totalMs: 0, updatedAt: null })
})

test('Should stamp every write with the tab it came from', async () => {
  await putSave({ trainer: { name: 'ASH' } })

  const [call] = calls

  expect(call.url).toBe('/api/save')
  expect(call.options.method).toBe('PUT')
  expect(call.options.headers['x-claudemon-client']).toMatch(/\w+/)
  expect(JSON.parse(call.options.body).trainer.name).toBe('ASH')
})

test('Should send the calls the screens make and hand back what came out', async () => {
  expect(await putConfig({ sound: false })).toEqual({ sound: false })
  expect(await askForCard()).toEqual({ path: '/card.png' })
  expect(await askForTradeCode({ species: 25 }, { name: 'ASH' })).toEqual({
    code: 'CMON1-x',
    path: '/t.txt',
  })
  expect(await readTradeCode('CMON1-x')).toEqual({ ok: false, reason: 'nope' })
  expect((await startUpdate()).state).toBe('running')
  expect(await dropEncounter(), 'a 204 carries no body').toBeNull()
  expect(await quitGame()).toBeNull()
})

test('Should say which call failed when the server refuses one', async () => {
  globalThis.fetch = vi.fn(() => Promise.resolve(jsonResponse(null, 409)))

  await expect(askForCard()).rejects.toThrow('POST /api/card — 409')
})

test('Should hand the pushed events to the game, one handler per kind', () => {
  const listeners = {}
  const close = vi.fn()

  globalThis.EventSource = class {
    constructor(url) {
      this.url = url
    }

    addEventListener(type, handle) {
      listeners[type] = handle
    }

    close = close
  }

  const encounter = vi.fn()
  const stop = listenForEvents({ encounter })

  listeners.encounter({ data: '{"species":16}' })

  expect(encounter).toHaveBeenCalledWith({ species: 16 })

  stop()

  expect(close).toHaveBeenCalledTimes(1)
})
