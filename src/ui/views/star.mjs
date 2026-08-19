import { STAR_ANSWERS, STAR_REPO_URL } from '../../constants.mjs'
import { bold, brightGreen, brightYellow, dim } from '../ansi.mjs'
import { centre, panel, withFooter } from '../widgets.mjs'
import {
  APP_TITLE,
  MAX_STAR_WIDTH,
  STAR_CHOICES,
  STAR_LINES,
  STAR_PANEL_TITLE,
} from './constants.mjs'

const choiceRow = () => {
  return STAR_CHOICES.map(
    (choice) => `${brightGreen(choice.key)} ${choice.label}`,
  ).join('   ')
}

const bodyRows = () => {
  return [
    '',
    ...STAR_LINES.map((line) => `  ${line}`),
    '',
    `  ${choiceRow()}`,
    '',
  ]
}

export const draw = (ctx, size) => {
  const { cols, rows } = size
  const lines = []
  const width = Math.min(cols - 4, MAX_STAR_WIDTH)

  lines.push(` ${brightYellow('◓')} ${bold(APP_TITLE)}`)
  lines.push('')

  for (const row of panel(bodyRows(), width, { title: STAR_PANEL_TITLE }))
    lines.push(centre(row, cols))

  return {
    lines: withFooter(lines, centre(dim(STAR_REPO_URL), cols), rows),
    overlays: [],
  }
}

export const onKey = (ctx, key) => {
  if (key.name === 'enter') {
    ctx.answerStar(STAR_ANSWERS.starred)
    return
  }

  if (key.name === 'd') {
    ctx.answerStar(STAR_ANSWERS.never)
    return
  }

  if (
    key.name === 'n' ||
    key.name === 'escape' ||
    key.name === 'space' ||
    key.name === 'q'
  ) {
    ctx.answerStar(null)
  }
}
