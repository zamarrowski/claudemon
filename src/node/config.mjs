import { DEFAULT_CONFIG } from '../constants.mjs'
import { withDefaults } from '../config.mjs'
import {
  transformRequestWriteConfig,
  transformResponseConfig,
} from '../transformers.mjs'
import { readJson, writeAtomic } from './files.mjs'
import { CONFIG_FILE } from './paths.mjs'

const withStored = (stored, patch) => {
  if (!stored) return patch

  return { ...stored, ...patch }
}

export const loadConfig = () => {
  const stored = transformResponseConfig(readJson(CONFIG_FILE))

  if (!stored) return withDefaults(DEFAULT_CONFIG)

  return withDefaults(stored)
}

export const saveConfig = (patch) => {
  const merged = withStored(
    transformResponseConfig(readJson(CONFIG_FILE)),
    patch,
  )

  const payload = JSON.stringify(transformRequestWriteConfig(merged), null, 2)

  writeAtomic(CONFIG_FILE, `${payload}\n`)

  return withDefaults(merged)
}
