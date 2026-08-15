import { statSync, utimesSync } from 'node:fs'
import { afterAll, expect, test } from 'vitest'
import { useSandboxHome } from '../test/sandboxHome.mjs'

useSandboxHome('claudemon-static-')

const { createGame } = await import('./game.mjs')
const { createServer } = await import('./server.mjs')
const { contentTypeOf, resolveAsset } = await import('./static.mjs')

const running = []

const bootOnce = async () => {
  const server = createServer({ game: createGame() })
  const url = await server.listen(0)

  running.push(server)

  return url
}

afterAll(() => {
  for (const server of running) server.close()
})

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
  expect(resolveAsset('/js'), 'and a folder is not a file').toBeNull()
  expect(resolveAsset('/data/nothing.json')).toBeNull()
  expect(resolveAsset('/sprites/front/99999.png')).toBeNull()
})

test('Should keep the sprites forever and have the rest asked about again', () => {
  expect(resolveAsset('/sounds/battle.wav').cacheControl).toMatch(
    /max-age=31536000, immutable/,
  )
  expect(resolveAsset('/sprites/front/1.png').cacheControl).toMatch(/immutable/)
  expect(resolveAsset('/data/pokedex.json').cacheControl).toBe('no-cache')
  expect(resolveAsset('/js/main.mjs').cacheControl).toBe('no-cache')
  expect(resolveAsset('/').cacheControl).toBe('no-cache')
})

test('Should tag every file with its size and its last edit', () => {
  const asset = resolveAsset('/js/main.mjs')
  const stats = statSync(asset.path)

  expect(asset.etag).toBe(
    `W/"${stats.size.toString(16)}-${Math.trunc(stats.mtimeMs).toString(16)}"`,
  )
  expect(resolveAsset('/data/pokedex.json').etag).not.toBe(asset.etag)
})

test('Should name the content type from the extension, and fall back for the rest', () => {
  expect(contentTypeOf('/x/page.html')).toMatch(/text\/html/)
  expect(contentTypeOf('/x/app.mjs')).toMatch(/javascript/)
  expect(contentTypeOf('/x/a.PNG')).toBe('image/png')
  expect(contentTypeOf('/x/what.zzz')).toBe('application/octet-stream')
})

test('Should hand back an empty 304 for a module the browser already holds', async () => {
  const url = await bootOnce()
  const first = await fetch(`${url}/js/main.mjs`)
  const etag = first.headers.get('etag')

  expect(first.status).toBe(200)
  expect((await first.text()).length).toBeGreaterThan(0)

  const again = await fetch(`${url}/js/main.mjs`, {
    headers: { 'if-none-match': `W/"stale", ${etag}` },
  })

  expect(again.status).toBe(304)
  expect(await again.text()).toBe('')
  expect(again.headers.get('etag')).toBe(etag)
  expect(again.headers.get('cache-control')).toBe('no-cache')
})

test('Should send the file again once it has been edited since the browser read it', async () => {
  const url = await bootOnce()
  const { path } = resolveAsset('/js/main.mjs')
  const stats = statSync(path)
  const etag = (await fetch(`${url}/js/main.mjs`)).headers.get('etag')

  utimesSync(path, stats.atime, new Date(stats.mtimeMs + 2000))

  const changed = await fetch(`${url}/js/main.mjs`, {
    headers: { 'if-none-match': etag },
  })
  const body = await changed.text()

  utimesSync(path, stats.atime, stats.mtime)

  expect(changed.status).toBe(200)
  expect(changed.headers.get('etag')).not.toBe(etag)
  expect(body.length).toBeGreaterThan(0)
})

test('Should let the browser keep an artwork file for a year without asking again', async () => {
  const url = await bootOnce()
  const sound = await fetch(`${url}/sounds/battle.wav`)

  expect(sound.status).toBe(200)
  expect(sound.headers.get('cache-control')).toBe(
    'public, max-age=31536000, immutable',
  )
  expect(sound.headers.get('etag')).toMatch(/^W\/"[0-9a-f]+-[0-9a-f]+"$/)
})

test('Should say a dataset file is unchanged rather than send it all over again', async () => {
  const url = await bootOnce()
  const first = await fetch(`${url}/data/pokedex.json`)
  const etag = first.headers.get('etag')

  expect((await first.text()).length).toBeGreaterThan(1000)

  const again = await fetch(`${url}/data/pokedex.json`, {
    headers: { 'if-none-match': etag },
  })

  expect(again.status).toBe(304)
  expect(again.headers.get('cache-control')).toBe('no-cache')
  expect(await again.text()).toBe('')
})
