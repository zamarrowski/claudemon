import { submitAction } from './battle.mjs'

export const createLocalSession = (state) => {
  return {
    state,
    submit: (action) => submitAction(state, action),
  }
}
