import { updateCheckMode } from '../../../src/config.mjs'
import { html } from '../dom.mjs'
import { hints, notes, screenHead } from './chrome.mjs'
import {
  BELL_VALUES,
  OPTIONS_HINTS,
  OPTIONS_TITLE,
  SETTING_LABELS,
  SOUND_VALUES,
  UPDATE_CHECK_BY_MODE,
  UPDATE_CHECK_VALUES,
} from './constants.mjs'
import {
  clampSelection,
  currentIndex,
  cursorDelta,
  selector,
  wrap,
} from './helpers.mjs'

export const SETTINGS = [
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
]

export const nextValue = (setting, config, direction) => {
  const index = currentIndex(setting, config)
  const next = wrap(index + direction, setting.values.length)

  return setting.values[next].value
}

const change = (ctx, direction) => {
  const setting =
    SETTINGS[clampSelection(ctx.optionsSelection, SETTINGS.length)]

  ctx.applyConfig({ [setting.key]: nextValue(setting, ctx.config, direction) })
}

export const draw = (ctx) => {
  const selection = clampSelection(ctx.optionsSelection, SETTINGS.length)

  return html`<div class="screen">
    ${screenHead(OPTIONS_TITLE)}
    <section class="panel">
      <div class="list">
        ${SETTINGS.map((setting, index) => {
          const current = setting.values[currentIndex(setting, ctx.config)]

          return html`<button
            class="list__row"
            type="button"
            aria-selected="${index === selection}"
            data-index="${index}"
            data-key="right"
          >
            <span class="name">${setting.label}</span>
            <span class="hint">${current.note}</span>
            <span class="pill">${current.label}</span>
          </button>`
        })}
      </div>
    </section>
    ${notes(ctx.optionsMessage)} ${hints(OPTIONS_HINTS, ctx.version)}
  </div>`
}

export const select = selector('optionsSelection', 'optionsMessage')

export const onKey = (ctx, key) => {
  if (key.name === 'left' || key.name === 'h') {
    change(ctx, -1)
    ctx.playSound('select')

    return
  }

  if (
    key.name === 'right' ||
    key.name === 'l' ||
    key.name === 'enter' ||
    key.name === 'space'
  ) {
    change(ctx, 1)
    ctx.playSound('select')

    return
  }

  if (key.name === 'esc' || key.name === 'q') {
    ctx.optionsMessage = null
    ctx.playSound('back')
    ctx.setMode('home')

    return
  }

  const delta = cursorDelta(ctx, key)

  if (!delta) return

  ctx.optionsSelection = wrap(ctx.optionsSelection + delta, SETTINGS.length)
  ctx.optionsMessage = null
}
