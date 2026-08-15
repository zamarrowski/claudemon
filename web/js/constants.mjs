export const API = {
  bootstrap: '/api/bootstrap',
  events: '/api/events',
  save: '/api/save',
  config: '/api/config',
  encounter: '/api/encounter',
  card: '/api/card',
  cardImage: '/api/card.png',
  tradeCode: '/api/trade/code',
  tradeRead: '/api/trade/read',
  update: '/api/update',
  quit: '/api/quit',
}

export const CLIENT_HEADER = 'x-claudemon-client'

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

export const COUNTDOWN_MS = 1000

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
