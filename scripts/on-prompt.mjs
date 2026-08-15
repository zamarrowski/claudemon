import { beginTurn } from '../src/node/sessions.mjs'
import { loadConfig } from '../src/node/config.mjs'
import { stepsFromPrompt } from '../src/encounter.mjs'
import { logError, logNote } from '../src/node/log.mjs'
import { relinkLaunchers } from '../src/node/shim.mjs'
import { readStdin } from './stdin.mjs'
import { transformResponsePromptEvent } from './transformers.mjs'

const catchUpLaunchers = () => {
  try {
    for (const path of relinkLaunchers()) {
      logNote('on-prompt', `pointed a launcher at this release: ${path}`)
    }
  } catch (error) {
    logError('on-prompt', error)
  }
}

const promptText = (payload) => {
  if (typeof payload.prompt === 'string') return payload.prompt
  if (typeof payload.user_prompt === 'string') return payload.user_prompt

  return ''
}

const promptSteps = (prompt) => {
  if (prompt.trim() === '') return 0

  return stepsFromPrompt(prompt.length, loadConfig())
}

const main = async () => {
  const raw = await readStdin()

  catchUpLaunchers()

  if (!raw.trim()) return

  const payload = transformResponsePromptEvent(JSON.parse(raw))

  if (!payload?.session_id) return

  const steps = promptSteps(promptText(payload))

  beginTurn(payload.session_id, payload.cwd, { pendingSteps: steps })
}

try {
  await main()
} catch (error) {
  logError('on-prompt', error)
}

process.exit(0)
