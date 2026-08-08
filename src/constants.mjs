export const CRIT_CHANCE = 1 / 16
export const HIGH_CRIT_CHANCE = 1 / 8
export const SLEEP_WAKE_CHANCE = 1 / 3
export const THAW_CHANCE = 0.2
export const PARALYSIS_SKIP_CHANCE = 0.25
export const CRIT_MULTIPLIER = 1.5
export const STAB_MULTIPLIER = 1.5
export const STAGE_LIMIT = 6
export const STRUGGLE_RECOIL_FRACTION = 4
export const DAMAGE_VARIANCE = { min: 217, max: 255 }
export const POISON_FRACTIONS = { poison: 8, burn: 16 }
export const SLEEP_TURNS = { min: 1, max: 3 }
export const CONFUSION_TURNS = { min: 2, max: 5 }
export const CONFUSION_SELF_HIT_CHANCE = 0.5
export const CONFUSION_SELF_HIT_POWER = 40
export const TRAP_TURNS = { min: 2, max: 5 }
export const TRAP_FRACTION = 16
export const DISABLE_TURNS = { min: 2, max: 5 }
export const LEECH_SEED_FRACTION = 8
export const FALLBACK_POWER = { 'low-kick': 50 }
export const RUN_ODDS = { max: 0.95, speedFactor: 0.5, perAttempt: 0.15 }
export const FOE_AI_SCORES = { defaultPower: 40, status: 15 }
export const OHKO_MOVES = new Set(['guillotine', 'horn-drill', 'fissure'])

export const UNSUPPORTED_MOVES = new Set([
  'counter',
  'mirror-move',
  'metronome',
  'transform',
])

export const STRUGGLE = {
  move: 'struggle',
  data: {
    name: 'Struggle',
    type: 'normal',
    power: 50,
    accuracy: null,
    pp: 1,
    priority: 0,
    damageClass: 'physical',
    ailment: null,
    statChanges: [],
    critRate: 0,
  },
}

export const STATUS_LABELS = {
  burn: 'was burned',
  poison: 'was poisoned',
  paralysis: 'is paralysed',
  sleep: 'fell asleep',
  freeze: 'was frozen solid',
}

export const STAT_LABELS = {
  attack: 'Attack',
  defense: 'Defense',
  spAttack: 'Sp. Atk',
  spDefense: 'Sp. Def',
  speed: 'Speed',
  accuracy: 'accuracy',
  evasion: 'evasion',
}

export const AILMENT_IMMUNE_TYPES = {
  burn: ['fire'],
  poison: ['poison', 'steel'],
  freeze: ['ice'],
  paralysis: ['electric'],
  'leech-seed': ['grass'],
}

export const VOLATILE_MESSAGES = {
  confused: 'became confused!',
  trappedBy: 'was trapped by',
  freedFrom: 'was freed from',
  hurtBy: 'is hurt by',
  wasDisabled: 'was disabled!',
  noLongerDisabled: 'is no longer disabled!',
  stillConfused: 'is confused!',
  snappedOut: 'snapped out of its confusion!',
  hurtItself: 'It hurt itself in its confusion!',
  flinched: 'flinched and could not move!',
  seeded: 'was seeded!',
  sapped: "'s health is sapped by Leech Seed!",
}

export const TURN_MESSAGES = {
  noPp: 'No PP left for that move!',
  failed: 'But it failed!',
  oneHitKo: "It's a one-hit KO!",
  criticalHit: 'A critical hit!',
  gotAway: 'Got away safely!',
  stuck: "Couldn't get away!",
  cantEscape: "Can't escape!",
  disabled: 'is disabled!',
  recoil: 'is hit by recoil!',
  energyDrained: 'had its energy drained!',
  wokeUp: 'woke up!',
  fastAsleep: 'is fast asleep.',
  thawedOut: 'thawed out!',
  frozenSolid: 'is frozen solid!',
  fullyParalysed: "is paralysed and can't move!",
}

export const FOE_LABELS = { wild: 'the wild', trainer: "the foe's" }

export const TRAINER_MESSAGES = {
  wantsToBattle: 'wants to battle!',
  sentOut: 'sent out',
  defeated: 'was defeated!',
  noRunning: 'No! There is no running from a trainer battle!',
  noStealing: "Don't be a thief! That Pokémon belongs to somebody.",
}

export const TRAINER_REFUSALS = {
  ball: TRAINER_MESSAGES.noStealing,
  run: TRAINER_MESSAGES.noRunning,
}

export const CATCH_COMPLAINTS = [
  'Oh no! The Pokemon broke free!',
  'Aargh! Almost had it!',
  'Aargh! Almost had it!',
  'Shoot! It was so close too!',
]

export const EFFECTIVENESS_MESSAGES = {
  immune: "It doesn't affect the foe...",
  superEffective: "It's super effective!",
  notVeryEffective: "It's not very effective...",
}

export const DEFAULT_CATCH_BONUS = 1

export const STATUS_CATCH_BONUS = {
  sleep: 2,
  freeze: 2,
  paralysis: 1.5,
  burn: 1.5,
  poison: 1.5,
}

export const BALLS = {
  'poke-ball': { name: 'Poké Ball', multiplier: 1 },
  'great-ball': { name: 'Great Ball', multiplier: 1.5 },
  'ultra-ball': { name: 'Ultra Ball', multiplier: 2 },
  'master-ball': { name: 'Master Ball', multiplier: 255 },
}

export const MAX_LEVEL = 100
export const MOVE_LIMIT = 4
export const IV_MAX = 31
export const EXP_DIVISOR = 7
export const MONEY_PER_LEVEL = 12
export const MONEY_JITTER_PER_LEVEL = 4

export const STAT_NAMES = [
  'hp',
  'attack',
  'defense',
  'spAttack',
  'spDefense',
  'speed',
]

export const PARTY_ITEM_KINDS = new Set(['heal', 'cure', 'revive', 'stone'])

export const ITEM_MESSAGES = {
  noSuchItem: 'No such item.',
  cannotAfford: "You can't afford that.",
  nothingHappened: 'Nothing happened.',
  faintedNoEffect: 'It had no effect on a fainted Pokémon.',
  noEffect: 'It would have no effect.',
  healthyAgain: 'It became healthy again.',
  revived: 'It was revived!',
}

export const ITEMS = {
  'poke-ball': {
    name: 'Poké Ball',
    kind: 'ball',
    price: 200,
    description: 'A basic ball.',
  },
  'great-ball': {
    name: 'Great Ball',
    kind: 'ball',
    price: 600,
    description: 'Catches better than a Poké Ball.',
  },
  'ultra-ball': {
    name: 'Ultra Ball',
    kind: 'ball',
    price: 1200,
    description: 'A high performance ball.',
  },
  'master-ball': {
    name: 'Master Ball',
    kind: 'ball',
    price: null,
    description: 'Never fails. Cannot be bought.',
  },

  potion: {
    name: 'Potion',
    kind: 'heal',
    heals: 20,
    price: 300,
    description: 'Restores 20 HP.',
  },
  'super-potion': {
    name: 'Super Potion',
    kind: 'heal',
    heals: 50,
    price: 700,
    description: 'Restores 50 HP.',
  },
  'hyper-potion': {
    name: 'Hyper Potion',
    kind: 'heal',
    heals: 200,
    price: 1200,
    description: 'Restores 200 HP.',
  },
  'full-restore': {
    name: 'Full Restore',
    kind: 'heal',
    heals: Infinity,
    cures: true,
    price: 3000,
    description: 'Fully restores HP and status.',
  },
  'full-heal': {
    name: 'Full Heal',
    kind: 'cure',
    price: 600,
    description: 'Cures any status condition.',
  },
  revive: {
    name: 'Revive',
    kind: 'revive',
    price: 1500,
    description: 'Revives a fainted Pokémon to half HP.',
  },

  'fire-stone': {
    name: 'Fire Stone',
    kind: 'stone',
    price: 2100,
    description: 'Evolves certain Pokémon.',
  },
  'water-stone': {
    name: 'Water Stone',
    kind: 'stone',
    price: 2100,
    description: 'Evolves certain Pokémon.',
  },
  'thunder-stone': {
    name: 'Thunder Stone',
    kind: 'stone',
    price: 2100,
    description: 'Evolves certain Pokémon.',
  },
  'leaf-stone': {
    name: 'Leaf Stone',
    kind: 'stone',
    price: 2100,
    description: 'Evolves certain Pokémon.',
  },
  'moon-stone': {
    name: 'Moon Stone',
    kind: 'stone',
    price: 2100,
    description: 'Evolves certain Pokémon.',
  },
}

export const SAVE_VERSION = 1
export const PARTY_LIMIT = 6
export const STARTER_LEVEL = 5
export const STARTING_MONEY = 3000
export const STARTERS = [1, 4, 7]
export const STARTING_BAG = { 'poke-ball': 5, potion: 3 }

export const EMPTY_STATS = {
  battles: 0,
  wins: 0,
  losses: 0,
  caught: 0,
  runs: 0,
  streak: 0,
  lastPlayedAt: null,
}

export const STARTER_CAUGHT_COUNT = 1

export const SPRITE_SCALE_MIN = 0.4
export const SPRITE_SCALE_MAX = 1

export const DEFAULT_CONFIG = {
  encounterChance: 0.12,

  trainerChance: 0.15,

  charsPerStep: 40,

  maxSteps: 4,

  workStepSeconds: 20,

  sound: true,

  bell: true,

  updateCheck: true,

  encounterTtlSeconds: 30,

  spriteScale: 1,

  wrappedStatusLine: null,

  probeRows: null,
}

export const DAY_MS = 24 * 60 * 60_000

export const EMPTY_WORKED = { totalMs: 0, updatedAt: null }

export const STALE_MS = 30 * 60_000
export const PRUNE_MS = 24 * 60 * 60_000
export const WAITING_MESSAGE_LIMIT = 120
export const ACTIVITY_PRIORITY = ['waiting', 'working', 'idle']
export const ACTIVITY_VERSION = 1

export const LEGENDARY_LEVEL_GATE = 40
export const DEFAULT_CAPTURE_RATE = 45
export const STAGE_LEVEL_GATES = { 1: 16, 2: 32 }
export const ENCOUNTER_VERSION = 1

export const WILD_LEVEL_SPREAD = {
  min: 2,
  fallbackMax: 5,
  below: 3,
  above: 2,
  ceiling: 100,
}

export const TRAINER_LEVEL_SPREAD = {
  min: 2,
  fallbackMax: 5,
  below: 1,
  above: 3,
  ceiling: 100,
}

export const TRAINER_LEVELS_PER_MON = 12
export const TRAINER_EXP_BONUS = 1.5

export const TRAINER_CLASSES = [
  {
    name: 'Bug Catcher',
    maxMons: 3,
    prize: 22,
    sprites: ['bugcatcher', 'bugcatcher-gen4dp'],
  },
  {
    name: 'Youngster',
    maxMons: 2,
    prize: 25,
    sprites: ['youngster', 'youngster-gen4', 'youngster-gen4dp'],
  },
  {
    name: 'Lass',
    maxMons: 3,
    prize: 30,
    sprites: ['lass', 'lass-gen4', 'lass-gen4dp'],
  },
  { name: 'Biker', maxMons: 4, prize: 40, sprites: ['biker', 'biker-gen4'] },
  { name: 'Hiker', maxMons: 3, prize: 45, sprites: ['hiker', 'hiker-gen4'] },
  { name: 'Sailor', maxMons: 4, prize: 50, sprites: ['sailor', 'sailor-gen6'] },
  {
    name: 'Super Nerd',
    maxMons: 4,
    prize: 55,
    sprites: ['scientist', 'scientist-gen4', 'scientist-gen4dp'],
  },
  {
    name: 'Cooltrainer',
    maxMons: 5,
    prize: 70,
    sprites: ['acetrainer-gen4dp', 'acetrainerf-gen4dp'],
  },
  {
    name: 'Ace Trainer',
    maxMons: 6,
    prize: 80,
    sprites: [
      'acetrainer',
      'acetrainerf',
      'acetrainer-gen4',
      'acetrainerf-gen4',
    ],
  },
]

export const GYM_SEED_STRIDE = 97

export const GYM_STATUSES = {
  beaten: 'beaten',
  next: 'next',
  pending: 'pending',
}

export const GYMS = [
  {
    id: 'pewter',
    city: 'Pewter',
    type: 'rock',
    badge: 'Boulder Badge',
    trainers: [
      {
        class: 'Camper',
        name: 'Liam',
        sprite: 'camper',
        prize: 40,
        team: [
          { species: 74, level: 10 },
          { species: 27, level: 11 },
        ],
      },
      {
        class: 'Hiker',
        name: 'Wade',
        sprite: 'hiker',
        prize: 45,
        team: [
          { species: 74, level: 11 },
          { species: 95, level: 12 },
        ],
      },
    ],
    leader: {
      class: 'Leader',
      name: 'Brock',
      sprite: 'brock',
      prize: 90,
      team: [
        { species: 74, level: 12 },
        { species: 95, level: 14 },
      ],
    },
  },
  {
    id: 'cerulean',
    city: 'Cerulean',
    type: 'water',
    badge: 'Cascade Badge',
    trainers: [
      {
        class: 'Swimmer',
        name: 'Diana',
        sprite: 'swimmer',
        prize: 50,
        team: [
          { species: 118, level: 16 },
          { species: 116, level: 17 },
        ],
      },
      {
        class: 'Lass',
        name: 'Briana',
        sprite: 'lass',
        prize: 50,
        team: [
          { species: 60, level: 17 },
          { species: 90, level: 18 },
        ],
      },
    ],
    leader: {
      class: 'Leader',
      name: 'Misty',
      sprite: 'misty',
      prize: 100,
      team: [
        { species: 120, level: 18 },
        { species: 121, level: 21 },
      ],
    },
  },
  {
    id: 'vermilion',
    city: 'Vermilion',
    type: 'electric',
    badge: 'Thunder Badge',
    trainers: [
      {
        class: 'Sailor',
        name: 'Dwayne',
        sprite: 'sailor',
        prize: 55,
        team: [
          { species: 25, level: 21 },
          { species: 81, level: 21 },
        ],
      },
      {
        class: 'Gentleman',
        name: 'Tucker',
        sprite: 'gentleman',
        prize: 60,
        team: [
          { species: 81, level: 22 },
          { species: 100, level: 23 },
        ],
      },
    ],
    leader: {
      class: 'Leader',
      name: 'Lt. Surge',
      sprite: 'ltsurge',
      prize: 110,
      team: [
        { species: 100, level: 24 },
        { species: 25, level: 24 },
        { species: 26, level: 26 },
      ],
    },
  },
  {
    id: 'celadon',
    city: 'Celadon',
    type: 'grass',
    badge: 'Rainbow Badge',
    trainers: [
      {
        class: 'Lass',
        name: 'Michelle',
        sprite: 'lass-gen4',
        prize: 60,
        team: [
          { species: 43, level: 27 },
          { species: 69, level: 27 },
        ],
      },
      {
        class: 'Beauty',
        name: 'Tamia',
        sprite: 'beauty',
        prize: 65,
        team: [
          { species: 102, level: 28 },
          { species: 70, level: 29 },
        ],
      },
    ],
    leader: {
      class: 'Leader',
      name: 'Erika',
      sprite: 'erika',
      prize: 120,
      team: [
        { species: 114, level: 29 },
        { species: 71, level: 29 },
        { species: 45, level: 31 },
      ],
    },
  },
  {
    id: 'fuchsia',
    city: 'Fuchsia',
    type: 'poison',
    badge: 'Soul Badge',
    trainers: [
      {
        class: 'Juggler',
        name: 'Kayden',
        sprite: 'juggler',
        prize: 70,
        team: [
          { species: 109, level: 34 },
          { species: 88, level: 34 },
        ],
      },
      {
        class: 'Tamer',
        name: 'Edgar',
        sprite: 'blackbelt',
        prize: 75,
        team: [
          { species: 42, level: 35 },
          { species: 30, level: 36 },
        ],
      },
    ],
    leader: {
      class: 'Leader',
      name: 'Koga',
      sprite: 'koga',
      prize: 130,
      team: [
        { species: 109, level: 37 },
        { species: 89, level: 39 },
        { species: 110, level: 43 },
      ],
    },
  },
  {
    id: 'saffron',
    city: 'Saffron',
    type: 'psychic',
    badge: 'Marsh Badge',
    trainers: [
      {
        class: 'Psychic',
        name: 'Johan',
        sprite: 'psychic',
        prize: 80,
        team: [
          { species: 96, level: 38 },
          { species: 79, level: 38 },
        ],
      },
      {
        class: 'Channeler',
        name: 'Tamara',
        sprite: 'channeler-gen1',
        prize: 80,
        team: [
          { species: 92, level: 39 },
          { species: 93, level: 40 },
        ],
      },
    ],
    leader: {
      class: 'Leader',
      name: 'Sabrina',
      sprite: 'sabrina',
      prize: 140,
      team: [
        { species: 64, level: 38 },
        { species: 122, level: 40 },
        { species: 65, level: 43 },
      ],
    },
  },
  {
    id: 'cinnabar',
    city: 'Cinnabar',
    type: 'fire',
    badge: 'Volcano Badge',
    trainers: [
      {
        class: 'Super Nerd',
        name: 'Erik',
        sprite: 'scientist',
        prize: 85,
        team: [
          { species: 77, level: 41 },
          { species: 58, level: 41 },
        ],
      },
      {
        class: 'Burglar',
        name: 'Ramon',
        sprite: 'burglar',
        prize: 90,
        team: [
          { species: 37, level: 42 },
          { species: 126, level: 43 },
        ],
      },
    ],
    leader: {
      class: 'Leader',
      name: 'Blaine',
      sprite: 'blaine',
      prize: 150,
      team: [
        { species: 58, level: 42 },
        { species: 78, level: 44 },
        { species: 59, level: 47 },
      ],
    },
  },
  {
    id: 'viridian',
    city: 'Viridian',
    type: 'ground',
    badge: 'Earth Badge',
    trainers: [
      {
        class: 'Cooltrainer',
        name: 'Samuel',
        sprite: 'acetrainer',
        prize: 95,
        team: [
          { species: 33, level: 45 },
          { species: 28, level: 45 },
        ],
      },
      {
        class: 'Cooltrainer',
        name: 'Naoko',
        sprite: 'acetrainerf',
        prize: 95,
        team: [
          { species: 105, level: 46 },
          { species: 51, level: 47 },
        ],
      },
    ],
    leader: {
      class: 'Leader',
      name: 'Giovanni',
      sprite: 'giovanni',
      prize: 160,
      team: [
        { species: 111, level: 45 },
        { species: 31, level: 46 },
        { species: 34, level: 48 },
        { species: 112, level: 50 },
      ],
    },
  },
]

export const TRAINER_NAMES = [
  'Joey',
  'Mikey',
  'Calvin',
  'Sally',
  'Rick',
  'Dana',
  'Cole',
  'Jasmine',
  'Otis',
  'Lola',
  'Beverly',
  'Hugh',
  'Nolan',
  'Kelsey',
  'Wade',
  'Iris',
  'Marc',
  'Dawn',
  'Tucker',
  'Priya',
]

export const FALLBACK_SPECIES = [
  { id: 16, name: 'Pidgey', weight: 20 },
  { id: 19, name: 'Rattata', weight: 20 },
  { id: 10, name: 'Caterpie', weight: 14 },
  { id: 13, name: 'Weedle', weight: 14 },
  { id: 21, name: 'Spearow', weight: 12 },
  { id: 41, name: 'Zubat', weight: 12 },
  { id: 74, name: 'Geodude', weight: 10 },
  { id: 129, name: 'Magikarp', weight: 10 },
  { id: 43, name: 'Oddish', weight: 8 },
  { id: 69, name: 'Bellsprout', weight: 8 },
  { id: 46, name: 'Paras', weight: 7 },
  { id: 48, name: 'Venonat', weight: 7 },
  { id: 52, name: 'Meowth', weight: 6 },
  { id: 54, name: 'Psyduck', weight: 6 },
  { id: 60, name: 'Poliwag', weight: 6 },
  { id: 27, name: 'Sandshrew', weight: 5 },
  { id: 25, name: 'Pikachu', weight: 3 },
  { id: 133, name: 'Eevee', weight: 2 },
  { id: 143, name: 'Snorlax', weight: 1 },
]

export const SAMPLE_RATE = 22050
export const FADE_MS = 2
export const MIN_GAP_MS = 45
export const MAX_IN_FLIGHT = 3
export const MIN_LOOP_MS = 500
export const INT16_MAX = 32767
export const WAV_HEADER_BYTES = 44
export const WAV_RIFF_OVERHEAD_BYTES = 36
export const WAV_FMT_CHUNK_BYTES = 16
export const WAV_PCM_FORMAT = 1
export const WAV_CHANNELS = 1
export const WAV_BYTES_PER_SAMPLE = 2
export const WAV_BITS_PER_SAMPLE = 16

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
}

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

export const MOVE_SLOTS_FULL_LINE = 'but it already knows four moves.'

export const HP_DRAIN_STEPS = 24
export const FRAMES_PER_STEP = 2
export const FRAMES_PER_SPIN = 3
export const BATTLE_ITEM_KINDS = new Set(['heal', 'cure', 'revive'])

export const HOME_NOTICES = {
  working: 'Not while Claude is working — rest when it does.',
  healed: 'Your team and box are back to full health.',
  wipedOut: 'Your whole team has fainted. Heal before heading out.',
}

export const BOX_MESSAGES = {
  lastOne: 'That is your last Pokémon — somebody has to fight.',
  teamFull: 'Your team is full. Send one to the box first.',
}

export const BAG_MESSAGES = {
  empty: 'Your bag is empty — the shop sells balls, potions and stones.',
  noRoomForMove: 'There was no room for it, so it kept the four it knows.',
}

export const BAG_MODES = new Set(['team', 'gym'])

export const GYM_MESSAGES = {
  wipedOut: 'Your whole team has fainted. Heal before you challenge a gym.',
  downInside:
    'Your team is down. Use a Revive, or walk out — there is no rest in here.',
  thrownOut: 'The gym showed you the door.',
  defeated: 'You went down before the badge did.',
  forfeited: 'You walked out. Nothing in there counted.',
  earned: 'is yours!',
  stillYours: 'is still yours.',
}

export const BATTLE_MESSAGES = {
  noPp: 'There is no PP left for that move!',
  disabled: 'That move is disabled!',
  joinedTeam: 'It joined your team!',
  wentToBox: 'Your team was full, so it went to the box.',
  blackout: [
    'You have no Pokémon able to fight!',
    'You scurried back to safety...',
  ],
  noRest: 'There is no rest while Claude works — your team stays down.',
  forgetting: '1, 2 and... poof!',
}

export const HEARTBEAT_MS = 5000
export const POLL_MS = 2000
export const UPDATE_POLL_MS = 60_000
export const TICK_MS = 500
export const FRAME_MS = 60
export const DATASET_MISSING_MESSAGE = 'The Pokemon dataset is missing.'
export const DATASET_MISSING_HINT =
  'Run: node tools/fetch-data.mjs  (and node tools/fetch-sprites.mjs)'

export const CARD_NO_SAVE_MESSAGE = 'There is no save to make a card from yet.'
export const CARD_NO_SAVE_HINT =
  'Run claudemon, pick a starter, then try again.'
export const CARD_WRITTEN_PREFIX = 'Trainer card written to '
export const CARD_OUT_FLAG = '--out'
export const CARD_NO_OPEN_FLAG = '--no-open'

export const REVEAL_COMMANDS = {
  darwin: { command: 'open', args: (path) => [path] },
  win32: { command: 'explorer.exe', args: (path) => [path] },
  default: { command: 'xdg-open', args: (path) => [path] },
}
