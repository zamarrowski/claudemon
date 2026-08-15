import { spawn } from 'node:child_process'
import { BROWSER_COMMANDS } from './constants.mjs'

export const browserCommand = (platform) => {
  return BROWSER_COMMANDS[platform] ?? BROWSER_COMMANDS.default
}

const ignoreFailure = () => {}

export const openUrl = (url, platform = process.platform) => {
  const opener = browserCommand(platform)

  try {
    const child = spawn(opener.command, opener.args(url), {
      stdio: 'ignore',
      detached: true,
    })

    child.on('error', ignoreFailure)
    child.unref()

    return true
  } catch {
    return false
  }
}
