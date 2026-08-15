import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { DEFAULT_CONFIG } from '../constants.mjs'
import { withDefaults } from '../config.mjs'
import {
  transformRequestWriteConfig,
  transformResponseConfig,
} from '../transformers.mjs'
import { CONFIG_FILE, HOME } from './paths.mjs'

const readConfigFile = () => {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
  } catch {
    return null
  }
}

const withStored = (stored, patch) => {
  if (!stored) return patch

  return { ...stored, ...patch }
}

export const loadConfig = () => {
  const stored = transformResponseConfig(readConfigFile())

  if (!stored) return withDefaults(DEFAULT_CONFIG)

  return withDefaults(stored)
}

export const saveConfig = (patch) => {
  const merged = withStored(transformResponseConfig(readConfigFile()), patch)

  mkdirSync(HOME, { recursive: true })

  const tmp = `${CONFIG_FILE}.${process.pid}.tmp`
  const payload = JSON.stringify(transformRequestWriteConfig(merged), null, 2)

  try {
    writeFileSync(tmp, `${payload}\n`)
    renameSync(tmp, CONFIG_FILE)
  } catch (error) {
    try {
      unlinkSync(tmp)
    } catch {}

    throw error
  }

  return withDefaults(merged)
}
