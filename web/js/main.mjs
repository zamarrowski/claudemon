import { initData } from '../../src/data.mjs'
import * as api from './api.mjs'
import { FRAME_MS, SWALLOWED_KEYS, TICK_MS } from './constants.mjs'
import { paint } from './dom.mjs'
import { createPainter } from './painter.mjs'
import { parseKey } from './keys.mjs'
import { createSound } from './sound.mjs'
import { swapToFallback } from './sprites.mjs'
import { createStore } from './store.mjs'
import { activeView } from './views/router.mjs'

const screen = document.getElementById('screen')

const boot = async () => {
  const [dataset, bootstrap] = await Promise.all([
    api.fetchDataset(),
    api.fetchBootstrap(),
  ])

  initData(dataset)

  return bootstrap
}

const start = (bootstrap) => {
  const render = () => paint(screen, activeView(ctx).draw(ctx))

  const schedulePaint = createPainter(render, requestAnimationFrame)

  const ctx = createStore({
    bootstrap,
    api,
    sound: createSound(),
    onChange: schedulePaint,
  })

  const handleKey = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return

    const key = parseKey(event)

    if (SWALLOWED_KEYS.has(key.name)) event.preventDefault()

    ctx.notice = null
    activeView(ctx).onKey(ctx, key)
    ctx.paint()
  }

  const handleClick = (event) => {
    const node = event.target.closest('[data-index],[data-key]')

    if (!node || node.disabled) return

    const view = activeView(ctx)

    if (node.dataset.index !== undefined) {
      view.select?.(ctx, Number(node.dataset.index))
    }

    if (node.dataset.key) {
      ctx.notice = null
      view.onKey(ctx, { name: node.dataset.key, shift: false })
    }

    ctx.paint()
  }

  const handlePaste = (event) => {
    const text = event.clipboardData?.getData('text')

    if (!text) return

    activeView(ctx).onPaste?.(ctx, text)
    ctx.paint()
  }

  const handleImageError = (event) => {
    if (event.target.tagName !== 'IMG') return

    swapToFallback(event.target)
  }

  const tick = () => {
    if (ctx.mode !== 'home') return

    ctx.paint()
  }

  const tickFrames = () => {
    if (ctx.tickFrame()) ctx.paint()
  }

  window.addEventListener('keydown', handleKey)
  screen.addEventListener('click', handleClick)
  window.addEventListener('paste', handlePaste)
  screen.addEventListener('error', handleImageError, true)

  api.listenForEvents({
    encounter: ctx.receiveEncounter,
    activity: ctx.receiveActivity,
    save: ctx.receiveSave,
    config: ctx.receiveConfig,
    notice: ctx.receiveNotice,
    update: ctx.receiveUpdateRun,
  })

  setInterval(tick, TICK_MS)
  setInterval(tickFrames, FRAME_MS)

  ctx.paint()
}

start(await boot())
