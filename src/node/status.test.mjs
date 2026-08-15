import { expect, test } from 'vitest'
import { useSandboxHome } from '../../test/sandboxHome.mjs'

useSandboxHome('claudemon-status-lead-')

const { HEARTBEAT_STALE_MS } = await import('./constants.mjs')
const { makeRng } = await import('../rng.mjs')
const { createSave } = await import('../state.mjs')
const { companionIsLive, publishStatus, readStatus } =
  await import('./status.mjs')

const aSave = () =>
  createSave({ trainer: 'ASH', starterId: 4, rng: makeRng(1) })

test('Should publish the Pokemon out front, the balls and the money', () => {
  const save = aSave()

  publishStatus(save)

  const status = readStatus()

  expect(status.lead).toEqual({ name: 'Charmander', level: 5 })
  expect(status.balls).toBe(5)
  expect(status.money).toBe(3000)
  expect(status.caught).toBe(1)
})

test('Should still name a lead when the whole team has fainted', () => {
  const save = aSave()

  save.party[0].hp = 0
  publishStatus(save)

  expect(readStatus().lead.name, 'the first one is still the face of it').toBe(
    'Charmander',
  )
})

test('Should name nobody when there is nobody in the team', () => {
  const save = aSave()

  save.party = []
  publishStatus(save)

  expect(readStatus().lead).toBeNull()
})

test('Should call the game live only while its heartbeat is fresh', () => {
  expect(companionIsLive(null)).toBe(false)
  expect(companionIsLive({})).toBe(false)
  expect(companionIsLive({ heartbeat: Date.now() })).toBe(true)
  expect(
    companionIsLive({ heartbeat: Date.now() - HEARTBEAT_STALE_MS - 1 }),
  ).toBe(false)
})
