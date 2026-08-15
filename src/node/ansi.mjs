import { SGR_CODES } from './constants.mjs'

const CSI = '\x1b['

export const COLOR_ENABLED = !process.env.NO_COLOR

export const RESET = `${CSI}0m`

const style = (code) => {
  return (text) => (COLOR_ENABLED ? `${CSI}${code}m${text}${RESET}` : `${text}`)
}

export const bold = style(SGR_CODES.bold)
export const dim = style(SGR_CODES.dim)
export const brightRed = style(SGR_CODES.brightRed)
export const brightGreen = style(SGR_CODES.brightGreen)
export const brightYellow = style(SGR_CODES.brightYellow)
export const brightCyan = style(SGR_CODES.brightCyan)
