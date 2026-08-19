import { bold, brightGreen, brightRed, brightYellow, dim } from '../ansi.mjs'
import { centre, hintLine, panel } from '../widgets.mjs'
import {
  APP_TITLE,
  MAX_UPDATE_WIDTH,
  SPINNER,
  STATUS_MARKS,
  UPDATE_CLOSING_MESSAGES,
  UPDATE_STEPS_TITLE,
  UPDATE_TITLE,
} from './constants.mjs'
import { updateFooter, updateHeading } from './helpers.mjs'

const marker = (status, frame) => {
  switch (status) {
    case 'ok':
      return brightGreen(STATUS_MARKS.ok)
    case 'failed':
      return brightRed(STATUS_MARKS.failed)
    case 'running':
      return brightYellow(SPINNER[frame % SPINNER.length])
    default:
      return dim(STATUS_MARKS.pending)
  }
}

const stepRows = (run, frame) => {
  const rows = []

  for (const step of run.steps) {
    const text = step.status === 'ok' ? step.done : step.label

    rows.push(
      `${marker(step.status, frame)} ${step.status === 'pending' ? dim(text) : text}`,
    )

    if (step.detail) rows.push(`  ${dim(step.detail)}`)
  }

  return rows
}

export const closingLines = (run) => {
  if (run.state === 'running') return []

  if (run.state === 'failed') {
    return [
      UPDATE_CLOSING_MESSAGES.failed,
      `${UPDATE_CLOSING_MESSAGES.stillOn} ${bold(`v${run.from}`)} ${UPDATE_CLOSING_MESSAGES.stillWorks}`,
    ]
  }

  if (run.to && run.to === run.from) {
    return [`${UPDATE_CLOSING_MESSAGES.alreadyNewest} ${bold(`v${run.from}`)}.`]
  }

  return [
    `${bold(`v${run.to}`)} ${UPDATE_CLOSING_MESSAGES.onDisk}`,
    '',
    UPDATE_CLOSING_MESSAGES.restart,
    `${UPDATE_CLOSING_MESSAGES.quitAndRun} ${bold(APP_TITLE)} ${UPDATE_CLOSING_MESSAGES.again}`,
  ]
}

export const draw = (ctx, size) => {
  const { cols, rows } = size
  const lines = []
  const run = ctx.update
  const frame = ctx.updateFrame

  lines.push(` ${brightYellow('◓')} ${bold(UPDATE_TITLE)}`)
  lines.push('')
  lines.push(centre(updateHeading(run), cols))
  lines.push('')

  const width = Math.min(cols - 4, MAX_UPDATE_WIDTH)

  for (const row of panel(stepRows(run, frame), width, {
    title: UPDATE_STEPS_TITLE,
  })) {
    lines.push(`  ${row}`)
  }

  const closing = closingLines(run)

  if (closing.length > 0) {
    lines.push('')

    for (const line of closing) lines.push(line ? `  ${line}` : '')
  }

  while (lines.length < rows - 1) lines.push('')

  lines.push(hintLine(updateFooter(run)))

  return { lines, overlays: [] }
}

export const onKey = (ctx, key) => {
  if (ctx.update.state === 'running') return

  if (
    key.name === 'escape' ||
    key.name === 'enter' ||
    key.name === 'space' ||
    key.name === 'q'
  ) {
    ctx.finishUpdate()
  }
}
