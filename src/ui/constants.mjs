export const WIDE_CODEPOINT_RANGE = { min: 0x1f300, max: 0x1faff }
export const SYMBOL_CODEPOINT_RANGE = { min: 0x2600, max: 0x27bf }

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

export const UPPER_HALF = '▀'
export const LOWER_HALF = '▄'
export const FULL_BLOCK = '█'

export const BALL_ART = [
  '...kkkk...',
  '.krrrrrrk.',
  'rrhhrrrrdd',
  'rrrrrrrrdd',
  'kkkkbbkkkk',
  'kkkkbbkkkk',
  'wwwwwwwwgg',
  'wwwwwwwwgg',
  '.kwwwwggk.',
  '...kkkk...',
]

export const BALL_PALETTE = {
  '.': null,
  k: [26, 26, 32],
  r: [222, 48, 48],
  h: [255, 138, 132],
  d: [150, 26, 32],
  w: [246, 246, 248],
  g: [174, 174, 184],
  b: [230, 230, 236],
}

export const LIT_BUTTON = [255, 226, 96]

export const ARC_ROWS = 3

export const THROW_FRAMES = 8
export const FALL_FRAMES = 3

export const SHAKE_TILTS = [-1, 0, 1, 0]

export const BALL_SCALE_DIVISOR = 48
export const BURST_SPREADS = 3
export const BURST_OFFSET_DIVISOR = 5
export const SHAKE_OFFSET_DIVISOR = 6

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

export const GRASS_BEHIND = { '.': null, g: [44, 92, 52], G: [62, 130, 66] }
export const GRASS_IN_FRONT = { '.': null, g: [80, 172, 78], G: [116, 208, 98] }

// prettier-ignore
export const BACK_TILE = [
  '...g......g.....',
  '..gGg....gGg..g.',
  '.gGGGg.gGGGGggGg',
  'GGGGGGGGGGGGGGGG',
]

// prettier-ignore
export const FRONT_TILE = [
  '..g....g...g....',
  '.gGg..gGg.gGg.g.',
  'gGGGgGGGGgGGGgGg',
  'GGGGGGGGGGGGGGGG',
]

export const WALKER_COLS = 10

export const WALKER_TOP = 1
export const BACK_TOP = 8
export const FRONT_TOP = 10

export const BAND_SCALE_ROW_BREAKPOINT = 44

export const KEY_SEQUENCES = new Map([
  ['\x1b[A', 'up'],
  ['\x1bOA', 'up'],
  ['\x1b[B', 'down'],
  ['\x1bOB', 'down'],
  ['\x1b[C', 'right'],
  ['\x1bOC', 'right'],
  ['\x1b[D', 'left'],
  ['\x1bOD', 'left'],
  ['\x1b[5~', 'pageup'],
  ['\x1b[6~', 'pagedown'],
  ['\x1b[H', 'home'],
  ['\x1bOH', 'home'],
  ['\x1b[F', 'end'],
  ['\x1bOF', 'end'],
  ['\r', 'enter'],
  ['\n', 'enter'],
  ['\t', 'tab'],
  [' ', 'space'],
  ['\x7f', 'backspace'],
  ['\b', 'backspace'],
  ['\x1b', 'escape'],
  ['\x03', 'ctrl-c'],
  ['\x04', 'ctrl-d'],
])

export const DEFAULT_TERMINAL_SIZE = { cols: 80, rows: 24 }
export const BELL = '\x07'

export const CELL_ASPECT = 2

// prettier-ignore
export const QUADRANT_GLYPHS = [
  ' ', '▘', '▝', '▀',
  '▖', '▌', '▞', '▛',
  '▗', '▚', '▐', '▜',
  '▄', '▙', '▟', '█',
]

export const HALF_GLYPHS = [' ', UPPER_HALF, LOWER_HALF, FULL_BLOCK]

export const ALPHA_CUTOFF = 128

export const NATIVE_CANVAS_COLS = 96
export const MIN_CANVAS_COLS = 16

export const FOE_INFO_ROWS = 2
export const PLAYER_INFO_ROWS = 3
export const MESSAGE_BOX_ROWS = 6
export const MIN_FIELD_ROWS = 8
export const MAX_FIELD_WIDTH = 78
export const FIELD_LEFT = 2
export const FIELD_GAP = 2
export const FIELD_ROOM_SLACK = 8
export const OVERLAP_FRACTION = 0.4
export const NO_SPRITE = { rows: ['', '(no sprite)', ''], cols: 12 }

// prettier-ignore
export const HIT_FRAMES = [
  ['💥'],
  ['💥💥💥'],
  ['  💥💥💥  ',
    '💥💥💥💥💥',
    '  💥💥💥  '],
  ['💥  💥  💥',
    '  💥💥💥  ',
    '💥  💥  💥'],
  ['💥      💥',
    '          ',
    '💥      💥'],
]

export const DEFAULT_RESERVED_ROWS = 7
export const CANVAS_WIDTH_SLACK = 4
export const DEFAULT_SPRITE_COLS = 36
export const RENDER_CACHE_LIMIT = 64
export const MIN_SPRITE_COLS = 4

export const TYPE_COLORS = {
  normal: [168, 168, 120],
  fire: [240, 128, 48],
  water: [104, 144, 240],
  electric: [248, 208, 48],
  grass: [120, 200, 80],
  ice: [152, 216, 216],
  fighting: [192, 48, 40],
  poison: [160, 64, 160],
  ground: [224, 192, 104],
  flying: [168, 144, 240],
  psychic: [248, 88, 136],
  bug: [168, 184, 32],
  rock: [184, 160, 56],
  ghost: [112, 88, 152],
  dragon: [112, 56, 248],
  dark: [112, 88, 72],
  steel: [184, 184, 208],
  fairy: [238, 153, 172],
}

export const DEFAULT_TYPE_COLOR = [136, 136, 136]

export const BADGE_LUMINANCE_CUTOFF = 150
export const BADGE_TEXT_COLOURS = {
  dark: [20, 20, 20],
  light: [255, 255, 255],
}

export const HP_BAR_COLOURS = {
  healthy: [88, 208, 88],
  hurt: [248, 208, 48],
  critical: [240, 80, 64],
}
export const HP_BAR_THRESHOLDS = { healthy: 0.5, hurt: 0.2 }
export const HP_BAR_EMPTY_GLYPH = '░'

export const EXP_BAR_COLOUR = [96, 176, 240]
export const EXP_BAR_GLYPH = '▬'

export const TRAINER_TRAY_COLOUR = [240, 240, 240]
export const TRAINER_TRAY_GLYPHS = { left: '●', lost: '○' }

export const DEFAULT_BAR_WIDTH = 20
export const DEFAULT_MENU_COLUMNS = 2
export const DEFAULT_MENU_WIDTH = 40
export const DEFAULT_MENU_HEIGHT = 10

export const STATUS_TAGS = {
  burn: ['BRN', [240, 128, 48]],
  poison: ['PSN', [160, 64, 160]],
  paralysis: ['PAR', [248, 208, 48]],
  sleep: ['SLP', [136, 136, 136]],
  freeze: ['FRZ', [152, 216, 216]],
}

export const UNKNOWN_STATUS_TAG = ['???', [136, 136, 136]]

export const GENDER_MARKS = {
  male: ['♂', [104, 144, 240]],
  female: ['♀', [240, 128, 168]],
}

export const EVOLVES_MARK = '✦'
export const LEVEL_EVO_PREFIX = '→'

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
export const CARD_HEIGHT = 858
export const CARD_MARGIN = 36
export const CARD_HEADER_HEIGHT = 112
export const CARD_FOOTER_HEIGHT = 146
export const CARD_CELL_GAP = 16
export const CARD_CELL_TEXT_HEIGHT = 84
export const CARD_BADGE_RADIUS = 13
export const CARD_BADGE_GAP = 38
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
}

export const CARD_HP_THRESHOLDS = [
  { above: 0.5, colour: [127, 207, 106] },
  { above: 0.2, colour: [224, 179, 65] },
]

export const CARD_LABELS = {
  pokedex: 'POKEDEX',
  badges: 'BADGES',
  battles: 'BATTLES',
  won: 'WON',
  streak: 'DAY STREAK',
  worked: 'WITH CLAUDE',
  days: 'DAYS ON THE ROAD',
  money: 'MONEY',
  source: 'claudemon · github.com/zamarrowski/claudemon',
  empty: '- - -',
}
