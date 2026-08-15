import { SPRITE_BASE } from './constants.mjs'

export const monSpriteUrl = (side, id, shiny = false) => {
  if (!shiny) return `${SPRITE_BASE}/${side}/${id}.png`

  return `${SPRITE_BASE}/${side}/shiny/${id}.png`
}

export const eggSpriteUrl = () => `${SPRITE_BASE}/front/egg.png`

export const trainerSpriteUrl = (name) => `${SPRITE_BASE}/trainers/${name}.png`

export const swapToFallback = (image) => {
  const fallback = image.dataset.fallback

  if (!fallback || image.src.endsWith(fallback)) return false

  image.src = fallback

  return true
}
