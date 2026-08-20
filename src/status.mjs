import { readFileSync } from 'node:fs'
import { writeFileAtomic } from './atomicWrite.mjs'
import { HEARTBEAT_STALE_MS } from './constants.mjs'
import { logError } from './log.mjs'
import { STATUS_FILE } from './paths.mjs'
import {
  transformRequestWriteStatus,
  transformResponseStatus,
} from './transformers.mjs'

const readStatusFile = () => {
  try {
    return JSON.parse(readFileSync(STATUS_FILE, 'utf8'))
  } catch {
    return null
  }
}

export const readStatus = () => transformResponseStatus(readStatusFile())

export const writeStatus = ({ lead, balls, money, caught }) => {
  try {
    writeFileAtomic(
      STATUS_FILE,
      JSON.stringify(
        transformRequestWriteStatus({
          lead,
          balls,
          money,
          caught,
          heartbeat: Date.now(),
        }),
      ),
    )
  } catch (error) {
    logError('status', error)
  }
}

export const companionIsLive = (status) => {
  if (!status?.heartbeat) return false

  return Date.now() - status.heartbeat < HEARTBEAT_STALE_MS
}
