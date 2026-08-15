import { updateCheckMode } from '../src/config.mjs'
import { checkForUpdate, currentNotice } from '../src/node/update.mjs'
import { HEARTBEAT_MS, POLL_MS, UPDATE_POLL_MS } from './constants.mjs'
import {
  transformRequestActivity,
  transformRequestEncounter,
} from './transformers.mjs'

const encounterKey = (encounter) => {
  if (!encounter) return null

  return `${encounter.at}:${encounter.seed}`
}

const activityKey = (activity) => {
  return `${activity.state}:${activity.tool}:${activity.sessions}`
}

const noticeKey = (notice) => {
  if (!notice) return null

  return `${notice.kind}:${notice.version}`
}

export const createWatch = ({ game, hub, ask = checkForUpdate }) => {
  let lastEncounter = encounterKey(game.readCurrentEncounter())
  let lastActivity = activityKey(game.readActivity())
  let lastNotice = noticeKey(currentNotice())
  const timers = []

  const pollEncounter = () => {
    const encounter = game.readCurrentEncounter()
    const key = encounterKey(encounter)

    if (key === lastEncounter) return

    lastEncounter = key

    hub.broadcast('encounter', transformRequestEncounter(encounter))
  }

  const pollActivity = () => {
    const activity = game.readActivity()
    const key = activityKey(activity)

    if (key === lastActivity) return

    lastActivity = key

    hub.broadcast('activity', transformRequestActivity(activity))
  }

  const announceNotice = () => {
    const notice = currentNotice()
    const key = noticeKey(notice)

    if (key === lastNotice) return

    lastNotice = key

    hub.broadcast('notice', notice)
  }

  const pollNotice = async (atLaunch = false) => {
    const config = game.currentConfig()

    try {
      await ask({
        config,
        force: atLaunch && updateCheckMode(config) === 'launch',
      })
    } catch {}

    announceNotice()
  }

  const poll = () => {
    if (hub.size() === 0) return

    pollEncounter()
    pollActivity()
  }

  const start = () => {
    timers.push(setInterval(poll, POLL_MS))
    timers.push(setInterval(game.heartbeat, HEARTBEAT_MS))
    timers.push(setInterval(pollNotice, UPDATE_POLL_MS))

    for (const timer of timers) timer.unref()

    pollNotice(true)

    return timers
  }

  const stop = () => {
    for (const timer of timers) clearInterval(timer)

    timers.length = 0
  }

  return { start, stop, poll, pollNotice }
}
