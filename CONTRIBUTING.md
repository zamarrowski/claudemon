# Contributing to claudemon

Thanks for wanting to poke at this. claudemon is a terminal Pokémon game driven by
Claude Code activity: plain ESM Node, no build step, no runtime dependencies,
rendered as ANSI lines into a terminal. That shape is deliberate, and it is the one
thing a change should not break.

- **Bugs and ideas** → [open an issue](https://github.com/zamarrowski/claudemon/issues/new/choose).
- **Code** → read [CLAUDE.md](CLAUDE.md) first. It is the house style and it is not
  optional; a PR that ignores it gets sent back.
- **Behaviour** → the [Code of Conduct](CODE_OF_CONDUCT.md) applies everywhere in
  the project.

## Getting set up

You need **Node.js 20.19 or newer** — that is what `engines` says and what the
oldest leg of CI runs. Nothing else.

```bash
git clone https://github.com/zamarrowski/claudemon
cd claudemon
npm install
```

`npm install` only brings in dev tools (ESLint, Prettier, Vitest) — the game itself
still has zero runtime dependencies, and adding one is a conversation to have in an
issue before you open the PR. It also points git at `.githooks`, so your commits run
the same checks CI does.

Then the sprites, which are not in the repo — they are somebody else's artwork, so
they are downloaded rather than redistributed:

```bash
node tools/fetch-sprites.mjs
```

They land in `~/.claudemon/data/sprites`, or under `$CLAUDEMON_HOME` if you set it.
The test suite needs them, so do this before running the tests.

### Running the game from your clone

```bash
node bin/claudemon
```

That is enough to play against your working tree. If you want the full experience —
the plugin, the hooks that make Pokémon appear while Claude works, the status line
and the `claudemon` command on your PATH — run the installer:

```bash
node tools/install.mjs
```

A clone takes precedence over an installed copy while the directory exists, so you
can develop and play with the same checkout. `node tools/install.mjs --uninstall`
undoes it.

### Looking at a screen without playing to it

`tools/preview.mjs` renders any screen straight to stdout, so you do not have to
catch a Pokémon to see what the battle screen looks like:

```bash
node tools/preview.mjs              # every scene
node tools/preview.mjs battle       # just one
node tools/preview.mjs battle 100 34 # at a given size
```

Pass an unknown name and it prints the list of scenes.

### Retaking the screenshots

Every capture in `docs/` — the README's and the landing page's — comes out of
`tools/capture.mjs`, so the whole set is one command rather than twelve trips to a
terminal with a screenshot key:

```bash
node tools/capture.mjs                 # the whole set
node tools/capture.mjs battle.png      # just one
```

It renders the same scenes `preview.mjs` does, turns the ANSI into a grid of cells,
and paints that grid into a canvas in headless Chrome. Two things have to be in place:
the sprites (`node tools/install.mjs`), and Chrome, at
`/Applications/Google Chrome.app` unless `CLAUDEMON_CHROME` points somewhere else. It
runs against a throwaway `CLAUDEMON_HOME` that only borrows your sprites, so your own
save is never read and never written.

The recipe is in `tools/constants.mjs`, and the numbers in it are load-bearing:

- **One save for every shot.** `sampleSave()` in `tools/scenes.mjs`, built from the
  `PREVIEW_*` constants. One save is what stops the Pokédex count in one shot
  contradicting the team in the next.
- **One cell size, one font, one palette.** 20×40 device pixels per cell, Menlo,
  and `CAPTURE_PALETTE`. Text is the same apparent size in every shot because every
  shot is 100 columns wide and shown in the same column.
- **Twice the pixels of the column it lands in.** 100 columns × 20px is 2000, and
  the landing's column is 1000, so a retina display gets one device pixel per image
  pixel and a grid of quadrant glyphs stays a grid. `test/docs.test.mjs` holds the
  two numbers together — change the column in `docs/index.html` and it fails.
- **Rows per screen.** `CAPTURE_SHOTS` picks the row count that leaves no band of
  dead black at the bottom. Height is also what buys sprite detail: the canvas costs
  half as many rows as columns, so a taller tab is a sharper Pokémon, and the
  trainer shot is 66 rows because that is where its canvas reaches the 96 columns
  the source sprites actually have.

`card-team.png` is not a capture — it is the game's own card export (`src/ui/card.mjs`)
at 2×, which is why it is 2400 wide. `docs/sprites/*.png` and `docs/card.png` are not
captures either and the tool leaves them alone.

After retaking a shot, update the `width` and `height` attributes in
`docs/index.html` to match. They are there to stop layout shift, so a stale pair is a
bug, and the test suite fails on one.

## The checks

Three commands, in this order. They are what CI runs and what `.githooks/pre-commit`
runs, so a clean local run means a clean commit and a green PR.

```bash
npm run lint      # must pass with zero warnings
npm run format    # Prettier owns formatting — never hand-align anything
npm run coverage  # the suite plus the coverage thresholds
```

Useful variants: `npm test` runs the suite alone, `npm test -- test/battle.test.mjs`
runs a single file, `npm run test:watch` keeps it running, and
`npm run format:check` verifies formatting without rewriting.

The linter resolves imports, so an import of a name a module does not export, an
unresolvable path or a dependency cycle is a lint error. After moving an export
between modules, `npm run lint` is what tells you every importer was repointed.

**Coverage thresholds are a ratchet.** They live in `vitest.config.mjs`. If your
change pushes coverage up, raise them to just under the new number in the same
commit. Never lower one to make a change fit — write the test.

`git commit --no-verify` skips the hook. Do not reach for it to get around a
failure.

## Where things live

```
bin/claudemon        entry point, argument parsing, boot
src/                 the engine (battle, capture, exp, state, queue, sound, update)
src/ui/              rendering primitives (screen, ansi, sprite, grass, widgets)
src/ui/views/        one file per screen, each exporting draw() and onKey()
scripts/             Claude Code hook handlers and the status line
tools/               dev-time scripts (fetch data, fetch sprites, preview, capture, install)
test/                test suites
data/                generated dataset, checked in — never hand-edited
```

Two rules that catch people out:

- **`data/` is generated.** It is built from [PokeAPI](https://pokeapi.co) by
  `node tools/fetch-data.mjs` and validated by `node tools/check-data.mjs`, which
  CI runs. If a stat or a moveset is wrong, fix the generator, regenerate, and
  commit the result — do not edit the JSON by hand.
- **Views do not think.** A file in `src/ui/views/` decides what the screen looks
  like. The rules of the battle, what an item does, what a purchase costs, when an
  encounter expires — all of that lives in an engine module under `src/` and is
  imported. If a view starts computing, extract the computation.

## House style

[CLAUDE.md](CLAUDE.md) is the authority, and this section is only the headline. Read
it before writing code; it is written for both humans and agents.

The parts people trip over most:

- **No comments.** Code should be self-documenting. If a block needs explaining,
  extract it into a named function. Tooling directives (`// prettier-ignore`) are the
  only exception.
- **Arrow functions assigned to a `const`,** exported as the const. Never
  `function` declarations. If the body does not fit on one line, use braces and an
  explicit `return`.
- **Constants go in `constants.mjs`,** one per directory, next to the module that
  uses them. Only pure data — a value that calls a function or reads `process.env`
  stays where it is.
- **Guards only where data can genuinely be missing** (disk, network, optional
  arguments, the terminal). No `(value || []).map(...)`, no `= {}` defaults to
  paper over a missing save. Decide where it can be missing, handle it once, trust
  it everywhere else.
- **Boundaries get transformers.** Anything read from disk or fetched over HTTP is
  mapped through `transformResponse*` / `transformRequest*` functions in a
  `transformers.mjs` next to the crossing, with their own tests. They pick fields;
  they do not rename them and they do not contain logic.
- **Every new module gets tests.**

Where existing code contradicts a rule, the existing code is wrong and gets brought
in line as it is touched. Do not copy a violation because the file next to you has
one.

## Tests

Vitest is the runner. The full conventions are in CLAUDE.md; the short version:

- Name tests with `Should`, using `test(...)` and not `it(...)`.
- **Build the subject explicitly inside each test.** No `newApp()` helper at the top
  of the file — it should be obvious which inputs a case passes without scrolling.
- **Drive it the way a player would.** Press `down` then `enter` through the key
  handler; do not reach in and set `app.shopSelection = 2`. Assert on what a player
  observes: the rendered lines, the save that got written, the value returned.
- **Test behaviour, not implementation.** "The function was called" proves nothing.
  When you assert on a mock, assert how many times and with what arguments, and
  then assert what the player sees.
- **No snapshot tests for screens.** Test what the screen renders conditionally.
- **One behaviour, one test.** If the behaviour already has a test, strengthen it
  instead of appending a near-duplicate. A helper is tested once, at the level that
  owns it — not again through each of its callers.
- Static test data is a **fixture**, not a mock. Inline it by default; extract it to
  `__fixtures__/` only when a second test file consumes the same data.

## Commits, branches and pull requests

- **Commit subjects** are `area: lowercase phrase`, one line, no trailing period —
  `battle: switch out before the foe moves`,
  `fix: ask which Pokemon an item is for`.
- **Branches** are short and kebab-cased, prefixed by kind when it fits: `fix/…`,
  `chore/…`, `feature/…`.
- **Bump the version before opening the PR.** It lives in
  `.claude-plugin/plugin.json`, not `package.json` (which is private and has no
  version field), so `npm version` is the wrong tool — edit it by hand:
  - **patch** (`1.3.0 → 1.3.1`) — bug fixes, small corrections, no new behaviour.
  - **minor** (`1.3.0 → 1.4.0`) — new features, screens, items or moves.
  - **major** (`1.3.0 → 2.0.0`) — breaking changes, a change to the save format or
    the install layout, large-scale refactors.
  - If you are unsure which applies, ask in the PR rather than guessing.
- **Fill in the description.** What it does, and why. The template asks for a couple
  of extra things; screenshots of a changed screen are worth a lot here, and
  `tools/preview.mjs` makes them easy.

CI runs lint, format, the suite on Node 20.19 / 22 / 24, the coverage floor, and the
dataset check. All of it has to be green.

## What tends to get pushed back

Not to discourage anything — just so it is not a surprise:

- A runtime dependency. Raise it as an issue first.
- Hand-edited `data/`.
- Sprites or audio committed to the repo. Sprites are downloaded at install time on
  purpose, and the two WAVs in `assets/` are not ours to extend.
- A lowered coverage threshold.
- Logic that migrated into `src/ui/views/`.
- Comments.

## Licensing

The code is MIT — see [LICENSE](LICENSE). By contributing you agree your changes are
released under it. The sprites and the audio are not covered by it: they belong to
their authors and are credited in the README. Pokémon is a trademark of Nintendo,
Creatures Inc. and GAME FREAK Inc.; this is a personal, non-commercial toy, and it
should stay that way.
