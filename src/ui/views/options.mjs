import { spriteScale, updateCheckMode } from '../../config.mjs'
import { spriteFile } from '../../paths.mjs'
import { hasPlayer } from '../../sound.mjs'
import { starAskAllowed, starAskPatch } from '../../star.mjs'
import { bold, brightYellow, dim, gray } from '../ansi.mjs'
import { NATIVE_CANVAS_COLS } from '../constants.mjs'
import {
  fitCanvasCols,
  loadSprite,
  placeSprite,
  spriteHeight,
} from '../sprite.mjs'
import { centre, padRight, withFooter, wrap } from '../widgets.mjs'
import {
  BELL_VALUES,
  CANVAS_CAPTION,
  NO_SPRITE_MESSAGE,
  OPTIONS_HINTS,
  OPTIONS_TITLE,
  SETTING_LABELS,
  SETTING_LABEL_WIDTH,
  SETTING_VALUE_WIDTH,
  SOUND_LABELS,
  SOUND_NOTES,
  SPRITE_SCALE_VALUES,
  STAR_ASK_VALUES,
  UPDATE_CHECK_BY_MODE,
  UPDATE_CHECK_VALUES,
} from './constants.mjs'
import { currentIndex, noteText, previewSpecies } from './helpers.mjs'

const soundNote = () => {
  return hasPlayer() ? SOUND_NOTES.withPlayer : SOUND_NOTES.withoutPlayer
}

const SOUND_VALUES = [
  { value: true, label: SOUND_LABELS.on, note: soundNote },
  { value: false, label: SOUND_LABELS.off, note: SOUND_NOTES.off },
]

export const SETTINGS = [
  {
    key: 'spriteScale',
    label: SETTING_LABELS.spriteScale,
    read: (config) => spriteScale(config),
    values: SPRITE_SCALE_VALUES,
  },
  {
    key: 'sound',
    label: SETTING_LABELS.sound,
    read: (config) => config.sound !== false,
    values: SOUND_VALUES,
  },
  {
    key: 'bell',
    label: SETTING_LABELS.bell,
    read: (config) => config.bell !== false,
    values: BELL_VALUES,
  },
  {
    key: 'updateCheck',
    label: SETTING_LABELS.updateCheck,
    read: (config) => UPDATE_CHECK_BY_MODE[updateCheckMode(config)],
    values: UPDATE_CHECK_VALUES,
  },
  {
    key: 'starPrompt',
    label: SETTING_LABELS.starPrompt,
    read: (config) => starAskAllowed(config),
    values: STAR_ASK_VALUES,
    patch: (config, value) => starAskPatch(config, value),
  },
]

const settingRows = (ctx) => {
  return SETTINGS.map((setting, index) => {
    const chosen = index === ctx.optionsSelection
    const value = setting.values[currentIndex(setting, ctx.config)]
    const cursor = chosen ? '▶ ' : '  '
    const arrows = chosen ? [dim('◀'), dim('▶')] : [' ', ' ']
    const shown = chosen ? bold(value.label) : value.label

    return `${cursor}${padRight(setting.label, SETTING_LABEL_WIDTH)}${arrows[0]} ${padRight(shown, SETTING_VALUE_WIDTH)}${arrows[1]}`
  })
}

export const draw = (ctx, size) => {
  const { cols, rows } = size
  const lines = []
  const overlays = []

  lines.push(` ${brightYellow('◓')} ${bold(OPTIONS_TITLE)}`)
  lines.push('')
  for (const row of settingRows(ctx)) lines.push(` ${row}`)
  lines.push('')

  const setting = SETTINGS[ctx.optionsSelection]
  const note = noteText(setting.values[currentIndex(setting, ctx.config)].note)
  const message = ctx.optionsMessage
    ? brightYellow(ctx.optionsMessage)
    : dim(note)

  lines.push(` ${message}`)
  lines.push('')

  const canvas = fitCanvasCols(size, lines.length + 4, ctx.spriteScale)
  const species = previewSpecies(ctx.save)
  const sprite = loadSprite(spriteFile('front', species, 'png'), {
    cols: canvas,
  })

  if (sprite) {
    const free = rows - 2 - lines.length - spriteHeight(sprite)

    for (let row = 0; row < Math.floor(Math.max(0, free) / 2); row++)
      lines.push('')

    placeSprite(
      lines,
      sprite,
      Math.max(1, Math.floor((cols - sprite.cols) / 2)),
    )
  } else {
    lines.push(centre(gray(NO_SPRITE_MESSAGE), cols))
  }

  const share = Math.round(
    (Math.min(canvas, NATIVE_CANVAS_COLS) / NATIVE_CANVAS_COLS) * 100,
  )

  lines.push(
    centre(
      dim(
        `${canvas}-column canvas · ${share === 100 ? CANVAS_CAPTION.exact : `${share}% of native`}` +
          CANVAS_CAPTION.detail,
      ),
      cols,
    ),
  )

  return {
    lines: withFooter(lines, dim(OPTIONS_HINTS), rows),
    overlays,
  }
}

const change = (ctx, delta) => {
  const setting = SETTINGS[ctx.optionsSelection]
  const next = wrap(
    currentIndex(setting, ctx.config) + delta,
    setting.values.length,
  )
  const value = setting.values[next].value

  if (setting.patch) {
    ctx.applyConfig(setting.patch(ctx.config, value))
    return
  }

  ctx.applyConfig({ [setting.key]: value })
}

export const onKey = (ctx, key) => {
  if (key.name === 'up' || key.name === 'k') {
    ctx.optionsSelection = wrap(ctx.optionsSelection - 1, SETTINGS.length)
    ctx.optionsMessage = null
    ctx.playSound('cursor')
  } else if (key.name === 'down' || key.name === 'j') {
    ctx.optionsSelection = wrap(ctx.optionsSelection + 1, SETTINGS.length)
    ctx.optionsMessage = null
    ctx.playSound('cursor')
  } else if (key.name === 'left' || key.name === 'h') {
    change(ctx, -1)
    ctx.playSound('select')
  } else if (
    key.name === 'right' ||
    key.name === 'l' ||
    key.name === 'enter' ||
    key.name === 'space'
  ) {
    change(ctx, 1)
    ctx.playSound('select')
  } else if (key.name === 'escape' || key.name === 'q') {
    ctx.optionsMessage = null
    ctx.playSound('back')
    ctx.setMode('home')
  }
}
