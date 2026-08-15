import { REVEAL_COMMANDS } from './constants.mjs'
import { openWith } from './spawn.mjs'

export const revealCommand = (platform) => {
  return REVEAL_COMMANDS[platform] ?? REVEAL_COMMANDS.default
}

export const revealFile = (path, platform = process.platform) => {
  return openWith(revealCommand(platform), path)
}
