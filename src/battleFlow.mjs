import { isWorking } from './activity.mjs'
import {
  BATTLE_ITEM_KINDS,
  BATTLE_MESSAGES,
  GYM_MESSAGES,
  HIT_FRAME_COUNT,
  HP_DRAIN_STEPS,
  ITEMS,
} from './constants.mjs'
import { expFromDefeating } from './exp.mjs'
import { applyItem } from './itemUse.mjs'
import { displayName, isFainted, levelOf } from './pokemon.mjs'
import { applyVictory, describeStep, learnMove } from './progression.mjs'
import { ballsInBag, countOf, removeItem } from './shop.mjs'
import {
  activePokemon,
  addPokemon,
  healParty,
  markFaced,
  setLead,
} from './state.mjs'
import { ballSteps } from './ballThrow.mjs'
import { isMoveDisabled } from './volatile.mjs'

const liveHp = (state) => {
  return { player: state.player.mon.hp, foe: state.foe.mon.hp }
}

export const createBattleFlow = (session) => {
  const state = session.state

  return {
    session,
    state,
    foeMon: state.foe.mon,
    trainerIntro: state.trainer?.sprite != null,
    menu: 'main',
    selection: 0,
    message: null,
    events: [],
    hp: liveHp(state),
    hpTarget: liveHp(state),
    effect: null,
    ball: null,
    postSteps: null,
    learnStep: null,
    bagItems: [],
    bagItem: null,
  }
}

const syncBars = (battle) => {
  battle.foeMon = battle.state.foe.mon
  battle.hp = liveHp(battle.state)
  battle.hpTarget = { ...battle.hp }
}

const queueEvents = (ctx, events) => {
  const battle = ctx.battle

  battle.events.push(...events)

  if (!battle.message) playNextBeat(ctx)
}

export const queueMessages = (ctx, texts) => {
  queueEvents(
    ctx,
    texts.map((text) => ({ type: 'message', text })),
  )
}

const playNextBeat = (ctx) => {
  const battle = ctx.battle

  battle.hp = { ...battle.hpTarget }

  applyPendingEvents(ctx)

  const next = battle.events.shift()

  battle.message = next ? next.text : null

  applyPendingEvents(ctx)

  return battle.message != null
}

const applyPendingEvents = (ctx) => {
  const battle = ctx.battle

  while (battle.events.length > 0 && battle.events[0].type !== 'message') {
    applyBattleEvent(ctx, battle.events.shift())
  }
}

const applyBattleEvent = (ctx, event) => {
  const battle = ctx.battle

  switch (event.type) {
    case 'damage':
    case 'heal':
      battle.hpTarget[event.side] = event.hpAfter

      if (event.type === 'damage' && event.amount > 0) {
        battle.effect = { side: event.side, frame: 0 }
      }
      break
    case 'foe-out':
      battle.foeMon = event.mon
      battle.hp.foe = event.hpAfter
      battle.hpTarget.foe = event.hpAfter

      markFaced(ctx.save, event.mon.species)
      break
    case 'catch':
      battle.ball = {
        shakes: event.shakes,
        caught: event.caught,
        frame: 0,
        done: false,
      }
      break
    case 'end':
      if (event.outcome === 'win' || event.outcome === 'caught')
        ctx.playMusic('victory')
      break
    default:
      break
  }
}

const settleBall = (battle) => {
  battle.ball = battle.ball.caught
    ? { ...battle.ball, frame: ballSteps(battle.ball).length - 1, done: true }
    : null
}

const openMenu = (battle, name) => {
  battle.menu = name
  battle.selection = 0
  syncBars(battle)
}

export const advanceMessage = (ctx) => {
  const battle = ctx.battle

  if (!battle) return

  battle.trainerIntro = false

  if (battle.ball && !battle.ball.done) {
    settleBall(battle)
    return
  }

  if (playNextBeat(ctx)) return

  if (battle.postSteps) {
    processNextStep(ctx)
    return
  }

  if (battle.state.over) {
    finishBattle(ctx)
    return
  }

  openMenu(battle, 'main')
}

export const tickBattle = (ctx) => {
  const battle = ctx.battle

  if (!battle) return false

  let moved = false

  if (battle.ball && !battle.ball.done) {
    const next = battle.ball.frame + 1

    if (next < ballSteps(battle.ball).length) {
      battle.ball = { ...battle.ball, frame: next }
    } else {
      settleBall(battle)
      advanceMessage(ctx)

      if (!ctx.battle) return true
    }

    moved = true
  }

  if (battle.effect) {
    const next = battle.effect.frame + 1

    battle.effect =
      next < HIT_FRAME_COUNT ? { ...battle.effect, frame: next } : null

    moved = true
  }

  for (const side of ['player', 'foe']) {
    const shown = battle.hp[side]
    const target = battle.hpTarget[side]

    if (shown === target) continue

    const step = Math.max(
      1,
      Math.ceil(battle.state[side].mon.stats.hp / HP_DRAIN_STEPS),
    )

    battle.hp[side] =
      target > shown
        ? Math.min(target, shown + step)
        : Math.max(target, shown - step)

    moved = true
  }

  return moved
}

export const backOutOfBattleMenu = (ctx) => {
  const battle = ctx.battle

  if (!battle || battle.menu === 'learn') return

  if (battle.menu === 'target') {
    const index = battle.bagItems.indexOf(battle.bagItem)

    battle.bagItem = null
    openMenu(battle, 'bag')

    if (index >= 0) battle.selection = index

    return
  }

  openMenu(battle, 'main')
}

export const chooseBattleOption = (ctx) => {
  const battle = ctx.battle

  if (!battle) return

  switch (battle.menu) {
    case 'main':
      return chooseMainOption(ctx)
    case 'fight':
      return chooseMove(ctx)
    case 'bag':
      return chooseItem(ctx)
    case 'target':
      return chooseItemTarget(ctx)
    case 'party':
      return choosePartyMember(ctx)
    case 'learn':
      return resolveLearnChoice(ctx)
    default:
      return undefined
  }
}

const chooseMainOption = (ctx) => {
  const battle = ctx.battle

  switch (battle.selection) {
    case 0:
      openMenu(battle, 'fight')
      break
    case 1:
      battle.bagItems = usableBattleItems(ctx.save, battle.state.trainer)
      openMenu(battle, 'bag')
      break
    case 2:
      openMenu(battle, 'party')
      break
    case 3:
      takeAction(ctx, { type: 'run' })
      break
    default:
      break
  }
}

const usableBattleItems = (save, trainer) => {
  const others = Object.keys(ITEMS).filter(
    (key) => BATTLE_ITEM_KINDS.has(ITEMS[key].kind) && countOf(save, key) > 0,
  )

  if (trainer) return others

  return [...ballsInBag(save), ...others]
}

export const moveIsBlocked = (actor, index) => {
  return actor.mon.moves[index].pp <= 0 || isMoveDisabled(actor, index)
}

const chooseMove = (ctx) => {
  const battle = ctx.battle
  const slot = battle.state.player.mon.moves[battle.selection]

  if (slot.pp <= 0) {
    queueMessages(ctx, [BATTLE_MESSAGES.noPp])
    return
  }

  if (isMoveDisabled(battle.state.player, battle.selection)) {
    queueMessages(ctx, [BATTLE_MESSAGES.disabled])
    return
  }

  takeAction(ctx, { type: 'move', index: battle.selection })
}

const chooseItem = (ctx) => {
  const battle = ctx.battle

  if (battle.bagItems.length === 0) return

  const key = battle.bagItems[battle.selection]

  if (ITEMS[key].kind === 'ball') {
    removeItem(ctx.save, key)
    takeAction(ctx, { type: 'ball', key })
    return
  }

  battle.bagItem = key
  openMenu(battle, 'target')
}

const chooseItemTarget = (ctx) => {
  const battle = ctx.battle
  const key = battle.bagItem
  const mon = ctx.save.party[battle.selection]

  const before = mon.hp
  const result = applyItem(ctx.save, key, mon)

  battle.bagItem = null

  if (!result.ok) {
    queueMessages(ctx, [result.message])
    return
  }

  const onField = mon === battle.state.player.mon

  const events = [
    {
      type: 'message',
      text: `You used a ${ITEMS[key].name} on ${displayName(mon).toUpperCase()}.`,
    },
    { type: 'message', text: result.message },
  ]

  if (onField && mon.hp !== before) {
    events.push({
      type: 'heal',
      side: 'player',
      amount: mon.hp - before,
      hpAfter: mon.hp,
    })
  }

  queueEvents(ctx, events)

  takeAction(ctx, { type: 'item' }, true)
}

const choosePartyMember = (ctx) => {
  const battle = ctx.battle
  const index = battle.selection
  const chosen = ctx.save.party[index]

  if (isFainted(chosen)) {
    queueMessages(ctx, [
      `${displayName(chosen).toUpperCase()} is in no shape to fight!`,
    ])
    return
  }
  if (chosen === battle.state.player.mon) {
    queueMessages(ctx, [`${displayName(chosen).toUpperCase()} is already out!`])
    return
  }

  setLead(ctx.save, index)
  battle.session.switchIn(chosen)
  syncBars(battle)

  queueMessages(ctx, [`Go, ${displayName(chosen).toUpperCase()}!`])
  takeAction(ctx, { type: 'switch' }, true)
}

const takeAction = (ctx, action, silentFirst = false) => {
  const battle = ctx.battle

  battle.menu = null

  queueEvents(ctx, battle.session.submit(action))

  if (battle.state.over) beginPostBattle(ctx)
  else if (!battle.message && !silentFirst) openMenu(battle, 'main')
}

const beginPostBattle = (ctx) => {
  const battle = ctx.battle
  const state = battle.state
  const save = ctx.save

  if (state.outcome === 'win') {
    save.stats.wins++

    battle.postSteps = applyVictory(save, state.participants, state.rewards)
    return
  }

  if (state.outcome === 'caught') {
    const caught = state.foe.mon

    caught.hp = Math.max(1, caught.hp)

    const destination = addPokemon(save, caught)

    const rewards = {
      exp: expFromDefeating(caught.species, levelOf(caught)),
      money: 0,
    }

    battle.postSteps = [
      { kind: 'caught', name: displayName(caught), destination },
      ...applyVictory(save, state.participants, rewards),
    ]
    return
  }

  if (state.outcome === 'fled') {
    save.stats.runs++
    battle.postSteps = []
    return
  }

  const next = activePokemon(save)

  if (state.outcome === 'loss' && next) {
    battle.postSteps = [{ kind: 'send-out', mon: next }]
    return
  }

  save.stats.losses++
  battle.postSteps = [{ kind: 'blackout' }]
}

const blackoutOutcome = (ctx) => {
  if (ctx.gym) return { rest: false, note: GYM_MESSAGES.thrownOut }

  if (isWorking(ctx.activity))
    return { rest: false, note: BATTLE_MESSAGES.noRest }

  return { rest: true, note: null }
}

const processNextStep = (ctx) => {
  const battle = ctx.battle
  const steps = battle.postSteps

  if (steps.length === 0) {
    finishBattle(ctx)
    return
  }

  const step = steps.shift()

  if (step.kind === 'learn-choice') {
    battle.learnStep = step
    openMenu(battle, 'learn')
    battle.message = null

    return
  }

  if (step.kind === 'caught') {
    const where =
      step.destination === 'party'
        ? BATTLE_MESSAGES.joinedTeam
        : BATTLE_MESSAGES.wentToBox

    queueMessages(ctx, [
      `${step.name.toUpperCase()} was added to the Pokédex.`,
      where,
    ])
    return
  }

  if (step.kind === 'send-out') {
    battle.session.sendOut(step.mon)

    battle.postSteps = null
    syncBars(battle)

    queueMessages(ctx, [`Go, ${displayName(step.mon).toUpperCase()}!`])
    return
  }

  if (step.kind === 'blackout') {
    const { rest, note } = blackoutOutcome(ctx)

    if (rest) healParty(ctx.save)

    queueMessages(
      ctx,
      note ? [...BATTLE_MESSAGES.blackout, note] : BATTLE_MESSAGES.blackout,
    )
    syncBars(battle)
    return
  }

  queueMessages(ctx, describeStep(step))
}

const resolveLearnChoice = (ctx) => {
  const battle = ctx.battle
  const step = battle.learnStep
  const mon = step.mon
  const declineIndex = mon.moves.length

  if (battle.selection === declineIndex) {
    queueMessages(ctx, [
      `${displayName(mon).toUpperCase()} did not learn the move.`,
    ])
  } else {
    const result = learnMove(mon, step.move, battle.selection)

    queueMessages(ctx, [
      BATTLE_MESSAGES.forgetting,
      `${displayName(mon).toUpperCase()} forgot ${result.forgot} and learned a new move!`,
    ])
  }

  battle.learnStep = null
  battle.menu = null
}

const finishBattle = (ctx) => {
  const outcome = ctx.battle.state.outcome

  ctx.stopMusic()
  ctx.battle = null

  if (ctx.gym) {
    ctx.finishGymBattle(outcome)
    return
  }

  ctx.persist()

  ctx.goHome()
}
