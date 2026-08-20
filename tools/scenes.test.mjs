import { expect, test } from 'vitest'
import { stripAnsi } from '../src/ui/text.mjs'
import { CAPTURE_SHOTS, PREVIEW_BADGES, PREVIEW_PARTY } from './constants.mjs'
import { SCENES, buildScene, drawScene, sampleSave } from './scenes.mjs'

const textOf = (app) => stripAnsi(drawScene(app).lines.join('\n'))

test('Should build one save the whole set of shots agrees on', () => {
  const save = sampleSave()

  expect(save.party.map((mon) => mon.species)).toEqual(
    PREVIEW_PARTY.map(([species]) => species),
  )
  expect(save.badges).toEqual(PREVIEW_BADGES)
  expect(save.dex.caught).toHaveLength(97)
  expect(save.dex.shiny).toEqual([130])
  expect(save.party.some((mon) => mon.status === 'poison')).toBe(true)
  expect(save.party.every((mon) => mon.hp > 0)).toBe(true)
})

test('Should hand back the same save on every call so a scene cannot leak into the next', () => {
  const save = sampleSave()

  save.party[0].hp = 1

  expect(sampleSave().party[0].hp).toBeGreaterThan(1)
})

test('Should draw the screen the scene asked for at the size it was given', () => {
  const app = buildScene('home-working', { cols: 100, rows: 30 })

  expect(app.mode).toBe('home')
  expect(textOf(app)).toContain('Claude is working')
})

test('Should leave no update notice in a scene that did not ask for one', () => {
  expect(buildScene('home-working', { cols: 100, rows: 30 }).updateNotice).toBe(
    null,
  )
  expect(
    buildScene('home-update', { cols: 100, rows: 30 }).updateNotice,
  ).toEqual({ kind: 'available', version: '0.6.0' })
})

test('Should send the gym run into the gym the shots are taken in, one fight down', () => {
  const app = buildScene('gym-run', { cols: 100, rows: 26 })
  const text = textOf(app)

  expect(app.mode).toBe('gym')
  expect(app.gym.index).toBe(1)
  expect(text).toContain('SAFFRON GYM')
  expect(text).toContain('LEADER SABRINA')
})

test('Should face a trainer with a team of their own in a trainer battle', () => {
  const app = buildScene('trainer-battle', { cols: 100, rows: 54 })

  expect(app.battle.state.trainer.team).toHaveLength(2)
  expect(textOf(app)).toContain('BUG CATCHER MARC')
})

test('Should say so rather than draw something else when the screen is unknown', () => {
  expect(buildScene('nope', { cols: 100, rows: 30 })).toBe(null)
})

test('Should fit every shot in the manifest into the rows it claims', () => {
  for (const shot of CAPTURE_SHOTS) {
    const app = buildScene(shot.scene, { cols: shot.cols, rows: shot.rows })
    const { lines } = drawScene(app)

    expect(SCENES[shot.scene], shot.file).toBeTypeOf('function')
    expect(lines.length, shot.file).toBeLessThanOrEqual(shot.rows - 1)
  }
})
