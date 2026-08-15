import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { useSandboxHome } from '../test/sandboxHome.mjs'

const sandbox = useSandboxHome('claudemon-game-')

const { DAY_MS } = await import('../src/constants.mjs')
const { makeRng } = await import('../src/rng.mjs')
const { createSave } = await import('../src/state.mjs')
const { saveGame } = await import('../src/node/save.mjs')
const { createGame } = await import('./game.mjs')

const readJson = (name) => {
  return JSON.parse(readFileSync(join(sandbox, name), 'utf8'))
}

test('Should start with no game at all before anyone has played', () => {
  const game = createGame()

  expect(game.currentSave()).toBeNull()
  expect(game.snapshot().save).toBeNull()
  expect(game.heartbeat(), 'and there is nothing to beat for').toBe(false)
})

test('Should publish the status line whenever the save is written', () => {
  saveGame(createSave({ trainer: 'ASH', starterId: 4, rng: makeRng(1) }))

  const game = createGame()
  const save = game.currentSave()

  save.money = 1234
  game.persist(save)

  expect(readJson('save.json').money).toBe(1234)
  expect(readJson('status.json').money).toBe(1234)
  expect(readJson('status.json').lead.name).toBe('Charmander')
})

test('Should count a new day the first time the game is opened on it', () => {
  const save = createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) })

  save.stats.lastPlayedAt = Date.now() - DAY_MS * 2

  saveGame(save)

  const game = createGame()

  expect(game.heartbeat(), 'a fresh day is a new streak').toBe(true)
  expect(readJson('save.json').stats.streak).toBe(1)
  expect(game.heartbeat(), 'and the same day is not').toBe(false)
})

test('Should keep the config the game changed and hand back the whole of it', () => {
  saveGame(createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) }))

  const game = createGame()
  const config = game.applyConfig({ bell: false })

  expect(config.bell).toBe(false)
  expect(config.encounterChance).toBe(0.12)
  expect(game.currentConfig().bell).toBe(false)
  expect(readJson('config.json').bell).toBe(false)
})
