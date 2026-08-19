import { STAT_NAMES } from '../../constants.mjs'
import { loadData, species } from '../../data.mjs'
import { monSpriteFile } from '../../paths.mjs'
import { speciesGender, speciesName } from '../../pokemon.mjs'
import { timesFaced } from '../../state.mjs'
import { bold, brightYellow, dim, gray } from '../ansi.mjs'
import { fitCanvasCols, loadSprite } from '../sprite.mjs'
import {
  genderTag,
  hintLine,
  hpBar,
  menuList,
  padRight,
  shinyTag,
  typeBadge,
  withFooter,
  wrap,
} from '../widgets.mjs'
import {
  BASE_STAT_MAX,
  COLUMN_DIVIDER,
  DEX_DETAIL_GAP,
  DEX_HINTS,
  DEX_LIST_WIDTH,
  DEX_MESSAGES,
  DEX_PAGE_STEP,
  DEX_ROWS_RESERVED,
  DEX_SORT_LABELS,
  DEX_SPRITE_RESERVED_ROWS,
  DEX_TITLE,
  DEX_UNKNOWN_NAME,
  KANTO_TOTAL,
  LIST_HEIGHT_FLOOR,
  STAT_GLYPHS,
} from './constants.mjs'
import {
  dexMark,
  dexSelectionAfterSort,
  evolutionWording,
  nextDexSort,
  sortedDex,
  zipColumns,
} from './helpers.mjs'

const dexEntries = (ctx) => sortedDex(loadData().pokedex, ctx.dexSort)

export const draw = (ctx, size) => {
  const { cols, rows } = size
  const lines = []
  const overlays = []

  const dex = dexEntries(ctx)
  const selected = dex[ctx.dexSelection]
  const caught = ctx.save.dex.caught.includes(selected.id)
  const seen = caught || ctx.save.dex.seen.includes(selected.id)
  const shiny = ctx.save.dex.shiny.includes(selected.id)

  const detailLeft = DEX_LIST_WIDTH + DEX_DETAIL_GAP
  const sortLabel = DEX_SORT_LABELS[ctx.dexSort]

  lines.push(
    ` ${brightYellow('◓')} ${bold(DEX_TITLE)}   ${dim(
      `${ctx.save.dex.caught.length} caught · ${ctx.save.dex.seen.length} seen · of ${KANTO_TOTAL} · sort ${sortLabel}`,
    )}`,
  )
  lines.push('')

  const entries = dex.map((mon) => {
    const number = dim(String(mon.id).padStart(3, '0'))
    const isCaught = ctx.save.dex.caught.includes(mon.id)
    const isSeen = isCaught || ctx.save.dex.seen.includes(mon.id)
    const mark = dexMark(isCaught, isSeen)
    const name = isSeen
      ? `${speciesName(mon.id)}${genderTag(speciesGender(mon.id))}${shinyTag(
          ctx.save.dex.shiny.includes(mon.id),
        )}`
      : gray(DEX_UNKNOWN_NAME)

    return `${number} ${mark} ${name}`
  })

  const listHeight = Math.max(LIST_HEIGHT_FLOOR, rows - DEX_ROWS_RESERVED)

  const list = menuList(entries, ctx.dexSelection, {
    height: listHeight,
    width: DEX_LIST_WIDTH,
  })

  const detail = []

  if (seen) {
    detail.push(
      `${bold(speciesName(selected.id).toUpperCase())}${genderTag(
        speciesGender(selected.id),
      )}${shinyTag(shiny)}  ${dim(`#${String(selected.id).padStart(3, '0')}`)}`,
    )
    detail.push(selected.types.map(typeBadge).join(' '))

    const faced = timesFaced(ctx.save, selected.id)

    if (faced > 0)
      detail.push(dim(`Faced ${faced === 1 ? 'once' : `${faced} times`}`))

    if (shiny) detail.push(dim(DEX_MESSAGES.shinyCaught))

    detail.push('')

    if (caught) {
      const stats = selected.stats

      detail.push(dim(DEX_MESSAGES.baseStats))

      for (const key of STAT_NAMES) {
        detail.push(
          `${STAT_GLYPHS[key]} ${hpBar(stats[key], BASE_STAT_MAX, 18)} ${String(stats[key]).padStart(3)}`,
        )
      }

      detail.push('')
      detail.push(
        dim(
          `Catch rate ${selected.captureRate} · Base exp ${selected.baseExp}`,
        ),
      )
      const evolves = selected.evolutions.map((evolution) => {
        return `${species(evolution.to).name} ${evolutionWording(evolution)}`
      })

      if (evolves.length > 0)
        detail.push(dim(`${DEX_MESSAGES.evolvesInto} ${evolves.join(', ')}`))
    } else {
      detail.push(dim(DEX_MESSAGES.notCaught))
      detail.push(dim(DEX_MESSAGES.fillItIn))
    }
  } else {
    detail.push(gray(DEX_MESSAGES.noData))
  }

  const sprite = seen
    ? loadSprite(monSpriteFile('front', selected.id, shiny), {
        cols: Math.min(
          fitCanvasCols(size, DEX_SPRITE_RESERVED_ROWS, ctx.spriteScale),
          (cols - detailLeft - 4) * 2,
        ),
      })
    : null

  const spriteBlock = sprite ? sprite.rows : []
  const rightColumn = [...detail, '', ...spriteBlock]

  for (const [listRow, detailRow] of zipColumns(list, rightColumn)) {
    const left = padRight(listRow, DEX_LIST_WIDTH)

    lines.push(` ${left}  ${dim(COLUMN_DIVIDER)}  ${detailRow}`)
  }

  return {
    lines: withFooter(lines, hintLine(DEX_HINTS), rows),
    overlays,
  }
}

export const onKey = (ctx, key) => {
  const dex = dexEntries(ctx)
  const total = dex.length
  const step =
    key.name === 'pageup' || key.name === 'pagedown' ? DEX_PAGE_STEP : 1

  if (key.name === 'up' || key.name === 'k')
    ctx.dexSelection = wrap(ctx.dexSelection - 1, total)
  else if (key.name === 'down' || key.name === 'j')
    ctx.dexSelection = wrap(ctx.dexSelection + 1, total)
  else if (key.name === 'pageup')
    ctx.dexSelection = Math.max(0, ctx.dexSelection - step)
  else if (key.name === 'pagedown')
    ctx.dexSelection = Math.min(total - 1, ctx.dexSelection + step)
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
  } else if (key.name === 'escape' || key.name === 'q') ctx.setMode('home')
}
