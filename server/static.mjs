import { createReadStream, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import {
  BUNDLED_ASSETS_DIR,
  DATA_DIR,
  ENGINE_DIR,
  SPRITES_DIR,
  WEB_DIR,
  dataFile,
} from '../src/node/paths.mjs'
import {
  DEFAULT_MIME_TYPE,
  INDEX_PATH,
  MIME_TYPES,
  NO_STORE,
  SPRITE_CACHE_CONTROL,
} from './constants.mjs'

const ROOTS = [
  {
    prefix: '/sprites/',
    dir: SPRITES_DIR,
    cacheControl: SPRITE_CACHE_CONTROL,
  },
  {
    prefix: '/sounds/',
    dir: BUNDLED_ASSETS_DIR,
    cacheControl: SPRITE_CACHE_CONTROL,
  },
  {
    prefix: '/src/',
    dir: ENGINE_DIR,
    cacheControl: NO_STORE,
    hidden: 'node/',
  },
  {
    prefix: '/data/',
    dir: DATA_DIR,
    cacheControl: NO_STORE,
    lookUp: dataFile,
  },
]

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

const fileIn = (root, relative) => {
  const target = within(root.dir, relative)

  if (!target) return null
  if (root.hidden && relative.startsWith(root.hidden)) return null
  if (root.lookUp) return fileAt(root.lookUp(relative))

  return fileAt(target)
}

export const resolveAsset = (pathname) => {
  const root = ROOTS.find((entry) => pathname.startsWith(entry.prefix))

  if (root) {
    const path = fileIn(root, pathname.slice(root.prefix.length))

    if (!path) return null

    return { path, cacheControl: root.cacheControl }
  }

  const page = { dir: WEB_DIR }
  const path = fileIn(page, pathname === '/' ? INDEX_PATH : pathname.slice(1))

  if (!path) return null

  return { path, cacheControl: NO_STORE }
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
