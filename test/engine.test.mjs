import { expect, test } from 'vitest'

import { isDataReady, move as moveOf, species } from '../src/data.mjs'
import { effectiveness } from '../src/typechart.mjs'
import { expForLevel, expFromTrainerMon } from '../src/exp.mjs'
import { SHINY_ODDS, TRAINER_MESSAGES } from '../src/constants.mjs'
import { statsAtLevel } from '../src/stats.mjs'
import { attemptCatch, catchValue } from '../src/capture.mjs'
import {
  canEvolveByStone,
  createPokemon,
  displayName,
  evolveInto,
  genderOf,
  levelOf,
  levelUpEvolution,
  makeMoveSlot,
  pendingEvolution,
  refreshStats,
  rollShiny,
  speciesGender,
  speciesName,
} from '../src/pokemon.mjs'
import {
  createBattle,
  sendOutAfterFaint,
  submitAction,
} from '../src/battle.mjs'
import { makeRng } from '../src/rng.mjs'

if (!isDataReady()) {
  throw new Error('dataset missing — run: node tools/fetch-data.mjs')
}

const aPokemon = (speciesId, level) => {
  const created = createPokemon(speciesId, level, makeRng(1))

  for (const key of Object.keys(created.ivs)) created.ivs[key] = 15

  created.stats = statsAtLevel(speciesId, level, created.ivs)
  created.hp = created.stats.hp

  return created
}

const textsOf = (events) => {
  return events.filter((event) => event.text).map((event) => event.text)
}

const aTrainerBattle = (team, playerMon) => {
  return createBattle({
    playerMon,
    wildMon: team[0],
    trainer: { class: 'Lass', name: 'Iris', prize: 30, team },
    seed: 5,
  })
}

const playSixTurns = (battle) => {
  const log = []

  for (let turn = 0; turn < 6 && !battle.over; turn++) {
    log.push(...submitAction(battle, { type: 'move', index: 0 }))
  }

  return { log, outcome: battle.outcome, hp: battle.foe.mon.hp }
}

test('Should multiply the effectiveness across both defending types, and zero it on an immunity in either slot', () => {
  expect(effectiveness('water', ['fire'])).toBe(2)
  expect(effectiveness('fire', ['water'])).toBe(0.5)
  expect(effectiveness('electric', ['ground'])).toBe(0)
  expect(effectiveness('normal', ['ghost'])).toBe(0)

  expect(effectiveness('rock', species(6).types)).toBe(4)
  expect(effectiveness('grass', species(1).types)).toBe(0.25)
  expect(effectiveness('normal', species(94).types)).toBe(0)
})

test('Should hand back a created Pokemon ready to battle, at full health with full PP', () => {
  const charmander = createPokemon(4, 5, makeRng(42))

  expect(levelOf(charmander)).toBe(5)
  expect(charmander.hp).toBe(charmander.stats.hp)
  expect(charmander.moves.length).toBeGreaterThanOrEqual(1)
  expect(charmander.moves.every((slot) => slot.pp === slot.maxPp)).toBe(true)
  expect(charmander.shiny, 'ordinary colours unless told otherwise').toBe(false)
})

test('Should keep shiny colours to the rare draw and stamp them on the Pokemon', () => {
  expect(rollShiny(() => 0)).toBe(true)
  expect(
    rollShiny(() => SHINY_ODDS),
    'the odds are the cutoff',
  ).toBe(false)
  expect(createPokemon(4, 5, makeRng(42), true).shiny).toBe(true)
})

test('Should add the HP gained on levelling up rather than healing the damage', () => {
  const charmander = aPokemon(4, 10)

  charmander.hp = 5

  const beforeMax = charmander.stats.hp

  charmander.exp = expForLevel(4, 11)
  refreshStats(charmander)

  const gained = charmander.stats.hp - beforeMax

  expect(gained, 'max HP should rise').toBeGreaterThan(0)
  expect(charmander.hp).toBe(5 + gained)
  expect(charmander.hp, 'a level up is not a full heal').toBeLessThan(
    charmander.stats.hp,
  )
})

test('Should keep the level, the share of health and the gender when a Pokemon evolves', () => {
  const charmander = aPokemon(4, 16)

  charmander.hp = Math.floor(charmander.stats.hp / 2)

  const gender = genderOf(charmander)

  expect(
    gender,
    'the Pokemon needs a gender for this to mean much',
  ).toBeTruthy()
  expect(pendingEvolution(charmander), 'Charmander evolves at 16').toBe(5)

  evolveInto(charmander, 5)

  expect(charmander.species).toBe(5)
  expect(levelOf(charmander)).toBe(16)
  expect(genderOf(charmander)).toBe(gender)

  const fraction = charmander.hp / charmander.stats.hp

  expect(fraction, `kept ${fraction} of its health`).toBeGreaterThan(0.4)
  expect(fraction, `kept ${fraction} of its health`).toBeLessThan(0.6)
})

test('Should leave a Pokemon below its evolution level, or one that needs a stone, unevolved', () => {
  expect(pendingEvolution(aPokemon(4, 15))).toBe(null)
  expect(pendingEvolution(aPokemon(25, 50))).toBe(null)
})

test('Should tell stone evolutions from level-up ones at a glance', () => {
  expect(canEvolveByStone(aPokemon(25, 10))).toBe(true)
  expect(canEvolveByStone(aPokemon(4, 10))).toBe(false)
  expect(levelUpEvolution(aPokemon(4, 10))).toEqual({
    to: 5,
    trigger: 'level-up',
    level: 16,
    item: null,
  })
  expect(levelUpEvolution(aPokemon(25, 10))).toBe(null)
})

test('Should read the gender off the Attack IV against the species ratio', () => {
  const female = aPokemon(25, 10)

  female.ivs.attack = 15

  expect(genderOf(female)).toBe('female')

  const male = aPokemon(25, 10)

  male.ivs.attack = 16

  expect(genderOf(male)).toBe('male')

  const lowest = aPokemon(25, 10)

  lowest.ivs.attack = 0

  expect(genderOf(lowest)).toBe('female')

  const highest = aPokemon(25, 10)

  highest.ivs.attack = 31

  expect(genderOf(highest)).toBe('male')
})

test('Should ignore the IV entirely for the species that come in only one gender', () => {
  for (const iv of [0, 15, 16, 31]) {
    const nidoranF = aPokemon(29, 10)

    nidoranF.ivs.attack = iv

    expect(genderOf(nidoranF), `Nidoran♀ at IV ${iv}`).toBe('female')

    const nidoranM = aPokemon(32, 10)

    nidoranM.ivs.attack = iv

    expect(genderOf(nidoranM), `Nidoran♂ at IV ${iv}`).toBe('male')
  }
})

test('Should give the ones with no gender none at any IV', () => {
  for (const id of [81, 132, 137, 150]) {
    for (const iv of [0, 31]) {
      const genderless = aPokemon(id, 10)

      genderless.ivs.attack = iv

      expect(genderOf(genderless), `${species(id).name} at IV ${iv}`).toBe(null)
    }
  }
})

test('Should show no gender, rather than all male, on a dataset too old to know', () => {
  const pikachu = aPokemon(25, 10)
  const entry = species(25)
  const { genderRate } = entry

  try {
    delete entry.genderRate

    expect(genderOf(pikachu)).toBe(null)
  } finally {
    entry.genderRate = genderRate
  }
})

test('Should strip the suffix from the two Nidoran and tell them apart by gender instead', () => {
  expect(speciesName(29)).toBe('Nidoran')
  expect(speciesName(32)).toBe('Nidoran')
  expect(speciesGender(29)).toBe('female')
  expect(speciesGender(32)).toBe('male')

  expect(speciesGender(25)).toBe(null)
  expect(speciesGender(132)).toBe(null)

  expect(displayName(aPokemon(29, 5))).toBe('Nidoran')

  const nicknamed = aPokemon(29, 5)

  nicknamed.nickname = 'Spike'

  expect(displayName(nicknamed)).toBe('Spike')
})

test('Should make a weakened Pokemon easier to catch than a healthy one', () => {
  const pidgey = aPokemon(16, 10)
  const healthy = catchValue(pidgey, 'poke-ball')

  pidgey.hp = 1

  const weakened = catchValue(pidgey, 'poke-ball')

  expect(weakened, `${weakened} should beat ${healthy}`).toBeGreaterThan(
    healthy,
  )
})

test('Should catch better with a better ball, and twice as well against a sleeping target', () => {
  const pidgey = aPokemon(16, 10)
  const plain = catchValue(pidgey, 'poke-ball')

  expect(catchValue(pidgey, 'ultra-ball')).toBeGreaterThan(plain)

  pidgey.status = 'sleep'

  expect(catchValue(pidgey, 'poke-ball')).toBe(plain * 2)
})

test('Should never fail a Master Ball, even on Mewtwo at full health', () => {
  const mewtwo = aPokemon(150, 70)

  for (let seed = 1; seed <= 50; seed++) {
    expect(
      attemptCatch(mewtwo, 'master-ball', makeRng(seed)).caught,
      `seed ${seed}`,
    ).toBe(true)
  }
})

test('Should let Mewtwo at full health resist a Poke Ball', () => {
  const mewtwo = aPokemon(150, 70)

  let caught = 0

  for (let seed = 1; seed <= 200; seed++) {
    if (attemptCatch(mewtwo, 'poke-ball', makeRng(seed)).caught) caught++
  }

  expect(
    caught,
    `caught ${caught} times out of 200, which is too generous`,
  ).toBeLessThanOrEqual(4)
})

test('Should take a few balls on an untouched Caterpie and go straight down on a weakened one', () => {
  const healthy = aPokemon(10, 5)

  let caughtHealthy = 0

  for (let seed = 1; seed <= 400; seed++) {
    if (attemptCatch(healthy, 'poke-ball', makeRng(seed)).caught)
      caughtHealthy++
  }

  const healthyRate = caughtHealthy / 400

  expect(healthyRate, `full health rate was ${healthyRate}`).toBeGreaterThan(
    0.2,
  )
  expect(healthyRate, `full health rate was ${healthyRate}`).toBeLessThan(0.5)

  const weakened = aPokemon(10, 5)

  weakened.hp = 1

  let caughtWeak = 0

  for (let seed = 1; seed <= 400; seed++) {
    if (attemptCatch(weakened, 'poke-ball', makeRng(seed)).caught) caughtWeak++
  }

  const weakenedRate = caughtWeak / 400

  expect(
    weakenedRate,
    `weakened rate was only ${weakenedRate}`,
  ).toBeGreaterThan(0.95)
})

test('Should replay a battle identically from the same seed and the same actions', () => {
  const first = playSixTurns(
    createBattle({
      playerMon: aPokemon(4, 20),
      wildMon: aPokemon(16, 10),
      seed: 1234,
    }),
  )
  const second = playSixTurns(
    createBattle({
      playerMon: aPokemon(4, 20),
      wildMon: aPokemon(16, 10),
      seed: 1234,
    }),
  )

  expect(first).toEqual(second)
})

test('Should damage the foe and spend a PP when attacking', () => {
  const battle = createBattle({
    playerMon: aPokemon(4, 20),
    wildMon: aPokemon(16, 10),
    seed: 7,
  })
  const slot = battle.player.mon.moves.findIndex(
    (entry) => moveOf(entry.move).damageClass !== 'status',
  )
  const before = battle.foe.mon.hp
  const ppBefore = battle.player.mon.moves[slot].pp

  const events = submitAction(battle, { type: 'move', index: slot })

  expect(battle.foe.mon.hp, 'the foe should have taken damage').toBeLessThan(
    before,
  )
  expect(battle.player.mon.moves[slot].pp).toBe(ppBefore - 1)
  expect(events.some((event) => event.type === 'damage')).toBe(true)
})

test('Should end the battle in a win that pays out when the foe is beaten', () => {
  const battle = createBattle({
    playerMon: aPokemon(4, 40),
    wildMon: aPokemon(16, 5),
    seed: 99,
  })
  const slot = battle.player.mon.moves.findIndex(
    (entry) => moveOf(entry.move).damageClass !== 'status',
  )

  let guard = 0

  while (!battle.over && guard++ < 30)
    submitAction(battle, { type: 'move', index: slot })

  expect(battle.over).toBe(true)
  expect(battle.outcome).toBe('win')
  expect(battle.rewards.exp, 'should award experience').toBeGreaterThan(0)
  expect(battle.rewards.money, 'should award money').toBeGreaterThan(0)
  expect(battle.foe.mon.hp).toBeLessThanOrEqual(0)
})

test('Should report a lost battle as a loss that pays nothing', () => {
  const battle = createBattle({
    playerMon: aPokemon(129, 5),
    wildMon: aPokemon(150, 70),
    seed: 3,
  })

  let guard = 0

  while (!battle.over && guard++ < 60)
    submitAction(battle, { type: 'move', index: 0 })

  expect(battle.outcome).toBe('loss')
  expect(battle.player.mon.hp).toBeLessThanOrEqual(0)
  expect(battle.rewards, 'a loss pays nothing').toEqual({ exp: 0, money: 0 })
})

test('Should send out the next Pokemon when one of a trainers falls, and only pay once the last is down', () => {
  const team = [aPokemon(129, 5), aPokemon(129, 5)]
  const player = aPokemon(150, 70)

  player.moves = [makeMoveSlot('psychic')]

  const battle = aTrainerBattle(team, player)

  const opening = submitAction(battle, { type: 'move', index: 0 })

  expect(battle.over, 'one down is not the end of a trainer').toBe(false)
  expect(battle.foe.mon, 'the next one takes the field').toBe(team[1])
  expect(textsOf(opening)).toContain('LASS IRIS sent out Magikarp!')
  expect(
    opening.find((event) => event.type === 'foe-out')?.mon,
    'the screen is told which one took the field, and when',
  ).toBe(team[1])

  let guard = 0

  while (!battle.over && guard++ < 30)
    submitAction(battle, { type: 'move', index: 0 })

  expect(battle.outcome).toBe('win')
  expect(battle.rewards.exp, 'both of them are worth their bonus').toBe(
    2 * expFromTrainerMon(129, 5),
  )
  expect(battle.rewards.money, 'thirty a level for a Lass').toBe(30 * 5)
})

test('Should refuse to run from a trainer and refuse to catch what belongs to somebody, at no cost', () => {
  const battle = aTrainerBattle([aPokemon(129, 5)], aPokemon(150, 70))
  const full = battle.foe.mon.stats.hp

  expect(textsOf(submitAction(battle, { type: 'run' }))).toEqual([
    TRAINER_MESSAGES.noRunning,
  ])
  expect(
    textsOf(submitAction(battle, { type: 'ball', key: 'poke-ball' })),
  ).toEqual([TRAINER_MESSAGES.noStealing])

  expect(battle.over).toBe(false)
  expect(battle.foe.mon.hp, 'neither costs a turn').toBe(full)
  expect(
    battle.turn,
    'and neither ages the counters the volatile timers are read against',
  ).toBe(0)
})

test('Should leave the foe its boosts, its counters and the turn clock when the player sends out somebody new', () => {
  const battle = aTrainerBattle([aPokemon(129, 5)], aPokemon(150, 70))

  submitAction(battle, { type: 'move', index: 0 })

  battle.foe.stages.attack = 2
  battle.foe.volatile.confusion = 3

  const clock = battle.turn

  sendOutAfterFaint(battle, aPokemon(25, 10))

  expect(battle.foe.stages.attack, 'the boosts it earned are its own').toBe(2)
  expect(battle.foe.volatile.confusion).toBe(3)
  expect(
    battle.turn,
    'and the clock runs on, so the volatile turn marks stay in the past',
  ).toBe(clock)
  expect(battle.over, 'the battle is live again').toBe(false)
  expect(battle.outcome).toBe(null)
})

test('Should have the trainer send out the next one even when the winning blow takes the player down with it', () => {
  const team = [aPokemon(129, 5), aPokemon(129, 5)]
  const player = aPokemon(150, 70)

  player.moves = [makeMoveSlot('double-edge')]
  player.hp = 1

  const battle = aTrainerBattle(team, player)

  submitAction(battle, { type: 'move', index: 0 })

  expect(battle.player.mon.hp, 'the recoil finished it').toBe(0)
  expect(battle.outcome, 'the player owes a Pokémon').toBe('loss')
  expect(battle.foe.mon, 'and the trainer already sent the next').toBe(team[1])
  expect(battle.rewards.exp, 'the one it took down still counts').toBe(
    expFromTrainerMon(129, 5),
  )
})

test('Should always get away with a faster Pokemon', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const battle = createBattle({
      playerMon: aPokemon(6, 50),
      wildMon: aPokemon(10, 5),
      seed,
    })

    const events = submitAction(battle, { type: 'run' })

    expect(battle.outcome, `seed ${seed}`).toBe('fled')
    expect(events.some((event) => event.text === 'Got away safely!')).toBe(true)
  }
})

test('Should end the battle as caught when the ball holds', () => {
  const battle = createBattle({
    playerMon: aPokemon(4, 20),
    wildMon: aPokemon(16, 10),
    seed: 7,
  })

  const events = submitAction(battle, { type: 'ball', key: 'master-ball' })

  expect(battle.outcome).toBe('caught')
  expect(events.some((event) => event.type === 'catch' && event.caught)).toBe(
    true,
  )
})

test('Should still give the foe its turn when the ball fails', () => {
  const battle = createBattle({
    playerMon: aPokemon(143, 70),
    wildMon: aPokemon(150, 70),
    seed: 5,
  })
  const before = battle.player.mon.hp

  submitAction(battle, { type: 'ball', key: 'poke-ball' })

  expect(battle.outcome, 'Mewtwo should not be caught by one Poke Ball').toBe(
    null,
  )
  expect(
    battle.player.mon.hp,
    'the foe should have attacked back',
  ).toBeLessThan(before)
})

test('Should hit harder with a super effective move than with a resisted one', () => {
  const total = { strong: 0, weak: 0 }

  for (let seed = 1; seed <= 40; seed++) {
    for (const [key, foeId] of [
      ['strong', 1],
      ['weak', 7],
    ]) {
      const charmander = aPokemon(4, 30)

      charmander.moves = [{ move: 'ember', pp: 25, maxPp: 25 }]

      const battle = createBattle({
        playerMon: charmander,
        wildMon: aPokemon(foeId, 30),
        seed,
      })
      const before = battle.foe.mon.hp

      submitAction(battle, { type: 'move', index: 0 })

      total[key] += before - battle.foe.mon.hp
    }
  }

  expect(total.strong, `${total.strong} versus ${total.weak}`).toBeGreaterThan(
    total.weak * 2,
  )
})

test('Should halve the physical damage a burned attacker deals', () => {
  const dealt = { healthy: 0, burned: 0 }

  for (let seed = 1; seed <= 40; seed++) {
    for (const state of ['healthy', 'burned']) {
      const attacker = aPokemon(4, 30)

      attacker.moves = [{ move: 'scratch', pp: 35, maxPp: 35 }]

      if (state === 'burned') attacker.status = 'burn'

      const battle = createBattle({
        playerMon: attacker,
        wildMon: aPokemon(16, 40),
        seed,
      })
      const before = battle.foe.mon.hp

      submitAction(battle, { type: 'move', index: 0 })

      dealt[state] += before - battle.foe.mon.hp
    }
  }

  const ratio = dealt.burned / dealt.healthy

  expect(ratio, `burned dealt ${ratio} of healthy output`).toBeGreaterThan(0.4)
  expect(ratio, `burned dealt ${ratio} of healthy output`).toBeLessThan(0.62)
})

test('Should fall back to Struggle when the PP runs out, and hurt the user with it', () => {
  const attacker = aPokemon(4, 30)

  attacker.moves = [{ move: 'scratch', pp: 0, maxPp: 35 }]

  const battle = createBattle({
    playerMon: attacker,
    wildMon: aPokemon(16, 30),
    seed: 11,
  })
  const before = battle.player.mon.hp

  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(events.some((event) => event.text?.includes('Struggle'))).toBe(true)
  expect(battle.player.mon.hp, 'recoil should hurt').toBeLessThan(before)
})

test('Should apply the condition of a status move without dealing damage', () => {
  const attacker = aPokemon(25, 30)

  attacker.moves = [{ move: 'thunder-wave', pp: 20, maxPp: 20 }]

  const battle = createBattle({
    playerMon: attacker,
    wildMon: aPokemon(16, 30),
    seed: 2,
  })
  const before = battle.foe.mon.hp

  submitAction(battle, { type: 'move', index: 0 })

  expect(battle.foe.mon.status).toBe('paralysis')
  expect(battle.foe.mon.hp, 'Thunder Wave deals no damage').toBe(before)
})

test('Should burn away a fraction of HP at the end of the turn only for poison and burn', () => {
  const damageByStatus = {}

  for (const status of ['poison', 'burn', 'paralysis', 'sleep', null]) {
    const poisoned = aPokemon(1, 20)

    poisoned.status = status
    poisoned.statusTurns = 3

    const foe = aPokemon(25, 20)

    foe.moves = [{ move: 'thunder-wave', pp: 20, maxPp: 20 }]

    const battle = createBattle({ playerMon: poisoned, wildMon: foe, seed: 3 })
    const before = poisoned.hp

    submitAction(battle, { type: 'move', index: 0 })

    damageByStatus[status] = before - poisoned.hp
  }

  const maxHp = aPokemon(1, 20).stats.hp

  expect(damageByStatus.poison).toBe(Math.floor(maxHp / 8))
  expect(damageByStatus.burn).toBe(Math.floor(maxHp / 16))
  expect(damageByStatus.paralysis).toBe(0)
  expect(damageByStatus.sleep).toBe(0)
  expect(damageByStatus.null).toBe(0)
})

test('Should leave an immune target with nothing at all', () => {
  const attacker = aPokemon(25, 40)

  attacker.moves = [{ move: 'thunder-shock', pp: 30, maxPp: 30 }]

  const battle = createBattle({
    playerMon: attacker,
    wildMon: aPokemon(74, 20),
    seed: 4,
  })
  const before = battle.foe.mon.hp

  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(battle.foe.mon.hp).toBe(before)
  expect(events.some((event) => event.text?.includes("doesn't affect"))).toBe(
    true,
  )
})

test('Should hurt the user with a recoil move instead of healing it', () => {
  const attacker = aPokemon(143, 50)

  attacker.moves = [{ move: 'double-edge', pp: 15, maxPp: 15 }]
  attacker.hp = attacker.stats.hp - 20

  const battle = createBattle({
    playerMon: attacker,
    wildMon: aPokemon(143, 50),
    seed: 5,
  })
  const before = attacker.hp

  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(attacker.hp, 'recoil should cost the user HP').toBeLessThan(before)
  expect(events.some((event) => event.text?.includes('hit by recoil'))).toBe(
    true,
  )
})

test('Should heal the user with a draining move and say the target lost the energy', () => {
  const attacker = aPokemon(1, 40)

  attacker.moves = [{ move: 'absorb', pp: 25, maxPp: 25 }]
  attacker.hp = 10

  const battle = createBattle({
    playerMon: attacker,
    wildMon: aPokemon(16, 5),
    seed: 9,
  })

  const events = submitAction(battle, { type: 'move', index: 0 })
  const drained = events.find((event) =>
    event.text?.includes('had its energy drained'),
  )

  expect(attacker.hp).toBeGreaterThan(10)
  expect(drained.text).toBe('the wild Pidgey had its energy drained!')
})

test('Should keep a Pokemon asleep on the turn the sleep lands instead of letting it shrug it off', () => {
  const attacker = aPokemon(25, 40)

  attacker.moves = [{ move: 'sleep-powder', pp: 15, maxPp: 15 }]

  const battle = createBattle({
    playerMon: attacker,
    wildMon: aPokemon(16, 5),
    seed: 1,
  })
  const before = battle.player.mon.hp

  const events = submitAction(battle, { type: 'move', index: 0 })
  const texts = textsOf(events)

  expect(texts).toContain('the wild Pidgey fell asleep!')
  expect(texts).toContain('the wild Pidgey is fast asleep.')
  expect(texts.some((text) => text.includes('woke up'))).toBe(false)
  expect(battle.foe.mon.status).toBe('sleep')
  expect(battle.player.mon.hp, 'the sleeper should lose its turn').toBe(before)
})

test('Should hold a sleeping Pokemon for a few turns and let it act the turn it wakes', () => {
  const player = aPokemon(143, 40)
  const foe = aPokemon(16, 40)

  player.moves = [{ move: 'tackle', pp: 35, maxPp: 35 }]
  player.status = 'sleep'
  player.statusTurns = 3
  foe.moves = [{ move: 'growl', pp: 40, maxPp: 40 }]

  const battle = createBattle({ playerMon: player, wildMon: foe, seed: 5 })
  const rounds = []

  for (let turn = 0; turn < 4; turn++) {
    rounds.push(textsOf(submitAction(battle, { type: 'move', index: 0 })))
  }

  expect(
    rounds
      .slice(0, 3)
      .every((texts) => texts.includes('Snorlax is fast asleep.')),
  ).toBe(true)
  expect(rounds[3]).toContain('Snorlax woke up!')
  expect(rounds[3]).toContain('Snorlax used Tackle!')
  expect(player.status).toBe(null)
  expect(player.moves[0].pp, 'a slept turn costs no PP').toBe(34)
})

test('Should hold a frozen Pokemon until it thaws out', () => {
  const player = aPokemon(143, 40)
  const foe = aPokemon(16, 40)

  player.moves = [{ move: 'tackle', pp: 35, maxPp: 35 }]
  player.status = 'freeze'
  foe.moves = [{ move: 'growl', pp: 40, maxPp: 40 }]

  const battle = createBattle({ playerMon: player, wildMon: foe, seed: 2 })
  const rounds = []

  for (let turn = 0; turn < 5; turn++) {
    rounds.push(textsOf(submitAction(battle, { type: 'move', index: 0 })))
  }

  expect(
    rounds
      .slice(0, 4)
      .every((texts) => texts.includes('Snorlax is frozen solid!')),
  ).toBe(true)
  expect(rounds[4]).toContain('Snorlax thawed out!')
  expect(rounds[4]).toContain('Snorlax used Tackle!')
  expect(player.status).toBe(null)
})

test('Should confuse the foe with Confuse Ray without touching its health', () => {
  const attacker = aPokemon(94, 40)

  attacker.moves = [{ move: 'confuse-ray', pp: 10, maxPp: 10 }]

  const battle = createBattle({
    playerMon: attacker,
    wildMon: aPokemon(143, 40),
    seed: 1,
  })
  const before = battle.foe.mon.hp

  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(battle.foe.volatile.confusion).toBeGreaterThan(0)
  expect(battle.foe.mon.hp).toBe(before)
  expect(
    events.some((event) => event.text === 'the wild Snorlax became confused!'),
  ).toBe(true)
})

test('Should make the foe lose its turn when a flinching hit lands first', () => {
  const attacker = aPokemon(25, 40)
  const foe = aPokemon(143, 40)

  attacker.moves = [{ move: 'bite', pp: 25, maxPp: 25 }]
  foe.moves = [{ move: 'tackle', pp: 35, maxPp: 35 }]

  const battle = createBattle({ playerMon: attacker, wildMon: foe, seed: 3 })
  const before = battle.player.mon.hp

  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(
    events.some((event) => event.text?.includes('flinched and could not move')),
  ).toBe(true)
  expect(battle.player.mon.hp, 'the flinched foe never swung').toBe(before)
  expect(foe.moves[0].pp, 'a flinched move costs no PP').toBe(35)
})

test('Should trap the player with Wrap and block the escape while it holds', () => {
  const player = aPokemon(143, 40)
  const foe = aPokemon(25, 40)

  player.moves = [{ move: 'tackle', pp: 35, maxPp: 35 }]
  foe.moves = [{ move: 'wrap', pp: 20, maxPp: 20 }]

  const battle = createBattle({ playerMon: player, wildMon: foe, seed: 1 })

  submitAction(battle, { type: 'move', index: 0 })

  expect(battle.player.volatile.trap.move).toBe('Wrap')

  const escape = submitAction(battle, { type: 'run' })

  expect(escape.some((event) => event.text === "Can't escape!")).toBe(true)
  expect(battle.over).toBe(false)
})

test('Should disable one of the player moves and refuse to run it while it lasts', () => {
  const player = aPokemon(143, 40)
  const foe = aPokemon(96, 40)

  player.moves = [
    { move: 'tackle', pp: 35, maxPp: 35 },
    { move: 'headbutt', pp: 15, maxPp: 15 },
  ]
  foe.moves = [{ move: 'disable', pp: 20, maxPp: 20 }]

  const battle = createBattle({ playerMon: player, wildMon: foe, seed: 1 })

  submitAction(battle, { type: 'move', index: 0 })

  expect(battle.player.volatile.disable.index).toBe(1)

  const events = submitAction(battle, { type: 'move', index: 1 })

  expect(
    events.some((event) => event.text === "Snorlax's Headbutt is disabled!"),
  ).toBe(true)
  expect(player.moves[1].pp, 'a disabled move costs no PP').toBe(15)
})

test('Should seed the player with Leech Seed and start sapping it', () => {
  const player = aPokemon(143, 40)
  const foe = aPokemon(1, 40)

  player.moves = [{ move: 'tackle', pp: 35, maxPp: 35 }]
  foe.moves = [{ move: 'leech-seed', pp: 10, maxPp: 10 }]

  const battle = createBattle({ playerMon: player, wildMon: foe, seed: 1 })

  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(battle.player.volatile.leechSeed).toBe(true)
  expect(
    events.some((event) =>
      event.text?.includes("Snorlax's health is sapped by Leech Seed!"),
    ),
  ).toBe(true)
})

test('Should score a recoil double knockout as a win, not a loss', () => {
  const player = aPokemon(143, 50)

  player.moves = [{ move: 'double-edge', pp: 15, maxPp: 15 }]
  player.hp = 2

  const battle = createBattle({
    playerMon: player,
    wildMon: aPokemon(16, 5),
    seed: 5,
  })

  const texts = textsOf(submitAction(battle, { type: 'move', index: 0 }))

  expect(texts).toContain('the wild Pidgey fainted!')
  expect(texts).toContain('Snorlax fainted!')
  expect(
    battle.outcome,
    'the foe went down to the hit, the user to recoil',
  ).toBe('win')
  expect(battle.rewards.exp).toBeGreaterThan(0)
})

test('Should knock the user of Self-Destruct out even when the target survives the blast', () => {
  const player = aPokemon(143, 50)
  const foe = aPokemon(100, 20)

  player.moves = [{ move: 'growl', pp: 40, maxPp: 40 }]
  foe.moves = [{ move: 'self-destruct', pp: 5, maxPp: 5 }]

  const battle = createBattle({ playerMon: player, wildMon: foe, seed: 5 })

  const texts = textsOf(submitAction(battle, { type: 'move', index: 0 }))

  expect(texts).toContain('the wild Voltorb used Self-Destruct!')
  expect(foe.hp, 'the blast takes the user down with it').toBe(0)
  expect(player.hp).toBeGreaterThan(0)
  expect(player.hp).toBeLessThan(player.stats.hp)
  expect(texts).toContain('the wild Voltorb fainted!')
  expect(battle.outcome).toBe('win')
})

test('Should let Leech Seed sap a fainted Pokemon without bringing it back', () => {
  const player = aPokemon(143, 40)
  const foe = aPokemon(1, 40)

  player.moves = [{ move: 'growl', pp: 40, maxPp: 40 }]
  player.status = 'poison'
  player.hp = 1
  foe.moves = [{ move: 'growl', pp: 40, maxPp: 40 }]

  const battle = createBattle({ playerMon: player, wildMon: foe, seed: 1 })

  battle.foe.volatile.leechSeed = true

  submitAction(battle, { type: 'move', index: 0 })

  expect(player.hp, 'the poison knocked it out and it stays out').toBe(0)
  expect(battle.outcome).toBe('loss')
})

test('Should keep the sleep counter running when confusion lands on a sleeping foe', () => {
  const player = aPokemon(94, 40)
  const foe = aPokemon(143, 40)

  player.moves = [{ move: 'confuse-ray', pp: 10, maxPp: 10 }]
  foe.moves = [{ move: 'tackle', pp: 35, maxPp: 35 }]
  foe.status = 'sleep'
  foe.statusTurns = 3

  const battle = createBattle({ playerMon: player, wildMon: foe, seed: 1 })

  submitAction(battle, { type: 'move', index: 0 })

  expect(battle.foe.volatile.confusion).toBeGreaterThan(0)
  expect(foe.statusTurns, 'confusion must not stall the sleep').toBe(2)
})

test('Should fall back to Struggle when the only move left is disabled', () => {
  const player = aPokemon(143, 40)
  const foe = aPokemon(16, 40)

  player.moves = [{ move: 'tackle', pp: 35, maxPp: 35 }]
  foe.moves = [{ move: 'tackle', pp: 35, maxPp: 35 }]

  const battle = createBattle({ playerMon: player, wildMon: foe, seed: 1 })

  battle.foe.volatile.disable = { index: 0, turn: 0, turns: 5 }

  const texts = textsOf(submitAction(battle, { type: 'move', index: 0 }))

  expect(texts).toContain('the wild Pidgey used Struggle!')
  expect(texts.some((text) => text.includes('is disabled'))).toBe(false)
})

test('Should ignore an action once the battle is over', () => {
  const battle = createBattle({
    playerMon: aPokemon(4, 20),
    wildMon: aPokemon(16, 10),
    seed: 7,
  })

  submitAction(battle, { type: 'ball', key: 'master-ball' })

  expect(battle.over).toBe(true)

  const events = submitAction(battle, { type: 'move', index: 0 })

  expect(events).toEqual([])
})

test('Should keep playing after a round trip through JSON', () => {
  const battle = createBattle({
    playerMon: aPokemon(4, 20),
    wildMon: aPokemon(16, 10),
    seed: 77,
  })

  submitAction(battle, { type: 'move', index: 0 })

  const revived = JSON.parse(JSON.stringify(battle))
  const events = submitAction(revived, { type: 'move', index: 0 })

  expect(
    events.length,
    'should keep playing after being rehydrated',
  ).toBeGreaterThan(0)
})
