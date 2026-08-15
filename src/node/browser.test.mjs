import { expect, test, vi } from 'vitest'
import { browserCommand, openUrl } from './browser.mjs'

vi.mock('node:child_process', () => {
  return {
    spawn: vi.fn(() => ({ on: vi.fn(), unref: vi.fn() })),
  }
})

const { spawn } = await import('node:child_process')

test('Should open a URL with whatever the platform uses', () => {
  expect(browserCommand('darwin').command).toBe('open')
  expect(browserCommand('win32').command).toBe('cmd')
  expect(browserCommand('linux').command).toBe('xdg-open')
  expect(browserCommand('sunos').command, 'and falls back').toBe('xdg-open')
})

test('Should hand the URL to the opener and let go of it', () => {
  const child = { on: vi.fn(), unref: vi.fn() }

  spawn.mockReturnValueOnce(child)

  expect(openUrl('http://127.0.0.1:7626', 'darwin')).toBe(true)
  expect(spawn).toHaveBeenCalledWith('open', ['http://127.0.0.1:7626'], {
    stdio: 'ignore',
    detached: true,
  })
  expect(
    child.unref,
    'the game does not wait on the browser',
  ).toHaveBeenCalled()
})

test('Should carry on without a browser rather than crash the game', () => {
  spawn.mockImplementationOnce(() => {
    throw new Error('no such thing')
  })

  expect(openUrl('http://127.0.0.1:7626', 'linux')).toBe(false)
})
