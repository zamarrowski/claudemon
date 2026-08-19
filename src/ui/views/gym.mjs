import { GYM_STATUSES } from '../../constants.mjs'
import {
  currentOpponent,
  gymOf,
  gymRoster,
  isLeaderNext,
  opponentLevelRange,
  opponentStatus,
} from '../../gym.mjs'
import { displayName, genderOf, isFainted, levelOf } from '../../pokemon.mjs'
import { hasBadge } from '../../state.mjs'
import { trainerLabel } from '../../trainer.mjs'
import { bold, brightGreen, brightYellow, dim, gray } from '../ansi.mjs'
import {
  genderTag,
  hintLine,
  hpBar,
  padRight,
  panel,
  statusTag,
  typeBadge,
  withFooter,
  wrap,
} from '../widgets.mjs'
import {
  GYM_HINTS,
  GYM_MESSAGES,
  GYM_PROMPTS,
  GYM_ROSTER_MARKS,
  GYM_ROSTER_NAME_WIDTH,
  GYM_ROSTER_PANEL_TITLE,
  GYM_TITLE_SUFFIX,
  HOME_TEAM_PANEL_TITLE,
  LEAD_MARK,
  MAX_GYM_WIDTH,
  MON_NAME_WIDTH,
} from './constants.mjs'
import {
  badgeMark,
  clampSelection,
  levelRangeLabel,
  noteRows,
} from './helpers.mjs'

const ROSTER_MARKS = {
  [GYM_STATUSES.beaten]: brightGreen(GYM_ROSTER_MARKS.beaten),
  [GYM_STATUSES.next]: brightYellow(GYM_ROSTER_MARKS.next),
  [GYM_STATUSES.pending]: gray(GYM_ROSTER_MARKS.pending),
}

const rosterRow = (opponent, status) => {
  const label = trainerLabel(opponent)
  const name = status === GYM_STATUSES.beaten ? gray(label) : label

  return ` ${ROSTER_MARKS[status]} ${padRight(name, GYM_ROSTER_NAME_WIDTH)} ${dim(
    levelRangeLabel(opponentLevelRange(opponent)),
  )} ${dim(`×${opponent.team.length}`)}`
}

const partyRow = (mon, index, cursor) => {
  const chosen = index === cursor
  const raw = `${displayName(mon).toUpperCase()}${genderTag(genderOf(mon))}`
  const name = isFainted(mon) ? gray(raw) : raw
  const lead = index === 0 ? brightYellow(LEAD_MARK) : ' '
  const tag = statusTag(mon.status)

  return ` ${chosen ? '▶' : ' '}${lead} ${padRight(name, MON_NAME_WIDTH)} ${dim(
    `Lv${levelOf(mon)}`,
  )} ${hpBar(mon.hp, mon.stats.hp, 10)} ${dim(`${mon.hp}/${mon.stats.hp}`)}${
    tag ? ` ${tag}` : ''
  }`
}

const promptRow = (ctx) => {
  if (ctx.gymLeaving) return GYM_MESSAGES.confirmLeave
  if (ctx.bagMessage) return ctx.bagMessage
  if (ctx.gymMessage) return ctx.gymMessage

  const next = trainerLabel(currentOpponent(ctx.gym))
  const wording = isLeaderNext(ctx.gym)
    ? GYM_PROMPTS.leader
    : GYM_PROMPTS.challenge

  return `${brightGreen('[enter]')} ${wording} ${dim('·')} ${bold(next)}`
}

export const draw = (ctx, size) => {
  const { cols, rows } = size
  const overlays = []

  const width = Math.min(cols - 2, MAX_GYM_WIDTH)
  const gym = gymOf(ctx.gym)
  const party = ctx.save.party
  const cursor = clampSelection(ctx.teamSelection, party.length)

  const head = [
    ` ${brightYellow('◓')} ${bold(`${gym.city.toUpperCase()} ${GYM_TITLE_SUFFIX}`)} ${typeBadge(
      gym.type,
    )}  ${dim(gym.badge)} ${badgeMark(hasBadge(ctx.save, gym.id))}`,
    '',
  ]

  const roster = gymRoster(gym).map((opponent, index) =>
    rosterRow(opponent, opponentStatus(ctx.gym, index)),
  )
  const team = party.map((mon, index) => partyRow(mon, index, cursor))

  const body = [
    ...panel(roster, width, { title: GYM_ROSTER_PANEL_TITLE }),
    '',
    ...panel(team, width, { title: HOME_TEAM_PANEL_TITLE }),
  ].map((row) => ` ${row}`)

  const tail = [
    '',
    ...noteRows(promptRow(ctx)).map((row) => ` ${row}`),
    ` ${dim(GYM_MESSAGES.rules)}`,
  ]

  const budget = Math.max(0, rows - 2 - head.length - tail.length)
  const lines = [...head, ...body.slice(0, budget), ...tail]

  return { lines: withFooter(lines, hintLine(GYM_HINTS), rows), overlays }
}

export const onKey = (ctx, key) => {
  const total = ctx.save.party.length

  if (key.name === 'escape') {
    ctx.confirmLeaveGym()
    return
  }

  if (ctx.gymLeaving) {
    ctx.cancelLeaveGym()
    return
  }

  ctx.gymMessage = null
  ctx.bagMessage = null

  if (key.name === 'up' || key.name === 'k')
    ctx.teamSelection = wrap(ctx.teamSelection - 1, total)
  else if (key.name === 'down' || key.name === 'j')
    ctx.teamSelection = wrap(ctx.teamSelection + 1, total)
  else if (key.name === 'enter' || key.name === 'space') ctx.startGymBattle()
  else if (key.name === 'i') ctx.openBag()
  else if (key.name === 'l') ctx.makeLead(ctx.teamSelection)
}
