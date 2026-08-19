import { MAX_LEVEL, MOVE_LIMIT, MOVE_SLOTS_FULL_LINE } from './constants.mjs'
import { move as moveData, species } from './data.mjs'
import { movesLearnedAt } from './learnset.mjs'
import {
  displayName,
  evolveInto,
  isFainted,
  levelOf,
  makeMoveSlot,
  pendingEvolution,
  refreshStats,
} from './pokemon.mjs'
import { markCaught } from './state.mjs'

const learnMovesAt = (mon, level) => {
  const steps = []

  for (const name of movesLearnedAt(mon.species, level)) {
    if (mon.moves.some((slot) => slot.move === name)) continue

    if (mon.moves.length < MOVE_LIMIT) {
      mon.moves.push(makeMoveSlot(name))
      steps.push({ kind: 'learn', move: name, mon, name: displayName(mon) })
    } else {
      steps.push({
        kind: 'learn-choice',
        move: name,
        mon,
        name: displayName(mon),
      })
    }
  }

  return steps
}

const gainExp = (save, mon, amount) => {
  const steps = []
  const before = levelOf(mon)

  mon.exp += amount
  steps.push({ kind: 'exp', amount, mon, name: displayName(mon) })

  const after = levelOf(mon)

  if (after === before) return steps

  for (let level = before + 1; level <= after; level++) {
    refreshStats(mon)
    steps.push({
      kind: 'level',
      level,
      mon,
      name: displayName(mon),
      stats: { ...mon.stats },
    })

    steps.push(...learnMovesAt(mon, level))

    const target = pendingEvolution(mon, level)

    if (target) {
      const from = mon.species

      evolveInto(mon, target)
      markCaught(save, target)
      steps.push({
        kind: 'evolve',
        from,
        to: target,
        mon,
        name: species(target).name,
      })
      steps.push(...learnMovesAt(mon, level))
    }
  }

  if (levelOf(mon) >= MAX_LEVEL)
    steps.push({ kind: 'maxed', mon, name: displayName(mon) })

  return steps
}

export const applyVictory = (save, mons, rewards) => {
  const steps = []

  if (rewards.money > 0) {
    save.money += rewards.money
    steps.push({ kind: 'money', amount: rewards.money })
  }

  for (const mon of mons) {
    if (isFainted(mon)) continue

    steps.push(...gainExp(save, mon, rewards.exp))
  }

  return steps
}

export const learnEvolutionMoves = (mon) => learnMovesAt(mon, levelOf(mon))

export const learnMovesUnattended = (mon, level) => {
  const steps = []

  for (const learned of movesLearnedAt(mon.species, level)) {
    if (mon.moves.some((slot) => slot.move === learned)) continue

    const forgot = mon.moves.length < MOVE_LIMIT ? null : mon.moves.shift().move

    mon.moves.push(makeMoveSlot(learned))
    steps.push({
      kind: forgot ? 'learn-swap' : 'learn',
      move: learned,
      forgot,
      mon,
      name: displayName(mon),
    })
  }

  return steps
}

export const learnMove = (mon, newMove, slotIndex) => {
  if (slotIndex === null || slotIndex === undefined) {
    return { learned: false, forgot: null }
  }

  const forgot = mon.moves[slotIndex].move

  mon.moves[slotIndex] = makeMoveSlot(newMove)

  return { learned: true, forgot }
}

export const describeStep = (step) => {
  switch (step.kind) {
    case 'money':
      return [`You got ${step.amount}₽ for winning!`]
    case 'exp':
      return [`${step.name} gained ${step.amount} EXP. Points!`]
    case 'level':
      return [`${step.name} grew to level ${step.level}!`]
    case 'learn':
      return [`${step.name} learned ${moveData(step.move).name}!`]
    case 'learn-swap':
      return [
        `${step.name} forgot ${moveData(step.forgot).name} and learned ${moveData(step.move).name}!`,
      ]
    case 'learn-choice':
      return [
        `${step.name} wants to learn ${moveData(step.move).name},`,
        MOVE_SLOTS_FULL_LINE,
      ]
    case 'evolve':
      return [`Congratulations! Your Pokémon evolved into ${step.name}!`]
    case 'maxed':
      return [`${step.name} has reached the highest level.`]
    default:
      return []
  }
}
