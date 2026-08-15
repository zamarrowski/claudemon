export const APP_TITLE = 'claudemon'

export const CURSOR_DELTAS = {
  up: -1,
  k: -1,
  left: -1,
  down: 1,
  j: 1,
  right: 1,
}

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

export const ACTIVITY_MESSAGES = {
  waiting: 'Claude needs you',
  working: 'Claude is working',
  idle: 'Claude is idle',
  unknown: '',
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
}

export const GRASS_MESSAGES = {
  rustling: 'Rustling in the grass…',
  quiet: 'The grass is quiet.',
}

export const WALK_HINTS = {
  working: 'Every moment Claude works is a step further in.',
  idle: 'Keep working in Claude Code — longer prompts walk further.',
}

export const HOME_HINTS = '← → choose · [enter] open · [q] quit'

export const HOME_TEAM_PANEL_TITLE = 'Team'

export const GRASS_BLADES = 26
export const GRASS_BLADE = 'ʬ'

export const BALL_HOME = { left: 18, top: 74 }
export const BALL_TARGET = { left: 72, top: 28 }
export const BALL_ARC = 42

export const BATTLE_MAIN_MENU = ['FIGHT', 'BAG', 'POKÉMON', 'RUN']

export const BATTLE_PROMPTS = {
  more: 'press any key',
  back: '[esc] back',
  useItem: 'Use which item?',
  switchTo: 'Switch to which Pokémon?',
  declineMove: 'Do not learn it',
  statusMove: 'Status',
}

export const DEX_TITLE = 'POKÉDEX'
export const DEX_UNKNOWN_NAME = '-----'
export const DEX_PAGE_STEP = 12
export const BASE_STAT_MAX = 160

export const DEX_SORT = { number: 'number', name: 'name' }
export const DEX_SORT_LABELS = { number: '#', name: 'A–Z' }
export const DEX_HINTS = '↑ ↓ browse · [s] sort · [esc] back'

export const DEX_MESSAGES = {
  baseStats: 'Base stats',
  evolvesInto: 'Evolves into',
  notCaught: 'Seen, but not yet caught.',
  fillItIn: 'Catch one to fill in its entry.',
  noData: 'No data.',
}

export const EVOLUTION_WORDING = {
  level: 'at level',
  item: 'with a',
  trade: 'by trading',
}

export const STAT_LABELS_SHORT = {
  hp: 'HP',
  attack: 'Atk',
  defense: 'Def',
  spAttack: 'SpA',
  spDefense: 'SpD',
  speed: 'Spd',
}

export const TEAM_TITLE = 'TEAM'
export const BAG_TITLE = 'BAG'
export const LEAD_MARK = '★'
export const TEAM_SORT_LABELS = { order: 'party', level: 'Lv' }
export const BOX_SORT_LABELS = { order: 'caught', level: 'Lv' }

export const TEAM_HINTS =
  '↑ ↓ browse · [enter] lead · [s] sort · [i] items · [d] to the box · [esc] back'
export const TEAM_KEY_HINTS =
  '[b] the box · [c] the day care · [t] trade it away · [r] take one in'
export const TEAM_BAG_HINTS = '↑ ↓ choose · [enter] use it · [esc] put it away'

export const TEAM_MESSAGES = {
  noPokemon: 'You have no Pokémon.',
}

export const BOX_TITLE = 'BOX'
export const BOX_HINTS =
  '↑ ↓ browse · [s] sort · [enter] take it out · [esc] back'

export const BOX_NOTES = {
  empty: 'The box is empty.',
  waitingHere: 'Anything you catch while your team is full waits in here.',
}

export const DAYCARE_TITLE = 'DAY CARE'
export const EMPTY_SLOT_LABEL = '— nobody here —'
export const FROM_BOX_TAG = 'box'

export const DAYCARE_NOTES = {
  needTwo: 'Leave two here and they might get on.',
  getAlong: 'The two seem to get along.',
  noSpark: 'The two prefer to play with other Pokémon.',
  raising: 'Whoever waits here keeps gaining EXP while Claude works.',
  noEgg: 'No egg yet.',
  inside: 'Something is moving inside.',
  onlyWhileOpen: 'It only comes along while Claude works and this is open.',
  steps: 'steps',
  pick: 'Leave which one here?',
}

export const DAYCARE_HINTS =
  '↑ ↓ pick a slot · [enter] leave one here, or take it back · [esc] back'
export const DAYCARE_PICK_HINTS =
  '↑ ↓ choose one · [enter] leave it here · [esc] never mind'

export const TRADE_TITLE = 'TRADE'
export const TRADE_WARNING_TITLE = 'One way'

export const TRADE_WARNING = {
  leaves: 'leaves your game the moment the code exists.',
  noWayBack: 'You cannot take it back, and the code will not work here.',
  exact: 'Whoever pastes it gets this exact Pokémon — level, moves,',
  andAll: 'nickname and all.',
}

export const TRADE_PROMPTS = {
  ask: 'Give',
  away: 'away?',
  onItsWay: 'is on its way. Hand this code over:',
  copied: 'Copied to your clipboard.',
  notCopied: 'Select it and copy it yourself.',
  writtenTo: 'Written to',
  gone: 'It is out of your game now.',
  paste: 'Paste the code you were given.',
  onceOnly: 'A code works once, and never in the game it came from.',
  copy: 'copy',
}

export const TRADE_CONFIRM_HINTS = '[enter] make the code · [esc] keep it'
export const TRADE_CODE_HINTS = '[c] copy · [esc] back'
export const TRADE_RECEIVE_HINTS = '[enter] take it in · [esc] never mind'

export const SHOP_TITLE = 'SHOP'
export const BULK_QUANTITY = 5
export const SHOP_MONEY_LABEL = 'you have'
export const SHOP_OWNED_LABEL = 'have'
export const SHOP_HINTS =
  '↑ ↓ browse · [enter] buy one · [5] buy five · [esc] back'

export const GYMS_TITLE = 'GYMS'
export const GYM_TITLE_SUFFIX = 'GYM'
export const GYM_ROSTER_PANEL_TITLE = 'Gauntlet'
export const GYM_ROSTER_MARKS = { beaten: '✔', next: '▶', pending: '·' }

export const GYM_NOTES = {
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

export const GYMS_HINTS = '↑ ↓ browse · [enter] challenge the gym · [esc] back'
export const GYM_HINTS =
  '↑ ↓ pick one · [enter] next battle · [i] bag · [l] lead · [esc] give up'

export const MAX_NAME = 12

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

export const SETTING_LABELS = {
  sound: 'SOUND',
  bell: 'BELL',
  updateCheck: 'UPDATE',
}

export const SOUND_VALUES = [
  {
    value: true,
    label: 'ON',
    note: 'Blips in the menus and a theme under a battle.',
  },
  {
    value: false,
    label: 'OFF',
    note: 'No blips. The bell below is a separate thing.',
  },
]

export const BELL_VALUES = [
  {
    value: true,
    label: 'ON',
    note: 'Ping when Claude finishes or needs you, even in another tab.',
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
    note: 'Ask every time claudemon starts, and never while you play.',
  },
  {
    value: false,
    label: 'OFF',
    note: 'Never look. Nothing here opens a socket.',
  },
]

export const OPTIONS_HINTS = '↑ ↓ choose · ← → change · [esc] back'

export const UPDATE_TITLE = 'UPDATE'
export const UPDATE_STEPS_TITLE = 'Steps'
export const STATUS_MARKS = { ok: '✔', failed: '✘', pending: '·', running: '◐' }

export const UPDATE_CLOSING_MESSAGES = {
  failed:
    'Nothing was half-installed — every step here is one that can be run again.',
  stillOn: 'Your claudemon is still',
  stillWorks: 'and still works.',
  alreadyNewest: 'Already the newest there is. Still',
  onDisk: 'is on the disk. Two things left, both one-offs:',
  restart: '1. Restart Claude Code, so the new hooks and status line load.',
  quitAndRun: '2. Quit the game and run',
  again: 'again.',
}

export const UPDATE_FOOTERS = {
  running: 'working — this cannot be interrupted safely',
  done: '[esc] back',
}

export const TRAINER_TITLE = 'TRAINER'
export const TRAINER_HINTS = '[s] share as a card · [esc] back'
export const TRAINER_RECORD_TITLE = 'RECORD'
export const TRAINER_ACHIEVEMENTS_TITLE = 'ACHIEVEMENTS'
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

export const EMPTY_BAG_MESSAGE = 'Your bag is empty.'
export const FAINTED_TAG = 'FNT'
export const CAUGHT_GLYPH = '◓'

export const BAG_MODES = new Set(['team', 'gym'])
