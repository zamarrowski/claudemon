import { spawn } from 'node:child_process'
import { beforeEach, expect, test, vi } from 'vitest'
import { revealCommand, revealFile } from './reveal.mjs'

vi.mock('node:child_process', () => ({ spawn: vi.fn() }))

const aChild = () => ({ on: vi.fn(), unref: vi.fn() })

beforeEach(() => {
  vi.clearAllMocks()
})

test('Should hand each platform the opener it actually has', () => {
  expect(revealCommand('darwin').command).toBe('open')
  expect(revealCommand('win32').command).toBe('explorer.exe')
  expect(revealCommand('linux').command, 'anything else gets xdg-open').toBe(
    'xdg-open',
  )
})

test('Should ask the desktop to open the file and not wait around for it', () => {
  const child = aChild()

  spawn.mockReturnValue(child)

  expect(revealFile('/tmp/card.png', 'darwin')).toBe(true)
  expect(spawn).toHaveBeenCalledTimes(1)
  expect(spawn).toHaveBeenCalledWith('open', ['/tmp/card.png'], {
    stdio: 'ignore',
    detached: true,
  })
  expect(
    child.unref,
    'the game must not be held open by the viewer',
  ).toHaveBeenCalledTimes(1)

  revealFile('C:\\Users\\ash\\card.png', 'win32')

  expect(spawn).toHaveBeenLastCalledWith(
    'explorer.exe',
    ['C:\\Users\\ash\\card.png'],
    { stdio: 'ignore', detached: true },
  )
})

test('Should stay quiet when the desktop has nothing to open it with', () => {
  const child = aChild()

  spawn.mockReturnValue(child)
  revealFile('/tmp/card.png', 'linux')

  const [event, handler] = child.on.mock.calls[0]

  expect(event, 'a missing opener arrives as an error event').toBe('error')
  expect(handler).not.toThrow()
})

test('Should report it could not open anything when the spawn itself fails', () => {
  spawn.mockImplementation(() => {
    throw new Error('EPERM')
  })

  expect(revealFile('/tmp/card.png', 'darwin')).toBe(false)
})
