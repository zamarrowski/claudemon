import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { transformResponseManifest } from '../transformers.mjs'
import { compareVersions } from '../version.mjs'
import { APP_DIR, PLUGIN_CACHE } from './paths.mjs'

export const APP_ROOT = APP_DIR

const readManifestFile = (root) => {
  try {
    return JSON.parse(
      readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8'),
    )
  } catch {
    return null
  }
}

export const versionAt = (root) => {
  const manifest = transformResponseManifest(readManifestFile(root))

  if (typeof manifest?.version !== 'string' || !manifest.version) return null

  return manifest.version
}

export const VERSION = versionAt(APP_ROOT)

export const installedVersions = (cache = PLUGIN_CACHE) => {
  try {
    return readdirSync(cache, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && /^\d+(\.\d+)*$/.test(entry.name),
      )
      .map((entry) => entry.name)
      .sort((a, b) => compareVersions(b, a))
  } catch {
    return []
  }
}

export const newestInstalled = (cache = PLUGIN_CACHE) => {
  const versions = installedVersions(cache)

  if (!versions.length) return null

  return versions[0]
}

export const isPluginCopy = (root = APP_ROOT, cache = PLUGIN_CACHE) => {
  if (root === cache) return true
  if (!root.startsWith(cache)) return false

  const next = root[cache.length]

  return next === '/' || next === '\\'
}
