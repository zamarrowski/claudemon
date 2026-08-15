import { recordAchievements } from '../../src/achievements.mjs'
import { isWorking } from '../../src/activity.mjs'
import { createBattle } from '../../src/battle.mjs'
import {
  advanceMessage,
  backOutOfBattleMenu,
  chooseBattleOption,
  createBattleFlow,
  queueMessages,
  tickBattle,
} from '../../src/battleFlow.mjs'
import { createLocalSession } from '../../src/battleSession.mjs'
import {
  BAG_MESSAGES,
  BATTLE_MESSAGES,
  BOX_MESSAGES,
  DAYCARE_MESSAGES,
  DAYCARE_STEPS_PER_SAVE,
  FRAMES_PER_DAYCARE_STEP,
  FRAMES_PER_STEP,
  GYM_MESSAGES,
  HOME_NOTICES,
  ITEMS,
  TRADE_MESSAGES,
  TRAINER_MESSAGES,
} from '../../src/constants.mjs'
import { species } from '../../src/data.mjs'
import {
  eggFromPair,
  eggIsReady,
  hatchEgg,
  leaveAtDaycare,
  raiseDaycare,
  takeBackFromDaycare,
  walkEgg,
} from '../../src/daycare.mjs'
import { encounterSpecies } from '../../src/encounter.mjs'
import {
  advanceGymRun,
  createGymRun,
  currentOpponent,
  gymBattleSeed,
  gymById,
  gymIndex,
  gymOf,
  isGymCleared,
  rollbackGymRun,
} from '../../src/gym.mjs'
import { canSpare } from '../../src/helpers.mjs'
import { applyItem } from '../../src/itemUse.mjs'
import { createPokemon, displayName } from '../../src/pokemon.mjs'
import { describeStep } from '../../src/progression.mjs'
import { makeRng, randomSeed } from '../../src/rng.mjs'
import { buy, itemsInBag, usableOnParty } from '../../src/shop.mjs'
import {
  activePokemon,
  addPokemon,
  awardBadge,
  createSave,
  depositPokemon,
  hasBadge,
  healParty,
  markFaced,
  markSeen,
  setLead,
  withdrawPokemon,
} from '../../src/state.mjs'
import { giveAway, takeIn } from '../../src/trade.mjs'
import { sentOutLine, trainerClass, trainerLabel } from '../../src/trainer.mjs'
import { updateNotice } from '../../src/version.mjs'
import { sortedPartyEntries } from './views/helpers.mjs'

const clampToList = (selection, list) => {
  return Math.min(selection, Math.max(0, list.length - 1))
}

const arrivalWording = (where) => {
  if (where === 'box') return BATTLE_MESSAGES.wentToBox

  return BATTLE_MESSAGES.joinedTeam
}

const arrivalMessage = (taken, trade) => {
  const name = displayName(taken.mon).toUpperCase()
  const from = trade.from.name.toUpperCase()

  return `${name} ${TRADE_MESSAGES.arrivedFrom} ${from}. ${arrivalWording(taken.where)}`
}

const hatchLines = (mon, where) => {
  const opening = `${displayName(mon).toUpperCase()} ${DAYCARE_MESSAGES.hatched}`

  if (!mon.shiny) return [opening, arrivalWording(where)]

  return [`${opening} ${BATTLE_MESSAGES.shiny}`, arrivalWording(where)]
}

const wildIntro = (wild) => {
  const appeared = `A wild ${displayName(wild).toUpperCase()} appeared!`

  if (!wild.shiny) return [appeared]

  return [appeared, BATTLE_MESSAGES.shiny]
}

const wildBattle = (save, encounter, lead) => {
  const wild = createPokemon(
    encounter.species,
    encounter.level,
    makeRng(encounter.seed),
    encounter.shiny,
  )

  markFaced(save, encounter.species)

  return {
    state: createBattle({
      playerMon: lead,
      wildMon: wild,
      seed: encounter.seed,
    }),
    intro: wildIntro(wild),
  }
}

const encounterTrainer = (trainer) => {
  return {
    class: trainer.class,
    name: trainer.name,
    sprite: trainer.sprite,
    prize: trainerClass(trainer.class).prize,
    team: trainer.team,
  }
}

const trainerBattle = (save, opponent, seed, lead) => {
  const team = opponent.team.map((entry, index) => {
    return createPokemon(
      entry.species,
      entry.level,
      makeRng((seed + index) >>> 0),
    )
  })

  markFaced(save, team[0].species)

  const trainer = {
    class: opponent.class,
    name: opponent.name,
    sprite: opponent.sprite,
    prize: opponent.prize,
    team,
  }

  return {
    state: createBattle({
      playerMon: lead,
      wildMon: team[0],
      seed,
      trainer,
    }),
    intro: [
      `${trainerLabel(trainer)} ${TRAINER_MESSAGES.wantsToBattle}`,
      sentOutLine(trainer, team[0]),
    ],
  }
}

const layNextEgg = (ctx) => {
  if (!eggFromPair(ctx.save, ctx.rng)) return false

  ctx.persist()

  return true
}

const hatchIntoParty = (ctx, egg) => {
  const hatched = hatchEgg(egg, ctx.rng)

  ctx.save.daycare.egg = null

  const where = addPokemon(ctx.save, hatched)
  const [headline, arrival] = hatchLines(hatched, where)

  ctx.persist()

  ctx.notice = headline
  ctx.daycareMessage = [headline, arrival]

  ctx.playSound(hatched.shiny ? 'shiny' : 'hatch')
}

const advanceEgg = (ctx, egg) => {
  walkEgg(egg)

  if (!eggIsReady(egg)) return false

  hatchIntoParty(ctx, egg)

  return true
}

const leaveForGymList = (ctx, gymId, message) => {
  ctx.gym = null
  ctx.gymLeaving = false
  ctx.gymMessage = message
  ctx.gymSelection = gymIndex(gymId)

  ctx.closeBag()
  ctx.persist()
  ctx.setMode('gyms')
}

export const createStore = ({
  bootstrap,
  api,
  sound,
  onChange,
  closeWindow = () => window.close(),
}) => {
  let daycareFrames = 0
  let daycareSteps = 0

  const ctx = {
    version: bootstrap.version,
    save: bootstrap.save,
    config: bootstrap.config,
    worked: bootstrap.worked,
    activity: bootstrap.activity,
    encounter: bootstrap.encounter,
    updateNotice: bootstrap.notice,

    rng: makeRng(randomSeed()),

    mode: bootstrap.save ? 'home' : 'starter',

    scene: { step: 0, frames: 0 },

    homeSelection: 0,
    dexSelection: 0,
    dexSort: 'number',
    teamSelection: 0,
    teamSort: 'order',
    boxSelection: 0,
    boxSort: 'order',

    boxMessage: null,

    daycareFrom: 'home',
    daycareStep: 'slots',
    daycareSelection: 0,
    daycarePickSelection: 0,
    daycareMessage: null,

    bagSelection: null,
    bagMessage: null,

    shopSelection: 0,
    shopMessage: null,

    tradeFrom: 'team',
    tradeStep: 'confirm',
    tradeGiving: null,
    tradeInput: '',
    tradeMessage: null,
    tradeCode: null,
    tradeGone: null,
    tradeCopied: false,
    tradePath: null,

    gym: null,
    gymSelection: 0,
    gymMessage: null,
    gymLeaving: false,

    optionsSelection: 0,
    optionsMessage: null,
    notice: null,

    trainerSelection: 0,

    update: null,

    setup: { step: 'name', name: '', selection: 1 },
    battle: null,
  }

  ctx.paint = () => onChange(ctx)

  ctx.setMode = (mode) => {
    ctx.mode = mode
    ctx.paint()
  }

  ctx.persist = () => {
    if (ctx.gym) return
    if (!ctx.save) return

    recordAchievements(ctx.save, ctx.worked)
    api.putSave(ctx.save)
  }

  ctx.playSound = (name) => {
    if (ctx.config.sound === false) return

    sound.play(name)
  }

  ctx.playMusic = (name) => {
    if (ctx.config.sound === false) return

    sound.startMusic(name)
  }

  ctx.stopMusic = () => sound.stopMusic()

  ctx.quit = () => {
    ctx.persist()
    ctx.stopMusic()
    api.quitGame()

    closeWindow()
  }

  ctx.applyConfig = async (patch) => {
    try {
      ctx.config = await api.putConfig(patch)
      ctx.optionsMessage = null
    } catch (error) {
      ctx.optionsMessage = `Could not save: ${error.message}`
    }

    if (ctx.config.sound === false) ctx.stopMusic()

    ctx.paint()
  }

  ctx.receiveEncounter = (encounter) => {
    if (ctx.gym) return

    ctx.encounter = encounter

    if (!encounter) {
      ctx.homeSelection = Math.max(0, ctx.homeSelection - 1)
      ctx.paint()

      return
    }

    ctx.homeSelection = 0

    if (encounter.shiny) ctx.playSound('shiny')

    if (ctx.save) {
      markSeen(ctx.save, encounterSpecies(encounter))
      ctx.persist()
    }

    ctx.paint()
  }

  ctx.receiveActivity = (activity) => {
    const previous = ctx.activity

    ctx.activity = activity

    if (
      previous.state === 'working' &&
      (activity.state === 'idle' || activity.state === 'waiting') &&
      ctx.config.bell !== false
    ) {
      ctx.playSound('select')
    }

    ctx.paint()
  }

  ctx.receiveSave = (save) => {
    ctx.save = save
    ctx.paint()
  }

  ctx.receiveConfig = (config) => {
    ctx.config = config
    ctx.paint()
  }

  ctx.receiveNotice = (notice) => {
    ctx.updateNotice = notice
    ctx.paint()
  }

  ctx.receiveUpdateRun = (run) => {
    ctx.update = run

    if (run?.state === 'done') {
      ctx.updateNotice = updateNotice({
        current: ctx.version,
        installed: run.to,
      })
    }

    ctx.paint()
  }

  ctx.startUpdate = async () => {
    if (ctx.update?.state === 'running') return

    ctx.setMode('update')
    ctx.update = await api.startUpdate()
    ctx.paint()
  }

  ctx.finishUpdate = () => {
    ctx.update = null
    ctx.homeSelection = 0
    ctx.setMode('home')
  }

  ctx.finishSetup = (starterId) => {
    ctx.save = createSave({
      trainer: ctx.setup.name.trim() || 'Trainer',
      starterId,
      rng: ctx.rng,
    })

    ctx.persist()
    ctx.notice = `${species(starterId).name} is yours. Good luck!`
    ctx.setMode('home')
  }

  ctx.openHomeSelection = (id) => {
    switch (id) {
      case 'fight':
        ctx.startNextBattle()
        break
      case 'dex':
        ctx.setMode('dex')
        break
      case 'team':
        ctx.teamSelection = 0
        ctx.clearTeamMessages()
        ctx.closeBag()
        ctx.setMode('team')
        break
      case 'daycare':
        ctx.openDaycare('home')
        break
      case 'gyms':
        ctx.gymSelection = 0
        ctx.gymMessage = null
        ctx.setMode('gyms')
        break
      case 'shop':
        ctx.shopSelection = 0
        ctx.shopMessage = null
        ctx.setMode('shop')
        break
      case 'options':
        ctx.optionsSelection = 0
        ctx.optionsMessage = null
        ctx.setMode('options')
        break
      case 'heal':
        if (isWorking(ctx.activity)) {
          ctx.notice = HOME_NOTICES.working
          break
        }
        healParty(ctx.save)
        ctx.persist()
        ctx.notice = HOME_NOTICES.healed
        break
      case 'trainer':
        ctx.trainerSelection = 0
        ctx.setMode('trainer')
        break
      case 'quit':
        ctx.quit()
        break
      default:
        break
    }
  }

  ctx.exportCard = async () => {
    try {
      const { path } = await api.askForCard()

      ctx.notice = `Trainer card written to ${path}`
    } catch {
      ctx.notice = HOME_NOTICES.cardFailed
    }

    ctx.paint()
  }

  ctx.makeLead = (index) => {
    setLead(ctx.save, index)

    ctx.teamSelection = sortedPartyEntries(
      ctx.save.party,
      ctx.teamSort,
    ).findIndex((entry) => entry.index === 0)
    ctx.persist()
  }

  ctx.openBox = () => {
    ctx.boxSelection = 0
    ctx.boxMessage = null
    ctx.setMode('box')
  }

  ctx.depositToBox = (index) => {
    const mon = ctx.save.party[index]

    if (!mon) return

    if (!depositPokemon(ctx.save, index)) {
      ctx.boxMessage = BOX_MESSAGES.lastOne
      return
    }

    ctx.teamSelection = clampToList(ctx.teamSelection, ctx.save.party)
    ctx.boxMessage = `${displayName(mon).toUpperCase()} went to the box.`
    ctx.persist()
  }

  ctx.withdrawFromBox = (index) => {
    const mon = ctx.save.box[index]

    if (!mon) return

    if (!withdrawPokemon(ctx.save, index)) {
      ctx.boxMessage = BOX_MESSAGES.teamFull
      return
    }

    ctx.boxSelection = clampToList(ctx.boxSelection, ctx.save.box)
    ctx.boxMessage = `${displayName(mon).toUpperCase()} joined your team.`
    ctx.persist()
  }

  ctx.openDaycare = (from = 'home') => {
    ctx.daycareFrom = from
    ctx.daycareStep = 'slots'
    ctx.daycareSelection = 0
    ctx.daycarePickSelection = 0
    ctx.setMode('daycare')
  }

  ctx.closeDaycare = () => {
    ctx.daycareMessage = null
    ctx.setMode(ctx.daycareFrom)
  }

  ctx.openDaycarePick = () => {
    ctx.daycareStep = 'pick'
    ctx.daycarePickSelection = 0
    ctx.daycareMessage = null
  }

  ctx.closeDaycarePick = () => {
    ctx.daycareStep = 'slots'
    ctx.daycareMessage = null
  }

  ctx.leaveAtDaycare = (source, index) => {
    const result = leaveAtDaycare(ctx.save, source, index)

    if (!result.ok) {
      ctx.daycareMessage = result.reason
      return
    }

    const laid = eggFromPair(ctx.save, ctx.rng)
    const left = `${displayName(result.mon).toUpperCase()} ${DAYCARE_MESSAGES.leftHere}`

    ctx.teamSelection = clampToList(ctx.teamSelection, ctx.save.party)
    ctx.boxSelection = clampToList(ctx.boxSelection, ctx.save.box)
    ctx.daycareStep = 'slots'
    ctx.daycareSelection = ctx.save.daycare.slots.length - 1
    ctx.daycarePickSelection = 0
    ctx.daycareMessage = laid ? [left, DAYCARE_MESSAGES.foundAnEgg] : left

    ctx.persist()
  }

  ctx.takeBackFromDaycare = (slot) => {
    const { mon, where } = takeBackFromDaycare(ctx.save, slot)
    const name = displayName(mon).toUpperCase()

    ctx.daycareSelection = slot
    ctx.daycareMessage = [
      `${name} ${DAYCARE_MESSAGES.cameBack}`,
      arrivalWording(where),
    ]

    ctx.persist()
  }

  ctx.tickDaycare = () => {
    if (ctx.gym) return false
    if (!ctx.save) return false

    const { slots, egg } = ctx.save.daycare

    if (slots.length === 0 && !egg) return false
    if (!isWorking(ctx.activity)) return false

    daycareFrames++

    if (daycareFrames % FRAMES_PER_DAYCARE_STEP !== 0) return false

    daycareSteps++

    raiseDaycare(ctx.save)

    if (!egg && layNextEgg(ctx)) return true
    if (egg && advanceEgg(ctx, egg)) return true

    if (daycareSteps % DAYCARE_STEPS_PER_SAVE === 0) ctx.persist()

    return ctx.mode === 'daycare'
  }

  ctx.clearTeamMessages = () => {
    ctx.boxMessage = null
    ctx.bagMessage = null
  }

  ctx.openBag = () => {
    if (itemsInBag(ctx.save).length === 0) {
      ctx.bagMessage = BAG_MESSAGES.empty
      return
    }

    ctx.bagSelection = 0
    ctx.bagMessage = null
  }

  ctx.closeBag = () => {
    ctx.bagSelection = null
    ctx.bagMessage = null
  }

  ctx.useFromBag = (key, index) => {
    const mon = ctx.save.party[index]

    if (!mon) return

    if (!usableOnParty(key)) {
      ctx.bagMessage = `Save the ${ITEMS[key].name} for something in the grass.`
      return
    }

    const result = applyItem(ctx.save, key, mon)
    const taught = result.steps.flatMap(describeStep)

    if (result.steps.some((step) => step.kind === 'learn-choice')) {
      taught.push(BAG_MESSAGES.noRoomForMove)
    }

    ctx.bagMessage =
      taught.length > 0 ? [result.message, ...taught] : result.message

    if (!result.ok) return

    ctx.persist()
    ctx.bagSelection = null
  }

  ctx.askToGiveAway = ({ from, source, index, mon }) => {
    if (!canSpare(ctx.save, source)) {
      ctx.boxMessage = TRADE_MESSAGES.lastOne
      return
    }

    ctx.tradeFrom = from
    ctx.tradeGiving = { mon, source, index }
    ctx.tradeStep = 'confirm'
    ctx.setMode('trade')
  }

  ctx.closeTrade = () => {
    ctx.tradeMessage = null
    ctx.setMode(ctx.tradeFrom)
  }

  ctx.giveSelectedAway = async () => {
    const { source, index } = ctx.tradeGiving
    const given = giveAway(ctx.save, source, index)

    if (!given.ok) {
      ctx.tradeMessage = given.reason
      ctx.paint()

      return
    }

    ctx.persist()

    ctx.teamSelection = clampToList(ctx.teamSelection, ctx.save.party)
    ctx.boxSelection = clampToList(ctx.boxSelection, ctx.save.box)

    ctx.tradeGone = given.mon
    ctx.tradeMessage = null
    ctx.tradeStep = 'code'

    ctx.playSound('trade')
    ctx.setMode('trade')

    const { code, path } = await api.askForTradeCode(
      given.mon,
      ctx.save.trainer,
    )

    ctx.tradeCode = code
    ctx.tradePath = path
    ctx.tradeCopied = await ctx.copyCode(code)

    ctx.paint()
  }

  ctx.copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)

      return true
    } catch {
      return false
    }
  }

  ctx.openTradeReceive = (from) => {
    ctx.tradeFrom = from
    ctx.tradeStep = 'receive'
    ctx.tradeInput = ''
    ctx.tradeMessage = null
    ctx.setMode('trade')
  }

  ctx.takeInCode = async () => {
    const read = await api.readTradeCode(ctx.tradeInput)

    if (!read.ok) {
      ctx.tradeMessage = read.reason
      ctx.paint()

      return
    }

    const taken = takeIn(ctx.save, read.trade)

    if (!taken.ok) {
      ctx.tradeMessage = taken.reason
      ctx.paint()

      return
    }

    ctx.persist()

    ctx.tradeInput = ''
    ctx.boxMessage = arrivalMessage(taken, read.trade)

    ctx.playSound('trade')
    ctx.closeTrade()
  }

  ctx.buyItem = (key, quantity) => {
    const result = buy(ctx.save, key, quantity)

    ctx.shopMessage = result.ok
      ? `Bought ${quantity} ${ITEMS[key].name}. Thank you!`
      : result.reason

    if (result.ok) ctx.persist()
  }

  ctx.startNextBattle = () => {
    const encounter = ctx.encounter

    if (!encounter) return

    const lead = activePokemon(ctx.save)

    if (!lead) {
      ctx.notice = HOME_NOTICES.wipedOut
      return
    }

    ctx.encounter = null
    api.dropEncounter()

    const { state, intro } =
      encounter.kind === 'trainer'
        ? trainerBattle(
            ctx.save,
            encounterTrainer(encounter.trainer),
            encounter.seed,
            lead,
          )
        : wildBattle(ctx.save, encounter, lead)

    ctx.battle = createBattleFlow(createLocalSession(state))

    ctx.save.stats.battles++
    queueMessages(ctx, intro)
    ctx.playMusic('battle')
    ctx.setMode('battle')
  }

  ctx.startGymRun = (id) => {
    if (!activePokemon(ctx.save)) {
      ctx.gymMessage = GYM_MESSAGES.wipedOut
      return
    }

    ctx.gym = createGymRun({
      gym: gymById(id),
      seed: randomSeed(),
      save: ctx.save,
    })

    ctx.gymMessage = null
    ctx.gymLeaving = false
    ctx.teamSelection = 0
    ctx.closeBag()
    ctx.setMode('gym')
  }

  ctx.startGymBattle = () => {
    const lead = activePokemon(ctx.save)

    if (!lead) {
      ctx.gymMessage = GYM_MESSAGES.downInside
      return
    }

    const { state, intro } = trainerBattle(
      ctx.save,
      currentOpponent(ctx.gym),
      gymBattleSeed(ctx.gym),
      lead,
    )

    ctx.battle = createBattleFlow(createLocalSession(state))
    ctx.gymMessage = null
    ctx.gymLeaving = false

    ctx.save.stats.battles++
    queueMessages(ctx, intro)
    ctx.playMusic('battle')
    ctx.setMode('battle')
  }

  ctx.finishGymBattle = (outcome) => {
    if (outcome !== 'win') {
      ctx.leaveGym(GYM_MESSAGES.defeated)
      return
    }

    advanceGymRun(ctx.gym)

    if (!isGymCleared(ctx.gym)) {
      ctx.setMode('gym')
      return
    }

    const gym = gymOf(ctx.gym)
    const wording = hasBadge(ctx.save, gym.id)
      ? GYM_MESSAGES.stillYours
      : GYM_MESSAGES.earned

    awardBadge(ctx.save, gym.id)
    leaveForGymList(ctx, gym.id, `${gym.badge} ${wording}`)
  }

  ctx.leaveGym = (message) => {
    const gym = gymOf(ctx.gym)

    ctx.save = rollbackGymRun(ctx.gym)
    leaveForGymList(ctx, gym.id, message)
  }

  ctx.confirmLeaveGym = () => {
    if (ctx.gymLeaving) {
      ctx.leaveGym(GYM_MESSAGES.forfeited)
      return
    }

    ctx.gymLeaving = true
  }

  ctx.cancelLeaveGym = () => {
    ctx.gymLeaving = false
  }

  ctx.advanceMessage = () => advanceMessage(ctx)

  ctx.tickBattle = () => tickBattle(ctx)

  ctx.backOutOfBattleMenu = () => backOutOfBattleMenu(ctx)

  ctx.chooseBattleOption = () => chooseBattleOption(ctx)

  ctx.tickScene = () => {
    if (ctx.mode !== 'home' || ctx.activity.state !== 'working') return false

    ctx.scene.frames++

    if (ctx.scene.frames % FRAMES_PER_STEP !== 0) return false

    ctx.scene.step++

    return true
  }

  ctx.tickFrame = () => {
    const ticks = [ctx.tickBattle, ctx.tickScene, ctx.tickDaycare]

    return ticks.map((tick) => tick()).some(Boolean)
  }

  return ctx
}
