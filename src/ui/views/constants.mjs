export const APP_TITLE = 'claudemon'
export const KANTO_TOTAL = 151
export const COLUMN_DIVIDER = '│'
export const COLUMN_PREFIX = 6
export const LIST_WIDTH = 30
export const LIST_HEIGHT_FLOOR = 6
export const MON_NAME_WIDTH = 12
export const MON_LEVEL_WIDTH = 9
export const EMPTY_BAG_MESSAGE = 'Your bag is empty.'
export const NO_SPRITE_MESSAGE = '(sprite unavailable)'

export const CAUGHT_GLYPH = '◓'
export const FAINTED_TAG = ' FNT'

export const BATTLE_MAIN_MENU = ['FIGHT', 'BAG', 'POKÉMON', 'RUN']

export const BATTLE_PROMPTS = {
  more: '  ▾ press any key',
  back: '  [esc] back',
  useItem: 'Use which item?',
  switchTo: 'Switch to which Pokémon?',
  declineMove: 'Do not learn it',
  statusMove: 'Status',
  unknownAccuracy: '—',
}

export const MENU_STRIDES = { main: 2, fight: 2 }
export const DEFAULT_MENU_STRIDE = 1

export const BASE_MENU = [
  { id: 'dex', label: 'POKÉDEX' },
  { id: 'team', label: 'TEAM' },
  { id: 'daycare', label: 'DAY CARE' },
  { id: 'gyms', label: 'GYM' },
  { id: 'shop', label: 'SHOP' },
  { id: 'heal', label: 'HEAL' },
  { id: 'trainer', label: 'TRAINER' },
  { id: 'options', label: 'OPTION' },
  { id: 'quit', label: 'QUIT' },
]

export const FIGHT_MENU_LABEL = 'FIGHT'
export const MENU_CELL = 10
export const MAX_HOME_WIDTH = 72
export const TITLE_COLUMN_SPLIT = 40
export const HOME_SPRITE_RESERVED_ROWS = 16
export const HOME_TEAM_PANEL_TITLE = 'Team'
export const HOME_HINTS = ' ← → choose · [enter] open · [q] quit'

export const ACTIVITY_MESSAGES = {
  waiting: 'Claude needs you',
  working: 'Claude is working',
  idle: 'Claude is idle',
}

export const REST_MESSAGES = {
  wipedOut: 'Your team is down — HEAL comes back when Claude stops working.',
  needsHealing: 'HEAL is a rest — it comes back when Claude stops working.',
}

export const UPDATE_NOTICES = {
  installed: 'is installed',
  quitAndRun: 'quit and run claudemon again',
  available: 'is out',
  update: 'update',
}

export const ENCOUNTER_MESSAGES = {
  wild: 'A wild',
  appeared: 'appeared!',
  slipsBackIn: 'it slips back into the grass in',
  face: 'face it',
}

export const GRASS_MESSAGES = {
  rustling: 'Rustling in the grass...',
  quiet: 'The grass is quiet.',
}

export const WALK_HINTS = {
  working: 'Every moment Claude works is a step further in.',
  idle: 'Keep working in Claude Code — longer prompts walk further.',
}

export const DEX_TITLE = 'POKÉDEX'
export const DEX_LIST_WIDTH = 28
export const DEX_ROWS_RESERVED = 6
export const BASE_STAT_MAX = 160
export const DEX_PAGE_STEP = 10
export const DEX_UNKNOWN_NAME = '-----'

export const STAT_GLYPHS = {
  hp: 'HP ',
  attack: 'Atk',
  defense: 'Def',
  spAttack: 'SpA',
  spDefense: 'SpD',
  speed: 'Spd',
}

export const DEX_MARKS = { caught: '●', seen: '◐', unseen: '·' }

export const DEX_MESSAGES = {
  baseStats: 'Base stats',
  evolvesInto: 'Evolves into',
  notCaught: 'Seen, but not yet caught.',
  fillItIn: 'Catch one to fill in its entry.',
  noData: 'No data.',
  shinyCaught: 'A shiny one is in your collection',
}

export const EVOLUTION_WORDING = {
  level: 'at level',
  item: 'with a',
  trade: 'by trading',
}

export const DEX_SORT = { number: 'number', name: 'name' }
export const DEX_SORT_LABELS = { number: '#', name: 'A–Z' }
export const DEX_HINTS =
  ' ↑ ↓ browse · [PgUp/PgDn] jump · [s] sort · [esc] back'

export const TEAM_TITLE = 'TEAM'
export const BAG_TITLE = 'BAG'
export const BAG_ITEM_NAME_WIDTH = 15
export const LEAD_MARK = '★'
export const PARTY_SORT = { order: 'order', level: 'level' }
export const TEAM_SORT_LABELS = { order: 'party', level: 'Lv' }
export const BOX_SORT_LABELS = { order: 'caught', level: 'Lv' }

export const TEAM_HINTS =
  ' ↑ ↓ browse · [enter] lead · [m] moves · [i] items · [d] send it to the box · [esc] back'
export const TEAM_KEY_HINTS =
  ' [s] sort · [b] the box · [c] the day care · [t] trade it away · [r] take one in from a code'
export const TEAM_BAG_HINTS =
  ' ↑ ↓ choose an item · [enter] use it · [esc] put the bag away'

export const TEAM_MESSAGES = {
  noPokemon: 'You have no Pokémon.',
  back: ' [esc] back',
  notForParty: 'Save it for something in the grass.',
  wouldBecome: 'would become',
}

export const MOVES_TITLE = 'MOVES'
export const MOVE_NAME_WIDTH = 15
export const HELD_MARK = '↕'

export const MOVES_MESSAGES = {
  fightMenu: 'The fight menu opens on the top move.',
  daycare: 'The day care gives that one up when it teaches a new one.',
  onlyOne: 'It only knows the one move.',
}

export const MOVES_HINTS =
  ' ↑ ↓ choose a move · [enter] pick it up · [esc] back'
export const MOVES_HELD_HINTS =
  ' ↑ ↓ move it · [enter] put it down · [esc] leave it there'
export const MOVES_BACK_HINTS = ' [esc] back'

export const BOX_TITLE = 'BOX'
export const BOX_HINTS =
  ' ↑ ↓ browse · [s] sort · [enter] take it into your team · [esc] back'

export const BOX_MESSAGES = {
  empty: 'The box is empty.',
  waitingHere: 'Anything you catch while your team is full waits in here.',
  back: ' [esc] back to your team',
}

export const DAYCARE_TITLE = 'DAY CARE'
export const MAX_DAYCARE_WIDTH = 60
export const DAYCARE_EGG_PANEL_TITLE = 'Egg'
export const DAYCARE_EGG_SPRITE_RESERVED_ROWS = 6
export const DAYCARE_EGG_INFO_GAP = 4
export const DAYCARE_EGG_BAR_WIDTH = 24
export const DAYCARE_LIST_WIDTH = 34
export const EMPTY_SLOT_LABEL = '— nobody here —'
export const FROM_BOX_TAG = ' box'

export const DAYCARE_NOTES = {
  leftHere: 'left here',
  needTwo: 'Leave two here and they might get on.',
  getAlong: 'The two seem to get along.',
  noSpark: 'The two prefer to play with other Pokémon.',
  raising:
    'Whoever waits here gains EXP and picks up moves while Claude works.',
  noEgg: 'No egg yet.',
  inside: 'Something is moving inside.',
  onlyWhileOpen: 'It only comes along while Claude works and this is open.',
  steps: 'steps',
  pick: 'Leave which one here?',
}

export const DAYCARE_HINTS =
  ' ↑ ↓ pick a slot · [enter] leave one here, or take it back · [esc] back'
export const DAYCARE_PICK_HINTS =
  ' ↑ ↓ choose one · [enter] leave it here · [esc] never mind'

export const TRADE_TITLE = 'TRADE'
export const MAX_TRADE_WIDTH = 64
export const TRADE_SPRITE_RESERVED_ROWS = 14
export const TRADE_CODE_ROWS = 10
export const TRADE_INPUT_ROWS = 3
export const TRADE_WARNING_TITLE = 'One way'
export const TRADE_PROMPT_MARK = '>'

export const TRADE_WARNING = {
  leaves: 'leaves your game the moment the code exists.',
  noWayBack: 'You cannot take it back, and the code will not work here.',
  exact: 'Whoever pastes it gets this exact Pokémon — level,',
  andAll: 'moves, nickname and all.',
}

export const TRADE_PROMPTS = {
  ask: 'Give',
  away: 'away?',
  onItsWay: 'is on its way. Hand this code over:',
  copied: 'Copied to your clipboard.',
  notCopied: 'Nothing here to copy with, so take it off the screen.',
  writtenTo: 'Written to',
  notWritten: 'It could not be written to a file, so take it off the screen.',
  gone: 'It is out of your game now.',
  paste: 'Paste the code you were given.',
  onceOnly: 'A code works once, and never in the game it came from.',
  arrived: 'arrived from',
  joinedTeam: 'It joined your team.',
  wentToBox: 'Your team was full, so it went to the box.',
}

export const TRADE_KEY_HINTS =
  ' [t] trade the one you are on away · [r] take one in from a code'
export const TRADE_CONFIRM_HINTS =
  ' [enter] make the code · [esc] keep it where it is'
export const TRADE_CODE_HINTS = ' [esc] back'
export const TRADE_RECEIVE_HINTS = ' [enter] take it in · [esc] never mind'

export const SHOP_TITLE = 'SHOP'
export const MAX_SHOP_WIDTH = 68
export const SHOP_NAME_WIDTH = 18
export const SHOP_PRICE_WIDTH = 8
export const SHOP_ROWS_RESERVED = 12
export const BULK_QUANTITY = 5
export const SHOP_MONEY_LABEL = 'you have'
export const SHOP_OWNED_LABEL = 'have'
export const SHOP_PROMPT = '[enter] buy one · [5] buy five'
export const SHOP_HINTS =
  ' ↑ ↓ browse · [enter] buy one · [5] buy five · [esc] back'

export const GYMS_TITLE = 'GYMS'
export const GYM_TITLE_SUFFIX = 'GYM'
export const GYMS_LIST_WIDTH = 32
export const GYM_CITY_WIDTH = 10
export const GYM_TYPE_WIDTH = 8
export const GYM_ROSTER_NAME_WIDTH = 20
export const MAX_GYM_WIDTH = 56
export const GYM_ROSTER_PANEL_TITLE = 'Gauntlet'

export const BADGE_MARKS = { earned: '◆', missing: '◇' }
export const GYM_ROSTER_MARKS = { beaten: '✔', next: '▶', pending: '·' }

export const GYM_MESSAGES = {
  badges: 'badges',
  trainers: 'trainers before the leader',
  inYourBag: 'In your bag',
  potions: 'Potions',
  revives: 'Revives',
  alreadyWon: 'Already won.',
  noBadgeYet: 'Not yet won.',
  confirmLeave: 'Walk out and none of it counted. [esc] again to leave.',
  rules: 'No shop, no rest — your bag is all you get in here.',
  rollback: 'Lose or leave and the whole run is undone.',
}

export const GYM_PROMPTS = {
  challenge: 'face the next one',
  leader: 'the leader is next',
}

export const GYMS_HINTS = ' ↑ ↓ browse · [enter] challenge the gym · [esc] back'
export const GYM_HINTS =
  ' ↑ ↓ pick one · [enter] next battle · [i] bag · [l] lead · [esc] give up'

export const MAX_NAME = 12
export const AVERAGE_IV = 15
export const PREVIEW_LEVEL = 5
export const STARTER_SPRITE_RESERVED_ROWS = 14

export const STARTER_PROMPTS = {
  intro: 'First things first.',
  askName: 'What should people call you?',
  choose: 'Choose your first Pokémon.',
}

export const STARTER_HINTS = {
  confirm: '[enter] confirm · up to',
  characters: 'characters',
  pick: '← → choose · [enter] take it with you',
}

export const OPTIONS_TITLE = 'OPTION'
export const OPTIONS_PREVIEW_SPECIES = 25
export const SETTING_LABEL_WIDTH = 10
export const SETTING_VALUE_WIDTH = 8

export const SETTING_LABELS = {
  spriteScale: 'SIZE',
  sound: 'SOUND',
  bell: 'BELL',
  updateCheck: 'UPDATE',
  starPrompt: 'STAR ASK',
}

export const SPRITE_SCALE_VALUES = [
  {
    value: 1,
    label: 'FULL',
    note: 'As big as the window allows, which is also as sharp as it gets.',
  },
  {
    value: 0.8,
    label: 'LARGE',
    note: 'A little smaller than the window could manage.',
  },
  {
    value: 0.65,
    label: 'MEDIUM',
    note: 'Leaves more of the screen to the menus and the message box.',
  },
  {
    value: 0.5,
    label: 'SMALL',
    note: 'Half size. Chunky, but it fits in a short tab.',
  },
]

export const SOUND_LABELS = { on: 'ON', off: 'OFF' }

export const SOUND_NOTES = {
  withPlayer:
    'Blips in the menus and a theme under a battle. One switch for every sound the game makes.',
  withoutPlayer:
    'No player on this machine (afplay, paplay, aplay, ffplay), so nothing will come of it.',
  off: 'No blips. The bell below is a separate thing.',
}

export const BELL_VALUES = [
  {
    value: true,
    label: 'ON',
    note: 'Ring the terminal bell when Claude finishes or needs you.',
  },
  { value: false, label: 'OFF', note: 'Never make a sound.' },
]

export const UPDATE_CHECK_BY_MODE = {
  off: false,
  launch: 'launch',
  daily: true,
}

export const UPDATE_CHECK_VALUES = [
  {
    value: true,
    label: 'DAILY',
    note: 'Ask once a day whether a new claudemon is out. The only network this game uses.',
  },
  {
    value: 'launch',
    label: 'LAUNCH',
    note: 'Ask every time claudemon starts. One request a launch, and never while you play.',
  },
  {
    value: false,
    label: 'OFF',
    note: 'Never look. Nothing here opens a socket, and no new version is offered.',
  },
]

export const STAR_ASK_VALUES = [
  {
    value: true,
    label: 'ON',
    note: 'Let the professor ask for a GitHub star twice in a whole game, from here and nowhere else.',
  },
  {
    value: false,
    label: 'OFF',
    note: 'Never ask. The game says nothing about GitHub again, on this machine or the next.',
  },
]

export const CANVAS_CAPTION = {
  exact: 'pixel for pixel',
  detail: ' · quadrant blocks · 4px per cell',
}

export const OPTIONS_HINTS = ' ↑ ↓ choose · ← → change · [esc] back'

export const UPDATE_TITLE = 'UPDATE'
export const UPDATE_STEPS_TITLE = 'Steps'
export const MAX_UPDATE_WIDTH = 64
export const SPINNER = ['◐', '◓', '◑', '◒']
export const STATUS_MARKS = { ok: '✔', failed: '✘', pending: '·' }
export const UPDATE_HEADINGS = { newest: 'newest', unchanged: 'unchanged' }

export const UPDATE_CLOSING_MESSAGES = {
  failed:
    'Nothing was half-installed — every step here is one that can be run again.',
  stillOn: 'Your claudemon is still',
  stillWorks: 'and still works.',
  alreadyNewest: 'Already the newest there is. Still',
  onDisk: 'is on the disk. Two things left, both one-offs:',
  restart: '  1. Restart Claude Code, so the new hooks and status line load.',
  quitAndRun: '  2. Quit the game and run',
  again: 'again.',
}

export const UPDATE_FOOTERS = {
  running: ' working — this cannot be interrupted safely',
  done: ' [esc] back',
}

export const TRAINER_TITLE = 'TRAINER'
export const TRAINER_HINTS = ' ↑ ↓ read · [s] share as a card · [esc] back'
export const TRAINER_RECORD_TITLE = 'RECORD'
export const TRAINER_ACHIEVEMENTS_TITLE = 'ACHIEVEMENTS'
export const TRAINER_RECORD_WIDTH = 26
export const TRAINER_RECORD_LABEL_WIDTH = 9
export const TRAINER_ACHIEVEMENT_WIDTH = 24
export const TRAINER_LIST_WIDTH = 40
export const TRAINER_ROWS_RESERVED = 9

export const ACHIEVEMENT_MARKS = { earned: '●', locked: '○' }

export const TRAINER_RECORD_LABELS = {
  caught: 'Caught',
  shiny: 'Shiny',
  battles: 'Battles',
  won: 'Won',
  lost: 'Lost',
  ran: 'Ran',
  streak: 'Streak',
  worked: 'Worked',
  money: 'Money',
}

export const TRAINER_NOTES = {
  day: 'day',
  days: 'days',
  onTheRoad: 'on the road',
  earned: 'Earned',
  badges: 'badges',
}

export const STAR_PANEL_TITLE = 'PROF. OAK'
export const MAX_STAR_WIDTH = 56

export const STAR_LINES = [
  'So, are you enjoying your journey?',
  'A ★ on GitHub helps other trainers find claudemon.',
]

export const STAR_CHOICES = [
  { key: '[enter]', label: 'leave a star' },
  { key: '[n]', label: 'not now' },
  { key: '[d]', label: 'never ask' },
]
