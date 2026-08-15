import { html } from '../dom.mjs'
import { hints, screenHead } from './chrome.mjs'
import {
  STATUS_MARKS,
  UPDATE_CLOSING_MESSAGES,
  UPDATE_FOOTERS,
  UPDATE_STEPS_TITLE,
  UPDATE_TITLE,
} from './constants.mjs'

export const closingLines = (run) => {
  if (run.state === 'running') return []

  if (run.state === 'failed') {
    return [
      `${UPDATE_CLOSING_MESSAGES.stillOn} v${run.from} ${UPDATE_CLOSING_MESSAGES.stillWorks}`,
      UPDATE_CLOSING_MESSAGES.failed,
    ]
  }

  if (!run.to || run.to === run.from) {
    return [`${UPDATE_CLOSING_MESSAGES.alreadyNewest} v${run.from}.`]
  }

  return [
    `v${run.to} ${UPDATE_CLOSING_MESSAGES.onDisk}`,
    UPDATE_CLOSING_MESSAGES.restart,
    `${UPDATE_CLOSING_MESSAGES.quitAndRun} claudemon ${UPDATE_CLOSING_MESSAGES.again}`,
  ]
}

const heading = (run) => {
  if (run.state === 'running') return `v${run.from} → …`
  if (!run.to) return `v${run.from}`

  return `v${run.from} → v${run.to}`
}

export const draw = (ctx) => {
  const run = ctx.update

  if (!run) {
    return html`<div class="screen">
      ${screenHead(UPDATE_TITLE)}
      <p class="hint">…</p>
    </div>`
  }

  return html`<div class="screen">
    ${screenHead(UPDATE_TITLE, heading(run))}
    <section class="panel">
      <h2 class="panel__title">${UPDATE_STEPS_TITLE}</h2>
      <div class="steps">
        ${run.steps.map(
          (step) =>
            html`<div class="step" data-status="${step.status}">
              ${STATUS_MARKS[step.status] ?? STATUS_MARKS.pending}
              ${step.status === 'ok' ? step.done : step.label}
              ${step.detail ? html`<span class="hint">${step.detail}</span>` : ''}
            </div>`,
        )}
      </div>
    </section>
    ${closingLines(run).map((line) => html`<p class="hint">${line}</p>`)}
    ${hints(
      run.state === 'running' ? UPDATE_FOOTERS.running : UPDATE_FOOTERS.done,
      ctx.version,
    )}
  </div>`
}

export const onKey = (ctx, key) => {
  if (ctx.update?.state === 'running') return

  if (
    key.name === 'esc' ||
    key.name === 'enter' ||
    key.name === 'space' ||
    key.name === 'q'
  ) {
    ctx.finishUpdate()
  }
}
