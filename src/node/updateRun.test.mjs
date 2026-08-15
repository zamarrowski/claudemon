import { expect, test, vi } from 'vitest'
import { useSandboxHome } from '../../test/sandboxHome.mjs'

useSandboxHome('claudemon-update-run-')

const { createUpdateRun } = await import('./update.mjs')

const runOf = (steps) => {
  return {
    kind: 'clone',
    resolveVersion: () => '9.9.9',
    steps,
  }
}

const aStep = (id, command, args) => {
  return {
    id,
    label: `Doing ${id}`,
    done: `Did ${id}`,
    plan: () => ({ command, args, timeoutMs: 10_000 }),
  }
}

test('Should run every step in turn and end on the version it left behind', async () => {
  const onChange = vi.fn()
  const run = createUpdateRun({
    plan: runOf([
      aStep('one', process.execPath, ['-e', '']),
      aStep('two', process.execPath, ['-e', 'console.log("ok")']),
    ]),
    onChange,
  })

  await run.promise

  expect(run.state).toBe('done')
  expect(run.to).toBe('9.9.9')
  expect(run.steps.map((step) => step.status)).toEqual(['ok', 'ok'])
  expect(onChange).toHaveBeenCalled()
})

test('Should stop at the step that failed and say what came out of it', async () => {
  const run = createUpdateRun({
    plan: runOf([
      aStep('one', process.execPath, [
        '-e',
        'console.error("it broke"); process.exit(1)',
      ]),
      aStep('two', process.execPath, ['-e', '']),
    ]),
    onChange: () => {},
  })

  await run.promise

  expect(run.state).toBe('failed')
  expect(run.steps[0].status).toBe('failed')
  expect(run.steps[0].detail).toMatch(/it broke/)
  expect(run.steps[1].status, 'the rest never ran').toBe('pending')
})

test('Should say which command is missing rather than that a step failed', async () => {
  const run = createUpdateRun({
    plan: runOf([aStep('pull', 'no-such-command-anywhere', [])]),
    onChange: () => {},
  })

  await run.promise

  expect(run.state).toBe('failed')
  expect(run.steps[0].detail).toMatch(/git|claude/i)
})
