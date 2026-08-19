import { achievementEntries, earnedCount } from '../../achievements.mjs'
import { ACHIEVEMENTS, GYMS } from '../../constants.mjs'
import { daysOnTheRoad } from '../../state.mjs'
import { workedHours } from '../../worked.mjs'
import { bold, brightGreen, brightYellow, dim, gray } from '../ansi.mjs'
import { truncate } from '../text.mjs'
import {
  hintLine,
  menuList,
  money,
  padRight,
  panel,
  withFooter,
  wrap,
} from '../widgets.mjs'
import {
  ACHIEVEMENT_MARKS,
  COLUMN_DIVIDER,
  KANTO_TOTAL,
  LIST_HEIGHT_FLOOR,
  TRAINER_ACHIEVEMENTS_TITLE,
  TRAINER_ACHIEVEMENT_WIDTH,
  TRAINER_HINTS,
  TRAINER_LIST_WIDTH,
  TRAINER_NOTES,
  TRAINER_RECORD_LABELS,
  TRAINER_RECORD_LABEL_WIDTH,
  TRAINER_RECORD_TITLE,
  TRAINER_RECORD_WIDTH,
  TRAINER_ROWS_RESERVED,
  TRAINER_TITLE,
} from './constants.mjs'
import { badgeStrip, clampSelection, zipColumns } from './helpers.mjs'

const dayCount = (days) => {
  const word = days === 1 ? TRAINER_NOTES.day : TRAINER_NOTES.days

  return `${days} ${word}`
}

const earnedDate = (earnedAt) => earnedAt.slice(0, 10)

const recordRow = (label, value) => {
  return `${dim(padRight(label, TRAINER_RECORD_LABEL_WIDTH))}${bold(value)}`
}

const recordRows = (save, worked) => {
  return [
    recordRow(
      TRAINER_RECORD_LABELS.caught,
      `${save.dex.caught.length}/${KANTO_TOTAL}`,
    ),
    recordRow(TRAINER_RECORD_LABELS.shiny, `${save.dex.shiny.length}`),
    recordRow(TRAINER_RECORD_LABELS.battles, `${save.stats.battles}`),
    recordRow(TRAINER_RECORD_LABELS.won, `${save.stats.wins}`),
    recordRow(TRAINER_RECORD_LABELS.lost, `${save.stats.losses}`),
    recordRow(TRAINER_RECORD_LABELS.ran, `${save.stats.runs}`),
    recordRow(TRAINER_RECORD_LABELS.streak, dayCount(save.stats.streak)),
    recordRow(TRAINER_RECORD_LABELS.worked, `${workedHours(worked)}h`),
    recordRow(TRAINER_RECORD_LABELS.money, money(save.money)),
  ]
}

const achievementRow = (entry) => {
  if (entry.earnedAt) {
    return `${brightGreen(ACHIEVEMENT_MARKS.earned)} ${entry.label}`
  }

  return `${gray(ACHIEVEMENT_MARKS.locked)} ${gray(
    padRight(entry.label, TRAINER_ACHIEVEMENT_WIDTH),
  )}${dim(`${entry.value}/${entry.goal}`)}`
}

const achievementNote = (entry) => {
  if (!entry.earnedAt) return dim(entry.hint)

  return `${dim(entry.hint)}  ${brightGreen(
    `${TRAINER_NOTES.earned} ${earnedDate(entry.earnedAt)}`,
  )}`
}

export const draw = (ctx, size) => {
  const { cols, rows } = size
  const lines = []
  const overlays = []

  const entries = achievementEntries(ctx.save, ctx.worked)
  const selection = clampSelection(ctx.trainerSelection, entries.length)
  const days = dayCount(daysOnTheRoad(ctx.save))

  lines.push(
    ` ${brightYellow('◓')} ${bold(TRAINER_TITLE)}   ${bold(
      ctx.save.trainer.name.toUpperCase(),
    )} ${dim('·')} ${dim(`${days} ${TRAINER_NOTES.onTheRoad}`)}`,
  )
  lines.push('')

  const left = [
    ...panel(recordRows(ctx.save, ctx.worked), TRAINER_RECORD_WIDTH, {
      title: TRAINER_RECORD_TITLE,
    }),
    '',
    ` ${badgeStrip(ctx.save)}  ${dim(
      `${ctx.save.badges.length}/${GYMS.length} ${TRAINER_NOTES.badges}`,
    )}`,
  ]

  const heading = `${bold(TRAINER_ACHIEVEMENTS_TITLE)}  ${dim(
    `${earnedCount(entries)}/${entries.length}`,
  )}`
  const list = menuList(entries.map(achievementRow), selection, {
    height: Math.max(
      LIST_HEIGHT_FLOOR,
      Math.min(entries.length, rows - TRAINER_ROWS_RESERVED),
    ),
    width: TRAINER_LIST_WIDTH,
  })

  for (const [record, right] of zipColumns(left, [heading, '', ...list])) {
    lines.push(
      ` ${padRight(record, TRAINER_RECORD_WIDTH)}  ${dim(COLUMN_DIVIDER)}  ${right}`,
    )
  }

  lines.push('')
  lines.push(` ${achievementNote(entries[selection])}`)

  if (ctx.notice)
    lines.push(` ${brightYellow('✦')} ${truncate(ctx.notice, cols - 4)}`)

  return { lines: withFooter(lines, hintLine(TRAINER_HINTS), rows), overlays }
}

export const onKey = (ctx, key) => {
  if (key.name === 'up' || key.name === 'k') {
    ctx.trainerSelection = wrap(ctx.trainerSelection - 1, ACHIEVEMENTS.length)
    ctx.playSound('cursor')
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.trainerSelection = wrap(ctx.trainerSelection + 1, ACHIEVEMENTS.length)
    ctx.playSound('cursor')
  } else if (key.name === 's') {
    ctx.playSound('select')
    ctx.exportCard()
  } else if (key.name === 'escape' || key.name === 'q') {
    ctx.playSound('back')
    ctx.homeSelection = 0
    ctx.setMode('home')
  }
}
