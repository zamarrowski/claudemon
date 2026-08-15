export const WIDE_CODEPOINT_RANGE = { min: 0x1f300, max: 0x1faff }

export const SGR_CODES = {
  bold: 1,
  dim: 2,
  italic: 3,
  underline: 4,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  gray: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightCyan: 96,
}

export const DATASET_FILES = {
  pokedex: 'pokedex.json',
  moves: 'moves.json',
  types: 'types.json',
  growth: 'growth.json',
}

export const TORSO = [
  '...cccc...',
  '..cccccc..',
  '.dddddddd.',
  '..ssssss..',
  '..sesses..',
  '..tttttt..',
  '.stttttts.',
  '.stttttts.',
  '..pppppp..',
]

export const LEGS = {
  stand: ['..pp..pp..', '..bb..bb..'],
  stride: ['.pp....pp.', '.bb....bb.'],
  pass: ['...pppp...', '...bbbb...'],
}

export const WALKER = {
  stand: [...TORSO, ...LEGS.stand],
  stride: [...TORSO, ...LEGS.stride],
  pass: [...TORSO, ...LEGS.pass],
}

export const WALK = [
  { art: WALKER.stride, lift: 0 },
  { art: WALKER.pass, lift: 1 },
]

export const IDLE = { art: WALKER.stand, lift: 0 }

export const WALKER_PALETTE = {
  '.': null,
  c: [230, 72, 66],
  d: [150, 34, 40],
  s: [246, 206, 168],
  e: [40, 36, 46],
  t: [72, 132, 224],
  p: [58, 68, 108],
  b: [92, 62, 44],
}

export const GLYPH_WIDTH = 5
export const GLYPH_HEIGHT = 7

export const MISSING_GLYPH = [
  '#####',
  '#...#',
  '#...#',
  '#...#',
  '#...#',
  '#...#',
  '#####',
]

// prettier-ignore
export const GLYPHS = {
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#..##', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['#..#.', '#..#.', '#..#.', '#####', '...#.', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  '·': ['.....', '.....', '.....', '..#..', '..#..', '.....', '.....'],
  '₽': ['.###.', '.#..#', '.#..#', '.###.', '###..', '.#...', '.#...'],
}

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 908
export const CARD_MARGIN = 36
export const CARD_HEADER_HEIGHT = 112
export const CARD_FOOTER_HEIGHT = 196
export const CARD_CELL_GAP = 16
export const CARD_CELL_TEXT_HEIGHT = 84
export const CARD_BADGE_RADIUS = 13
export const CARD_BADGE_GAP = 38
export const CARD_ACHIEVEMENT_RADIUS = 7
export const CARD_ACHIEVEMENT_GAP = 22
export const CARD_ACHIEVEMENT_TOP = 100
export const CARD_HP_BAR_HEIGHT = 8
export const CARD_TITLE_SCALE = 5
export const CARD_NAME_SCALE = 3
export const CARD_LABEL_SCALE = 2

export const CARD_PALETTE = {
  background: [14, 15, 13],
  panel: [22, 24, 20],
  line: [43, 46, 40],
  text: [230, 230, 230],
  dim: [139, 143, 136],
  green: [127, 207, 106],
  amber: [224, 179, 65],
  red: [224, 96, 84],
  shiny: [120, 224, 232],
  achievement: [186, 137, 224],
}

export const CARD_SHINY_RADIUS = 6

export const CARD_HP_THRESHOLDS = [
  { above: 0.5, colour: [127, 207, 106] },
  { above: 0.2, colour: [224, 179, 65] },
]

export const CARD_LABELS = {
  pokedex: 'POKEDEX',
  badges: 'BADGES',
  achievements: 'ACHIEVEMENTS',
  battles: 'BATTLES',
  won: 'WON',
  streak: 'DAY STREAK',
  worked: 'WITH CLAUDE',
  day: 'DAY ON THE ROAD',
  days: 'DAYS ON THE ROAD',
  money: 'MONEY',
  source: 'claudemon · github.com/zamarrowski/claudemon',
  empty: '- - -',
}

export const EMPTY_WORKED = { totalMs: 0, updatedAt: null }

export const PRUNE_MS = 24 * 60 * 60_000

export const WAITING_MESSAGE_LIMIT = 120

export const ACTIVITY_VERSION = 1

export const HEARTBEAT_STALE_MS = 15_000

export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export const FETCH_TIMEOUT_MS = 5000

export const UPDATE_DETAIL_LIMIT = 120

export const DEFAULT_MANIFEST_URL =
  'https://raw.githubusercontent.com/zamarrowski/claudemon/main/.claude-plugin/plugin.json'

export const UPDATE_STEP_TIMEOUTS = {
  pull: 60_000,
  install: 180_000,
  marketplace: 60_000,
  plugin: 120_000,
}

export const UPDATE_STEP_TEXT = {
  clonePull: {
    id: 'pull',
    label: 'pulling the latest commit',
    done: 'pulled the latest commit',
  },
  cloneInstall: {
    id: 'install',
    label: 'reinstalling from the clone',
    done: 'the command, status line and sprites are up to date',
  },
  marketplace: {
    id: 'marketplace',
    label: 'refreshing the marketplace',
    done: 'refreshed the marketplace',
  },
  plugin: {
    id: 'plugin',
    label: 'fetching the new version',
    done: 'fetched the new version',
  },
  pluginInstall: {
    id: 'install',
    label: 'checking the command, status line and sprites',
    done: 'the command, status line and sprites are up to date',
  },
}

export const UPDATE_FAILURE_MESSAGES = {
  noGit: 'no `git` command found',
  noClaude: 'no `claude` command found — is Claude Code on your PATH?',
  timedOut: 'it took too long and was given up on',
  unknown: 'it failed without saying why',
}

export const PNG_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

export const PNG_SIGNATURE_BYTES = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]

export const PNG_CRC_POLYNOMIAL = 0xedb88320

export const PNG_CRC_SEED = 0xffffffff

export const PNG_BIT_DEPTH = 8

export const PNG_COLOR_TYPE_RGBA = 6

export const PNG_FILTER_NONE = 0

export const SHIM_MARKER = "Generated by claudemon's installer"

export const SHIM_APP_PATTERN = /^app="(.+)"$/m

export const REVEAL_COMMANDS = {
  darwin: { command: 'open', args: (path) => [path] },
  win32: { command: 'explorer.exe', args: (path) => [path] },
  default: { command: 'xdg-open', args: (path) => [path] },
}

export const BROWSER_COMMANDS = {
  darwin: { command: 'open', args: (url) => [url] },
  win32: { command: 'cmd', args: (url) => ['/c', 'start', '', url] },
  default: { command: 'xdg-open', args: (url) => [url] },
}
