export const POKEAPI_URL = 'https://pokeapi.co/api/v2'

export const CONCURRENCY = 8

export const KANTO = 151

export const VERSION_GROUP = 'red-blue'

export const OUTPUTS = [
  'pokedex.json',
  'moves.json',
  'types.json',
  'growth.json',
]

export const MIN_REQUEST_INTERVAL_MS = 150

export const MAX_ATTEMPTS = 5

export const THROTTLE_BACKOFF_MS = 2000

export const RETRY_BACKOFF_MS = 300

export const STAT_KEYS = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'spAttack',
  'special-defense': 'spDefense',
  speed: 'speed',
}

export const DATASET_READY_HEADING =
  '\nThe claudemon dataset is already built\n'

export const DATASET_BUILDING_HEADING = '\nBuilding the claudemon dataset\n'

export const SPRITE_BASE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white'

export const TRAINER_SPRITE_BASE_URL =
  'https://play.pokemonshowdown.com/sprites/trainers'

export const SPRITE_SIDES = ['front', 'back']

export const EGG_SPRITE_NAME = 'egg.png'

export const SPRITE_MAX_ATTEMPTS = 3

export const SPRITE_RETRY_BACKOFF_MS = 250

export const SPECIAL_DAMAGE_MOVES = new Set([
  'counter',
  'dragon-rage',
  'fissure',
  'guillotine',
  'horn-drill',
  'low-kick',
  'night-shade',
  'psywave',
  'seismic-toss',
  'sonic-boom',
  'super-fang',
])

export const DAMAGE_CLASSES = ['physical', 'special', 'status']

export const FAILURE_LIST_LIMIT = 40

export const BAR_WIDTH = 24

export const LABEL_WIDTH = 14

export const BAR_FILLED = '█'

export const BAR_EMPTY = '░'

export const PROBE_SPRITE_ID = 25

export const PROBE_RULE_WIDTH = 52

export const PROBE_LABEL_WIDTH = 16

export const GRADIENT_STEPS = 48

export const QUADRANT_SAMPLE = '  ▘ ▝ ▖ ▗ ▚ ▞ ▛ ▜ ▙ ▟'

export const PROBE_MESSAGES = {
  title: 'claudemon terminal probe',
  unset: '(unset)',
  truecolor: '1. Truecolor — should be one smooth gradient, no banding',
  quadrants:
    '2. Quadrant glyphs — should be ten solid corner shapes, not boxes',
  blockElements:
    '  These are Block Elements, so every monospace font has them.',
  oldFont: '  If any came out as a box, your font is older than Unicode 1.1.',
  spritesMissing: 'Sprites missing',
  native: '3. A sprite at native resolution — as good as it gets',
  fitted: '4. The same sprite at the size this window actually allows',
  tallerWindow: '  A taller window gets you closer to test 3.',
  heightBinds:
    'Height is what binds, not width: a canvas costs half as many rows as',
  tallerTab: 'columns, so a taller tab is what buys a sharper Pokemon.',
}

export const PREVIEW_COLS = 100

export const PREVIEW_ROWS = 34

export const PREVIEW_WORKED_MS = 48 * 60 * 60_000

export const PREVIEW_EARNED_AT = '2026-08-04T09:00:00.000Z'

export const PREVIEW_TRADE_ID = 'k4n70r3d1x'

export const PREVIEW_DAYS_ON_THE_ROAD = 44

export const PREVIEW_MONEY = 12_400

export const PREVIEW_BAG = {
  'poke-ball': 6,
  'great-ball': 11,
  'ultra-ball': 4,
  potion: 5,
  'super-potion': 3,
  revive: 2,
  'thunder-stone': 1,
}

export const PREVIEW_BADGES = [
  'pewter',
  'cerulean',
  'vermilion',
  'celadon',
  'fuchsia',
]

export const PREVIEW_PARTY = [
  [6, 43, false, 1],
  [18, 39, false, 0.72],
  [3, 41, false, 1],
  [94, 37, false, 0.28],
  [130, 45, true, 1],
  [143, 34, false, 0.93],
]

export const PREVIEW_POISONED = 94

export const PREVIEW_CAUGHT = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 22, 23, 24,
  25, 27, 28, 29, 30, 31, 32, 35, 36, 37, 39, 40, 41, 43, 44, 45, 46, 47, 49,
  50, 55, 56, 60, 61, 64, 66, 67, 69, 74, 75, 78, 79, 80, 81, 82, 83, 85, 86,
  87, 88, 89, 92, 93, 94, 95, 96, 97, 98, 99, 103, 104, 105, 106, 107, 110, 111,
  112, 114, 116, 118, 119, 121, 126, 128, 130, 131, 132, 134, 140, 141, 142,
  143, 147, 148, 149,
]

export const PREVIEW_SEEN = [
  26, 42, 51, 59, 65, 71, 84, 90, 100, 101, 102, 113, 120, 122, 127, 136, 137,
  138, 146, 150, 151,
]

export const PREVIEW_FACED = [
  [16, 24],
  [19, 18],
  [21, 14],
  [41, 11],
  [45, 6],
  [130, 1],
]

export const PREVIEW_STATS = {
  battles: 214,
  wins: 181,
  losses: 19,
  runs: 14,
  streak: 12,
  caught: 97,
}

export const PREVIEW_WILD = { species: 45, level: 42, hp: 0.55 }

export const PREVIEW_TRAINER = {
  class: 'Bug Catcher',
  name: 'Marc',
  sprite: 'bugcatcher',
  team: [
    [15, 'Beedrill', 41],
    [49, 'Venomoth', 40],
  ],
}

export const PREVIEW_GYM = 'saffron'

export const PREVIEW_GYM_SEED = 4242

export const PREVIEW_EGG_STEPS = 214

export const PREVIEW_DAYCARE_PAIR = [
  [132, 30, false, 1],
  [25, 33, true, 1],
]

export const PREVIEW_UPDATE_STEPS = [
  ['refreshing the marketplace', 'refreshed the marketplace'],
  ['fetching the new version', 'fetched the new version'],
  [
    'checking the command, status line and sprites',
    'the command, status line and sprites are up to date',
  ],
]

// eslint-disable-next-line no-control-regex
export const SGR_PATTERN = /^\x1b\[([0-9;]*)m/

export const SGR_RESET = 0

export const SGR_TRUECOLOUR_FG = 38

export const SGR_TRUECOLOUR_BG = 48

export const SGR_TRUECOLOUR = 2

export const CAPTURE_DIM_FACTOR = 0.5

export const CAPTURE_PALETTE = {
  background: [0, 0, 0],
  foreground: [204, 204, 204],
  colours: {
    red: [232, 88, 72],
    green: [88, 208, 88],
    yellow: [232, 192, 64],
    blue: [96, 176, 240],
    magenta: [200, 128, 216],
    cyan: [96, 200, 208],
    white: [204, 204, 204],
    gray: [112, 112, 112],
    brightRed: [255, 128, 112],
    brightGreen: [136, 232, 128],
    brightYellow: [255, 216, 96],
    brightCyan: [144, 232, 232],
  },
}

export const CAPTURE_CELL_WIDTH = 20

export const CAPTURE_CELL_HEIGHT = 40

export const CAPTURE_FONT = 'Menlo'

export const CAPTURE_FONT_ADVANCE_SAMPLE = 'M'

export const CAPTURE_STROKE_DIVISOR = 10

export const CAPTURE_SHADE_PERIOD = 4

export const CAPTURE_SYMBOL_FIT = 0.92

// prettier-ignore
export const CAPTURE_BLOCK_RECTS = {
  '█': [[0, 0, 1, 1]],
  '▀': [[0, 0, 1, 0.5]],
  '▄': [[0, 0.5, 1, 1]],
  '▌': [[0, 0, 0.5, 1]],
  '▐': [[0.5, 0, 1, 1]],
  '▘': [[0, 0, 0.5, 0.5]],
  '▝': [[0.5, 0, 1, 0.5]],
  '▖': [[0, 0.5, 0.5, 1]],
  '▗': [[0.5, 0.5, 1, 1]],
  '▚': [[0, 0, 0.5, 0.5], [0.5, 0.5, 1, 1]],
  '▞': [[0.5, 0, 1, 0.5], [0, 0.5, 0.5, 1]],
  '▛': [[0, 0, 1, 0.5], [0, 0.5, 0.5, 1]],
  '▜': [[0, 0, 1, 0.5], [0.5, 0.5, 1, 1]],
  '▙': [[0, 0, 0.5, 0.5], [0, 0.5, 1, 1]],
  '▟': [[0.5, 0, 1, 0.5], [0, 0.5, 1, 1]],
  '▬': [[0, 0.4, 1, 0.6]],
}

// prettier-ignore
export const CAPTURE_BOX_SEGMENTS = {
  '─': [['h', 0, 1]],
  '│': [['v', 0, 1]],
  '┌': [['h', 0.5, 1], ['v', 0.5, 1]],
  '┐': [['h', 0, 0.5], ['v', 0.5, 1]],
  '└': [['h', 0.5, 1], ['v', 0, 0.5]],
  '┘': [['h', 0, 0.5], ['v', 0, 0.5]],
}

export const CAPTURE_SHADE_GLYPHS = ['░']

export const CHROME_PATH =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export const CHROME_ARGS = [
  '--headless',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
]

export const SHOT_MESSAGES = {
  failed: 'the browser did not write a screenshot',
  unknown: 'unknown shot. try one of:',
  unknownScene: 'unknown screen. try one of:',
  noSprites: 'no sprites installed. run node tools/install.mjs first',
}

export const SHOT_KINDS = { terminal: 'terminal', card: 'card' }

export const CAPTURE_HOME_PREFIX = 'claudemon-capture-'

export const CAPTURE_CARD_SCALE = 2

export const CAPTURE_SHOTS = [
  { file: 'home.png', scene: 'home-working', cols: 100, rows: 30 },
  { file: 'trainer.png', scene: 'home-trainer', cols: 100, rows: 66 },
  { file: 'trainer-battle.png', scene: 'trainer-battle', cols: 100, rows: 54 },
  { file: 'battle.png', scene: 'battle', cols: 100, rows: 54 },
  { file: 'pokedex.png', scene: 'dex', cols: 100, rows: 42 },
  { file: 'team.png', scene: 'team', cols: 100, rows: 38 },
  { file: 'gyms.png', scene: 'gyms', cols: 100, rows: 36 },
  { file: 'gym-leader.png', scene: 'gym-leader', cols: 100, rows: 44 },
  { file: 'gym-run.png', scene: 'gym-run', cols: 100, rows: 26 },
  { file: 'daycare.png', scene: 'daycare', cols: 100, rows: 28 },
  {
    file: 'daycare-raising.png',
    scene: 'daycare-raising',
    cols: 100,
    rows: 26,
  },
  {
    file: 'card-team.png',
    scene: 'trainer',
    kind: 'card',
    cols: 100,
    rows: 44,
  },
]
