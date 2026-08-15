import { GYMS, PARTY_SORT } from '../../../src/constants.mjs'
import { typeColor } from '../../../src/format.mjs'
import { sortedPartyEntries } from '../../../src/helpers.mjs'
import { hasBadge } from '../../../src/state.mjs'
import { html, raw } from '../dom.mjs'
import { monSpriteUrl } from '../sprites.mjs'
import { DEX_SORT, EVOLUTION_WORDING } from './constants.mjs'

export { sortedPartyEntries }

export const wrap = (index, length) => {
  if (length <= 0) return 0

  return ((index % length) + length) % length
}

export const clampSelection = (selection, total) => {
  return Math.max(0, Math.min(selection, total - 1))
}

export const cssColor = ([r, g, b]) => `rgb(${r} ${g} ${b})`

export const typeBadge = (type) => {
  return html`<span class="type" style="background:${cssColor(typeColor(type))}"
    >${type}</span
  >`
}

export const speciesSprite = (id, { size = 'md', side = 'front', shiny }) => {
  return html`<img
    class="sprite sprite--${raw(size)}"
    src="${monSpriteUrl(side, id, shiny)}"
    data-fallback="${monSpriteUrl(side, id, false)}"
    alt=""
  />`
}

export const monSprite = (mon, size = 'md', side = 'front') => {
  return speciesSprite(mon.species, { size, side, shiny: mon.shiny })
}

export const hpBand = (fraction) => {
  if (fraction > 0.5) return 'healthy'
  if (fraction > 0.2) return 'hurt'

  return 'low'
}

export const hpBar = (current, total) => {
  const fraction = total > 0 ? Math.max(0, current) / total : 0

  return html`<span class="hp"
    ><span class="hp__track"
      ><span
        class="hp__fill"
        data-band="${hpBand(fraction)}"
        style="width:${Math.round(fraction * 100)}%"
      ></span></span
    ><span>${current}/${total}</span></span
  >`
}

export const badgeStrip = (save) => {
  return html`<span class="badge-tray"
    >${GYMS.map(
      (gym) =>
        html`<span
          class="badge"
          data-earned="${hasBadge(save, gym.id)}"
          style="${
            hasBadge(save, gym.id)
              ? `background:${cssColor(typeColor(gym.type))}`
              : ''
          }"
          title="${gym.badge}"
        ></span>`,
    )}</span
  >`
}

export const levelRangeLabel = (range) => {
  if (range.min === range.max) return `Lv${range.min}`

  return `Lv${range.min}-${range.max}`
}

export const evolutionWording = (evolution) => {
  if (evolution.trigger === 'level-up')
    return `${EVOLUTION_WORDING.level} ${evolution.level}`

  if (evolution.trigger === 'use-item')
    return `${EVOLUTION_WORDING.item} ${evolution.item.replace(/-/g, ' ')}`

  return EVOLUTION_WORDING.trade
}

export const sortedDex = (pokedex, sort) => {
  if (sort === DEX_SORT.name) {
    return [...pokedex].sort((a, b) => a.name.localeCompare(b.name))
  }

  return pokedex
}

export const partyEntryAt = (party, selection, sort) => {
  const entries = sortedPartyEntries(party, sort)

  return entries[clampSelection(selection, entries.length)]
}

export const nextPartySort = (sort) => {
  if (sort === PARTY_SORT.level) return PARTY_SORT.order

  return PARTY_SORT.level
}

export const partySelectionAfterSort = (party, selection, sort, nextSort) => {
  const current = partyEntryAt(party, selection, sort)

  return sortedPartyEntries(party, nextSort).findIndex(
    (entry) => entry.index === current.index,
  )
}

export const nextDexSort = (sort) => {
  if (sort === DEX_SORT.name) return DEX_SORT.number

  return DEX_SORT.name
}

export const dexSelectionAfterSort = (pokedex, selection, sort, nextSort) => {
  const current = sortedDex(pokedex, sort)[
    clampSelection(selection, pokedex.length)
  ]

  return sortedDex(pokedex, nextSort).findIndex((mon) => mon.id === current.id)
}

export const currentIndex = (setting, config) => {
  const index = setting.values.findIndex(
    (entry) => entry.value === setting.read(config),
  )

  return index < 0 ? 0 : index
}
