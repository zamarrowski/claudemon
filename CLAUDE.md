# AI Agent Guidelines

This document provides instructions for AI agents working on the claudemon codebase.

claudemon is a Pokémon game driven by Claude Code activity. `claudemon` starts a
local Node server and opens the game in a browser tab: plain ESM everywhere, no build
step, no runtime dependencies, no framework — the browser loads the same `.mjs` files
that are on disk.

These rules are the house style. Where existing code contradicts them, the existing
code is wrong and gets brought in line as it is touched — do NOT copy a violation
because the file next to you has one, and do NOT cite existing code as precedent
against a rule here.

## Project shape

```
bin/claudemon        entry point: parse arguments, boot the server, open the browser
server/              the local HTTP server: static files, JSON API, SSE stream
src/                 the engine — runs in BOTH the browser and Node
src/node/            everything that touches the machine (fs, child_process, zlib)
web/                 the client: index.html, styles/, js/
web/js/views/        one file per screen, each exporting draw() and onKey()
scripts/             Claude Code hook handlers and the status line
tools/               dev-time scripts (fetch data, fetch sprites, install)
test/                cross-cutting suites (hooks, status line, paths, engine)
data/                generated dataset, checked in — never hand-edited
```

Everything is ESM, `.mjs`, Node >= 20.19. The runner is Vitest. Prettier owns
formatting (no semicolons, single quotes, 80 columns) — write the code and run
`npm run format`, never hand-align anything.

### The engine runs in two places

`src/*.mjs` is loaded by the browser over HTTP (the server serves `/src/`) and
imported by Node. So **nothing directly under `src/` may import `node:*`, and nothing
there may import from `src/node/`** — ESLint fails the build if it does. Anything that
reads a file, spawns a process or unzips a buffer belongs in `src/node/`, and the
browser reaches it over the API.

The client imports the engine with the same relative path the disk has
(`../../src/battle.mjs`), so one specifier works in the browser, in Vitest and in the
linter's resolver. Do not invent an alias.

`src/data.mjs` holds the dataset in memory and is filled by whoever booted:
`initData()` from a `fetch` in the browser, `loadDataset()` from disk in Node. Never
read `data/` from engine code.

### The battle seam

The UI never mutates a battle itself. `createBattleFlow(session)` takes a session —
`{ state, submit(action), switchIn(mon), sendOut(mon) }` — and every change to the
battle goes through it. Today the only implementation is `createLocalSession` in
`src/battleSession.mjs`, which runs the engine in the browser. Because battles are
seeded and their state is plain JSON, a remote session is the only thing a networked
battle would need. Keep every mutation behind those four methods: the moment one of
them is bypassed — a view or the flow calling `submitAction`, `switchIn` or
`sendOutAfterFaint` directly — a remote session desyncs on that action, and the seam
is worth nothing.

## General Guidelines

### General Rules

**NO COMMENTS**: NEVER add comments to the code. Code should be self-documenting and
clear without them. If a block needs explaining, extract it into a named function
instead. The only comments allowed anywhere are tooling directives
(`// prettier-ignore`, `// eslint-disable-next-line`).

**NAMING CONVENTIONS**: Always use camelCase for naming variables, functions and
files. Module-level constants use SCREAMING_SNAKE_CASE.

**ARROW FUNCTIONS**: Declare functions as arrows assigned to a const, and export the
const. NEVER use `function` declarations.

```js
// ✅ GOOD
export const partyIsWipedOut = (save) => {
  return save.party.length > 0 && save.party.every(isFainted)
}

// ❌ BAD
export function partyIsWipedOut(save) {
  return save.party.length > 0 && save.party.every(isFainted)
}
```

**ARROW FUNCTION BODIES**: If the arrow function body fits on the same line, you can
use the implicit return (no braces, no `return`). If it doesn't fit on the same line
and needs to wrap, you MUST use `{}` with an explicit return. NEVER use an implicit
return that wraps to the next line.

```js
// ✅ GOOD — fits on the same line, implicit return
const levelOf = (mon) => mon.level
const isFainted = (mon) => mon.hp <= 0

// ✅ GOOD — doesn't fit on the same line, braces + explicit return
const getUsableMoves = (mon, includeStatus) => {
  return mon.moves.filter(
    (slot) => slot.pp > 0 && (includeStatus || slot.power),
  )
}

// ❌ BAD — implicit return wrapping to the next line
const getUsableMoves = (mon, includeStatus) =>
  mon.moves.filter((slot) => slot.pp > 0 && (includeStatus || slot.power))
```

**CONSTANTS**: If a module has constants (with no logic), they MUST be extracted to a
`constants.mjs` file. Lookup tables, message strings, tunable rates and stock lists
all belong there — never inline inside a branch.

There is **one `constants.mjs` per directory**, and a module imports from the one that
sits next to it: `src/constants.mjs`, `src/node/constants.mjs`, `server/constants.mjs`,
`web/js/constants.mjs`, `web/js/views/constants.mjs`, `scripts/constants.mjs`,
`tools/constants.mjs`. This is
what the flat **Project shape** above requires — do NOT promote a module to its own
folder just to give it a private constants file.

A constant only moves out if it is pure data. A value that calls a function, derives
from another value, or reads `process.env` is not a constant in this sense and stays in
the module that owns it — that is why every path in `src/node/paths.mjs` (all built
with `join()`) stays where it is.

```js
// ✅ GOOD — pure data, moves to src/constants.mjs
export const POISON_FRACTIONS = { poison: 8, burn: 16 }

// ✅ GOOD — derived at load time, stays in src/node/paths.mjs
export const SAVE_FILE = join(HOME, 'save.json')
```

**ONE CONCERN PER FILE**: Each file MUST cover one thing. NEVER put two unrelated
screens, two unrelated engines, or a screen and the logic it drives in the same file.

**MODULE TESTING**: Every time a new module is created, its corresponding tests MUST
be implemented.

**NO CONDITIONAL SPREAD**: NEVER use spread operators to assemble the arguments or
options a function receives. Always pass each field explicitly by name.

```js
// ✅ GOOD
createApp({
  screen: stubScreen(),
  save,
  config,
  playSound: noop,
})

// ❌ BAD
createApp({
  screen: stubScreen(),
  ...(save && { save }),
  ...options,
})
```

**NO INLINE CALLBACKS AS HANDLERS**: NEVER define an arrow function directly in the
call that registers it. Extract it into a named handler declared in the body above
and pass the reference. The only exception is inside iterators (`.map`, `.filter`,
`.some`), where the inline arrow is an argument, not a handler.

```js
// ✅ GOOD
const handleResize = () => paint(ctx)

screen.onResize(handleResize)

// ✅ GOOD — exception: inline inside an iterator
const usable = mon.moves.filter((slot) => slot.pp > 0)

// ❌ BAD
screen.onResize(() => paint(ctx))
```

**NO PREMATURE CACHING**: NEVER memoize a value or cache a computation by default.
Recomputing on each call is the correct, expected default — caching is an
optimization, not a style rule, and applying it everywhere only adds state to keep
in sync, extra noise, and a stale-value bug with zero benefit. Only cache when there
is a concrete, measured reason: the computation is genuinely expensive and runs on
every rendered frame, or a caller depends on getting the same object identity back.
A cheap `map`/`filter`/`find` over a small array is never one of those.

**NO NESTED FUNCTION DEFINITIONS**: NEVER declare a named function inside another
function. Every helper MUST live at module scope and receive everything it needs as
arguments — including the accumulator when it recurses. A function nested inside
another one closes over the outer variables instead of declaring its inputs, so it
cannot be tested or reused on its own, and the reader has to read the whole outer
function to understand what the inner one touches.

Two things this rule does NOT ban:

- Inline callbacks passed to an iterator or to another function
  (`.map(item => ...)`, `.filter(...)`, `.reduce(...)`). Those are arguments, not
  declarations.
- Handlers declared in the body of a factory that closes over its own state (see
  **NO INLINE CALLBACKS AS HANDLERS**). This rule is about helper functions nested
  inside plain functions.

```js
// ❌ BAD — the helper is trapped inside, and mutates a Set from the outer scope
const getEvolutionChainIds = (species) => {
  const ids = new Set()

  const collect = (entry) => {
    for (const next of entry.evolvesTo) {
      ids.add(next.id)

      if (next.evolvesTo) collect(next)
    }
  }

  collect(species)

  return ids
}

// ✅ GOOD — the helper is its own function, its inputs and output are explicit
const collectEvolutionIds = (entry, ids) => {
  for (const next of entry.evolvesTo) {
    ids.add(next.id)

    if (next.evolvesTo) collectEvolutionIds(next, ids)
  }

  return ids
}

export const getEvolutionChainIds = (species) =>
  collectEvolutionIds(species, new Set())
```

**BLANK LINES BETWEEN LOGICAL BLOCKS**: ALWAYS separate distinct logical blocks
within a function with blank lines. Group related statements together (e.g.
consecutive `if` statements stay together) and add a blank line between different
groups (e.g. declarations vs return, guards vs main logic).

```js
// ✅ GOOD — guards grouped together, blank line before the main logic
const getEndOfTurnDamage = (mon) => {
  const fraction = POISON_FRACTIONS[mon.status]

  if (isFainted(mon)) return 0
  if (!fraction) return 0

  return Math.max(1, Math.floor(mon.stats.hp / fraction))
}

// ❌ BAD — everything crammed without separation
const getEndOfTurnDamage = (mon) => {
  const fraction = POISON_FRACTIONS[mon.status]
  if (isFainted(mon)) return 0
  if (!fraction) return 0
  return Math.max(1, Math.floor(mon.stats.hp / fraction))
}
```

### Guards & Defensive Code

Guiding principle: decide where the data can legitimately be missing, handle it
there once, and trust it everywhere else. Checks scattered at every usage site do
not make the code safer — they hide where the real uncertainty is and turn a
missing-data bug into a silently empty screen.

A guard is justified ONLY when the value can actually be missing at that point:

- Data read from disk that may have been written by an older version (the save file,
  the config, the session files).
- Data from a network response that has not arrived yet, or failed.
- An argument that is genuinely optional.
- Anything outside the program's control: `process.env`, the terminal size, the
  output of a spawned process, whether the dataset has been fetched.
- A boundary function that normalizes one of the above (a transformer).

When a guard IS justified, it does not have to be an `if`. If the value can genuinely
be missing but the missing case needs no special treatment, a plain `?.` at the point
of use is enough — do not promote it to an early return that adds nothing. This is
NOT the same as `save = {}`: the `?.` stays local and visible exactly where the value
is read, while an empty-object default pretends the data exists for the whole module.

```js
// ✅ GOOD — the encounter may have expired and there is nothing special to show
const getEncounterLabel = (encounter) => speciesName(encounter?.species)

// ❌ BAD — an early return that adds nothing over `?.`
const getEncounterLabel = (encounter) => {
  if (!encounter) return null

  return speciesName(encounter.species)
}
```

Anywhere else — a required argument, a value the caller already checked, an object
you built two lines above — do not check it again.

**NO UNNECESSARY GUARDS**: NEVER add a check for a state that cannot happen. If the
caller already guaranteed the value (it early-returned, the argument is required, the
value was just built), the callee MUST use it directly. A duplicated guard tells the
reader "this can be missing" when it cannot, and every reader after you will keep
propagating the doubt downwards.

```js
// ✅ GOOD — one guard, in the only place where the data can actually be missing
export const drawParty = (save, size) => {
  if (!save.party.length) return drawEmptyParty(size)

  return save.party.map(drawPartyRow)
}

const drawPartyRow = (mon) => `${displayName(mon)}  L${levelOf(mon)}`

// ❌ BAD — the callee re-checks what the caller already guaranteed
const drawPartyRow = (mon) => {
  if (!mon) return ''

  return `${displayName(mon)}  L${levelOf(mon)}`
}
```

**NO INLINE FALLBACKS IN EXPRESSIONS**: NEVER write `(value || []).map(...)`,
`(value ?? {}).field` or any other fallback buried inside an expression. If the value
can be missing, check it at the top of the function and stop there with an early
return. If it should always be an array/object, normalize it once at the boundary
that produces it (the transformer, or the loader that reads it from disk), so every
consumer receives a real array. An inline `|| []` has to be repeated at every usage
site, it renders nothing instead of surfacing the problem, and it is unreadable.

```js
// ❌ BAD — the fallback is buried in the middle of the expression
const total = (save.party || []).reduce((acc, mon) => acc + levelOf(mon), 0)

return (save.dex.caught || []).map(mapDexEntry)

// ✅ GOOD — check at the top and stop
export const getPartyLevelTotal = (save) => {
  if (!save.party.length) return 0

  return save.party.reduce((acc, mon) => acc + levelOf(mon), 0)
}

// ✅ GOOD — normalize once at the boundary, consumers get a real array
export const transformResponseSave = (save) => {
  if (!save) return null

  return {
    party: save.party ? save.party.map(mapPokemon) : [],
    box: save.box ? save.box.map(mapPokemon) : [],
    dex: mapDex(save.dex),
  }
}
```

**NO DEFAULT PARAMETERS AS A GUARD**: NEVER use `= {}` or `= []` as a
parameter/destructuring default just to avoid deciding what happens when the data is
missing. A default is legitimate ONLY when the input is genuinely optional AND the
default is a meaningful value the code is designed to work with (`participants = []`,
`amount = 1`). An empty object is not a meaningful value: it turns "the save never
loaded" into a screen rendering blanks, and nobody ever finds out.

```js
// ❌ BAD — `= {}` hides that the save may not exist yet
export const drawHome = (save = {}, size) => {
  return [` ${save.trainer.name}`, ` ${money(save.money)}`]
}

// ✅ GOOD — the missing case is explicit and has its own screen
export const drawHome = (save, size) => {
  if (!save) return drawStarter(size)

  return [` ${save.trainer.name}`, ` ${money(save.money)}`]
}

// ✅ GOOD — a real default: an optional input with a meaningful value
export const buy = (save, key, amount = 1) => {
  return applyPurchase(save, key, amount)
}
```

## Module Architecture

The view layer MUST NOT contain complex logic or own state directly. A file in
`web/js/views/` decides what the screen looks like; anything else — the rules of the
battle, what an item does, what a purchase costs, when an encounter expires — lives
in an engine module under `src/` and is imported. If a view starts computing, extract
the computation.

Every view exports `draw(ctx)` and `onKey(ctx, key)`, and one with a cursor also
exports `select(ctx, index)`. `web/js/main.mjs` is the only file that touches the
DOM, the keyboard or the clock; it paints `draw()`'s markup into `#screen` and routes
input back in.

**MARKUP IS BUILT WITH THE `html` TAG**: views return `html\`...\``from`web/js/dom.mjs`. Interpolations are HTML-escaped — nicknames arrive from trade codes
other people wrote, so never assemble markup by hand or reach for `innerHTML`yourself. A nested`html\`\`` result, or an array of them, passes through unescaped
because it was already built the same way.

**CLICKS REUSE THE KEY HANDLER**: an element carries `data-index` to move the cursor
and `data-key` to send a key, and the shell turns a click into exactly the
`select()` + `onKey()` pair a keyboard would have produced. NEVER add a click handler
to a view — if a click cannot be expressed as a key, the key is missing.

**EARLY RETURNS**: Use early returns to handle empty, blocked, missing and finished
states BEFORE the main return. NEVER nest these as ternaries inside the main
expression. Each special state should be its own `if` block with a return. The final
return should only contain the happy path.

```js
// ✅ GOOD
export const draw = (ctx, size) => {
  if (!ctx.save) return drawStarter(ctx, size)
  if (ctx.battle) return drawBattle(ctx, size)
  if (!ctx.save.party.length) return drawEmptyParty(size)

  return {
    lines: ctx.save.party.map(drawPartyRow),
    overlays: [],
  }
}

// ❌ BAD
export const draw = (ctx, size) => {
  return {
    lines: !ctx.save
      ? drawStarter(ctx, size)
      : ctx.battle
        ? drawBattle(ctx, size)
        : ctx.save.party.length
          ? ctx.save.party.map(drawPartyRow)
          : drawEmptyParty(size),
    overlays: [],
  }
}
```

A feature is built out of these pieces:

```
__fixtures__/           shared test data, only when two files consume it
helpers.mjs             pure functions and logic helpers
helpers.test.mjs        unit tests for helpers
transformers.mjs        boundary mapping (see below)
transformers.test.mjs   unit tests for transformers
constants.mjs           constants used by the feature
feature.mjs             the module itself
feature.test.mjs        unit tests for the module
```

They are not mandatory for every feature but should be created when needed. They live
**flat, beside the module**, in the directory the **Project shape** above assigns to
them — a feature does NOT get its own folder. `constants.mjs` and `transformers.mjs`
are per-directory and shared by the modules in it; `helpers.mjs` is only worth
extracting when the logic is reused, otherwise the module keeps its own helpers at
module scope.

Tests live in `test/`, one suite per area. A new module may instead colocate its test
next to it (`feature.test.mjs`) when that keeps the pair readable; the first time one
lands, widen the `include` glob in `vitest.config.mjs` so it actually runs. Do not
move the existing suites out of `test/` to chase the colocated form.

## Boundaries & Transformers

Every time data crosses into the program from somewhere it does not control, the data
coming in and the data going out MUST be mapped through transformer functions. The
goal is to have a single, explicit place that documents the shape the program
actually uses.

The boundaries in this codebase are: the local API between the browser and the server
(`web/js/transformers.mjs` on the way in, `server/transformers.mjs` on the way out),
HTTP responses from outside (PokeAPI in `tools/`, the release check in
`src/node/update.mjs`), and JSON read from or written to disk (the save file, the
config, the queue, the session files, the status file).

The save that a browser PUTs is untrusted input like any other: it goes through
`transformResponseSave` and `isSaveShaped` before it is allowed anywhere near the
file on disk.

### Rules

**REUSE THE EXISTING READER BEFORE WRITING A NEW ONE**: Before writing anything that
reads a file or calls an endpoint, ALWAYS grep for existing readers of it (e.g.
`grep -rn "SAVE_FILE" src/node/`). If a module already wraps that boundary, reuse it and
derive the fields you need where you consume them. A second reader creates a parallel
access path that diverges over time. Only write a new one when none exists.

**DEDICATED FILE**: Every time there is a boundary crossing, create a
`transformers.mjs` file in the same directory where the crossing happens. Do not mix
transformers with unrelated helpers.

**RESPONSE NAMING**: Exported functions that transform data coming in MUST be named
with the prefix `transformResponse`, followed by the entity. Example:
`transformResponseSpecies`, `transformResponseSave`.

**REQUEST NAMING**: Exported functions that transform data going out MUST be named
with the prefix `transformRequest`, followed by the action/entity. Example:
`transformRequestSaveGame`, `transformRequestWriteStatus`.

**MAP, DON'T TRANSFORM**: The default intent is mapping — explicitly picking the
fields the program uses — not reshaping data. Extra transformations are allowed when
genuinely needed (e.g. parsing a timestamp, flattening a structure consumed
differently), but do not invent work.

**DO NOT RENAME FIELDS**: Transformers MUST NOT rename fields from snake_case to
camelCase or any other convention. Keep the original field names from the source. The
transformer only picks which fields to keep, it does not rename them.

**ONLY WHAT THE PROGRAM USES**: Map only the fields actually consumed. If a field is
not used, omit it — do not forward it "just in case". This keeps the contract
explicit, and it is why `data/` is a fraction of the size of what PokeAPI returns.

**NESTED OBJECTS / ARRAYS**: For nested structures, compose transformers using
internal map functions (e.g. `transformResponseSave` iterates with `.map(mapPokemon)`).
Do not inline deep mappings inside a single function when a child mapper already
exists or can be extracted.

**MINIMAL LOGIC**: Transformers MUST NOT contain business logic, data processing, or
imports from helpers. They only pick and forward fields. If data needs processing
(filtering, normalizing, computing), do it in the module or in helpers — not in the
transformer.

**NAMING CONVENTION**: Only exported transformer functions use the
`transformResponse` / `transformRequest` prefix. Internal helper functions within
`transformers.mjs` MUST use the `map` prefix instead (e.g. `mapPokemon`, `mapMoveSlot`).

**TESTS ARE MANDATORY**: Every transformer MUST have its own unit tests in a
`transformers.test.mjs` file next to it. Test the mapping shape, the fields that must
be present, and the fields that must be omitted.

```js
// transformers.mjs
const mapMoveSlot = (slot) => {
  return {
    move: slot.move,
    pp: slot.pp,
    maxPp: slot.maxPp,
  }
}

const mapPokemon = (mon) => {
  return {
    species: mon.species,
    exp: mon.exp,
    hp: mon.hp,
    status: mon.status,
    ivs: mon.ivs,
    moves: mon.moves.map(mapMoveSlot),
  }
}

export const transformResponseSave = (save) => {
  if (!save) return null

  return {
    version: save.version,
    trainer: save.trainer,
    party: save.party ? save.party.map(mapPokemon) : [],
    box: save.box ? save.box.map(mapPokemon) : [],
    bag: save.bag ?? {},
    money: save.money,
    dex: mapDex(save.dex),
  }
}
```

## Final Checks

After completing all changes, you MUST run the following checks in this order before
committing:

1. **Run linter**: `npm run lint`. It must pass with zero warnings. This is mandatory
   before every commit.
2. **Run formatter (if linter fails)**: `npm run format` to fix formatting
   automatically, then `npm run lint` and `npm run format:check` again to verify.
3. **Run tests**: `npm run coverage` — the suite plus the coverage thresholds.
   `npm test` runs the suite alone, and `npm test -- test/battle.test.mjs` runs a
   single file.

The linter resolves imports, via `eslint-plugin-import-x`: an import of a name a module
does not export, an unresolvable path, or a dependency cycle is a lint error. So after
moving an export between modules, `npm run lint` is what tells you whether every importer
was repointed — you do not have to wait for a test to happen to load that module.

`.githooks/pre-commit` runs exactly these, so a clean local run means a clean commit.
`git commit --no-verify` skips it; do not reach for that to get around a failure.

The coverage thresholds in `vitest.config.mjs` are a ratchet. If your change pushes
coverage up, raise them to just under the new number in the same commit. NEVER lower
a threshold to make a change fit — write the test.

## Pull Requests

- Fill the description with a summary of the changes: what it does, and why.
- **Bump the version** before creating the PR. The version lives in
  `.claude-plugin/plugin.json`, not `package.json` (which is private and has no
  version field), so `npm version` is the wrong tool — edit it by hand. Choose the
  correct semver increment based on the type of change:
  - **patch** (`0.14.2 → 0.14.3`): bug fixes, hotfixes, small corrections that don't
    add new functionality.
  - **minor** (`0.14.2 → 0.15.0`): new features, new screens, new items or moves,
    enhancements to existing functionality.
  - **major** (`0.14.2 → 1.0.0`): breaking changes, a change to the save format or
    the install layout, large-scale refactors.
  - If you are unsure which type of bump applies, you MUST ask the user before
    bumping.
- Commit subjects are `area: lowercase phrase`, one line, no trailing period
  (`battle: switch out before the foe moves`, `fix: ask which Pokemon an item is for`).
- Branches are short and kebab-cased, prefixed by kind when it fits: `fix/…`,
  `chore/…`.

## Testing Best Practices

Vitest is the runner. Assertions use `expect`, mocks use `vi.fn()`.

**Test naming**: Tests MUST always use `Should` in the description and use the `test`
function instead of `it` (e.g. `test('Should render...', () => {})`, not
`it('should render...', () => {})`).

### 1. Explicit Setup

DO NOT extract the construction of the subject to a `newApp`, `renderScreen` or
similar helper function at the top level of the test file. DO build it explicitly
inside each test block.

Rationale: it makes it easy to see exactly which inputs each test case is passing
without having to look up a helper function.

```js
// ✅ GOOD
test('Should open the shop from the home menu', () => {
  const app = createApp({
    screen: stubScreen(),
    save: aSave(),
    config: DEFAULT_CONFIG,
  })

  app.handleKey({ name: 'right' })
  app.handleKey({ name: 'enter' })

  expect(app.mode).toBe('shop')
})

// ❌ BAD
const newApp = (props) => createApp({ screen: stubScreen(), ...props })

test('Should open the shop from the home menu', () => {
  const app = newApp({ save: aSave() })
  // ...
})
```

Stubbing out a real dependency (a screen that counts frames instead of writing to a
terminal, a sound player that records calls) is a different thing and belongs at the
top of the file — that is a mock, not setup.

### 2. Drive It The Way A Player Would

Prefer going through the public entry point — the key handler — over reaching into
state. Pressing `down` then `enter` proves the menu wiring; setting
`app.shopSelection = 2` proves nothing about how a player would ever get there.

Assert on what the player would observe: the rendered lines, matched by their visible
text, the save that got written, the events a battle produced, the value returned.

### 3. Test Behavior, Not Implementation

DO NOT write tests that only verify a function was called. DO write tests that verify
the observable outcome of an action: what renders, what values are returned, what the
player sees.

A test that only checks "this function was called" covers lines and passes
thresholds, but it doesn't prove anything works correctly. If the implementation
changes internally but the behavior stays the same, the test should still pass.

Rule of thumb: assertions should answer "what happened from the player's
perspective?", not "which internal function was invoked?".

```js
// ❌ BAD — tests implementation (only checks the function was called)
test('Should play a sound when the ball is thrown', () => {
  const playSound = vi.fn()
  const app = createApp({
    screen: stubScreen(),
    save: aSave(),
    config,
    playSound,
  })

  app.handleKey({ name: 'b' })

  expect(playSound).toHaveBeenCalled()
})

// ✅ GOOD — tests behavior (verifies the outcome and how the function was called)
test('Should catch the wild Pokemon and add it to the party when the ball holds', () => {
  const playSound = vi.fn()
  const save = aSave({ bag: { 'poke-ball': 1 } })
  const app = createApp({
    screen: stubScreen(),
    save,
    config,
    playSound,
    seed: 1,
  })

  app.handleKey({ name: 'b' })
  app.handleKey({ name: 'enter' })

  expect(app.save.party).toHaveLength(2)
  expect(app.save.bag['poke-ball']).toBe(0)
  expect(playSound).toHaveBeenCalledTimes(1)
  expect(playSound).toHaveBeenCalledWith('caught')
})
```

When asserting on mock functions, always verify:

- How many times it was called (`toHaveBeenCalledTimes`).
- With what arguments it was called (`toHaveBeenCalledWith`).
- What the player sees after the action.

### 4. No Snapshot Tests For Screens

DO NOT write snapshot tests (`toMatchSnapshot`) for a whole screen, or for anything
that is mostly a composition of already-tested pieces. Snapshots of a full frame are
brittle, break on any minor change to a widget, and provide no meaningful coverage
beyond what the unit tests already guarantee.

Snapshot tests are only acceptable for small, leaf-level output with stable shape
(an ANSI escape helper, a single padded row).

```js
// ❌ BAD — snapshot of an entire frame whose pieces are already tested
test('Should match snapshot', () => {
  expect(draw(ctx, { cols: 100, rows: 34 }).lines).toMatchSnapshot()
})

// ✅ GOOD — test the screen's own logic: what it renders conditionally
test('Should render the empty state when the box has no Pokemon', () => {
  const { lines } = draw({ save: aSave({ box: [] }) }, { cols: 100, rows: 34 })

  expect(lines.join('\n')).toContain('The box is empty')
})
```

### 5. Mocks and Fixtures

Mock functions using `vi.fn()`. Use `vi.clearAllMocks()` in `beforeEach` to ensure
test independence.

**Mock vs Fixture — do NOT conflate them.** These are two different things:

- A **mock** replaces behavior: a function, module, or stand-in (`vi.fn()`,
  `vi.mock(...)`, a fake screen, a fake sound player). It controls what code does.
- A **fixture** is static data: a sample payload used as test input or as an expected
  value (a save file, a PokeAPI response, a species entry). It does not replace
  behavior, it feeds it.

NEVER name a file of static test data `mocks.mjs` — that data is a fixture, not a
mock. Reserve the word "mock" for behavior stand-ins.

**When to inline vs extract test data**

- **Default: inline.** Declare test data directly inside the test file. This keeps
  each test self-contained and is the norm.
- **Extract to a shared fixture ONLY when the exact same data is consumed by more
  than one test file.** De-duplication across files is the single valid reason to
  extract. NEVER extract data used by just one file.

**Where to place a shared fixture**

- Put it in a `__fixtures__/` folder at the closest common ancestor of the test files
  that consume it — never higher than necessary.
- Do NOT hoist a fixture to a global location before a real cross-cutting consumer
  exists. Move it up only when an unrelated area starts needing it.
- Do NOT use a `__mocks__/` folder for static data. That name is reserved for manual
  module mocks used with `vi.mock()`; putting plain data there is semantically wrong
  and can interfere with mock resolution.

**Fixture naming**

- File: named after the entity it represents, inside `__fixtures__/` (e.g.
  `__fixtures__/save.mjs`).
- Export: suffixed with `Fixture` so its role is unambiguous at every usage site
  (e.g. `saveFixture`, `pokeApiSpeciesFixture`).
- A fixture that represents a response or a file on disk MUST mirror the raw payload
  (the pre-transformer shape), so the same fixture can feed both a stubbed reader and
  the transformer tests.

```js
// __fixtures__/save.mjs — mirrors the raw JSON on disk
export const saveFixture = {
  version: 1,
  trainer: { name: 'ASH', startedAt: '2026-01-01T00:00:00.000Z' },
  party: [{ species: 1, exp: 135, hp: 20, status: null, moves: [] }],
  box: [],
  bag: { 'poke-ball': 5 },
  money: 3000,
  dex: { seen: [1], caught: [1], faced: {} },
}

// ✅ GOOD — shared fixture reused across test files, feeding a stubbed reader
import { saveFixture } from '../__fixtures__/save.mjs'

// ❌ BAD — static data living in a `mocks.mjs` module among the source
import { savedGame } from './mocks.mjs'
```

### 6. One Behaviour, One Test

DO NOT add a test for a behaviour an existing test already exercises. DO read the
existing test file first, and when a test already performs the same action,
strengthen that test (change its inputs, add assertions) instead of appending a
near-duplicate.

Test each piece of logic at the single level that owns it:

- A shared helper (a formatter, a type-chart lookup, a level curve) gets one unit test
  covering its edge cases. Do NOT re-test it through each of its callers, nor again
  through the rendered screen.
- A screen or app test covers the wiring: that the key reaches the logic and the
  outcome is rendered. It does not re-verify the helper's edge cases.

Rationale: duplicated coverage does not catch more bugs — the copies always fail
together. It inflates the diff and forces whoever changes the behaviour next to find
and update every copy.

When fixing review findings or bugs, the test belongs to the behaviour, not to the
finding. One new test per bug fixed produces an audit trail, not a suite. If the
buggy behaviour already has a test, tighten it.

Before committing, re-read the diff of the test files as a whole and delete every
assertion made twice.

```js
// ❌ BAD — a new test for a case the existing one already covers
test('Should faint the foe when the damage exceeds its HP', () => {})
test('Should end the battle when the foe faints', () => {})

// ✅ GOOD — one test for the action, covering both through its assertions
test('Should faint the foe and end the battle in a win when the damage exceeds its HP', () => {})

// ❌ BAD — the same type chart tested at four levels
effectiveness('water', ['fire']) // unit test
computeDamage(battle, 'player', waterMove) // caller 1
submitAction(battle, { type: 'move', index: 0 }) // caller 2
app.handleKey({ name: '1' }) // and again through the screen

// ✅ GOOD — the type chart owns its edge cases, one caller proves the wiring
effectiveness('water', ['fire']) // unit: both slots, immunities, stacking
submitAction(battle, { type: 'move', index: 0 }) // integration: the battle uses it
```
