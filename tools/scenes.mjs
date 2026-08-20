import { recordAchievements } from '../src/achievements.mjs'
import { createApp } from '../src/app.mjs'
import { createBattle } from '../src/battle.mjs'
import { createBattleFlow } from '../src/battleFlow.mjs'
import { BATTLE_MESSAGES, DEFAULT_CONFIG } from '../src/constants.mjs'
import { raiseDaycare } from '../src/daycare.mjs'
import { advanceGymRun, createGymRun, gymById, gymIndex } from '../src/gym.mjs'
import { createPokemon } from '../src/pokemon.mjs'
import { makeRng } from '../src/rng.mjs'
import {
  createSave,
  markCaught,
  markFaced,
  markSeen,
  recordInDex,
} from '../src/state.mjs'
import { TRADE_FILE } from '../src/paths.mjs'
import { encodeTrade } from '../src/trade.mjs'
import { trainerClass } from '../src/trainer.mjs'
import {
  PREVIEW_BADGES,
  PREVIEW_BAG,
  PREVIEW_CAUGHT,
  PREVIEW_DAYCARE_PAIR,
  PREVIEW_DAYS_ON_THE_ROAD,
  PREVIEW_EARNED_AT,
  PREVIEW_EGG_STEPS,
  PREVIEW_FACED,
  PREVIEW_GYM,
  PREVIEW_GYM_SEED,
  PREVIEW_MONEY,
  PREVIEW_PARTY,
  PREVIEW_POISONED,
  PREVIEW_SEEN,
  PREVIEW_STATS,
  PREVIEW_TRADE_ID,
  PREVIEW_TRAINER,
  PREVIEW_UPDATE_STEPS,
  PREVIEW_WILD,
  PREVIEW_WORKED_MS,
} from './constants.mjs'

const DAY_MS = 24 * 60 * 60 * 1000

const partyMon = ([id, level, shiny, health], index) => {
  const mon = createPokemon(id, level, makeRng(4000 + index * 7), shiny)

  mon.hp = Math.max(1, Math.round(mon.stats.hp * health))

  if (mon.species === PREVIEW_POISONED) mon.status = 'poison'

  return mon
}

export const sampleSave = () => {
  const rng = makeRng(31337)
  const save = createSave({ trainer: 'Zam', starterId: 4, rng })

  save.trainer.startedAt = new Date(
    Date.now() - PREVIEW_DAYS_ON_THE_ROAD * DAY_MS,
  ).toISOString()
  save.money = PREVIEW_MONEY
  save.bag = { ...PREVIEW_BAG }
  save.badges = [...PREVIEW_BADGES]
  save.party = PREVIEW_PARTY.map(partyMon)

  Object.assign(save.stats, PREVIEW_STATS)

  for (const mon of save.party) recordInDex(save, mon)
  for (const id of PREVIEW_CAUGHT) markCaught(save, id)
  for (const id of PREVIEW_SEEN) markSeen(save, id)
  for (const [id, times] of PREVIEW_FACED) {
    for (let met = 0; met < times; met++) markFaced(save, id)
  }

  return save
}

const recordingScreen = (size) => {
  const painted = { lines: [], overlays: [] }

  return {
    painted: () => painted,
    size: () => size,
    render: (lines, overlays) => {
      painted.lines = lines
      painted.overlays = overlays
    },
    repaint: () => {},
    stop: () => {},
    onKey: () => {},
    onResize: () => {},
  }
}

const makeApp = (save, size) => {
  const app = createApp({
    screen: recordingScreen(size),
    save,
    config: { ...DEFAULT_CONFIG },
  })

  app.updateNotice = null

  return app
}

export const drawScene = (app) => {
  app.paint()

  return app.screen.painted()
}

const stepStatus = (state, index, at) => {
  if (state === 'done') return 'ok'
  if (index < at) return 'ok'
  if (index === at) return 'running'

  return 'pending'
}

const updateRun = ({ state = 'running', at = 1, to = null }) => {
  return {
    kind: 'plugin',
    state,
    from: '0.5.0',
    to,
    steps: PREVIEW_UPDATE_STEPS.map(([label, done], index) => ({
      id: String(index),
      label,
      done,
      status: stepStatus(state, index, at),
      detail: null,
    })),
  }
}

const previewTrainer = () => {
  return {
    class: PREVIEW_TRAINER.class,
    name: PREVIEW_TRAINER.name,
    sprite: PREVIEW_TRAINER.sprite,
    prize: trainerClass(PREVIEW_TRAINER.class).prize,
    team: PREVIEW_TRAINER.team.map(([species, name, level]) => ({
      species,
      name,
      level,
    })),
  }
}

const trainerBattleState = (app, seed) => {
  const trainer = previewTrainer()
  const team = trainer.team.map((entry, index) => {
    return createPokemon(entry.species, entry.level, makeRng(seed + index))
  })

  markFaced(app.save, team[0].species)

  return createBattle({
    playerMon: app.save.party[0],
    wildMon: team[0],
    seed,
    trainer: {
      class: trainer.class,
      name: trainer.name,
      sprite: trainer.sprite,
      prize: trainer.prize,
      team,
    },
  })
}

export const SCENES = {
  'starter-name': (size) => {
    const app = makeApp(null, size)
    app.mode = 'starter'
    app.setup = { step: 'name', name: 'Sergio', selection: 1, blink: true }

    return app
  },
  starter: (size) => {
    const app = makeApp(null, size)
    app.mode = 'starter'
    app.setup = { step: 'starter', name: 'Sergio', selection: 1, blink: true }

    return app
  },
  'home-quiet': (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'home'

    return app
  },
  'home-working': (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'home'
    app.activity = {
      state: 'working',
      tool: 'Bash',
      since: Date.now() - 74_000,
      counts: { working: 1, waiting: 0, idle: 0 },
    }
    app.scene.step = Number(process.env.CLAUDEMON_WALK_STEP ?? 14)

    return app
  },
  'home-needed': (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'home'
    app.activity = {
      state: 'waiting',
      tool: 'Bash',
      since: Date.now() - 9_000,
      counts: { working: 2, waiting: 1, idle: 0 },
    }

    return app
  },
  home: (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'home'
    app.activity = {
      state: 'working',
      tool: 'Edit',
      since: Date.now() - 213_000,
      counts: { working: 2, waiting: 0, idle: 1 },
    }
    app.encounter = {
      species: PREVIEW_WILD.species,
      name: 'Vileplume',
      level: PREVIEW_WILD.level,
      seed: 1,
      expiresAt: Date.now() + 22_000,
    }

    return app
  },
  'home-trainer': (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'home'
    app.activity = {
      state: 'working',
      tool: 'Edit',
      since: Date.now() - 213_000,
      counts: { working: 2, waiting: 0, idle: 1 },
    }
    app.encounter = {
      kind: 'trainer',
      trainer: previewTrainer(),
      seed: 7,
      expiresAt: Date.now() + 22_000,
    }

    return app
  },
  battle: (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'battle'

    const wild = createPokemon(
      PREVIEW_WILD.species,
      PREVIEW_WILD.level,
      makeRng(9),
    )

    wild.hp = Math.floor(wild.stats.hp * PREVIEW_WILD.hp)

    const state = createBattle({
      playerMon: app.save.party[0],
      wildMon: wild,
      seed: 5,
    })

    app.battle = createBattleFlow(state)

    return app
  },
  'trainer-battle': (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'battle'
    app.battle = createBattleFlow(trainerBattleState(app, 11))

    return app
  },
  'home-shiny': (size) => {
    const app = SCENES.home(size)

    app.encounter = {
      kind: 'wild',
      species: 130,
      name: 'Gyarados',
      level: 45,
      seed: 3,
      shiny: true,
      expiresAt: Date.now() + 22_000,
    }

    return app
  },
  'battle-shiny': (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'battle'

    const state = createBattle({
      playerMon: app.save.party[0],
      wildMon: createPokemon(130, 45, makeRng(9), true),
      seed: 5,
    })

    app.battle = createBattleFlow(state)
    app.battle.message = BATTLE_MESSAGES.shiny

    return app
  },
  'battle-caught': (size) => {
    const app = SCENES.battle(size)
    markCaught(app.save, app.battle.state.foe.mon.species)

    return app
  },
  'battle-fight': (size) => {
    const app = SCENES.battle(size)
    app.battle.menu = 'fight'
    app.battle.selection = 2

    return app
  },
  'battle-item': (size) => {
    const app = SCENES.battle(size)
    app.save.bag.revive = 1
    app.save.party[1].hp = 0
    app.battle.bagItems = ['poke-ball', 'great-ball', 'potion', 'revive']
    app.battle.bagItem = 'revive'
    app.battle.menu = 'target'
    app.battle.selection = 1

    return app
  },
  'battle-message': (size) => {
    const app = SCENES.battle(size)
    app.battle.message = "It's super effective!"
    app.battle.events = [
      { type: 'message', text: 'The wild VILEPLUME fainted!' },
    ]

    return app
  },
  'battle-hit': (size) => {
    const app = SCENES.battle(size)
    app.battle.message = 'CHARIZARD used Flamethrower!'
    app.battle.menu = null
    app.battle.effect = {
      side: 'foe',
      frame: Number(process.env.CLAUDEMON_HIT_FRAME ?? 2),
    }
    app.battle.hpTarget.foe = Math.floor(app.battle.hp.foe / 2)
    app.battle.hp.foe = Math.floor(app.battle.hp.foe * 0.8)

    return app
  },
  'battle-ball': (size) => {
    const app = SCENES.battle(size)
    app.battle.message = 'You threw a Poké Ball!'
    app.battle.menu = null
    app.battle.ball = {
      shakes: 3,
      caught: false,
      frame: Number(process.env.CLAUDEMON_BALL_FRAME ?? 12),
      done: false,
    }

    return app
  },
  dex: (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'dex'
    app.dexSelection = 24

    return app
  },
  team: (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'team'
    app.teamSelection = 1

    return app
  },
  moves: (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'moves'
    app.teamSelection = 0
    app.moveSelection = 2
    app.moveHeld = true

    return app
  },
  gyms: (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'gyms'
    app.gymSelection = 0

    return app
  },
  'gym-leader': (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'gyms'
    app.gymSelection = gymIndex(PREVIEW_GYM)

    return app
  },
  'gym-run': (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'gym'
    app.gym = advanceGymRun(
      createGymRun({
        gym: gymById(PREVIEW_GYM),
        seed: PREVIEW_GYM_SEED,
        save: app.save,
      }),
    )

    return app
  },
  'daycare-raising': (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'daycare'
    app.daycareSelection = 1
    app.save.daycare.slots = [
      createPokemon(19, 12, makeRng(5)),
      createPokemon(81, 14, makeRng(6)),
    ]

    for (let step = 0; step < PREVIEW_EGG_STEPS; step++) raiseDaycare(app.save)

    return app
  },
  'daycare-egg': (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'daycare'
    app.save.daycare.slots = PREVIEW_DAYCARE_PAIR.map(partyMon)
    app.save.daycare.egg = { species: 25, steps: 0, shiny: false }

    return app
  },
  daycare: (size) => {
    const app = SCENES['daycare-egg'](size)

    app.save.daycare.egg.steps = PREVIEW_EGG_STEPS

    for (let step = 0; step < PREVIEW_EGG_STEPS; step++) raiseDaycare(app.save)

    return app
  },
  'daycare-empty': (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'daycare'

    return app
  },
  'daycare-pick': (size) => {
    const app = SCENES.daycare(size)

    app.daycareStep = 'pick'
    app.daycarePickSelection = 1

    return app
  },
  shop: (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'shop'
    app.shopSelection = 2

    return app
  },
  options: (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'options'

    return app
  },
  trainer: (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'trainer'
    app.worked = { totalMs: PREVIEW_WORKED_MS, updatedAt: null }
    recordAchievements(app.save, app.worked, Date.parse(PREVIEW_EARNED_AT))

    return app
  },
  trade: (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'trade'
    app.tradeStep = 'confirm'
    app.tradeGiving = { mon: app.save.party[1], source: 'party', index: 1 }

    return app
  },
  'trade-code': (size) => {
    const app = SCENES.trade(size)

    app.tradeStep = 'code'
    app.tradeGone = app.save.party[1]
    app.tradeCode = encodeTrade(
      app.save.party[1],
      app.save.trainer,
      PREVIEW_TRADE_ID,
    )
    app.tradeCopied = true
    app.tradePath = TRADE_FILE

    return app
  },
  'trade-receive': (size) => {
    const app = SCENES.trade(size)

    app.tradeStep = 'receive'
    app.tradeInput = encodeTrade(
      app.save.party[1],
      app.save.trainer,
      PREVIEW_TRADE_ID,
    )

    return app
  },
  'home-update': (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'home'
    app.activity = {
      state: 'idle',
      tool: null,
      since: Date.now() - 40_000,
      counts: { working: 0, waiting: 0, idle: 1 },
    }
    app.updateNotice = { kind: 'available', version: '0.6.0' }

    return app
  },
  update: (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'update'
    app.update = updateRun({
      at: Number(process.env.CLAUDEMON_UPDATE_STEP ?? 1),
    })
    app.updateFrame = Number(process.env.CLAUDEMON_SPIN_FRAME ?? 0)

    return app
  },
  'update-done': (size) => {
    const app = makeApp(sampleSave(), size)
    app.mode = 'update'
    app.update = updateRun({ state: 'done', to: '0.6.0' })

    return app
  },
  'update-failed': (size) => {
    const app = makeApp(sampleSave(), size)

    app.mode = 'update'

    const run = updateRun({ at: 1 })

    run.state = 'failed'
    run.steps[1].status = 'failed'
    run.steps[1].detail =
      'no `claude` command found — is Claude Code on your PATH?'
    app.update = run

    return app
  },
}

export const buildScene = (name, size) => {
  const build = SCENES[name]

  if (!build) return null

  return build(size)
}
