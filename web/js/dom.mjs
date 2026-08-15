import { HTML_ESCAPES } from './constants.mjs'

const RAW = Symbol('raw')

export const raw = (value) => ({ [RAW]: String(value) })

const isRaw = (value) => value[RAW] !== undefined

export const escapeHtml = (value) => {
  return String(value).replace(/[&<>"']/g, (match) => HTML_ESCAPES[match])
}

export const markupOf = (value) => {
  if (value == null || value === false) return ''
  if (isRaw(value)) return value[RAW]
  if (Array.isArray(value)) return value.map(markupOf).join('')

  return escapeHtml(value)
}

export const html = (strings, ...values) => {
  let out = strings[0]

  for (let index = 0; index < values.length; index++)
    out += markupOf(values[index]) + strings[index + 1]

  return raw(out)
}

export const paint = (root, markup) => {
  const html = markupOf(markup)

  if (root.innerHTML === html) return

  root.innerHTML = html
}
