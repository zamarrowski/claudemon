import { existsSync } from 'node:fs'
import {
  shinySpriteFile,
  spriteFile,
  trainerSpriteFile,
} from '../src/node/paths.mjs'
import { TRAINER_CLASSES } from '../src/constants.mjs'
import { loadDataset } from '../src/node/dataset.mjs'
import { bold, brightGreen, brightRed, dim } from '../src/node/ansi.mjs'
import {
  DAMAGE_CLASSES,
  FAILURE_LIST_LIMIT,
  KANTO,
  SPECIAL_DAMAGE_MOVES,
  SPRITE_SIDES,
  STAT_KEYS,
} from './constants.mjs'

const failures = []
const checks = { run: 0 }

const check = (description, condition, detail = '') => {
  checks.run++

  if (!condition)
    failures.push(`${description}${detail ? ` ${dim(`(${detail})`)}` : ''}`)
}

const readDataset = () => {
  try {
    return loadDataset()
  } catch (error) {
    console.error(
      `\n${brightRed('✘')} cannot read the dataset: ${error.message}`,
    )
    console.error(`  Run ${bold('node tools/fetch-data.mjs')} first.\n`)
    process.exit(1)
  }
}

const { pokedex, byId, moves, types, growth } = readDataset()

check(
  `pokedex holds ${KANTO} entries`,
  pokedex.length === KANTO,
  `got ${pokedex.length}`,
)

for (let id = 1; id <= KANTO; id++) {
  check(`#${id} is present`, byId.has(id))
}

for (const mon of pokedex) {
  const label = `#${mon.id} ${mon.name}`

  check(
    `${label} has a name`,
    typeof mon.name === 'string' && mon.name.length > 0,
  )
  check(
    `${label} has 1-2 types`,
    mon.types.length >= 1 && mon.types.length <= 2,
  )
  for (const type of mon.types) {
    check(`${label} type "${type}" is in the type chart`, type in types)
  }

  for (const stat of Object.values(STAT_KEYS)) {
    check(
      `${label} has ${stat}`,
      Number.isInteger(mon.stats[stat]) && mon.stats[stat] > 0,
    )
  }

  check(
    `${label} has base exp`,
    Number.isInteger(mon.baseExp) && mon.baseExp > 0,
  )
  check(
    `${label} capture rate is 1-255`,
    mon.captureRate >= 1 && mon.captureRate <= 255,
    String(mon.captureRate),
  )
  check(
    `${label} growth curve exists`,
    mon.growthRate in growth,
    mon.growthRate,
  )
  check(
    `${label} gender ratio is -1 or 0-8`,
    Number.isInteger(mon.genderRate) &&
      mon.genderRate >= -1 &&
      mon.genderRate <= 8,
    String(mon.genderRate),
  )

  check(`${label} has a learnset`, mon.learnset.length > 0)
  check(
    `${label} knows something at level 1`,
    mon.learnset.some((entry) => entry.level <= 1),
  )
  for (const entry of mon.learnset) {
    check(`${label} move "${entry.move}" exists`, entry.move in moves)
  }

  for (const evolution of mon.evolutions) {
    check(
      `${label} evolves into a real Pokemon`,
      byId.has(evolution.to),
      `-> ${evolution.to}`,
    )
    check(
      `${label} evolution stays in Kanto`,
      evolution.to <= KANTO,
      `-> ${evolution.to}`,
    )
  }

  check(
    `${label} stage is 0-2`,
    [0, 1, 2].includes(mon.stage),
    String(mon.stage),
  )
  if (mon.evolvesFrom !== null) {
    check(
      `${label} pre-evolution is in Kanto`,
      byId.has(mon.evolvesFrom),
      `<- ${mon.evolvesFrom}`,
    )
    check(
      `${label} stage is one above its pre-evolution`,
      mon.stage === (byId.get(mon.evolvesFrom)?.stage ?? -99) + 1,
    )
  } else {
    check(`${label} with no pre-evolution is stage 0`, mon.stage === 0)
  }

  for (const side of SPRITE_SIDES) {
    check(
      `${label} ${side} sprite is on disk`,
      existsSync(spriteFile(side, mon.id, 'png')),
    )
    check(
      `${label} shiny ${side} sprite is on disk`,
      existsSync(shinySpriteFile(side, mon.id, 'png')),
    )
  }
}

for (const entry of TRAINER_CLASSES) {
  check(`${entry.name} has trainer sprites`, entry.sprites.length > 0)

  for (const name of entry.sprites) {
    check(
      `${entry.name} sprite ${name} is on disk`,
      existsSync(trainerSpriteFile(name)),
    )
  }
}

for (const [key, move] of Object.entries(moves)) {
  check(`move ${key} has a type in the chart`, move.type in types)
  check(
    `move ${key} has a damage class`,
    DAMAGE_CLASSES.includes(move.damageClass),
    move.damageClass,
  )
  check(`move ${key} has PP`, Number.isInteger(move.pp) && move.pp > 0)

  if (move.damageClass === 'status') {
    check(
      `status move ${key} has no power`,
      move.power === null,
      String(move.power),
    )
  } else if (move.power === null) {
    check(
      `damaging move ${key} without power is a known special case`,
      SPECIAL_DAMAGE_MOVES.has(key),
      'needs handling in the battle engine',
    )
  } else {
    check(`damaging move ${key} has power`, move.power > 0, String(move.power))
  }
}

for (const [name, table] of Object.entries(growth)) {
  check(
    `curve ${name} covers 100 levels`,
    table.length === 101,
    `length ${table.length}`,
  )
  check(`curve ${name} starts at 0`, table[1] === 0, String(table[1]))

  let rising = true

  for (let level = 2; level <= 100; level++) {
    if (table[level] <= table[level - 1]) rising = false
  }

  check(`curve ${name} increases every level`, rising)
}

const fact = (description, condition, detail) => {
  return check(`FACT: ${description}`, condition, detail)
}

const charizard = byId.get(6)
fact(
  'Charizard is Fire/Flying',
  charizard.types.join('/') === 'fire/flying',
  charizard.types.join('/'),
)
fact(
  'Charizard is a second evolution',
  charizard.stage === 2,
  String(charizard.stage),
)
fact(
  'Charizard comes from Charmeleon',
  charizard.evolvesFrom === 5,
  String(charizard.evolvesFrom),
)

const bulbasaur = byId.get(1)
fact(
  'Bulbasaur evolves at 16',
  bulbasaur.evolutions[0]?.to === 2 && bulbasaur.evolutions[0]?.level === 16,
  JSON.stringify(bulbasaur.evolutions[0]),
)

const eevee = byId.get(133)
fact(
  'Eevee has three evolutions',
  eevee.evolutions.length === 3,
  String(eevee.evolutions.length),
)
fact(
  'Eevee evolves by stone',
  eevee.evolutions.every((evolution) => evolution.item?.endsWith('-stone')),
  eevee.evolutions.map((e) => e.item).join(', '),
)

const pikachu = byId.get(25)
fact(
  'Pikachu needs a Thunder Stone',
  pikachu.evolutions[0]?.item === 'thunder-stone',
  String(pikachu.evolutions[0]?.item),
)
fact(
  'Pikachu knows Thunder Shock at level 1',
  pikachu.learnset.some(
    (entry) => entry.move === 'thunder-shock' && entry.level <= 1,
  ),
)

const machoke = byId.get(67)
fact(
  'Machoke evolves by trade',
  machoke.evolutions[0]?.trigger === 'trade',
  machoke.evolutions[0]?.trigger,
)

const mewtwo = byId.get(150)
fact('Mewtwo is legendary', mewtwo.legendary === true)
fact(
  'Mewtwo is hard to catch',
  mewtwo.captureRate === 3,
  String(mewtwo.captureRate),
)
fact(
  'Mewtwo has no gender',
  mewtwo.genderRate === -1,
  String(mewtwo.genderRate),
)

fact(
  'Nidoran♀ is always female',
  byId.get(29).genderRate === 8,
  String(byId.get(29).genderRate),
)
fact(
  'Nidoran♂ is always male',
  byId.get(32).genderRate === 0,
  String(byId.get(32).genderRate),
)
fact(
  'Bulbasaur is one-eighth female',
  byId.get(1).genderRate === 1,
  String(byId.get(1).genderRate),
)

const caterpie = byId.get(10)
fact(
  'Caterpie is easy to catch',
  caterpie.captureRate === 255,
  String(caterpie.captureRate),
)

const charmander = byId.get(4)
fact(
  'Charmander learns Ember',
  charmander.learnset.some((entry) => entry.move === 'ember'),
)
fact(
  'Charmander starts with Scratch',
  charmander.learnset.some(
    (entry) => entry.move === 'scratch' && entry.level <= 1,
  ),
)

fact('Water beats Fire', types.water.double.includes('fire'))
fact('Fire is weak into Water', types.fire.half.includes('water'))
fact('Normal cannot hit Ghost', types.normal.zero.includes('ghost'))
fact('Electric cannot hit Ground', types.electric.zero.includes('ground'))

fact('Tackle is physical', moves.tackle.damageClass === 'physical')
fact(
  'Growl lowers Attack',
  moves.growl.statChanges.some(
    (change) => change.stat === 'attack' && change.change === -1,
  ),
)
fact(
  'Thunder Wave paralyses',
  moves['thunder-wave'].ailment === 'paralysis',
  moves['thunder-wave'].ailment,
)
fact('Ember can burn', moves.ember.ailment === 'burn', moves.ember.ailment)
fact(
  'Hyper Beam hits hard',
  moves['hyper-beam'].power === 150,
  String(moves['hyper-beam'].power),
)

fact(
  'medium-slow tops out at 1,059,860 exp',
  growth['medium-slow'][100] === 1059860,
  String(growth['medium-slow'][100]),
)

console.log(bold('\nDataset check\n'))
console.log(
  `  ${pokedex.length} Pokemon, ${Object.keys(moves).length} moves, ` +
    `${Object.keys(types).length} types, ${Object.keys(growth).length} exp curves`,
)
console.log(`  ${checks.run} assertions\n`)

if (failures.length === 0) {
  console.log(`  ${brightGreen('✔')} everything checks out\n`)
} else {
  console.log(`  ${brightRed('✘')} ${failures.length} failed:\n`)

  for (const failure of failures.slice(0, FAILURE_LIST_LIMIT))
    console.log(`    ${failure}`)

  if (failures.length > FAILURE_LIST_LIMIT)
    console.log(
      `    ${dim(`...and ${failures.length - FAILURE_LIST_LIMIT} more`)}`,
    )

  console.log()
  process.exit(1)
}
