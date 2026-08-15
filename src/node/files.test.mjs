import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { useSandboxHome } from '../../test/sandboxHome.mjs'

const sandbox = useSandboxHome('claudemon-files-')

const { DEFAULT_CONFIG } = await import('../constants.mjs')
const { makeRng } = await import('../rng.mjs')
const { createSave } = await import('../state.mjs')
const { loadConfig, saveConfig } = await import('./config.mjs')
const { loadSave, saveGame } = await import('./save.mjs')
const {
  clearEncounter,
  offerEncounter,
  peekQueue,
  readEncounter,
  writeEncounter,
} = await import('./queue.mjs')

const aWild = (over) => {
  return {
    v: 1,
    kind: 'wild',
    species: 16,
    name: 'pidgey',
    level: 5,
    seed: 3,
    shiny: false,
    session: 'test',
    ...over,
  }
}

test('Should keep only the encounter that is still live', () => {
  clearEncounter()

  expect(readEncounter(30_000)).toBeNull()

  writeEncounter(aWild())

  expect(readEncounter(30_000).species).toBe(16)
  expect(peekQueue()).toHaveLength(1)
  expect(
    readEncounter(30_000, Date.now() + 60_000),
    'an old one has slipped away',
  ).toBeNull()
})

test('Should leave the first encounter alone rather than stack a second on it', () => {
  clearEncounter()

  expect(offerEncounter(aWild(), 30_000)).toBe(true)
  expect(offerEncounter(aWild({ species: 25, name: 'pikachu' }), 30_000)).toBe(
    false,
  )
  expect(readEncounter(30_000).species).toBe(16)
})

test('Should read a queue that is empty, missing or full of rubbish as nothing', () => {
  writeFileSync(join(sandbox, 'queue.jsonl'), 'not json\n\n{"broken":')

  expect(peekQueue()).toEqual([])
  expect(readEncounter(30_000)).toBeNull()

  clearEncounter()

  expect(peekQueue()).toEqual([])
})

test('Should turn down an encounter that names nothing to fight', () => {
  clearEncounter()
  writeEncounter(aWild({ species: null, name: null }))

  expect(readEncounter(30_000), 'half an entry is no encounter').toBeNull()

  clearEncounter()
  writeEncounter({
    v: 1,
    kind: 'trainer',
    trainer: { class: 'Nobody', name: 'X', sprite: null, team: [] },
    seed: 1,
    session: 'test',
  })

  expect(readEncounter(30_000), 'nor a trainer with no team').toBeNull()
})

test('Should read the config back with the defaults filled in around it', () => {
  expect(loadConfig()).toEqual(DEFAULT_CONFIG)

  saveConfig({ sound: false })

  expect(loadConfig().sound).toBe(false)
  expect(loadConfig().bell).toBe(DEFAULT_CONFIG.bell)

  writeFileSync(join(sandbox, 'config.json'), 'not json')

  expect(loadConfig(), 'a broken file is no config at all').toEqual(
    DEFAULT_CONFIG,
  )
})

test('Should read a save that was written, and nothing from one that is broken', () => {
  const save = createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) })

  saveGame(save)

  expect(loadSave().trainer.name).toBe('ASH')

  writeFileSync(join(sandbox, 'save.json'), JSON.stringify({ nothing: true }))

  expect(loadSave(), 'a save that is not one reads as none').toBeNull()

  writeFileSync(join(sandbox, 'save.json'), 'not json')

  expect(loadSave()).toBeNull()
})
