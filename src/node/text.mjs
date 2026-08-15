import { WIDE_CODEPOINT_RANGE } from './constants.mjs'
import { RESET } from './ansi.mjs'

export const stripAnsi = (text) => {
  return String(text).replace(
    // eslint-disable-next-line no-control-regex
    /\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g,
    '',
  )
}

const cellsFor = (codePoint) => {
  const { min, max } = WIDE_CODEPOINT_RANGE

  if (codePoint >= min && codePoint <= max) return 2

  return 1
}

export const visibleLength = (text) => {
  let width = 0

  for (const character of stripAnsi(text))
    width += cellsFor(character.codePointAt(0))

  return width
}

export const truncate = (text, maxWidth) => {
  if (visibleLength(text) <= maxWidth) return text

  let visible = 0
  let out = ''
  let index = 0
  const raw = String(text)

  while (index < raw.length && visible < maxWidth) {
    if (raw[index] === '\x1b') {
      // eslint-disable-next-line no-control-regex
      const match = /^\x1b\[[0-9;]*[A-Za-z]/.exec(raw.slice(index))

      if (match) {
        out += match[0]
        index += match[0].length
        continue
      }
    }

    const codePoint = raw.codePointAt(index)
    const character = String.fromCodePoint(codePoint)
    const width = visibleLength(character)

    if (visible + width > maxWidth) break

    out += character
    visible += width
    index += character.length
  }

  return `${out}${RESET}…`
}
