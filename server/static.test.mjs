import { expect, test } from 'vitest'
import { contentTypeOf, resolveAsset } from './static.mjs'

test('Should serve the page, its styles and its modules', () => {
  expect(resolveAsset('/').path).toMatch(/web\/index\.html$/)
  expect(resolveAsset('/index.html').path).toMatch(/web\/index\.html$/)
  expect(resolveAsset('/styles/base.css').path).toMatch(
    /web\/styles\/base\.css$/,
  )
  expect(resolveAsset('/js/main.mjs').path).toMatch(/web\/js\/main\.mjs$/)
})

test('Should serve the engine to the browser but never the node half of it', () => {
  expect(resolveAsset('/src/battle.mjs').path).toMatch(/src\/battle\.mjs$/)
  expect(resolveAsset('/src/node/save.mjs'), 'node code stays here').toBeNull()
  expect(resolveAsset('/src/node/paths.mjs')).toBeNull()
})

test('Should serve the dataset, the sprites and the music', () => {
  expect(resolveAsset('/data/pokedex.json').path).toMatch(/pokedex\.json$/)
  expect(resolveAsset('/sounds/battle.wav').path).toMatch(
    /assets\/battle\.wav$/,
  )
  expect(resolveAsset('/sprites/front/1.png')?.path ?? null).toMatch(
    /sprites\/front\/1\.png$/,
  )
})

test('Should refuse to climb out of the folders it serves', () => {
  expect(resolveAsset('/../package.json')).toBeNull()
  expect(resolveAsset('/data/../../package.json')).toBeNull()
  expect(resolveAsset('/sprites/../../save.json')).toBeNull()
  expect(resolveAsset('/sounds/../../package.json')).toBeNull()
  expect(resolveAsset('/src/../package.json')).toBeNull()
})

test('Should answer nothing for a file that is not there', () => {
  expect(resolveAsset('/js/nothing.mjs')).toBeNull()
  expect(resolveAsset('/data/nothing.json')).toBeNull()
  expect(resolveAsset('/sprites/front/99999.png')).toBeNull()
})

test('Should cache the sprites and never the game state', () => {
  expect(resolveAsset('/sounds/battle.wav').cacheControl).toMatch(/max-age/)
  expect(resolveAsset('/data/pokedex.json').cacheControl).toBe('no-store')
  expect(resolveAsset('/js/main.mjs').cacheControl).toBe('no-store')
})

test('Should name the content type from the extension, and fall back for the rest', () => {
  expect(contentTypeOf('/x/page.html')).toMatch(/text\/html/)
  expect(contentTypeOf('/x/app.mjs')).toMatch(/javascript/)
  expect(contentTypeOf('/x/a.PNG')).toBe('image/png')
  expect(contentTypeOf('/x/what.zzz')).toBe('application/octet-stream')
})
