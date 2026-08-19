import { canEvolveByStone, levelOf, levelUpEvolution } from '../pokemon.mjs'
import {
  bg,
  bold,
  brightCyan,
  brightYellow,
  CLEAR,
  dim,
  fg,
  gray,
} from './ansi.mjs'
import {
  BADGE_LUMINANCE_CUTOFF,
  BADGE_TEXT_COLOURS,
  DEFAULT_BAR_WIDTH,
  DEFAULT_MENU_COLUMNS,
  DEFAULT_MENU_HEIGHT,
  DEFAULT_MENU_WIDTH,
  DEFAULT_TYPE_COLOR,
  EVOLVES_MARK,
  EXP_BAR_COLOUR,
  EXP_BAR_GLYPH,
  FULL_BLOCK,
  GENDER_MARKS,
  HINT_KEY_PATTERN,
  LEVEL_EVO_PREFIX,
  HP_BAR_COLOURS,
  HP_BAR_EMPTY_GLYPH,
  HP_BAR_THRESHOLDS,
  SHINY_MARK,
  STATUS_TAGS,
  TRAINER_TRAY_COLOUR,
  TRAINER_TRAY_GLYPHS,
  TYPE_COLORS,
  UNKNOWN_STATUS_TAG,
} from './constants.mjs'
import { truncate, visibleLength } from './text.mjs'

export const typeColor = (type) => TYPE_COLORS[type] ?? DEFAULT_TYPE_COLOR

export const wrap = (index, length) => {
  if (length <= 0) return 0

  return ((index % length) + length) % length
}

export const money = (amount) => `${amount.toLocaleString('en-US')}₽`

export const elapsed = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000))

  if (total < 60) return `${total}s`

  const minutes = Math.floor(total / 60)

  if (minutes < 60) return `${minutes}m${String(total % 60).padStart(2, '0')}s`

  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

export const typeBadge = (type) => {
  const [r, g, b] = typeColor(type)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  const text =
    luminance > BADGE_LUMINANCE_CUTOFF
      ? fg(...BADGE_TEXT_COLOURS.dark)
      : fg(...BADGE_TEXT_COLOURS.light)

  return `${bg(r, g, b)}${text} ${type.toUpperCase()} ${CLEAR}`
}

export const padRight = (text, width) => {
  return text + ' '.repeat(Math.max(0, width - visibleLength(text)))
}

export const padLeft = (text, width) => {
  return ' '.repeat(Math.max(0, width - visibleLength(text))) + text
}

export const centre = (text, width) => {
  const slack = Math.max(0, width - visibleLength(text))

  return ' '.repeat(Math.floor(slack / 2)) + text
}

const hpBarColour = (fraction) => {
  if (fraction > HP_BAR_THRESHOLDS.healthy) return HP_BAR_COLOURS.healthy
  if (fraction > HP_BAR_THRESHOLDS.hurt) return HP_BAR_COLOURS.hurt

  return HP_BAR_COLOURS.critical
}

export const hpBar = (current, max, width = DEFAULT_BAR_WIDTH) => {
  const fraction = max > 0 ? Math.max(0, current / max) : 0
  const filled =
    current > 0 ? Math.min(width, Math.max(1, Math.round(fraction * width))) : 0

  const [r, g, b] = hpBarColour(fraction)

  return `${fg(r, g, b)}${FULL_BLOCK.repeat(filled)}${CLEAR}${gray(HP_BAR_EMPTY_GLYPH.repeat(width - filled))}`
}

export const expBar = (fraction, width = DEFAULT_BAR_WIDTH) => {
  const filled = Math.max(0, Math.min(width, Math.round(fraction * width)))

  return `${fg(...EXP_BAR_COLOUR)}${EXP_BAR_GLYPH.repeat(filled)}${CLEAR}${gray(EXP_BAR_GLYPH.repeat(width - filled))}`
}

export const trainerTray = (remaining, total) => {
  const left = TRAINER_TRAY_GLYPHS.left.repeat(remaining)
  const lost = TRAINER_TRAY_GLYPHS.lost.repeat(total - remaining)

  return `${fg(...TRAINER_TRAY_COLOUR)}${left}${CLEAR}${gray(lost)}`
}

const panelRow = (line, inner) => {
  if (visibleLength(line) <= inner) return padRight(line, inner)

  return truncate(line, inner - 1)
}

export const panel = (lines, width, { title = null } = {}) => {
  const inner = Math.max(4, width - 2)
  const out = []

  const heading = title ? `─ ${bold(title)} ` : ''
  const headingWidth = visibleLength(heading)

  out.push(`┌${heading}${'─'.repeat(Math.max(0, inner - headingWidth))}┐`)

  for (const line of lines) {
    out.push(`│${panelRow(line, inner)}│`)
  }

  out.push(`└${'─'.repeat(inner)}┘`)

  return out
}

export const menuGrid = (
  items,
  selected,
  { columns = DEFAULT_MENU_COLUMNS, width = DEFAULT_MENU_WIDTH },
) => {
  const cellWidth = Math.floor(width / columns)
  const rows = []

  for (let start = 0; start < items.length; start += columns) {
    let line = ''

    for (let column = 0; column < columns; column++) {
      const index = start + column

      if (index >= items.length) break

      const chosen = index === selected
      const label = `${chosen ? '▶ ' : '  '}${chosen ? bold(items[index]) : items[index]}`

      line += padRight(label, cellWidth)
    }

    rows.push(line)
  }

  return rows
}

export const menuList = (
  items,
  selected,
  { height = DEFAULT_MENU_HEIGHT, width = DEFAULT_MENU_WIDTH },
) => {
  const half = Math.floor(height / 2)
  const start = Math.max(0, Math.min(selected - half, items.length - height))

  const rows = []

  for (
    let index = start;
    index < Math.min(items.length, start + height);
    index++
  ) {
    const chosen = index === selected
    const label = `${chosen ? '▶ ' : '  '}${chosen ? bold(items[index]) : items[index]}`

    rows.push(padRight(label, width))
  }

  if (start > 0) rows[0] = padRight(`  ${dim('▲ more')}`, width)
  if (start + height < items.length)
    rows[rows.length - 1] = padRight(`  ${dim('▼ more')}`, width)

  return rows
}

export const withFooter = (lines, footer, rows) => {
  const footerRows = Array.isArray(footer) ? footer : [footer]
  const usable = Math.max(0, rows - 1 - footerRows.length)
  const out = lines.slice(0, usable)

  while (out.length < usable) out.push('')

  return [...out, ...footerRows]
}

const hintSegment = (segment) => {
  if (HINT_KEY_PATTERN.test(segment)) return brightYellow(segment)

  return dim(segment)
}

export const hintLine = (text) => {
  return text.split(HINT_KEY_PATTERN).filter(Boolean).map(hintSegment).join('')
}

export const statusTag = (status) => {
  if (!status) return ''

  const [label, [r, g, b]] = STATUS_TAGS[status] ?? UNKNOWN_STATUS_TAG

  return `${bg(r, g, b)}${fg(...BADGE_TEXT_COLOURS.dark)} ${label} ${CLEAR}`
}

export const genderTag = (gender) => {
  const mark = GENDER_MARKS[gender]

  if (!mark) return ''

  const [glyph, [r, g, b]] = mark

  return `${fg(r, g, b)}${glyph}${CLEAR}`
}

export const shinyTag = (shiny) => {
  if (!shiny) return ''

  return ` ${brightCyan(SHINY_MARK)}`
}

export const evolutionTag = (mon) => {
  const levelEvo = levelUpEvolution(mon)

  if (!levelEvo && canEvolveByStone(mon))
    return ` ${brightYellow(EVOLVES_MARK)}`
  if (!levelEvo) return ''

  const label = `${LEVEL_EVO_PREFIX}${levelEvo.level}`

  if (levelOf(mon) >= levelEvo.level) return ` ${brightYellow(label)}`

  return ` ${dim(label)}`
}
