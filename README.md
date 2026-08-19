# claudemon

[![CI](https://github.com/zamarrowski/claudemon/actions/workflows/ci.yml/badge.svg)](https://github.com/zamarrowski/claudemon/actions/workflows/ci.yml)

Wild Pokemon appear while you work in Claude Code. Your prompts are steps through
the grass: the longer the prompt, the further you walk, and the more chances
something jumps out. So is the waiting — every twenty seconds Claude spends
working is another step, because that is the half of the session you actually
have free.

The walking happens while Claude does, not the moment you press enter: a prompt
buys you the steps and the turn takes them, so anything that jumps out does it
with the grass already moving.

One at a time, and only for half a minute: a Pokemon that appears while you are busy
wanders off if you leave it there, so a long session never leaves a queue of battles
waiting for you.

The original 151. Fully local — no account, no backend, nothing about you leaving the
machine.

<table>
<tr>
<td width="58%" valign="top"><img src="docs/home.png" alt="The home screen: an activity line reading Claude is working, Read, 3m09s, someone standing in a band of grass, and a team of five listed below"></td>
<td width="42%" valign="top"><img src="docs/battle.png" alt="A battle: a wild Venonat facing your Squirtle, both drawn as pixel sprites, with health bars and a FIGHT / BAG / POKÉMON / RUN menu"></td>
</tr>
<tr>
<td valign="top">Waiting, which is most of it. The walk only moves while Claude does, so you can tell from across the desk without reading anything.</td>
<td valign="top">And when something does jump out.</td>
</tr>
</table>

It lives in a terminal tab of its own, next to the one you work in. The status line
in Claude tells you something is waiting; the game tab is where you go and fight it.

```
┌─ Terminal 1: claude ──────────────────────────────────┐
│ > refactor this component                             │
│ ███████░░░░░░░ 63% left | Opus 5                      │
│ ✦ A wild PIDGEY appeared!  ·  24s left  ·  claudemon  │
└───────────────────────────────────────────────────────┘
```

## Install

Typed inside Claude Code. Nothing to clone.

```
/plugin marketplace add zamarrowski/claudemon
/plugin install claudemon@claudemon
```

That puts the plugin in place — the hooks that make Pokemon appear come from it.

Now **restart Claude Code**. Claude Code only picks up a plugin's commands and hooks
at startup, so until you restart, the next line does not exist yet — if you type it
straight after installing, nothing happens. Once you are back:

```
/claudemon-setup
```

This does the rest: the `claudemon` command, the status line, and the sprites. It
prints a line per step and says so if one of them did not work.

Then two one-offs, which it reminds you of:

1. **Restart Claude Code** once more, so the new status line loads.
2. In a **second terminal tab**, run `claudemon`.

It asks for a name and a starter the first time, and after that it sits there
waiting. Send a longish prompt in the Claude tab and watch the status line.

### What you need first

| | How to check |
|---|---|
| **Claude Code** | You are already in it |
| **Node.js 20.19 or newer** | `node --version`. The game and the hooks run on it, and Claude Code ships as its own binary so it does not bring one. Nothing else to install — no dependencies, no build step |
| **A terminal with truecolor** | iTerm2, Ghostty, WezTerm, Kitty, Alacritty and VS Code's terminal are all fine. Not macOS Terminal |

> [!WARNING]
> In macOS Terminal the sprites come out striped and stretched, and no setting fixes
> it. Use any of the other terminals above.

The 151 Pokemon ship with the plugin, so the only thing the install downloads is the
sprites, which takes a few seconds. After that the only thing that ever goes out is
the version check below, and nothing goes out at all with it switched off.

### Updating

The version this is sits at the right-hand end of the home screen's bottom row. Once
a day the game asks GitHub whether a newer one is out — a plain `GET` of the plugin
manifest, about 300 bytes, sending nothing. If there is, the home screen says so:

```
◆ v0.7.0 is out · [u] update
```

`u` does it: it refreshes the marketplace, fetches the new version through
`claude plugin update`, and reruns the installer to catch anything around the plugin
that changed. Then two one-offs, which it tells you about — restart Claude Code so
the new hooks and status line load, and relaunch `claudemon`, because a running
process cannot swap its own code out.

**Option** says when that question gets asked. `UPDATE DAILY` is the default above.
`UPDATE LAUNCH` asks every time `claudemon` starts instead — one request as the tab
comes up, and none while you play, which is what you want if you leave a tab open for
a week and would rather not wait a day to hear about a release. `UPDATE OFF` stops it
entirely: nothing is offered and no socket is opened; the two commands under
**Coming from 0.5.0** below still work whenever you want them.

Updating through Claude Code instead is fine too. The `claudemon` command is kept
pointing at whichever copy is newest — by a hook, because neither the command nor the
status line can be rewritten by hand once they are on a PATH and in `settings.json` —
so the game picks the new one up on its next start, and says `◆ v0.7.0 is installed`
until you restart it.

#### Coming from 0.5.0

0.5.0 has none of this in it, so it cannot tell you a new version is out: the first
upgrade is the only one you do by hand. In a terminal — not at the Claude Code prompt,
because `/plugin` has no `update` of its own; this lives in the CLI:

```bash
claude plugin marketplace update claudemon
claude plugin update claudemon@claudemon
```

The first line is not optional. Your copy of the marketplace is whatever it was when
you added it, so without refreshing it the second line has nothing newer to find and
tells you so.

Restart Claude Code, then run `claudemon` again. That is all of it — the version turns
up in the bottom-right corner, and `[u]` does every upgrade after this one.

There is one thing 0.5.0 leaves behind that has to be undone, and it undoes itself.
0.5.0's installer wrote the directory it was installed from into both launchers and
nothing ever revisited it; for a plugin install that path has `0.5.0` in it, so the
command would go on starting 0.5.0 whatever else you installed — in silence, the only
symptom being a game that never changes. The first prompt after the restart puts both
right, and notes it in `~/.claudemon/claudemon.log`. A clone is left alone, because a
clone is meant to take precedence.

### Uninstall

```
/plugin uninstall claudemon@claudemon
```

That stops the hooks. To also remove the command and put your status line back, run
the installer's undo — from the plugin copy, before you uninstall it:

```bash
node "$CLAUDE_PLUGIN_ROOT/tools/install.mjs" --uninstall
```

Your save is left alone either way — delete `~/.claudemon/` as well to be rid of it.

### From a clone instead

For hacking on it, a clone works the same way and takes precedence over the
installed copy:

```bash
git clone https://github.com/zamarrowski/claudemon
cd claudemon
node tools/install.mjs
```

That does everything the steps above do, including installing the plugin from the
clone — so it needs no slash commands and only one restart, at the end. Keep the
directory where it is: the launcher prefers it while it exists.

Two checks, one floor — the 20.19 above, which is what `engines` says and what the
oldest leg of CI runs. `npm ci && npm test` puts the suite through Vitest; `npm ci &&
npm run lint` brings in the linter, which has opinions about correctness and none
about how the code looks. The game still has no runtime dependencies — everything
installed is a tool. The odd `.19` is the floor those tools share, and the two are
one number on purpose.

Installing also points git at `.githooks`, so a commit runs those checks before it is
written: the linter, Prettier, and one Vitest pass that is the suite and the coverage
floor at once — five seconds, near enough. It reads the working tree rather than the
index, so a half-staged change is checked as whatever is on disk, and `git commit
--no-verify` skips the lot when that is what you want.

[CONTRIBUTING.md](CONTRIBUTING.md) has the rest of it: the sprites the tests need,
previewing a screen without playing to it, and what a pull request is expected to
carry.

## Controls

Arrow keys move, `enter` confirms, `esc` goes back, `q` quits. Any key advances a
battle message. That is the whole scheme — it is the same everywhere.

| Screen | What it does |
|---|---|
| Home | Whatever is in the grass and how long is left to face it, your team, and the menu |
| Battle | FIGHT / BAG / POKÉMON / RUN, with move types, power and PP. The bag asks which of your team an item is for, so a Revive reaches somebody already down. A ◓ by the foe's name means it is already in your Pokédex |
| Pokédex | All 151, with how many of each you have faced, and base stats and evolution requirements for the ones you caught. A ✧ marks the ones you caught shiny, and their entry is drawn in those colours. `s` toggles sort between number and A–Z |
| Team | Details, moves, experience, `enter` to change your lead, `m` to order its moves, and `d` to send one to the box. `s` sorts by party order or level. `i` opens the bag on whoever the cursor is on: a potion between fights, and the evolution stones, which are used nowhere else. A ✦ on the team list marks a mon that evolves by stone; `→N` is the level it evolves at. In the bag, a ✦ still marks an item that would evolve the selected mon |
| Moves | The moves of whoever the cursor is on, in the order the fight menu lists them, reached with `m` on the team screen. `enter` picks one up, `↑ ↓` carries it, `enter` puts it down. The top move is the one the day care gives up when it teaches a new one |
| Box | Everything you caught with a full team, reached with `b` from the team screen. `s` sorts by catch order or level. `enter` takes one back into the team |
| Day care | Two slots, from the home menu or `c` on the team screen. `enter` on an empty one picks from your team and your box; `enter` on a filled one takes it back. Whoever waits there keeps gaining EXP and learns the moves of the levels it reaches, and a compatible pair leaves an egg |
| Gym | The eight Kanto gyms, each one type, listed easiest first with the level range its trainers bring and the badge you have or have not won. `enter` walks in |
| Gym run | The gauntlet: two trainers and then the leader, back to back. Between fights you can move the cursor over your team, `l` to change your lead and `i` to reach the bag. There is no door back to the menu — `esc` twice walks out and undoes the whole run |
| Shop | Balls, potions, revives and evolution stones. `5` buys five |
| Trade | `t`, on the team screen or in the box, on whoever the cursor is on: it asks first, because a trade only goes one way, and then hands you the code. `r`, on either screen, takes one in from a code you were sent |
| Trainer | Everything the game has been counting: battles won, lost and run from, the streak of days you have opened it, the hours Claude has worked beside you, and fifteen achievements with how far along each one is. `s` writes the trainer card |
| Option | How big sprites are drawn, the menu sounds, the bell, when the version check runs — daily, every launch, or never — and whether the professor may ever ask for a star. `← →` changes a setting, and the Pokémon underneath redraws as you do |

<table>
<tr>
<td width="50%"><img src="docs/pokedex.png" alt="The Pokédex: the list of all 151 down the left with seen and caught markers, and Charmander on the right with its base stats, catch rate and what it evolves into"></td>
<td width="50%"><img src="docs/team.png" alt="The team screen: five Pokémon listed on the left, and Ditto on the right with its health, experience, stats and moves"></td>
</tr>
<tr>
<td><b>Pokédex</b> — seen and caught are tracked apart, and the stats fill in for the ones you caught.</td>
<td><b>Team</b> — <code>enter</code> changes which one leads.</td>
</tr>
</table>

## The trainer card

`s` on the **TRAINER** screen, or `claudemon card` from a terminal: your six drawn to
`~/.claudemon/card.png`, with your badges, your achievements and the hours Claude has
worked while you played, opened in whatever shows PNGs on your desktop. There is more
about it, and a picture of one, [on the site](https://zamarrowski.github.io/claudemon/#card).

## Trading

Codes, not sockets. `t`, on any Pokémon of yours — in the team screen or in the box —
says what it will cost you, and then writes a code:

```
CMON1-eJxNkMFugzAMht_F53QChxXIrdIeYNJ62rRDBKYgIKAEKBPi3edAWSfl...
```

That goes to your clipboard and to `~/.claudemon/trade.txt`. Send it however you send
anything else. On the other side, `r` — on either of those two screens — takes a
pasted code, and the Pokémon turns up with its nickname, its level, its IVs, its
bruises and the PP it had when it left.

A trade only goes one way, and the game is strict about it:

- **It leaves your game when the code is made**, not when somebody uses it. There is
  no undo, which is why the screen asks first.
- **The code does not work in the game it came from.** Every code carries who made it,
  and your own is refused with a line telling you so.
- **A code works once.** The game remembers every one it has taken in, so pasting the
  same code twice brings nothing the second time.
- **Your last Pokémon stays.** Somebody has to fight.

No network is involved: the code *is* the Pokémon, deflated and written out in base64,
and getting it to the other machine is your business rather than the game's. It
carries the name you play under and the moment you started, which is how a game
recognises the codes that came out of it.

## The day care

**DAY CARE** on the home menu, or `c` on the team screen. Two slots, filled from your
team or your box, and two things happen to whoever waits in them — both only while
Claude is working and this tab is open.

**They keep growing.** A Pokémon left there gains EXP for every step the game counts,
levels up where it stands and restats as it does. It does not learn moves and it does
not evolve in there; you take it out for that.

**A pair leaves an egg.** Two that can breed leave one behind — drawn on the screen,
with how far along it is beside it — and the screen says whether they get on before you
wait for it. The rules are the ones the games use, and
Ditto is the centre of them:

- **Ditto plus anything that can breed at all.** Genderless, always-male,
  always-female — Ditto is the partner every one of those has, and the egg is the
  *other* parent's base form. Keep one Ditto in a slot and rotate what you are hunting
  through the second.
- **Two of one evolution line, opposite genders.** The egg is the mother's base form,
  so a Nidorina and a Nidorino leave a Nidoran♀ — the two Nidoran lines are separate
  Pokédex entries and the game pairs them anyway.
- **Ditto and Ditto, two of a gender, two unrelated lines, and anything legendary
  leave nothing.** Not even with a Ditto.

**It only comes along while you are there.** The egg has steps of its own — one for
every six seconds Claude works with this tab open, counted by the game rather than by
the hooks. So there is no offline progress, nothing hatches in a closed tab, and an egg
you left at 420 steps is at 420 steps when you come back. Six hundred of them, which is
about an hour of Claude actually working — a long session, or two.

**Which is what makes it a shiny hunt.** An egg rolls its own shiny check at 1 in 512
rather than the 1 in 4096 the grass uses, so a hatch is the one shiny roll in the game
you can work towards instead of wait for. It gets the line, the colours and the sound
a shiny in the grass gets, and the Pokédex remembers it the same way.

One egg at a time, and taking a parent back does not take the egg with it.

## What is in it

- The original 151, with real base stats, types, catch rates and Red/Blue movesets.
- Battles with critical hits, the type chart, status conditions, PP, one-hit KOs,
  fleeing and switching Pokémon mid-fight.
- Catching, where weakening and status genuinely help.
- Shiny Pokémon, at the same 1 in 4096 the modern games use in the grass and 1 in 512
  out of a day care egg. One gets its own colours, a ✧ by its name, a sound and a line
  of its own — and the Pokédex remembers the ones you caught shiny.
- Levelling, learning moves, and evolution by level or by stone.
- A Pokédex tracking seen and caught separately and counting how many of each you
  have faced, a team screen with the box behind it and the bag inside it, and a shop.
  Items are used on whoever you have picked, which is the only way a stone gets used
  at all.
- A day care that raises what you leave in it and breeds what can be bred, with Ditto
  as the universal partner it is in the games. The egg only comes along while Claude
  works and the tab is open, and it rolls shiny eight times more often than the grass
  does — the one shiny in the game you can go after rather than wait for.
- Trading by code, which is the only social thing in here that needs no server at
  all: one of yours leaves the moment the code exists, arrives in somebody else's
  game exactly as it was, and never comes back the way it went.
- Eight gyms, one per type and ordered by difficulty, each a run of two trainers
  and then the leader with no way back to the menu in between. No shop and no rest
  in there: the potions you walk in with are the potions you get. Beat the leader
  and the badge is yours; lose, walk out or close the terminal and the whole run is
  undone — the experience, the money, the potions and the bruises, as if you had
  never gone in.
- A line telling you whether Claude is working, which tool it is on and for how
  long — and a bell when it finishes or gets stuck on a permission prompt, so the
  game tab is somewhere you can actually sit and wait.
- A patch of grass with someone walking through it, who only walks while Claude is
  working. Something you can catch out of the corner of your eye.
- HEAL greyed out for as long as Claude has the keyboard, and a blackout that leaves
  your team down rather than picking it up. Healing is a rest, and a rest is the half
  of the session Claude is not using — so a team (and the box) back at full health is
  something you pick up in the gaps, not something you farm between two tool calls.
- Blips as you move through the menus, a theme that plays from the first frame of a
  battle to the last, and a fanfare that takes over on the line that says you won or
  that the ball held — off in one place if you would rather work in silence. The blips
  are generated from a few lines of notes rather than shipped, so a new one costs three
  numbers; the two tracks are mono WAV in `assets/`, which is the one format every
  player on every platform will open.

## The one favour

Once you have a badge in — or ten of the 151 caught — the professor asks, on the home
screen and nowhere else, whether a ★ on GitHub is worth your while:

```
┌─ PROF. OAK ──────────────────────────────────────────┐
│                                                      │
│  So, are you enjoying your journey?                  │
│  A ★ on GitHub helps other trainers find claudemon.  │
│                                                      │
│  [enter] leave a star   [n] not now   [d] never ask  │
└──────────────────────────────────────────────────────┘
```

`enter` opens the repo and ends the matter; `n` puts it off for a month; `d` ends it
now. It never comes up twice in a month, never more than twice in a whole game, and
never while something is in the grass or a battle is on. `STAR ASK OFF` on the
**Option** screen switches it off before it ever fires, and nothing here phones home
to find out whether you actually starred — the answer we keep is the one you gave.

## Contributing

Bugs and ideas go in [issues](https://github.com/zamarrowski/claudemon/issues/new/choose),
and there is a template for each. For code, [CONTRIBUTING.md](CONTRIBUTING.md) is the
place to start — how to set a clone up, the three commands that have to pass, and
what a pull request should carry. [CLAUDE.md](CLAUDE.md) is the house style behind
it, written for humans and agents alike, and it is what a review holds a change to.
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) applies everywhere in the project, and
[SECURITY.md](SECURITY.md) is where a vulnerability goes instead of an issue.

## Credits

Data and Pokémon sprites come from [PokeAPI](https://pokeapi.co). The stats and
movesets in `data/` are built from it by `tools/fetch-data.mjs`. The trainer sprites
come from [Pokémon Showdown](https://play.pokemonshowdown.com/sprites/trainers/).
None of the sprites are in here: they are somebody else's artwork, so they are
downloaded at install time rather than redistributed.

`assets/battle.wav` is the trainer battle theme from the Game Boy games, trimmed to
two minutes and downmixed to mono; `assets/victory.wav` is the victory fanfare, given
the same treatment. Neither is original to this repo and neither is covered by the
LICENSE, which applies to the code.

Pokemon is a trademark of Nintendo, Creatures Inc. and GAME FREAK Inc.; this is a
personal, non-commercial toy.
