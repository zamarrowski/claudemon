// Which claudemon this is, and which ones are on the disk next to it.
//
// One number, in one place: the plugin manifest. Claude Code reads it to decide
// what it has installed, so anything else that wants to name a version has to
// agree with it, and the only way to guarantee that is to read the same file.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contains, PLUGIN_CACHE } from './paths.mjs'

/** The root of the copy this process is running from. */
export const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The version in the manifest of the copy at `root`, or null if it cannot be read.
 *
 * Null rather than a guess: a made-up version would be compared against a real one
 * and offer an update that is not there, or hide one that is. Everything downstream
 * treats null as "no idea", which is the truth.
 */
export function versionAt(root) {
  try {
    const version = JSON.parse(readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8')).version
    return typeof version === 'string' && version ? version : null
  } catch {
    return null
  }
}

/** What this process is running. */
export const VERSION = versionAt(APP_ROOT)

/**
 * Compares two dotted numeric versions, the way `plugin.json` writes them.
 *
 * Not a semver implementation — there is no range matching or prerelease ordering
 * here, because a plugin manifest only ever holds `1.2.3`. A part that is not a
 * number counts as 0, so a hand-edited manifest cannot make this throw.
 *
 * @returns {number} negative if `a` is older, 0 if they match, positive if newer.
 */
export function compareVersions(a, b) {
  const left = String(a ?? '').split('.')
  const right = String(b ?? '').split('.')

  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const one = Number.parseInt(left[index] ?? '0', 10) || 0
    const two = Number.parseInt(right[index] ?? '0', 10) || 0
    if (one !== two) return one - two
  }
  return 0
}

/** Whether `candidate` is a version newer than `current`, both being real. */
export function isNewer(candidate, current) {
  if (!candidate || !current) return false
  return compareVersions(candidate, current) > 0
}

/**
 * Every version Claude Code has a copy of, newest first.
 *
 * The directory names are the versions, which is what makes this exact rather than
 * a guess from modification times. An install from a clone has no cache at all and
 * gets an empty list.
 */
export function installedVersions(cache = PLUGIN_CACHE) {
  try {
    return readdirSync(cache, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d+(\.\d+)*$/.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => compareVersions(b, a))
  } catch {
    return []
  }
}

/** The newest version on disk, or null if nothing is installed. */
export function newestInstalled(cache = PLUGIN_CACHE) {
  return installedVersions(cache)[0] ?? null
}

/**
 * Whether this copy is one Claude Code installed, rather than a clone.
 *
 * It decides what updating even means: a clone is updated with `git pull`, and an
 * installed plugin through `claude plugin update`. Doing either to the other leaves
 * a mess — a pull in the plugin cache would be undone by the next install, and
 * `claude plugin update` would not touch the clone the launcher is pointing at.
 *
 * Asked of the paths rather than of their text — see {@link contains}. Comparing the
 * strings meant naming a separator, the one named was `/`, and so on Windows every
 * installed copy looked like a clone and was offered a `git pull` in a directory that
 * has never been a repository.
 */
export function isPluginCopy(root = APP_ROOT, cache = PLUGIN_CACHE) {
  return contains(cache, root)
}
