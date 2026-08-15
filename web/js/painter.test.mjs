import { expect, test, vi } from 'vitest'
import { createPainter } from './painter.mjs'

test('Should paint once however many times the game asks in one frame', () => {
  const paintNow = vi.fn()
  const frames = []
  const paint = createPainter(paintNow, (flush) => frames.push(flush))

  paint()
  paint()
  paint()

  expect(frames).toHaveLength(1)
  expect(paintNow).not.toHaveBeenCalled()

  frames[0]()

  expect(paintNow).toHaveBeenCalledTimes(1)

  paint()

  expect(frames, 'and the next change books the next frame').toHaveLength(2)
})

test('Should keep painting when the frame runs before the booking returns', () => {
  const paintNow = vi.fn()
  const paint = createPainter(paintNow, (flush) => flush())

  paint()
  paint()

  expect(
    paintNow,
    'a synchronous frame does not wedge it shut',
  ).toHaveBeenCalledTimes(2)
})
