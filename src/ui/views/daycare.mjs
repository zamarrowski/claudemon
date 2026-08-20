import { DAYCARE_LIMIT, EGG_STEPS } from '../../constants.mjs'
import {
  daycareCandidates,
  eggProgress,
  pairIsCompatible,
} from '../../daycare.mjs'
import { eggSpriteFile } from '../../paths.mjs'
import { bold, brightYellow, dim, gray } from '../ansi.mjs'
import { monDetail } from '../detail.mjs'
import { fitCanvasCols, loadSprite } from '../sprite.mjs'
import { truncate } from '../text.mjs'
import {
  expBar,
  hintLine,
  menuList,
  padRight,
  panel,
  withFooter,
  wrap,
} from '../widgets.mjs'
import {
  DAYCARE_EGG_BAR_WIDTH,
  DAYCARE_EGG_INFO_GAP,
  DAYCARE_EGG_PANEL_TITLE,
  DAYCARE_EGG_SPRITE_RESERVED_ROWS,
  DAYCARE_HINTS,
  DAYCARE_LIST_WIDTH,
  DAYCARE_NOTES,
  DAYCARE_PICK_HINTS,
  DAYCARE_TITLE,
  EMPTY_SLOT_LABEL,
  FROM_BOX_TAG,
  LIST_HEIGHT_FLOOR,
  MAX_DAYCARE_WIDTH,
} from './constants.mjs'
import {
  clampSelection,
  columnRows,
  detailBox,
  monColumn,
  monRow,
  noteRows,
  pushNote,
  rowsLeftFor,
  zipColumns,
} from './helpers.mjs'

const headerRow = (save) => {
  const filled = save.daycare.slots.length

  return ` ${brightYellow('◓')} ${bold(DAYCARE_TITLE)}   ${dim(
    `${filled}/${DAYCARE_LIMIT} ${DAYCARE_NOTES.leftHere}`,
  )}`
}

const slotRows = (slots) => {
  return Array.from({ length: DAYCARE_LIMIT }, (unused, slot) => {
    const label = dim(String(slot + 1))
    const mon = slots[slot]

    if (!mon) return `${label}  ${gray(EMPTY_SLOT_LABEL)}`

    return `${label}  ${monRow(mon)}`
  })
}

const candidateRow = (entry) => {
  if (entry.source === 'box') return `${monRow(entry.mon)}${dim(FROM_BOX_TAG)}`

  return monRow(entry.mon)
}

const eggInfoRows = (egg, width) => {
  return [
    truncate(DAYCARE_NOTES.inside, width),
    truncate(
      `${expBar(eggProgress(egg), DAYCARE_EGG_BAR_WIDTH)} ${dim(
        `${egg.steps}/${EGG_STEPS} ${DAYCARE_NOTES.steps}`,
      )}`,
      width,
    ),
    dim(truncate(DAYCARE_NOTES.onlyWhileOpen, width)),
  ]
}

const restedAgainst = (rows, height) => {
  const above = Math.max(0, Math.floor((height - rows.length) / 2))

  return [...Array.from({ length: above }, () => ''), ...rows]
}

const eggRows = (egg, size, scale, width) => {
  const sprite = loadSprite(eggSpriteFile(), {
    cols: fitCanvasCols(size, DAYCARE_EGG_SPRITE_RESERVED_ROWS, scale),
  })

  if (!sprite) {
    return panel(eggInfoRows(egg, width - 2), width, {
      title: DAYCARE_EGG_PANEL_TITLE,
    })
  }

  const gutter = sprite.cols + DAYCARE_EGG_INFO_GAP
  const info = eggInfoRows(egg, size.cols - gutter - 2)

  return zipColumns(sprite.rows, restedAgainst(info, sprite.rows.length)).map(
    ([left, right]) => `${padRight(left, gutter)}${right}`,
  )
}

const pairNote = (save) => {
  if (save.daycare.slots.length < DAYCARE_LIMIT)
    return gray(DAYCARE_NOTES.needTwo)
  if (pairIsCompatible(save)) return DAYCARE_NOTES.getAlong

  return gray(DAYCARE_NOTES.noSpark)
}

const drawSlots = (ctx, size) => {
  const { cols, rows } = size
  const width = Math.min(cols - 4, MAX_DAYCARE_WIDTH)
  const slots = ctx.save.daycare.slots
  const egg = ctx.save.daycare.egg

  const lines = [headerRow(ctx.save), '']

  if (egg) {
    for (const row of eggRows(egg, size, ctx.spriteScale, width))
      lines.push(` ${row}`)
  } else {
    lines.push(` ${gray(DAYCARE_NOTES.noEgg)}`)
  }

  lines.push('')
  lines.push(` ${pairNote(ctx.save)}`)
  lines.push(` ${dim(DAYCARE_NOTES.raising)}`)
  lines.push('')

  const list = menuList(slotRows(slots), ctx.daycareSelection, {
    height: DAYCARE_LIMIT,
    width: DAYCARE_LIST_WIDTH,
  })
  const selected = slots[clampSelection(ctx.daycareSelection, DAYCARE_LIMIT)]

  const note = noteRows(ctx.daycareMessage)
  const footer = [hintLine(DAYCARE_HINTS)]
  const budget = rowsLeftFor(rows, lines, footer, note)
  const right = selected ? monDetail(selected) : []

  for (const row of columnRows(list, right, DAYCARE_LIST_WIDTH).slice(
    0,
    budget,
  ))
    lines.push(row)

  pushNote(lines, note)

  return { lines: withFooter(lines, footer, rows), overlays: [] }
}

const drawPick = (ctx, size) => {
  const { rows } = size
  const candidates = daycareCandidates(ctx.save)
  const selection = clampSelection(ctx.daycarePickSelection, candidates.length)

  const lines = [headerRow(ctx.save), '', ` ${DAYCARE_NOTES.pick}`, '']

  const list = menuList(candidates.map(candidateRow), selection, {
    height: Math.max(LIST_HEIGHT_FLOOR, candidates.length),
    width: DAYCARE_LIST_WIDTH,
  })

  const note = noteRows(ctx.daycareMessage)
  const footer = [hintLine(DAYCARE_PICK_HINTS)]
  const budget = rowsLeftFor(rows, lines, footer, note)
  const right = monColumn(
    candidates[selection].mon,
    detailBox(size, DAYCARE_LIST_WIDTH, budget),
    ctx.spriteScale,
  )

  for (const row of columnRows(list, right, DAYCARE_LIST_WIDTH).slice(
    0,
    budget,
  ))
    lines.push(row)

  pushNote(lines, note)

  return { lines: withFooter(lines, footer, rows), overlays: [] }
}

export const draw = (ctx, size) => {
  if (ctx.daycareStep === 'pick') return drawPick(ctx, size)

  return drawSlots(ctx, size)
}

const onSlotsKey = (ctx, key) => {
  if (key.name === 'escape' || key.name === 'q') {
    ctx.closeDaycare()
    return
  }

  if (key.name === 'up' || key.name === 'k') {
    ctx.daycareSelection = wrap(ctx.daycareSelection - 1, DAYCARE_LIMIT)
    ctx.daycareMessage = null
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.daycareSelection = wrap(ctx.daycareSelection + 1, DAYCARE_LIMIT)
    ctx.daycareMessage = null
  } else if (key.name === 'enter' || key.name === 'space') {
    if (ctx.save.daycare.slots[ctx.daycareSelection]) {
      ctx.takeBackFromDaycare(ctx.daycareSelection)
      return
    }

    ctx.openDaycarePick()
  }
}

const onPickKey = (ctx, key) => {
  if (key.name === 'escape' || key.name === 'q') {
    ctx.closeDaycarePick()
    return
  }

  const candidates = daycareCandidates(ctx.save)

  if (key.name === 'up' || key.name === 'k') {
    ctx.daycarePickSelection = wrap(
      ctx.daycarePickSelection - 1,
      candidates.length,
    )
    ctx.daycareMessage = null
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.daycarePickSelection = wrap(
      ctx.daycarePickSelection + 1,
      candidates.length,
    )
    ctx.daycareMessage = null
  } else if (key.name === 'enter' || key.name === 'space') {
    const entry =
      candidates[clampSelection(ctx.daycarePickSelection, candidates.length)]

    ctx.leaveAtDaycare(entry.source, entry.index)
  }
}

export const onKey = (ctx, key) => {
  if (ctx.daycareStep === 'pick') return onPickKey(ctx, key)

  return onSlotsKey(ctx, key)
}
