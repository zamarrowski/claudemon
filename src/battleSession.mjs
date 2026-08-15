import { sendOutAfterFaint, submitAction, switchIn } from './battle.mjs'

export const createLocalSession = (state) => {
  return {
    state,
    submit: (action) => submitAction(state, action),
    switchIn: (mon) => switchIn(state, mon),
    sendOut: (mon) => sendOutAfterFaint(state, mon),
  }
}
