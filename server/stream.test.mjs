import { expect, test, vi } from 'vitest'
import { createEventHub } from './events.mjs'
import { readBody, sendEmpty, sendError, sendJson } from './respond.mjs'
import {
  transformRequestActivity,
  transformRequestBootstrap,
  transformRequestEncounter,
  transformRequestUpdateRun,
  transformResponseGift,
  transformResponseTradeText,
} from './transformers.mjs'
import { createWatch } from './watch.mjs'

const stubResponse = () => {
  const written = []
  const handlers = {}

  return {
    written,
    handlers,
    writeHead: vi.fn(),
    write: vi.fn((chunk) => written.push(chunk)),
    end: vi.fn(),
    on: (event, handle) => {
      handlers[event] = handle
    },
  }
}

const stubRequest = (chunks) => {
  const handlers = {}

  const request = {
    destroy: vi.fn(),
    on: (event, handle) => {
      handlers[event] = handle
      return request
    },
  }

  queueMicrotask(() => {
    for (const chunk of chunks) handlers.data?.(Buffer.from(chunk))

    handlers.end?.()
  })

  return request
}

test('Should send every open tab the same event, and skip the one that caused it', () => {
  const hub = createEventHub()
  const first = stubResponse()
  const second = stubResponse()

  hub.subscribe(first, 'one')
  hub.subscribe(second, 'two')

  expect(hub.size()).toBe(2)
  expect(hub.broadcast('save', { money: 10 }, 'one')).toBe(1)
  expect(second.written.join('')).toContain('event: save')
  expect(second.written.join('')).toContain('"money":10')
  expect(first.written.join(''), 'the writer hears nothing back').not.toContain(
    'event: save',
  )
})

test('Should let a tab go when it closes and stop writing to it', () => {
  const hub = createEventHub()
  const response = stubResponse()

  hub.subscribe(response, 'one')
  response.handlers.close()

  expect(hub.size()).toBe(0)
  expect(hub.broadcast('save', {})).toBe(0)
})

test('Should close every stream when the game shuts down', () => {
  const hub = createEventHub()
  const response = stubResponse()

  hub.subscribe(response, 'one')
  hub.close()

  expect(response.end).toHaveBeenCalledTimes(1)
  expect(hub.size()).toBe(0)
})

test('Should read a JSON body in pieces and refuse one that is not JSON', async () => {
  await expect(readBody(stubRequest(['{"a":', '1}']))).resolves.toEqual({
    a: 1,
  })
  await expect(readBody(stubRequest([]))).resolves.toBeNull()
  await expect(readBody(stubRequest(['nope']))).rejects.toThrow(/bad request/)
})

test('Should hang up on a body far bigger than any save', async () => {
  const request = stubRequest(['x'.repeat(5_000_000)])

  await expect(readBody(request)).rejects.toThrow(/too big/)
  expect(request.destroy).toHaveBeenCalledTimes(1)
})

test('Should answer with JSON, with nothing, or with an error', () => {
  const json = stubResponse()

  sendJson(json, { ok: true })

  expect(json.writeHead).toHaveBeenCalledWith(200, expect.any(Object))
  expect(json.end).toHaveBeenCalledWith('{"ok":true}')

  const empty = stubResponse()

  sendEmpty(empty)

  expect(empty.writeHead).toHaveBeenCalledWith(204)

  const failed = stubResponse()

  sendError(failed, 500, 'broke')

  expect(failed.writeHead).toHaveBeenCalledWith(500, expect.any(Object))
  expect(failed.end).toHaveBeenCalledWith('{"error":"broke"}')
})

test('Should tell the tabs when Claude starts and stops working', () => {
  const sent = []
  const activity = { state: 'idle', tool: null, since: null, sessions: 1 }
  const game = {
    readActivity: () => activity,
    readCurrentEncounter: () => null,
    heartbeat: vi.fn(),
  }
  const watch = createWatch({
    game,
    hub: { broadcast: (type, payload) => sent.push({ type, payload }) },
  })

  watch.poll()

  expect(sent, 'nothing changed yet').toHaveLength(0)

  activity.state = 'working'
  activity.tool = 'Bash'
  watch.poll()

  expect(sent[0].type).toBe('activity')
  expect(sent[0].payload.tool).toBe('Bash')

  watch.start()
  watch.stop()
})

test('Should tell the tabs when a new claudemon turns up', async () => {
  const { currentNotice } = await import('../src/node/update.mjs')
  const sent = []
  const game = {
    readActivity: () => ({
      state: 'idle',
      tool: null,
      since: null,
      sessions: 1,
    }),
    readCurrentEncounter: () => null,
    heartbeat: vi.fn(),
  }
  const watch = createWatch({
    game,
    hub: { broadcast: (type, payload) => sent.push({ type, payload }) },
  })

  expect(currentNotice()).toBeNull()

  watch.pollNotice()

  expect(sent, 'nothing new to say').toHaveLength(0)
})

test('Should map what goes out to the browser and what comes back in', () => {
  const activity = transformRequestActivity({
    state: 'working',
    tool: 'Bash',
    since: 1,
    sessions: 2,
    cwd: '/somewhere',
  })

  expect(activity.cwd).toBeUndefined()
  expect(transformRequestEncounter(null)).toBeNull()
  expect(transformRequestUpdateRun(null)).toBeNull()

  const bootstrap = transformRequestBootstrap({
    version: '2.0.0',
    save: null,
    config: {},
    activity,
    encounter: {
      kind: 'trainer',
      trainer: { class: 'Hiker', name: 'Wade', sprite: 'hiker', team: [] },
    },
    worked: { totalMs: 1, updatedAt: null },
    notice: null,
  })

  expect(bootstrap.encounter.trainer.name).toBe('Wade')
  expect(bootstrap.notice).toBeNull()

  expect(transformResponseTradeText({ text: 'CMON1-x' })).toEqual({
    text: 'CMON1-x',
  })
  expect(transformResponseTradeText({})).toBeNull()
  expect(transformResponseGift({ mon: {}, trainer: {} })).toBeTruthy()
  expect(transformResponseGift({ mon: {} })).toBeNull()
})
