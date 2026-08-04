// Every path claudemon touches. Override CLAUDEMON_HOME to run against a
// throwaway directory (tests, or trying things out without risking your save).

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const HOME = process.env.CLAUDEMON_HOME || join(homedir(), '.claudemon')

export const DATA_DIR = join(HOME, 'data')
export const SPRITES_DIR = join(DATA_DIR, 'sprites')

/**
 * The dataset that ships with the repo — about 120 KB of JSON, so a fresh clone
 * can play without fetching it. Sprites are not in here: they are downloaded,
 * because they are somebody else's artwork and this repo does not redistribute it.
 */
export const BUNDLED_DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')

/**
 * Audio that ships as audio, rather than being rendered from notes.
 *
 * Apart from `data/`, which is generated from PokeAPI and regenerable: nothing in
 * here can be rebuilt by a tool in this repo. It is also the only place a file lands
 * that the game did not compute, so keeping it its own directory is what makes
 * "what does claudemon actually redistribute" a question you can answer with `ls`.
 */
export const BUNDLED_ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')

/** Game state. Written only by the companion process, atomically. */
export const SAVE_FILE = join(HOME, 'save.json')

/**
 * The encounter slot: one wild Pokemon at a time, filled by the hook and cleared by
 * the companion when you face it. Keeps its old name so a companion and a hook from
 * different versions still talk to each other.
 */
export const QUEUE_FILE = join(HOME, 'queue.jsonl')

/** Small summary the status line reads so it never has to open the save. */
export const STATUS_FILE = join(HOME, 'status.json')

/**
 * One file per Claude Code session, saying whether that session is working.
 * Written by the activity hook, read by the companion.
 */
export const SESSIONS_DIR = join(HOME, 'sessions')

export const CONFIG_FILE = join(HOME, 'config.json')

/**
 * What the last check for a new version found, and when it looked.
 *
 * Separate from the config because it is not a setting: it is a cache, and the only
 * thing that writes it is the check itself. Deleting it costs one HTTP request.
 */
export const UPDATE_FILE = join(HOME, 'update.json')

/** Hooks cannot report errors to the user, so they land here instead. */
export const LOG_FILE = join(HOME, 'claudemon.log')

/**
 * The rendered blips, one small WAV each.
 *
 * A cache rather than an asset: the sounds are written down as notes in src/sound.mjs
 * and rendered from them, so deleting this directory costs a few milliseconds the next
 * time the cursor moves.
 */
export const SOUNDS_DIR = join(HOME, 'sounds')

/**
 * Where Claude Code keeps the copies of this plugin it has installed — one
 * directory per version, named after it.
 *
 * The installer writes shims that resolve through here, and the game reads it to
 * notice that a newer copy has arrived on disk than the one it is running. Both
 * need the same path, so it lives here rather than being spelled twice.
 */
export const PLUGIN_CACHE = join(homedir(), '.claude', 'plugins', 'cache', 'claudemon', 'claudemon')

/**
 * Where a dataset file is read from. A copy under CLAUDEMON_HOME wins if there is
 * one, so an install that predates the bundled dataset keeps working and a
 * regenerated dataset can be dropped in without touching the repo. Otherwise it is
 * the copy that shipped.
 */
export function dataFile(name) {
  const local = join(DATA_DIR, name)
  return existsSync(local) ? local : join(BUNDLED_DATA_DIR, name)
}

/** Always the shipped copy — what `tools/fetch-data.mjs` rebuilds. */
export function bundledDataFile(name) {
  return join(BUNDLED_DATA_DIR, name)
}

/**
 * A shipped audio file. No CLAUDEMON_HOME override on purpose: this is part of the
 * install rather than something the game writes, so there is no local copy to prefer.
 */
export function assetFile(name) {
  return join(BUNDLED_ASSETS_DIR, name)
}

/**
 * A session id comes straight from Claude Code, so it is scrubbed before it is
 * allowed anywhere near a filename.
 */
export function sessionFile(id) {
  return join(SESSIONS_DIR, `${String(id).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 64)}.json`)
}

export function spriteFile(side, id, ext) {
  return join(SPRITES_DIR, side, `${id}.${ext}`)
}

/**
 * Whether `child` is `parent` itself, or sits somewhere under it.
 *
 * In one place because the obvious way to write it is wrong, and it had been written
 * the obvious way twice: asking whether the child's text starts with the parent's,
 * plus a separator. Spelling a separator is the mistake — the one spelled was `/`, and
 * `join` hands back `\` on Windows, so both callers answered no to paths that were in
 * fact inside. One decided a plugin Claude Code had installed was a git clone and
 * offered to `git pull` in it; the other was the guard keeping the site server inside
 * docs/, which then refused to serve the site at all.
 *
 * `relative` is asked instead: it knows what separates a path here, and knows that on
 * Windows either character does.
 */
export function contains(parent, child) {
  const inside = relative(parent, child)
  // The directory itself, which both callers count as inside.
  if (inside === '') return true
  // Only reachable on Windows, and only across drives: there is no relative path from
  // one to another, so `relative` can only answer with an absolute one.
  if (isAbsolute(inside)) return false
  // Leaving means climbing out first, and `relative` normalises what it returns, so
  // `..` can only ever be the first segment.
  return inside.split(sep)[0] !== '..'
}
