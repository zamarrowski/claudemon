import { spawn } from 'node:child_process'
import { REVEAL_COMMANDS } from './constants.mjs'

export const revealCommand = (platform) => {
  return REVEAL_COMMANDS[platform] ?? REVEAL_COMMANDS.default
}

const ignoreFailure = () => {}

export const revealFile = (path, platform = process.platform) => {
  const opener = revealCommand(platform)

  try {
    const child = spawn(opener.command, opener.args(path), {
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
