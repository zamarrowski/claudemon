export const API = {
  bootstrap: '/api/bootstrap',
  events: '/api/events',
  save: '/api/save',
  config: '/api/config',
  encounter: '/api/encounter',
  card: '/api/card',
  tradeCode: '/api/trade/code',
  tradeRead: '/api/trade/read',
  update: '/api/update',
  quit: '/api/quit',
}

export const DATASET_URLS = [
  '/data/pokedex.json',
  '/data/moves.json',
  '/data/types.json',
  '/data/growth.json',
]

export const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export const SPRITE_BASE = '/sprites'

export const MUSIC_FILES = {
  battle: '/sounds/battle.wav',
  victory: '/sounds/victory.wav',
}

export const KEY_ALIASES = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'enter',
  ' ': 'space',
  Escape: 'esc',
  Backspace: 'backspace',
  PageUp: 'pageup',
  PageDown: 'pagedown',
  Tab: 'tab',
}

export const TICK_MS = 500

export const FRAME_MS = 60

export const MUSIC_VOLUME = 0.35

export const EFFECT_VOLUME = 0.18

export const OSCILLATOR_TYPE = 'square'

export const SWALLOWED_KEYS = new Set([
  'up',
  'down',
  'left',
  'right',
  'space',
  'enter',
  'pageup',
  'pagedown',
  'backspace',
  'tab',
])

export const SOUNDS = {
  cursor: { gain: 0.16, notes: [{ hz: 1175, ms: 16 }] },

  select: {
    gain: 0.2,
    notes: [
      { hz: 880, ms: 22 },
      { hz: 1319, ms: 40 },
    ],
  },

  back: {
    gain: 0.16,
    notes: [
      { hz: 659, ms: 20 },
      { hz: 440, ms: 34 },
    ],
  },

  shiny: {
    gain: 0.18,
    notes: [
      { hz: 1568, ms: 34 },
      { hz: 2093, ms: 34 },
      { hz: 2637, ms: 90 },
    ],
  },

  trade: {
    gain: 0.18,
    notes: [
      { hz: 988, ms: 26 },
      { hz: 1319, ms: 26 },
      { hz: 1760, ms: 72 },
    ],
  },

  hatch: {
    gain: 0.18,
    notes: [
      { hz: 523, ms: 28 },
      { hz: 784, ms: 28 },
      { hz: 1047, ms: 28 },
      { hz: 1319, ms: 96 },
    ],
  },
}

export const CARD_WRITTEN_NOTICE = 'Trainer card written to'
