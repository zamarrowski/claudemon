import { spawn } from 'node:child_process'

const ignoreFailure = () => {}

export const openWith = (opener, target) => {
  try {
    const child = spawn(opener.command, opener.args(target), {
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
