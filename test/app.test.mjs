import { expect, test, vi } from 'vitest'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

import { useSandboxHome } from './sandboxHome.mjs'

const sandbox = useSandboxHome('claudemon-app-')

const { createApp } = await import('../src/app.mjs')
const { endSession, writeActivity } = await import('../src/activity.mjs')
const { loadConfig, spriteScale } = await import('../src/config.mjs')
const {
  BATTLE_MESSAGES,
  CARD_WRITTEN_PREFIX,
  DAYCARE_EXP_PER_STEP,
  DEFAULT_CONFIG,
  EGG_LEVEL,
  EGG_STEPS,
  FRAMES_PER_DAYCARE_STEP,
  GYM_MESSAGES,
  HOME_NOTICES,
  STAR_ANSWERS,
  STAR_MESSAGES,
  STAR_REPO_URL,
} = await import('../src/constants.mjs')
const { GYM_MESSAGES: GYM_SCREEN_MESSAGES } =
  await import('../src/ui/views/constants.mjs')
const { isDataReady } = await import('../src/data.mjs')
const { expForLevel, expFromTrainerMon } = await import('../src/exp.mjs')
const { clearEncounter, peekQueue, writeEncounter } =
  await import('../src/queue.mjs')
const { addPokemon, createSave, loadSave } = await import('../src/state.mjs')
const { giveAway } = await import('../src/trade.mjs')
const { createPokemon, makeMoveSlot } = await import('../src/pokemon.mjs')
const { ballsInBag, countOf, itemsInBag, SHOP_STOCK } =
  await import('../src/shop.mjs')
const { HIT_FRAMES, SHINY_MARK } = await import('../src/ui/constants.mjs')
const { SETTINGS } = await import('../src/ui/views/options.mjs')
const homeView = await import('../src/ui/views/home.mjs')
const battleView = await import('../src/ui/views/battle.mjs')
const gymView = await import('../src/ui/views/gym.mjs')
const teamView = await import('../src/ui/views/team.mjs')
const movesView = await import('../src/ui/views/moves.mjs')
const daycareView = await import('../src/ui/views/daycare.mjs')
const tradeView = await import('../src/ui/views/trade.mjs')
const dexView = await import('../src/ui/views/dex.mjs')
const trainerView = await import('../src/ui/views/trainer.mjs')
const starView = await import('../src/ui/views/star.mjs')
const { stripAnsi } = await import('../src/ui/text.mjs')
const { makeRng } = await import('../src/rng.mjs')
const { VERSION } = await import('../src/version.mjs')

if (!isDataReady())
  throw new Error('dataset missing — run: node tools/fetch-data.mjs')

const stubScreen = () => {
  let frames = 0
  let bells = 0

  return {
    size: () => ({ cols: 100, rows: 34 }),
    render: () => {
      frames++
    },
    repaint: () => {},
    stop: () => {},
    onKey: () => {},
    onResize: () => {},
    bell: () => {
      bells++
    },
    frameCount: () => frames,
    bellCount: () => bells,
  }
}

const stubRun = () => {
  let settle

  const run = {
    state: 'running',
    from: '0.5.0',
    to: null,
    steps: [
      {
        id: 'plugin',
        label: 'fetching',
        done: 'fetched',
        status: 'running',
        detail: null,
      },
    ],
  }
  run.promise = new Promise((resolve) => {
    settle = resolve
  })

  run.finish = (state = 'done', to = '0.6.0') => {
    run.state = state
    run.to = state === 'done' ? to : null
    run.steps[0].status = state === 'done' ? 'ok' : 'failed'

    settle(run)

    return new Promise((resolve) => setImmediate(resolve))
  }

  return run
}

const press = (app, name, char) => app.handleKey({ name, char })

const gymText = (app) => {
  return gymView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .join('\n')
}

const teamText = (app) => {
  return teamView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .join('\n')
}

const movesText = (app) => {
  return movesView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .join('\n')
}

const tradeText = (app) => {
  return tradeView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .join('\n')
}

const dexText = (app) => {
  return dexView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .join('\n')
}

const trainerText = (app) => {
  return trainerView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .join('\n')
}

const type = (app, text) => {
  for (const char of text) press(app, char, char)
}

const openSetting = (app, key) => {
  const index = SETTINGS.findIndex((setting) => setting.key === key)

  expect(index, `no such setting: ${key}`).toBeGreaterThanOrEqual(0)

  for (let i = 0; i < index; i++) press(app, 'down')
}

const walkHomeTo = (app, id) => {
  const items = homeView.menuItems(app)

  for (let step = 0; step < items.length; step++) {
    if (homeView.menuItems(app)[app.homeSelection].id === id) return

    press(app, 'right')
  }

  throw new Error(`the home cursor never reached ${id}`)
}

const onHome = (app, id) => {
  const index = homeView.menuItems(app).findIndex((item) => item.id === id)

  expect(index, `no such home entry: ${id}`).toBeGreaterThanOrEqual(0)

  app.homeSelection = index
}

const healEntry = (app) => {
  return homeView.menuItems(app).find((item) => item.id === 'heal')
}

const clearMessages = (app, limit = 200) => {
  let steps = 0

  while (app.mode === 'battle' && app.battle?.message && steps++ < limit) {
    press(app, 'enter')
  }

  expect(steps, 'messages never stopped').toBeLessThan(limit)
}

const secondsAgo = (seconds) => {
  return new Date(Date.now() - seconds * 1000).toISOString()
}

const queueEncounter = (app, encounter) => {
  writeEncounter({
    v: 1,
    species: encounter.species,
    name: encounter.name,
    level: encounter.level,
    seed: encounter.seed,
    shiny: encounter.shiny,
    at: encounter.at,
  })

  app.pump()
}

const queueTrainer = (app, trainer) => {
  writeEncounter({ v: 1, kind: 'trainer', trainer, seed: 12 })

  app.pump()
}

const encounterSpriteBlock = (lines) => {
  const heading = lines.findIndex((line) =>
    /wants to battle!|appeared!/.test(stripAnsi(line)),
  )

  expect(heading, 'no encounter is on the grass').toBeGreaterThan(-1)

  return lines.slice(heading + 3, heading + 9).join('\n')
}

const fightItOut = (app, limit = 120) => {
  let guard = 0

  while (app.mode === 'battle' && guard++ < limit) {
    if (app.battle.message) press(app, 'enter')
    else if (app.battle.menu === 'fight') {
      app.battle.selection = 0
      press(app, 'enter')
    } else {
      app.battle.menu = 'main'
      app.battle.selection = 0
      press(app, 'enter')
    }
  }

  expect(guard, 'the battle never ended').toBeLessThan(limit)
}

const duel = (app) => {
  app.save.party[0] = createPokemon(4, 10, makeRng(11))

  queueEncounter(app, { species: 10, name: 'Caterpie', level: 12, seed: 7 })
  press(app, 'enter')
  clearMessages(app)

  return app.battle
}

const attack = (app) => {
  press(app, 'enter')
  press(app, 'enter')
}

const bench = (app, hp) => {
  const mon = createPokemon(25, 9, makeRng(1))

  mon.hp = hp
  app.save.party.push(mon)

  return mon
}

const useBattleItem = (app, key, target) => {
  app.battle.selection = 1
  press(app, 'enter')

  expect(app.battle.menu).toBe('bag')

  const index = app.battle.bagItems.indexOf(key)

  expect(index, `${key} should be offered`).not.toBe(-1)

  app.battle.selection = index
  press(app, 'enter')

  expect(app.battle.menu, 'choosing an item should ask who it is for').toBe(
    'target',
  )

  app.battle.selection = target
  press(app, 'enter')
}

const throwBall = (app, key, count = 1) => {
  app.save.bag[key] = count

  app.battle.selection = 1
  press(app, 'enter')

  expect(app.battle.menu).toBe('bag')

  const index = app.battle.bagItems.indexOf(key)

  expect(index, `${key} should be offered`).not.toBe(-1)

  app.battle.selection = index
  press(app, 'enter')
}

const playThrow = (app) => {
  let frames = 0

  while (app.battle?.ball && !app.battle.ball.done && frames++ < 200)
    app.tickBattle()

  expect(frames, 'the throw should end on its own').toBeLessThan(200)

  return frames
}

const openBagOn = (app, key) => {
  press(app, 'i')

  expect(app.bagSelection, 'the bag should be open').not.toBe(null)

  const index = itemsInBag(app.save).indexOf(key)

  expect(index, `${key} should be in the bag`).not.toBe(-1)

  app.bagSelection = index
}

const loseABattle = (app) => {
  app.save.party.length = 1
  app.save.party[0] = createPokemon(4, 5, makeRng(11))
  app.save.party[0].hp = 1

  queueEncounter(app, { species: 150, name: 'Mewtwo', level: 70, seed: 3 })
  press(app, 'enter')

  expect(app.mode, 'the fight started').toBe('battle')

  fightItOut(app)

  expect(app.mode, 'and sent you home').toBe('home')
}

const reportSession = (state, tool = null, session = 'test-session') => {
  const now = Date.now()

  writeActivity({
    v: 1,
    session,
    state,
    tool,
    since: now,
    at: now,
  })
}

const runFrames = (app, count) => {
  let moved = 0

  for (let frame = 0; frame < count; frame++) {
    if (app.tickScene()) moved++
  }

  return moved
}

const readToFanfare = (app, track) => {
  let guard = 0

  while (
    app.battle?.message &&
    !track.includes('start:victory') &&
    guard++ < 40
  ) {
    press(app, 'enter')
  }

  expect(track, 'the fanfare never played').toContain('start:victory')
}

test('Should ask for a name and a starter on a first run, and end up with a save', () => {
  const app = createApp({
    screen: stubScreen(),
    save: null,
    config: { ...DEFAULT_CONFIG },
  })

  expect(app.mode).toBe('starter')
  expect(app.setup.step).toBe('name')

  type(app, 'Ash')
  expect(app.setup.name).toBe('Ash')

  press(app, 'backspace')
  type(app, 'h')
  expect(app.setup.name).toBe('Ash')

  press(app, 'enter')
  expect(app.setup.step).toBe('starter')

  press(app, 'right')
  press(app, 'enter')

  expect(app.mode).toBe('home')
  expect(app.save.trainer.name).toBe('Ash')
  expect(app.save.party).toHaveLength(1)
  expect(app.save.party[0].species, 'Squirtle').toBe(7)
  expect(loadSave().trainer.name, 'and it should be on disk').toBe('Ash')
})

test('Should keep asking for a name when the one given is empty', () => {
  const app = createApp({
    screen: stubScreen(),
    save: null,
    config: { ...DEFAULT_CONFIG },
  })

  press(app, 'enter')

  expect(app.setup.step, 'should still be asking').toBe('name')
})

test('Should keep arrow keys out of the name', () => {
  const app = createApp({
    screen: stubScreen(),
    save: null,
    config: { ...DEFAULT_CONFIG },
  })

  type(app, 'Bo')
  press(app, 'up')
  press(app, 'left')

  expect(app.setup.name).toBe('Bo')
})

test('Should take a trainer on, meet the next Pokémon as each falls, and bank the prize at the end', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party[0] = createPokemon(150, 70, makeRng(3))
  app.save.party[0].moves = [makeMoveSlot('psychic')]

  const purse = app.save.money

  queueTrainer(app, {
    class: 'Lass',
    name: 'Iris',
    team: [
      { species: 129, name: 'Magikarp', level: 5 },
      { species: 129, name: 'Magikarp', level: 6 },
    ],
  })

  expect(app.save.dex.seen, 'the one out front is on show').toContain(129)
  expect(app.save.dex.faced[129], 'but nobody has faced it yet').toBeUndefined()

  const home = homeView.draw(app, { cols: 100, rows: 34 }).lines.join('\n')

  expect(home, 'the grass announces who it is').toMatch(
    /LASS IRIS.*wants to battle!/,
  )
  expect(home, 'and how many are coming').toContain('×2')

  press(app, 'enter')

  expect(app.mode).toBe('battle')
  expect(app.battle.message).toBe('LASS IRIS wants to battle!')
  expect(app.battle.state.trainer.team, 'both of them turned up').toHaveLength(
    2,
  )
  expect(
    app.save.dex.faced[129],
    'only the one on the field counts as faced so far',
  ).toBe(1)

  fightItOut(app)

  expect(
    app.save.dex.faced[129],
    'and the second once it took the field too',
  ).toBe(2)
  expect(app.mode, 'and it sent you home').toBe('home')
  expect(app.save.money - purse, 'thirty a level for a Lass').toBe(30 * 6)
  expect(app.save.stats.wins).toBe(1)
})

test('Should show the trainer in the grass and on the field until they send their first Pokémon out', () => {
  const size = { cols: 100, rows: 34 }

  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueTrainer(app, {
    class: 'Lass',
    name: 'Iris',
    sprite: 'lass',
    team: [{ species: 129, name: 'Magikarp', level: 5 }],
  })

  const grass = homeView.draw(app, size).lines

  expect(grass.join('\n'), 'her sprite is on disk').not.toContain('(no sprite)')

  const wild = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueEncounter(wild, { species: 129, name: 'Magikarp', level: 5, seed: 12 })

  expect(
    encounterSpriteBlock(grass),
    'the grass shows the Lass, not the Magikarp she carries',
  ).not.toBe(encounterSpriteBlock(homeView.draw(wild, size).lines))

  press(app, 'enter')

  const intro = battleView.draw(app, size).lines

  expect(stripAnsi(intro[0]).trim(), 'the trainer is who you face').toBe(
    'LASS IRIS',
  )
  expect(
    stripAnsi(intro[1]),
    'no health bar for somebody who is not fighting',
  ).not.toContain('/')
  expect(intro.join('\n'), 'and their sprite is on disk').not.toContain(
    '(no sprite)',
  )

  press(app, 'enter')

  const sentOut = battleView.draw(app, size).lines

  expect(app.battle.message).toBe('LASS IRIS sent out Magikarp!')
  expect(stripAnsi(sentOut[0]), 'and now the Pokémon holds the slot').toContain(
    'MAGIKARP',
  )
  expect(
    sentOut.slice(2, 9).join('\n'),
    'the field changed hands, not just the header',
  ).not.toBe(intro.slice(2, 9).join('\n'))
})

test('Should star a shiny in the grass, sound it out and say so in the battle', () => {
  const played = []
  const playSound = (name) => played.push(name)
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playSound,
  })

  queueEncounter(app, {
    species: 10,
    name: 'Caterpie',
    level: 3,
    seed: 5,
    shiny: true,
  })

  const grass = homeView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .join('\n')

  expect(grass, 'the grass shows what it is').toContain(
    `CATERPIE ${SHINY_MARK}`,
  )
  expect(played, 'a shiny is worth a sound of its own').toEqual(['shiny'])

  press(app, 'enter')

  expect(
    app.battle.state.foe.mon.shiny,
    'the one you face is the one that appeared',
  ).toBe(true)

  press(app, 'enter')

  expect(app.battle.message).toBe(BATTLE_MESSAGES.shiny)
})

test('Should keep the fallen Pokémon on screen until the trainer announces the next one', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party[0] = createPokemon(150, 70, makeRng(3))
  app.save.party[0].moves = [makeMoveSlot('psychic')]

  queueTrainer(app, {
    class: 'Lass',
    name: 'Iris',
    team: [
      { species: 129, name: 'Magikarp', level: 5 },
      { species: 25, name: 'Pikachu', level: 6 },
    ],
  })

  press(app, 'enter')
  clearMessages(app)

  const [first, second] = app.battle.state.trainer.team

  attack(app)

  let guard = 0

  while (!app.battle.message?.includes('fainted') && guard++ < 20)
    press(app, 'enter')

  expect(guard, 'the foe never fell').toBeLessThan(20)
  expect(
    app.battle.foeMon,
    'the one being announced is the one on screen',
  ).toBe(first)
  expect(
    app.battle.state.trainer.team[1],
    'even though the engine has already moved on',
  ).toBe(app.battle.state.foe.mon)

  press(app, 'enter')

  expect(app.battle.message).toBe('LASS IRIS sent out Pikachu!')
  expect(app.battle.foeMon, 'and only now does the screen follow').toBe(second)
  expect(app.battle.hp.foe).toBe(second.stats.hp)
})

test('Should keep the trainer and the winnings when the player has to send somebody else out', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const opener = createPokemon(150, 70, makeRng(3))

  opener.moves = [makeMoveSlot('double-edge')]
  opener.hp = 1

  const closer = createPokemon(150, 70, makeRng(4))

  closer.moves = [makeMoveSlot('psychic')]

  app.save.party = [opener, closer]

  const purse = app.save.money
  const experience = closer.exp

  queueTrainer(app, {
    class: 'Lass',
    name: 'Iris',
    team: [
      { species: 129, name: 'Magikarp', level: 5 },
      { species: 129, name: 'Magikarp', level: 5 },
    ],
  })

  press(app, 'enter')
  clearMessages(app)

  attack(app)
  clearMessages(app)

  expect(opener.hp, 'the recoil took the opener down with it').toBe(0)
  expect(app.mode, 'but the battle carries on').toBe('battle')
  expect(app.battle.state.player.mon, 'with the next one out').toBe(closer)
  expect(
    app.battle.state.trainer,
    'and the same trainer across the table',
  ).toBeTruthy()

  fightItOut(app)

  expect(
    app.save.money - purse,
    'the prize is the trainers, not a wild one',
  ).toBe(30 * 5)
  expect(
    closer.exp - experience,
    'the one the opener took down is still on the tab',
  ).toBe(2 * expFromTrainerMon(129, 5))
})

test('Should leave the grass quiet for an encounter there is nobody to fight in', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueTrainer(app, { class: 'Lass', name: 'Iris', team: [] })

  expect(app.encounter, 'an empty roster is no encounter at all').toBe(null)
  expect(homeView.menuItems(app)[0].id, 'and FIGHT never shows up').not.toBe(
    'fight',
  )

  queueEncounter(app, { species: 16, level: 3, seed: 99 })

  expect(app.encounter, 'nor is a wild line with no Pokémon named in it').toBe(
    null,
  )

  queueTrainer(app, {
    class: 'Rocket Grunt',
    name: 'Iris',
    team: [{ species: 129, name: 'Magikarp', level: 5 }],
  })

  expect(
    app.encounter,
    'nor a trainer of a class this version cannot price',
  ).toBe(null)
})

test('Should leave the balls in the bag when the Pokémon across the table has an owner', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueTrainer(app, {
    class: 'Hiker',
    name: 'Wade',
    team: [{ species: 129, name: 'Magikarp', level: 5 }],
  })

  press(app, 'enter')
  clearMessages(app)

  app.battle.selection = 1
  press(app, 'enter')

  expect(app.battle.menu).toBe('bag')
  expect(app.battle.bagItems, 'no ball is on offer').not.toContain('poke-ball')
  expect(app.battle.bagItems, 'the potions still are').toContain('potion')
})

test('Should bring an encounter to the home screen and count it as faced only once you enter it', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueEncounter(app, { species: 16, name: 'Pidgey', level: 3, seed: 99 })

  expect(app.encounter, 'one is in the grass').toBeTruthy()
  expect(app.save.dex.seen, 'meeting one counts as seeing it').toContain(16)
  expect(app.save.dex.faced[16], 'but not yet as facing it').toBeUndefined()

  press(app, 'enter')

  expect(app.mode).toBe('battle')
  expect(app.battle, 'a battle should be running').toBeTruthy()
  expect(app.encounter, 'facing it consumes it').toBe(null)
  expect(app.save.dex.faced[16], 'and it goes on the Pokedex tally').toBe(1)
})

test('Should let an encounter nobody faced wander off once its window closes, met but never faced', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueEncounter(app, {
    species: 16,
    name: 'Pidgey',
    level: 3,
    seed: 99,
    at: secondsAgo(5),
  })

  expect(app.encounter, 'five seconds in, it is still there').toBeTruthy()

  queueEncounter(app, {
    species: 16,
    name: 'Pidgey',
    level: 3,
    seed: 41,
    at: secondsAgo(31),
  })

  expect(app.encounter, 'thirty-one seconds in, it has wandered off').toBe(null)
  expect(app.save.dex.seen, 'you still met it').toContain(16)
  expect(
    app.save.dex.faced[16],
    'you just never stood in front of it',
  ).toBeUndefined()
  expect(homeView.menuItems(app)[0].id, 'and FIGHT has left the menu').toBe(
    'dex',
  )
})

test('Should empty the slot when you face an encounter, so it is never replayed', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueEncounter(app, { species: 16, name: 'Pidgey', level: 3, seed: 99 })

  expect(peekQueue(), 'it stays in the file until you face it').toHaveLength(1)

  press(app, 'enter')

  expect(peekQueue(), 'and the slot is free again once you do').toEqual([])
})

test('Should not keep meeting the same Pokemon each time the slot is reread', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueEncounter(app, { species: 16, name: 'Pidgey', level: 3, seed: 99 })
  const held = app.encounter

  expect(app.pump(), 'nothing has changed').toBe(false)
  expect(app.encounter, 'and the same encounter is still on screen').toBe(held)
})

test('Should leave the cursor on the entry it was on when an encounter times out', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueEncounter(app, { species: 16, name: 'Pidgey', level: 3, seed: 99 })

  expect(app.homeSelection, 'the cursor starts on FIGHT').toBe(0)

  walkHomeTo(app, 'heal')

  clearEncounter()
  app.pump()

  const items = homeView.menuItems(app)

  expect(app.homeSelection, 'the cursor is still inside the menu').toBeLessThan(
    items.length,
  )
  expect(items[app.homeSelection].id, 'and still on the same entry').toBe(
    'heal',
  )

  press(app, 'enter')

  expect(app.mode, 'there was nothing to fight, so HEAL is what ran').toBe(
    'home',
  )

  const home = homeView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .join('\n')

  expect(home, 'and it says so on the screen').toMatch(/full health/i)
})

test('Should write the trainer card from the trainer screen and say where it landed', () => {
  const revealCard = vi.fn()
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    revealCard,
  })
  const card = join(sandbox, 'card.png')

  walkHomeTo(app, 'trainer')
  press(app, 'enter')
  press(app, 's')

  expect(existsSync(card), 'the PNG is on disk').toBe(true)
  expect(revealCard).toHaveBeenCalledTimes(1)
  expect(revealCard).toHaveBeenCalledWith(card)
  expect(app.mode, 'sharing does not take you off the screen').toBe('trainer')
  expect(trainerText(app), 'and the screen says where it went').toContain(
    CARD_WRITTEN_PREFIX,
  )
})

test('Should warn what a trade costs before it lets the Pokémon go', () => {
  const copyCode = vi.fn(() => true)
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    copyCode,
  })

  app.save.party.push(createPokemon(25, 12, makeRng(7)))

  walkHomeTo(app, 'team')
  press(app, 'enter')
  press(app, 'down')
  press(app, 't')

  expect(tradeText(app), 'it asks about whoever the cursor was on').toContain(
    'Give PIKACHU',
  )
  expect(tradeText(app), 'and warns before anything happens').toContain(
    'leaves your game the moment the code exists',
  )
  expect(app.save.party, 'nothing has moved yet').toHaveLength(2)

  press(app, 'escape')

  expect(app.mode, 'backing out goes straight back to the team').toBe('team')
  expect(app.save.party, 'and keeps it').toHaveLength(2)

  press(app, 't')
  press(app, 'enter')

  const screen = tradeText(app)

  expect(app.save.party, 'making the code is what gives it away').toHaveLength(
    1,
  )
  expect(loadSave().party, 'and the disk agrees').toHaveLength(1)
  expect(screen, 'the code is on the screen to be copied').toContain('CMON1-')
  expect(copyCode).toHaveBeenCalledTimes(1)
  expect(copyCode).toHaveBeenCalledWith(expect.stringContaining('CMON1-'))
  expect(
    readFileSync(join(sandbox, 'trade.txt'), 'utf8').trim(),
    'and it is in a file as well',
  ).toContain('CMON1-')

  press(app, 'escape')

  expect(app.mode, 'and it puts you back where you came from').toBe('team')
})

test('Should trade what is in the box, from the list or from the box itself', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.box.push(createPokemon(120, 15, makeRng(3)))

  walkHomeTo(app, 'team')
  press(app, 'enter')
  press(app, 'b')
  press(app, 't')

  expect(tradeText(app), 'the one in the box, not the lead').toContain(
    'Give STARYU',
  )

  press(app, 'enter')

  expect(app.save.box, 'and it leaves the box').toHaveLength(0)
  expect(loadSave().box).toHaveLength(0)

  press(app, 'escape')

  expect(app.mode, 'and it goes back to the box behind it').toBe('box')

  press(app, 'r')

  expect(tradeText(app), 'and the box can take one in as well').toContain(
    'Paste the code you were given',
  )

  press(app, 'escape')

  expect(app.mode).toBe('box')
})

test('Should still hand you the code when there is nowhere to put it', () => {
  const saveCode = () => {
    throw new Error('EACCES')
  }
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    copyCode: () => false,
    saveCode,
  })

  app.save.party.push(createPokemon(25, 12, makeRng(7)))

  walkHomeTo(app, 'team')
  press(app, 'enter')
  press(app, 'down')
  press(app, 't')
  press(app, 'enter')

  const screen = tradeText(app)

  expect(screen, 'the code is on the screen either way').toContain('CMON1-')
  expect(screen, 'and it says the clipboard was no help').toContain(
    'Nothing here to copy with',
  )
  expect(screen, 'nor the file').toContain('could not be written to a file')
})

test('Should take a Pokémon in from a pasted code and say where it came from', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })
  const misty = createSave({ trainer: 'Misty', starterId: 7, rng: makeRng(9) })

  misty.party.push(createPokemon(120, 15, makeRng(3)))

  const code = giveAway(misty, 'party', 1).code

  walkHomeTo(app, 'team')
  press(app, 'enter')
  press(app, 'r')
  type(app, 'nonsense')
  press(app, 'enter')

  expect(tradeText(app), 'a bad code is said so on the spot').toContain(
    'not a trade code',
  )
  expect(app.save.party, 'and nothing arrives').toHaveLength(1)

  press(app, 'escape')
  press(app, 'r')
  press(app, 'x', 'x')

  expect(tradeText(app), 'what you type shows up').toContain('> x')

  press(app, 'backspace')

  expect(tradeText(app), 'and backspace takes it off again').not.toContain(
    '> x',
  )

  press(app, code, code)
  press(app, 'enter')

  expect(app.mode, 'it drops you back where you were').toBe('team')
  expect(app.save.party).toHaveLength(2)
  expect(app.save.party[1].species).toBe(120)
  expect(loadSave().party[1].species, 'and it is on disk').toBe(120)
  expect(teamText(app)).toContain('STARYU arrived from MISTY')
})

test('Should refuse to trade away the only Pokémon you have', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  walkHomeTo(app, 'team')
  press(app, 'enter')
  press(app, 't')

  expect(app.mode, 'a trade that cannot happen opens nothing').toBe('team')
  expect(teamText(app)).toContain('somebody has to fight')
  expect(app.save.party).toHaveLength(1)

  press(app, 'up')

  expect(
    teamText(app),
    'and moving the cursor puts the refusal away',
  ).not.toContain('somebody has to fight')
})

test('Should own up and open nothing when the card cannot be written', () => {
  const revealCard = vi.fn()
  const saveCard = vi.fn(() => {
    throw new Error('EACCES')
  })
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    revealCard,
    saveCard,
  })

  walkHomeTo(app, 'trainer')
  press(app, 'enter')
  press(app, 's')

  expect(trainerText(app)).toContain(HOME_NOTICES.cardFailed)
  expect(revealCard, 'nothing to open').not.toHaveBeenCalled()
})

test('Should drop the message the moment you press anything else', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    revealCard: vi.fn(),
  })

  walkHomeTo(app, 'trainer')
  press(app, 'enter')
  press(app, 's')
  press(app, 'down')

  expect(trainerText(app)).not.toContain(CARD_WRITTEN_PREFIX)
})

test('Should earn an achievement from playing and keep it on the trainer screen', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  expect(app.save.achievements, 'a fresh save has earned nothing').toEqual([])

  addPokemon(app.save, createPokemon(16, 5, makeRng(2)))
  app.persist()

  walkHomeTo(app, 'trainer')
  press(app, 'enter')

  expect(app.save.achievements.map((entry) => entry.id)).toEqual([
    'first-catch',
  ])
  expect(trainerText(app)).toContain('● First catch')
  expect(trainerText(app), 'and the rest are still ahead').toContain(
    '○ First badge',
  )
})

test('Should pull a cursor left past the end of the menu back inside it', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.homeSelection = 12
  press(app, 'left')

  expect(app.homeSelection).toBeLessThan(homeView.menuItems(app).length)
})

test('Should say how long is left on the countdown, and never go negative', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueEncounter(app, {
    species: 16,
    name: 'Pidgey',
    level: 3,
    seed: 99,
    at: secondsAgo(8),
  })

  expect(homeView.countdownRow(app.encounter)).toMatch(/in 2[12]s/)
  expect(homeView.countdownRow({ expiresAt: Date.now() - 5_000 })).toMatch(
    /in 0s/,
  )
})

test('Should fight a battle to the end, return you home and put it on the tally', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueEncounter(app, { species: 10, name: 'Caterpie', level: 2, seed: 7 })

  press(app, 'enter')
  clearMessages(app)

  let guard = 0
  while (app.mode === 'battle' && guard++ < 60) {
    if (app.battle.menu === 'main') {
      app.battle.selection = 0
      press(app, 'enter')
    } else if (app.battle.menu === 'fight') {
      app.battle.selection = 0
      press(app, 'enter')
    } else if (app.battle.message) {
      press(app, 'enter')
    } else {
      press(app, 'escape')
    }
  }

  expect(guard, 'the battle should have ended').toBeLessThan(60)
  expect(app.mode).toBe('home')
  expect(app.battle).toBe(null)
  expect(app.save.stats.battles).toBe(1)
  expect(loadSave().stats.battles, 'and it should be saved').toBe(1)
})

test('Should add the Pokemon and close the battle when a Master Ball holds', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.bag['master-ball'] = 1
  queueEncounter(app, { species: 25, name: 'Pikachu', level: 6, seed: 5 })

  press(app, 'enter')
  clearMessages(app)

  app.battle.selection = 1
  press(app, 'enter')
  expect(app.battle.menu).toBe('bag')

  const index = app.battle.bagItems.indexOf('master-ball')

  expect(index, 'the Master Ball should be offered').not.toBe(-1)

  app.battle.selection = index
  press(app, 'enter')

  let guard = 0
  while (app.mode === 'battle' && guard++ < 40) press(app, 'enter')

  expect(app.mode).toBe('home')
  expect(app.save.dex.caught, 'Pikachu should be in the Pokedex').toContain(25)
  expect(
    app.save.party.map((mon) => mon.species),
    'and on the team',
  ).toContain(25)
})

test('Should end the battle without a catch when you run away', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  queueEncounter(app, { species: 10, name: 'Caterpie', level: 2, seed: 3 })

  press(app, 'enter')
  clearMessages(app)

  let guard = 0
  while (app.mode === 'battle' && guard++ < 40) {
    if (app.battle.message) press(app, 'enter')
    else {
      app.battle.menu = 'main'
      app.battle.selection = 3
      press(app, 'enter')
    }
  }

  expect(app.mode).toBe('home')
  expect(app.save.dex.caught).not.toContain(10)
})

test('Should pay a Pokemon that was swapped out the full experience, not a share', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const starter = app.save.party[0]
  const backup = createPokemon(25, 20, makeRng(1))
  backup.moves = [makeMoveSlot('thunder-shock')]
  app.save.party.push(backup)

  queueEncounter(app, { species: 10, name: 'Caterpie', level: 2, seed: 7 })
  press(app, 'enter')
  clearMessages(app)

  const before = { starter: starter.exp, backup: backup.exp }

  app.battle.selection = 2
  press(app, 'enter')
  expect(app.battle.menu).toBe('party')
  app.battle.selection = 1
  press(app, 'enter')
  clearMessages(app)

  expect(
    app.battle.state.player.mon,
    'the backup is the one out there now',
  ).toBe(backup)
  expect(starter.exp, 'nothing is paid out mid-battle').toBe(before.starter)

  let guard = 0
  while (app.mode === 'battle' && guard++ < 60) {
    if (app.battle.message) press(app, 'enter')
    else if (app.battle.menu === 'fight') {
      app.battle.selection = 0
      press(app, 'enter')
    } else {
      app.battle.menu = 'main'
      app.battle.selection = 0
      press(app, 'enter')
    }
  }

  expect(guard, 'the battle should have ended').toBeLessThan(60)
  expect(backup.exp, 'the one that finished it earns').toBeGreaterThan(
    before.backup,
  )
  expect(starter.exp, 'and so does the one that opened it').toBeGreaterThan(
    before.starter,
  )
  expect(
    starter.exp - before.starter,
    'the full amount each, not a share',
  ).toBe(backup.exp - before.backup)
})

test('Should refuse to start a battle with a fainted team, however it is reached', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  for (const mon of app.save.party) mon.hp = 0

  queueEncounter(app, { species: 16, name: 'Pidgey', level: 3, seed: 99 })
  const fight = homeView.menuItems(app).find((item) => item.id === 'fight')

  expect(fight.disabled, 'FIGHT is greyed out with nobody to send out').toBe(
    true,
  )

  press(app, 'enter')

  expect(app.mode, 'should refuse and stay put').toBe('home')
  expect(
    app.encounter,
    'the encounter is still there, for what is left of its window',
  ).toBeTruthy()

  app.startNextBattle()

  expect(app.mode, 'and the rule holds reached straight through').toBe('home')
  expect(app.notice).toMatch(/fainted/i)
})

test('Should play a turn out one blow at a time', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)

  const foeMax = battle.state.foe.mon.stats.hp
  const playerHp = battle.hp.player

  expect(battle.hp.foe, 'nothing has happened yet').toBe(foeMax)

  attack(app)

  expect(
    battle.state.player.mon.hp,
    'the foe has already hit back, in the state',
  ).toBeLessThan(playerHp)
  expect(
    battle.hpTarget.foe,
    'the foe is taking the hit being announced',
  ).toBeLessThan(foeMax)
  expect(battle.hpTarget.player, 'and its reply has not been shown yet').toBe(
    playerHp,
  )

  let guard = 0
  while (battle.hpTarget.player === playerHp && guard++ < 20)
    press(app, 'enter')

  expect(guard, "the foe's blow should land on a later beat").toBeLessThan(20)
  expect(battle.hpTarget.player).toBe(battle.state.player.mon.hp)
})

test('Should put the hit effect on whoever took the blow', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)

  expect(battle.effect, 'nothing is being hit yet').toBe(null)

  attack(app)

  expect(battle.effect).toEqual({ side: 'foe', frame: 0 })

  let guard = 0
  while (battle.effect?.side !== 'player' && guard++ < 20) press(app, 'enter')

  expect(
    battle.effect?.side,
    'and it moves to you when the foe hits back',
  ).toBe('player')
})

test('Should run the hit effect out on its own', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)
  attack(app)

  for (let frame = 0; frame < HIT_FRAMES.length; frame++) {
    expect(
      battle.effect,
      `frame ${frame} should still be on screen`,
    ).toBeTruthy()
    app.tickBattle()
  }

  expect(battle.effect).toBe(null)
})

test('Should drain a bar towards where the turn left it, over more than one frame', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)
  attack(app)

  const target = battle.hpTarget.foe

  expect(battle.hp.foe, 'it starts from where the bar was').toBeGreaterThan(
    target,
  )

  let guard = 0
  while (battle.hp.foe !== target && guard++ < 200) app.tickBattle()

  expect(guard, 'it should settle').toBeLessThan(200)
  expect(guard, 'and take more than one frame getting there').toBeGreaterThan(1)
  expect(battle.hp.foe).toBe(target)
})

test('Should have the bars telling the truth again by the time you choose', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)
  attack(app)

  let guard = 0
  while (battle.menu !== 'main' && guard++ < 30) press(app, 'enter')

  expect(guard, 'the turn should hand the menu back').toBeLessThan(30)
  expect(battle.hp.foe).toBe(battle.state.foe.mon.hp)
  expect(battle.hp.player).toBe(battle.state.player.mon.hp)
})

test('Should see a charging move through on its own instead of asking again', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)

  battle.state.player.mon.moves = [makeMoveSlot('dig')]

  const foeHp = battle.state.foe.mon.hp

  attack(app)

  expect(battle.message).toBe('Charmander used Dig!')

  let guard = 0

  while (battle.state.foe.mon.hp === foeHp && guard++ < 30) {
    expect(battle.menu, 'you get no say while it is underground').toBe(null)

    press(app, 'enter')
  }

  expect(guard, 'the dig should come up on its own').toBeLessThan(30)

  clearMessages(app)

  expect(battle.menu, 'and then it is your turn again').toBe('main')
})

test('Should fill the bar with a potion rather than jumping it', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)
  battle.state.player.mon.hp = 5

  battle.selection = 1
  press(app, 'enter')

  expect(battle.menu).toBe('bag')
  expect(battle.hp.player, 'opening a menu catches the bar up').toBe(5)

  const index = battle.bagItems.indexOf('potion')

  expect(index, 'a potion should be offered').not.toBe(-1)

  battle.selection = index
  press(app, 'enter')

  expect(battle.menu, 'and then ask who it is for').toBe('target')

  battle.selection = 0
  press(app, 'enter')

  let guard = 0
  while (battle.hpTarget.player === 5 && guard++ < 10) press(app, 'enter')

  expect(guard, 'the heal should reach the bar').toBeLessThan(10)
  expect(
    battle.hpTarget.player,
    'as something to animate towards',
  ).toBeGreaterThan(battle.hp.player)
})

test('Should bring a fainted team-mate back at half health mid-battle, ready to be sent straight out', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const fallen = bench(app, 0)
  const battle = duel(app)
  app.save.bag.revive = 1

  useBattleItem(app, 'revive', 1)
  clearMessages(app)

  expect(fallen.hp, 'it is back on its feet, at half health').toBe(
    Math.floor(fallen.stats.hp / 2),
  )
  expect(countOf(app.save, 'revive'), 'and the revive was spent').toBe(0)
  expect(
    battle.state.player.mon.species,
    'the Charmander is still the one out there',
  ).toBe(4)

  battle.selection = 2
  press(app, 'enter')
  expect(battle.menu).toBe('party')
  battle.selection = 1
  press(app, 'enter')
  clearMessages(app)

  expect(battle.state.player.mon, 'until you send the revived one out').toBe(
    fallen,
  )
})

test('Should reach a team-mate on the bench with a potion, and say who it was for', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const hurt = bench(app, 1)
  const battle = duel(app)

  useBattleItem(app, 'potion', 1)

  expect(battle.message, 'the message says who it was for').toMatch(/PIKACHU/)

  clearMessages(app)

  expect(
    hurt.hp,
    'and the one on the bench is the one that was healed',
  ).toBeGreaterThan(1)
  expect(battle.state.player.mon.species, 'not the one on the field').toBe(4)
})

test('Should charge neither the item nor the turn for an item that would do nothing', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  bench(app, 0)
  const battle = duel(app)
  app.save.bag.revive = 1
  const turn = battle.state.turn

  useBattleItem(app, 'revive', 0)

  expect(battle.message).toMatch(/no effect/i)

  clearMessages(app)

  expect(countOf(app.save, 'revive'), 'the revive is still in the bag').toBe(1)
  expect(battle.state.turn, 'and the foe never got a free hit out of it').toBe(
    turn,
  )
})

test('Should return to the item you were holding when you back out of the target list', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)
  app.save.bag['super-potion'] = 1

  battle.selection = 1
  press(app, 'enter')
  const index = battle.bagItems.indexOf('super-potion')
  battle.selection = index
  press(app, 'enter')

  expect(battle.menu).toBe('target')

  press(app, 'escape')

  expect(battle.menu, 'the target list is a step inside the bag').toBe('bag')
  expect(battle.selection, 'on the item you were about to use').toBe(index)
  expect(battle.bagItem, 'and nothing is left waiting for a target').toBe(null)

  press(app, 'escape')

  expect(battle.menu).toBe('main')
})

test('Should do nothing on the frame timer outside a battle', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  expect(app.tickBattle()).toBe(false)
})

test('Should animate a thrown ball instead of just announcing it, and spend it', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)

  throwBall(app, 'poke-ball', 2)

  expect(battle.message).toMatch(/threw a Poké Ball/i)
  expect(battle.ball).toEqual({
    shakes: 2,
    caught: false,
    frame: 0,
    done: false,
  })
  expect(
    countOf(app.save, 'poke-ball'),
    'the one in the air is out of the bag',
  ).toBe(1)
})

test('Should play the throw out on the frame timer and then read the result', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)
  throwBall(app, 'poke-ball')

  const thrown = battle.message
  const frames = playThrow(app)

  expect(frames, 'a throw is worth more than a frame or two').toBeGreaterThan(
    10,
  )
  expect(battle.ball, 'the ball opened and went away').toBe(null)
  expect(battle.message, 'and the verdict followed on its own').toMatch(
    /almost had it/i,
  )
  expect(battle.message).not.toBe(thrown)
})

test('Should let a key get past the throw rather than swallowing it', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)
  throwBall(app, 'poke-ball')
  const thrown = battle.message

  press(app, 'enter')

  expect(battle.ball, 'the first key ends the throw').toBe(null)
  expect(battle.message, 'without skipping what it was saying').toBe(thrown)

  press(app, 'enter')

  expect(battle.message, 'and the next one reads on').not.toBe(thrown)
})

test('Should keep a ball that holds shut, spend the last one and stop costing frames', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)
  app.save.bag = { potion: 1 }

  throwBall(app, 'master-ball')

  expect(battle.ball.caught, 'a Master Ball never fails').toBe(true)

  playThrow(app)

  expect(
    battle.ball?.done,
    'the ball is still lying there with the Caterpie in it',
  ).toBe(true)
  expect(app.tickBattle(), 'and there is nothing left to animate').toBe(false)
  expect(battle.message).toMatch(/caught/i)
  expect(countOf(app.save, 'master-ball')).toBe(0)
  expect(ballsInBag(app.save), 'nothing left to throw').toEqual([])
})

test('Should still end the battle when you mash through a throw', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const battle = duel(app)
  throwBall(app, 'master-ball')

  let guard = 0
  while (app.mode === 'battle' && guard++ < 40) press(app, 'enter')

  expect(guard, 'a throw is skippable, not a wall').toBeLessThan(40)
  expect(app.mode).toBe('home')
  expect(app.save.dex.caught).toContain(battle.state.foe.mon.species)
})

test('Should pick up what Claude Code is doing, and only redraw when it changes', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  expect(app.activity.state, 'nothing is reporting yet').toBe('unknown')

  reportSession('working', 'Bash')

  expect(app.refreshActivity(), 'the row would read differently now').toBe(true)
  expect(app.activity.state).toBe('working')
  expect(app.activity.tool).toBe('Bash')

  expect(app.refreshActivity(), 'and nothing changed the second time').toBe(
    false,
  )

  endSession('test-session')
})

test('Should ring when Claude hands the keyboard back, and when it is blocked on you', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  reportSession('working', 'Bash')
  app.refreshActivity()

  expect(app.screen.bellCount(), 'starting work is not worth a bell').toBe(0)

  reportSession('idle')
  app.refreshActivity()

  expect(app.screen.bellCount(), 'finishing is').toBe(1)

  app.refreshActivity()

  expect(app.screen.bellCount()).toBe(1)

  reportSession('working', 'Edit')
  app.refreshActivity()
  reportSession('waiting')
  app.refreshActivity()

  expect(app.screen.bellCount(), 'and so is being blocked on you').toBe(2)

  endSession('test-session')
})

test('Should stay quiet when the bell is turned off', () => {
  const app = createApp({
    screen: stubScreen(),
    save: null,
    config: { ...DEFAULT_CONFIG, bell: false },
  })

  reportSession('working')
  app.refreshActivity()
  reportSession('idle')
  app.refreshActivity()

  expect(app.screen.bellCount()).toBe(0)

  endSession('test-session')
})

test('Should keep everybody standing still until Claude is working', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  expect(app.scene.step).toBe(0)
  expect(runFrames(app, 20), 'standing still costs no redraws').toBe(0)
  expect(app.scene.step).toBe(0)

  reportSession('idle')
  app.refreshActivity()

  expect(
    runFrames(app, 20),
    'and an idle session is someone stood in the grass',
  ).toBe(0)
  expect(app.scene.step).toBe(0)

  endSession('test-session')
})

test('Should move the walk on while Claude works, and leave it where it got to when the work stops', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  reportSession('working', 'Bash')
  app.refreshActivity()

  const moved = runFrames(app, 20)

  expect(moved, 'something should have moved').toBeGreaterThan(0)
  expect(moved, 'but a step is worth more than one frame').toBeLessThan(20)
  expect(app.scene.step, 'every frame that moved is a step').toBe(moved)

  reportSession('idle')
  app.refreshActivity()
  const stopped = app.scene.step
  runFrames(app, 20)

  expect(app.scene.step, 'and they stay where they got to').toBe(stopped)

  endSession('test-session')
})

test('Should not run the walk underneath a battle', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  reportSession('working', 'Bash')
  app.refreshActivity()

  queueEncounter(app, { species: 10, name: 'Caterpie', level: 2, seed: 7 })
  press(app, 'enter')

  expect(app.mode).toBe('battle')
  expect(
    runFrames(app, 20),
    'there is no grass on screen to walk through',
  ).toBe(0)

  endSession('test-session')
})

test('Should open each screen from the home menu and come back', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  expect(homeView.menuItems(app).map((item) => item.id)).toEqual([
    'dex',
    'team',
    'daycare',
    'gyms',
    'shop',
    'heal',
    'trainer',
    'options',
    'quit',
  ])

  for (const mode of [
    'dex',
    'team',
    'daycare',
    'gyms',
    'shop',
    'trainer',
    'options',
  ]) {
    walkHomeTo(app, mode)
    press(app, 'enter')

    expect(app.mode, `${mode} should open`).toBe(mode)

    press(app, 'escape')

    expect(app.mode, `${mode} should close again`).toBe('home')
  }
})

test('Should line the home HP bars up whatever the level and evolution marks are', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party.push(createPokemon(25, 9, makeRng(1)))
  app.save.party.push(createPokemon(6, 40, makeRng(2)))
  app.save.party.push(createPokemon(4, 100, makeRng(3)))

  const bars = homeView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .filter((line) => line.includes('█'))
    .map((line) => line.indexOf('█'))

  expect(bars, 'every party member drew a bar').toHaveLength(4)
  expect(new Set(bars), 'all of them start in one column').toHaveProperty(
    'size',
    1,
  )
})

test('Should restore the team when you heal at home', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party[0].hp = 1
  app.save.party[0].status = 'poison'

  app.openHomeSelection('heal')

  expect(app.save.party[0].hp).toBe(app.save.party[0].stats.hp)
  expect(app.save.party[0].status).toBe(null)
})

test('Should heal Pokemon in the box and at the day care as well as the team', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const boxed = createPokemon(25, 10, makeRng(9))
  const parked = createPokemon(132, 10, makeRng(8))

  boxed.hp = 1
  boxed.status = 'sleep'
  app.save.box.push(boxed)

  parked.hp = 0
  app.save.daycare.slots.push(parked)

  app.openHomeSelection('heal')

  expect(app.save.box[0].hp).toBe(app.save.box[0].stats.hp)
  expect(app.save.box[0].status).toBe(null)
  expect(
    app.save.daycare.slots[0].hp,
    'one left at the day care is reachable too, or it could never be healed',
  ).toBe(app.save.daycare.slots[0].stats.hp)
})

test('Should make healing wait until Claude stops working', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party[0].hp = 1

  reportSession('working', 'Edit')
  app.refreshActivity()

  expect(
    healEntry(app).disabled,
    'HEAL is greyed out while Claude has the keyboard',
  ).toBe(true)

  onHome(app, 'heal')
  press(app, 'enter')

  expect(app.save.party[0].hp, 'and the key on it does nothing').toBe(1)

  app.openHomeSelection('heal')

  expect(
    app.save.party[0].hp,
    'the rule holds even reached straight through',
  ).toBe(1)
  expect(app.notice).toMatch(/working/i)

  reportSession('waiting')
  app.refreshActivity()

  expect(
    healEntry(app).disabled,
    'HEAL comes back the moment the work stops',
  ).toBeFalsy()

  press(app, 'enter')

  expect(app.save.party[0].hp, 'and it heals').toBe(app.save.party[0].stats.hp)

  endSession('test-session')
})

test('Should keep HEAL out while another tab is working, whatever this one is up to', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party[0].hp = 1

  reportSession('working', 'Bash', 'tab-one')
  reportSession('waiting', null, 'tab-two')
  app.refreshActivity()

  expect(app.activity.state, 'the row leads with the one needing you').toBe(
    'waiting',
  )
  expect(
    healEntry(app).disabled,
    'but one Claude still working is not a rest',
  ).toBe(true)

  app.openHomeSelection('heal')

  expect(app.save.party[0].hp, 'and the key on it does nothing').toBe(1)
  expect(homeView.restRow(app), 'the screen still says why').toMatch(/rest/i)

  endSession('tab-one')
  app.refreshActivity()

  expect(
    healEntry(app).disabled,
    'once the last one stops, HEAL comes back',
  ).toBeFalsy()

  endSession('tab-two')
})

test('Should still heal on a machine with no activity hook at all', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party[0].hp = 1

  expect(app.activity.state, 'nothing is reporting at all').toBe('unknown')
  expect(healEntry(app).disabled).toBeFalsy()

  onHome(app, 'heal')
  press(app, 'enter')

  expect(app.save.party[0].hp).toBe(app.save.party[0].stats.hp)
})

test('Should make a blackout wait for Claude too, and say on screen why', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  reportSession('working', 'Bash')
  app.refreshActivity()
  loseABattle(app)

  expect(app.save.party[0].hp, 'nobody got up').toBe(0)
  expect(healEntry(app).disabled).toBe(true)
  expect(homeView.restRow(app), 'and the screen says why').toMatch(
    /team is down/i,
  )

  reportSession('idle')
  app.refreshActivity()
  app.openHomeSelection('heal')

  expect(app.save.party[0].hp, 'the rest comes when Claude stops').toBe(
    app.save.party[0].stats.hp,
  )

  endSession('test-session')
})

test('Should pick the team back up after a blackout when nobody is working', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  expect(app.activity.state, 'nothing is reporting at all').toBe('unknown')

  loseABattle(app)

  expect(app.save.party[0].hp, 'you scurried back to safety').toBe(
    app.save.party[0].stats.hp,
  )
})

test('Should say why HEAL is greyed out, and only when saying so helps', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  expect(homeView.restRow(app), 'nothing is blocked and nothing is hurt').toBe(
    '',
  )

  reportSession('working')
  app.refreshActivity()

  expect(
    homeView.restRow(app),
    'a team at full health was not reaching for it',
  ).toBe('')

  app.save.party[0].hp = 1

  expect(homeView.restRow(app), 'a hurt team is owed the reason').toMatch(
    /rest/i,
  )

  app.save.party[0].hp = app.save.party[0].stats.hp
  app.save.party[0].moves[0].pp = 0

  expect(
    homeView.restRow(app),
    'and so is one with nothing left to throw',
  ).toMatch(/rest/i)

  reportSession('idle')
  app.refreshActivity()

  expect(homeView.restRow(app), 'it goes away with the work').toBe('')

  endSession('test-session')
})

test('Should move money and stock when you buy in the shop', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('shop')
  const before = app.save.money

  app.shopSelection = 0
  press(app, 'enter')

  expect(app.save.money, 'money should be spent').toBeLessThan(before)
  expect(app.shopMessage).toMatch(/Bought/)
})

test('Should refuse politely when you are too broke for the shop', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.money = 0
  app.openHomeSelection('shop')

  app.shopSelection = 0
  press(app, 'enter')

  expect(app.save.money).toBe(0)
  expect(app.shopMessage).toMatch(/afford/i)
})

test('Should make the team member you choose the lead', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party.push(createPokemon(25, 9, makeRng(1)))

  app.openHomeSelection('team')
  press(app, 'down')
  press(app, 'enter')

  expect(app.save.party[0].species).toBe(25)
})

test('Should take one off the team into the box and hand it back again', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party.push(createPokemon(25, 9, makeRng(1)))

  app.openHomeSelection('team')
  press(app, 'down')
  press(app, 'd')

  expect(app.save.party, 'it left the team').toHaveLength(1)
  expect(app.save.box).toHaveLength(1)
  expect(app.boxMessage).toMatch(/went to the box/)
  expect(app.teamSelection, 'and the cursor followed it off the end').toBe(0)
  expect(
    loadSave().box,
    'the swap is on disk, not just on screen',
  ).toHaveLength(1)

  press(app, 'b')

  expect(app.mode).toBe('box')

  press(app, 'enter')

  expect(app.save.box, 'and came back out').toHaveLength(0)
  expect(app.save.party).toHaveLength(2)
  expect(app.save.party[1].species).toBe(25)

  press(app, 'escape')

  expect(app.mode, 'the box belongs to the team screen').toBe('team')
})

test('Should act on the Pokemon the cursor is on once the team is sorted by level', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party.push(createPokemon(25, 9, makeRng(1)))
  app.save.party.push(createPokemon(4, 20, makeRng(2)))

  app.openHomeSelection('team')
  press(app, 's')

  expect(app.teamSort, 'the list flipped to level order').toBe('level')
  expect(app.teamSelection, 'and the cursor stayed on the starter').toBe(2)

  press(app, 'up')
  press(app, 'enter')

  expect(app.save.party[0].species, 'the row under the cursor led').toBe(25)
  expect(app.teamSelection, 'and the cursor followed it').toBe(1)

  press(app, 'up')
  press(app, 'd')

  expect(app.save.box[0].species, 'and d sent the row under it away').toBe(4)
  expect(app.save.party.map((mon) => mon.species)).toEqual([25, 1])
})

test('Should carry a move up the list and keep the order it was left in', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 4, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party[0].moves = ['scratch', 'growl', 'ember'].map(makeMoveSlot)

  app.openHomeSelection('team')

  expect(teamText(app), 'the team screen offers the moves').toContain(
    '[m] moves',
  )

  press(app, 'm')

  expect(app.mode).toBe('moves')
  expect(
    movesText(app),
    'the moves are listed in the order they are in',
  ).toContain('Ember')

  press(app, 'down')
  press(app, 'down')
  press(app, 'enter')

  expect(
    movesText(app),
    'the one in hand is marked and the hint follows it',
  ).toContain('↕ Ember')
  expect(movesText(app)).toContain('[enter] put it down')

  press(app, 'up')
  press(app, 'up')
  press(app, 'enter')

  expect(
    app.save.party[0].moves.map((slot) => slot.move),
    'the move it carried leads, the rest slid down',
  ).toEqual(['ember', 'scratch', 'growl'])
  expect(
    loadSave().party[0].moves.map((slot) => slot.move),
    'and the new order outlived the screen',
  ).toEqual(['ember', 'scratch', 'growl'])

  press(app, 'escape')

  expect(app.mode, 'the moves belong to the team screen').toBe('team')
})

test('Should have nothing to carry when a Pokemon only knows the one move', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 4, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party[0].moves = [makeMoveSlot('scratch')]

  app.openHomeSelection('team')
  press(app, 'm')

  expect(movesText(app)).toContain('It only knows the one move.')

  press(app, 'enter')
  press(app, 'up')

  expect(
    app.save.party[0].moves.map((slot) => slot.move),
    'there is nowhere for it to go',
  ).toEqual(['scratch'])

  press(app, 'm')

  expect(app.mode, 'and m closes the screen it opened').toBe('team')
})

test('Should reach the Pokemon under the cursor with an item while the team is sorted by level', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const hurt = createPokemon(4, 20, makeRng(2))

  hurt.hp = 1
  app.save.party.push(hurt)
  app.save.bag = { potion: 1 }

  app.openHomeSelection('team')
  press(app, 's')
  press(app, 'up')

  expect(app.teamSelection, 'the highest level sits on top').toBe(0)

  press(app, 'i')
  press(app, 'enter')

  expect(
    app.save.party[1].hp,
    'the potion reached the hurt one, not the row it shares an index with',
  ).toBeGreaterThan(1)
  expect(itemsInBag(app.save), 'and it was spent').toEqual([])
})

test('Should withdraw the Pokemon under the cursor and leave the cursor where it was', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.box.push(createPokemon(1, 5, makeRng(1)))
  app.save.box.push(createPokemon(7, 9, makeRng(2)))
  app.save.box.push(createPokemon(25, 12, makeRng(3)))
  app.save.box.push(createPokemon(133, 40, makeRng(4)))

  app.openHomeSelection('team')
  press(app, 'b')
  press(app, 's')

  expect(app.boxSort).toBe('level')
  expect(app.boxSelection, 'the lowest level fell to the bottom').toBe(3)

  press(app, 'enter')

  expect(app.save.party[1].species, 'the row under the cursor came out').toBe(1)
  expect(app.save.box).toHaveLength(3)
  expect(app.boxSelection, 'and the cursor stayed at the bottom').toBe(2)
})

test('Should keep the cursor on the same species when the Pokedex flips to A-Z', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('dex')

  const numbered = dexText(app)

  expect(numbered).toContain('sort #')
  expect(numbered).toContain('BULBASAUR')

  press(app, 's')

  const alphabetical = dexText(app)

  expect(alphabetical).toContain('sort A–Z')
  expect(alphabetical, 'the cursor held its species').toContain('BULBASAUR')
  expect(app.dexSelection, 'which is no longer first').toBeGreaterThan(0)

  press(app, 's')

  expect(app.dexSelection, 'and back again').toBe(0)
})

test('Should refuse a full team, and keep the team its last Pokemon', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('team')

  press(app, 'd')

  expect(app.save.party).toHaveLength(1)
  expect(app.save.box).toHaveLength(0)
  expect(app.boxMessage).toMatch(/last Pok/)

  for (let i = 1; i < 6; i++)
    app.save.party.push(createPokemon(16, 5, makeRng(i)))
  app.save.box.push(createPokemon(19, 5, makeRng(99)))

  app.openBox()
  press(app, 'enter')

  expect(app.save.box, 'it stayed in the box').toHaveLength(1)
  expect(app.save.party).toHaveLength(6)
  expect(app.boxMessage).toMatch(/full/)
})

test('Should use a potion out of a battle, on whoever needs it', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const benched = createPokemon(25, 9, makeRng(1))
  benched.hp = 1
  app.save.party.push(benched)

  app.openHomeSelection('team')

  press(app, 'down')
  openBagOn(app, 'potion')
  const potions = countOf(app.save, 'potion')
  press(app, 'enter')

  expect(benched.hp, 'the bench got the potion').toBe(
    Math.min(benched.stats.hp, 21),
  )
  expect(countOf(app.save, 'potion')).toBe(potions - 1)
  expect(app.bagSelection, 'and the bag closed again').toBe(null)
  expect(app.mode, 'without leaving the team screen').toBe('team')
  expect(
    countOf(loadSave(), 'potion'),
    'spent on disk, not just on screen',
  ).toBe(potions - 1)
})

test('Should evolve somebody with a stone bought in the shop, and fill in the Pokedex', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party.push(createPokemon(25, 20, makeRng(4)))
  app.save.money = 5000

  app.openHomeSelection('shop')
  app.shopSelection = SHOP_STOCK.indexOf('thunder-stone')

  expect(app.shopSelection, 'the shop sells the Thunder Stone').not.toBe(-1)

  press(app, 'enter')

  expect(countOf(app.save, 'thunder-stone'), 'bought').toBe(1)

  press(app, 'escape')
  app.openHomeSelection('team')
  press(app, 'down')
  openBagOn(app, 'thunder-stone')
  press(app, 'enter')

  expect(app.save.party[1].species, 'Pikachu is a Raichu now').toBe(26)
  expect(countOf(app.save, 'thunder-stone'), 'and the stone is gone').toBe(0)
  expect(app.bagMessage).toMatch(/RAICHU/)
  expect(
    app.save.dex.caught,
    'an evolution you raised is an entry you earned',
  ).toContain(26)
  expect(loadSave().party[1].species, 'and it is on disk').toBe(26)
})

test('Should teach what the new form knows at the level it arrived at', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const shellder = createPokemon(90, 50, makeRng(4))
  shellder.moves = shellder.moves.slice(0, 2)
  app.save.party.push(shellder)
  app.save.bag['water-stone'] = 1

  app.openHomeSelection('team')
  press(app, 'down')
  openBagOn(app, 'water-stone')
  press(app, 'enter')

  expect(shellder.species, 'a Cloyster').toBe(91)
  expect(
    shellder.moves.map((slot) => slot.move),
    'and it learned it',
  ).toContain('spike-cannon')
  expect([].concat(app.bagMessage).join(' '), 'and said so').toMatch(
    /learned Spike Cannon/i,
  )
  expect(
    loadSave().party[1].moves.map((slot) => slot.move),
    'on disk, not just on screen',
  ).toContain('spike-cannon')
})

test('Should keep the four moves it knows and say why when the new one cannot fit', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const shellder = createPokemon(90, 50, makeRng(4))
  app.save.party.push(shellder)
  app.save.bag['water-stone'] = 1
  const before = shellder.moves.map((slot) => slot.move)

  app.openHomeSelection('team')
  press(app, 'down')
  openBagOn(app, 'water-stone')
  press(app, 'enter')

  expect(shellder.species, 'it still evolves').toBe(91)
  expect(
    shellder.moves.map((slot) => slot.move),
    'and keeps its moves',
  ).toEqual(before)

  const said = [].concat(app.bagMessage).join(' ')

  expect(said).toMatch(/Spike Cannon/i)
  expect(said).toMatch(/kept the four it knows/)
})

test('Should refuse the wrong stone, keep it, and leave the bag open', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party.push(createPokemon(25, 20, makeRng(4)))
  app.save.bag['fire-stone'] = 1

  app.openHomeSelection('team')
  press(app, 'down')
  openBagOn(app, 'fire-stone')
  press(app, 'enter')

  expect(app.save.party[1].species, 'Pikachu is unmoved').toBe(25)
  expect(countOf(app.save, 'fire-stone'), 'a wasted stone is not spent').toBe(1)
  expect(app.bagMessage).toMatch(/no effect/i)
  expect(
    app.bagSelection,
    'and you are still in the bag, on another item',
  ).not.toBe(null)
})

test('Should say a ball needs the grass rather than doing nothing with it', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('team')
  openBagOn(app, 'poke-ball')

  press(app, 'enter')

  expect(app.bagMessage).toMatch(/grass/i)
  expect(countOf(app.save, 'poke-ball'), 'and it stays in the bag').toBe(5)
})

test('Should keep the team keys to itself while the bag is open, then hand them back', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party.push(createPokemon(25, 9, makeRng(1)))

  app.openHomeSelection('team')
  openBagOn(app, 'potion')

  press(app, 'd')

  expect(app.save.party, 'nothing left the team').toHaveLength(2)

  press(app, 'b')

  expect(app.mode, 'and the box did not open either').toBe('team')

  press(app, 'escape')

  expect(app.bagSelection, 'the first one puts the bag away').toBe(null)
  expect(app.mode).toBe('team')

  press(app, 'escape')

  expect(app.mode, 'the second one leaves').toBe('home')
})

test('Should say the bag is empty instead of opening it on nothing', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.bag = {}

  app.openHomeSelection('team')
  press(app, 'i')

  expect(app.bagSelection, 'it stayed shut').toBe(null)
  expect(app.bagMessage).toMatch(/empty/i)
  expect(app.mode).toBe('team')
})

test('Should scroll the Pokedex without falling off either end', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('dex')

  press(app, 'up')

  expect(app.dexSelection, 'wraps to the last entry').toBe(150)

  press(app, 'down')

  expect(app.dexSelection, 'and back to the first').toBe(0)

  for (let i = 0; i < 200; i++) press(app, 'down')

  expect(app.dexSelection).toBeGreaterThanOrEqual(0)
  expect(app.dexSelection).toBeLessThan(151)
})

test('Should offer nothing on the OPTION screen that could stop a sprite drawing at all', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('options')

  expect(app.mode).toBe('options')
  expect(
    SETTINGS.map((setting) => setting.key),
    'no renderer, no grid, only what is left',
  ).toEqual(['spriteScale', 'sound', 'bell', 'updateCheck', 'starPrompt'])
})

test('Should make SOUND one switch for every noise the game makes, and make it stick', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('options')
  openSetting(app, 'sound')

  expect(app.config.sound, 'on by default').toBe(true)

  press(app, 'right')

  expect(app.config.sound).toBe(false)
  expect(loadConfig().sound, 'and it survives the process').toBe(false)

  press(app, 'right')

  expect(app.config.sound, 'two values, so it comes straight back').toBe(true)
})

test('Should make a noise moving on the home menu, and none anywhere once SOUND is off', () => {
  const played = []
  const playSound = (name) => played.push(name)
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playSound,
  })

  press(app, 'right')

  expect(played, 'the cursor moved and was heard').toEqual(['cursor'])

  app.openHomeSelection('options')
  openSetting(app, 'sound')
  played.length = 0
  press(app, 'right')

  expect(played, 'nothing once it is off').toEqual([])

  press(app, 'escape')
  press(app, 'left')
  press(app, 'right')

  expect(played, 'and nothing anywhere else either').toEqual([])
})

test('Should sound different opening a menu entry from walking past it', () => {
  const played = []
  const playSound = (name) => played.push(name)
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playSound,
  })

  press(app, 'right')
  press(app, 'enter')

  expect(played).toEqual(['cursor', 'select'])
  expect(app.mode, 'and it still opened the screen').toBe('team')
})

test('Should start the battle theme with the battle and stop it when the battle ends', () => {
  const track = []
  const playMusic = (name) => track.push(`start:${name}`)
  const endMusic = () => track.push('stop')
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playMusic,
    endMusic,
  })

  queueEncounter(app, { species: 10, name: 'Caterpie', level: 2, seed: 3 })

  press(app, 'enter')

  expect(track, 'it is playing before the first message').toEqual([
    'start:battle',
  ])

  clearMessages(app)

  expect(track, 'and it does not restart on every keypress').toEqual([
    'start:battle',
  ])

  let guard = 0
  while (app.mode === 'battle' && guard++ < 40) {
    if (app.battle.message) press(app, 'enter')
    else {
      app.battle.menu = 'main'
      app.battle.selection = 3
      press(app, 'enter')
    }
  }

  expect(app.mode).toBe('home')
  expect(track, 'running is one of the ways it ends').toEqual([
    'start:battle',
    'stop',
  ])
})

test('Should hand the battle theme over to the fanfare on the line that says you won', () => {
  const track = []
  const playMusic = (name) => track.push(`start:${name}`)
  const endMusic = () => track.push('stop')
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playMusic,
    endMusic,
  })

  const ace = createPokemon(25, 20, makeRng(1))
  ace.moves = [makeMoveSlot('thunder-shock')]
  app.save.party[0] = ace
  queueEncounter(app, { species: 10, name: 'Caterpie', level: 2, seed: 3 })

  press(app, 'enter')
  clearMessages(app)

  expect(track, 'the theme is still under the fight').toEqual(['start:battle'])

  attack(app)

  expect(track, 'and under the blow that ends it').toEqual(['start:battle'])

  readToFanfare(app, track)

  expect(app.battle.message, 'it turns over as the news arrives').toMatch(
    /fainted/i,
  )
  expect(track, 'one track replacing the other').toEqual([
    'start:battle',
    'start:victory',
  ])

  clearMessages(app)

  expect(app.mode).toBe('home')
  expect(track, 'and the fanfare does not follow you home').toEqual([
    'start:battle',
    'start:victory',
    'stop',
  ])
})

test('Should give a catch the same fanfare, because it is the same win', () => {
  const track = []
  const playMusic = (name) => track.push(`start:${name}`)
  const endMusic = () => track.push('stop')
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playMusic,
    endMusic,
  })

  app.save.bag['master-ball'] = 1
  queueEncounter(app, { species: 25, name: 'Pikachu', level: 6, seed: 5 })

  press(app, 'enter')
  clearMessages(app)

  app.battle.selection = 1
  press(app, 'enter')
  app.battle.selection = app.battle.bagItems.indexOf('master-ball')
  press(app, 'enter')

  expect(track, 'nothing has been decided on screen yet').toEqual([
    'start:battle',
  ])

  readToFanfare(app, track)

  expect(app.battle.message, 'it waits for the ball to hold').toMatch(/caught/i)

  clearMessages(app)

  expect(app.mode).toBe('home')
  expect(track).toEqual(['start:battle', 'start:victory', 'stop'])
})

test('Should not treat losing as a victory, whatever else it is', () => {
  const track = []
  const playMusic = (name) => track.push(`start:${name}`)
  const endMusic = () => track.push('stop')
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playMusic,
    endMusic,
  })

  loseABattle(app)

  expect(track, 'no fanfare for a blackout').toEqual(['start:battle', 'stop'])
})

test('Should stay silent in a battle with SOUND OFF, and cut the music the moment it is switched off', () => {
  const track = []
  const playMusic = (name) => track.push(`start:${name}`)
  const endMusic = () => track.push('stop')
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playMusic,
    endMusic,
  })

  app.openHomeSelection('options')
  openSetting(app, 'sound')
  press(app, 'right')

  expect(app.config.sound).toBe(false)
  expect(track, 'the switch stops whatever was playing').toEqual(['stop'])

  press(app, 'escape')
  track.length = 0
  queueEncounter(app, { species: 10, name: 'Caterpie', level: 2, seed: 3 })
  press(app, 'enter')

  expect(app.mode, 'the battle still starts').toBe('battle')
  expect(track, 'it just does not come with music').toEqual([])
})

test('Should take the music with it when you quit mid-battle', () => {
  const track = []
  const playMusic = (name) => track.push(`start:${name}`)
  const endMusic = () => track.push('stop')
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playMusic,
    endMusic,
  })

  queueEncounter(app, { species: 10, name: 'Caterpie', level: 2, seed: 3 })
  press(app, 'enter')

  const exit = process.exit
  process.exit = () => {}
  try {
    app.quit()
  } finally {
    process.exit = exit
  }

  expect(track, 'the player does not outlive the game').toEqual([
    'start:battle',
    'stop',
  ])
})

test('Should hand room back with SIZE, and wrap rather than running off the end', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('options')

  openSetting(app, 'spriteScale')
  press(app, 'right')

  expect(app.config.spriteScale).toBe(0.8)
  expect(app.spriteScale, 'the views are drawing at the new size').toBe(0.8)
  expect(loadConfig().spriteScale).toBe(0.8)

  press(app, 'left')
  press(app, 'left')

  expect(app.spriteScale, 'wrapped round to the smallest').toBe(0.5)
})

test('Should not pretend a setting that cannot be written has stuck', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('options')
  openSetting(app, 'spriteScale')
  const before = app.config.spriteScale

  const path = join(sandbox, 'config.json')
  const saved = existsSync(path) ? readFileSync(path, 'utf8') : null
  rmSync(path, { force: true })
  mkdirSync(path)

  try {
    press(app, 'right')

    expect(app.config.spriteScale, 'the config is left alone').toBe(before)
    expect(app.spriteScale, 'and so is the screen it would have changed').toBe(
      before,
    )
    expect(app.optionsMessage, 'which the screen says out loud').toMatch(
      /could not save/i,
    )
  } finally {
    rmSync(path, { recursive: true })
    if (saved !== null) writeFileSync(path, saved)
  }
})

test('Should cycle UPDATE through the three times a check can happen, and save each', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('options')
  openSetting(app, 'updateCheck')

  expect(app.config.updateCheck).toBe(true)

  press(app, 'right')

  expect(app.config.updateCheck).toBe('launch')
  expect(loadConfig().updateCheck, 'and it survives the process').toBe('launch')

  press(app, 'right')

  expect(app.config.updateCheck, 'off is still on the end of the list').toBe(
    false,
  )

  press(app, 'right')

  expect(app.config.updateCheck, 'and it wraps back round to daily').toBe(true)
})

test('Should never let a hand-edited sprite scale leave a Pokemon too small to see', () => {
  expect(spriteScale({ spriteScale: 0 })).toBe(0.4)
  expect(spriteScale({ spriteScale: -3 })).toBe(0.4)
  expect(spriteScale({ spriteScale: 12 })).toBe(1)
  expect(spriteScale({ spriteScale: 'large' })).toBe(DEFAULT_CONFIG.spriteScale)
})

test('Should do nothing on [u] unless there is an update to fetch', () => {
  const run = stubRun()
  const makeUpdateRun = () => run
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    makeUpdateRun,
  })

  app.updateNotice = null
  press(app, 'u')

  expect(app.mode, 'no notice, no screen').toBe('home')

  app.updateNotice = { kind: 'stale', version: '0.6.0' }
  press(app, 'u')

  expect(app.mode).toBe('home')
})

test('Should open the update screen on [u] when a version is on offer', () => {
  const run = stubRun()
  const makeUpdateRun = () => run
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    makeUpdateRun,
  })

  app.updateNotice = { kind: 'available', version: '0.6.0' }

  press(app, 'u')

  expect(app.mode).toBe('update')
  expect(app.update.state).toBe('running')
})

test('Should not let an update in flight be walked away from', async () => {
  const run = stubRun()
  const makeUpdateRun = () => run
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    makeUpdateRun,
  })

  app.updateNotice = { kind: 'available', version: '0.6.0' }
  press(app, 'u')

  for (const key of ['escape', 'q', 'enter', 'left']) press(app, key)

  expect(app.mode, 'a child process is mid-flight').toBe('update')

  await run.finish()
  press(app, 'escape')

  expect(app.mode).toBe('home')
  expect(app.update, 'and the run is done with').toBe(null)
})

test('Should not start a second update over the first', () => {
  const run = stubRun()
  const makeUpdateRun = () => run
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    makeUpdateRun,
  })

  app.updateNotice = { kind: 'available', version: '0.6.0' }

  press(app, 'u')
  const first = app.update
  app.startUpdate()

  expect(app.update).toBe(first)
})

test('Should leave the home screen asking for a relaunch once the update finishes', async () => {
  const run = stubRun()
  const makeUpdateRun = () => run
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    makeUpdateRun,
  })

  app.updateNotice = { kind: 'available', version: '0.6.0' }
  press(app, 'u')

  await run.finish('done', '0.6.0')

  expect(app.updateNotice?.kind).not.toBe('available')
})

test('Should only turn the spinner while a step is running', () => {
  const run = stubRun()
  const makeUpdateRun = () => run
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    makeUpdateRun,
  })

  app.updateNotice = { kind: 'available', version: '0.6.0' }
  press(app, 'u')

  const before = app.updateFrame
  let moved = false
  for (let frame = 0; frame < 12; frame++) moved = app.tickUpdate() || moved

  expect(moved, 'it turned').toBe(true)
  expect(app.updateFrame).toBeGreaterThan(before)

  run.state = 'done'
  const settled = app.updateFrame
  for (let frame = 0; frame < 12; frame++) expect(app.tickUpdate()).toBe(false)

  expect(app.updateFrame, 'a settled screen costs no redraw').toBe(settled)
})

test('Should carry the version on the home screen, and the notice only when there is one', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const size = { cols: 100, rows: 34 }

  app.updateNotice = null
  const quiet = homeView.draw(app, size).lines

  expect(quiet.join('\n'), 'the version is on screen').toContain(`v${VERSION}`)
  expect(quiet.join('\n'), 'and nothing is on offer').not.toContain('is out')

  app.updateNotice = { kind: 'available', version: '9.9.9' }
  const loud = homeView.draw(app, size).lines
  const notice = loud.find((line) => line.includes('9.9.9'))

  expect(
    notice,
    'the notice names the version and the key that fetches it',
  ).toContain('[u]')
})

test('Should hand over the badge once the whole gym is down, and write it where it survives the terminal', () => {
  const save = createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) })

  save.party = [createPokemon(150, 80, makeRng(2))]
  save.party[0].moves = [makeMoveSlot('psychic')]

  const app = createApp({
    screen: stubScreen(),
    save,
    config: { ...DEFAULT_CONFIG },
  })

  onHome(app, 'gyms')
  press(app, 'enter')

  expect(app.mode).toBe('gyms')

  press(app, 'enter')

  expect(app.mode, 'the roster opens before the first punch').toBe('gym')
  expect(app.gym.index).toBe(0)
  expect(app.save.badges).toEqual([])

  const stillToCome = ['HIKER WADE', 'LEADER BROCK', null]

  for (const next of stillToCome) {
    press(app, 'enter')

    expect(app.mode, `the battle before ${next} should start`).toBe('battle')

    fightItOut(app, 200)

    if (!next) continue

    const prompt = gymText(app)
      .split('\n')
      .find((line) => line.includes('[enter]'))

    expect(
      prompt,
      'a win leaves a prompt naming whoever is next, not a stale notice',
    ).toContain(next)
  }

  expect(app.mode, 'the gym shows you out once the leader falls').toBe('gyms')
  expect(app.gym, 'the run is finished with').toBeNull()
  expect(app.save.badges).toEqual(['pewter'])
  expect(app.gymMessage).toContain('Boulder Badge')
  expect(loadSave().badges, 'and it is on disk').toEqual(['pewter'])
})

test('Should put the save back exactly as it was when the gym beats you', () => {
  const save = createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) })

  save.party = [createPokemon(129, 5, makeRng(3))]
  save.bag = { potion: 2 }
  save.money = 1234

  const app = createApp({
    screen: stubScreen(),
    save,
    config: { ...DEFAULT_CONFIG },
  })

  app.persist()

  const expBefore = app.save.party[0].exp

  onHome(app, 'gyms')
  press(app, 'enter')
  press(app, 'enter')
  press(app, 'enter')

  fightItOut(app, 400)

  expect(app.mode).toBe('gyms')
  expect(app.gymMessage).toBe(GYM_MESSAGES.defeated)
  expect(app.save.badges).toEqual([])
  expect(app.save.money, 'the prize money never happened').toBe(1234)
  expect(app.save.bag).toEqual({ potion: 2 })
  expect(app.save.party[0].exp, 'nor did the experience').toBe(expBefore)
  expect(app.save.party[0].hp, 'nor the beating').toBe(
    app.save.party[0].stats.hp,
  )
  expect(
    app.save.stats.battles,
    'as far as the record goes, you never went',
  ).toBe(0)
  expect(loadSave().money, 'and the file agrees').toBe(1234)
})

test('Should seal the gym: no way home, no free rest, and nothing reaching the disk mid-run', () => {
  const save = createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) })

  save.money = 500

  const app = createApp({
    screen: stubScreen(),
    save,
    config: { ...DEFAULT_CONFIG },
  })

  app.persist()

  onHome(app, 'gyms')
  press(app, 'enter')
  press(app, 'enter')

  expect(app.mode).toBe('gym')

  for (const key of ['q', 'b', 'd', 'left', 'right']) {
    press(app, key)

    expect(app.mode, `[${key}] should not open a door`).toBe('gym')
  }

  app.save.money = 999
  app.persist()

  expect(loadSave().money, 'the run writes nothing').toBe(500)
})

test('Should carry your wounds into the gym, cure them only with a potion, and take the potion back if you walk out', () => {
  const save = createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) })

  save.party = [createPokemon(150, 50, makeRng(4))]
  save.party[0].hp = 5
  save.bag = { potion: 1 }

  const app = createApp({
    screen: stubScreen(),
    save,
    config: { ...DEFAULT_CONFIG },
  })

  onHome(app, 'gyms')
  press(app, 'enter')
  press(app, 'enter')

  expect(app.mode).toBe('gym')
  expect(app.save.party[0].hp, 'walking in is not a rest').toBe(5)

  press(app, 'i')

  expect(app.bagSelection, 'the bag opens over the gym').toBe(0)

  press(app, 'enter')

  expect(app.save.party[0].hp).toBe(25)
  expect(app.save.bag.potion).toBeUndefined()
  expect(app.mode, 'and you are still in the gym').toBe('gym')

  press(app, 'i')

  expect(
    gymText(app),
    'reaching for a bag with nothing in it says so',
  ).toContain('Your bag is empty')

  press(app, 'escape')

  expect(app.mode, 'one press only asks').toBe('gym')
  expect(gymText(app), 'and says so on screen').toContain(
    GYM_SCREEN_MESSAGES.confirmLeave,
  )

  press(app, 'down')

  expect(app.mode, 'anything else keeps you in').toBe('gym')
  expect(gymText(app), 'and takes the question back').not.toContain(
    GYM_SCREEN_MESSAGES.confirmLeave,
  )

  press(app, 'escape')
  press(app, 'escape')

  expect(app.mode).toBe('gyms')
  expect(app.gymMessage).toBe(GYM_MESSAGES.forfeited)
  expect(app.save.bag.potion, 'the potion you drank never left the bag').toBe(1)
  expect(app.save.party[0].hp, 'and the wound is back').toBe(5)
})

test('Should turn a fainted team away at the gym door', () => {
  const save = createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) })

  save.party[0].hp = 0

  const app = createApp({
    screen: stubScreen(),
    save,
    config: { ...DEFAULT_CONFIG },
  })

  onHome(app, 'gyms')
  press(app, 'enter')
  press(app, 'enter')

  expect(app.mode).toBe('gyms')
  expect(app.gym).toBeNull()
  expect(app.gymMessage).toBe(GYM_MESSAGES.wipedOut)
})

test('Should challenge the gym the cursor is on, not the first one on the list', () => {
  const save = createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) })

  save.party = [createPokemon(150, 50, makeRng(7))]

  const app = createApp({
    screen: stubScreen(),
    save,
    config: { ...DEFAULT_CONFIG },
  })

  onHome(app, 'gyms')
  press(app, 'enter')

  press(app, 'down')
  press(app, 'down')
  press(app, 'up')
  press(app, 'enter')

  expect(app.gym.id).toBe('cerulean')
  expect(app.mode).toBe('gym')
})

test('Should let you put a different Pokémon out front between gym battles', () => {
  const save = createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) })

  save.party = [
    createPokemon(4, 20, makeRng(8)),
    createPokemon(7, 20, makeRng(9)),
  ]

  const app = createApp({
    screen: stubScreen(),
    save,
    config: { ...DEFAULT_CONFIG },
  })

  onHome(app, 'gyms')
  press(app, 'enter')
  press(app, 'enter')

  press(app, 'up')
  press(app, 'down')
  press(app, 'down')
  press(app, 'l')

  expect(app.mode, 'you never left the gym to do it').toBe('gym')
  expect(app.save.party[0].species, 'the second one takes the front').toBe(7)
})

test('Should leave the grass alone during a gym run and pick the encounter up on the way out', () => {
  const save = createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) })

  const app = createApp({
    screen: stubScreen(),
    save,
    config: { ...DEFAULT_CONFIG },
  })

  onHome(app, 'gyms')
  press(app, 'enter')
  press(app, 'enter')

  expect(app.mode).toBe('gym')

  queueEncounter(app, { species: 129, name: 'Magikarp', level: 3, seed: 9 })

  expect(app.encounter, 'the grass waits until the gym is done with you').toBe(
    null,
  )
  expect(
    app.save.dex.seen,
    'and nothing it says reaches a save the run may undo',
  ).not.toContain(129)

  press(app, 'escape')
  press(app, 'escape')

  expect(app.mode).toBe('gyms')

  app.pump()

  expect(app.encounter?.species, 'it was still there afterwards').toBe(129)
  expect(app.save.dex.seen).toContain(129)
})

const daycareText = (app) => {
  return daycareView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .join('\n')
}

const runDaycareFrames = (app, count) => {
  let moved = 0

  for (let frame = 0; frame < count; frame++) {
    if (app.tickDaycare()) moved++
  }

  return moved
}

const withDitto = (app) => {
  app.save.party.push(createPokemon(132, 10, makeRng(1)))
  app.save.party.push(createPokemon(25, 10, makeRng(2)))
}

const leaveOneAtDaycare = (app, downs) => {
  press(app, 'enter')

  expect(app.daycareStep, 'the empty slot asks who to leave').toBe('pick')

  for (let step = 0; step < downs; step++) press(app, 'down')

  press(app, 'enter')
}

test('Should leave two at the day care from the home menu and find an egg between them', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  withDitto(app)
  walkHomeTo(app, 'daycare')
  press(app, 'enter')

  expect(app.mode).toBe('daycare')
  expect(daycareText(app), 'nothing is going on in there yet').toContain(
    'Leave two here and they might get on',
  )

  press(app, 'up')

  expect(app.daycareSelection, 'up from the first slot lands on the last').toBe(
    1,
  )

  press(app, 'enter')
  press(app, 'up')
  press(app, 'escape')

  expect(app.daycareStep, 'and the picker can be backed out of').toBe('slots')
  expect(app.save.daycare.slots, 'with nobody taken').toEqual([])

  leaveOneAtDaycare(app, 1)

  expect(
    app.daycareSelection,
    'the cursor follows the deposit rather than sitting on an empty row',
  ).toBe(0)

  expect(app.save.daycare.slots.map((mon) => mon.species)).toEqual([132])
  expect(daycareText(app)).toContain('DITTO was left at the day care')

  press(app, 'down')
  leaveOneAtDaycare(app, 1)

  expect(app.save.daycare.slots.map((mon) => mon.species)).toEqual([132, 25])
  expect(
    app.save.party.map((mon) => mon.species),
    'both came out of the team',
  ).toEqual([1])

  expect(
    app.save.daycare.egg.species,
    'Ditto fills the egg with the other',
  ).toBe(25)

  const text = daycareText(app)

  expect(text).toContain('They left an egg behind')
  expect(text).toContain('The two seem to get along')
  expect(text).toContain(`0/${EGG_STEPS} steps`)
})

test('Should say the two do not get on rather than making an egg out of a bad pair', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.save.party.push(createPokemon(19, 10, makeRng(1)))
  app.save.party.push(createPokemon(81, 10, makeRng(2)))

  app.openDaycare('home')
  leaveOneAtDaycare(app, 1)
  press(app, 'down')
  leaveOneAtDaycare(app, 1)

  expect(app.save.daycare.slots).toHaveLength(2)
  expect(app.save.daycare.egg).toBe(null)

  const text = daycareText(app)

  expect(text).toContain('The two prefer to play with other Pokémon')
  expect(text).toContain('No egg yet')
})

test('Should keep the last one of the team out of the day care and say why', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  app.openDaycare('home')
  leaveOneAtDaycare(app, 0)

  expect(app.save.daycare.slots, 'nobody was taken').toEqual([])
  expect(daycareText(app)).toContain('somebody has to fight')
})

test('Should take one back out of a slot and into the team', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  withDitto(app)
  app.openDaycare('home')
  leaveOneAtDaycare(app, 1)
  press(app, 'down')
  leaveOneAtDaycare(app, 1)

  expect(app.daycareSelection, 'the cursor is on the second one').toBe(1)

  press(app, 'enter')

  expect(
    app.daycareSelection,
    'taking it back leaves the cursor on the slot it emptied, not on the other parent',
  ).toBe(1)
  expect(app.save.daycare.slots.map((mon) => mon.species)).toEqual([132])

  press(app, 'up')
  press(app, 'enter')

  expect(app.save.daycare.slots, 'the slots are free again').toEqual([])
  expect(app.save.party.map((mon) => mon.species)).toEqual([1, 25, 132])

  const text = daycareText(app)

  expect(text).toContain('DITTO came back from the day care')
  expect(text).toContain('It joined your team')
})

test('Should reach the day care from the team screen and come back to it', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  onHome(app, 'team')
  press(app, 'enter')
  press(app, 'c')

  expect(app.mode).toBe('daycare')

  press(app, 'escape')

  expect(app.mode, 'esc goes back where you came from').toBe('team')
})

test('Should only bring the egg along while Claude works, and never in a gym', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  withDitto(app)
  app.openDaycare('home')
  leaveOneAtDaycare(app, 1)
  press(app, 'down')
  leaveOneAtDaycare(app, 1)

  expect(
    runDaycareFrames(app, FRAMES_PER_DAYCARE_STEP * 2),
    'an unwatched egg goes nowhere',
  ).toBe(0)
  expect(app.save.daycare.egg.steps).toBe(0)

  reportSession('working', 'Bash')
  app.refreshActivity()

  const moved = runDaycareFrames(app, FRAMES_PER_DAYCARE_STEP * 3)

  expect(moved, 'three steps in, three steps worth of frames').toBe(3)
  expect(app.save.daycare.egg.steps).toBe(3)
  expect(
    app.save.daycare.slots[1].exp,
    'and whoever waits there gained EXP for each one',
  ).toBe(createPokemon(25, 10, makeRng(2)).exp + DAYCARE_EXP_PER_STEP * 3)

  app.gym = { id: 'pewter', index: 0, seed: 1, snapshot: null }

  expect(
    runDaycareFrames(app, FRAMES_PER_DAYCARE_STEP),
    'a gym run must not carry an egg it may undo',
  ).toBe(0)
  expect(app.save.daycare.egg.steps).toBe(3)

  endSession('test-session')
})

test('Should teach the ones waiting at the day care and say what they learned', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 4, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
  })

  const magikarp = createPokemon(129, 14, makeRng(1))
  const bulbasaur = createPokemon(1, 19, makeRng(2))

  magikarp.exp = expForLevel(129, 15) - 1
  bulbasaur.exp = expForLevel(1, 20) - 1

  app.save.party.push(magikarp, bulbasaur)
  app.openDaycare('home')
  leaveOneAtDaycare(app, 1)
  press(app, 'down')
  leaveOneAtDaycare(app, 1)

  reportSession('working', 'Bash')
  app.refreshActivity()

  expect(
    runDaycareFrames(app, FRAMES_PER_DAYCARE_STEP),
    'the step they grew on is one worth repainting',
  ).toBe(1)

  const text = daycareText(app)

  expect(text).toContain('Magikarp learned Tackle!')
  expect(text).toContain('Bulbasaur forgot Tackle and learned Poison Powder!')
  expect(app.notice, 'and it carries over to the home screen').toBe(
    'Magikarp learned Tackle!',
  )

  expect(
    loadSave().daycare.slots[0].moves.map((slot) => slot.move),
    'what they picked up was written down',
  ).toEqual(['splash', 'tackle'])

  endSession('test-session')
})

test('Should hatch the egg into the team, with its own line and sound', () => {
  const playSound = vi.fn()
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playSound,
  })

  withDitto(app)
  app.openDaycare('home')
  leaveOneAtDaycare(app, 1)
  press(app, 'down')
  leaveOneAtDaycare(app, 1)
  press(app, 'escape')

  app.save.daycare.egg.steps = EGG_STEPS - 1

  reportSession('working', 'Bash')
  app.refreshActivity()
  runDaycareFrames(app, FRAMES_PER_DAYCARE_STEP)

  expect(app.save.daycare.egg, 'the egg is gone once it is open').toBe(null)
  expect(app.save.party.map((mon) => mon.species)).toEqual([1, 25])
  expect(app.save.party[1].exp).toBe(
    createPokemon(25, EGG_LEVEL, makeRng(1)).exp,
  )
  expect(app.save.dex.caught, 'and it is an entry like any other').toContain(25)

  expect(app.notice).toBe('PIKACHU hatched from the egg!')
  expect(playSound).toHaveBeenCalledTimes(1)
  expect(playSound).toHaveBeenCalledWith('hatch')

  expect(loadSave().party, 'the hatch was written down').toHaveLength(2)

  onHome(app, 'daycare')
  press(app, 'enter')

  expect(
    daycareText(app),
    'a hatch that happened on another screen is still there to read',
  ).toContain('It joined your team')

  runDaycareFrames(app, FRAMES_PER_DAYCARE_STEP)

  expect(
    app.save.daycare.egg?.species,
    'the pair is still together, so they leave another one',
  ).toBe(25)

  endSession('test-session')
})

test('Should give a shiny hatch the line, the sound and the entry a shiny gets', () => {
  const playSound = vi.fn()
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playSound,
  })

  withDitto(app)
  app.rng = () => 0
  app.openDaycare('home')
  leaveOneAtDaycare(app, 1)
  press(app, 'down')
  leaveOneAtDaycare(app, 1)

  expect(app.save.daycare.egg.shiny, 'the roll came up short of the odds').toBe(
    true,
  )

  app.save.daycare.egg.steps = EGG_STEPS - 1

  reportSession('working', 'Bash')
  app.refreshActivity()
  runDaycareFrames(app, FRAMES_PER_DAYCARE_STEP)

  expect(app.save.party[1].shiny).toBe(true)
  expect(app.save.dex.shiny).toContain(25)
  expect(app.notice).toContain(BATTLE_MESSAGES.shiny)
  expect(playSound).toHaveBeenCalledTimes(1)
  expect(playSound).toHaveBeenCalledWith('shiny')

  endSession('test-session')
})

test('Should run every ticker on a frame rather than stopping at the first that moved', () => {
  const app = createApp({
    screen: stubScreen(),
    save: createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) }),
    config: { ...DEFAULT_CONFIG },
    playSound: () => {},
    playMusic: () => {},
    endMusic: () => {},
  })

  withDitto(app)
  app.openDaycare('home')
  leaveOneAtDaycare(app, 1)
  press(app, 'down')
  leaveOneAtDaycare(app, 1)
  press(app, 'escape')

  duel(app)
  reportSession('working', 'Bash')
  app.refreshActivity()

  expect(app.mode, 'a battle is what the frame loop is busiest with').toBe(
    'battle',
  )

  for (let frame = 0; frame < FRAMES_PER_DAYCARE_STEP; frame++) app.tickFrame()

  expect(
    app.save.daycare.egg.steps,
    'the egg still came along behind the battle',
  ).toBe(1)

  endSession('test-session')
})

const starText = (app) => {
  return starView
    .draw(app, { cols: 100, rows: 34 })
    .lines.map(stripAnsi)
    .join('\n')
}

const aVeteran = () => {
  const save = createSave({ trainer: 'Red', starterId: 1, rng: makeRng(1) })

  save.badges = ['pewter']

  return save
}

test('Should ask for a star once a badge is in, open the repo and never ask again', () => {
  const openUrl = vi.fn(() => true)
  const app = createApp({
    screen: stubScreen(),
    save: aVeteran(),
    config: { ...DEFAULT_CONFIG },
    openUrl,
  })

  expect(app.askForStar(), 'earned it, at rest, never asked before').toBe(true)
  expect(app.mode).toBe('star')

  const dialog = starText(app)

  expect(dialog).toContain('PROF. OAK')
  expect(dialog).toContain('So, are you enjoying your journey?')
  expect(dialog).toContain('[enter] leave a star')
  expect(dialog, 'the address is on screen either way').toContain(STAR_REPO_URL)

  press(app, 'x')

  expect(app.mode, 'a stray keystroke is not an answer').toBe('star')

  press(app, 'enter')

  expect(app.mode).toBe('home')
  expect(app.notice).toBe(STAR_MESSAGES.thanks)
  expect(openUrl).toHaveBeenCalledTimes(1)
  expect(openUrl).toHaveBeenCalledWith(STAR_REPO_URL)
  expect(app.config.starPrompt.answered).toBe(STAR_ANSWERS.starred)
  expect(loadConfig().starPrompt.answered, 'and it survives the process').toBe(
    STAR_ANSWERS.starred,
  )
  expect(app.askForStar(), 'a yes is the end of it').toBe(false)
})

test('Should take a not now from any of the ways out and leave the ask alive', () => {
  for (const name of ['n', 'escape', 'space', 'q']) {
    const app = createApp({
      screen: stubScreen(),
      save: aVeteran(),
      config: { ...DEFAULT_CONFIG },
      openUrl: vi.fn(),
    })

    app.askForStar()
    press(app, name)

    expect(app.mode, `[${name}] should put the dialog away`).toBe('home')
    expect(app.notice, `[${name}] says nothing back`).toBeNull()
    expect(app.config.starPrompt, `[${name}] counts and re-arms`).toEqual({
      askedAt: expect.any(String),
      asks: 1,
      answered: null,
    })
  }
})

test('Should bury the ask for good on a never ask', () => {
  const app = createApp({
    screen: stubScreen(),
    save: aVeteran(),
    config: { ...DEFAULT_CONFIG },
    openUrl: vi.fn(),
  })

  app.askForStar()
  press(app, 'd')

  expect(app.mode).toBe('home')
  expect(app.config.starPrompt.answered).toBe(STAR_ANSWERS.never)
  expect(app.askForStar()).toBe(false)
  expect(loadConfig().starPrompt.answered, 'and it survives the process').toBe(
    STAR_ANSWERS.never,
  )
})

test('Should hand over the address when nothing opens a browser', () => {
  const openUrl = vi.fn(() => false)
  const app = createApp({
    screen: stubScreen(),
    save: aVeteran(),
    config: { ...DEFAULT_CONFIG },
    openUrl,
  })

  app.askForStar()
  press(app, 'enter')

  expect(app.notice).toContain(STAR_MESSAGES.noBrowser)
  expect(app.notice, 'the ask never ends having done nothing').toContain(
    STAR_REPO_URL,
  )
  expect(openUrl).toHaveBeenCalledTimes(1)
})

test('Should never put the ask in front of an encounter or a battle', () => {
  const app = createApp({
    screen: stubScreen(),
    save: aVeteran(),
    config: { ...DEFAULT_CONFIG },
    openUrl: vi.fn(),
  })

  queueEncounter(app, { species: 10, name: 'Caterpie', level: 12, seed: 7 })

  expect(app.askForStar(), 'the grass got there first').toBe(false)
  expect(app.mode).toBe('home')

  press(app, 'enter')
  clearMessages(app)

  expect(app.mode).toBe('battle')
  expect(app.askForStar(), "and a battle is nobody's moment for a favour").toBe(
    false,
  )
  expect(app.mode).toBe('battle')

  clearEncounter()
  app.pump()
})

test('Should turn the star ask off from the options screen, and back on again', () => {
  const app = createApp({
    screen: stubScreen(),
    save: aVeteran(),
    config: { ...DEFAULT_CONFIG },
  })

  app.openHomeSelection('options')
  openSetting(app, 'starPrompt')

  press(app, 'right')

  expect(app.config.starPrompt.answered).toBe(STAR_ANSWERS.never)
  expect(loadConfig().starPrompt.answered, 'and it survives the process').toBe(
    STAR_ANSWERS.never,
  )

  press(app, 'right')

  expect(
    app.config.starPrompt.answered,
    'two values, so it comes straight back',
  ).toBeNull()

  press(app, 'escape')

  expect(app.askForStar(), 'and the professor can ask again').toBe(true)
})
