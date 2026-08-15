import { expect, test, vi } from 'vitest'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { useSandboxHome } from './sandboxHome.mjs'

const sandbox = useSandboxHome('claudemon-update-')

const { DEFAULT_CONFIG } = await import('../src/constants.mjs')
const { CHECK_INTERVAL_MS, SHIM_MARKER, UPDATE_FAILURE_MESSAGES } =
  await import('../src/node/constants.mjs')
const {
  MANIFEST_URL,
  checkForUpdate,
  createUpdateRun,
  dueForCheck,
  fetchLatestVersion,
  readUpdateState,
  updatePlan,
} = await import('../src/node/update.mjs')
const { compareVersions, isNewer, updateNotice } =
  await import('../src/version.mjs')
const { VERSION, installedVersions, isPluginCopy, newestInstalled, versionAt } =
  await import('../src/node/version.mjs')
const { updateCheckMode } = await import('../src/config.mjs')
const { pointsElsewhere, relinkLaunchers, shimSource } =
  await import('../src/node/shim.mjs')

const servingVersion = (version) => {
  return vi.fn(async () => {
    return {
      ok: true,
      text: async () => JSON.stringify({ name: 'claudemon', version }),
    }
  })
}

const refusing = () => {
  return vi.fn(async () => {
    throw new Error('ECONNREFUSED')
  })
}

const askedTheManifest = () => {
  return [
    MANIFEST_URL,
    expect.objectContaining({ headers: { accept: 'application/json' } }),
  ]
}

const fakeCache = (...versions) => {
  const cache = mkdtempSync(join(tmpdir(), 'claudemon-cache-'))

  for (const version of versions)
    mkdirSync(join(cache, version), { recursive: true })

  return cache
}

const updateFile = (name) => join(sandbox, `${name}.json`)

const stepNamed = (id, index) => {
  return {
    id,
    label: `doing ${id}`,
    done: `did ${id}`,
    plan: () => ({ command: 'true', args: [id], timeoutMs: 1000, index }),
  }
}

const ranSteps = (exec) => exec.mock.calls.map(([step]) => step.args[0])

const CACHE = '/home/someone/.claude/plugins/cache/claudemon/claudemon'

const launcherInstalledFrom = (root) => {
  return `#!/bin/sh\n# ${SHIM_MARKER} — rerun it rather than editing this.\napp="${root}"\n`
}

test('Should compare versions by number and not as strings', () => {
  expect(compareVersions('0.10.0', '0.9.0'), '10 is past 9').toBeGreaterThan(0)
  expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0)
  expect(compareVersions('0.5.0', '0.5.0')).toBe(0)
  expect(compareVersions('0.5.0', '0.6.0')).toBeLessThan(0)
})

test('Should read a shorter version as the same as one padded with zeroes', () => {
  expect(compareVersions('1', '1.0.0')).toBe(0)
  expect(compareVersions('1.2', '1.2.0')).toBe(0)
  expect(compareVersions('1.2.1', '1.2')).toBeGreaterThan(0)
})

test('Should compare nonsense in a version as zero rather than throwing', () => {
  expect(compareVersions('', '')).toBe(0)
  expect(compareVersions(undefined, null)).toBe(0)
  expect(compareVersions('0.x.0', '0.0.0')).toBe(0)
})

test('Should call nothing newer than an unknown version, in either direction', () => {
  expect(isNewer(null, '0.5.0')).toBe(false)
  expect(isNewer('0.6.0', null)).toBe(false)
  expect(isNewer('0.6.0', '0.5.0')).toBe(true)
  expect(isNewer('0.5.0', '0.5.0')).toBe(false)
})

test('Should know its own version, and it is the manifest that says so', () => {
  const path = fileURLToPath(
    new URL('../.claude-plugin/plugin.json', import.meta.url),
  )

  expect(VERSION).toBe(JSON.parse(readFileSync(path, 'utf8')).version)
  expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/)
})

test('Should give a directory with no manifest no version, rather than a made-up one', () => {
  expect(versionAt(sandbox)).toBeNull()
})

test('Should list the installed copies newest first', () => {
  const cache = fakeCache('0.5.0', '0.10.0', '0.9.0')

  expect(installedVersions(cache)).toEqual(['0.10.0', '0.9.0', '0.5.0'])
  expect(newestInstalled(cache)).toBe('0.10.0')
})

test('Should ignore anything in the cache that is not a version', () => {
  expect(installedVersions(fakeCache('0.5.0', 'scratch', '.tmp'))).toEqual([
    '0.5.0',
  ])
})

test('Should read a missing cache as no copies rather than an error', () => {
  expect(installedVersions(join(sandbox, 'nothing-here'))).toEqual([])
  expect(newestInstalled(join(sandbox, 'nothing-here'))).toBeNull()
})

test('Should call a copy inside the plugin cache a plugin, and anything else a clone', () => {
  expect(isPluginCopy(`${CACHE}/0.5.0`, CACHE)).toBe(true)
  expect(isPluginCopy(CACHE, CACHE)).toBe(true)
  expect(isPluginCopy('/home/someone/code/claudemon', CACHE)).toBe(false)
  expect(isPluginCopy(`${CACHE}-old/0.5.0`, CACHE)).toBe(false)
})

test('Should recognise a plugin copy whatever the path separator', () => {
  const cache =
    'C:\\Users\\someone\\.claude\\plugins\\cache\\claudemon\\claudemon'

  expect(isPluginCopy(`${cache}\\0.5.0`, cache)).toBe(true)
  expect(isPluginCopy(`${cache}/0.5.0`, cache)).toBe(true)
  expect(isPluginCopy(`${cache}-old\\0.5.0`, cache)).toBe(false)
})

test('Should call a check due when there has never been one', () => {
  expect(dueForCheck({})).toBe(true)
  expect(dueForCheck({ checkedAt: 'not a date' })).toBe(true)
})

test('Should not call a check due again for a day', () => {
  const now = Date.parse('2026-03-01T12:00:00.000Z')
  const state = { checkedAt: new Date(now).toISOString() }

  expect(dueForCheck(state, now + 60_000)).toBe(false)
  expect(dueForCheck(state, now + CHECK_INTERVAL_MS - 1000)).toBe(false)
  expect(dueForCheck(state, now + CHECK_INTERVAL_MS)).toBe(true)
})

test('Should count a stamp from the future as due', () => {
  const now = Date.parse('2026-03-01T12:00:00.000Z')
  const state = {
    checkedAt: new Date(now + CHECK_INTERVAL_MS * 10).toISOString(),
  }

  expect(dueForCheck(state, now)).toBe(true)
})

test('Should record what a check found, and not ask again the same day', async () => {
  const file = updateFile('found')
  const now = Date.parse('2026-03-01T12:00:00.000Z')
  const fetchImpl = servingVersion('9.9.9')

  const first = await checkForUpdate({
    config: DEFAULT_CONFIG,
    now,
    file,
    fetchImpl,
  })

  expect(first.latest).toBe('9.9.9')
  expect(fetchImpl).toHaveBeenCalledTimes(1)
  expect(fetchImpl).toHaveBeenCalledWith(...askedTheManifest())
  expect(readUpdateState(file).latest).toBe('9.9.9')

  const second = await checkForUpdate({
    config: DEFAULT_CONFIG,
    now: now + 60_000,
    file,
    fetchImpl,
  })

  expect(second.latest).toBe('9.9.9')
  expect(fetchImpl, 'the cached answer was reused').toHaveBeenCalledTimes(1)

  await checkForUpdate({
    config: DEFAULT_CONFIG,
    now: now + CHECK_INTERVAL_MS,
    file,
    fetchImpl,
  })

  expect(fetchImpl, 'a day later it asked again').toHaveBeenCalledTimes(2)
})

test('Should read the three modes off the disk, and treat anything else as the default', () => {
  expect(updateCheckMode(DEFAULT_CONFIG)).toBe('daily')
  expect(updateCheckMode({ updateCheck: true })).toBe('daily')
  expect(updateCheckMode({ updateCheck: 'launch' })).toBe('launch')
  expect(updateCheckMode({ updateCheck: false })).toBe('off')
  expect(updateCheckMode({ updateCheck: 'yes' })).toBe('daily')
  expect(updateCheckMode({})).toBe('daily')
  expect(updateCheckMode()).toBe('daily')
})

test('Should ask again on a forced check even though the last one was minutes ago', async () => {
  const file = updateFile('forced')
  const now = Date.parse('2026-03-01T12:00:00.000Z')
  const fetchImpl = servingVersion('9.9.9')
  const config = { ...DEFAULT_CONFIG, updateCheck: 'launch' }

  await checkForUpdate({ config, now, file, fetchImpl })

  expect(fetchImpl).toHaveBeenCalledTimes(1)

  const again = await checkForUpdate({
    config,
    now: now + 60_000,
    file,
    fetchImpl,
    force: true,
  })

  expect(
    fetchImpl,
    'it asked again rather than reading the cache',
  ).toHaveBeenCalledTimes(2)
  expect(again.latest).toBe('9.9.9')
  expect(again.checkedAt, 'and the stamp moved with it').toBe(
    new Date(now + 60_000).toISOString(),
  )
})

test('Should never ask when the check is switched off, not even when it is forced', async () => {
  const file = updateFile('off')
  const fetchImpl = servingVersion('9.9.9')
  const config = { ...DEFAULT_CONFIG, updateCheck: false }

  const nothing = await checkForUpdate({ config, file, fetchImpl })

  expect(nothing, 'nothing was learned').toBeNull()
  expect(existsSync(file), 'and nothing was written').toBe(false)

  writeFileSync(
    file,
    JSON.stringify({
      checkedAt: '2026-03-01T12:00:00.000Z',
      latest: '9.9.9',
      error: null,
    }),
  )

  const cached = await checkForUpdate({ config, file, fetchImpl, force: true })

  expect(cached.latest, 'the cache still answers').toBe('9.9.9')
  expect(fetchImpl).not.toHaveBeenCalled()
})

test('Should remember a failed check so it is not retried every launch', async () => {
  const file = updateFile('refused')
  const now = Date.parse('2026-03-01T12:00:00.000Z')
  const fetchImpl = refusing()

  const state = await checkForUpdate({
    config: DEFAULT_CONFIG,
    now,
    file,
    fetchImpl,
  })

  expect(fetchImpl).toHaveBeenCalledTimes(1)
  expect(fetchImpl).toHaveBeenCalledWith(...askedTheManifest())
  expect(state.error).toMatch(/ECONNREFUSED/)
  expect(state.checkedAt).toBe(new Date(now).toISOString())
  expect(dueForCheck(readUpdateState(file), now + 60_000)).toBe(false)
})

test('Should not unlearn what the last check found when a check fails', async () => {
  const file = updateFile('keeps')
  const now = Date.parse('2026-03-01T12:00:00.000Z')

  await checkForUpdate({
    config: DEFAULT_CONFIG,
    now,
    file,
    fetchImpl: servingVersion('9.9.9'),
  })

  const after = await checkForUpdate({
    config: DEFAULT_CONFIG,
    now: now + CHECK_INTERVAL_MS,
    file,
    fetchImpl: refusing(),
  })

  expect(
    after.latest,
    'still the newest version anyone here has heard of',
  ).toBe('9.9.9')
  expect(after.error).toMatch(/ECONNREFUSED/)
})

test('Should fail rather than name a version when the manifest is not one', async () => {
  const withoutVersion = vi.fn(async () => {
    return { ok: true, text: async () => '{"name":"claudemon"}' }
  })
  const notFound = vi.fn(async () => {
    return { ok: false, status: 404 }
  })
  const notJson = vi.fn(async () => {
    return { ok: true, text: async () => 'not json' }
  })

  await expect(
    fetchLatestVersion({ fetchImpl: withoutVersion }),
  ).rejects.toThrow(/no version/)
  await expect(fetchLatestVersion({ fetchImpl: notFound })).rejects.toThrow(
    /404/,
  )
  await expect(fetchLatestVersion({ fetchImpl: notJson })).rejects.toThrow()

  expect(withoutVersion).toHaveBeenCalledWith(...askedTheManifest())
  expect(notFound).toHaveBeenCalledTimes(1)
  expect(notJson).toHaveBeenCalledTimes(1)
})

test('Should treat a corrupt cache file as never having checked', () => {
  const file = updateFile('corrupt')

  writeFileSync(file, '{ this is not json')

  expect(readUpdateState(file), 'an unreadable file is no state').toBeNull()
  expect(dueForCheck(readUpdateState(file))).toBe(true)
})

test('Should not take the tab down with a check that blows up', async () => {
  const exploding = vi.fn(() => {
    throw new TypeError('fetch is not a function')
  })

  const state = await checkForUpdate({
    config: DEFAULT_CONFIG,
    file: updateFile('exploding'),
    fetchImpl: exploding,
  })

  expect(exploding).toHaveBeenCalledTimes(1)
  expect(state.error).toMatch(/not a function/)
})

test('Should say nothing when this is the newest claudemon there is', () => {
  expect(
    updateNotice({ current: '0.6.0', installed: '0.6.0', latest: '0.6.0' }),
  ).toBeNull()
  expect(
    updateNotice({ current: '0.6.0', installed: '0.5.0', latest: '0.5.0' }),
  ).toBeNull()
  expect(updateNotice({ current: '0.6.0' })).toBeNull()
})

test('Should ask for a relaunch, not an update, when a newer copy is already on the disk', () => {
  expect(
    updateNotice({ current: '0.5.0', installed: '0.6.0', latest: '0.6.0' }),
  ).toEqual({ kind: 'stale', version: '0.6.0' })
})

test('Should offer the version nobody here has', () => {
  expect(
    updateNotice({ current: '0.5.0', installed: '0.5.0', latest: '0.6.0' }),
  ).toEqual({ kind: 'available', version: '0.6.0' })
})

test('Should let a copy on the disk beat a version on the internet', () => {
  expect(
    updateNotice({ current: '0.5.0', installed: '0.6.0', latest: '0.7.0' }),
  ).toEqual({ kind: 'stale', version: '0.6.0' })
})

test('Should update an installed plugin through Claude Code', () => {
  const cache = fakeCache('0.5.0')
  const plan = updatePlan({ root: join(cache, '0.5.0'), cache })

  expect(plan.kind).toBe('plugin')
  expect(plan.steps.map((step) => step.id)).toEqual([
    'marketplace',
    'plugin',
    'install',
  ])

  const [marketplace, plugin] = plan.steps.map((step) => step.plan())

  expect(marketplace.command).toBe('claude')
  expect(marketplace.args).toEqual([
    'plugin',
    'marketplace',
    'update',
    'claudemon',
  ])
  expect(plugin.args).toEqual(['plugin', 'update', 'claudemon@claudemon'])
})

test('Should run the installer that came with the copy just fetched', () => {
  const cache = fakeCache('0.5.0')
  const plan = updatePlan({ root: join(cache, '0.5.0'), cache })
  const install = plan.steps.find((step) => step.id === 'install')

  mkdirSync(join(cache, '0.6.0'), { recursive: true })

  expect(install.plan().args[0]).toBe(
    join(cache, '0.6.0', 'tools', 'install.mjs'),
  )
  expect(plan.resolveVersion()).toBe('0.6.0')
})

test('Should update a clone with git, and report its own manifest', () => {
  const clone = mkdtempSync(join(tmpdir(), 'claudemon-clone-'))

  mkdirSync(join(clone, '.claude-plugin'), { recursive: true })
  writeFileSync(
    join(clone, '.claude-plugin', 'plugin.json'),
    '{"version":"1.2.3"}',
  )

  const plan = updatePlan({ root: clone, cache: fakeCache('0.5.0') })

  expect(plan.kind).toBe('clone')
  expect(plan.steps.map((step) => step.id)).toEqual(['pull', 'install'])
  expect(plan.steps[0].plan().args).toEqual(['-C', clone, 'pull', '--ff-only'])
  expect(plan.steps[1].plan().args[0]).toBe(join(clone, 'tools', 'install.mjs'))
  expect(plan.resolveVersion()).toBe('1.2.3')
})

test('Should run every step in order, and read the version it left behind off the disk', async () => {
  const exec = vi.fn(async () => {
    return { ok: true, output: '' }
  })
  const run = createUpdateRun({
    plan: {
      kind: 'plugin',
      steps: ['one', 'two', 'three'].map(stepNamed),
      resolveVersion: () => '0.6.0',
    },
    exec,
  })

  await run.promise

  expect(ranSteps(exec)).toEqual(['one', 'two', 'three'])
  expect(run.steps.map((step) => step.status)).toEqual(['ok', 'ok', 'ok'])
  expect(run.state).toBe('done')
  expect(run.from).toBe(VERSION)
  expect(run.to).toBe('0.6.0')
})

test('Should stop the steps that come after a failure', async () => {
  const exec = vi.fn(async (step) => {
    if (step.args[0] === 'two')
      return { ok: false, output: 'boom\nno such marketplace' }

    return { ok: true, output: '' }
  })
  const run = createUpdateRun({
    plan: {
      kind: 'plugin',
      steps: ['one', 'two', 'three'].map(stepNamed),
      resolveVersion: () => '0.6.0',
    },
    exec,
  })

  await run.promise

  expect(ranSteps(exec), 'the third was never attempted').toEqual([
    'one',
    'two',
  ])
  expect(run.steps.map((step) => step.status)).toEqual([
    'ok',
    'failed',
    'pending',
  ])
  expect(run.state).toBe('failed')
  expect(run.steps[1].detail).toBe('no such marketplace')
  expect(run.to, 'nothing claims a new version').toBeNull()
})

test('Should say which command is missing rather than that a step failed', async () => {
  const missingClaude = createUpdateRun({
    plan: {
      kind: 'plugin',
      steps: [{ id: 'plugin', label: 'x', done: 'x', plan: () => ({}) }],
      resolveVersion: () => null,
    },
    exec: async () => {
      return { ok: false, missing: true, output: '' }
    },
  })
  const missingGit = createUpdateRun({
    plan: {
      kind: 'clone',
      steps: [{ id: 'pull', label: 'x', done: 'x', plan: () => ({}) }],
      resolveVersion: () => null,
    },
    exec: async () => {
      return { ok: false, missing: true, output: '' }
    },
  })

  await missingClaude.promise
  await missingGit.promise

  expect(missingClaude.steps[0].detail).toBe(UPDATE_FAILURE_MESSAGES.noClaude)
  expect(missingGit.steps[0].detail).toBe(UPDATE_FAILURE_MESSAGES.noGit)
})

test('Should say a step was given up on when it took too long', async () => {
  const late = createUpdateRun({
    plan: {
      kind: 'clone',
      steps: [{ id: 'pull', label: 'x', done: 'x', plan: () => ({}) }],
      resolveVersion: () => null,
    },
    exec: async () => {
      return { ok: false, timedOut: true, output: '' }
    },
  })

  await late.promise

  expect(late.steps[0].detail).toBe(UPDATE_FAILURE_MESSAGES.timedOut)
  expect(late.state).toBe('failed')
})

test('Should make an exec that throws a failed step rather than a crash', async () => {
  const run = createUpdateRun({
    plan: {
      kind: 'plugin',
      steps: [{ id: 'one', label: 'x', done: 'x', plan: () => ({}) }],
      resolveVersion: () => null,
    },
    exec: async () => {
      throw new Error('spawn EACCES')
    },
  })

  await run.promise

  expect(run.state).toBe('failed')
  expect(run.steps[0].detail).toMatch(/EACCES/)
})

test('Should report progress as it happens, not only at the end', async () => {
  const exec = vi.fn(async () => {
    return { ok: true, output: '' }
  })
  const seen = []
  const handleChange = (current) => {
    seen.push(current.steps.map((step) => step.status).join(','))
  }
  const run = createUpdateRun({
    plan: {
      kind: 'plugin',
      steps: ['one', 'two', 'three'].map(stepNamed),
      resolveVersion: () => '0.6.0',
    },
    exec,
    onChange: handleChange,
  })

  await run.promise

  expect(seen, 'the first step announced itself').toContain(
    'running,pending,pending',
  )
  expect(seen, 'and the last one did too').toContain('ok,ok,ok')
})

test('Should name the copy that wrote a launcher, and fall back when it is gone', () => {
  const shim = shimSource({
    target: 'bin/claudemon',
    root: `${CACHE}/0.6.0`,
    cache: CACHE,
  })

  expect(shim).toMatch(/^#!\/bin\/sh/)
  expect(shim, 'the exact copy, not a guess').toContain(`app="${CACHE}/0.6.0"`)
  expect(shim, 'and a last resort behind it').toMatch(
    /\[ -d "\$app" \] \|\| app=\$\(ls -td/,
  )
  expect(shim).toContain('exec "$app/bin/claudemon" "$@"')
})

test('Should make every launcher refuse to run rather than guess, and say how to fix it', () => {
  for (const root of [`${CACHE}/0.6.0`, '/home/someone/code/claudemon']) {
    const shim = shimSource({
      target: 'scripts/run.sh',
      args: 'statusline.mjs',
      root,
      cache: CACHE,
    })

    expect(shim).toContain('cannot find its files')
    expect(shim).toContain('claudemon-setup')
    expect(shim).toContain('exec "$app/scripts/run.sh" statusline.mjs "$@"')
  }
})

test('Should count a launcher on an older release as one to bring up to date', () => {
  const here = `${CACHE}/0.6.0`

  expect(
    pointsElsewhere(launcherInstalledFrom(`${CACHE}/0.5.0`), here, CACHE),
  ).toBe(true)
  expect(
    pointsElsewhere(launcherInstalledFrom(here), here, CACHE),
    'already here',
  ).toBe(false)
})

test('Should never touch a launcher we did not write, whatever it says', () => {
  const theirs = `#!/bin/sh\napp="${CACHE}/0.5.0"\nexec "$app/bin/claudemon" "$@"\n`

  expect(
    pointsElsewhere(theirs, `${CACHE}/0.6.0`, CACHE),
    'no marker, not ours',
  ).toBe(false)
})

test('Should give an exact path to a launcher that only guesses', () => {
  const guessing = `#!/bin/sh\n# ${SHIM_MARKER}\napp=$(ls -td "${CACHE}"/*/ | head -1)\n`

  expect(pointsElsewhere(guessing, `${CACHE}/0.6.0`, CACHE)).toBe(true)
})

test('Should point a launcher stuck on an older release at this one', () => {
  const cache = fakeCache('0.5.0', '0.6.0')
  const path = join(sandbox, 'stuck-launcher')
  const here = join(cache, '0.6.0')

  writeFileSync(path, launcherInstalledFrom(join(cache, '0.5.0')))

  const rewritten = relinkLaunchers({
    root: here,
    cache,
    launchers: [{ path, target: 'bin/claudemon' }],
  })

  expect(rewritten).toEqual([path])

  const after = readFileSync(path, 'utf8')

  expect(after, 'it names the copy that fixed it').toContain(`app="${here}"`)
  expect(after, 'and no longer the one that installed it').not.toMatch(
    /0\.5\.0"/,
  )
})

test('Should do nothing the second time the same launcher is relinked', () => {
  const cache = fakeCache('0.5.0', '0.6.0')
  const path = join(sandbox, 'twice-launcher')
  const launchers = [{ path, target: 'bin/claudemon' }]

  writeFileSync(path, launcherInstalledFrom(join(cache, '0.5.0')))

  expect(
    relinkLaunchers({ root: join(cache, '0.6.0'), cache, launchers }),
  ).toEqual([path])
  expect(
    relinkLaunchers({ root: join(cache, '0.6.0'), cache, launchers }),
  ).toEqual([])
})

test("Should leave a clone's launcher alone, because it is meant to win", () => {
  const cache = fakeCache('0.6.0')
  const path = join(sandbox, 'clone-launcher')

  writeFileSync(
    path,
    shimSource({
      target: 'bin/claudemon',
      root: '/home/someone/code/claudemon',
      cache,
    }),
  )

  const before = readFileSync(path, 'utf8')

  expect(
    relinkLaunchers({
      root: join(cache, '0.6.0'),
      cache,
      launchers: [{ path, target: 'bin/claudemon' }],
    }),
  ).toEqual([])
  expect(readFileSync(path, 'utf8'), 'untouched').toBe(before)
})

test('Should not create a launcher that was never installed', () => {
  const missing = join(sandbox, 'no-such-launcher')

  expect(
    relinkLaunchers({
      root: join(CACHE, '0.6.0'),
      cache: CACHE,
      launchers: [{ path: missing, target: 'bin/claudemon' }],
    }),
  ).toEqual([])
  expect(existsSync(missing)).toBe(false)
})
