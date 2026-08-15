import { KANTO_TOTAL } from '../../../src/constants.mjs'
import { loadData, species } from '../../../src/data.mjs'
import { timesFaced } from '../../../src/state.mjs'
import { html } from '../dom.mjs'
import { hints, screenHead } from './chrome.mjs'
import {
  BASE_STAT_MAX,
  DEX_HINTS,
  DEX_MESSAGES,
  DEX_PAGE_STEP,
  DEX_SORT_LABELS,
  DEX_TITLE,
  DEX_UNKNOWN_NAME,
  STAT_LABELS_SHORT,
} from './constants.mjs'
import {
  clampSelection,
  cursorDelta,
  dexSelectionAfterSort,
  evolutionWording,
  nextDexSort,
  selector,
  sortedDex,
  speciesSprite,
  typeBadge,
  wrap,
} from './helpers.mjs'

const dexEntries = (ctx) => {
  const caught = new Set(ctx.save.dex.caught)
  const seen = new Set(ctx.save.dex.seen)
  const shiny = new Set(ctx.save.dex.shiny)

  return sortedDex(loadData().pokedex, ctx.dexSort).map((entry) => {
    return {
      entry,
      caught: caught.has(entry.id),
      seen: seen.has(entry.id),
      shiny: shiny.has(entry.id),
    }
  })
}

const stateOf = (row) => {
  if (row.caught) return 'caught'
  if (row.seen) return 'seen'

  return 'unseen'
}

const statRow = (name, value) => {
  return html`<div>
      ${STAT_LABELS_SHORT[name]}
      <span class="level">${value}</span>
    </div>
    <div class="exp__track">
      <div
        class="exp__fill"
        style="width:${Math.min(100, (value / BASE_STAT_MAX) * 100)}%"
      ></div>
    </div>`
}

const detail = (ctx, row) => {
  if (!row) return ''

  const { entry, caught, seen, shiny } = row

  if (!caught) {
    return html`<aside class="panel detail">
      ${speciesSprite(entry.id, { size: 'lg', shiny: false })}
      <p class="name">${seen ? entry.name : DEX_UNKNOWN_NAME}</p>
      <p class="hint">${seen ? DEX_MESSAGES.notCaught : DEX_MESSAGES.noData}</p>
      <p class="hint">${DEX_MESSAGES.fillItIn}</p>
    </aside>`
  }

  return html`<aside class="panel detail">
    ${speciesSprite(entry.id, { size: 'lg', shiny })}
    <p class="name">
      ${entry.name}
      ${shiny ? html`<span class="tag tag--shiny">shiny</span>` : ''}
    </p>
    <div class="types">${entry.types.map(typeBadge)}</div>
    <p class="hint">${DEX_MESSAGES.baseStats}</p>
    <div class="detail__stats">
      ${Object.entries(entry.stats).map(([name, value]) =>
        statRow(name, value),
      )}
    </div>
    ${
      entry.evolutions.length > 0
        ? html`<p class="hint">
            ${DEX_MESSAGES.evolvesInto}
            ${entry.evolutions.map(
              (evolution) =>
                html`<span class="pill"
                  >${species(evolution.to).name}
                  ${evolutionWording(evolution)}</span
                >`,
            )}
          </p>`
        : ''
    }
    <p class="hint">Faced ${timesFaced(ctx.save, entry.id)}×</p>
  </aside>`
}

export const draw = (ctx) => {
  const rows = dexEntries(ctx)
  const selection = clampSelection(ctx.dexSelection, rows.length)

  return html`<div class="screen">
    ${screenHead(
      DEX_TITLE,
      `${ctx.save.dex.caught.length}/${KANTO_TOTAL} · ${DEX_SORT_LABELS[ctx.dexSort]}`,
    )}
    <div class="split">
      <div class="dex">
        ${rows.map(
          (row, index) =>
            html`<button
              class="dex__cell"
              type="button"
              aria-selected="${index === selection}"
              data-state="${stateOf(row)}"
              data-index="${index}"
            >
              <span class="dex__number"
                >#${String(row.entry.id).padStart(3, '0')}</span
              >
              ${speciesSprite(row.entry.id, { size: 'sm', shiny: false })}
              <span class="dex__name"
                >${row.seen ? row.entry.name : DEX_UNKNOWN_NAME}</span
              >
            </button>`,
        )}
      </div>
      ${detail(ctx, rows[selection])}
    </div>
    ${hints(DEX_HINTS, ctx.version)}
  </div>`
}

export const select = selector('dexSelection')

export const onKey = (ctx, key) => {
  const total = loadData().pokedex.length
  const delta = cursorDelta(ctx, key)

  if (delta) ctx.dexSelection = wrap(ctx.dexSelection + delta, total)
  else if (key.name === 'pageup')
    ctx.dexSelection = Math.max(0, ctx.dexSelection - DEX_PAGE_STEP)
  else if (key.name === 'pagedown')
    ctx.dexSelection = Math.min(total - 1, ctx.dexSelection + DEX_PAGE_STEP)
  else if (key.name === 's') {
    const pokedex = loadData().pokedex
    const nextSort = nextDexSort(ctx.dexSort)

    ctx.dexSelection = dexSelectionAfterSort(
      pokedex,
      ctx.dexSelection,
      ctx.dexSort,
      nextSort,
    )
    ctx.dexSort = nextSort
  } else if (key.name === 'esc' || key.name === 'q') ctx.setMode('home')
}
