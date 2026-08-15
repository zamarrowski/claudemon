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

Run `claudemon` and the game comes up in your browser. The client is served from the
working tree with no build step and no cache, so a reload is the whole edit loop:
change a view, a stylesheet or an engine module, hit refresh, and it is there.

Two things worth knowing:

- `CLAUDEMON_PORT=8080 claudemon` pins the port; by default it takes 7626 and steps
  aside to a free one if that is busy.
- The screens are drawn by pure functions, so a test can render one without a
  browser: `markupOf(draw(ctx))` gives you the markup as a string, which is how the
  suite in `web/js/views/` checks what a screen says.

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
bin/claudemon        entry point: parse arguments, boot the server, open the browser
server/              the local HTTP server: static files, JSON API, SSE stream
src/                 the engine — runs in both the browser and Node
src/node/            everything that touches the machine (fs, child_process, zlib)
web/                 the client: index.html, styles/, js/
web/js/views/        one file per screen, each exporting draw() and onKey()
scripts/             Claude Code hook handlers and the status line
tools/               dev-time scripts (fetch data, fetch sprites, install)
test/                cross-cutting suites (hooks, status line, paths, engine)
data/                generated dataset, checked in — never hand-edited
```

Three rules that catch people out:

- **`data/` is generated.** It is built from [PokeAPI](https://pokeapi.co) by
  `node tools/fetch-data.mjs` and validated by `node tools/check-data.mjs`, which
  CI runs. If a stat or a moveset is wrong, fix the generator, regenerate, and
  commit the result — do not edit the JSON by hand.
- **The engine runs in two places.** The browser loads `src/*.mjs` straight from the
  server, so nothing directly under `src/` may import `node:*` or reach into
  `src/node/`. The linter fails the build if it does; anything that touches the
  machine goes in `src/node/` and is reached over the API.
- **Views do not think.** A file in `web/js/views/` decides what the screen looks
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
  of extra things; a screenshot of a changed screen is worth a lot here, and the game
  is a browser tab, so one is a keystroke away.

CI runs lint, format, the suite on Node 20.19 / 22 / 24, the coverage floor, and the
dataset check. All of it has to be green.

## What tends to get pushed back

Not to discourage anything — just so it is not a surprise:

- A runtime dependency. Raise it as an issue first.
- Hand-edited `data/`.
- Sprites or audio committed to the repo. Sprites are downloaded at install time on
  purpose, and the two WAVs in `assets/` are not ours to extend.
- A lowered coverage threshold.
- Logic that migrated into `web/js/views/`.
- A `node:` import under `src/`, or `innerHTML` outside `web/js/dom.mjs`.
- Comments.

## Licensing

The code is MIT — see [LICENSE](LICENSE). By contributing you agree your changes are
released under it. The sprites and the audio are not covered by it: they belong to
their authors and are credited in the README. Pokémon is a trademark of Nintendo,
Creatures Inc. and GAME FREAK Inc.; this is a personal, non-commercial toy, and it
should stay that way.
