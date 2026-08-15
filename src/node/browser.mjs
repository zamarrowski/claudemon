import { BROWSER_COMMANDS } from './constants.mjs'
import { openWith } from './spawn.mjs'

export const browserCommand = (platform) => {
  return BROWSER_COMMANDS[platform] ?? BROWSER_COMMANDS.default
}

export const openUrl = (url, platform = process.platform) => {
  return openWith(browserCommand(platform), url)
}
