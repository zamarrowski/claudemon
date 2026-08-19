import { recordAchievements } from '../src/achievements.mjs'
import { createApp } from '../src/app.mjs'
import { createBattle } from '../src/battle.mjs'
import { createBattleFlow } from '../src/battleFlow.mjs'
import { BATTLE_MESSAGES, DEFAULT_CONFIG } from '../src/constants.mjs'
import { raiseDaycare } from '../src/daycare.mjs'
import { createPokemon } from '../src/pokemon.mjs'
import { makeRng } from '../src/rng.mjs'
import {
  addPokemon,
  createSave,
  markCaught,
  markFaced,
  markSeen,
} from '../src/state.mjs'
import { TRADE_FILE } from '../src/paths.mjs'
import { encodeTrade } from '../src/trade.mjs'
import { bold, dim } from '../src/ui/ansi.mjs'
import {
  PREVIEW_COLS,
  PREVIEW_EARNED_AT,
  PREVIEW_EGG_STEPS,
  PREVIEW_ROWS,
  PREVIEW_TRADE_ID,
  PREVIEW_UPDATE_STEPS,
  PREVIEW_WORKED_MS,
} from './constants.mjs'

const [requested, colsArg, rowsArg] = process.argv.slice(2)
const cols = Number(colsArg) || PREVIEW_COLS
const rows = Number(rowsArg) || PREVIEW_ROWS

const sampleSave = () => {
  const rng = makeRng(31337)
  const save = createSave({ trainer: 'Sergio', starterId: 4, rng })

  save.money = 5400
  save.bag = { 'poke-ball': 7, 'great-ball': 2, potion: 3, 'thunder-stone': 1 }

  save.party[0] = createPokemon(4, 12, rng)
  addPokemon(save, createPokemon(25, 12, rng))
  addPokemon(save, createPokemon(16, 9, rng))
  save.party[2].hp = Math.floor(save.party[2].stats.hp * 0.3)
  save.party[2].status = 'poison'

  for (const id of [10, 13, 19, 21, 41, 43, 74, 129, 133]) markSeen(save, id)
  for (const [id, times] of [
    [16, 9],
    [19, 6],
    [25, 4],
    [10, 3],
    [41, 2],
    [129, 1],
  ]) {
    for (let met = 0; met < times; met++) markFaced(save, id)
  }

  return save
}

const makeApp = (save) => {
  const screen = {
    size: () => ({ cols, rows }),
    render: () => {},
    repaint: () => {},
    stop: () => {},
    onKey: () => {},
    onResize: () => {},
  }

  return createApp({ screen, save, config: { ...DEFAULT_CONFIG } })
}

const MODULES = {
  starter: await import('../src/ui/views/starter.mjs'),
  home: await import('../src/ui/views/home.mjs'),
  battle: await import('../src/ui/views/battle.mjs'),
  dex: await import('../src/ui/views/dex.mjs'),
  team: await import('../src/ui/views/team.mjs'),
  moves: await import('../src/ui/views/moves.mjs'),
  daycare: await import('../src/ui/views/daycare.mjs'),
  shop: await import('../src/ui/views/shop.mjs'),
  options: await import('../src/ui/views/options.mjs'),
  trade: await import('../src/ui/views/trade.mjs'),
  trainer: await import('../src/ui/views/trainer.mjs'),
  update: await import('../src/ui/views/update.mjs'),
}

const show = (title, app) => {
  process.stdout.write(
    `\n${bold(`── ${title} `)}${dim('─'.repeat(Math.max(0, cols - title.length - 4)))}\n`,
  )

  const module = MODULES[app.mode]
  const { lines, overlays } = module.draw(app, { cols, rows })

  process.stdout.write(lines.join('\n') + '\n')

  for (const overlay of overlays) {
    const up = lines.length - overlay.row + 1

    if (up < 1) continue

    process.stdout.write(
      `\x1b7\x1b[${up}A\r\x1b[${overlay.col - 1}C${overlay.sequence}\x1b8`,
    )
  }
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

const SCENES = {
  'starter-name': () => {
    const app = makeApp(null)
    app.mode = 'starter'
    app.setup = { step: 'name', name: 'Sergio', selection: 1, blink: true }

    return app
  },
  starter: () => {
    const app = makeApp(null)
    app.mode = 'starter'
    app.setup = { step: 'starter', name: 'Sergio', selection: 1, blink: true }

    return app
  },
  'home-quiet': () => {
    const app = makeApp(sampleSave())
    app.mode = 'home'

    return app
  },
  'home-working': () => {
    const app = makeApp(sampleSave())
    app.mode = 'home'
    app.activity = {
      state: 'working',
      tool: 'Bash',
      since: Date.now() - 74_000,
      sessions: 1,
    }
    app.scene.step = Number(process.env.CLAUDEMON_WALK_STEP ?? 14)

    return app
  },
  'home-needed': () => {
    const app = makeApp(sampleSave())
    app.mode = 'home'
    app.activity = {
      state: 'waiting',
      tool: 'Bash',
      since: Date.now() - 9_000,
      sessions: 1,
    }

    return app
  },
  home: () => {
    const app = makeApp(sampleSave())
    app.mode = 'home'
    app.activity = {
      state: 'working',
      tool: 'Edit',
      since: Date.now() - 213_000,
      sessions: 2,
    }
    app.encounter = {
      species: 25,
      name: 'Pikachu',
      level: 11,
      seed: 1,
      expiresAt: Date.now() + 22_000,
    }

    return app
  },
  battle: () => {
    const app = makeApp(sampleSave())

    app.mode = 'battle'

    const wild = createPokemon(43, 12, makeRng(9))

    wild.hp = Math.floor(wild.stats.hp * 0.55)

    const state = createBattle({
      playerMon: app.save.party[0],
      wildMon: wild,
      seed: 5,
    })

    app.battle = createBattleFlow(state)

    return app
  },
  'home-shiny': () => {
    const app = SCENES.home()

    app.encounter = {
      kind: 'wild',
      species: 130,
      name: 'Gyarados',
      level: 25,
      seed: 3,
      shiny: true,
      expiresAt: Date.now() + 22_000,
    }

    return app
  },
  'battle-shiny': () => {
    const app = makeApp(sampleSave())

    app.mode = 'battle'

    const state = createBattle({
      playerMon: app.save.party[0],
      wildMon: createPokemon(130, 25, makeRng(9), true),
      seed: 5,
    })

    app.battle = createBattleFlow(state)
    app.battle.message = BATTLE_MESSAGES.shiny

    return app
  },
  'battle-caught': () => {
    const app = SCENES.battle()
    markCaught(app.save, app.battle.state.foe.mon.species)

    return app
  },
  'battle-fight': () => {
    const app = SCENES.battle()
    app.battle.menu = 'fight'
    app.battle.selection = 2

    return app
  },
  'battle-item': () => {
    const app = SCENES.battle()
    app.save.bag.revive = 1
    app.save.party[1].hp = 0
    app.battle.bagItems = ['poke-ball', 'great-ball', 'potion', 'revive']
    app.battle.bagItem = 'revive'
    app.battle.menu = 'target'
    app.battle.selection = 1

    return app
  },
  'battle-message': () => {
    const app = SCENES.battle()
    app.battle.message = "It's super effective!"
    app.battle.events = [{ type: 'message', text: 'The wild ODDISH fainted!' }]

    return app
  },
  'battle-hit': () => {
    const app = SCENES.battle()
    app.battle.message = 'CHARMANDER used Ember!'
    app.battle.menu = null
    app.battle.effect = {
      side: 'foe',
      frame: Number(process.env.CLAUDEMON_HIT_FRAME ?? 2),
    }
    app.battle.hpTarget.foe = Math.floor(app.battle.hp.foe / 2)
    app.battle.hp.foe = Math.floor(app.battle.hp.foe * 0.8)

    return app
  },
  'battle-ball': () => {
    const app = SCENES.battle()
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
  dex: () => {
    const app = makeApp(sampleSave())
    app.mode = 'dex'
    app.dexSelection = 24

    return app
  },
  team: () => {
    const app = makeApp(sampleSave())
    app.mode = 'team'
    app.teamSelection = 1

    return app
  },
  moves: () => {
    const app = makeApp(sampleSave())

    app.mode = 'moves'
    app.teamSelection = 0
    app.moveSelection = 2
    app.moveHeld = true

    return app
  },
  'daycare-raising': () => {
    const app = makeApp(sampleSave())

    app.mode = 'daycare'
    app.daycareSelection = 1
    app.save.daycare.slots = [
      createPokemon(19, 12, makeRng(5)),
      createPokemon(81, 14, makeRng(6)),
    ]

    for (let step = 0; step < PREVIEW_EGG_STEPS; step++) raiseDaycare(app.save)

    return app
  },
  'daycare-egg': () => {
    const app = makeApp(sampleSave())

    app.mode = 'daycare'
    app.save.daycare.slots = [
      createPokemon(132, 18, makeRng(5)),
      createPokemon(25, 21, makeRng(6)),
    ]
    app.save.daycare.egg = { species: 25, steps: 0, shiny: false }

    return app
  },
  daycare: () => {
    const app = SCENES['daycare-egg']()

    app.save.daycare.egg.steps = PREVIEW_EGG_STEPS

    for (let step = 0; step < PREVIEW_EGG_STEPS; step++) raiseDaycare(app.save)

    return app
  },
  'daycare-empty': () => {
    const app = makeApp(sampleSave())

    app.mode = 'daycare'

    return app
  },
  'daycare-pick': () => {
    const app = SCENES.daycare()

    app.daycareStep = 'pick'
    app.daycarePickSelection = 1

    return app
  },
  shop: () => {
    const app = makeApp(sampleSave())
    app.mode = 'shop'
    app.shopSelection = 2

    return app
  },
  options: () => {
    const app = makeApp(sampleSave())
    app.mode = 'options'

    return app
  },
  trainer: () => {
    const save = sampleSave()

    save.badges = ['pewter', 'cerulean']
    save.stats.battles = 148
    save.stats.wins = 131
    save.stats.losses = 12
    save.stats.runs = 5
    save.stats.streak = 9

    const app = makeApp(save)

    app.mode = 'trainer'
    app.worked = { totalMs: PREVIEW_WORKED_MS, updatedAt: null }
    recordAchievements(app.save, app.worked, Date.parse(PREVIEW_EARNED_AT))

    return app
  },
  trade: () => {
    const app = makeApp(sampleSave())

    app.mode = 'trade'
    app.tradeStep = 'confirm'
    app.tradeGiving = { mon: app.save.party[1], source: 'party', index: 1 }

    return app
  },
  'trade-code': () => {
    const app = SCENES.trade()

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
  'trade-receive': () => {
    const app = SCENES.trade()

    app.tradeStep = 'receive'
    app.tradeInput = encodeTrade(
      app.save.party[1],
      app.save.trainer,
      PREVIEW_TRADE_ID,
    )

    return app
  },
  'home-update': () => {
    const app = makeApp(sampleSave())
    app.mode = 'home'
    app.activity = {
      state: 'idle',
      tool: null,
      since: Date.now() - 40_000,
      sessions: 1,
    }
    app.updateNotice = { kind: 'available', version: '0.6.0' }

    return app
  },
  update: () => {
    const app = makeApp(sampleSave())
    app.mode = 'update'
    app.update = updateRun({
      at: Number(process.env.CLAUDEMON_UPDATE_STEP ?? 1),
    })
    app.updateFrame = Number(process.env.CLAUDEMON_SPIN_FRAME ?? 0)

    return app
  },
  'update-done': () => {
    const app = makeApp(sampleSave())
    app.mode = 'update'
    app.update = updateRun({ state: 'done', to: '0.6.0' })

    return app
  },
  'update-failed': () => {
    const app = makeApp(sampleSave())

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

const names = requested ? [requested] : Object.keys(SCENES)

for (const name of names) {
  const build = SCENES[name]

  if (!build) {
    process.stderr.write(
      `unknown screen "${name}". try: ${Object.keys(SCENES).join(', ')}\n`,
    )
    process.exit(1)
  }

  show(name, build())
}

process.stdout.write('\n')
