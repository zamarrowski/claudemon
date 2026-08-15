import { DEFAULT_TYPE_COLOR, TYPE_COLORS } from './constants.mjs'

export const money = (amount) => `${amount.toLocaleString('en-US')}₽`

export const elapsed = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000))

  if (total < 60) return `${total}s`

  const minutes = Math.floor(total / 60)

  if (minutes < 60) return `${minutes}m${String(total % 60).padStart(2, '0')}s`

  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

export const typeColor = (type) => TYPE_COLORS[type] ?? DEFAULT_TYPE_COLOR
