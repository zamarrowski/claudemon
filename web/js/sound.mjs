import { SOUNDS } from '../../src/constants.mjs'
import {
  EFFECT_VOLUME,
  MUSIC_FILES,
  MUSIC_VOLUME,
  OSCILLATOR_TYPE,
} from './constants.mjs'

const playNote = (audio, note, at, gain) => {
  const oscillator = audio.createOscillator()
  const level = audio.createGain()

  oscillator.type = OSCILLATOR_TYPE
  oscillator.frequency.value = note.hz

  level.gain.setValueAtTime(gain * EFFECT_VOLUME, at)
  level.gain.exponentialRampToValueAtTime(0.0001, at + note.ms / 1000)

  oscillator.connect(level)
  level.connect(audio.destination)
  oscillator.start(at)
  oscillator.stop(at + note.ms / 1000)
}

export const createSound = () => {
  let audio = null
  let music = null

  const context = () => {
    if (!audio) audio = new AudioContext()
    if (audio.state === 'suspended') audio.resume()

    return audio
  }

  const play = (name) => {
    const sound = SOUNDS[name]

    if (!sound) return

    const out = context()
    let at = out.currentTime

    for (const note of sound.notes) {
      playNote(out, note, at, sound.gain)
      at += note.ms / 1000
    }
  }

  const startMusic = (name) => {
    const file = MUSIC_FILES[name]

    if (!file) return

    stopMusic()

    music = new Audio(file)
    music.loop = name === 'battle'
    music.volume = MUSIC_VOLUME
    music.play().catch(() => {})
  }

  const stopMusic = () => {
    if (!music) return

    music.pause()
    music = null
  }

  return { play, startMusic, stopMusic }
}
