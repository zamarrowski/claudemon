import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createSound } from './sound.mjs'

const played = []

class StubAudio {
  constructor(file) {
    this.file = file
    this.loop = false
    this.volume = 1
    played.push(this)
  }

  play() {
    this.playing = true

    return Promise.resolve()
  }

  pause() {
    this.playing = false
  }
}

const stubOscillator = () => {
  return {
    type: null,
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

const stubContext = () => {
  const oscillators = []

  return {
    state: 'running',
    currentTime: 0,
    destination: {},
    oscillators,
    resume: vi.fn(),
    createOscillator: vi.fn(() => {
      const oscillator = stubOscillator()

      oscillators.push(oscillator)

      return oscillator
    }),
    createGain: vi.fn(() => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
  }
}

let context

beforeEach(() => {
  played.length = 0
  context = stubContext()
  globalThis.AudioContext = class {
    constructor() {
      return context
    }
  }
  globalThis.Audio = StubAudio
})

afterEach(() => {
  delete globalThis.AudioContext
  delete globalThis.Audio
})

test('Should play one note per beep, and nothing at all for a sound it does not know', () => {
  const sound = createSound()

  sound.play('select')

  expect(context.oscillators).toHaveLength(2)
  expect(context.oscillators[0].frequency.value).toBe(880)
  expect(context.oscillators[0].start).toHaveBeenCalledTimes(1)

  sound.play('nothing-like-that')

  expect(
    context.oscillators,
    'no oscillator for an unknown sound',
  ).toHaveLength(2)
})

test('Should loop the battle theme and stop it when the battle ends', () => {
  const sound = createSound()

  sound.startMusic('battle')

  expect(played[0].file).toBe('/sounds/battle.wav')
  expect(played[0].loop).toBe(true)
  expect(played[0].playing).toBe(true)

  sound.stopMusic()

  expect(played[0].playing).toBe(false)
})

test('Should let the victory theme finish once rather than loop it', () => {
  const sound = createSound()

  sound.startMusic('victory')

  expect(played[0].loop).toBe(false)

  sound.startMusic('nothing-like-that')

  expect(played, 'and an unknown track plays nothing').toHaveLength(1)
})

test('Should wake the audio up when the browser had suspended it', () => {
  context.state = 'suspended'

  const sound = createSound()

  sound.play('cursor')

  expect(context.resume).toHaveBeenCalledTimes(1)
})
