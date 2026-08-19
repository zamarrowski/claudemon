import { isWorking } from '../../activity.mjs'
import { TRAINER_MESSAGES } from '../../constants.mjs'
import { encounterSpecies } from '../../encounter.mjs'
import { monSpriteFile, trainerSpriteFile } from '../../paths.mjs'
import { displayName, genderOf, isFainted, levelOf } from '../../pokemon.mjs'
import {
  activePokemon,
  partyIsWipedOut,
  partyNeedsHealing,
  totalBalls,
} from '../../state.mjs'
import { trainerLabel } from '../../trainer.mjs'
import { VERSION } from '../../version.mjs'
import { bold, brightGreen, brightYellow, dim, gray } from '../ansi.mjs'
import { bandRows, bandScale, grassLines } from '../grass.mjs'
import { fitCanvasCols, loadSprite, placeSprite } from '../sprite.mjs'
import { truncate, visibleLength } from '../text.mjs'
import {
  centre,
  elapsed,
  evolutionTag,
  genderTag,
  hintLine,
  hpBar,
  menuGrid,
  money,
  padRight,
  panel,
  shinyTag,
  trainerTray,
  wrap,
} from '../widgets.mjs'
import {
  ACTIVITY_MESSAGES,
  APP_TITLE,
  BASE_MENU,
  ENCOUNTER_MESSAGES,
  FIGHT_MENU_LABEL,
  GRASS_MESSAGES,
  HOME_HINTS,
  HOME_SPRITE_RESERVED_ROWS,
  HOME_TEAM_PANEL_TITLE,
  KANTO_TOTAL,
  MAX_HOME_WIDTH,
  MENU_CELL,
  MON_LEVEL_WIDTH,
  MON_NAME_WIDTH,
  REST_MESSAGES,
  TITLE_COLUMN_SPLIT,
  UPDATE_NOTICES,
  WALK_HINTS,
} from './constants.mjs'
import { clampSelection, menuColumns } from './helpers.mjs'

export const menuItems = (ctx) => {
  const base = isWorking(ctx.activity)
    ? BASE_MENU.map((item) =>
        item.id === 'heal' ? { ...item, disabled: true } : item,
      )
    : BASE_MENU

  if (!ctx.encounter) return base

  const fight = {
    id: 'fight',
    label: FIGHT_MENU_LABEL,
    disabled: !activePokemon(ctx.save),
  }

  return [fight, ...base]
}

export const countdownRow = (encounter, now = Date.now()) => {
  const left = Math.max(0, Math.ceil((encounter.expiresAt - now) / 1000))

  return dim(`${ENCOUNTER_MESSAGES.slipsBackIn} ${left}s`)
}

export const activityRow = (activity, now = Date.now()) => {
  if (!activity || activity.state === 'unknown') return ''

  const age =
    typeof activity.since === 'number'
      ? ` ${dim('·')} ${dim(elapsed(now - activity.since))}`
      : ''
  const others =
    activity.sessions > 1 ? dim(` (+${activity.sessions - 1})`) : ''

  if (activity.state === 'waiting') {
    return `${brightYellow('◆')} ${bold(ACTIVITY_MESSAGES.waiting)}${others}${age}`
  }

  if (activity.state === 'working') {
    const tool = activity.tool ? ` ${dim('·')} ${activity.tool}` : ''

    return `${brightGreen('●')} ${ACTIVITY_MESSAGES.working}${others}${tool}${age}`
  }

  return `${dim('○')} ${dim(ACTIVITY_MESSAGES.idle)}${others}${age}`
}

export const restRow = (ctx) => {
  if (!isWorking(ctx.activity)) return ''

  if (partyIsWipedOut(ctx.save)) return dim(REST_MESSAGES.wipedOut)

  if (!partyNeedsHealing(ctx.save)) return ''

  return dim(REST_MESSAGES.needsHealing)
}

export const updateRow = (notice) => {
  if (!notice) return ''

  if (notice.kind === 'stale') {
    return `${brightYellow('◆')} ${bold(`v${notice.version}`)} ${UPDATE_NOTICES.installed} ${dim('·')} ${dim(UPDATE_NOTICES.quitAndRun)}`
  }

  return `${brightYellow('◆')} ${bold(`v${notice.version}`)} ${UPDATE_NOTICES.available} ${dim('·')} ${brightGreen('[u]')} ${dim(UPDATE_NOTICES.update)}`
}

export const footerRow = (cols, version = VERSION) => {
  if (!version) return hintLine(HOME_HINTS)

  const tag = `v${version} `
  const gap = cols - visibleLength(HOME_HINTS) - visibleLength(tag)

  if (gap < 1) return hintLine(HOME_HINTS)

  return hintLine(HOME_HINTS + ' '.repeat(gap) + tag)
}

const encounterHeading = (encounter) => {
  if (encounter.kind === 'trainer') {
    return `${brightYellow('✦')} ${bold(trainerLabel(encounter.trainer))} ${TRAINER_MESSAGES.wantsToBattle}`
  }

  return `${brightYellow('✦')} ${bold(`${ENCOUNTER_MESSAGES.wild} ${encounter.name.toUpperCase()}`)}${shinyTag(encounter.shiny)} ${ENCOUNTER_MESSAGES.appeared}`
}

const encounterSpriteFile = (encounter) => {
  if (encounter.kind === 'trainer' && encounter.trainer.sprite)
    return trainerSpriteFile(encounter.trainer.sprite)

  return monSpriteFile('front', encounterSpecies(encounter), encounter.shiny)
}

const pushEncounterField = (lines, ctx, encounter, size) => {
  const { cols } = size

  lines.push(centre(encounterHeading(encounter), cols))
  lines.push(centre(countdownRow(encounter), cols))
  lines.push('')

  const sprite = loadSprite(encounterSpriteFile(encounter), {
    cols: fitCanvasCols(size, HOME_SPRITE_RESERVED_ROWS, ctx.spriteScale),
  })

  if (sprite)
    placeSprite(
      lines,
      sprite,
      Math.max(1, Math.floor((cols - sprite.cols) / 2)),
    )

  const grassAt = lines.length

  lines.push('')

  if (encounter.kind === 'trainer') {
    const count = encounter.trainer.team.length

    lines.push(centre(`${trainerTray(count, count)} ${dim(`×${count}`)}`, cols))
  }

  lines.push(
    centre(`${brightGreen('[enter]')} ${ENCOUNTER_MESSAGES.face}`, cols),
  )

  return grassAt
}

const pushQuietField = (lines, working, cols) => {
  lines.push('')
  lines.push(
    centre(dim(working ? GRASS_MESSAGES.rustling : GRASS_MESSAGES.quiet), cols),
  )
  lines.push('')

  const grassAt = lines.length

  lines.push('')
  lines.push(centre(dim(working ? WALK_HINTS.working : WALK_HINTS.idle), cols))

  return grassAt
}

export const draw = (ctx, size) => {
  const { cols, rows } = size
  const lines = []
  const overlays = []
  const width = Math.min(cols - 2, MAX_HOME_WIDTH)

  const encounter = ctx.encounter
  const lead = ctx.save.party[0]
  const working = ctx.activity.state === 'working'

  const title = `${brightYellow('◓')} ${bold(APP_TITLE)}`
  const summary = dim(
    `${ctx.save.dex.caught.length}/${KANTO_TOTAL} caught · ${totalBalls(ctx.save)} balls · ${money(ctx.save.money)}`,
  )

  lines.push(` ${padRight(title, width - TITLE_COLUMN_SPLIT)}${summary}`)

  const activity = activityRow(ctx.activity)

  lines.push(activity ? ` ${activity}` : '')

  const update = updateRow(ctx.updateNotice)

  if (update) lines.push(` ${update}`)

  const grassAt = encounter
    ? pushEncounterField(lines, ctx, encounter, size)
    : pushQuietField(lines, working, cols)

  lines.push('')

  if (lead) {
    const party = ctx.save.party.map((mon) => {
      const name = isFainted(mon)
        ? gray(displayName(mon).toUpperCase())
        : displayName(mon).toUpperCase()

      const level = `${dim(`Lv${levelOf(mon)}`)}${evolutionTag(mon)}`

      return `${padRight(`${name}${genderTag(genderOf(mon))}${shinyTag(mon.shiny)}`, MON_NAME_WIDTH)} ${padRight(level, MON_LEVEL_WIDTH)} ${hpBar(
        mon.hp,
        mon.stats.hp,
        10,
      )}`
    })

    for (const line of panel(party, width, { title: HOME_TEAM_PANEL_TITLE }))
      lines.push(` ${line}`)
  }

  const rest = restRow(ctx)

  if (rest) lines.push(` ${rest}`)

  if (ctx.notice) lines.push(` ${dim(truncate(ctx.notice, width))}`)

  const items = menuItems(ctx)
  const labels = items.map((item) =>
    item.disabled ? gray(item.label) : item.label,
  )
  const menuRows = menuGrid(labels, ctx.homeSelection, {
    columns: menuColumns(items.length, width, MENU_CELL),
    width,
  })

  const scale = bandScale(size)

  if (rows - 3 - menuRows.length - lines.length >= bandRows(scale)) {
    const band = grassLines({
      cols: width,
      step: ctx.scene.step,
      walking: !encounter && working,
      scale,
    })
    lines.splice(grassAt, 0, ...band.map((row) => ` ${row}`))
  }

  while (lines.length < rows - 3 - menuRows.length) lines.push('')

  for (const row of menuRows) lines.push(` ${row}`)

  lines.push(footerRow(cols))

  return { lines, overlays }
}

export const onKey = (ctx, key) => {
  if (key.name === 'u' && ctx.updateNotice?.kind === 'available') {
    ctx.startUpdate()
    return
  }

  const items = menuItems(ctx)
  ctx.homeSelection = clampSelection(ctx.homeSelection, items.length)

  if (key.name === 'left' || key.name === 'right') {
    ctx.homeSelection = wrap(
      ctx.homeSelection + (key.name === 'left' ? -1 : 1),
      items.length,
    )
    ctx.playSound('cursor')
  } else if (key.name === 'enter' || key.name === 'space') {
    const item = items[ctx.homeSelection]

    if (item.disabled) {
      ctx.playSound('back')
      return
    }

    ctx.playSound('select')
    ctx.openHomeSelection(item.id)
  } else if (key.name === 'q') {
    ctx.quit()
  }
}
