import { expect, test } from 'vitest'
import { sleep } from './sleep.mjs'

test('Should hold the process for at least as long as it was asked to', () => {
  const started = Date.now()

  sleep(30)

  expect(Date.now() - started).toBeGreaterThanOrEqual(25)
})

test('Should come straight back when there is nothing to wait for', () => {
  const started = Date.now()

  sleep(0)
  sleep(-5)
  sleep(undefined)

  expect(Date.now() - started).toBeLessThan(20)
})
