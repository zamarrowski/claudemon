import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sandbox = mkdtempSync(join(tmpdir(), 'claudemon-activity-'))

process.env.CLAUDEMON_HOME = sandbox

const { STALE_MS, WORKING_STALE_MS } = await import('../src/constants.mjs')
const {
  beginTurn,
  endSession,
  endTurn,
  isWorking,
  noteTool,
  noteWaiting,
  pruneSessions,
  readActivity,
  readSessions,
  summariseActivity,
  workingInterval,
  writeActivity,
} = await import('../src/activity.mjs')
const { stripAnsi } = await import('../src/ui/text.mjs')
const { activityRow } = await import('../src/ui/views/home.mjs')

const freshHome = () => mkdtempSync(join(tmpdir(), 'claudemon-home-'))

const writeConfig = (home, config) => {
  writeFileSync(join(home, 'config.json'), JSON.stringify(config))
}

const runHook = (home, script, payload) => {
  return execFileSync(process.execPath, [join(root, 'scripts', script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, CLAUDEMON_HOME: home },
  })
}

const runStatusLine = (home) => {
  const stdout = execFileSync(
    process.execPath,
    [join(root, 'scripts', 'statusline.mjs')],
    {
      input: '{}',
      encoding: 'utf8',
      env: { ...process.env, CLAUDEMON_HOME: home },
    },
  )

  return stripAnsi(stdout)
}

const queueIn = (home) => {
  try {
    return readFileSync(join(home, 'queue.jsonl'), 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

const sessionIn = (home, id) => {
  try {
    return JSON.parse(
      readFileSync(join(home, 'sessions', `${id}.json`), 'utf8'),
    )
  } catch {
    return null
  }
}

const rewindSession = (home, id, ms) => {
  const session = sessionIn(home, id)

  writeFileSync(
    join(home, 'sessions', `${id}.json`),
    JSON.stringify({
      ...session,
      at: session.at - ms,
      since: session.since - ms,
    }),
  )
}

const rewindLedger = (home, name, ms) => {
  const path = join(home, name)

  try {
    const ledger = JSON.parse(readFileSync(path, 'utf8'))

    writeFileSync(
      path,
      JSON.stringify({ ...ledger, creditedTo: ledger.creditedTo - ms }),
    )
  } catch {}
}

const rewindSharedClocks = (home, ms) => {
  rewindLedger(home, 'steps.json', ms)
  rewindLedger(home, 'worked.json', ms)
}

const workedIn = (home) => {
  try {
    return JSON.parse(readFileSync(join(home, 'worked.json'), 'utf8'))
  } catch {
    return null
  }
}

const stepsIn = (home) => {
  try {
    return JSON.parse(readFileSync(join(home, 'steps.json'), 'utf8'))
  } catch {
    return null
  }
}

test('Should buy the turn a walk rather than take one the instant a prompt is submitted', () => {
  const home = freshHome()

  writeConfig(home, { encounterChance: 1, trainerChance: 0 })
  runHook(home, 'on-prompt.mjs', {
    session_id: 'aaa',
    cwd: '/tmp',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'x'.repeat(120),
  })

  const session = sessionIn(home, 'aaa')

  expect(
    queueIn(home),
    'nothing appears in the same instant you press enter',
  ).toHaveLength(0)
  expect(session.pendingSteps, 'three steps, owed to the turn').toBe(3)
  expect(session.state, 'and the session is working from here on').toBe(
    'working',
  )
  expect(session.tool).toBeNull()
})

test('Should take the walk a prompt bought once Claude gets going', () => {
  const home = freshHome()

  writeConfig(home, { encounterChance: 1, trainerChance: 0 })
  runHook(home, 'on-prompt.mjs', {
    session_id: 'aaa1',
    cwd: '/tmp',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'x'.repeat(120),
  })
  runHook(home, 'on-activity.mjs', {
    session_id: 'aaa1',
    cwd: '/tmp',
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
  })

  const queued = queueIn(home)

  expect(
    queued,
    'three steps, but only ever one Pokemon in the grass',
  ).toHaveLength(1)
  expect(queued[0].name, 'and it is a real one').toBeTruthy()
  expect(queued[0].level).toBeGreaterThanOrEqual(2)
  expect(
    queued[0].session,
    'the grass is one route, not a per-session feed',
  ).toBeUndefined()
  expect(Date.parse(queued[0].at), 'stamped, so it can time out').not.toBeNaN()
  expect(
    sessionIn(home, 'aaa1').pendingSteps,
    'and the walk is spent, not owed twice',
  ).toBe(0)
})

test('Should put a whole trainer in the grass when the walk turns one up', () => {
  const home = freshHome()

  writeConfig(home, { encounterChance: 1, trainerChance: 1 })
  runHook(home, 'on-prompt.mjs', {
    session_id: 'aaa9',
    cwd: '/tmp',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'x'.repeat(120),
  })
  runHook(home, 'on-activity.mjs', {
    session_id: 'aaa9',
    cwd: '/tmp',
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
  })

  const [queued] = queueIn(home)

  expect(queued.kind).toBe('trainer')
  expect(queued.species, 'a trainer is not a species').toBeUndefined()
  expect(queued.trainer.class).toBeTruthy()
  expect(queued.trainer.name).toBeTruthy()
  expect(queued.trainer.team.length).toBeGreaterThanOrEqual(1)
  expect(queued.trainer.team[0].level).toBeGreaterThanOrEqual(2)
  expect(Date.parse(queued.at), 'stamped, so it can time out').not.toBeNaN()

  const line = runStatusLine(home)

  expect(line, 'the status line calls the trainer out').toContain(
    `${queued.trainer.name.toUpperCase()} wants to battle!`,
  )
  expect(line, 'and says how many are coming').toContain(
    `×${queued.trainer.team.length}`,
  )
})

test('Should still take the walk it bought when the turn never touches a tool', () => {
  const home = freshHome()

  writeConfig(home, { encounterChance: 1, trainerChance: 0 })
  runHook(home, 'on-prompt.mjs', {
    session_id: 'aaa4',
    cwd: '/tmp',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'x'.repeat(120),
  })
  runHook(home, 'on-activity.mjs', {
    session_id: 'aaa4',
    cwd: '/tmp',
    hook_event_name: 'Stop',
  })

  expect(queueIn(home)).toHaveLength(1)
  expect(sessionIn(home, 'aaa4').pendingSteps).toBe(0)
})

test('Should not stack a second Pokemon behind the first however many prompts arrive', () => {
  const home = freshHome()
  const submitted = {
    session_id: 'aaa2',
    cwd: '/tmp',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'x'.repeat(400),
  }
  const toolCall = {
    session_id: 'aaa2',
    cwd: '/tmp',
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
  }

  writeConfig(home, { encounterChance: 1, trainerChance: 0 })
  runHook(home, 'on-prompt.mjs', submitted)
  runHook(home, 'on-activity.mjs', toolCall)

  const first = queueIn(home)

  expect(first).toHaveLength(1)

  for (let prompt = 0; prompt < 5; prompt++) {
    runHook(home, 'on-prompt.mjs', submitted)
    runHook(home, 'on-activity.mjs', toolCall)
  }

  expect(queueIn(home), 'five more prompts changed nothing').toEqual(first)
})

test('Should replace an encounter nobody faced once it has timed out', () => {
  const home = freshHome()
  const submitted = {
    session_id: 'aaa3',
    cwd: '/tmp',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'x'.repeat(120),
  }
  const toolCall = {
    session_id: 'aaa3',
    cwd: '/tmp',
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
  }

  writeConfig(home, {
    encounterChance: 1,
    trainerChance: 0,
    encounterTtlSeconds: 30,
  })
  runHook(home, 'on-prompt.mjs', submitted)
  runHook(home, 'on-activity.mjs', toolCall)

  const [stale] = queueIn(home)

  expect(stale).toBeDefined()

  writeFileSync(
    join(home, 'queue.jsonl'),
    `${JSON.stringify({ ...stale, at: new Date(Date.now() - 31_000).toISOString() })}\n`,
  )

  runHook(home, 'on-prompt.mjs', submitted)
  runHook(home, 'on-activity.mjs', toolCall)

  const queued = queueIn(home)

  expect(queued, 'the stale entry is replaced, not queued behind').toHaveLength(
    1,
  )
  expect(queued[0].at, 'and it is a fresh encounter').not.toBe(stale.at)
})

test('Should only ever take the walk a prompt bought once', () => {
  const home = freshHome()

  writeConfig(home, { encounterChance: 1, trainerChance: 0 })
  runHook(home, 'on-prompt.mjs', {
    session_id: 'aaa5',
    cwd: '/tmp',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'x'.repeat(400),
  })
  runHook(home, 'on-activity.mjs', {
    session_id: 'aaa5',
    cwd: '/tmp',
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
  })

  expect(queueIn(home)).toHaveLength(1)

  writeFileSync(join(home, 'queue.jsonl'), '')
  runHook(home, 'on-activity.mjs', {
    session_id: 'aaa5',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
  })

  expect(queueIn(home), 'the second tool call walks nowhere').toHaveLength(0)

  runHook(home, 'on-activity.mjs', {
    session_id: 'aaa5',
    hook_event_name: 'Stop',
  })

  expect(queueIn(home), 'and neither does the end of the turn').toHaveLength(0)
})

test('Should start the turn but walk nowhere when the prompt is blank', () => {
  const home = freshHome()

  writeConfig(home, { encounterChance: 1, trainerChance: 0 })
  runHook(home, 'on-prompt.mjs', {
    session_id: 'ccc',
    cwd: '/tmp',
    hook_event_name: 'UserPromptSubmit',
    prompt: '   ',
  })
  runHook(home, 'on-activity.mjs', {
    session_id: 'ccc',
    cwd: '/tmp',
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
  })

  expect(sessionIn(home, 'ccc').state).toBe('working')
  expect(
    queueIn(home),
    'no steps bought, so the tool call has nothing to spend',
  ).toHaveLength(0)
})

test('Should say nothing on stdout, whatever the prompt', () => {
  const home = freshHome()

  writeConfig(home, { encounterChance: 1, trainerChance: 0 })

  const stdout = runHook(home, 'on-prompt.mjs', {
    session_id: 'ddd',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'x'.repeat(400),
  })

  expect(stdout).toBe('')
})

test('Should survive a payload the hook cannot make sense of', () => {
  const home = freshHome()

  for (const payload of [{}, { session_id: 'eee' }, { prompt: 42 }]) {
    expect(() => runHook(home, 'on-prompt.mjs', payload)).not.toThrow()
  }
})

test('Should record what Claude is running when a tool call comes in', () => {
  const home = freshHome()

  runHook(home, 'on-activity.mjs', {
    session_id: 'fff',
    cwd: '/tmp',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
  })

  const session = sessionIn(home, 'fff')

  expect(session.state).toBe('working')
  expect(session.tool).toBe('Bash')
})

test('Should mark the session as stuck waiting on you when a notification arrives', () => {
  const home = freshHome()

  runHook(home, 'on-activity.mjs', {
    session_id: 'ggg',
    hook_event_name: 'Notification',
    message: 'Claude needs your permission to use Bash',
  })

  const session = sessionIn(home, 'ggg')

  expect(session.state).toBe('waiting')
  expect(session.message).toMatch(/permission/)
})

test('Should end the turn and walk nowhere when a session stops without having worked', () => {
  const home = freshHome()
  const stopped = { session_id: 'hhh', hook_event_name: 'Stop' }

  writeConfig(home, {
    encounterChance: 1,
    trainerChance: 0,
    workStepSeconds: 20,
  })
  runHook(home, 'on-activity.mjs', stopped)

  expect(sessionIn(home, 'hhh').state).toBe('idle')
  expect(queueIn(home)).toHaveLength(0)

  runHook(home, 'on-activity.mjs', stopped)

  expect(
    queueIn(home),
    'an idle session walks nowhere however often it stops',
  ).toHaveLength(0)
})

test('Should take the session file with it when the session ends', () => {
  const home = freshHome()

  runHook(home, 'on-activity.mjs', {
    session_id: 'iii',
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
  })

  expect(sessionIn(home, 'iii').state).toBe('working')

  runHook(home, 'on-activity.mjs', {
    session_id: 'iii',
    hook_event_name: 'SessionEnd',
  })

  expect(sessionIn(home, 'iii')).toBeNull()
})

test('Should walk you through the grass for the time spent working', () => {
  const home = freshHome()

  writeConfig(home, {
    encounterChance: 1,
    trainerChance: 0,
    workStepSeconds: 20,
  })
  runHook(home, 'on-activity.mjs', {
    session_id: 'jjj',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
  })

  expect(queueIn(home), 'no time has passed yet').toHaveLength(0)

  rewindSession(home, 'jjj', 120_000)
  runHook(home, 'on-activity.mjs', {
    session_id: 'jjj',
    hook_event_name: 'Stop',
  })

  const queued = queueIn(home)

  expect(
    queued,
    'two minutes of waiting turns up one Pokemon, not six',
  ).toHaveLength(1)
  expect(queued[0].name, 'and it is a real one').toBeTruthy()
})

test('Should not bank a queue of battles for later over a long turn', () => {
  const home = freshHome()

  writeConfig(home, {
    encounterChance: 1,
    trainerChance: 0,
    workStepSeconds: 20,
  })
  runHook(home, 'on-activity.mjs', {
    session_id: 'mmm',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
  })

  for (let call = 0; call < 10; call++) {
    rewindSession(home, 'mmm', 120_000)
    runHook(home, 'on-activity.mjs', {
      session_id: 'mmm',
      hook_event_name: 'PreToolUse',
      tool_name: 'Read',
    })
  }

  expect(
    queueIn(home),
    'ten long tool calls, still one Pokemon in the grass',
  ).toHaveLength(1)
})

test('Should bank the walk it cannot spend while a Pokemon is already in the grass', () => {
  const home = freshHome()
  const toolCall = {
    session_id: 'pool1',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
  }

  writeConfig(home, {
    encounterChance: 1,
    trainerChance: 0,
    workStepSeconds: 20,
    maxSteps: 1,
  })
  runHook(home, 'on-activity.mjs', toolCall)
  rewindSession(home, 'pool1', 60_000)
  runHook(home, 'on-activity.mjs', toolCall)

  expect(queueIn(home), 'one step spent, one Pokemon').toHaveLength(1)
  expect(stepsIn(home).steps, 'the other two are banked').toBe(2)

  rewindSession(home, 'pool1', 60_000)
  rewindSharedClocks(home, 60_000)
  runHook(home, 'on-activity.mjs', toolCall)

  expect(
    stepsIn(home).steps,
    'a busy queue banks the walk instead of burning it',
  ).toBe(5)

  writeFileSync(join(home, 'queue.jsonl'), '')
  runHook(home, 'on-activity.mjs', toolCall)

  expect(
    queueIn(home),
    'and the banked steps turn up a Pokemon with no new work at all',
  ).toHaveLength(1)
  expect(stepsIn(home).steps).toBe(4)
})

test('Should walk the same minute once however many Claudes worked through it', () => {
  const home = freshHome()
  const sessions = ['pool2', 'pool3', 'pool4']

  writeConfig(home, {
    encounterChance: 1,
    trainerChance: 0,
    workStepSeconds: 20,
    maxSteps: 1,
  })

  for (const session of sessions)
    runHook(home, 'on-activity.mjs', {
      session_id: session,
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
    })

  for (const session of sessions) rewindSession(home, session, 60_000)

  for (const session of sessions)
    runHook(home, 'on-activity.mjs', {
      session_id: session,
      hook_event_name: 'Stop',
    })

  expect(queueIn(home), 'one trainer, one route').toHaveLength(1)
  expect(
    stepsIn(home).steps,
    'three terminals through the same minute walk it once: three steps, one spent',
  ).toBe(2)
  expect(
    workedIn(home).totalMs,
    'and one minute lands on the trainer card, not three',
  ).toBeLessThan(65_000)
  expect(workedIn(home).totalMs).toBeGreaterThan(59_000)
})

test('Should not cash in the time spent stopped on the next tool call', () => {
  const home = freshHome()

  writeConfig(home, {
    encounterChance: 1,
    trainerChance: 0,
    workStepSeconds: 20,
  })
  runHook(home, 'on-activity.mjs', {
    session_id: 'lll',
    hook_event_name: 'Notification',
    message: 'permission?',
  })
  rewindSession(home, 'lll', 1_800_000)
  runHook(home, 'on-activity.mjs', {
    session_id: 'lll',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
  })

  expect(
    queueIn(home),
    'half an hour waiting on you is not half an hour of walking',
  ).toHaveLength(0)

  runHook(home, 'on-activity.mjs', {
    session_id: 'lll',
    hook_event_name: 'Stop',
  })

  expect(queueIn(home), 'the clock restarted with the tool call').toHaveLength(
    0,
  )
})

test('Should bank the time Claude spent working and none of the time it spent waiting on you', () => {
  const home = freshHome()

  writeConfig(home, { encounterChance: 0 })
  runHook(home, 'on-activity.mjs', {
    session_id: 'www',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
  })

  expect(workedIn(home), 'no time has passed yet').toBeNull()

  rewindSession(home, 'www', 60_000)
  runHook(home, 'on-activity.mjs', {
    session_id: 'www',
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
  })

  const worked = workedIn(home)

  expect(worked.totalMs, 'a minute of work is a minute banked').toBeGreaterThan(
    59_000,
  )
  expect(worked.totalMs).toBeLessThan(65_000)

  runHook(home, 'on-activity.mjs', {
    session_id: 'www',
    hook_event_name: 'Notification',
    message: 'permission?',
  })
  rewindSession(home, 'www', 600_000)
  runHook(home, 'on-activity.mjs', {
    session_id: 'www',
    hook_event_name: 'Stop',
  })

  expect(
    workedIn(home).totalMs,
    'ten minutes waiting on you is not ten minutes of work',
  ).toBeLessThan(65_000)
})

test('Should forget a stretch longer than a working session stays live rather than bank a night of sleep', () => {
  const home = freshHome()

  writeConfig(home, { encounterChance: 0 })
  runHook(home, 'on-activity.mjs', {
    session_id: 'zzz',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
  })
  rewindSession(home, 'zzz', WORKING_STALE_MS + 60_000)
  runHook(home, 'on-activity.mjs', {
    session_id: 'zzz',
    hook_event_name: 'Stop',
  })

  expect(workedIn(home)).toBeNull()
})

test('Should say what is waiting in the status line and how long is left of it', () => {
  const home = freshHome()

  writeConfig(home, { encounterTtlSeconds: 30 })
  writeFileSync(
    join(home, 'queue.jsonl'),
    `${JSON.stringify({
      v: 1,
      species: 16,
      name: 'Pidgey',
      level: 4,
      at: new Date(Date.now() - 9_000).toISOString(),
    })}\n`,
  )

  const row = runStatusLine(home)

  expect(row).toMatch(/A wild PIDGEY appeared!/)
  expect(row).toMatch(/2[01]s left/)
  expect(row, 'and where to go about it').toMatch(/claudemon/)
})

test('Should drop the encounter from the status line once its window has closed', () => {
  const home = freshHome()

  writeConfig(home, { encounterTtlSeconds: 30 })
  writeFileSync(
    join(home, 'queue.jsonl'),
    `${JSON.stringify({
      v: 1,
      species: 16,
      name: 'Pidgey',
      level: 4,
      at: new Date(Date.now() - 31_000).toISOString(),
    })}\n`,
  )

  expect(runStatusLine(home)).not.toMatch(/appeared/)
})

test('Should call it unknown, not idle, when nothing is reporting or everything has gone quiet', () => {
  const now = Date.now()
  const silent = {
    session: 'a',
    state: 'working',
    at: now - STALE_MS - 1,
    since: now,
  }

  expect(summariseActivity([])).toEqual({
    state: 'unknown',
    tool: null,
    since: null,
    counts: { working: 0, waiting: 0, idle: 0 },
  })
  expect(
    summariseActivity([silent], now).state,
    'a session that says nothing for long enough is assumed dead',
  ).toBe('unknown')
})

test('Should rank needing you over working, and working over idle', () => {
  const now = Date.now()
  const idle = { session: 'a', state: 'idle', at: now - 300, since: now - 300 }
  const working = {
    session: 'b',
    state: 'working',
    at: now - 200,
    since: now - 9_000,
    tool: 'Bash',
  }
  const waiting = {
    session: 'c',
    state: 'waiting',
    at: now - 100,
    since: now - 1_000,
  }

  expect(summariseActivity([idle], now).state).toBe('idle')
  expect(summariseActivity([idle, working], now).state).toBe('working')
  expect(summariseActivity([idle, working, waiting], now).state).toBe('waiting')
})

test('Should describe the session that is actually moving', () => {
  const now = Date.now()
  const stale = {
    session: 'a',
    state: 'working',
    at: now - 60_000,
    since: now - 60_000,
    tool: 'Read',
  }
  const fresh = {
    session: 'b',
    state: 'working',
    at: now - 500,
    since: now - 4_000,
    tool: 'Bash',
  }

  const summary = summariseActivity([stale, fresh], now)

  expect(summary.tool).toBe('Bash')
  expect(summary.counts).toEqual({ working: 2, waiting: 0, idle: 0 })
})

test('Should read one Claude needing you as the state and still count the ones working', () => {
  const now = Date.now()
  const waiting = { session: 'a', state: 'waiting', at: now - 100, since: now }
  const working = [
    { session: 'b', state: 'working', at: now - 200, since: now, tool: 'Bash' },
    { session: 'c', state: 'working', at: now - 300, since: now, tool: 'Edit' },
  ]

  const summary = summariseActivity([waiting, ...working], now)

  expect(summary.state, 'the row leads with what needs you').toBe('waiting')
  expect(summary.counts).toEqual({ working: 2, waiting: 1, idle: 0 })
  expect(
    isWorking(summary),
    'but the game knows two Claudes are still grinding',
  ).toBe(true)
})

test('Should stop counting a session as working once it has gone quiet for too long', () => {
  const now = Date.now()
  const ghost = {
    session: 'a',
    state: 'working',
    at: now - WORKING_STALE_MS - 1,
    since: now - WORKING_STALE_MS - 1,
    tool: 'Bash',
  }

  const summary = summariseActivity([ghost], now)

  expect(summary.state, 'a session nobody has heard from is not working').toBe(
    'idle',
  )
  expect(summary.counts).toEqual({ working: 0, waiting: 0, idle: 1 })
  expect(isWorking(summary)).toBe(false)
})

test('Should hand the hooks the stretch a working session just put in, and nothing else', () => {
  const now = Date.now()

  expect(workingInterval({ state: 'working', at: now - 4000 }, now)).toEqual({
    from: now - 4000,
    to: now,
  })
  expect(workingInterval({ state: 'idle', at: now - 4000 }, now)).toBeNull()
  expect(workingInterval({ state: 'waiting', at: now - 4000 }, now)).toBeNull()
  expect(workingInterval(null, now)).toBeNull()
  expect(
    workingInterval({ state: 'working', at: now - WORKING_STALE_MS }, now),
    'a stretch that long is a session nobody heard die',
  ).toBeNull()
})

test('Should keep the clock running across a turn and reset it between turns', () => {
  const first = beginTurn('trans', '/tmp')
  const tool = noteTool('trans', '/tmp', 'Grep')

  expect(tool.since, 'a tool call is the same turn, still ticking').toBe(
    first.since,
  )

  const done = endTurn('trans', '/tmp')

  expect(done.since, 'stopping starts a new clock').toBeGreaterThanOrEqual(
    first.since,
  )
  expect(done.state).toBe('idle')

  const waiting = noteWaiting('trans', '/tmp', 'permission')

  expect(waiting.state).toBe('waiting')
  expect(readActivity('trans').state).toBe('waiting')

  endSession('trans')

  expect(readActivity('trans')).toBeNull()
})

test('Should read sessions back freshest first and prune the ancient ones', () => {
  const now = Date.now()

  writeActivity({
    v: 1,
    session: 'old',
    state: 'idle',
    at: now - 3 * 24 * 60 * 60_000,
    since: now,
  })
  writeActivity({
    v: 1,
    session: 'recent',
    state: 'working',
    at: now - 1_000,
    since: now - 1_000,
  })
  writeActivity({
    v: 1,
    session: 'newest',
    state: 'working',
    at: now,
    since: now,
  })

  const live = readSessions(now)

  expect(
    live.map((entry) => entry.session),
    'the old one is already stale',
  ).toEqual(['newest', 'recent'])
  expect(pruneSessions(now), 'and gets deleted').toBe(1)
  expect(readActivity('old')).toBeNull()

  for (const id of ['recent', 'newest']) endSession(id)
})

test('Should say nothing in the activity row when nothing is reporting', () => {
  expect(
    activityRow({
      state: 'unknown',
      tool: null,
      since: null,
      counts: { working: 0, waiting: 0, idle: 0 },
    }),
  ).toBe('')
  expect(activityRow(null)).toBe('')
})

test('Should name the tool in the activity row and how long Claude has been at it', () => {
  const now = Date.now()
  const row = activityRow(
    {
      state: 'working',
      tool: 'Bash',
      since: now - 74_000,
      counts: { working: 1, waiting: 0, idle: 0 },
    },
    now,
  )

  expect(row).toMatch(/Claude is working/)
  expect(row).toMatch(/Bash/)
  expect(row).toMatch(/1m14s/)
})

test('Should shout in the activity row when Claude is blocked on you', () => {
  const now = Date.now()
  const row = activityRow(
    {
      state: 'waiting',
      tool: null,
      since: now,
      counts: { working: 0, waiting: 1, idle: 0 },
    },
    now,
  )

  expect(row).toMatch(/needs you/)
})

test('Should call the activity row idle once Claude has stopped', () => {
  const now = Date.now()
  const row = activityRow(
    {
      state: 'idle',
      tool: null,
      since: now,
      counts: { working: 0, waiting: 0, idle: 1 },
    },
    now,
  )

  expect(row).toMatch(/idle/)
})

test('Should break the row down by state rather than hide the other tabs behind a count', () => {
  const now = Date.now()
  const row = stripAnsi(
    activityRow(
      {
        state: 'working',
        tool: 'Edit',
        since: now,
        counts: { working: 3, waiting: 0, idle: 0 },
      },
      now,
    ),
  )

  expect(row, 'three tabs grinding, said once').toMatch(
    /Claude is working \(3\)/,
  )

  const mixed = stripAnsi(
    activityRow(
      {
        state: 'waiting',
        tool: null,
        since: now,
        counts: { working: 2, waiting: 1, idle: 1 },
      },
      now,
    ),
  )

  expect(mixed).toMatch(/Claude needs you/)
  expect(mixed, 'and what the others are up to').toMatch(/working \(2\)/)
  expect(mixed).toMatch(/idle \(1\)/)
  expect(mixed, 'the state leading the row is not repeated').not.toMatch(
    /needs you \(1\)/,
  )
})

const cleanUpSandbox = () => rmSync(sandbox, { recursive: true, force: true })

process.on('exit', cleanUpSandbox)
