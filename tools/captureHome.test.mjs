import { mkdirSync, mkdtempSync, readFileSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { PREVIEW_WORKED_MS, SHOT_MESSAGES } from './constants.mjs'
import { prepareCaptureHome } from './captureHome.mjs'

const installed = process.env.CLAUDEMON_HOME

afterEach(() => {
  process.env.CLAUDEMON_HOME = installed
})

const homeWithSprites = () => {
  const home = mkdtempSync(join(tmpdir(), 'claudemon-installed-'))

  mkdirSync(join(home, 'data'))
  process.env.CLAUDEMON_HOME = home

  return home
}

test('Should point the game at a sandbox that still reaches the real sprites', () => {
  const home = homeWithSprites()
  const sandbox = prepareCaptureHome()

  expect(process.env.CLAUDEMON_HOME).toBe(sandbox)
  expect(sandbox).not.toBe(home)
  expect(realpathSync(join(sandbox, 'data'))).toBe(
    realpathSync(join(home, 'data')),
  )
})

test('Should write the hours a capture claims so the card reads the same everywhere', () => {
  homeWithSprites()

  const sandbox = prepareCaptureHome()
  const worked = JSON.parse(readFileSync(join(sandbox, 'worked.json'), 'utf8'))

  expect(worked).toEqual({ totalMs: PREVIEW_WORKED_MS, updatedAt: null })
})

test('Should refuse to capture without the sprites the shots are made of', () => {
  process.env.CLAUDEMON_HOME = mkdtempSync(join(tmpdir(), 'claudemon-bare-'))

  expect(() => prepareCaptureHome()).toThrow(SHOT_MESSAGES.noSprites)
})
