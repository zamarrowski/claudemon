import { ITEMS } from '../../constants.mjs'
import { move as moveData } from '../../data.mjs'
import { expProgress } from '../../exp.mjs'
import { monSpriteFile, trainerSpriteFile } from '../../paths.mjs'
import { displayName, genderOf, levelOf } from '../../pokemon.mjs'
import { monsLeft, trainerLabel } from '../../trainer.mjs'
import { isMoveDisabled } from '../../volatile.mjs'
import { bold, brightGreen, dim, gray } from '../ansi.mjs'
import { ballOverlays, ballScale, ballSteps } from '../ball.mjs'
import {
  fieldWidth,
  fitBattleSprites,
  placeField,
  usableRows,
} from '../battleField.mjs'
import { FOE_INFO_ROWS, PLAYER_INFO_ROWS } from '../constants.mjs'
import { hitOverlays } from '../hit.mjs'
import {
  expBar,
  genderTag,
  hintLine,
  hpBar,
  menuGrid,
  menuList,
  padLeft,
  padRight,
  panel,
  shinyTag,
  statusTag,
  trainerTray,
  typeBadge,
  wrap,
} from '../widgets.mjs'
import {
  BATTLE_MAIN_MENU,
  BATTLE_PROMPTS,
  CAUGHT_GLYPH,
  DEFAULT_MENU_STRIDE,
  EMPTY_BAG_MESSAGE,
  FAINTED_TAG,
  MENU_STRIDES,
} from './constants.mjs'
import { clampSelection } from './helpers.mjs'

const CAUGHT_MARK = brightGreen(CAUGHT_GLYPH)

const foeTray = (trainer) => {
  if (!trainer) return ''

  return `  ${trainerTray(monsLeft(trainer), trainer.team.length)}`
}

const foeInfo = (mon, hp, width, caught, trainer) => {
  const name = `${bold(displayName(mon).toUpperCase())}${genderTag(genderOf(mon))}${shinyTag(mon.shiny)} ${dim(`Lv${levelOf(mon)}`)}`
  const tag = statusTag(mon.status)
  const mark = caught ? ` ${CAUGHT_MARK}` : ''

  return [
    padRight(`${name}${mark}${tag ? ` ${tag}` : ''}`, width),
    padRight(`${hpBar(hp, mon.stats.hp, 20)}${foeTray(trainer)}`, width),
  ]
}

const trainerInfo = (trainer, width) => {
  return [
    padRight(bold(trainerLabel(trainer)), width),
    padRight(trainerTray(monsLeft(trainer), trainer.team.length), width),
  ]
}

const foeHeader = (battle, width, caught) => {
  if (battle.trainerIntro) return trainerInfo(battle.state.trainer, width)

  return foeInfo(
    battle.foeMon,
    battle.hp.foe,
    width,
    caught,
    battle.state.trainer,
  )
}

const foeSpriteFile = (battle) => {
  if (battle.trainerIntro) return trainerSpriteFile(battle.state.trainer.sprite)

  return monSpriteFile('front', battle.foeMon.species, battle.foeMon.shiny)
}

const playerInfo = (mon, hp, width) => {
  const name = `${bold(displayName(mon).toUpperCase())}${genderTag(genderOf(mon))}${shinyTag(mon.shiny)} ${dim(`Lv${levelOf(mon)}`)}`
  const tag = statusTag(mon.status)
  const progress = expProgress(mon.species, mon.exp)

  return [
    padLeft(`${name}${tag ? ` ${tag}` : ''}`, width),
    padLeft(
      `${hpBar(hp, mon.stats.hp, 20)} ${dim(`${hp}/${mon.stats.hp}`)}`,
      width,
    ),
    padLeft(`${dim('EXP')} ${expBar(progress.fraction, 16)}`, width),
  ]
}

const identity = (text) => text

const accuracyLabel = (accuracy) => accuracy ?? BATTLE_PROMPTS.unknownAccuracy

const moveMenu = (actor, rawSelection, width) => {
  const mon = actor.mon
  const selected = clampSelection(rawSelection, mon.moves.length)

  const labels = mon.moves.map((slot, index) => {
    const data = moveData(slot.move)
    const blocked = slot.pp === 0 || isMoveDisabled(actor, index)
    const low = blocked ? gray : identity

    return low(`${padRight(data.name, 15)} ${dim(`${slot.pp}/${slot.maxPp}`)}`)
  })

  const rows = menuGrid(labels, selected, { columns: 2, width })

  const data = moveData(mon.moves[selected].move)
  const power = data.power ? `Power ${data.power}` : BATTLE_PROMPTS.statusMove

  rows.push('')
  rows.push(
    `${typeBadge(data.type)}  ${dim(`${power} · Acc ${accuracyLabel(data.accuracy)}`)}`,
  )

  return rows
}

const partyLabels = (save) => {
  return save.party.map((mon) => {
    const fainted = mon.hp <= 0 ? gray(FAINTED_TAG) : ''
    const name = `${displayName(mon).toUpperCase()}${genderTag(genderOf(mon))}${shinyTag(mon.shiny)}`

    return `${padRight(name, 14)} ${dim(`Lv${levelOf(mon)}`)} ${hpBar(
      mon.hp,
      mon.stats.hp,
      10,
    )}${fainted}`
  })
}

export const draw = (ctx, size) => {
  const { cols, rows: totalRows } = size
  const battle = ctx.battle
  const lines = []
  const overlays = []

  const width = fieldWidth(size)

  const foe = battle.foeMon
  const player = battle.state.player.mon
  const fitted = fitBattleSprites(
    size,
    foeSpriteFile(battle),
    monSpriteFile('back', player.species, player.shiny),
    ctx.spriteScale,
  )

  const ballStep = battle.ball
    ? ballSteps(battle.ball)[battle.ball.frame]
    : null

  const caught = ctx.save.dex.caught.includes(foe.species)

  for (const line of foeHeader(battle, width, caught)) lines.push(` ${line}`)

  const body = messageBody(ctx, width)
  const maxFieldRows = Math.max(
    1,
    usableRows(size) - FOE_INFO_ROWS - PLAYER_INFO_ROWS - body.length - 2,
  )
  const { foeTop, foeRows, playerTop, playerRows, foeIndent, playerIndent } =
    placeField(lines, fitted, width, ballStep?.hideFoe === true, maxFieldRows)

  for (const line of playerInfo(player, battle.hp.player, width))
    lines.push(` ${line}`)

  if (battle.effect) {
    const hit =
      battle.effect.side === 'foe'
        ? {
            top: foeTop,
            rows: foeRows,
            indent: foeIndent,
            cols: fitted.foe.cols,
          }
        : {
            top: playerTop,
            rows: playerRows,
            indent: playerIndent,
            cols: fitted.player.cols,
          }

    overlays.push(
      ...hitOverlays(
        hit.top,
        hit.rows,
        hit.indent + Math.floor(hit.cols / 2),
        battle.effect.frame,
      ),
    )
  }

  if (ballStep) {
    overlays.push(
      ...ballOverlays(
        ballStep,
        {
          foe: {
            top: foeTop,
            rows: foeRows,
            indent: foeIndent,
            cols: fitted.foe.cols,
          },
          player: {
            top: playerTop,
            rows: playerRows,
            indent: playerIndent,
            cols: fitted.player.cols,
          },
          scale: ballScale(fitted.canvas),
          cols,
          maxRow: lines.length - 1,
        },
        battle.ball.frame,
      ),
    )
  }

  while (lines.length < usableRows({ rows: totalRows }) - body.length - 2)
    lines.push('')

  for (const line of panel(body, width)) lines.push(` ${line}`)

  return { lines, overlays }
}

const messageBody = (ctx, width) => {
  const battle = ctx.battle
  const inner = width - 2

  if (battle.message) {
    const lines = [battle.message]

    if (battle.events.length > 0) lines.push(dim(BATTLE_PROMPTS.more))

    return lines
  }

  const player = battle.state.player.mon

  switch (battle.menu) {
    case 'main':
      return [
        `What will ${bold(displayName(player).toUpperCase())} do?`,
        ...menuGrid(BATTLE_MAIN_MENU, battle.selection, {
          columns: 2,
          width: inner,
        }),
      ]
    case 'fight':
      return moveMenu(battle.state.player, battle.selection, inner)
    case 'bag': {
      const labels = battle.bagItems.map(
        (key) =>
          `${padRight(ITEMS[key].name, 16)} ${dim(`x${ctx.save.bag[key]}`)}`,
      )

      if (labels.length === 0)
        return [EMPTY_BAG_MESSAGE, hintLine(BATTLE_PROMPTS.back)]

      return [
        BATTLE_PROMPTS.useItem,
        ...menuList(labels, battle.selection, { height: 4, width: inner }),
      ]
    }
    case 'party':
      return [
        BATTLE_PROMPTS.switchTo,
        ...menuList(partyLabels(ctx.save), battle.selection, {
          height: 4,
          width: inner,
        }),
      ]
    case 'target': {
      const item = ITEMS[battle.bagItem]

      return [
        `Use the ${bold(item.name)} on which Pokémon?`,
        ...menuList(partyLabels(ctx.save), battle.selection, {
          height: 4,
          width: inner,
        }),
      ]
    }
    case 'learn': {
      const step = battle.learnStep
      const labels = step.mon.moves.map((slot) => moveData(slot.move).name)

      return [
        `Which move should ${bold(displayName(step.mon).toUpperCase())} forget to learn ${bold(
          moveData(step.move).name,
        )}?`,
        ...menuList([...labels, BATTLE_PROMPTS.declineMove], battle.selection, {
          height: 5,
          width: inner,
        }),
      ]
    }
    default:
      return ['']
  }
}

export const onKey = (ctx, key) => {
  const battle = ctx.battle

  if (battle.message) {
    ctx.advanceMessage()
    return
  }

  const options = menuLength(ctx)

  if (key.name === 'up')
    battle.selection = wrap(battle.selection - stride(battle.menu), options)
  else if (key.name === 'down')
    battle.selection = wrap(battle.selection + stride(battle.menu), options)
  else if (key.name === 'left')
    battle.selection = wrap(battle.selection - 1, options)
  else if (key.name === 'right')
    battle.selection = wrap(battle.selection + 1, options)
  else if (key.name === 'enter' || key.name === 'space')
    ctx.chooseBattleOption()
  else if (key.name === 'escape') ctx.backOutOfBattleMenu()
}

const stride = (menu) => MENU_STRIDES[menu] ?? DEFAULT_MENU_STRIDE

export const menuLength = (ctx) => {
  const battle = ctx.battle

  switch (battle.menu) {
    case 'main':
      return BATTLE_MAIN_MENU.length
    case 'fight':
      return battle.state.player.mon.moves.length
    case 'bag':
      return battle.bagItems.length
    case 'target':
    case 'party':
      return ctx.save.party.length
    case 'learn':
      return battle.learnStep.mon.moves.length + 1
    default:
      return 0
  }
}
