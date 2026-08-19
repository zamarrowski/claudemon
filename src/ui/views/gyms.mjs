import { GYMS } from '../../constants.mjs'
import { gymLevelRange } from '../../gym.mjs'
import { trainerSpriteFile } from '../../paths.mjs'
import { countOfKind } from '../../shop.mjs'
import { hasBadge } from '../../state.mjs'
import { trainerLabel } from '../../trainer.mjs'
import { bold, brightYellow, dim, gray } from '../ansi.mjs'
import { fitCanvasCols, loadSprite } from '../sprite.mjs'
import {
  hintLine,
  menuList,
  padRight,
  typeBadge,
  withFooter,
  wrap,
} from '../widgets.mjs'
import {
  COLUMN_DIVIDER,
  GYM_CITY_WIDTH,
  GYM_DETAIL_GAP,
  GYM_SPRITE_RESERVED_ROWS,
  GYM_TYPE_WIDTH,
  GYMS_HINTS,
  GYMS_LIST_WIDTH,
  GYM_MESSAGES,
  GYMS_TITLE,
  LIST_HEIGHT_FLOOR,
} from './constants.mjs'
import {
  badgeMark,
  badgeStrip,
  levelRangeLabel,
  noteRows,
  zipColumns,
} from './helpers.mjs'

const gymRow = (gym, earned) => {
  const city = earned ? gym.city.toUpperCase() : gray(gym.city.toUpperCase())

  return `${badgeMark(earned)} ${padRight(city, GYM_CITY_WIDTH)} ${dim(
    padRight(gym.type.toUpperCase(), GYM_TYPE_WIDTH),
  )} ${dim(levelRangeLabel(gymLevelRange(gym)))}`
}

const gymDetail = (ctx, gym) => {
  const earned = hasBadge(ctx.save, gym.id)
  const range = gymLevelRange(gym)

  return [
    `${bold(gym.badge.toUpperCase())}  ${badgeMark(earned)}`,
    dim(earned ? GYM_MESSAGES.alreadyWon : GYM_MESSAGES.noBadgeYet),
    '',
    bold(trainerLabel(gym.leader)),
    typeBadge(gym.type),
    '',
    dim(
      `${gym.trainers.length} ${GYM_MESSAGES.trainers} · ${levelRangeLabel(range)}`,
    ),
    '',
    `${dim(GYM_MESSAGES.inYourBag)} ${GYM_MESSAGES.potions} ${bold(
      String(countOfKind(ctx.save, 'heal')),
    )} ${dim('·')} ${GYM_MESSAGES.revives} ${bold(
      String(countOfKind(ctx.save, 'revive')),
    )}`,
  ]
}

export const draw = (ctx, size) => {
  const { cols, rows } = size
  const lines = []
  const overlays = []

  const selected = GYMS[ctx.gymSelection]
  const detailLeft = GYMS_LIST_WIDTH + GYM_DETAIL_GAP

  lines.push(
    ` ${brightYellow('◓')} ${bold(GYMS_TITLE)}   ${badgeStrip(ctx.save)}  ${dim(
      `${ctx.save.badges.length}/${GYMS.length} ${GYM_MESSAGES.badges}`,
    )}`,
  )
  lines.push('')

  const entries = GYMS.map((gym) => gymRow(gym, hasBadge(ctx.save, gym.id)))

  const list = menuList(entries, ctx.gymSelection, {
    height: Math.max(LIST_HEIGHT_FLOOR, GYMS.length),
    width: GYMS_LIST_WIDTH,
  })

  const sprite = loadSprite(trainerSpriteFile(selected.leader.sprite), {
    cols: Math.min(
      fitCanvasCols(size, GYM_SPRITE_RESERVED_ROWS, ctx.spriteScale),
      Math.max(2, (cols - detailLeft - 4) * 2),
    ),
  })
  const spriteBlock = sprite ? sprite.rows : []
  const right = [...gymDetail(ctx, selected), '', ...spriteBlock]

  const ruleRows = [
    '',
    ` ${dim(GYM_MESSAGES.rules)}`,
    ` ${dim(GYM_MESSAGES.rollback)}`,
  ]

  const note = noteRows(ctx.gymMessage)
  const noteHeight = note.length > 0 ? note.length + 1 : 0
  const budget = Math.max(
    1,
    rows - 2 - lines.length - noteHeight - ruleRows.length,
  )

  for (const [listRow, detailRow] of zipColumns(list, right).slice(0, budget)) {
    lines.push(
      ` ${padRight(listRow, GYMS_LIST_WIDTH)}  ${dim(COLUMN_DIVIDER)}  ${detailRow}`,
    )
  }

  lines.push(...ruleRows)

  if (note.length > 0) {
    lines.push('')
    for (const row of note) lines.push(` ${brightYellow('✦')} ${row}`)
  }

  return { lines: withFooter(lines, hintLine(GYMS_HINTS), rows), overlays }
}

export const onKey = (ctx, key) => {
  if (key.name === 'up' || key.name === 'k') {
    ctx.gymSelection = wrap(ctx.gymSelection - 1, GYMS.length)
    ctx.gymMessage = null
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.gymSelection = wrap(ctx.gymSelection + 1, GYMS.length)
    ctx.gymMessage = null
  } else if (key.name === 'enter' || key.name === 'space') {
    ctx.startGymRun(GYMS[ctx.gymSelection].id)
  } else if (key.name === 'escape' || key.name === 'q') {
    ctx.gymMessage = null
    ctx.homeSelection = 0
    ctx.setMode('home')
  }
}
