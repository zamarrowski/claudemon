import { expect, test } from 'vitest'
import {
  STAR_ANSWERS,
  STAR_ASK_COOLDOWN_MS,
  STAR_ASK_LIMIT,
  STAR_ASK_MIN_CAUGHT,
} from './constants.mjs'
import {
  hasEarnedTheAsk,
  starAnswer,
  starAskAllowed,
  starAskDue,
  starAskPatch,
} from './star.mjs'

const NOW = Date.parse('2026-03-01T12:00:00.000Z')

const aSave = ({ badges = [], caught = [] }) => {
  return { badges, dex: { seen: caught, caught, faced: {} } }
}

const aConfig = ({ askedAt = null, asks = 0, answered = null }) => {
  return { starPrompt: { askedAt, asks, answered } }
}

const caughtSpecies = (count) => {
  return Array.from({ length: count }, (_, index) => index + 1)
}

test('Should count a badge or a well-filled dex as having earned the ask', () => {
  expect(hasEarnedTheAsk(aSave({}))).toBe(false)
  expect(hasEarnedTheAsk(aSave({ badges: ['brock'] }))).toBe(true)
  expect(
    hasEarnedTheAsk(aSave({ caught: caughtSpecies(STAR_ASK_MIN_CAUGHT - 1) })),
  ).toBe(false)
  expect(
    hasEarnedTheAsk(aSave({ caught: caughtSpecies(STAR_ASK_MIN_CAUGHT) })),
  ).toBe(true)
})

test('Should never ask a player who has not earned it yet', () => {
  expect(
    starAskDue({
      save: aSave({}),
      config: aConfig({}),
      now: NOW,
    }),
  ).toBe(false)
})

test('Should ask a player who earned it and has never been asked', () => {
  expect(
    starAskDue({
      save: aSave({ badges: ['brock'] }),
      config: aConfig({}),
      now: NOW,
    }),
  ).toBe(true)
})

test('Should hold the next ask back until the cooldown is up', () => {
  const save = aSave({ badges: ['brock'] })
  const config = aConfig({ askedAt: new Date(NOW).toISOString(), asks: 1 })

  expect(starAskDue({ save, config, now: NOW + 60_000 })).toBe(false)
  expect(
    starAskDue({ save, config, now: NOW + STAR_ASK_COOLDOWN_MS - 1000 }),
  ).toBe(false)
  expect(starAskDue({ save, config, now: NOW + STAR_ASK_COOLDOWN_MS })).toBe(
    true,
  )
})

test('Should treat an unreadable or future stamp as past the cooldown', () => {
  const save = aSave({ badges: ['brock'] })

  expect(
    starAskDue({ save, config: aConfig({ askedAt: 'never' }), now: NOW }),
  ).toBe(true)
  expect(
    starAskDue({
      save,
      config: aConfig({
        askedAt: new Date(NOW + STAR_ASK_COOLDOWN_MS * 10).toISOString(),
      }),
      now: NOW,
    }),
  ).toBe(true)
})

test('Should stop asking for good once the lifetime cap is reached', () => {
  expect(
    starAskDue({
      save: aSave({ badges: ['brock'] }),
      config: aConfig({ asks: STAR_ASK_LIMIT }),
      now: NOW + STAR_ASK_COOLDOWN_MS * 100,
    }),
  ).toBe(false)
})

test('Should make a yes and a never terminal, whatever the clock says', () => {
  const save = aSave({ badges: ['brock'] })
  const later = NOW + STAR_ASK_COOLDOWN_MS * 100

  for (const answered of [STAR_ANSWERS.starred, STAR_ANSWERS.never]) {
    const config = aConfig({ answered })

    expect(starAskAllowed(config)).toBe(false)
    expect(starAskDue({ save, config, now: later })).toBe(false)
  }

  expect(starAskAllowed(aConfig({}))).toBe(true)
})

test('Should stamp the ask and count it whichever way it was answered', () => {
  const config = aConfig({ asks: 1 })

  expect(starAnswer(config, STAR_ANSWERS.starred, NOW)).toEqual({
    starPrompt: {
      askedAt: '2026-03-01T12:00:00.000Z',
      asks: 2,
      answered: STAR_ANSWERS.starred,
    },
  })
  expect(starAnswer(config, null, NOW).starPrompt.answered).toBe(null)
})

test('Should switch the ask off and back on from the options screen without losing the count', () => {
  const asked = aConfig({ askedAt: '2026-03-01T12:00:00.000Z', asks: 1 })
  const off = starAskPatch(asked, false)

  expect(off).toEqual({
    starPrompt: {
      askedAt: '2026-03-01T12:00:00.000Z',
      asks: 1,
      answered: STAR_ANSWERS.never,
    },
  })

  expect(starAskPatch({ starPrompt: off.starPrompt }, true)).toEqual({
    starPrompt: {
      askedAt: '2026-03-01T12:00:00.000Z',
      asks: 1,
      answered: null,
    },
  })
})
