import {
  beginTurn,
  endSession,
  endTurn,
  noteTool,
  noteWaiting,
  pruneSessions,
  readActivity,
} from '../src/node/sessions.mjs'
import { encounterTtlMs } from '../src/config.mjs'
import { loadConfig } from '../src/node/config.mjs'
import {
  loadSpeciesTable,
  rollEncounters,
  stepsWhileWorking,
} from '../src/encounter.mjs'
import { logError } from '../src/node/log.mjs'
import { offerEncounter, readEncounter } from '../src/node/queue.mjs'
import { makeRng, randomSeed } from '../src/rng.mjs'
import { readStatus } from '../src/node/status.mjs'
import { accrueWorked } from '../src/node/worked.mjs'
import { workedSince } from '../src/worked.mjs'
import { DEFAULT_LEAD_LEVEL } from './constants.mjs'
import { readStdin } from './stdin.mjs'
import { transformResponseHookEvent } from './transformers.mjs'

const stepClockOf = (previous, now) => {
  return previous.lastStepAt ?? previous.since ?? now
}

const pendingStepsOf = (previous) => {
  if (!Number.isInteger(previous.pendingSteps)) return 0

  return Math.max(0, previous.pendingSteps)
}

const walkWhileWorking = (sessionId, now) => {
  const previous = readActivity(sessionId)

  if (previous?.state !== 'working') return

  const config = loadConfig()
  const ttlMs = encounterTtlMs(config)
  const stepClockAt = stepClockOf(previous, now)
  const { steps, taken } = stepsWhileWorking(now - stepClockAt, config)
  const pending = pendingStepsOf(previous)

  if (steps === 0 && pending === 0) return

  const walked = {
    lastStepAt: stepClockAt + taken,
    pendingSteps: 0,
  }

  if (readEncounter(ttlMs)) return walked

  const level = readStatus()?.lead?.level
  const leadLevel = typeof level === 'number' ? level : null

  const encounters = rollEncounters({
    steps: Math.min(config.maxSteps, steps + pending),
    leadLevel,
    rng: makeRng(randomSeed()),
    config,
    species: loadSpeciesTable(leadLevel ?? DEFAULT_LEAD_LEVEL),
  })

  const [encounter] = encounters

  if (encounter)
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
        session: sessionId,
      },
      ttlMs,
    )

  return walked
}

const accrueWorkedTime = (sessionId, now) => {
  accrueWorked(workedSince(readActivity(sessionId), now), now)
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

  accrueWorkedTime(session, now)

  switch (event) {
    case 'PreToolUse': {
      const walked = walkWhileWorking(session, now)

      noteTool(session, cwd, payload.tool_name, walked)
      break
    }

    case 'Notification':
      noteWaiting(session, cwd, payload.message)
      break

    case 'Stop': {
      const walked = walkWhileWorking(session, now)

      endTurn(session, cwd, walked)
      break
    }

    case 'SessionStart':
      pruneSessions()
      endTurn(session, cwd)
      break

    case 'SessionEnd':
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
