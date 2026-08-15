import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CHECK_INTERVAL_MS,
  DEFAULT_MANIFEST_URL,
  FETCH_TIMEOUT_MS,
  UPDATE_DETAIL_LIMIT,
  UPDATE_FAILURE_MESSAGES,
  UPDATE_STEP_TEXT,
  UPDATE_STEP_TIMEOUTS,
} from './constants.mjs'
import { updateCheckMode } from '../config.mjs'
import { HOME, PLUGIN_CACHE, UPDATE_FILE } from './paths.mjs'
import {
  transformRequestWriteUpdateState,
  transformResponseManifest,
  transformResponseUpdateState,
} from '../transformers.mjs'
import { updateNotice } from '../version.mjs'
import {
  APP_ROOT,
  VERSION,
  isPluginCopy,
  newestInstalled,
  versionAt,
} from './version.mjs'

export const MANIFEST_URL =
  process.env.CLAUDEMON_MANIFEST_URL || DEFAULT_MANIFEST_URL

const readUpdateFile = (file) => {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))

    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export const readUpdateState = (file = UPDATE_FILE) => {
  return transformResponseUpdateState(readUpdateFile(file))
}

const writeUpdateState = (state, file = UPDATE_FILE) => {
  try {
    mkdirSync(HOME, { recursive: true })

    const payload = JSON.stringify(
      transformRequestWriteUpdateState(state),
      null,
      2,
    )

    writeFileSync(file, `${payload}\n`)
  } catch {}
}

export const dueForCheck = (
  state,
  now = Date.now(),
  interval = CHECK_INTERVAL_MS,
) => {
  const last = Date.parse(state?.checkedAt)

  if (!Number.isFinite(last)) return true
  if (last > now) return true

  return now - last >= interval
}

export const fetchLatestVersion = async ({
  url = MANIFEST_URL,
  timeoutMs = FETCH_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
}) => {
  if (typeof fetchImpl !== 'function') throw new Error('no fetch available')

  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json' },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const manifest = transformResponseManifest(JSON.parse(await response.text()))

  if (typeof manifest?.version !== 'string' || !manifest.version)
    throw new Error('no version in the manifest')

  return manifest.version
}

export const checkForUpdate = async ({
  config,
  now = Date.now(),
  file = UPDATE_FILE,
  force = false,
  url,
  timeoutMs,
  fetchImpl,
}) => {
  const state = readUpdateState(file)

  if (updateCheckMode(config) === 'off') return state
  if (!force && !dueForCheck(state, now)) return state

  const checkedAt = new Date(now).toISOString()

  try {
    const latest = await fetchLatestVersion({ url, timeoutMs, fetchImpl })
    const next = { checkedAt, latest, error: null }

    writeUpdateState(next, file)

    return next
  } catch (error) {
    const next = {
      checkedAt,
      latest: state?.latest ?? null,
      error: error?.message ?? String(error),
    }

    writeUpdateState(next, file)

    return next
  }
}

export const currentNotice = ({
  state = readUpdateState(),
  current = VERSION,
} = {}) => {
  return updateNotice({
    current,
    installed: newestInstalled(),
    latest: state?.latest ?? null,
  })
}

const pluginInstallScript = (cache) => {
  const installed = newestInstalled(cache)

  if (!installed) return join(cache, 'tools', 'install.mjs')

  return join(cache, installed, 'tools', 'install.mjs')
}

export const updatePlan = ({ root = APP_ROOT, cache = PLUGIN_CACHE } = {}) => {
  if (!isPluginCopy(root, cache)) {
    return {
      kind: 'clone',
      resolveVersion: () => versionAt(root),
      steps: [
        {
          ...UPDATE_STEP_TEXT.clonePull,
          plan: () => ({
            command: 'git',
            args: ['-C', root, 'pull', '--ff-only'],
            timeoutMs: UPDATE_STEP_TIMEOUTS.pull,
          }),
        },
        {
          ...UPDATE_STEP_TEXT.cloneInstall,
          plan: () => ({
            command: process.execPath,
            args: [join(root, 'tools', 'install.mjs')],
            timeoutMs: UPDATE_STEP_TIMEOUTS.install,
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
        ...UPDATE_STEP_TEXT.marketplace,
        plan: () => ({
          command: 'claude',
          args: ['plugin', 'marketplace', 'update', 'claudemon'],
          timeoutMs: UPDATE_STEP_TIMEOUTS.marketplace,
        }),
      },
      {
        ...UPDATE_STEP_TEXT.plugin,
        plan: () => ({
          command: 'claude',
          args: ['plugin', 'update', 'claudemon@claudemon'],
          timeoutMs: UPDATE_STEP_TIMEOUTS.plugin,
        }),
      },
      {
        ...UPDATE_STEP_TEXT.pluginInstall,
        plan: () => ({
          command: process.execPath,
          args: [pluginInstallScript(cache)],
          timeoutMs: UPDATE_STEP_TIMEOUTS.install,
        }),
      },
    ],
  }
}

const execCommand = ({ command, args, timeoutMs }) => {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { timeout: timeoutMs, encoding: 'utf8' },
      (error, stdout, stderr) => {
        const out = stdout ?? ''
        const err = stderr ?? ''
        const output = `${out}${err}`.trim()

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
      },
    )
  })
}

const explain = (step, result) => {
  if (result.missing) {
    return step.id === 'pull'
      ? UPDATE_FAILURE_MESSAGES.noGit
      : UPDATE_FAILURE_MESSAGES.noClaude
  }

  if (result.timedOut) return UPDATE_FAILURE_MESSAGES.timedOut

  const last = result.output.split('\n').filter(Boolean).pop()

  return last
    ? last.slice(0, UPDATE_DETAIL_LIMIT)
    : UPDATE_FAILURE_MESSAGES.unknown
}

const runUpdateSteps = async (run, steps, exec, onChange, resolveVersion) => {
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

  const resolved = resolveVersion()

  run.state = 'done'
  run.to = resolved ?? VERSION
  onChange(run)

  return run
}

export const createUpdateRun = ({
  plan = updatePlan(),
  exec = execCommand,
  onChange = () => {},
}) => {
  const { steps, resolveVersion, kind } = plan

  const run = {
    kind,
    state: 'running',
    from: VERSION,
    to: null,
    steps: steps.map((step) => ({
      id: step.id,
      label: step.label,
      done: step.done,
      status: 'pending',
      detail: null,
    })),
  }

  run.promise = runUpdateSteps(run, steps, exec, onChange, resolveVersion)

  return run
}
