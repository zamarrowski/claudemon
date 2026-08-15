import { money } from '../../../src/format.mjs'
import { totalBalls } from '../../../src/state.mjs'
import { html } from '../dom.mjs'
import { APP_TITLE, KANTO_TOTAL } from './constants.mjs'

export const topbar = (save) => {
  return html`<header class="topbar">
    <div class="topbar__title"><span class="ball">◓</span> ${APP_TITLE}</div>
    <div class="topbar__stats">
      <span>${save.dex.caught.length}/${KANTO_TOTAL} caught</span>
      <span>${totalBalls(save)} balls</span>
      <span>${money(save.money)}</span>
    </div>
  </header>`
}

export const screenHead = (title, aside) => {
  return html`<div class="screen-head">
    <h1>${title}</h1>
    ${aside ? html`<span class="hint">${aside}</span>` : ''}
  </div>`
}

export const hints = (text, version) => {
  return html`<footer class="footer">
    <span>${text}</span>
    ${version ? html`<span>v${version}</span>` : ''}
  </footer>`
}

export const notes = (rows) => {
  if (rows.length === 0) return ''

  return html`<div class="notice notice--quiet">
    ${rows.map((row) => html`<div>${row}</div>`)}
  </div>`
}
