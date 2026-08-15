import { expect, test } from 'vitest'
import { DEFAULT_CONFIG } from '../../../src/constants.mjs'
import { makeRng } from '../../../src/rng.mjs'
import { createSave } from '../../../src/state.mjs'
import { markupOf } from '../dom.mjs'
import { activityLabel, draw, menuItems, restNote } from './home.mjs'

const aCtx = (over) => {
  return {
    version: '2.0.0',
    save: createSave({ trainer: 'ASH', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    activity: { state: 'idle', tool: null, since: null, sessions: 1 },
    encounter: null,
    updateNotice: null,
    notice: null,
    homeSelection: 0,
    scene: { step: 0, frames: 0 },
    ...over,
  }
}

const aWildEncounter = (over) => {
  return {
    kind: 'wild',
    species: 16,
    name: 'pidgey',
    level: 5,
    trainer: null,
    seed: 1,
    shiny: false,
    expiresAt: Date.now() + 12_000,
    ...over,
  }
}

test('Should offer the fight only while something is in the grass', () => {
  expect(menuItems(aCtx()).map((item) => item.id)).not.toContain('fight')

  const items = menuItems(aCtx({ encounter: aWildEncounter() }))

  expect(items[0].id).toBe('fight')
  expect(items[0].disabled, 'the lead is on its feet').toBe(false)
})

test('Should grey the fight out when the whole team has fainted', () => {
  const ctx = aCtx({ encounter: aWildEncounter() })

  ctx.save.party[0].hp = 0

  expect(menuItems(ctx)[0].disabled).toBe(true)
})

test('Should take HEAL off the menu while Claude is working', () => {
  const ctx = aCtx({
    activity: { state: 'working', tool: 'Bash', since: 1, sessions: 1 },
  })
  const heal = menuItems(ctx).find((item) => item.id === 'heal')

  expect(heal.disabled).toBe(true)
})

test('Should name the tool Claude is on, how long it has been, and the other tabs', () => {
  const now = Date.now()
  const label = activityLabel(
    { state: 'working', tool: 'Bash', since: now - 74_000, sessions: 3 },
    now,
  )

  expect(label.text).toMatch(/working/)
  expect(label.tool).toBe('Bash')
  expect(label.age).toBe('1m14s')
  expect(label.others).toBe('+2')
  expect(activityLabel({ state: 'unknown' })).toBeNull()
})

test('Should say the grass is quiet when nothing is out there', () => {
  const markup = markupOf(draw(aCtx()))

  expect(markup).toContain('The grass is quiet.')
  expect(markup).not.toContain('slips back into the grass')
})

test('Should announce the wild Pokemon, count it down and show its sprite', () => {
  const markup = markupOf(
    draw(aCtx({ encounter: aWildEncounter({ shiny: true }) })),
  )

  expect(markup).toContain('PIDGEY')
  expect(markup).toContain('appeared!')
  expect(markup).toContain('slips back into the grass in 12s')
  expect(markup).toContain('/sprites/front/shiny/16.png')
  expect(markup, 'and falls back when there is no shiny sprite').toContain(
    'data-fallback="/sprites/front/16.png"',
  )
  expect(markup).toContain('shiny')
})

test('Should only nag about resting while Claude is working', () => {
  const ctx = aCtx({
    activity: { state: 'working', tool: null, since: 1, sessions: 1 },
  })

  expect(restNote(ctx), 'a full team needs nothing').toBeNull()

  ctx.save.party[0].hp = 1

  expect(restNote(ctx)).toMatch(/HEAL is a rest/)

  ctx.save.party[0].hp = 0

  expect(restNote(ctx)).toMatch(/team is down/)
  expect(restNote(aCtx())).toBeNull()
})

test('Should mark the menu item the cursor is on', () => {
  const markup = markupOf(draw(aCtx({ homeSelection: 2 })))
  const selected = markup.match(/aria-selected="true"[\s\S]*?<\/button>/)[0]

  expect(selected).toContain('DAY CARE')
})
