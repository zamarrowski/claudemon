import { createReadStream, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import {
  BUNDLED_ASSETS_DIR,
  ENGINE_DIR,
  SPRITES_DIR,
  WEB_DIR,
  dataFile,
} from '../src/node/paths.mjs'
import {
  DEFAULT_MIME_TYPE,
  MIME_TYPES,
  NO_STORE,
  SPRITE_CACHE_CONTROL,
} from './constants.mjs'

const within = (root, relative) => {
  const target = resolve(join(root, relative))

  if (target !== root && !target.startsWith(`${root}${sep}`)) return null

  return target
}

const fileAt = (path) => {
  try {
    return statSync(path).isFile() ? path : null
  } catch {
    return null
  }
}

const under = (root, pathname, prefix) => {
  const target = within(root, pathname.slice(prefix.length))

  if (!target) return null

  return fileAt(target)
}

export const resolveAsset = (pathname) => {
  if (pathname.startsWith('/sprites/')) {
    const path = under(SPRITES_DIR, pathname, '/sprites/')

    if (path) return { path, cacheControl: SPRITE_CACHE_CONTROL }

    return null
  }

  if (pathname.startsWith('/sounds/')) {
    const path = under(BUNDLED_ASSETS_DIR, pathname, '/sounds/')

    if (path) return { path, cacheControl: SPRITE_CACHE_CONTROL }

    return null
  }

  if (pathname.startsWith('/src/')) {
    const relative = pathname.slice('/src/'.length)

    if (relative.startsWith('node/')) return null

    const path = under(ENGINE_DIR, pathname, '/src/')

    if (path) return { path, cacheControl: NO_STORE }

    return null
  }

  if (pathname.startsWith('/data/')) {
    const name = pathname.slice('/data/'.length)

    if (name.includes('/') || name.includes('..')) return null

    const path = fileAt(dataFile(name))

    if (path) return { path, cacheControl: NO_STORE }

    return null
  }

  const path = under(WEB_DIR, pathname === '/' ? '/index.html' : pathname, '/')

  if (path) return { path, cacheControl: NO_STORE }

  return null
}

export const contentTypeOf = (path) => {
  return MIME_TYPES[extname(path).toLowerCase()] ?? DEFAULT_MIME_TYPE
}

export const sendFile = (response, { path, cacheControl }) => {
  response.writeHead(200, {
    'content-type': contentTypeOf(path),
    'cache-control': cacheControl,
  })

  createReadStream(path).pipe(response)
}
