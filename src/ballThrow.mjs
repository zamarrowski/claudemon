import {
  BURST_SPREADS,
  FALL_FRAMES,
  SHAKE_TILTS,
  THROW_FRAMES,
} from './constants.mjs'

const throwSteps = () => {
  const steps = []

  for (let index = 0; index < THROW_FRAMES; index++)
    steps.push({ kind: 'throw', t: index / (THROW_FRAMES - 1), hideFoe: false })

  return steps
}

const fallSteps = () => {
  const steps = []

  for (let index = 0; index < FALL_FRAMES; index++)
    steps.push({ kind: 'fall', t: (index + 1) / FALL_FRAMES, hideFoe: true })

  return steps
}

const shakeSteps = (shakes) => {
  const steps = []

  for (let shake = 0; shake < shakes; shake++) {
    for (const tilt of SHAKE_TILTS)
      steps.push({ kind: 'shake', tilt, hideFoe: true })
  }

  return steps
}

const clickSteps = () => {
  return [
    { kind: 'click', lit: true, hideFoe: true },
    { kind: 'click', lit: false, hideFoe: true },
    { kind: 'click', lit: true, hideFoe: true },
  ]
}

const burstSteps = () => {
  const steps = []

  for (let spread = 1; spread <= BURST_SPREADS; spread++)
    steps.push({ kind: 'burst', spread, hideFoe: false })

  return steps
}

export const ballSteps = ({ shakes = 0, caught = false }) => {
  return [
    ...throwSteps(),
    ...fallSteps(),
    ...shakeSteps(shakes),
    ...(caught ? clickSteps() : burstSteps()),
  ]
}
