import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { GYMS, KANTO_TOTAL } from '../constants.mjs'
import {
  CARD_ACHIEVEMENT_GAP,
  CARD_ACHIEVEMENT_RADIUS,
  CARD_ACHIEVEMENT_TOP,
  CARD_BADGE_GAP,
  CARD_BADGE_RADIUS,
  CARD_CELL_GAP,
  CARD_CELL_TEXT_HEIGHT,
  CARD_FOOTER_HEIGHT,
  CARD_HEADER_HEIGHT,
  CARD_HEIGHT,
  CARD_HP_BAR_HEIGHT,
  CARD_HP_THRESHOLDS,
  CARD_LABELS,
  CARD_LABEL_SCALE,
  CARD_MARGIN,
  CARD_NAME_SCALE,
  CARD_PALETTE,
  CARD_SHINY_RADIUS,
  CARD_TITLE_SCALE,
  CARD_WIDTH,
  WALKER,
  WALKER_PALETTE,
} from './constants.mjs'
import { achievementEntries, earnedCount } from '../achievements.mjs'
import { species } from '../data.mjs'
import { HOME, monSpriteFile } from './paths.mjs'
import { decodePng, encodePng } from './png.mjs'
import { displayName, levelOf } from '../pokemon.mjs'
import { daysOnTheRoad } from '../state.mjs'
import { workedHours } from '../worked.mjs'
import { readWorked } from './worked.mjs'
import {
  createCanvas,
  drawArt,
  drawDiamond,
  drawSprite,
  drawText,
  fillRect,
  textHeight,
  textWidth,
} from './canvas.mjs'
import { money, typeColor } from '../format.mjs'

const loadSpriteImage = (mon) => {
  try {
    return decodePng(
      readFileSync(monSpriteFile('front', mon.species, mon.shiny)),
    )
  } catch {
    return null
  }
}

const opaqueBounds = ({ width, height, pixels }) => {
  const bounds = { left: width, top: height, right: -1, bottom: -1 }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue

      bounds.left = Math.min(bounds.left, x)
      bounds.top = Math.min(bounds.top, y)
      bounds.right = Math.max(bounds.right, x)
      bounds.bottom = Math.max(bounds.bottom, y)
    }
  }

  return bounds
}

const cropSprite = (sprite) => {
  const bounds = opaqueBounds(sprite)

  if (bounds.right < bounds.left) return sprite

  const width = bounds.right - bounds.left + 1
  const height = bounds.bottom - bounds.top + 1
  const pixels = new Uint8Array(width * height * 4)

  for (let y = 0; y < height; y++) {
    const from = ((y + bounds.top) * sprite.width + bounds.left) * 4

    pixels.set(sprite.pixels.subarray(from, from + width * 4), y * width * 4)
  }

  return { width, height, pixels }
}

const fitScale = (sprite, boxWidth, boxHeight) => {
  const scale = Math.min(boxWidth / sprite.width, boxHeight / sprite.height)

  return Math.max(1, Math.floor(scale))
}

const hpColour = (fraction) => {
  const step = CARD_HP_THRESHOLDS.find((entry) => fraction > entry.above)

  if (!step) return CARD_PALETTE.red

  return step.colour
}

const drawRightText = (canvas, text, right, y, colour, scale) => {
  drawText(canvas, text, right - textWidth(text, scale), y, colour, scale)
}

const drawCentredText = (canvas, text, centre, y, colour, scale) => {
  const x = Math.round(centre - textWidth(text, scale) / 2)

  drawText(canvas, text, x, y, colour, scale)
}

const drawRule = (canvas, x, y, width) => {
  fillRect(canvas, x, y, width, 1, CARD_PALETTE.line)
}

const daysLabel = (days) => {
  const word = days === 1 ? CARD_LABELS.day : CARD_LABELS.days

  return `${days} ${word}`
}

const drawHeader = (canvas, save, now) => {
  const top = CARD_MARGIN

  drawArt(canvas, WALKER.stand, WALKER_PALETTE, CARD_MARGIN, top, 4)

  const nameX = CARD_MARGIN + 10 * 4 + 24

  drawText(
    canvas,
    save.trainer.name,
    nameX,
    top,
    CARD_PALETTE.text,
    CARD_TITLE_SCALE,
  )
  drawText(
    canvas,
    daysLabel(daysOnTheRoad(save, now)),
    nameX,
    top + textHeight(CARD_TITLE_SCALE) + 10,
    CARD_PALETTE.dim,
    CARD_LABEL_SCALE,
  )

  const right = CARD_WIDTH - CARD_MARGIN
  const caught = `${save.dex.caught.length}/${KANTO_TOTAL}`

  drawRightText(
    canvas,
    caught,
    right,
    top,
    CARD_PALETTE.green,
    CARD_TITLE_SCALE,
  )
  drawRightText(
    canvas,
    CARD_LABELS.pokedex,
    right,
    top + textHeight(CARD_TITLE_SCALE) + 10,
    CARD_PALETTE.dim,
    CARD_LABEL_SCALE,
  )

  drawRule(
    canvas,
    CARD_MARGIN,
    CARD_HEADER_HEIGHT,
    CARD_WIDTH - CARD_MARGIN * 2,
  )
}

const drawHpBar = (canvas, mon, x, y, width) => {
  const fraction = Math.max(0, Math.min(1, mon.hp / mon.stats.hp))

  fillRect(canvas, x, y, width, CARD_HP_BAR_HEIGHT, CARD_PALETTE.line)
  fillRect(
    canvas,
    x,
    y,
    Math.round(width * fraction),
    CARD_HP_BAR_HEIGHT,
    hpColour(fraction),
  )
}

const drawCellSprite = (canvas, mon, cell, centre) => {
  const image = loadSpriteImage(mon)

  if (!image) return

  const sprite = cropSprite(image)
  const boxHeight = cell.height - CARD_CELL_TEXT_HEIGHT
  const scale = fitScale(sprite, cell.width - CARD_CELL_GAP * 2, boxHeight)
  const width = sprite.width * scale
  const height = sprite.height * scale

  drawSprite(
    canvas,
    sprite,
    Math.round(centre - width / 2),
    cell.y + Math.round((boxHeight - height) / 2),
    scale,
  )
}

const drawMemberName = (canvas, mon, centre, y) => {
  const name = displayName(mon)
  const width = textWidth(name, CARD_NAME_SCALE)
  const x = Math.round(centre - width / 2)

  drawText(canvas, name, x, y, CARD_PALETTE.text, CARD_NAME_SCALE)

  if (!mon.shiny) return

  drawDiamond(
    canvas,
    x + width + CARD_SHINY_RADIUS * 2,
    y + CARD_SHINY_RADIUS + 2,
    CARD_SHINY_RADIUS,
    CARD_PALETTE.shiny,
  )
}

const drawMemberCell = (canvas, mon, cell) => {
  fillRect(canvas, cell.x, cell.y, cell.width, cell.height, CARD_PALETTE.panel)
  fillRect(
    canvas,
    cell.x,
    cell.y,
    cell.width,
    2,
    typeColor(species(mon.species).types[0]),
  )

  const centre = cell.x + cell.width / 2

  drawCellSprite(canvas, mon, cell, centre)

  const nameY = cell.y + cell.height - CARD_CELL_TEXT_HEIGHT + 10

  drawMemberName(canvas, mon, centre, nameY)
  drawCentredText(
    canvas,
    `L${levelOf(mon)}`,
    centre,
    nameY + textHeight(CARD_NAME_SCALE) + 10,
    CARD_PALETTE.amber,
    CARD_LABEL_SCALE,
  )

  const barWidth = Math.round(cell.width * 0.6)

  drawHpBar(
    canvas,
    mon,
    Math.round(centre - barWidth / 2),
    cell.y + cell.height - 20,
    barWidth,
  )
}

const cellAt = (index) => {
  const columns = 3
  const rows = 2
  const area = CARD_WIDTH - CARD_MARGIN * 2
  const width = Math.floor((area - CARD_CELL_GAP * (columns - 1)) / columns)
  const top = CARD_HEADER_HEIGHT + CARD_CELL_GAP * 2
  const height = Math.floor(
    (CARD_HEIGHT - CARD_FOOTER_HEIGHT - top - CARD_CELL_GAP) / rows,
  )

  return {
    x: CARD_MARGIN + (index % columns) * (width + CARD_CELL_GAP),
    y: top + Math.floor(index / columns) * (height + CARD_CELL_GAP),
    width,
    height,
  }
}

const drawTeam = (canvas, party) => {
  for (let index = 0; index < party.length; index++) {
    drawMemberCell(canvas, party[index], cellAt(index))
  }
}

const drawBadges = (canvas, save, y) => {
  for (let index = 0; index < GYMS.length; index++) {
    const gym = GYMS[index]
    const centreX = CARD_MARGIN + CARD_BADGE_RADIUS + index * CARD_BADGE_GAP

    if (!save.badges.includes(gym.id)) {
      drawDiamond(canvas, centreX, y, CARD_BADGE_RADIUS, CARD_PALETTE.line)
      continue
    }

    drawDiamond(canvas, centreX, y, CARD_BADGE_RADIUS, typeColor(gym.type))
  }
}

const drawAchievements = (canvas, entries, y) => {
  for (let index = 0; index < entries.length; index++) {
    const centreX =
      CARD_MARGIN + CARD_ACHIEVEMENT_RADIUS + index * CARD_ACHIEVEMENT_GAP
    const colour = entries[index].earnedAt
      ? CARD_PALETTE.achievement
      : CARD_PALETTE.line

    drawDiamond(canvas, centreX, y, CARD_ACHIEVEMENT_RADIUS, colour)
  }
}

const drawFooter = (canvas, save, worked) => {
  const top = CARD_HEIGHT - CARD_FOOTER_HEIGHT
  const badgeY = top + 30
  const entries = achievementEntries(save, worked)
  const achievementY = top + CARD_ACHIEVEMENT_TOP

  drawRule(canvas, CARD_MARGIN, top, CARD_WIDTH - CARD_MARGIN * 2)
  drawBadges(canvas, save, badgeY)
  drawText(
    canvas,
    `${save.badges.length}/${GYMS.length} ${CARD_LABELS.badges}`,
    CARD_MARGIN,
    badgeY + CARD_BADGE_RADIUS + 16,
    CARD_PALETTE.dim,
    CARD_LABEL_SCALE,
  )

  drawAchievements(canvas, entries, achievementY)
  drawText(
    canvas,
    `${earnedCount(entries)}/${entries.length} ${CARD_LABELS.achievements}`,
    CARD_MARGIN,
    achievementY + CARD_ACHIEVEMENT_RADIUS + 16,
    CARD_PALETTE.dim,
    CARD_LABEL_SCALE,
  )

  const right = CARD_WIDTH - CARD_MARGIN
  const figures = [
    [`${workedHours(worked)}H`, CARD_LABELS.worked],
    [`${save.stats.streak}`, CARD_LABELS.streak],
    [`${save.stats.battles}`, CARD_LABELS.battles],
    [money(save.money), CARD_LABELS.money],
  ]

  let x = right

  for (const [value, label] of figures) {
    const width = Math.max(
      textWidth(value, CARD_NAME_SCALE),
      textWidth(label, CARD_LABEL_SCALE),
    )

    x -= width

    drawText(canvas, value, x, top + 24, CARD_PALETTE.text, CARD_NAME_SCALE)
    drawText(
      canvas,
      label,
      x,
      top + 24 + textHeight(CARD_NAME_SCALE) + 10,
      CARD_PALETTE.dim,
      CARD_LABEL_SCALE,
    )

    x -= 40
  }
}

const drawSource = (canvas) => {
  const y = CARD_HEIGHT - CARD_MARGIN + 4

  drawRule(canvas, CARD_MARGIN, y - 20, CARD_WIDTH - CARD_MARGIN * 2)
  drawCentredText(
    canvas,
    CARD_LABELS.source,
    CARD_WIDTH / 2,
    y,
    CARD_PALETTE.dim,
    CARD_LABEL_SCALE,
  )
}

export const drawCard = (save, now = Date.now()) => {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT, CARD_PALETTE.background)

  drawHeader(canvas, save, now)
  drawTeam(canvas, save.party)
  drawFooter(canvas, save, readWorked())
  drawSource(canvas)

  return canvas
}

export const writeCard = (save, path, now = Date.now()) => {
  mkdirSync(HOME, { recursive: true })
  writeFileSync(path, encodePng(drawCard(save, now)))

  return path
}
