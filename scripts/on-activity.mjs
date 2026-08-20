import {
  beginTurn,
  endSession,
  endTurn,
  noteTool,
  noteWaiting,
  pruneSessions,
  readActivity,
  workingInterval,
} from '../src/activity.mjs'
import { encounterTtlMs, loadConfig } from '../src/config.mjs'
import { loadSpeciesTable, rollEncounters } from '../src/encounter.mjs'
import { logError } from '../src/log.mjs'
import { offerEncounter, readEncounter } from '../src/queue.mjs'
import { makeRng, randomSeed } from '../src/rng.mjs'
import { readStatus } from '../src/status.mjs'
import { drawSteps, earnSteps } from '../src/steps.mjs'
import { accrueWorked } from '../src/worked.mjs'
import { DEFAULT_LEAD_LEVEL } from './constants.mjs'
import { readStdin } from './stdin.mjs'
import { transformResponseHookEvent } from './transformers.mjs'

const pendingStepsOf = (previous) => {
  if (!Number.isInteger(previous?.pendingSteps)) return 0

  return Math.max(0, previous.pendingSteps)
}

const leadLevelOf = (status) => {
  const level = status?.lead?.level

  if (typeof level !== 'number') return null

  return level
}

const rollFromPool = (config, ttlMs) => {
  if (readEncounter(ttlMs)) return

  const steps = drawSteps(config.maxSteps)

  if (steps === 0) return

  const leadLevel = leadLevelOf(readStatus())
  const [encounter] = rollEncounters({
    steps,
    leadLevel,
    rng: makeRng(randomSeed()),
    config,
    species: loadSpeciesTable(leadLevel ?? DEFAULT_LEAD_LEVEL),
  })

  if (!encounter) return

  offerEncounter(
    {
      v: encounter.v,
      kind: encounter.kind,
      species: encounter.species,
      name: encounter.name,
      level: encounter.level,
      trainer: encounter.trainer,
      seed: encounter.seed,
      shiny: encounter.shiny,
    },
    ttlMs,
  )
}

const walkWhileWorking = (previous, interval) => {
  const pending = pendingStepsOf(previous)

  if (!interval && pending === 0) return

  const config = loadConfig()

  if (!earnSteps({ interval, pending, config }))
    return { pendingSteps: pending }

  rollFromPool(config, encounterTtlMs(config))

  return { pendingSteps: 0 }
}

const main = async () => {
  const raw = await readStdin()

  if (!raw.trim()) return

  const payload = transformResponseHookEvent(JSON.parse(raw))
  const session = payload?.session_id

  if (!session) return

  const cwd = payload.cwd ?? null
  const event = payload.hook_event_name
  const now = Date.now()
  const previous = readActivity(session)
  const interval = workingInterval(previous, now)

  accrueWorked(interval)

  switch (event) {
    case 'PreToolUse': {
      const walked = walkWhileWorking(previous, interval)

      noteTool(session, cwd, payload.tool_name, walked)
      break
    }

    case 'Notification':
      noteWaiting(session, cwd, payload.message)
      break

    case 'Stop': {
      const walked = walkWhileWorking(previous, interval)

      endTurn(session, cwd, walked)
      break
    }

    case 'SessionStart':
      pruneSessions()
      endTurn(session, cwd)
      break

    case 'SessionEnd':
      walkWhileWorking(previous, interval)
      endSession(session)
      break

    default:
      beginTurn(session, cwd)
      break
  }
}

try {
  await main()
} catch (error) {
  logError('on-activity', error)
}

process.exit(0)
