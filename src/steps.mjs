import { readFileSync } from 'node:fs'
import { writeFileAtomic } from './atomicWrite.mjs'
import { EMPTY_STEPS, STEP_POOL_LIMIT, STEPS_VERSION } from './constants.mjs'
import { stepsWhileWorking } from './encounter.mjs'
import { withLock } from './lock.mjs'
import { logError } from './log.mjs'
import { STEPS_FILE, STEPS_LOCK_FILE } from './paths.mjs'
import {
  transformRequestWriteSteps,
  transformResponseSteps,
} from './transformers.mjs'

const readStepsFile = () => {
  try {
    return JSON.parse(readFileSync(STEPS_FILE, 'utf8'))
  } catch {
    return null
  }
}

export const readSteps = () => {
  const pool = transformResponseSteps(readStepsFile())

  if (!pool) return { ...EMPTY_STEPS }

  return pool
}

const writeSteps = (pool) => {
  writeFileAtomic(
    STEPS_FILE,
    JSON.stringify(
      transformRequestWriteSteps({
        v: STEPS_VERSION,
        steps: pool.steps,
        carriedMs: pool.carriedMs,
        creditedTo: pool.creditedTo,
      }),
    ),
  )

  return pool
}

const walkedSince = (pool, interval, config) => {
  if (!interval) return { steps: 0, carriedMs: pool.carriedMs }

  const from = Math.max(interval.from, pool.creditedTo)
  const elapsed = Math.max(0, interval.to - from) + pool.carriedMs
  const { steps, leftoverMs } = stepsWhileWorking(elapsed, config)

  return { steps, carriedMs: leftoverMs }
}

const creditedTo = (pool, interval) => {
  if (!interval) return pool.creditedTo

  return Math.max(pool.creditedTo, interval.to)
}

const earn = (interval, pending, config) => {
  const pool = readSteps()
  const walked = walkedSince(pool, interval, config)

  return writeSteps({
    steps: Math.min(STEP_POOL_LIMIT, pool.steps + walked.steps + pending),
    carriedMs: walked.carriedMs,
    creditedTo: creditedTo(pool, interval),
  })
}

const draw = (limit) => {
  const pool = readSteps()
  const drawn = Math.min(pool.steps, limit)

  if (drawn <= 0) return 0

  writeSteps({
    steps: pool.steps - drawn,
    carriedMs: pool.carriedMs,
    creditedTo: pool.creditedTo,
  })

  return drawn
}

export const earnSteps = ({ interval, pending, config }) => {
  try {
    return withLock(STEPS_LOCK_FILE, () => earn(interval, pending, config))
  } catch (error) {
    logError('steps', error)

    return null
  }
}

export const drawSteps = (limit) => {
  try {
    return withLock(STEPS_LOCK_FILE, () => draw(limit))
  } catch (error) {
    logError('steps', error)

    return 0
  }
}
