// Noticing a new claudemon, and fetching it.
//
// This is the only thing in the game that touches the network, and it does it at
// most once a day — or once per launch, if OPTION says so — for about 300 bytes:
// the plugin manifest on the default branch, which is the same file Claude Code
// compares versions against. Nothing is sent — no identifier, no save, not even a
// version number, since a plain GET of a public file cannot carry one. OPTION also
// turns it off entirely.
//
// Applying an update is somebody else's job. `claude plugin update` already knows
// how to swap a plugin copy over, so this drives that rather than reimplementing it,
// and then reruns the installer to repair the things a plugin cannot install for
// itself — see tools/install.mjs for what those are and why.

import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { updateCheckMode } from './config.mjs'
import { HOME, PLUGIN_CACHE, UPDATE_FILE } from './paths.mjs'
import { APP_ROOT, VERSION, isNewer, isPluginCopy, newestInstalled, versionAt } from './version.mjs'

/**
 * Where the latest published version is read from.
 *
 * The manifest on the default branch rather than a release or a tag: it is what
 * `/plugin install` resolves, so it is the version somebody installing right now
 * would get. Overridable so the tests never reach the network.
 *
 * This fork's own manifest, not the one it was forked from. The point of installing
 * from a fork is that upstream cannot reach this machine without being read first —
 * and a check pointing upstream gave that away twice over. It announced a version
 * that is not in this fork and that pressing U therefore could not fetch, and it
 * told a repository nobody here installed from that somebody is running the game
 * today. What is worth knowing is whether *this* fork has moved, which is a thing
 * that only happens after upstream has been merged deliberately.
 */
export const MANIFEST_URL = process.env.CLAUDEMON_MANIFEST_URL
  || 'https://raw.githubusercontent.com/huaiyukhaw/claudemon/main/.claude-plugin/plugin.json'

/** Once a day. A toy game does not need to know sooner, and neither do you. */
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

const FETCH_TIMEOUT_MS = 5000

/**
 * The last check, as it was written to disk.
 *
 * A cache, not a setting — anything unreadable is treated as "never checked", which
 * costs one request.
 */
export function readUpdateState(file = UPDATE_FILE) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeUpdateState(state, file = UPDATE_FILE) {
  try {
    mkdirSync(HOME, { recursive: true })
    writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`)
  } catch {
    // A check that cannot cache its answer still has the answer. Failing to write
    // here means the next launch asks again, which is not worth a message about.
  }
}

/**
 * Whether it is time to look again.
 *
 * A failed check stamps `checkedAt` just as a successful one does, so a machine
 * with no network asks once a day rather than on every launch. A stamp from the
 * future — a clock that was wrong, or has been put back — counts as due, because
 * the alternative is a check that never runs again.
 */
export function dueForCheck(state, now = Date.now(), interval = CHECK_INTERVAL_MS) {
  const last = Date.parse(state?.checkedAt ?? '')
  if (!Number.isFinite(last)) return true
  if (last > now) return true
  return now - last >= interval
}

/**
 * Asks the manifest what the latest version is.
 *
 * @returns {Promise<string>} the version. Throws if it cannot be had, so the
 *   caller decides what a failure means rather than being handed a fake answer.
 */
export async function fetchLatestVersion({
  url = MANIFEST_URL,
  timeoutMs = FETCH_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('no fetch available')

  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const version = JSON.parse(await response.text())?.version
  if (typeof version !== 'string' || !version) throw new Error('no version in the manifest')
  return version
}

/**
 * Looks for a new version if it is time to, and remembers what it found.
 *
 * Never throws and never blocks anything: the game is entirely playable without an
 * answer, so a refused connection is recorded and forgotten rather than reported.
 *
 * @param {{force?: boolean}} options `force` asks now regardless of when the last
 *   check was — what UPDATE LAUNCH buys, and only ever passed once per process, on
 *   the way up. It does not override the setting being off: that is a no, not a
 *   schedule.
 * @returns {Promise<object>} the state to draw from, checked or cached.
 */
export async function checkForUpdate({
  config,
  now = Date.now(),
  file = UPDATE_FILE,
  force = false,
  ...options
} = {}) {
  const state = readUpdateState(file)

  if (updateCheckMode(config) === 'off') return state
  if (!force && !dueForCheck(state, now)) return state

  const checkedAt = new Date(now).toISOString()
  try {
    const latest = await fetchLatestVersion(options)
    const next = { checkedAt, latest }
    writeUpdateState(next, file)
    return next
  } catch (error) {
    // The version last seen is kept: a check that failed today does not unlearn
    // what yesterday's found.
    const next = { ...state, checkedAt, error: error?.message ?? String(error) }
    writeUpdateState(next, file)
    return next
  }
}

/**
 * What, if anything, the home screen should say about versions.
 *
 * Two different things can be out of date, and they need different sentences:
 *
 *   - `stale` — a newer copy is already on the disk. Nothing to fetch; this tab is
 *     just still running the old one, because a process cannot swap its own code
 *     out from under itself. Quitting fixes it.
 *   - `available` — the check saw a version nobody here has. That is the one worth
 *     offering a keypress for.
 *
 * A newer copy on disk wins when both are true: it is the cheaper fix, and running
 * the update from stale code is the more surprising of the two.
 *
 * @returns {{kind: string, version: string}|null}
 */
export function updateNotice({ current = VERSION, installed = null, latest = null } = {}) {
  if (isNewer(installed, current)) return { kind: 'stale', version: installed }
  if (isNewer(latest, current)) return { kind: 'available', version: latest }
  return null
}

/** The notice for right now, reading both the disk and the last check. */
export function currentNotice({ state = readUpdateState(), current = VERSION } = {}) {
  return updateNotice({ current, installed: newestInstalled(), latest: state?.latest ?? null })
}

/**
 * The commands an update is, in the order they have to happen, and where to read
 * the version they leave behind.
 *
 * Each step is a thunk rather than a fixed command line, because the last one's path
 * does not exist yet when the plan is made: it lives in the copy the step before it
 * downloads.
 */
export function updatePlan({ root = APP_ROOT, cache = PLUGIN_CACHE } = {}) {
  // A clone is not something `claude plugin update` can help with — it would fetch
  // into the plugin cache while the launcher carried on preferring the clone, so the
  // update would appear to do nothing at all.
  if (!isPluginCopy(root, cache)) {
    return {
      kind: 'clone',
      // The clone is what the launcher runs, so its own manifest is the answer.
      resolveVersion: () => versionAt(root),
      steps: [
        {
          id: 'pull',
          label: 'pulling the latest commit',
          done: 'pulled the latest commit',
          plan: () => ({ command: 'git', args: ['-C', root, 'pull', '--ff-only'], timeoutMs: 60_000 }),
        },
        {
          id: 'install',
          label: 'reinstalling from the clone',
          done: 'the command, status line and sprites are up to date',
          plan: () => ({
            command: process.execPath,
            args: [join(root, 'tools', 'install.mjs')],
            timeoutMs: 180_000,
          }),
        },
      ],
    }
  }

  return {
    kind: 'plugin',
    resolveVersion: () => newestInstalled(cache),
    steps: [
      {
        id: 'marketplace',
        label: 'refreshing the marketplace',
        done: 'refreshed the marketplace',
        plan: () => ({
          command: 'claude',
          args: ['plugin', 'marketplace', 'update', 'claudemon'],
          timeoutMs: 60_000,
        }),
      },
      {
        id: 'plugin',
        label: 'fetching the new version',
        done: 'fetched the new version',
        plan: () => ({
          command: 'claude',
          args: ['plugin', 'update', 'claudemon@claudemon'],
          timeoutMs: 120_000,
        }),
      },
      {
        // The plugin is in place, but the things around it are not the plugin's to
        // install — see tools/install.mjs — and a new release is exactly when one of
        // them might have changed. The installer is idempotent, so this is a repair
        // rather than a reinstall. It runs from the copy just fetched, so a new
        // version installs itself its own way.
        id: 'install',
        label: 'checking the command, status line and sprites',
        done: 'the command, status line and sprites are up to date',
        plan: () => ({
          command: process.execPath,
          args: [join(cache, newestInstalled(cache) ?? '', 'tools', 'install.mjs')],
          timeoutMs: 180_000,
        }),
      },
    ],
  }
}

/** Runs a command for its exit status, keeping its output for a failure message. */
function execCommand({ command, args, timeoutMs }) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: timeoutMs, encoding: 'utf8' }, (error, stdout, stderr) => {
      const output = `${stdout ?? ''}${stderr ?? ''}`.trim()
      if (!error) {
        resolve({ ok: true, output })
        return
      }
      resolve({
        ok: false,
        output,
        missing: error.code === 'ENOENT',
        timedOut: error.signal === 'SIGTERM',
      })
    })
  })
}

/** The one line a failed step gets on screen. */
function explain(step, result) {
  if (result.missing) {
    return step.id === 'pull'
      ? 'no `git` command found'
      : 'no `claude` command found — is Claude Code on your PATH?'
  }
  if (result.timedOut) return 'it took too long and was given up on'

  const last = result.output.split('\n').filter(Boolean).pop()
  return last ? last.slice(0, 120) : 'it failed without saying why'
}

/**
 * An update in progress, as something a screen can draw.
 *
 * Steps stop at the first failure. Every one of them is a prerequisite for the next,
 * so carrying on would only turn one honest error into three confusing ones.
 *
 * @param {{plan?: object, exec?: Function, onChange?: Function}} options
 */
export function createUpdateRun({
  plan = updatePlan(),
  exec = execCommand,
  onChange = () => {},
} = {}) {
  const { steps, resolveVersion, kind } = plan

  const run = {
    kind,
    /** 'running' until every step has been tried, then 'done' or 'failed'. */
    state: 'running',
    from: VERSION,
    /**
     * What a relaunch would run, once it is over. Read from the disk rather than
     * from whatever the check reported: the point of this screen is to say what
     * actually happened, and a step can succeed while leaving the version alone.
     */
    to: null,
    steps: steps.map((step) => ({
      id: step.id,
      label: step.label,
      done: step.done,
      status: 'pending',
      detail: null,
    })),
  }

  run.promise = (async () => {
    for (let index = 0; index < steps.length; index++) {
      const shown = run.steps[index]
      shown.status = 'running'
      onChange(run)

      let result
      try {
        result = await exec(steps[index].plan())
      } catch (error) {
        result = { ok: false, output: error?.message ?? String(error) }
      }

      if (!result.ok) {
        shown.status = 'failed'
        shown.detail = explain(steps[index], result)
        run.state = 'failed'
        onChange(run)
        return run
      }

      shown.status = 'ok'
      onChange(run)
    }

    run.state = 'done'
    run.to = resolveVersion() ?? VERSION
    onChange(run)
    return run
  })()

  return run
}
