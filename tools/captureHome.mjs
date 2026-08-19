import { existsSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  CAPTURE_HOME_PREFIX,
  PREVIEW_WORKED_MS,
  SHOT_MESSAGES,
} from './constants.mjs'

const installedHome = () => {
  return process.env.CLAUDEMON_HOME || join(homedir(), '.claudemon')
}

export const prepareCaptureHome = () => {
  const sprites = join(installedHome(), 'data')

  if (!existsSync(sprites)) throw new Error(SHOT_MESSAGES.noSprites)

  const sandbox = mkdtempSync(join(tmpdir(), CAPTURE_HOME_PREFIX))

  symlinkSync(sprites, join(sandbox, 'data'))
  writeFileSync(
    join(sandbox, 'worked.json'),
    JSON.stringify({ totalMs: PREVIEW_WORKED_MS, updatedAt: null }),
  )

  process.env.CLAUDEMON_HOME = sandbox

  return sandbox
}
