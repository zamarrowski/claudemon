import { KEY_ALIASES } from './constants.mjs'

export const parseKey = (event) => {
  return {
    name: KEY_ALIASES[event.key] ?? event.key.toLowerCase(),
    shift: event.shiftKey === true,
  }
}
