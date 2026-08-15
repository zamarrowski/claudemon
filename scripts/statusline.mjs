import { spawnSync } from 'node:child_process'
import { encounterTtlMs } from '../src/config.mjs'
import { loadConfig } from '../src/node/config.mjs'
import { TRAINER_MESSAGES } from '../src/constants.mjs'
import { encounterExpiresAt, readEncounter } from '../src/node/queue.mjs'
import { companionIsLive, readStatus } from '../src/node/status.mjs'
import { trainerLabel } from '../src/trainer.mjs'
import {
  bold,
  brightCyan,
  brightGreen,
  brightYellow,
  dim,
} from '../src/node/ansi.mjs'
import { truncate } from '../src/node/text.mjs'
import { money } from '../src/format.mjs'
import {
  CALL_TO_ACTION,
  ENCOUNTER_MARK,
  KANTO_TOTAL,
  LEAD_MARK,
  MIN_TRUNCATE_WIDTH,
  PROBE_RULE_WIDTH,
  RULE_MARK,
  SEPARATOR_MARK,
  TRUNCATE_MARGIN,
  WILD_FALLBACK_HEADLINE,
  WRAPPED_TIMEOUT_MS,
} from './constants.mjs'
import { readStdinSync } from './stdin.mjs'

const ignoreStdoutError = () => {}

process.stdout.on('error', ignoreStdoutError)

const wrappedOutput = (command, stdin) => {
  if (!command) return ''
  if (command.includes('claudemon')) return ''

  try {
    const result = spawnSync(command, {
      shell: true,
      input: stdin,
      encoding: 'utf8',
      timeout: WRAPPED_TIMEOUT_MS,
    })

    if (result.status !== 0 || !result.stdout) return ''

    return result.stdout.replace(/\n+$/, '')
  } catch {
    return ''
  }
}

const trainerHeadline = (trainer) => {
  const label = bold(trainerLabel(trainer))

  return `${label} ${TRAINER_MESSAGES.wantsToBattle} ${dim(`×${trainer.team.length}`)}`
}

const encounterHeadline = (encounter) => {
  if (encounter.kind === 'trainer') return trainerHeadline(encounter.trainer)
  if (!encounter.name) return WILD_FALLBACK_HEADLINE

  return `A wild ${bold(encounter.name.toUpperCase())} appeared!`
}

const callToAction = (live) => {
  if (live) return brightGreen(CALL_TO_ACTION.live)

  return `${dim(CALL_TO_ACTION.runPrefix)}${brightCyan(CALL_TO_ACTION.command)}${dim(CALL_TO_ACTION.runSuffix)}`
}

const timeLeftLabel = (expiresAt) => {
  if (expiresAt == null) return ''

  const seconds = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))

  return `  ${dim(SEPARATOR_MARK)}  ${dim(`${seconds}s left`)}`
}

const encounterRow = (encounter, ttlMs, live) => {
  const headline = encounterHeadline(encounter)
  const left = timeLeftLabel(encounterExpiresAt(encounter, ttlMs))

  return `${brightYellow(ENCOUNTER_MARK)} ${headline}${left}  ${dim(SEPARATOR_MARK)}  ${callToAction(live)}`
}

const leadRow = (status) => {
  const parts = [
    `${bold(status.lead.name.toUpperCase())} ${dim(`Lv${status.lead.level}`)}`,
  ]

  if (typeof status.balls === 'number') parts.push(`${status.balls} balls`)
  if (typeof status.money === 'number') parts.push(money(status.money))
  if (typeof status.caught === 'number')
    parts.push(`${status.caught}/${KANTO_TOTAL} caught`)

  return dim(`${LEAD_MARK} ${parts.join(`  ${SEPARATOR_MARK}  `)}`)
}

const gameRow = (config) => {
  const status = readStatus()
  const ttlMs = encounterTtlMs(config)
  const encounter = readEncounter(ttlMs)

  if (encounter) return encounterRow(encounter, ttlMs, companionIsLive(status))
  if (!status?.lead) return ''

  return leadRow(status)
}

const probeRowCount = (config) => {
  if (config.probeRows != null) return Number(config.probeRows)

  return Number(process.env.CLAUDEMON_PROBE_ROWS)
}

const terminalWidth = () => Number(process.env.COLUMNS) || 0

const fitRow = (row, width) => {
  if (width > MIN_TRUNCATE_WIDTH) return truncate(row, width - TRUNCATE_MARGIN)

  return row
}

const main = () => {
  const stdin = readStdinSync()
  const config = loadConfig()

  const probeRows = probeRowCount(config)

  if (Number.isInteger(probeRows) && probeRows > 0) {
    const lines = []

    for (let row = 1; row <= probeRows; row++) {
      lines.push(
        `${brightYellow(`row ${row}/${probeRows}`)} ${dim(RULE_MARK.repeat(PROBE_RULE_WIDTH))} claudemon probe`,
      )
    }

    process.stdout.write(`${lines.join('\n')}\n`)

    return
  }

  const above = wrappedOutput(config.wrappedStatusLine, stdin)
  const row = gameRow(config)

  const width = terminalWidth()
  const lines = []

  if (above) lines.push(above)
  if (row) lines.push(fitRow(row, width))

  if (lines.length > 0) process.stdout.write(`${lines.join('\n')}\n`)
}

try {
  main()
} catch {}
